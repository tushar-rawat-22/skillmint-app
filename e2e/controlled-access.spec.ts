import AxeBuilder from "@axe-core/playwright";

import {
  ACCOUNT_A,
  SYNTHETIC_PASSWORD,
  expect,
  test,
} from "./support/runtime";

test(
  "@controlled-access @closed signup defaults closed without a provider request",
  async ({ page, provider }) => {
    await page.goto("/signup");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Account creation is invite-only during beta",
      }),
    ).toBeVisible();
    await expect(
      page.getByText("There is no public signup or waitlist form.", {
        exact: false,
      }),
    ).toBeVisible();
    await expect(page.locator("form")).toHaveCount(0);
    await expect(page.getByLabel("Email")).toHaveCount(0);
    await expect(page.getByLabel("Password")).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Existing user login" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /join|apply|waitlist/i }),
    ).toHaveCount(0);
    await expect(
      page.getByText(/start free|registration is open|free beta/i),
    ).toHaveCount(0);
    expect(provider.count("auth:signup")).toBe(0);

    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      accessibility.violations.filter((violation) =>
        violation.impact === "critical" ||
        violation.impact === "serious"
      ),
    ).toEqual([]);
  },
);

test(
  "@controlled-access @closed existing-user login remains available",
  async ({ page, provider }) => {
    await page.goto("/signup");
    await page.getByRole("link", {
      name: "Existing user login",
    }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel("Email").fill(ACCOUNT_A.email);
    await page.getByLabel("Password").fill(SYNTHETIC_PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    expect(provider.count("auth:login", ACCOUNT_A.id)).toBe(1);
    expect(provider.count("auth:signup")).toBe(0);
  },
);

test(
  "@controlled-access @closed landing surfaces make no open-registration claim",
  async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("For candidates · invite-only beta")).toBeVisible();
    const candidateLoginLinks = page.getByRole("link", {
      name: "Candidate login",
    });
    await expect(candidateLoginLinks.first()).toBeVisible();
    expect(await candidateLoginLinks.count()).toBeGreaterThan(0);
    for (const link of await candidateLoginLinks.all()) {
      await expect(link).toHaveAttribute("href", "/login");
    }
    await expect(page.getByRole("link", { name: "Invite-only beta details" })).toHaveAttribute("href", "/signup");
    await expect(page.locator("body")).not.toContainText(
      /start free|free beta|create account|create an account|create your account|registration is open|waiting on release gates/i,
    );
  },
);

test(
  "@controlled-access @enabled signup submits and preserves the signed-in destination",
  async ({ page, provider }) => {
    await page.goto("/signup");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Create your SkillMint account",
      }),
    ).toBeVisible();
    await page.getByLabel("Email").fill(ACCOUNT_A.email);
    await page.getByLabel("Password").fill(SYNTHETIC_PASSWORD);
    await page.getByRole("button", {
      name: "Create account",
    }).click();

    await expect(page).toHaveURL(/\/settings\/data\?import=1$/);
    expect(provider.count("auth:signup", ACCOUNT_A.id)).toBe(1);
  },
);

test(
  "@controlled-access @enabled provider signup errors stay private",
  async ({ page, provider }) => {
    provider.signupMode = "reject";
    await page.goto("/signup");
    await page.getByLabel("Email").fill(ACCOUNT_A.email);
    await page.getByLabel("Password").fill(SYNTHETIC_PASSWORD);
    await page.getByRole("button", {
      name: "Create account",
    }).click();

    await expect(
      page.getByText(
        "Account creation could not be completed. Please try again.",
      ),
    ).toBeVisible();
    await expect(
      page.getByText("RAW_SYNTHETIC_SIGNUP_PROVIDER_SECRET"),
    ).toHaveCount(0);
    await expect(page.getByRole("button", {
      name: "Create account",
    })).toBeEnabled();
    expect(provider.count("auth:signup", ACCOUNT_A.id)).toBe(1);
  },
);
