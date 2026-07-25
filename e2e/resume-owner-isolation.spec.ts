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
  test,
} from "./support/runtime";

const REPORT_KEY =
  "skillmint:resume-analysis";
const SYNC_STATUS_KEY =
  "skillmint:resume-sync-status";

const SYNTHETIC_RESUME_TEXT = `
Account A Resume
Software Engineer

Experience
Built and maintained TypeScript APIs and React applications.
Implemented automated tests and PostgreSQL-backed services.

Skills
TypeScript, React, Node.js, PostgreSQL, Git, Playwright

Projects
Created a career-analysis dashboard with deterministic scoring.

Education
B.Tech Information Technology
`.trim();

const STALE_RESUME_OPERATION_MESSAGE =
  "Your account changed while this resume was being analyzed. The stale result was discarded. Please analyze the resume again.";

type InsertAttempt = {
  bearerOwnerId: string | null;
  rowOwnerId: string | null;
};

test(
  "@critical @race delayed Account A resume never persists or becomes visible as Account B",
  async ({ page, context }) => {
    const attempts: InsertAttempt[] = [];

    await installResumeInsertGuard(
      page,
      attempts,
    );

    const extraction =
      await installDelayedExtraction(page);

    await login(page, ACCOUNT_A);
    await page.goto("/upload");

    await selectResume(
      page,
      "account-a-delayed.pdf",
      "application/pdf",
    );

    await page
      .getByRole("button", {
        name: "Analyze Resume",
      })
      .click();

    await extraction.started;
    await loginControlPage(
      context,
      ACCOUNT_B,
    );
    extraction.release();

    await waitForOperationSettlement(page);

    assertNoAccountBOwnership(attempts);

    await assertAccountBIsolation(context);
  },
);

test(
  "@critical @race verified repository owner mismatch aborts before browser publication",
  async ({ page, provider }) => {
    const attempts: InsertAttempt[] = [];

    await installResumeInsertGuard(
      page,
      attempts,
    );
    await installImmediateExtraction(page);

    await login(page, ACCOUNT_A);
    await page.goto("/upload");

    provider.overrideNextAuthUser(
      ACCOUNT_B.id,
    );

    await selectResume(
      page,
      "account-a-mismatch.txt",
      "text/plain",
    );

    await page
      .getByRole("button", {
        name: "Analyze Resume",
      })
      .click();

    await expect(
      page.getByText(
        STALE_RESUME_OPERATION_MESSAGE,
        { exact: true },
      ),
    ).toBeVisible();

    await expect(page).toHaveURL(/\/upload$/);

    expect(attempts).toEqual([]);

    const rawStorage =
      await readRawResumeStorage(page);

    expect(rawStorage.report).toBeNull();
    expect(rawStorage.syncStatus).toBeNull();
  },
);

test(
  "@critical @race Account A request already in flight remains isolated after Account B switch",
  async ({ page, context, provider }) => {
    const attempts: InsertAttempt[] = [];
    const [authUserGate] =
      provider.holdNext("auth:user");

    await installResumeInsertGuard(
      page,
      attempts,
    );
    await installImmediateExtraction(page);

    await login(page, ACCOUNT_A);
    await page.goto("/upload");

    await selectResume(
      page,
      "account-a-in-flight.txt",
      "text/plain",
    );

    await page
      .getByRole("button", {
        name: "Analyze Resume",
      })
      .click();

    await provider.waitFor(
      "auth:user",
      1,
      ACCOUNT_A.id,
    );

    await loginControlPage(
      context,
      ACCOUNT_B,
    );

    authUserGate.release();

    await waitForOperationSettlement(page);

    assertNoAccountBOwnership(attempts);

    await assertAccountBIsolation(context);
  },
);

async function installImmediateExtraction(
  page: Page,
): Promise<void> {
  await page.route(
    "**/api/resume/extract",
    async (route) => {
      if (
        route.request().method() !== "POST"
      ) {
        await route.fallback();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          extractedText:
            SYNTHETIC_RESUME_TEXT,
        }),
      });
    },
  );
}

async function installDelayedExtraction(
  page: Page,
): Promise<{
  started: Promise<void>;
  release: () => void;
}> {
  let startedResolver!: () => void;
  let releaseResolver!: () => void;
  let startedSignalled = false;

  const started = new Promise<void>(
    (resolve) => {
      startedResolver = resolve;
    },
  );

  const released = new Promise<void>(
    (resolve) => {
      releaseResolver = resolve;
    },
  );

  await page.route(
    "**/api/resume/extract",
    async (route) => {
      if (
        route.request().method() !== "POST"
      ) {
        await route.fallback();
        return;
      }

      if (!startedSignalled) {
        startedSignalled = true;
        startedResolver();
      }

      await released;

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          extractedText:
            SYNTHETIC_RESUME_TEXT,
        }),
      });
    },
  );

  return {
    started,
    release: releaseResolver,
  };
}

async function installResumeInsertGuard(
  page: Page,
  attempts: InsertAttempt[],
): Promise<void> {
  await page.route(
    "**/rest/v1/resume_analyses**",
    async (route) => {
      if (
        route.request().method() !== "POST"
      ) {
        await route.fallback();
        return;
      }

      const input = asRecord(
        route.request().postDataJSON(),
      );
      const bearerOwnerId =
        getBearerSubject(
          route.request()
            .headers()
            .authorization,
        );
      const rowOwnerId =
        typeof input.user_id === "string"
          ? input.user_id
          : null;

      attempts.push({
        bearerOwnerId,
        rowOwnerId,
      });

      if (
        !bearerOwnerId ||
        bearerOwnerId !== rowOwnerId
      ) {
        await route.fulfill({
          status: 403,
          headers: responseHeaders(
            "application/json",
          ),
          body: JSON.stringify({
            code: "42501",
            message:
              "Synthetic row-level ownership rejection",
          }),
        });
        return;
      }

      await fulfillResumeInsert(
        route,
        {
          id:
            "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          user_id: rowOwnerId,
          file_name:
            input.file_name ??
            "synthetic-resume.txt",
          file_type:
            input.file_type ??
            "text/plain",
          extracted_text:
            input.extracted_text ??
            SYNTHETIC_RESUME_TEXT,
          parsed_profile:
            input.parsed_profile ?? {},
          user_profile:
            input.user_profile ?? {},
          created_at:
            "2026-07-25T00:00:00.000Z",
        },
      );
    },
  );
}

async function fulfillResumeInsert(
  route: Route,
  row: Record<string, unknown>,
): Promise<void> {
  await route.fulfill({
    status: 201,
    headers: responseHeaders(
      "application/vnd.pgrst.object+json",
    ),
    body: JSON.stringify(row),
  });
}

function responseHeaders(
  contentType: string,
): Record<string, string> {
  return {
    "access-control-allow-origin":
      APP_ORIGIN,
    "access-control-allow-headers":
      "authorization, apikey, content-type, prefer, x-client-info, x-supabase-api-version",
    "access-control-allow-methods":
      "GET, HEAD, POST, PUT, DELETE, OPTIONS",
    "access-control-expose-headers":
      "content-range",
    "content-type": contentType,
  };
}

async function selectResume(
  page: Page,
  name: string,
  mimeType: string,
): Promise<void> {
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name,
      mimeType,
      buffer: Buffer.from(
        SYNTHETIC_RESUME_TEXT,
      ),
    });
}

async function loginControlPage(
  context: BrowserContext,
  account: typeof ACCOUNT_A,
): Promise<void> {
  const controlPage =
    await context.newPage();

  await login(controlPage, account);
  await controlPage.close();
}

async function waitForOperationSettlement(
  page: Page,
): Promise<void> {
  const staleMessage = page.getByText(
    STALE_RESUME_OPERATION_MESSAGE,
    { exact: true },
  );

  await expect.poll(async () => {
    return (
      page.url().endsWith("/resume") ||
      await staleMessage.isVisible()
    );
  }, {
    message:
      "waiting for resume operation settlement",
    timeout: 15_000,
  }).toBe(true);
}

function assertNoAccountBOwnership(
  attempts: InsertAttempt[],
): void {
  expect(
    attempts.some((attempt) =>
      attempt.rowOwnerId === ACCOUNT_B.id
    ),
    "No inserted row may claim Account B ownership",
  ).toBe(false);

  expect(
    attempts.some((attempt) =>
      attempt.bearerOwnerId ===
        ACCOUNT_B.id &&
      attempt.rowOwnerId ===
        ACCOUNT_B.id
    ),
    "No Account B request may insert Account A resume data as Account B",
  ).toBe(false);

  expect(
    attempts.length,
    "At most one resume insert attempt is permitted",
  ).toBeLessThanOrEqual(1);
}

async function assertAccountBIsolation(
  context: BrowserContext,
): Promise<void> {
  const observer =
    await context.newPage();

  await login(observer, ACCOUNT_B);
  await observer.goto("/resume");

  await expect(
    observer.getByRole("heading", {
      name:
        "No active resume report selected",
    }),
  ).toBeVisible();

  const rawStorage =
    await readRawResumeStorage(observer);

  expectNoAccountPartition(
    rawStorage.report,
    ACCOUNT_B.id,
  );
  expectNoAccountPartition(
    rawStorage.syncStatus,
    ACCOUNT_B.id,
  );

  await observer.close();
}

async function readRawResumeStorage(
  page: Page,
): Promise<{
  report: string | null;
  syncStatus: string | null;
}> {
  return page.evaluate(
    ([reportKey, syncStatusKey]) => ({
      report:
        window.localStorage.getItem(
          reportKey,
        ),
      syncStatus:
        window.localStorage.getItem(
          syncStatusKey,
        ),
    }),
    [REPORT_KEY, SYNC_STATUS_KEY],
  );
}

function expectNoAccountPartition(
  rawValue: string | null,
  accountId: string,
): void {
  if (rawValue === null) {
    return;
  }

  const parsed = asRecord(
    JSON.parse(rawValue),
  );
  const partitions = asRecord(
    parsed.partitions,
  );
  const accounts = asRecord(
    partitions.accounts,
  );

  expect(
    accounts[accountId],
    `Browser partition for ${accountId} must be absent`,
  ).toBeUndefined();
}

function asRecord(
  value: unknown,
): Record<string, unknown> {
  if (Array.isArray(value)) {
    return asRecord(value[0]);
  }

  if (
    !value ||
    typeof value !== "object"
  ) {
    return {};
  }

  return value as Record<
    string,
    unknown
  >;
}

function getBearerSubject(
  authorization: string | undefined,
): string | null {
  const token =
    authorization?.replace(
      /^Bearer\s+/i,
      "",
    );
  const encodedPayload =
    token?.split(".")[1];

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
