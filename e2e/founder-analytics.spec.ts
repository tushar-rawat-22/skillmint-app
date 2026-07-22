import type { Page } from "@playwright/test";

import {
  ANALYTICS_EVENT_NAMES,
  ANALYTICS_FEEDBACK_PERSISTENCE_PATHS,
  ANALYTICS_OPERATION_ERROR_CODES,
  ANALYTICS_PRODUCT_OPERATIONS,
} from "../src/platform/analytics/eventContract";
import {
  ACCOUNT_A,
  expect,
  login,
  test,
} from "./support/runtime";

function zeroRecord(keys: readonly string[]) {
  return Object.fromEntries(keys.map((key) => [key, 0]));
}

function summary(totalEvents = 8) {
  const eventCounts = {
    ...zeroRecord(ANALYTICS_EVENT_NAMES),
    resume_analysis_started: totalEvents === 0 ? 0 : 1,
    resume_analysis_failed: totalEvents === 0 ? 0 : 3,
    jd_match_started: totalEvents === 0 ? 0 : 1,
    jd_match_completed: totalEvents === 0 ? 0 : 1,
    feedback_persisted: totalEvents === 0 ? 0 : 1,
    product_operation_failed: totalEvents === 0 ? 0 : 1,
  };
  const operationErrorCounts = Object.fromEntries(
    ANALYTICS_PRODUCT_OPERATIONS.map((operation) => [
      operation,
      zeroRecord(ANALYTICS_OPERATION_ERROR_CODES),
    ]),
  );
  if (totalEvents > 0) {
    operationErrorCounts.feedback_persistence.network_failure = 1;
  }
  return {
    contract_version: "founder_analytics_summary.v1",
    as_of: "2026-07-22T12:00:00.000Z",
    window_name: "24h",
    window_start: "2026-07-21T12:00:00.000Z",
    window_end: "2026-07-22T12:00:00.000Z",
    canonical_environment: "test",
    total_event_count: totalEvents,
    last_received_at: totalEvents === 0 ? null : "2026-07-22T11:59:59.999Z",
    event_counts: eventCounts,
    operation_error_counts: operationErrorCounts,
    feedback_persistence_counts: {
      ...zeroRecord(ANALYTICS_FEEDBACK_PERSISTENCE_PATHS),
      browser: totalEvents === 0 ? 0 : 1,
    },
    retention_overdue_count: 2,
    observed_event_ratios: {
      resume_analysis_failure: {
        numerator: totalEvents === 0 ? 0 : 3,
        denominator: totalEvents === 0 ? 0 : 1,
        ratio: totalEvents === 0 ? null : 3,
      },
      jd_match_completion: {
        numerator: totalEvents === 0 ? 0 : 1,
        denominator: totalEvents === 0 ? 0 : 1,
        ratio: totalEvents === 0 ? null : 1,
      },
      feedback_persistence_failure: {
        numerator: totalEvents === 0 ? 0 : 1,
        denominator: totalEvents === 0 ? 0 : 2,
        ratio: totalEvents === 0 ? null : 0.5,
      },
    },
  };
}

async function interceptSummary(page: Page, response: {
  status: number;
  body: object;
}) {
  const requests: Array<{ url: string; authorization: string | undefined }> = [];
  await page.route("**/api/founder/analytics/summary?*", async (route) => {
    requests.push({
      url: route.request().url(),
      authorization: route.request().headers().authorization,
    });
    await route.fulfill({
      status: response.status,
      contentType: "application/json",
      headers: { "Cache-Control": "no-store, max-age=0" },
      body: JSON.stringify(response.body),
    });
  });
  return requests;
}

test("@critical founder analytics signed-out state sends no protected request", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/founder/analytics/summary?*", async (route) => {
    requests += 1;
    await route.abort();
  });
  await page.goto("/founder/analytics");
  await expect(page.getByRole("heading", { name: "Product Event Health" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Signed out" })).toBeVisible();
  expect(requests).toBe(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("@critical intercepted aggregate renders the ready, accessible, no-refresh UI", async ({ page }) => {
  await login(page, ACCOUNT_A);
  const requests = await interceptSummary(page, {
    status: 200,
    body: { ok: true, code: "aggregate_summary", summary: summary() },
  });

  await page.goto("/founder/analytics");
  await expect(page.getByRole("heading", { name: "Product Event Health" })).toBeVisible();
  await expect(page.getByText("Aggregate query status: ready")).toBeVisible();
  await expect(page.getByText("Counts describe events, not people.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Observed event ratios" })).toBeVisible();
  await expect(page.getByText("300.0%")).toBeVisible();
  await expect(page.getByRole("table", { name: /failure event counts/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Last 24 hours" })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0].url).toBe("http://127.0.0.1:3100/api/founder/analytics/summary?window=24h");
  expect(requests[0].authorization).toMatch(/^Bearer \S+$/);
  expect(requests[0].authorization).not.toContain(ACCOUNT_A.id);
  await page.waitForTimeout(750);
  expect(requests).toHaveLength(1);
  await expect(page.getByRole("button", { name: /export/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Feedback", exact: true })).toHaveCount(0);
  await expect(page.getByRole("navigation")).toHaveCount(0);

  // Endpoint interception verifies presentation states only. Server fixtures own
  // authorization, limiter, exact DTO, and database-contract evidence.
});

test("founder analytics distinguishes empty, unauthorized, disabled, rate-limited, and unavailable states", async ({ page }) => {
  await login(page, ACCOUNT_A);
  const cases = [
    {
      status: 200,
      body: { ok: true, code: "aggregate_summary", summary: summary(0) },
      heading: "Empty observation window",
    },
    { status: 403, body: { ok: false, code: "not_authorized" }, heading: "Access not authorized" },
    { status: 404, body: { ok: false, code: "dashboard_disabled" }, heading: "Dashboard disabled" },
    { status: 429, body: { ok: false, code: "rate_limited" }, heading: "Request limit reached" },
    { status: 503, body: { ok: false, code: "schema_unavailable" }, heading: "Aggregate query unavailable" },
  ];

  for (const current of cases) {
    await page.unroute("**/api/founder/analytics/summary?*");
    await interceptSummary(page, current);
    await page.goto("/founder/analytics");
    await expect(page.getByRole("heading", { name: current.heading })).toBeVisible();
  }
});

test("malformed or status-mismatched intercepted responses show no partial metrics", async ({ page }) => {
  await login(page, ACCOUNT_A);
  const malformed = summary();
  delete (malformed.event_counts as Record<string, number>).resume_analysis_started;
  const cases = [
    { status: 200, body: { ok: true, code: "aggregate_summary", summary: malformed } },
    { status: 503, body: { ok: false, code: "rate_limited" } },
  ];

  for (const current of cases) {
    await page.unroute("**/api/founder/analytics/summary?*");
    await interceptSummary(page, current);
    await page.goto("/founder/analytics");
    await expect(page.getByRole("heading", { name: "Product Event Health" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Aggregate query unavailable" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Aggregate overview" })).toHaveCount(0);
    await expect(page.getByText("300.0%")).toHaveCount(0);
  }
});
