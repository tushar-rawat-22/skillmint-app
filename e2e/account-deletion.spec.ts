import AxeBuilder from "@axe-core/playwright";
import type { Page, Route } from "@playwright/test";

import {
  ACCOUNT_A,
  ACCOUNT_B,
  SYNTHETIC_PASSWORD,
  expect,
  login,
  ownerContainer,
  switchAccount,
  syntheticFeedback,
  test,
} from "./support/runtime";

const FEEDBACK_KEY = "skillmint:beta-feedback";
const GLOBAL_KEY = "skillmint:onboarding-dismissed";
const CONFIRMATION = "DELETE MY ACCOUNT";

test("@block53 @critical account deletion requires separate password and confirmation fields", async ({ page, provider }) => {
  let deletionRequests = 0;
  await page.route("**/api/account/delete", async (route) => {
    deletionRequests += 1;
    await deletionSuccess(route);
  });
  await openDeletionDialog(page);
  const loginRequestsBeforeConfirmation = provider.count("auth:login");
  const password = page.getByLabel("Current password");
  const confirmation = page.getByLabel("Type DELETE MY ACCOUNT");
  const confirm = confirmButton(page);
  await expect(password).toHaveAttribute("type", "password");
  await expect(password).toHaveAttribute("autocomplete", "current-password");
  await expect(confirmation).toBeFocused();
  await confirmation.fill(CONFIRMATION);
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(page.getByText("Enter your current password to reauthenticate.")).toBeVisible();
  expect(deletionRequests).toBe(0);
  expect(provider.count("auth:login")).toBe(loginRequestsBeforeConfirmation);
  await password.fill(SYNTHETIC_PASSWORD);
  await expect(confirm).toBeEnabled();
});

test("@block53 wrong password clears the credential and never reaches SkillMint deletion", async ({ page, provider }) => {
  let deletionRequests = 0;
  await page.route("**/api/account/delete", async (route) => {
    deletionRequests += 1;
    await deletionSuccess(route);
  });
  await openDeletionDialog(page);
  provider.loginMode = "reject";
  await completeDeletionForm(page, "wrong-synthetic-password");
  await confirmButton(page).click();
  await expect(page.locator('p[role="alert"]')).toContainText("Reauthentication failed");
  await expect(page.getByLabel("Current password")).toHaveValue("");
  expect(deletionRequests).toBe(0);
  await expectPasswordAbsentFromBrowser(page, "wrong-synthetic-password");
});

test("@block53 delayed reauthentication blocks duplicates and processing dismissal", async ({ page, provider }) => {
  let deletionRequests = 0;
  await page.route("**/api/account/delete", async (route) => {
    deletionRequests += 1;
    await deletionSuccess(route);
  });
  await openDeletionDialog(page);
  const [gate] = provider.holdNext("auth:login");
  await completeDeletionForm(page);
  await confirmButton(page).click();
  await provider.waitFor("auth:login", 2, ACCOUNT_A.id);
  await expect(page.getByRole("dialog")).toHaveAttribute("aria-busy", "true");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Working..." })).toBeDisabled();
  gate.release();
  await expect(page.getByRole("status")).toContainText("Account access was deleted");
  expect(deletionRequests).toBe(1);
});

test("@block53 successful reauthentication sends only confirmation and removes only Account A", async ({ page }) => {
  const original = ownerContainer({
    anonymous: [syntheticFeedback("Anonymous preserved", "delete-anon")],
    accounts: {
      [ACCOUNT_A.id]: [syntheticFeedback("Account A removed", "delete-a")],
      [ACCOUNT_B.id]: [syntheticFeedback("Account B preserved", "delete-b")],
    },
  });
  await page.goto("/");
  await page.evaluate(({ raw }) => {
    localStorage.setItem("skillmint:beta-feedback", raw);
    localStorage.setItem("skillmint:onboarding-dismissed", "true");
  }, { raw: original });

  let requestBody: unknown;
  let requestUrl = "";
  let authorization = "";
  await page.route("**/api/account/delete", async (route) => {
    requestBody = route.request().postDataJSON();
    requestUrl = route.request().url();
    authorization = route.request().headers().authorization ?? "";
    await deletionSuccess(route);
  });

  await openDeletionDialog(page);
  await completeDeletionForm(page);
  await confirmButton(page).click();
  await expect(page.getByRole("status")).toContainText("Account access was deleted");
  expect(requestBody).toEqual({ confirmation: CONFIRMATION });
  expect(JSON.stringify(requestBody)).not.toContain(SYNTHETIC_PASSWORD);
  expect(requestUrl).not.toContain(SYNTHETIC_PASSWORD);
  expect(authorization).toMatch(/^Bearer /);
  const stored = await page.evaluate((key) => localStorage.getItem(key), FEEDBACK_KEY);
  expect(stored).not.toContain(ACCOUNT_A.id);
  expect(stored).toContain(ACCOUNT_B.id);
  expect(stored).toContain("anonymous");
  expect(await page.evaluate((key) => localStorage.getItem(key), GLOBAL_KEY)).toBe("true");
  await expectPasswordAbsentFromBrowser(page, SYNTHETIC_PASSWORD);
});

test("@block53 deletion request failure keeps owner data and exposes only fixed client copy", async ({ page }) => {
  await seedAccountAFeedback(page);
  await page.route("**/api/account/delete", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ ok: false, code: "unknown", error: "RAW_PROVIDER_SECRET" }),
    });
  });
  await openDeletionDialog(page);
  await completeDeletionForm(page);
  await confirmButton(page).click();
  const alert = page.locator('p[role="alert"]');
  await expect(alert).toContainText("Account deletion did not finish");
  await expect(alert).not.toContainText("RAW_PROVIDER_SECRET");
  expect(await page.evaluate((key) => localStorage.getItem(key), FEEDBACK_KEY)).toContain(ACCOUNT_A.id);
});

test("@block53 Account A to B during reauthentication suppresses deletion and stale UI", async ({ page, context, provider }) => {
  let deletionRequests = 0;
  await page.route("**/api/account/delete", async (route) => {
    deletionRequests += 1;
    await deletionSuccess(route);
  });
  await openDeletionDialog(page);
  const [gate] = provider.holdNext("auth:login");
  await completeDeletionForm(page);
  await confirmButton(page).click();
  await provider.waitFor("auth:login", 2, ACCOUNT_A.id);
  await switchAccount(context, ACCOUNT_B);
  gate.release();
  await expect(page.getByText(ACCOUNT_B.email)).toBeVisible();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByText(/Account access was deleted/)).toHaveCount(0);
  expect(deletionRequests).toBe(0);
});

test("@block53 Account A completion under B cleans A but preserves B without stale publication", async ({ page, context }) => {
  await seedAAndBFeedback(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let requests = 0;
  await page.route("**/api/account/delete", async (route) => {
    requests += 1;
    await gate;
    await deletionSuccess(route);
  });
  await openDeletionDialog(page);
  await completeDeletionForm(page);
  await confirmButton(page).click();
  await expect.poll(() => requests).toBe(1);
  await switchAccount(context, ACCOUNT_B);
  release();
  await expect(page.getByText(ACCOUNT_B.email)).toBeVisible();
  await expect(page.getByText(/Account access was deleted/)).toHaveCount(0);
  const stored = await page.evaluate((key) => localStorage.getItem(key), FEEDBACK_KEY);
  expect(stored).not.toContain(ACCOUNT_A.id);
  expect(stored).toContain(ACCOUNT_B.id);
});

test("@block53 A to B to A cannot reactivate the old deletion result", async ({ page, context }) => {
  await seedAAndBFeedback(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let requests = 0;
  await page.route("**/api/account/delete", async (route) => {
    requests += 1;
    await gate;
    await deletionSuccess(route);
  });
  await openDeletionDialog(page);
  await completeDeletionForm(page);
  await confirmButton(page).click();
  await expect.poll(() => requests).toBe(1);
  await switchAccount(context, ACCOUNT_B);
  await switchAccount(context, ACCOUNT_A);
  release();
  await expect(page.getByText(/Account access was deleted/)).toHaveCount(0);
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("@block53 navigation during reauthentication invalidates publication and endpoint use", async ({ page, provider }) => {
  let deletionRequests = 0;
  await page.route("**/api/account/delete", async (route) => {
    deletionRequests += 1;
    await deletionSuccess(route);
  });
  await openDeletionDialog(page);
  const [gate] = provider.holdNext("auth:login");
  await completeDeletionForm(page);
  await confirmButton(page).click();
  await provider.waitFor("auth:login", 2, ACCOUNT_A.id);
  await page.goto("/settings");
  gate.release();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByText(/Account access was deleted/)).toHaveCount(0);
  expect(deletionRequests).toBe(0);
});

test("@block53 confirmed server success reports incomplete owner cleanup without retrying server deletion", async ({ page }) => {
  await seedAAndBFeedback(page);
  let requests = 0;
  await page.route("**/api/account/delete", async (route) => {
    requests += 1;
    await deletionSuccess(route);
  });
  await openDeletionDialog(page);
  await page.evaluate((key) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name: string, value: string) {
      if (name === key) throw new Error("synthetic cleanup failure");
      return original.call(this, name, value);
    };
  }, FEEDBACK_KEY);
  await completeDeletionForm(page);
  await confirmButton(page).click();
  await expect(page.getByRole("status")).toContainText("Some browser data for the deleted account could not be removed");
  expect(requests).toBe(1);
});

test("@block53 @critical account deletion dialog has no serious or critical axe violations at mobile reflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await openDeletionDialog(page);
  const results = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(results.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? ""))).toEqual([]);
  const dialog = page.getByRole("dialog");
  const box = await dialog.boundingBox();
  expect(box?.width ?? 321).toBeLessThanOrEqual(320);
});

async function openDeletionDialog(page: Page, shouldLogin = true) {
  if (shouldLogin) await login(page, ACCOUNT_A);
  await page.goto("/settings/data");
  await page.getByRole("button", { name: "Delete SkillMint account" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

async function completeDeletionForm(page: Page, password = SYNTHETIC_PASSWORD) {
  await page.getByLabel("Current password").fill(password);
  await page.getByLabel("Type DELETE MY ACCOUNT").fill(CONFIRMATION);
}

function confirmButton(page: Page) {
  return page.getByRole("dialog").getByRole("button", {
    name: "Delete SkillMint account",
    exact: true,
  });
}

async function deletionSuccess(route: Route) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ ok: true, deleted: true }),
  });
}

async function seedAccountAFeedback(page: Page) {
  await page.goto("/");
  await page.evaluate((raw) => localStorage.setItem("skillmint:beta-feedback", raw), ownerContainer({
    accounts: { [ACCOUNT_A.id]: [syntheticFeedback("Account A data", "only-a")] },
  }));
}

async function seedAAndBFeedback(page: Page) {
  await page.goto("/");
  await page.evaluate((raw) => localStorage.setItem("skillmint:beta-feedback", raw), ownerContainer({
    accounts: {
      [ACCOUNT_A.id]: [syntheticFeedback("Account A data", "a")],
      [ACCOUNT_B.id]: [syntheticFeedback("Account B data", "b")],
    },
  }));
}

async function expectPasswordAbsentFromBrowser(page: Page, password: string) {
  expect(page.url()).not.toContain(password);
  const values = await page.evaluate(() =>
    Object.keys(localStorage).map((key) => localStorage.getItem(key) ?? "")
  );
  expect(values.join("\n")).not.toContain(password);
}
