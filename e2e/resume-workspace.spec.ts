import AxeBuilder from "@axe-core/playwright";
import type {
  BrowserContext,
  Page,
  Route,
} from "@playwright/test";

import {
  ACCOUNT_A,
  ACCOUNT_B,
  APP_ORIGIN,
  expect,
  login,
  ownerContainer,
  SYNTHETIC_PASSWORD,
  test,
} from "./support/runtime";

const ACTIVE_REPORT_KEY =
  "skillmint:resume-analysis";
const RESUME_SYNC_STATUS_KEY =
  "skillmint:resume-sync-status";

const ACCOUNT_A_FIRST_ID =
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const ACCOUNT_A_SECOND_ID =
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const ACCOUNT_A_MISSING_ID =
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9";
const ACCOUNT_B_FIRST_ID =
  "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";

type Account = typeof ACCOUNT_A;

type ResumeAnalysisRow = {
  id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  extracted_text: string;
  parsed_profile: Record<string, unknown>;
  user_profile: Record<string, unknown>;
  created_at: string;
};

type WorkspaceSelectionRow = {
  user_id: string;
  resume_analysis_id: string;
  selected_at: string;
};

type WorkspaceRequestKind =
  | "analysis:delete"
  | "analysis:exact"
  | "analysis:list"
  | "selection:delete"
  | "selection:insert"
  | "selection:read"
  | "selection:update";

type WorkspaceRequest = {
  accountId: string | null;
  kind: WorkspaceRequestKind;
  url: string;
};

class Deferred {
  readonly promise: Promise<void>;
  private resolvePromise!: () => void;

  constructor() {
    this.promise = new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  release() {
    this.resolvePromise();
  }
}

class ResumeWorkspaceApi {
  readonly requests: WorkspaceRequest[] = [];
  private readonly analyses = new Map<string, ResumeAnalysisRow[]>();
  private readonly selections =
    new Map<string, WorkspaceSelectionRow>();
  private readonly gates = new Map<
    string,
    Deferred[]
  >();
  private readonly failures = new Map<string, number>();
  private readonly persistentFailures = new Set<string>();
  private selectionRevision = 0;

  async install(page: Page) {
    await page.route(
      "**/rest/v1/active_resume_selections**",
      async (route) => {
        await this.handleSelectionRequest(route);
      },
    );
    await page.route(
      "**/rest/v1/resume_analyses**",
      async (route) => {
        await this.handleAnalysisRequest(route);
      },
    );
  }

  setAnalyses(accountId: string, rows: ResumeAnalysisRow[]) {
    this.analyses.set(accountId, [...rows]);
  }

  setSelection(
    accountId: string,
    resumeAnalysisId: string | null,
  ) {
    if (!resumeAnalysisId) {
      this.selections.delete(accountId);
      return;
    }

    this.selections.set(accountId, {
      user_id: accountId,
      resume_analysis_id: resumeAnalysisId,
      selected_at: "2026-07-27T01:00:00.000Z",
    });
  }

  getAnalyses(accountId: string) {
    return [...(this.analyses.get(accountId) ?? [])];
  }

  getSelection(accountId: string) {
    return this.selections.get(accountId) ?? null;
  }

  deleteSavedReports(accountId: string) {
    this.selections.delete(accountId);
    this.analyses.delete(accountId);
  }

  count(kind: WorkspaceRequestKind, accountId?: string) {
    return this.requests.filter((request) =>
      request.kind === kind &&
      (accountId === undefined || request.accountId === accountId)
    ).length;
  }

  async waitFor(
    kind: WorkspaceRequestKind,
    count: number,
    accountId?: string,
  ) {
    await expect.poll(
      () => this.count(kind, accountId),
      {
        message: `waiting for ${count} ${kind} request(s)`,
        timeout: 10_000,
      },
    ).toBeGreaterThanOrEqual(count);
  }

  holdNext(
    kind: WorkspaceRequestKind,
    accountId: string,
  ) {
    const gate = new Deferred();
    const key = gateKey(kind, accountId);
    this.gates.set(key, [
      ...(this.gates.get(key) ?? []),
      gate,
    ]);
    return gate;
  }

  failNext(
    kind: WorkspaceRequestKind,
    accountId: string,
    count = 1,
  ) {
    const key = gateKey(kind, accountId);
    this.failures.set(
      key,
      (this.failures.get(key) ?? 0) + count,
    );
  }

  failEvery(
    kind: WorkspaceRequestKind,
    accountId: string,
  ) {
    this.persistentFailures.add(
      gateKey(kind, accountId),
    );
  }

  private async handleSelectionRequest(route: Route) {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: responseHeaders(),
      });
      return;
    }

    const accountId = getBearerSubject(
      request.headers().authorization,
    );
    if (!accountId) {
      await json(route, 401, {
        message: "Synthetic session missing",
      });
      return;
    }

    if (request.method() === "GET") {
      const kind = "selection:read";
      await this.beforeResponse(kind, accountId, request.url());
      if (await this.maybeFail(route, kind, accountId)) {
        return;
      }

      const selection = this.selections.get(accountId);
      await json(route, 200, selection ? [selection] : []);
      return;
    }

    if (request.method() === "PATCH") {
      const kind = "selection:update";
      await this.beforeResponse(kind, accountId, request.url());
      if (await this.maybeFail(route, kind, accountId)) {
        return;
      }

      const current = this.selections.get(accountId);
      const input = asRecord(request.postDataJSON());
      const resumeAnalysisId =
        typeof input.resume_analysis_id === "string"
          ? input.resume_analysis_id
          : null;
      if (!current || !resumeAnalysisId) {
        await json(route, 200, []);
        return;
      }

      const next = this.createSelection(
        accountId,
        resumeAnalysisId,
      );
      this.selections.set(accountId, next);
      await json(route, 200, [next]);
      return;
    }

    if (request.method() === "POST") {
      const kind = "selection:insert";
      await this.beforeResponse(kind, accountId, request.url());
      if (await this.maybeFail(route, kind, accountId)) {
        return;
      }

      const input = asRecord(request.postDataJSON());
      const rowOwnerId =
        typeof input.user_id === "string"
          ? input.user_id
          : null;
      const resumeAnalysisId =
        typeof input.resume_analysis_id === "string"
          ? input.resume_analysis_id
          : null;
      if (
        rowOwnerId !== accountId ||
        !resumeAnalysisId
      ) {
        await json(route, 403, {
          code: "42501",
          message: "Synthetic ownership rejection",
        });
        return;
      }

      if (this.selections.has(accountId)) {
        await json(route, 409, {
          code: "23505",
          message: "Synthetic unique conflict",
        });
        return;
      }

      const next = this.createSelection(
        accountId,
        resumeAnalysisId,
      );
      this.selections.set(accountId, next);
      await json(route, 201, [next]);
      return;
    }

    if (request.method() === "DELETE") {
      const kind = "selection:delete";
      await this.beforeResponse(kind, accountId, request.url());
      if (await this.maybeFail(route, kind, accountId)) {
        return;
      }

      const selection = this.selections.get(accountId);
      this.selections.delete(accountId);
      await json(route, 200, selection ? [selection] : []);
      return;
    }

    await route.abort("blockedbyclient");
  }

  private async handleAnalysisRequest(route: Route) {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: responseHeaders(),
      });
      return;
    }

    const accountId = getBearerSubject(
      request.headers().authorization,
    );
    if (!accountId) {
      await json(route, 401, {
        message: "Synthetic session missing",
      });
      return;
    }

    const url = new URL(request.url());
    const requestedId = getEqValue(url, "id");

    if (request.method() === "GET") {
      const kind = requestedId
        ? "analysis:exact"
        : "analysis:list";
      await this.beforeResponse(kind, accountId, request.url());
      if (await this.maybeFail(route, kind, accountId)) {
        return;
      }

      const rows = this.analyses.get(accountId) ?? [];
      if (requestedId) {
        const match = rows.find((row) => row.id === requestedId);
        await json(route, 200, match ? [match] : []);
        return;
      }

      const limit = Number(url.searchParams.get("limit") ?? rows.length);
      const sortedRows = [...rows].sort((left, right) =>
        right.created_at.localeCompare(left.created_at)
      );
      await json(
        route,
        200,
        sortedRows.slice(
          0,
          Number.isFinite(limit) ? limit : sortedRows.length,
        ),
      );
      return;
    }

    if (request.method() === "DELETE") {
      const kind = "analysis:delete";
      await this.beforeResponse(kind, accountId, request.url());
      if (await this.maybeFail(route, kind, accountId)) {
        return;
      }

      const rows = this.analyses.get(accountId) ?? [];
      const deleted = requestedId
        ? rows.find((row) => row.id === requestedId) ?? null
        : null;
      if (!deleted) {
        await json(route, 200, []);
        return;
      }

      this.analyses.set(
        accountId,
        rows.filter((row) => row.id !== deleted.id),
      );
      if (
        this.selections.get(accountId)?.resume_analysis_id ===
          deleted.id
      ) {
        this.selections.delete(accountId);
      }
      await json(route, 200, [{
        id: deleted.id,
        user_id: deleted.user_id,
      }]);
      return;
    }

    await route.abort("blockedbyclient");
  }

  private createSelection(
    accountId: string,
    resumeAnalysisId: string,
  ): WorkspaceSelectionRow {
    this.selectionRevision += 1;
    return {
      user_id: accountId,
      resume_analysis_id: resumeAnalysisId,
      selected_at: new Date(
        Date.UTC(2026, 6, 27, 2, 0, this.selectionRevision),
      ).toISOString(),
    };
  }

  private async beforeResponse(
    kind: WorkspaceRequestKind,
    accountId: string,
    url: string,
  ) {
    this.requests.push({
      accountId,
      kind,
      url,
    });
    const key = gateKey(kind, accountId);
    const queue = this.gates.get(key);
    const gate = queue?.shift();
    if (gate) {
      await gate.promise;
    }
  }

  private async maybeFail(
    route: Route,
    kind: WorkspaceRequestKind,
    accountId: string,
  ) {
    const key = gateKey(kind, accountId);
    if (this.persistentFailures.has(key)) {
      await json(route, 503, {
        message: "RAW_SYNTHETIC_WORKSPACE_FAILURE",
      });
      return true;
    }

    const remaining = this.failures.get(key) ?? 0;
    if (remaining === 0) {
      return false;
    }

    this.failures.set(key, remaining - 1);
    await json(route, 503, {
      message: "RAW_SYNTHETIC_WORKSPACE_FAILURE",
    });
    return true;
  }
}

test(
  "signed-out Resume keeps Workspace controls account-bound and makes no provider reads",
  async ({ page }) => {
    const api = new ResumeWorkspaceApi();
    await api.install(page);

    await page.goto("/resume");

    await expect(
      page.getByRole("heading", {
        name: "No active resume report selected",
      }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Sign in to select a Workspace resume. Signed-out browser reports remain separate.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: /workspace resume/i,
      }),
    ).toHaveCount(0);

    expect(api.count("selection:read")).toBe(0);
    expect(api.count("analysis:list")).toBe(0);
  },
);

test(
  "@critical set, change, activate, and clear keep saved, Workspace, and browser-active state distinct",
  async ({ page }) => {
    await page.setViewportSize({
      width: 390,
      height: 844,
    });
    await page.emulateMedia({
      reducedMotion: "reduce",
    });

    const api = new ResumeWorkspaceApi();
    const first = syntheticAnalysis(
      ACCOUNT_A,
      ACCOUNT_A_FIRST_ID,
      "Account A first resume.pdf",
      "2026-07-25T00:00:00.000Z",
    );
    const second = syntheticAnalysis(
      ACCOUNT_A,
      ACCOUNT_A_SECOND_ID,
      "Account A second resume.pdf",
      "2026-07-26T00:00:00.000Z",
    );
    api.setAnalyses(ACCOUNT_A.id, [first, second]);
    await api.install(page);

    await login(page, ACCOUNT_A);
    await page.goto("/resume");
    await expect(savedCard(page, first.file_name)).toBeVisible();
    await expect(savedCard(page, second.file_name)).toBeVisible();
    await expect(
      page.getByText(
        "No Workspace resume is selected. Saved analyses and this browser’s active report are unchanged.",
        { exact: true },
      ),
    ).toBeVisible();

    const firstSetButton = savedCard(page, first.file_name)
      .getByRole("button", {
        name: "Set as workspace resume",
      });
    await firstSetButton.focus();
    await expect(firstSetButton).toBeFocused();
    await expect.poll(
      () => firstSetButton.evaluate((element) =>
        getComputedStyle(element).outlineStyle
      ),
    ).not.toBe("none");
    await page.keyboard.press("Enter");

    await expect(
      page.getByText(
        "Workspace resume updated. This browser’s active report was not changed.",
        { exact: true },
      ),
    ).toBeVisible();
    expect(api.getSelection(ACCOUNT_A.id)?.resume_analysis_id)
      .toBe(first.id);
    expect(
      await readOwnedValue(
        page,
        ACTIVE_REPORT_KEY,
        ACCOUNT_A.id,
      ),
    ).toBeNull();

    await savedCard(page, second.file_name)
      .getByRole("button", {
        name: "Change workspace resume",
      })
      .click();
    await expect(
      page.getByText(
        "Workspace resume updated. This browser’s active report was not changed.",
        { exact: true },
      ),
    ).toBeVisible();
    expect(api.getSelection(ACCOUNT_A.id)?.resume_analysis_id)
      .toBe(second.id);
    expect(
      await readOwnedValue(
        page,
        ACTIVE_REPORT_KEY,
        ACCOUNT_A.id,
      ),
    ).toBeNull();

    const firstActiveButton = savedCard(page, first.file_name)
      .getByRole("button", {
        name: "Use as this browser’s active report",
      });
    await firstActiveButton.focus();
    await page.keyboard.press("Enter");
    await expect(
      savedCard(page, first.file_name)
        .locator("span")
        .filter({
          hasText: /^Active report on this browser$/,
        }),
    ).toBeVisible();
    await expect(
      savedCard(page, second.file_name)
        .locator("span")
        .filter({
          hasText: /^Workspace resume$/,
        }),
    ).toBeVisible();

    const reportBeforeClear = await readRawStorage(
      page,
      ACTIVE_REPORT_KEY,
    );
    const activeValue = asRecord(
      await readOwnedValue(
        page,
        ACTIVE_REPORT_KEY,
        ACCOUNT_A.id,
      ),
    );
    expect(activeValue.fileName).toBe(first.file_name);

    await page.getByRole("button", {
      name: "Clear workspace resume",
    }).click();
    await expect(
      page.getByText(
        "Workspace resume cleared. Saved analyses and this browser’s active report were preserved.",
        { exact: true },
      ),
    ).toBeVisible();
    expect(api.getSelection(ACCOUNT_A.id)).toBeNull();
    expect(
      await readRawStorage(page, ACTIVE_REPORT_KEY),
    ).toBe(reportBeforeClear);
    await expect(savedCard(page, first.file_name)).toBeVisible();
    await expect(savedCard(page, second.file_name)).toBeVisible();

    const overflow = await page.evaluate(() => ({
      body: document.body.scrollWidth - document.body.clientWidth,
      document:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    }));
    expect(overflow.body).toBeLessThanOrEqual(1);
    expect(overflow.document).toBeLessThanOrEqual(1);
    await expectNoSeriousAxeViolations(page);
  },
);

test(
  "@critical fresh Dashboard offers exact Workspace resume without activating until acceptance",
  async ({ page }) => {
    const api = new ResumeWorkspaceApi();
    const selected = syntheticAnalysis(
      ACCOUNT_A,
      ACCOUNT_A_FIRST_ID,
      "Dashboard Workspace resume.pdf",
      "2026-07-25T00:00:00.000Z",
    );
    api.setAnalyses(ACCOUNT_A.id, [selected]);
    api.setSelection(ACCOUNT_A.id, selected.id);
    await api.install(page);

    await login(page, ACCOUNT_A);

    const useWorkspaceButton = page.getByRole("button", {
      name: "Use workspace resume on this browser",
    });
    await expect(useWorkspaceButton).toBeVisible();
    await expect(
      page.getByText(
        "A Workspace resume is selected for this account, but it is not loaded as this browser’s active dashboard report.",
        { exact: true },
      ),
    ).toBeVisible();
    expect(
      await readOwnedValue(
        page,
        ACTIVE_REPORT_KEY,
        ACCOUNT_A.id,
      ),
    ).toBeNull();

    await expect.poll(async () =>
      readOwnedValue(
        page,
        ACTIVE_REPORT_KEY,
        ACCOUNT_A.id,
      )
    ).toBeNull();

    await useWorkspaceButton.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", {
        name:
          "Honest career readiness, based on your current proof.",
      }),
    ).toBeVisible();
    const activeValue = asRecord(
      await readOwnedValue(
        page,
        ACTIVE_REPORT_KEY,
        ACCOUNT_A.id,
      ),
    );
    expect(activeValue.fileName).toBe(selected.file_name);
    expect(api.count("selection:read", ACCOUNT_A.id))
      .toBeGreaterThanOrEqual(4);
  },
);

test(
  "@race an in-flight Workspace change blocks saved-analysis deletion until it settles",
  async ({ page }) => {
    const api = new ResumeWorkspaceApi();
    const first = syntheticAnalysis(
      ACCOUNT_A,
      ACCOUNT_A_FIRST_ID,
      "Workspace action lock resume.pdf",
      "2026-07-25T00:00:00.000Z",
    );
    api.setAnalyses(ACCOUNT_A.id, [first]);
    await api.install(page);

    await login(page, ACCOUNT_A);
    await page.goto("/resume");
    const card = savedCard(page, first.file_name);
    await expect(card).toBeVisible();

    const baseline = api.count("selection:update", ACCOUNT_A.id);
    const gate = api.holdNext("selection:update", ACCOUNT_A.id);
    await card.getByRole("button", {
      name: "Set as workspace resume",
    }).click();
    await api.waitFor(
      "selection:update",
      baseline + 1,
      ACCOUNT_A.id,
    );

    await expect(card.getByRole("button", {
      name: "Delete saved analysis",
    })).toBeDisabled();
    await expect(page.getByRole("dialog", {
      name: "Delete saved resume analysis",
    })).toHaveCount(0);

    gate.release();
    await expect(
      page.getByText(
        "Workspace resume updated. This browser’s active report was not changed.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(card.getByRole("button", {
      name: "Delete saved analysis",
    })).toBeEnabled();
  },
);

test(
  "@phase1a-repair deleting a newly selected Workspace resume clears stale action feedback",
  async ({ page }) => {
    const api = new ResumeWorkspaceApi();
    const selected = syntheticAnalysis(
      ACCOUNT_A,
      ACCOUNT_A_FIRST_ID,
      "Workspace feedback deletion.pdf",
      "2026-07-25T00:00:00.000Z",
    );
    api.setAnalyses(ACCOUNT_A.id, [selected]);
    await api.install(page);

    await login(page, ACCOUNT_A);
    await seedBrowserActiveReport(page, ACCOUNT_A, selected);
    await page.goto("/resume");
    const card = savedCard(page, selected.file_name);
    await expect(card).toBeVisible();

    await card.getByRole("button", {
      name: "Set as workspace resume",
    }).click();
    const workspaceUpdatedMessage = page.getByText(
      "Workspace resume updated. This browser’s active report was not changed.",
      { exact: true },
    );
    await expect(workspaceUpdatedMessage).toBeVisible();
    expect(api.getSelection(ACCOUNT_A.id)?.resume_analysis_id)
      .toBe(selected.id);

    const activeReportBeforeDelete = await readRawStorage(
      page,
      ACTIVE_REPORT_KEY,
    );
    await card.getByRole("button", {
      name: "Delete saved analysis",
    }).click();
    const dialog = page.getByRole("dialog", {
      name: "Delete saved resume analysis",
    });
    await dialog.getByRole("button", {
      name: "Delete saved analysis",
    }).click();

    await expect(card).toHaveCount(0);
    await expect(
      page.getByText(
        "No Workspace resume is selected. Saved analyses and this browser’s active report are unchanged.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(workspaceUpdatedMessage).toHaveCount(0);
    expect(api.getSelection(ACCOUNT_A.id)).toBeNull();
    expect(await readRawStorage(page, ACTIVE_REPORT_KEY))
      .toBe(activeReportBeforeDelete);
  },
);

test(
  "an existing browser-active report wins over a different Workspace resume",
  async ({ page }) => {
    const api = new ResumeWorkspaceApi();
    const browserActive = syntheticAnalysis(
      ACCOUNT_A,
      ACCOUNT_A_FIRST_ID,
      "Browser active resume.pdf",
      "2026-07-25T00:00:00.000Z",
    );
    const workspace = syntheticAnalysis(
      ACCOUNT_A,
      ACCOUNT_A_SECOND_ID,
      "Different Workspace resume.pdf",
      "2026-07-26T00:00:00.000Z",
    );
    api.setAnalyses(ACCOUNT_A.id, [browserActive, workspace]);
    api.setSelection(ACCOUNT_A.id, workspace.id);
    await api.install(page);

    await login(page, ACCOUNT_A);
    await expect(
      page.getByRole("button", {
        name: "Use workspace resume on this browser",
      }),
    ).toBeVisible();
    await seedBrowserActiveReport(page, ACCOUNT_A, browserActive);
    const selectionReadsBeforeReload =
      api.count("selection:read", ACCOUNT_A.id);
    await page.reload();

    await expect(
      page.getByRole("heading", {
        name:
          "Honest career readiness, based on your current proof.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Use workspace resume on this browser",
      }),
    ).toHaveCount(0);
    const activeValue = asRecord(
      await readOwnedValue(
        page,
        ACTIVE_REPORT_KEY,
        ACCOUNT_A.id,
      ),
    );
    expect(activeValue.fileName).toBe(browserActive.file_name);
    expect(api.count("selection:read", ACCOUNT_A.id))
      .toBe(selectionReadsBeforeReload);
  },
);

test(
  "@critical missing Workspace source is unavailable and never falls back to latest",
  async ({ page }) => {
    const api = new ResumeWorkspaceApi();
    const latest = syntheticAnalysis(
      ACCOUNT_A,
      ACCOUNT_A_FIRST_ID,
      "Latest must not substitute.pdf",
      "2026-07-26T00:00:00.000Z",
    );
    api.setAnalyses(ACCOUNT_A.id, [latest]);
    api.setSelection(ACCOUNT_A.id, ACCOUNT_A_MISSING_ID);
    await api.install(page);

    await login(page, ACCOUNT_A);

    await expect(
      page.getByText(
        "The selected Workspace resume is unavailable. SkillMint did not substitute the latest saved analysis.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Restore latest saved report",
      }),
    ).toHaveCount(0);
    expect(api.count("analysis:list", ACCOUNT_A.id)).toBe(0);
    expect(
      await readOwnedValue(
        page,
        ACTIVE_REPORT_KEY,
        ACCOUNT_A.id,
      ),
    ).toBeNull();
  },
);

test(
  "Resume resolves a selected analysis outside the first history page",
  async ({ page }) => {
    const api = new ResumeWorkspaceApi();
    const rows = Array.from(
      { length: 11 },
      (_, index) => syntheticAnalysis(
        ACCOUNT_A,
        `cccccccc-cccc-4ccc-8ccc-${String(index + 1).padStart(12, "0")}`,
        `Historical resume ${index + 1}.pdf`,
        `2026-07-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
      ),
    );
    const selectedOutsidePage = rows[0];
    api.setAnalyses(ACCOUNT_A.id, rows);
    api.setSelection(ACCOUNT_A.id, selectedOutsidePage.id);
    await api.install(page);

    await login(page, ACCOUNT_A);
    await page.goto("/resume");

    await expect(
      page.getByText(
        new RegExp(
          `^${escapeRegExp(selectedOutsidePage.file_name)} — analyzed`,
        ),
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: selectedOutsidePage.file_name,
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Showing 4 of 10 saved analyses.", {
        exact: true,
      }),
    ).toBeVisible();
    expect(api.count("analysis:exact", ACCOUNT_A.id))
      .toBeGreaterThanOrEqual(1);
  },
);

test(
  "selected-analysis deletion cascades Workspace selection and preserves browser report locally",
  async ({ page }) => {
    const api = new ResumeWorkspaceApi();
    const selected = syntheticAnalysis(
      ACCOUNT_A,
      ACCOUNT_A_FIRST_ID,
      "Selected active deletion.pdf",
      "2026-07-25T00:00:00.000Z",
    );
    api.setAnalyses(ACCOUNT_A.id, [selected]);
    api.setSelection(ACCOUNT_A.id, selected.id);
    await api.install(page);

    await login(page, ACCOUNT_A);
    await seedBrowserActiveReport(page, ACCOUNT_A, selected);
    await page.goto("/resume");
    await expect(savedCard(page, selected.file_name)).toBeVisible();

    await savedCard(page, selected.file_name)
      .getByRole("button", {
        name: "Delete saved analysis",
      })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Delete saved resume analysis",
    });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", {
      name: "Delete saved analysis",
    }).click();

    await expect(
      page.getByText(
        "Saved resume analysis deleted from your account. If it was the Workspace resume, that selection was removed. The browser active report was preserved.",
        { exact: true },
      ),
    ).toBeVisible();
    expect(api.getSelection(ACCOUNT_A.id)).toBeNull();
    expect(api.getAnalyses(ACCOUNT_A.id)).toHaveLength(0);

    const activeValue = asRecord(
      await readOwnedValue(
        page,
        ACTIVE_REPORT_KEY,
        ACCOUNT_A.id,
      ),
    );
    expect(activeValue.fileName).toBe(selected.file_name);
    const syncValue = asRecord(
      await readOwnedValue(
        page,
        RESUME_SYNC_STATUS_KEY,
        ACCOUNT_A.id,
      ),
    );
    expect(syncValue.status).toBe("local-only");
    expect(syncValue.databaseId).toBeUndefined();
    await expect(
      page.getByText(
        "No Workspace resume is selected. Saved analyses and this browser’s active report are unchanged.",
        { exact: true },
      ),
    ).toBeVisible();
  },
);

test(
  "@phase1a-repair @race successful deletion detaches the current stored sync reference",
  async ({ page }) => {
    const api = new ResumeWorkspaceApi();
    const deleted = syntheticAnalysis(
      ACCOUNT_A,
      ACCOUNT_A_FIRST_ID,
      "Current storage detach race.pdf",
      "2026-07-25T00:00:00.000Z",
    );
    api.setAnalyses(ACCOUNT_A.id, [deleted]);
    await api.install(page);

    const accountBSyncStatus = {
      status: "synced",
      message: "Account B saved report reference.",
      syncedAt: "2026-07-26T00:00:00.000Z",
      databaseId: ACCOUNT_B_FIRST_ID,
    };
    await login(page, ACCOUNT_A);
    await seedBrowserActiveReport(page, ACCOUNT_A, deleted);
    await page.evaluate(
      ({ key, value }) => {
        window.localStorage.setItem(key, value);
      },
      {
        key: RESUME_SYNC_STATUS_KEY,
        value: ownerContainer({
          accounts: {
            [ACCOUNT_A.id]: {
              status: "synced",
              message: "Initially rendered different saved reference.",
              syncedAt: "2026-07-24T00:00:00.000Z",
              databaseId: ACCOUNT_A_SECOND_ID,
            },
            [ACCOUNT_B.id]: accountBSyncStatus,
          },
        }),
      },
    );
    await page.goto("/resume");
    const card = savedCard(page, deleted.file_name);
    await expect(card).toBeVisible();
    expect(
      asRecord(
        await readOwnedValue(
          page,
          RESUME_SYNC_STATUS_KEY,
          ACCOUNT_A.id,
        ),
      ).databaseId,
    ).toBe(ACCOUNT_A_SECOND_ID);

    const activeReportBeforeDelete = await readRawStorage(
      page,
      ACTIVE_REPORT_KEY,
    );
    const accountBStatusBeforeDelete = await readOwnedValue(
      page,
      RESUME_SYNC_STATUS_KEY,
      ACCOUNT_B.id,
    );
    const deleteBaseline = api.count(
      "analysis:delete",
      ACCOUNT_A.id,
    );
    const deleteGate = api.holdNext(
      "analysis:delete",
      ACCOUNT_A.id,
    );

    await card.getByRole("button", {
      name: "Delete saved analysis",
    }).click();
    await page.getByRole("dialog", {
      name: "Delete saved resume analysis",
    }).getByRole("button", {
      name: "Delete saved analysis",
    }).click();
    await api.waitFor(
      "analysis:delete",
      deleteBaseline + 1,
      ACCOUNT_A.id,
    );

    await page.evaluate(
      ({ key, value }) => {
        window.localStorage.setItem(key, value);
      },
      {
        key: RESUME_SYNC_STATUS_KEY,
        value: ownerContainer({
          accounts: {
            [ACCOUNT_A.id]: {
              status: "synced",
              message: "Another tab restored the deleted reference.",
              syncedAt: "2026-07-27T00:00:00.000Z",
              databaseId: deleted.id,
            },
            [ACCOUNT_B.id]: accountBSyncStatus,
          },
        }),
      },
    );
    deleteGate.release();

    await expect(
      page.getByText(
        "Saved resume analysis deleted from your account. If it was the Workspace resume, that selection was removed. The browser active report was preserved.",
        { exact: true },
      ),
    ).toBeVisible();
    expect(await readRawStorage(page, ACTIVE_REPORT_KEY))
      .toBe(activeReportBeforeDelete);
    const accountASyncStatus = asRecord(
      await readOwnedValue(
        page,
        RESUME_SYNC_STATUS_KEY,
        ACCOUNT_A.id,
      ),
    );
    expect(accountASyncStatus.status).toBe("local-only");
    expect(accountASyncStatus.databaseId).toBeUndefined();
    expect(
      await readOwnedValue(
        page,
        RESUME_SYNC_STATUS_KEY,
        ACCOUNT_B.id,
      ),
    ).toEqual(accountBStatusBeforeDelete);
  },
);

test(
  "@critical bulk saved-report deletion removes the Workspace selection and keeps the browser report local",
  async ({ page }) => {
    const api = new ResumeWorkspaceApi();
    const selected = syntheticAnalysis(
      ACCOUNT_A,
      ACCOUNT_A_FIRST_ID,
      "Bulk deletion workspace.pdf",
      "2026-07-25T00:00:00.000Z",
    );
    api.setAnalyses(ACCOUNT_A.id, [selected]);
    api.setSelection(ACCOUNT_A.id, selected.id);
    await api.install(page);
    await page.route(
      "**/rest/v1/rpc/delete_current_user_saved_reports**",
      async (route) => {
        api.deleteSavedReports(ACCOUNT_A.id);
        await json(route, 200, {
          resume_analyses_deleted: 1,
          job_matches_deleted: 0,
          career_snapshots_deleted: 0,
        });
      },
    );

    await login(page, ACCOUNT_A);
    await seedBrowserActiveReport(page, ACCOUNT_A, selected);
    const activeBefore = await readRawStorage(page, ACTIVE_REPORT_KEY);
    await page.goto("/settings/data");
    await page.getByRole("button", {
      name: "Delete saved reports",
    }).click();
    const dialog = page.getByRole("dialog", {
      name: "Delete saved reports",
    });
    await dialog.getByRole("button", {
      name: "Delete saved reports",
      exact: true,
    }).click();

    await expect(
      page.getByRole("status").filter({
        hasText:
          "The Workspace resume selection and saved reports were deleted from your account.",
      }),
    ).toBeVisible();
    expect(api.getSelection(ACCOUNT_A.id)).toBeNull();
    expect(api.getAnalyses(ACCOUNT_A.id)).toHaveLength(0);
    expect(await readRawStorage(page, ACTIVE_REPORT_KEY)).toBe(activeBefore);
    const syncValue = asRecord(
      await readOwnedValue(page, RESUME_SYNC_STATUS_KEY, ACCOUNT_A.id),
    );
    expect(syncValue.status).toBe("local-only");
    expect(syncValue.databaseId).toBeUndefined();
  },
);

test(
  "@critical account deletion follow-up removes server selection and the deleted owner’s browser partition",
  async ({ page }) => {
    const api = new ResumeWorkspaceApi();
    const selected = syntheticAnalysis(
      ACCOUNT_A,
      ACCOUNT_A_FIRST_ID,
      "Account deletion workspace.pdf",
      "2026-07-25T00:00:00.000Z",
    );
    api.setAnalyses(ACCOUNT_A.id, [selected]);
    api.setSelection(ACCOUNT_A.id, selected.id);
    await api.install(page);
    await page.route("**/api/account/delete", async (route) => {
      api.deleteSavedReports(ACCOUNT_A.id);
      await json(route, 200, { ok: true, deleted: true });
    });

    await login(page, ACCOUNT_A);
    await seedBrowserActiveReport(page, ACCOUNT_A, selected);
    await page.goto("/settings/data");
    await page.getByRole("button", {
      name: "Delete SkillMint account",
    }).click();
    const dialog = page.getByRole("dialog", {
      name: "Delete SkillMint account",
    });
    await dialog.getByLabel("Current password").fill(SYNTHETIC_PASSWORD);
    await dialog.getByLabel("Type DELETE MY ACCOUNT").fill(
      "DELETE MY ACCOUNT",
    );
    await dialog.getByRole("button", {
      name: "Delete SkillMint account",
      exact: true,
    }).click();

    await expect(page.getByRole("status")).toContainText(
      "Account access was deleted",
    );
    expect(api.getSelection(ACCOUNT_A.id)).toBeNull();
    expect(api.getAnalyses(ACCOUNT_A.id)).toHaveLength(0);
    expect(
      await readOwnedValue(page, ACTIVE_REPORT_KEY, ACCOUNT_A.id),
    ).toBeNull();
    expect(
      await readOwnedValue(page, RESUME_SYNC_STATUS_KEY, ACCOUNT_A.id),
    ).toBeNull();
  },
);

test(
  "Workspace repository failure is exposed with accessible alert semantics",
  async ({ page }) => {
    const api = new ResumeWorkspaceApi();
    const first = syntheticAnalysis(
      ACCOUNT_A,
      ACCOUNT_A_FIRST_ID,
      "Accessible error resume.pdf",
      "2026-07-25T00:00:00.000Z",
    );
    api.setAnalyses(ACCOUNT_A.id, [first]);
    await api.install(page);

    await login(page, ACCOUNT_A);
    await expect(
      page.getByRole("button", {
        name: "Restore latest saved report",
      }),
    ).toBeVisible();
    api.failEvery("selection:read", ACCOUNT_A.id);
    await page.goto("/resume");

    await expect(
      page.getByRole("alert").filter({
        hasText: "Could not load the Workspace resume selection.",
      }),
    ).toBeVisible();
  },
);

test(
  "@race late Account A Workspace load cannot publish after Account B becomes current",
  async ({ page, context }) => {
    const api = await prepareRaceWorkspace(page, {
      accountASelection: ACCOUNT_A_FIRST_ID,
    });
    const baseline = api.count("selection:read", ACCOUNT_A.id);
    const gate = api.holdNext("selection:read", ACCOUNT_A.id);

    await page.reload();
    await api.waitFor(
      "selection:read",
      baseline + 1,
      ACCOUNT_A.id,
    );
    await switchResumeAccount(
      context,
      page,
      ACCOUNT_B,
    );
    gate.release();

    await expect(
      savedCard(page, "Account B race resume.pdf"),
    ).toBeVisible();
    await expect(
      page.getByText("Account A race resume.pdf", {
        exact: false,
      }),
    ).toHaveCount(0);
  },
);

test(
  "@race late Account A set result cannot become Account B Workspace state",
  async ({ page, context }) => {
    const api = await prepareRaceWorkspace(page, {
      accountASelection: null,
    });
    const baseline = api.count("selection:update", ACCOUNT_A.id);
    const gate = api.holdNext("selection:update", ACCOUNT_A.id);

    await savedCard(page, "Account A race resume.pdf")
      .getByRole("button", {
        name: "Set as workspace resume",
      })
      .click();
    await api.waitFor(
      "selection:update",
      baseline + 1,
      ACCOUNT_A.id,
    );
    await switchResumeAccount(
      context,
      page,
      ACCOUNT_B,
    );
    gate.release();

    await expect(
      savedCard(page, "Account B race resume.pdf"),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Workspace resume updated. This browser’s active report was not changed.",
        { exact: true },
      ),
    ).toHaveCount(0);
    expect(api.getSelection(ACCOUNT_A.id)).toBeNull();
    expect(api.getSelection(ACCOUNT_B.id)).toBeNull();
    expect(api.count("selection:insert", ACCOUNT_B.id)).toBe(0);
  },
);

test(
  "@race late Account A clear result cannot clear or publish under Account B",
  async ({ page, context }) => {
    const api = await prepareRaceWorkspace(page, {
      accountASelection: ACCOUNT_A_FIRST_ID,
    });
    const baseline = api.count("selection:delete", ACCOUNT_A.id);
    const gate = api.holdNext("selection:delete", ACCOUNT_A.id);

    await page.getByRole("button", {
      name: "Clear workspace resume",
    }).click();
    await api.waitFor(
      "selection:delete",
      baseline + 1,
      ACCOUNT_A.id,
    );
    await switchResumeAccount(
      context,
      page,
      ACCOUNT_B,
    );
    gate.release();

    await expect(
      savedCard(page, "Account B race resume.pdf"),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Workspace resume cleared. Saved analyses and this browser’s active report were preserved.",
        { exact: true },
      ),
    ).toHaveCount(0);
    await expect.poll(
      () => api.getSelection(ACCOUNT_A.id),
    ).toBeNull();
    expect(api.getSelection(ACCOUNT_B.id)).toBeNull();
  },
);

test(
  "@race late Account A delete result cannot delete Account B data or publish under Account B",
  async ({ page, context }) => {
    const api = await prepareRaceWorkspace(page, {
      accountASelection: ACCOUNT_A_FIRST_ID,
    });
    const baseline = api.count("analysis:delete", ACCOUNT_A.id);
    const gate = api.holdNext("analysis:delete", ACCOUNT_A.id);

    await savedCard(page, "Account A race resume.pdf")
      .getByRole("button", {
        name: "Delete saved analysis",
      })
      .click();
    await page.getByRole("dialog", {
      name: "Delete saved resume analysis",
    }).getByRole("button", {
      name: "Delete saved analysis",
    }).click();
    await api.waitFor(
      "analysis:delete",
      baseline + 1,
      ACCOUNT_A.id,
    );
    await switchResumeAccount(
      context,
      page,
      ACCOUNT_B,
    );
    gate.release();

    await expect(
      savedCard(page, "Account B race resume.pdf"),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Saved resume analysis deleted from your account. If it was the Workspace resume, that selection was removed. The browser active report was preserved.",
        { exact: true },
      ),
    ).toHaveCount(0);
    await expect.poll(
      () => api.getAnalyses(ACCOUNT_A.id),
    ).toHaveLength(0);
    expect(api.getAnalyses(ACCOUNT_B.id)).toHaveLength(1);
  },
);

async function prepareRaceWorkspace(
  page: Page,
  {
    accountASelection,
  }: {
    accountASelection: string | null;
  },
) {
  const api = new ResumeWorkspaceApi();
  api.setAnalyses(ACCOUNT_A.id, [
    syntheticAnalysis(
      ACCOUNT_A,
      ACCOUNT_A_FIRST_ID,
      "Account A race resume.pdf",
      "2026-07-25T00:00:00.000Z",
    ),
  ]);
  api.setAnalyses(ACCOUNT_B.id, [
    syntheticAnalysis(
      ACCOUNT_B,
      ACCOUNT_B_FIRST_ID,
      "Account B race resume.pdf",
      "2026-07-26T00:00:00.000Z",
    ),
  ]);
  api.setSelection(ACCOUNT_A.id, accountASelection);
  api.setSelection(ACCOUNT_B.id, null);
  await api.install(page);

  await login(page, ACCOUNT_A);
  await page.goto("/resume");
  await expect(
    savedCard(page, "Account A race resume.pdf"),
  ).toBeVisible();
  if (accountASelection) {
    await expect(
      page.getByText(
        /^Account A race resume\.pdf — analyzed/,
      ),
    ).toBeVisible();
  } else {
    await expect(
      page.getByText(
        "No Workspace resume is selected. Saved analyses and this browser’s active report are unchanged.",
        { exact: true },
      ),
    ).toBeVisible();
  }

  return api;
}

async function switchResumeAccount(
  context: BrowserContext,
  observingPage: Page,
  account: Account,
) {
  const controlPage = await context.newPage();
  await login(controlPage, account);
  await expect(
    savedCard(
      observingPage,
      `${account.name} race resume.pdf`,
    ),
  ).toBeVisible();
  await controlPage.close();
}

function syntheticAnalysis(
  account: Account,
  id: string,
  fileName: string,
  createdAt: string,
): ResumeAnalysisRow {
  return {
    id,
    user_id: account.id,
    file_name: fileName,
    file_type: "application/pdf",
    extracted_text:
      `${account.name} TypeScript React resume evidence`,
    parsed_profile: {
      skills: ["TypeScript", "React"],
      projects: ["Proof-aware career workspace"],
      education: ["B.Tech Information Technology"],
      experience: ["Built accessible web applications"],
      certifications: [],
      links: {},
      rawSections: {},
    },
    user_profile: {
      resumeScore: 72,
      skillsScore: 76,
      projectsScore: 70,
      experienceScore: 68,
      educationScore: 72,
      githubScore: 45,
      linkedinScore: 40,
      atsScore: 74,
      recruiterScore: 69,
      activityScore: 55,
      skills: ["TypeScript", "React", "Node.js"],
      projects: ["Proof-aware career workspace"],
      experience: ["Built accessible web applications"],
      education: "B.Tech Information Technology",
      certifications: [],
      codingProfiles: [],
    },
    created_at: createdAt,
  };
}

function toActiveReport(row: ResumeAnalysisRow) {
  return {
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: 0,
    extractedText: row.extracted_text,
    parsedProfile: row.parsed_profile,
    userProfile: row.user_profile,
    analyzedAt: row.created_at,
    status: "completed",
  };
}

async function seedBrowserActiveReport(
  page: Page,
  account: Account,
  row: ResumeAnalysisRow,
) {
  const report = ownerContainer({
    accounts: {
      [account.id]: toActiveReport(row),
    },
  });
  const syncStatus = ownerContainer({
    accounts: {
      [account.id]: {
        status: "synced",
        message: "Synthetic saved report reference.",
        syncedAt: row.created_at,
        databaseId: row.id,
      },
    },
  });

  await page.evaluate(
    ({
      activeReportKey,
      activeReportValue,
      syncStatusKey,
      syncStatusValue,
    }) => {
      window.localStorage.setItem(
        activeReportKey,
        activeReportValue,
      );
      window.localStorage.setItem(
        syncStatusKey,
        syncStatusValue,
      );
    },
    {
      activeReportKey: ACTIVE_REPORT_KEY,
      activeReportValue: report,
      syncStatusKey: RESUME_SYNC_STATUS_KEY,
      syncStatusValue: syncStatus,
    },
  );
}

function savedCard(page: Page, fileName: string) {
  return page.locator("article").filter({
    has: page.getByRole("heading", {
      name: fileName,
      exact: true,
    }),
  });
}

async function readRawStorage(page: Page, key: string) {
  return page.evaluate(
    (storageKey) => window.localStorage.getItem(storageKey),
    key,
  );
}

async function readOwnedValue(
  page: Page,
  key: string,
  accountId: string,
): Promise<unknown | null> {
  const raw = await readRawStorage(page, key);
  if (!raw) {
    return null;
  }

  const parsed = asRecord(JSON.parse(raw));
  const partitions = asRecord(parsed.partitions);
  const accounts = asRecord(partitions.accounts);
  const partition = asRecord(accounts[accountId]);
  return partition.value ?? null;
}

async function expectNoSeriousAxeViolations(page: Page) {
  const result = await new AxeBuilder({ page }).analyze();
  const serious = result.violations.filter((violation) =>
    violation.impact === "serious" ||
    violation.impact === "critical"
  );
  expect(
    serious.map(({ id, impact, nodes }) => ({
      id,
      impact,
      nodes: nodes.map((node) => ({
        target: node.target,
        html: node.html,
        failureSummary: node.failureSummary,
      })),
    })),
  ).toEqual([]);
}

function getEqValue(url: URL, key: string) {
  const value = url.searchParams.get(key);
  return value?.startsWith("eq.")
    ? value.slice(3)
    : null;
}

function getBearerSubject(
  authorization: string | undefined,
): string | null {
  const token = authorization?.replace(
    /^Bearer\s+/i,
    "",
  );
  const encodedPayload = token?.split(".")[1];
  if (!encodedPayload) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(
        encodedPayload,
        "base64url",
      ).toString("utf8"),
    ) as Record<string, unknown>;
    return typeof payload.sub === "string"
      ? payload.sub
      : null;
  } catch {
    return null;
  }
}

function gateKey(
  kind: WorkspaceRequestKind,
  accountId: string,
) {
  return `${kind}:${accountId}`;
}

function asRecord(
  value: unknown,
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }
  return value as Record<string, unknown>;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function responseHeaders() {
  return {
    "access-control-allow-origin": APP_ORIGIN,
    "access-control-allow-headers":
      "authorization, apikey, content-type, prefer, profile, x-client-info, x-supabase-api-version",
    "access-control-allow-methods":
      "GET, HEAD, POST, PATCH, DELETE, OPTIONS",
    "access-control-expose-headers": "content-range",
    "content-type": "application/json",
  };
}

async function json(
  route: Route,
  status: number,
  body: unknown,
) {
  await route.fulfill({
    status,
    headers: responseHeaders(),
    body: JSON.stringify(body),
  });
}
