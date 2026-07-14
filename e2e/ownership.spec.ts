import {
  ACCOUNT_A,
  ACCOUNT_B,
  expiredSessionCookie,
  expect,
  login,
  signOut,
  switchAccount,
  test,
} from "./support/runtime";
import type { Page } from "@playwright/test";

function authCard(page: Page) {
  return page.locator("article").filter({ hasText: "Authentication" }).first();
}

function accountCard(page: Page, label: string) {
  return page.locator("article").filter({
    has: page.getByText(label, { exact: true }),
  }).first();
}

test("@critical unresolved auth stays checking and cannot mutate anonymous workspace", async ({ page, context, provider }) => {
  const [gate] = provider.holdNext("auth:refresh");
  await context.addCookies([expiredSessionCookie()]);
  await page.goto("/settings/data");
  await provider.waitFor("auth:refresh", 1, ACCOUNT_A.id);
  await expect(authCard(page)).toContainText("Checking");
  await expect(page.getByRole("button", { name: "Download browser data" })).toBeDisabled();
  await page.getByRole("button", { name: "Feedback", exact: true }).click();
  await expect(page.getByRole("button", { name: "Send feedback" })).toBeDisabled();
  gate.release();
  await expect(authCard(page)).toContainText(ACCOUNT_A.email);
});

test("signed-out and Account A enter the real Trust Center safely", async ({ page, provider }) => {
  await page.goto("/settings/data");
  await expect(authCard(page)).toContainText("Signed out");
  await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
  expect(provider.count("auth:user")).toBe(0);

  await login(page, ACCOUNT_A);
  await page.goto("/settings/data");
  await expect(authCard(page)).toContainText(ACCOUNT_A.email);
  await expect(accountCard(page, "Profile")).toContainText("1");
  await expect(accountCard(page, "Feedback")).toContainText("1");
});

test("@critical @race Account A to B rejects delayed A counts and closes A dialog", async ({ page, context, provider }) => {
  await login(page, ACCOUNT_A);
  const gates = [
    ...provider.holdNext("count:profiles"),
    ...provider.holdNext("count:resume_analyses"),
    ...provider.holdNext("count:job_matches"),
    ...provider.holdNext("count:career_snapshots"),
    ...provider.holdNext("count:beta_feedback"),
  ];
  await page.goto("/settings/data");
  await Promise.all([
    provider.waitFor("count:profiles", 1, ACCOUNT_A.id),
    provider.waitFor("count:resume_analyses", 1, ACCOUNT_A.id),
    provider.waitFor("count:job_matches", 1, ACCOUNT_A.id),
    provider.waitFor("count:career_snapshots", 1, ACCOUNT_A.id),
    provider.waitFor("count:beta_feedback", 1, ACCOUNT_A.id),
  ]);
  await page.getByRole("button", { name: "Delete SkillMint account" }).click();
  await expect(page.getByRole("dialog", { name: "Delete SkillMint account" })).toBeVisible();
  await switchAccount(context, ACCOUNT_B);
  await expect(authCard(page)).toContainText(ACCOUNT_B.email);
  await expect(page.getByRole("dialog", { name: "Delete SkillMint account" })).toHaveCount(0);
  await expect(accountCard(page, "Profile")).toContainText("1");
  gates.forEach((gate) => gate.release());
  await expect(authCard(page)).toContainText(ACCOUNT_B.email);
  await expect(page.getByText(ACCOUNT_A.email)).toHaveCount(0);
});

test("@critical @race Account A to B to A does not reactivate the original A request", async ({ page, context, provider }) => {
  await login(page, ACCOUNT_A);
  const gates = [
    ...provider.holdNext("count:profiles"),
    ...provider.holdNext("count:resume_analyses"),
    ...provider.holdNext("count:job_matches"),
    ...provider.holdNext("count:career_snapshots"),
    ...provider.holdNext("count:beta_feedback"),
  ];
  await page.goto("/settings/data");
  await provider.waitFor("count:profiles", 1, ACCOUNT_A.id);
  await switchAccount(context, ACCOUNT_B);
  await expect(authCard(page)).toContainText(ACCOUNT_B.email);
  await switchAccount(context, ACCOUNT_A);
  await expect(authCard(page)).toContainText(ACCOUNT_A.email);
  await expect(accountCard(page, "Profile")).toContainText("1");
  gates.forEach((gate) => gate.release());
  await expect(authCard(page)).toContainText(ACCOUNT_A.email);
  await expect(accountCard(page, "Profile")).toContainText("1");
});

test("Account A to signed out masks account state and dialogs", async ({ page, context }) => {
  await login(page, ACCOUNT_A);
  await page.goto("/settings/data");
  await expect(accountCard(page, "Profile")).toContainText("1");
  await page.getByRole("button", { name: "Delete SkillMint account" }).click();
  await signOut(context);
  await expect(authCard(page)).toContainText("Signed out");
  await expect(page.getByRole("dialog", { name: "Delete SkillMint account" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Download account data" })).toHaveCount(0);
});

test("@race remount during count collection cannot publish into the new page", async ({ page, provider }) => {
  await login(page, ACCOUNT_A);
  const gates = [
    ...provider.holdNext("count:profiles"),
    ...provider.holdNext("count:resume_analyses"),
    ...provider.holdNext("count:job_matches"),
    ...provider.holdNext("count:career_snapshots"),
    ...provider.holdNext("count:beta_feedback"),
  ];
  await page.goto("/settings/data");
  await provider.waitFor("count:profiles", 1, ACCOUNT_A.id);
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: /Privacy/i })).toBeVisible();
  gates.forEach((gate) => gate.release());
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByText("Account download was requested")).toHaveCount(0);
});
