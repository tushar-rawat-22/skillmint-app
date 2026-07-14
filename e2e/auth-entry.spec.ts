import { ACCOUNT_A, SYNTHETIC_PASSWORD, expect, test } from "./support/runtime";

test("successful synthetic login exits submitting state", async ({ page, provider }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ACCOUNT_A.email);
  await page.getByLabel("Password").fill(SYNTHETIC_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(provider.count("auth:login", ACCOUNT_A.id)).toBe(1);
});

test("rejected synthetic login exits submitting state without raw provider copy", async ({ page, provider }) => {
  provider.loginMode = "reject";
  await page.goto("/login");
  await page.getByLabel("Email").fill(ACCOUNT_A.email);
  await page.getByLabel("Password").fill(SYNTHETIC_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("button", { name: "Log in" })).toBeEnabled();
  await expect(page.getByText("RAW_SYNTHETIC_PROVIDER_SECRET")).toHaveCount(0);
  await expect(page.getByText("Login could not be completed. Please try again.")).toBeVisible();
  expect(provider.count("auth:login", ACCOUNT_A.id)).toBe(1);
});

test("@critical delayed login has one active request and eventually exits submitting", async ({ page, provider }) => {
  const [gate] = provider.holdNext("auth:login");
  await page.goto("/login");
  await page.getByLabel("Email").fill(ACCOUNT_A.email);
  await page.getByLabel("Password").fill(SYNTHETIC_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).dblclick();
  await provider.waitFor("auth:login", 1, ACCOUNT_A.id);
  await expect(page.getByRole("button", { name: "Please wait..." })).toBeDisabled();
  expect(provider.count("auth:login", ACCOUNT_A.id)).toBe(1);
  gate.release();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("aborted synthetic login exits submitting state without raw network error", async ({ page, provider }) => {
  provider.loginMode = "abort";
  await page.goto("/login");
  await page.getByLabel("Email").fill(ACCOUNT_A.email);
  await page.getByLabel("Password").fill(SYNTHETIC_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("button", { name: "Log in" })).toBeEnabled();
  await expect(page.locator("form").getByText(/fetch|network|RAW_SYNTHETIC/i)).toHaveCount(0);
  await expect(page.getByText("Login could not be completed. Please try again.")).toBeVisible();
});
