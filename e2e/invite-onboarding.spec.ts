import AxeBuilder from "@axe-core/playwright";

import {
  ACCOUNT_A,
  ACCOUNT_B,
  expect,
  PROVIDER_ORIGIN,
  syntheticInviteFragment,
  test,
} from "./support/runtime";

const INVITE_TEST_INPUT = "synthetic-invite-password";

test.beforeEach(async ({ request }) => {
  await request.post(`${PROVIDER_ORIGIN}/__reset`);
});

test("@critical @invite-onboarding invited user sets credentials before choosing an immutable persona", async ({ page, provider }) => {
  await page.goto(`/auth/invite${syntheticInviteFragment()}`);

  await expect(page).toHaveURL(/\/auth\/invite$/);
  await expect(page.getByRole("heading", { name: "Set your account password" })).toBeVisible();
  await expect(page.getByText("Continue with your approved SkillMint account")).toBeVisible();
  await expect(page.getByText("Open only the workspace assigned to your account")).toBeVisible();
  await expect(page.getByText("Keep candidate and recruiter access separated")).toBeVisible();
  await expect(page.getByText("Keep resume proof and job matches")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Set password and continue" })).toBeEnabled();
  expect(provider.count("auth:user", ACCOUNT_A.id)).toBeGreaterThanOrEqual(1);

  await page.getByLabel("New password").fill(INVITE_TEST_INPUT);
  await page.getByLabel("Confirm password").fill(INVITE_TEST_INPUT);
  await page.getByRole("button", { name: "Set password and continue" }).click();

  await expect(page).toHaveURL(/\/auth\/persona$/);
  await expect(page.getByRole("heading", { name: "How will you use SkillMint?" })).toBeVisible();
  expect(provider.count("auth:update-user", ACCOUNT_A.id)).toBe(1);

  await page.getByRole("button", { name: "I am reviewing candidate evidence" }).click();
  await expect(page).toHaveURL(/\/recruiters\/workspace$/);
  await expect(page.getByRole("heading", { name: /Translate one role description/u })).toBeVisible();

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test("@invite-onboarding direct, malformed, and non-invite visits fail closed", async ({ page, provider }) => {
  for (const suffix of [
    "",
    "?code=unexpected",
    syntheticInviteFragment().replace("type=invite", "type=recovery"),
    `${syntheticInviteFragment()}&unexpected=secret`,
  ]) {
    await page.goto("/login");
    await page.goto(`/auth/invite${suffix}`);
    await expect(page).toHaveURL(/\/auth\/invite$/);
    await expect(page.getByRole("alert").first()).toContainText(
      "This invitation link is invalid or has expired.",
    );
    await expect(page.getByLabel("New password")).toBeDisabled();
    await expect(page.getByRole("button", { name: "Set password and continue" })).toBeDisabled();
  }

  expect(provider.count("auth:update-user")).toBe(0);
  expect(page.url()).not.toContain("access_token");
  expect(page.url()).not.toContain("refresh_token");
});

test("@invite-onboarding provider user mismatch clears the invite session without enabling password mutation", async ({ page, provider }) => {
  provider.overrideNextAuthUser(ACCOUNT_B.id);
  await page.goto(`/auth/invite${syntheticInviteFragment(ACCOUNT_A)}`);

  await expect(page.getByRole("alert").first()).toContainText(
    "This invitation link is invalid or has expired.",
  );
  await expect(page.getByLabel("New password")).toBeDisabled();
  expect(provider.count("auth:user", ACCOUNT_B.id)).toBe(1);
  expect(provider.count("auth:user", ACCOUNT_A.id)).toBe(1);
  expect(provider.count("auth:logout", ACCOUNT_A.id)).toBe(1);
  expect(provider.count("auth:update-user")).toBe(0);
  await expect(page).toHaveURL(/\/auth\/invite$/);
});

test("@invite-onboarding credential setup reflows at 390px and 320px with a keyboard-complete form", async ({ page }) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/login");
    await page.goto(`/auth/invite${syntheticInviteFragment()}`);
    await expect(page.getByLabel("New password")).toBeEnabled();

    const overflow = await page.evaluate(() => ({
      body: document.body.scrollWidth - document.body.clientWidth,
      document:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    }));
    expect(overflow.body).toBeLessThanOrEqual(1);
    expect(overflow.document).toBeLessThanOrEqual(1);

    await page.getByLabel("New password").focus();
    await page.keyboard.type(INVITE_TEST_INPUT);
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Confirm password")).toBeFocused();
    await page.keyboard.type(INVITE_TEST_INPUT);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/auth\/persona$/);
  }
});
