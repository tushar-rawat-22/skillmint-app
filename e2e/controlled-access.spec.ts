import AxeBuilder from "@axe-core/playwright";

import {
  ACCOUNT_A,
  PROVIDER_ORIGIN,
  SYNTHETIC_PASSWORD,
  expect,
  test,
} from "./support/runtime";

test(
  "@controlled-access @closed signup defaults closed with a request-access path and no provider signup",
  async ({ page, provider }) => {
    await page.route("**/api/access-request", async (route) => {
      const payload = route.request().postDataJSON() as {
        email?: string;
        intent?: string;
        website?: string;
      };
      expect(payload).toEqual({
        email: "candidate@example.com",
        intent: "CANDIDATE",
        website: "",
      });
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ status: "received" }),
      });
    });

    await page.goto("/signup");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Account access is currently controlled",
      }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Request access" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toHaveCount(0);
    await expect(page.getByLabel("Candidate")).toBeChecked();
    await expect(page.getByLabel("Recruiter")).not.toBeChecked();
    await expect(
      page.getByText("no resume is required", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Existing user login" }),
    ).toBeVisible();

    await page.getByLabel("Email").fill("candidate@example.com");
    await page.getByRole("button", { name: "Request access" }).click();
    await expect(
      page.getByText("no account has been created yet", { exact: false }),
    ).toBeVisible();
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
  "@controlled-access @closed request-access duplicate state is recoverable",
  async ({ page }) => {
    await page.route("**/api/access-request", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "already_received" }),
      });
    });
    await page.goto("/signup");
    await page.getByLabel("Recruiter").check();
    await page.getByLabel("Email").fill("recruiter@example.com");
    await page.getByRole("button", { name: "Request access" }).click();
    await expect(
      page.getByText("No duplicate account or request was created", { exact: false }),
    ).toBeVisible();
  },
);

test(
  "@controlled-access @closed existing-user login remains available",
  async ({ page, provider, request }) => {
    await request.post(`${PROVIDER_ORIGIN}/__reset`);
    const persona = await request.post(
      `${PROVIDER_ORIGIN}/rest/v1/account_personas`,
      { data: { user_id: ACCOUNT_A.id, persona: "CANDIDATE" } },
    );
    expect(persona.ok()).toBeTruthy();
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
  "@controlled-access @closed landing surfaces state controlled access without open registration",
  async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("For candidates · access is controlled")).toBeVisible();
    const candidateLoginLinks = page.getByRole("link", {
      name: "Candidate login",
    });
    await expect(candidateLoginLinks.first()).toBeVisible();
    expect(await candidateLoginLinks.count()).toBeGreaterThan(0);
    for (const link of await candidateLoginLinks.all()) {
      await expect(link).toHaveAttribute("href", "/login");
    }
    await expect(page.getByRole("link", { name: "Access details" })).toHaveAttribute("href", "/signup");
    await expect(page.locator("body")).not.toContainText(
      /private beta|invite-only beta|pilot account|start free|free beta|create account|create an account|create your account|registration is open|waiting on release gates/i,
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
