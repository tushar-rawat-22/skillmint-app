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
  test,
} from "./support/runtime";

const ACTIVE_REPORT_KEY = "skillmint:resume-analysis";
const RESUME_SYNC_STATUS_KEY = "skillmint:resume-sync-status";
const ACCOUNT_A_FIRST_ID =
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const ACCOUNT_A_SECOND_ID =
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";

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

type ComparisonRequestKind = "history" | "pair";

type ComparisonRequest = {
  accountId: string | null;
  ids: string[];
  kind: ComparisonRequestKind;
  select: string;
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

class ResumeComparisonApi {
  readonly requests: ComparisonRequest[] = [];
  private readonly analyses = new Map<string, ResumeAnalysisRow[]>();
  private readonly gates = new Map<string, Deferred[]>();
  private readonly malformedPairs = new Map<string, number>();

  async install(page: Page) {
    await page.route(
      "**/rest/v1/resume_analyses**",
      async (route) => {
        await this.handleRequest(route);
      },
    );
  }

  setAnalyses(accountId: string, rows: ResumeAnalysisRow[]) {
    this.analyses.set(accountId, [...rows]);
  }

  deleteAnalysis(accountId: string, analysisId: string) {
    this.analyses.set(
      accountId,
      (this.analyses.get(accountId) ?? []).filter(
        (row) => row.id !== analysisId,
      ),
    );
  }

  malformedNextPair(accountId: string) {
    this.malformedPairs.set(
      accountId,
      (this.malformedPairs.get(accountId) ?? 0) + 1,
    );
  }

  holdNext(kind: ComparisonRequestKind, accountId: string) {
    const gate = new Deferred();
    const key = requestKey(kind, accountId);
    this.gates.set(key, [
      ...(this.gates.get(key) ?? []),
      gate,
    ]);
    return gate;
  }

  count(kind: ComparisonRequestKind, accountId?: string) {
    return this.requests.filter((request) =>
      request.kind === kind &&
      (accountId === undefined || request.accountId === accountId)
    ).length;
  }

  async waitFor(
    kind: ComparisonRequestKind,
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

  latest(kind: ComparisonRequestKind, accountId: string) {
    return this.requests.findLast(
      (request) =>
        request.kind === kind &&
        request.accountId === accountId,
    ) ?? null;
  }

  private async handleRequest(route: Route) {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: responseHeaders(),
      });
      return;
    }

    if (request.method() !== "GET") {
      await json(route, 405, {
        message: "Synthetic comparison API accepts reads only.",
      });
      return;
    }

    const accountId = getBearerSubject(
      request.headers().authorization,
    );
    if (!accountId) {
      await json(route, 401, {
        message: "Synthetic session missing.",
      });
      return;
    }

    const url = new URL(request.url());
    const requestedIds = readRequestedIds(url);
    const kind: ComparisonRequestKind =
      requestedIds.length > 0 ? "pair" : "history";
    const select = url.searchParams.get("select") ?? "";
    this.requests.push({
      accountId,
      ids: requestedIds,
      kind,
      select,
      url: url.toString(),
    });

    const gateQueue = this.gates.get(requestKey(kind, accountId));
    const gate = gateQueue?.shift();
    if (gate) {
      await gate.promise;
    }

    const qualifiedOwner = readEqValue(url, "user_id");
    if (qualifiedOwner !== accountId) {
      await json(route, 200, []);
      return;
    }

    const rows = this.analyses.get(accountId) ?? [];
    if (kind === "pair") {
      const selected = rows.filter((row) =>
        requestedIds.includes(row.id)
      );
      const output = selected.map((row) =>
        projectSelectedColumns(row, select)
      );
      if (this.consumeMalformedPair(accountId) && output[0]) {
        delete output[0].comparison_skills;
      }
      await json(route, 200, output);
      return;
    }

    const start = url.searchParams.has("or") ? 10 : 0;
    const limit = Number(url.searchParams.get("limit") ?? "11");
    const page = rows
      .slice(start, start + limit)
      .map((row) => projectSelectedColumns(row, select));
    await json(route, 200, page);
  }

  private consumeMalformedPair(accountId: string) {
    const remaining = this.malformedPairs.get(accountId) ?? 0;
    if (remaining === 0) {
      return false;
    }
    this.malformedPairs.set(accountId, remaining - 1);
    return true;
  }
}

test.describe("saved resume comparison", () => {
  test(
    "signed-out access hides personal history and does not query it",
    async ({ page }) => {
      const api = new ResumeComparisonApi();
      api.setAnalyses(
        ACCOUNT_A.id,
        syntheticAnalyses(ACCOUNT_A, 2),
      );
      await api.install(page);

      await page.goto("/resume/compare");

      await expect(
        page.getByRole("heading", {
          name: "Compare saved report evidence",
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", {
          name: "Sign in to compare saved reports",
        }),
      ).toBeVisible();
      await expect(
        page.getByText("Account A report 01.pdf", {
          exact: true,
        }),
      ).toHaveCount(0);
      expect(api.count("history")).toBe(0);
      expect(api.count("pair")).toBe(0);
    },
  );

  test(
    "empty and one-report history keep comparison unavailable",
    async ({ page }) => {
      const api = new ResumeComparisonApi();
      api.setAnalyses(ACCOUNT_A.id, []);
      await api.install(page);

      await login(page, ACCOUNT_A);
      await page.goto("/resume/compare");

      await expect(
        page.getByRole("heading", {
          name: "No saved reports",
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Compare" }),
      ).toBeDisabled();

      api.setAnalyses(
        ACCOUNT_A.id,
        syntheticAnalyses(ACCOUNT_A, 1),
      );
      await page.reload();

      await expect(
        page.getByText(
          "One saved report is available. A comparison requires two different saved reports.",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Compare" }),
      ).toBeDisabled();
    },
  );

  test(
    "explicit Source A and Source B selections survive bounded pagination without entering the URL",
    async ({ page }) => {
      const api = new ResumeComparisonApi();
      const rows = syntheticAnalyses(ACCOUNT_A, 12);
      api.setAnalyses(ACCOUNT_A.id, rows);
      await api.install(page);

      await login(page, ACCOUNT_A);
      await page.goto("/resume/compare");

      const firstCard = savedReportCard(page, rows[0].file_name);
      await firstCard.getByRole("button", {
        name: "Assign to Source A",
      }).click();
      await expect(firstCard.getByRole("button", {
        name: "Already Source A",
      })).toBeDisabled();

      await page.getByRole("button", {
        name: "Next",
        exact: true,
      }).click();
      const lastCard = savedReportCard(page, rows[10].file_name);
      await expect(lastCard).toBeVisible();
      await lastCard.getByRole("button", {
        name: "Assign to Source B",
      }).click();

      await expect(
        page.getByText("2 of 2 selected", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText(rows[0].file_name, { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText(rows[10].file_name, { exact: true }),
      ).toHaveCount(2);

      await page.getByRole("button", {
        name: "Back",
        exact: true,
      }).click();
      await expect(firstCard).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Compare" }),
      ).toBeEnabled();

      const currentUrl = new URL(page.url());
      expect(currentUrl.pathname).toBe("/resume/compare");
      expect(currentUrl.search).toBe("");
      expect(currentUrl.hash).toBe("");
      expect(page.url()).not.toContain(rows[0].id);
      expect(page.url()).not.toContain(rows[10].id);
    },
  );

  test(
    "successful comparison preserves source order and exposes only sanitized evidence",
    async ({ page }) => {
      const api = new ResumeComparisonApi();
      const rows = comparisonRows(ACCOUNT_A);
      api.setAnalyses(ACCOUNT_A.id, rows);
      await api.install(page);

      await login(page, ACCOUNT_A);
      await page.goto("/resume/compare");
      await assignPair(page, rows[0], rows[1]);
      await page.getByRole("button", { name: "Compare" }).click();

      await expect(
        page.getByRole("heading", {
          name: "Saved report evidence",
          exact: true,
        }),
      ).toBeVisible();
      const pairRequest = api.latest("pair", ACCOUNT_A.id);
      expect(pairRequest?.ids).toEqual([
        rows[0].id,
        rows[1].id,
      ]);
      expect(pairRequest?.select).not.toContain("extracted_text");
      expect(pairRequest?.select).not.toContain("file_type");
      expect(pairRequest?.select).not.toContain("parsed_profile,");
      expect(pairRequest?.select).not.toContain("user_profile,");

      const resultText = await page.locator("main").innerText();
      expect(resultText.indexOf("Source A")).toBeLessThan(
        resultText.indexOf("Source B"),
      );
      expect(resultText).toContain("TypeScript");
      expect(resultText).toContain("Rust");
      expect(resultText).not.toContain(
        "RAW_PROJECT_CONFIDENTIAL_CLIENT",
      );
      expect(resultText).not.toContain(
        "RAW_EXPERIENCE_PRIVATE_EMPLOYER",
      );
      expect(resultText).not.toContain(
        "RAW_CERTIFICATION_SECRET_NUMBER",
      );
      expect(resultText).not.toContain(
        "https://private.example.test/profile",
      );
      expect(resultText).not.toContain("person@example.test");
      expect(resultText).not.toContain(ACCOUNT_A.id);
      expect(resultText).not.toContain("RAW_SCORE_97");
      expect(resultText).not.toContain("hiring probability");
      expect(resultText).not.toContain("recommendation");
      expect(resultText).not.toContain("progress");
    },
  );

  test(
    "refresh clears stale results for deleted and malformed sources while retaining selections",
    async ({ page }) => {
      const api = new ResumeComparisonApi();
      const rows = comparisonRows(ACCOUNT_A);
      api.setAnalyses(ACCOUNT_A.id, rows);
      await api.install(page);

      await login(page, ACCOUNT_A);
      await page.goto("/resume/compare");
      await assignPair(page, rows[0], rows[1]);
      await page.getByRole("button", { name: "Compare" }).click();
      await expect(
        page.getByRole("heading", {
          name: "Saved report evidence",
          exact: true,
        }),
      ).toBeVisible();

      api.deleteAnalysis(ACCOUNT_A.id, rows[1].id);
      await page.getByRole("button", {
        name: "Refresh comparison",
      }).click();
      await expect(
        page.getByRole("heading", {
          name: "Comparison unavailable",
        }),
      ).toBeVisible();
      await expect(
        page.getByText(
          "One or both selected reports are no longer available. Replace a source and try again.",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", {
          name: "Saved report evidence",
          exact: true,
        }),
      ).toHaveCount(0);
      await expect(
        page.getByText("2 of 2 selected", { exact: true }),
      ).toBeVisible();

      api.setAnalyses(ACCOUNT_A.id, rows);
      api.malformedNextPair(ACCOUNT_A.id);
      await page.getByRole("button", { name: "Compare" }).click();
      await expect(
        page.getByText(
          "One or both selected reports could not be safely read. Replace a source and try again.",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Clear Source A" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Clear Source B" }),
      ).toBeVisible();
      await expect(
        page.getByText("RAW_SYNTHETIC_PROVIDER_SECRET"),
      ).toHaveCount(0);
    },
  );

  test(
    "Account A delayed history is synchronously masked and cannot publish after Account B takes ownership",
    async ({ context, page }) => {
      const api = new ResumeComparisonApi();
      const accountARows = syntheticAnalyses(ACCOUNT_A, 2);
      const accountBRows = syntheticAnalyses(ACCOUNT_B, 2);
      api.setAnalyses(ACCOUNT_A.id, accountARows);
      api.setAnalyses(ACCOUNT_B.id, accountBRows);
      const delayedAccountAHistory = api.holdNext(
        "history",
        ACCOUNT_A.id,
      );
      const delayedAccountBHistory = api.holdNext(
        "history",
        ACCOUNT_B.id,
      );
      await api.install(page);

      await login(page, ACCOUNT_A);
      await page.goto("/resume/compare");
      await api.waitFor("history", 1, ACCOUNT_A.id);

      await logInOnControlPage(context, ACCOUNT_B);
      await api.waitFor("history", 1, ACCOUNT_B.id);
      await expect(
        page.getByText(accountARows[0].file_name, {
          exact: true,
        }),
      ).toHaveCount(0);
      await expect(
        page.getByText("0 of 2 selected", { exact: true }),
      ).toBeVisible();
      delayedAccountBHistory.release();
      await expect(
        page.getByText(accountBRows[0].file_name, {
          exact: true,
        }),
      ).toBeVisible();

      delayedAccountAHistory.release();
      await expect.poll(
        () => api.count("history", ACCOUNT_B.id),
      ).toBeGreaterThanOrEqual(1);
      await expect(
        page.getByText(accountARows[0].file_name, {
          exact: true,
        }),
      ).toHaveCount(0);
    },
  );

  test(
    "Account A delayed pair is invalidated before Account B can see selection or results",
    async ({ context, page }) => {
      const api = new ResumeComparisonApi();
      const accountARows = comparisonRows(ACCOUNT_A);
      const accountBRows = syntheticAnalyses(ACCOUNT_B, 2);
      api.setAnalyses(ACCOUNT_A.id, accountARows);
      api.setAnalyses(ACCOUNT_B.id, accountBRows);
      const delayedAccountBHistory = api.holdNext(
        "history",
        ACCOUNT_B.id,
      );
      await api.install(page);

      await login(page, ACCOUNT_A);
      await page.goto("/resume/compare");
      await assignPair(page, accountARows[0], accountARows[1]);
      const delayedAccountAPair = api.holdNext("pair", ACCOUNT_A.id);
      await page.getByRole("button", { name: "Compare" }).click();
      await api.waitFor("pair", 1, ACCOUNT_A.id);

      await logInOnControlPage(context, ACCOUNT_B);
      await api.waitFor("history", 1, ACCOUNT_B.id);
      await expect(
        page.getByText("0 of 2 selected", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText(accountARows[0].file_name, {
          exact: true,
        }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("heading", {
          name: "Saved report evidence",
          exact: true,
        }),
      ).toHaveCount(0);
      delayedAccountBHistory.release();
      await expect(
        page.getByText(accountBRows[0].file_name, {
          exact: true,
        }),
      ).toBeVisible();

      delayedAccountAPair.release();
      await expect(
        page.getByRole("heading", {
          name: "Saved report evidence",
          exact: true,
        }),
      ).toHaveCount(0);
      await expect(
        page.getByText(accountARows[1].file_name, {
          exact: true,
        }),
      ).toHaveCount(0);
    },
  );

  test(
    "keyboard, announcements, storage isolation, accessibility, and 320px layout remain usable",
    async ({ page, provider }) => {
      const api = new ResumeComparisonApi();
      const rows = comparisonRows(ACCOUNT_A);
      api.setAnalyses(ACCOUNT_A.id, rows);
      await api.install(page);
      await page.setViewportSize({ width: 320, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });

      await login(page, ACCOUNT_A);
      await page.goto("/resume/compare");
      await seedIsolationMarkers(page);
      const before = await readIsolationSnapshot(page);

      const sourceAButton = savedReportCard(
        page,
        rows[0].file_name,
      ).getByRole("button", {
        name: "Assign to Source A",
      });
      await sourceAButton.focus();
      await expect(sourceAButton).toBeFocused();
      await expect(sourceAButton).toHaveCSS(
        "outline-style",
        "solid",
      );
      await page.keyboard.press("Enter");

      const sourceBButton = savedReportCard(
        page,
        rows[1].file_name,
      ).getByRole("button", {
        name: "Assign to Source B",
      });
      await sourceBButton.focus();
      await page.keyboard.press("Enter");
      await expect(
        page.getByText("2 of 2 selected", { exact: true }),
      ).toBeVisible();

      const compareButton = page.getByRole("button", {
        name: "Compare",
      });
      await compareButton.focus();
      await page.keyboard.press("Enter");
      await expect(
        page.getByRole("heading", {
          name: "Saved report evidence",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.locator("[aria-live='polite']").filter({
          has: page.getByRole("heading", {
            name: "Saved report evidence",
            exact: true,
          }),
        }),
      ).toBeVisible();

      await expect.poll(
        () => page.evaluate(() => ({
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        })),
      ).toEqual({
        clientWidth: 320,
        scrollWidth: 320,
      });
      await expectNoSeriousAxeViolations(page);

      expect(await readIsolationSnapshot(page)).toEqual(before);
      expect(
        before.localKeys.filter((key) =>
          key.includes("resume-comparison")
        ),
      ).toEqual([]);
      expect(
        provider.count("rows:active_resume_selections", ACCOUNT_A.id),
      ).toBe(0);
      expect(
        provider.requests.filter((request) =>
          request.url.includes("analytics")
        ),
      ).toEqual([]);
    },
  );
});

async function assignPair(
  page: Page,
  sourceA: ResumeAnalysisRow,
  sourceB: ResumeAnalysisRow,
) {
  await savedReportCard(page, sourceA.file_name)
    .getByRole("button", {
      name: "Assign to Source A",
    })
    .click();
  await savedReportCard(page, sourceB.file_name)
    .getByRole("button", {
      name: "Assign to Source B",
    })
    .click();
  await expect(
    page.getByText("2 of 2 selected", { exact: true }),
  ).toBeVisible();
}

async function logInOnControlPage(
  context: BrowserContext,
  account: Account,
) {
  const controlPage = await context.newPage();
  await login(controlPage, account);
  await controlPage.close();
}

function savedReportCard(page: Page, fileName: string) {
  return page.locator("article").filter({
    has: page.getByRole("heading", {
      name: fileName,
      exact: true,
    }),
  });
}

function syntheticAnalyses(
  account: Account,
  count: number,
): ResumeAnalysisRow[] {
  const prefix = account.id === ACCOUNT_A.id ? "a" : "b";
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix.repeat(8)}-${prefix.repeat(4)}-4${prefix.repeat(3)}-8${prefix.repeat(3)}-${String(index + 1).padStart(12, "0")}`,
    user_id: account.id,
    file_name: `${account.name} report ${String(index + 1).padStart(2, "0")}.pdf`,
    file_type: "application/pdf",
    extracted_text: `RAW_RESUME_TEXT_${account.name}_${index + 1}`,
    parsed_profile: {
      skills: ["TypeScript"],
      projects: ["One project"],
      experience: ["One role"],
      certifications: [],
      links: {},
    },
    user_profile: {
      analysisFlags: {
        hasMeasurableImpact: false,
        hasSectionClarity: true,
        hasProofLink: false,
        hasGenericProjects: false,
        isPlaceholderText: false,
      },
    },
    created_at: new Date(
      Date.UTC(2026, 6, 28, 12, 0, 0) - index * 60_000,
    ).toISOString(),
  }));
}

function comparisonRows(account: Account): ResumeAnalysisRow[] {
  const rows = syntheticAnalyses(account, 2);
  rows[0] = {
    ...rows[0],
    id: account.id === ACCOUNT_A.id
      ? ACCOUNT_A_FIRST_ID
      : rows[0].id,
    parsed_profile: {
      skills: ["TypeScript", "React"],
      projects: ["RAW_PROJECT_CONFIDENTIAL_CLIENT"],
      experience: ["RAW_EXPERIENCE_PRIVATE_EMPLOYER"],
      certifications: ["RAW_CERTIFICATION_SECRET_NUMBER"],
      links: {
        github: "https://private.example.test/profile",
        email: "person@example.test",
      },
      contact: {
        email: "person@example.test",
      },
      score: "RAW_SCORE_97",
    },
    user_profile: {
      analysisFlags: {
        hasMeasurableImpact: true,
        hasSectionClarity: true,
        hasProofLink: true,
        hasGenericProjects: false,
        isPlaceholderText: false,
      },
      score: "RAW_SCORE_97",
      contact: "person@example.test",
    },
  };
  rows[1] = {
    ...rows[1],
    id: account.id === ACCOUNT_A.id
      ? ACCOUNT_A_SECOND_ID
      : rows[1].id,
    parsed_profile: {
      skills: ["TypeScript", "Rust"],
      projects: ["Project one", "Project two"],
      experience: [],
      certifications: [],
      links: {
        linkedin: "https://private.example.test/profile",
      },
    },
    user_profile: {
      analysisFlags: {
        hasMeasurableImpact: false,
        hasSectionClarity: true,
        hasProofLink: true,
        hasGenericProjects: true,
        isPlaceholderText: false,
      },
    },
  };
  return rows;
}

function projectSelectedColumns(
  row: ResumeAnalysisRow,
  select: string,
): Record<string, unknown> {
  return Object.fromEntries(
    select.split(",").filter(Boolean).map((projection) => {
      const separator = projection.indexOf(":");
      const alias = separator >= 0
        ? projection.slice(0, separator)
        : projection;
      const path = separator >= 0
        ? projection.slice(separator + 1)
        : projection;
      return [alias, readProjectionPath(row, path)];
    }),
  );
}

function readProjectionPath(
  row: ResumeAnalysisRow,
  path: string,
): unknown {
  const segments = path.split("->");
  let value: unknown = row;
  for (const segment of segments) {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      return null;
    }
    value = (value as Record<string, unknown>)[segment];
  }
  return value ?? null;
}

function readRequestedIds(url: URL) {
  const filter = url.searchParams.get("id");
  if (!filter?.startsWith("in.(") || !filter.endsWith(")")) {
    return [];
  }
  return filter.slice(4, -1).split(",").filter(Boolean);
}

function readEqValue(url: URL, key: string) {
  const value = url.searchParams.get(key);
  return value?.startsWith("eq.") ? value.slice(3) : null;
}

function getBearerSubject(
  authorization: string | undefined,
): string | null {
  const token = authorization?.replace(/^Bearer\s+/i, "");
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
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

function requestKey(
  kind: ComparisonRequestKind,
  accountId: string,
) {
  return `${kind}:${accountId}`;
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

async function seedIsolationMarkers(page: Page) {
  await page.evaluate(
    ({
      activeReportKey,
      activeReportValue,
      syncStatusKey,
      syncStatusValue,
    }) => {
      localStorage.setItem(activeReportKey, activeReportValue);
      localStorage.setItem(syncStatusKey, syncStatusValue);
      localStorage.setItem(
        "phase-2a-comparison-sentinel",
        "local-value",
      );
      sessionStorage.setItem(
        "phase-2a-comparison-session-sentinel",
        "session-value",
      );
    },
    {
      activeReportKey: ACTIVE_REPORT_KEY,
      activeReportValue: ownerContainer({
        accounts: {
          [ACCOUNT_A.id]: {
            fileName: "Browser-active sentinel.pdf",
          },
        },
      }),
      syncStatusKey: RESUME_SYNC_STATUS_KEY,
      syncStatusValue: ownerContainer({
        accounts: {
          [ACCOUNT_A.id]: {
            state: "local-only",
          },
        },
      }),
    },
  );
}

async function readIsolationSnapshot(page: Page) {
  return page.evaluate(async ({
    activeReportKey,
    syncStatusKey,
  }) => {
    const localKeys = Object.keys(localStorage).sort();
    const sessionKeys = Object.keys(sessionStorage).sort();
    const databases = "databases" in indexedDB
      ? (await indexedDB.databases())
        .map((database) => database.name ?? "")
        .sort()
      : [];
    return {
      activeReport: localStorage.getItem(activeReportKey),
      databases,
      localKeys,
      sentinel: localStorage.getItem(
        "phase-2a-comparison-sentinel",
      ),
      sessionKeys,
      sessionSentinel: sessionStorage.getItem(
        "phase-2a-comparison-session-sentinel",
      ),
      syncStatus: localStorage.getItem(syncStatusKey),
    };
  }, {
    activeReportKey: ACTIVE_REPORT_KEY,
    syncStatusKey: RESUME_SYNC_STATUS_KEY,
  });
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
