import AxeBuilder from "@axe-core/playwright";

import {
  ACCOUNT_A,
  PROVIDER_ORIGIN,
  expect,
  login,
  test,
} from "./support/runtime";

const SYNTHETIC_RESUME_TEXT = [
  "Skills: TypeScript React accessibility testing API integration",
  "Projects: Built a typed accessible interface with component tests and a measurable performance improvement.",
  "Experience: Contributed reusable interface components and documented accessibility checks.",
  "Education: Undergraduate computing programme",
].join("\n");

test("@public-demo @demo-disabled demo fails closed without Supabase and homepage has no demo link", async ({
  page,
  request,
}) => {
  await request.post(`${PROVIDER_ORIGIN}/__reset`);
  const response = await page.goto("/demo");
  expect(response?.status()).toBe(404);
  await expect(page.getByText("This page could not be found.")).toBeVisible();
  expect(await readServerRequestCounts(request)).toEqual({
    applicationRequests: 0,
    authUserRequests: 0,
  });

  await page.goto("/");
  await expect(page.locator('a[href="/demo"]')).toHaveCount(0);
  await expect(page.getByRole("link", { name: "View early access" }).first()).toBeVisible();
});

test("@public-demo @demo-disabled logged-out real upload is gated and metadata is noindex nofollow", async ({
  page,
}) => {
  await page.goto("/upload");
  await expect(
    page.getByRole("heading", { name: "Log in to analyze a real resume" }),
  ).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
  await expect(page.getByRole("link", { name: "Explore synthetic demo" })).toHaveCount(0);

  const extraction = await page.request.post("/api/resume/extract", {
    multipart: {
      file: {
        name: "synthetic.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("Synthetic resume text"),
      },
    },
  });
  expect(extraction.status()).toBe(401);
  expect(await extraction.json()).toEqual({
    code: "authentication_required",
    message: "Log in to analyze a real resume.",
  });

  await page.goto("/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex.*nofollow|nofollow.*noindex/i,
  );
});

test("@public-demo @demo-enabled demo is synthetic, evidence-first, accessible, and network isolated", async ({
  page,
  request,
}) => {
  let analyticsRequests = 0;
  await page.route("**/api/analytics/events", async (route) => {
    analyticsRequests += 1;
    await route.fulfill({ status: 202, body: "{}" });
  });
  await request.post(`${PROVIDER_ORIGIN}/__reset`);

  const response = await page.goto("/demo");
  expect(response?.status()).toBe(200);
  await expect(
    page.getByText(
      "All candidate, resume, evidence, and job-description information on this page is synthetic demo data.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: "What this resume currently supports" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Strongest support" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Main evidence gap" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Best next move" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Selected synthetic evidence sources" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Proof Brief" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/Recruiter Confidence|recruiter confidence/i);
  await page.waitForTimeout(1_500);
  expect(await readServerRequestCounts(request)).toEqual({
    applicationRequests: 0,
    authUserRequests: 0,
  });
  expect(analyticsRequests).toBe(0);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  expect(await page.evaluate(() =>
    Object.keys(sessionStorage).filter((key) => key.startsWith("skillmint"))
  )).toEqual([]);

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    accessibility.violations.filter((violation) =>
      violation.impact === "critical" || violation.impact === "serious"
    ),
  ).toEqual([]);
});

test("@public-demo @demo-enabled homepage and logged-out upload route to the enabled synthetic demo", async ({
  page,
}) => {
  await page.goto("/");
  const demoLinks = page.getByRole("link", { name: "Explore live demo" });
  expect(await demoLinks.count()).toBeGreaterThan(0);
  for (const link of await demoLinks.all()) {
    await expect(link).toHaveAttribute("href", "/demo");
  }
  await expect(page.getByRole("link", { name: "Existing user login" }).first()).toHaveAttribute("href", "/login");
  await expect(page.getByText("Private pilot · synthetic demo").first()).toBeVisible();

  await page.goto("/upload");
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Explore synthetic demo" })).toHaveAttribute("href", "/demo");
});

test("@public-demo @demo-enabled authenticated upload remains available through server verification", async ({
  page,
  request,
}) => {
  await login(page, ACCOUNT_A);
  await request.post(`${PROVIDER_ORIGIN}/__reset`);
  await page.goto("/upload");

  await expect(
    page.getByRole("heading", { name: "Choose your resume file" }),
  ).toBeVisible();
  await expect(page.locator("#resume-file-upload")).toBeVisible();
  const requestCounts = await readServerRequestCounts(request);
  expect(requestCounts.applicationRequests).toBeGreaterThan(0);
  expect(requestCounts.authUserRequests).toBeGreaterThan(0);
});

test("@public-demo @demo-enabled authenticated dashboard is evidence-first and hides the removed metric", async ({
  page,
}) => {
  await page.route("**/api/resume/extract", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        extractedText: SYNTHETIC_RESUME_TEXT,
      }),
    });
  });
  await login(page, ACCOUNT_A);
  await page.goto("/upload");
  await page.locator("#resume-file-upload").setInputFiles({
    name: "synthetic-evidence-report.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Synthetic evidence-first dashboard fixture"),
  });
  await page.getByRole("button", { name: "Analyze Resume" }).click();
  await expect(page).toHaveURL(/\/resume$/);
  await expect(page.locator("body")).not.toContainText(
    /Recruiter Confidence|recruiter confidence|inferred shortlist/i,
  );
  await page.goto("/dashboard");

  await expect(
    page.getByRole("heading", { level: 1, name: "What your resume currently supports" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Strongest support" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Main evidence gap" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Best next move" })).toBeVisible();
  const calculationDetails = page.locator("details").filter({
    has: page.getByText("How this analysis was calculated", { exact: true }),
  });
  await expect(calculationDetails).not.toHaveAttribute("open", "");
  await expect(page.locator("body")).not.toContainText(/Recruiter Confidence|recruiter confidence|inferred shortlist/i);

  await page.goto("/roadmap");
  await expect(page.locator("body")).not.toContainText(
    /Recruiter Confidence|recruiter confidence|inferred shortlist/i,
  );
});

async function readServerRequestCounts(
  request: import("@playwright/test").APIRequestContext,
): Promise<{
  applicationRequests: number;
  authUserRequests: number;
}> {
  const response = await request.get(`${PROVIDER_ORIGIN}/__requests`);
  expect(response.status()).toBe(200);
  return response.json();
}
