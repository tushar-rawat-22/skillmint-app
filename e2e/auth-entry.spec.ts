import {
  ACCOUNT_A,
  ACCOUNT_B,
  PROVIDER_ORIGIN,
  SYNTHETIC_PASSWORD,
  expect,
  test,
} from "./support/runtime";

const CANDIDATE_PRIVATE_ROUTES = [
  "/dashboard",
  "/setup",
  "/profile",
  "/resume",
  "/resume/compare",
  "/upload",
  "/jobs",
  "/ats",
  "/roadmap",
  "/settings",
  "/settings/data",
] as const;

const ABSENT_CANDIDATE_ROUTE_ALIASES = ["/target-role", "/job-match"] as const;

async function expectServerRedirect(
  page: import("@playwright/test").Page,
  route: string,
  destination: string,
) {
  const response = await page.request.get(route, { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(new URL(response.headers().location, "http://127.0.0.1:3100").pathname).toBe(
    destination,
  );
}

async function submitLogin(
  page: import("@playwright/test").Page,
  account: typeof ACCOUNT_A,
) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(SYNTHETIC_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
}

test("successful synthetic login exits submitting state", async ({ page, provider }) => {
  await page.request.post(`${PROVIDER_ORIGIN}/__reset`);
  await page.goto("/login");
  await page.getByLabel("Email").fill(ACCOUNT_A.email);
  await page.getByLabel("Password").fill(SYNTHETIC_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/auth\/persona$/);
  await expect(page.getByRole("heading", { name: "How will you use SkillMint?" })).toBeVisible();
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
  await page.request.post(`${PROVIDER_ORIGIN}/__reset`);
  const [gate] = provider.holdNext("auth:login");
  await page.goto("/login");
  await page.getByLabel("Email").fill(ACCOUNT_A.email);
  await page.getByLabel("Password").fill(SYNTHETIC_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).dblclick();
  await provider.waitFor("auth:login", 1, ACCOUNT_A.id);
  await expect(page.getByRole("button", { name: "Please wait..." })).toBeDisabled();
  expect(provider.count("auth:login", ACCOUNT_A.id)).toBe(1);
  gate.release();
  await expect(page).toHaveURL(/\/auth\/persona$/);
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

test("private workspace routes require an authenticated account", async ({ page }) => {
  for (const route of CANDIDATE_PRIVATE_ROUTES) {
    await expectServerRedirect(page, route, "/login");
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/);
  }

  await page.goto("/recruiters/workspace");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Define what evidence matters before reviewing a candidate." })).toHaveCount(0);
});

test("absent candidate route aliases fail closed without rendering candidate UI", async ({ page }) => {
  for (const route of ABSENT_CANDIDATE_ROUTE_ALIASES) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("navigation", { name: "Main navigation" })).toHaveCount(0);
  }
});

test("existing immutable personas reach their own workspace after login", async ({ page, request }) => {
  await request.post(`${PROVIDER_ORIGIN}/__reset`);
  for (const [account, persona] of [
    [ACCOUNT_A, "CANDIDATE"],
    [ACCOUNT_B, "RECRUITER"],
  ] as const) {
    const response = await request.post(
      `${PROVIDER_ORIGIN}/rest/v1/account_personas`,
      { data: { user_id: account.id, persona } },
    );
    expect(response.ok()).toBeTruthy();
  }

  await submitLogin(page, ACCOUNT_A);
  await expect(page).toHaveURL(/\/dashboard$/);

  await submitLogin(page, ACCOUNT_B);
  await expect(page).toHaveURL(/\/recruiters\/workspace$/);
});

test("immutable personas cannot render the other private workspace by direct navigation", async ({ page, request }) => {
  await request.post(`${PROVIDER_ORIGIN}/__reset`);
  for (const [account, persona] of [
    [ACCOUNT_A, "CANDIDATE"],
    [ACCOUNT_B, "RECRUITER"],
  ] as const) {
    const response = await request.post(
      `${PROVIDER_ORIGIN}/rest/v1/account_personas`,
      { data: { user_id: account.id, persona } },
    );
    expect(response.ok()).toBeTruthy();
  }

  await submitLogin(page, ACCOUNT_A);
  await expect(page).toHaveURL(/\/dashboard$/);
  for (const route of CANDIDATE_PRIVATE_ROUTES) {
    const response = await page.request.get(route, { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    await page.goto(route);
    await expect(page).toHaveURL(new RegExp(`${route.replaceAll("/", "\\/")}$`));
    await expect(page.getByRole("heading", { name: "Define what evidence matters before reviewing a candidate." })).toHaveCount(0);
  }
  await page.goto("/recruiters/workspace");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Define what evidence matters before reviewing a candidate." })).toHaveCount(0);

  await submitLogin(page, ACCOUNT_B);
  await expect(page).toHaveURL(/\/recruiters\/workspace$/);
  for (const route of CANDIDATE_PRIVATE_ROUTES) {
    await expectServerRedirect(page, route, "/recruiters/workspace");
    await page.goto(route);
    await expect(page).toHaveURL(/\/recruiters\/workspace$/);
    await expect(page.getByRole("heading", { name: "Define what evidence matters before reviewing a candidate." })).toBeVisible();
  }
});
