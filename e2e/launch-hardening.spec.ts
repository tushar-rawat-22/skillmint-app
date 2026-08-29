import AxeBuilder from "@axe-core/playwright";

import {
  ACCOUNT_A,
  APP_ORIGIN,
  PROVIDER_ORIGIN,
  expect,
  login,
  test,
} from "./support/runtime";

const ACTIVE_REPORT_KEY = "skillmint:resume-analysis";
const RESUME_SYNC_STATUS_KEY = "skillmint:resume-sync-status";
const SAFE_EXTRACTION_FALLBACK =
  "Resume text extraction failed. Try another file.";

test(
  "@launch-hardening @resume-extraction valid same-origin TXT succeeds and explicit cross-origin submission fails",
  async ({ page, request }) => {
    const personaSeed = await request.post(`${PROVIDER_ORIGIN}/rest/v1/account_personas`, {
      data: { user_id: ACCOUNT_A.id, persona: "CANDIDATE" },
    });
    expect(personaSeed.ok()).toBeTruthy();

    await login(page, ACCOUNT_A);
    await page.goto("/upload");
    await page.locator('input[type="file"]').setInputFiles({
      name: "resume.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(
        "Skills: TypeScript\nProjects: Built an accessible app.",
      ),
    });
    const responsePromise = page.waitForResponse(
      (response) => response.url().endsWith("/api/resume/extract"),
    );
    await page.getByRole("button", { name: "Analyze Resume" }).click();
    const sameOrigin = await responsePromise;
    expect(sameOrigin.status()).toBe(200);
    expect(sameOrigin.headers()["cache-control"]).toContain("no-store");
    expect(await sameOrigin.json()).toEqual({
      extractedText:
        "Skills: TypeScript\nProjects: Built an accessible app.",
    });
    await expect(page).toHaveURL(/\/resume$/);

    const crossOrigin = await page.request.post(
      `${APP_ORIGIN}/api/resume/extract`,
      {
        headers: {
          origin: "https://cross-origin.invalid",
          "sec-fetch-site": "cross-site",
        },
        multipart: {
          file: {
            name: "resume.txt",
            mimeType: "text/plain",
            buffer: Buffer.from("Skills: TypeScript"),
          },
        },
      },
    );
    expect(crossOrigin.status()).toBe(403);
    expect(crossOrigin.headers()["cache-control"]).toContain(
      "no-store",
    );
    expect(await crossOrigin.json()).toEqual({
      code: "cross_origin_request",
      message: "This resume request is not allowed.",
    });
    expect(crossOrigin.headers()["access-control-allow-origin"]).toBeUndefined();
  },
);

test(
  "@launch-hardening @resume-extraction typed extraction failure never publishes, saves, or replaces the previous active report",
  async ({ page, provider }) => {
    let extractionCount = 0;
    await page.route("**/api/resume/extract", async (route) => {
      extractionCount += 1;
      if (extractionCount === 1) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            extractedText:
              "Skills: TypeScript\nProjects: Built a safe application.",
          }),
        });
        return;
      }
      await route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({
          code: "scanned_pdf_unsupported",
          message: "Scanned or image-only PDFs are not supported.",
        }),
      });
    });

    await login(page, ACCOUNT_A);
    await page.goto("/upload");
    await page.locator('input[type="file"]').setInputFiles({
      name: "resume.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("first"),
    });
    await page.getByRole("button", { name: "Analyze Resume" }).click();
    await expect(page).toHaveURL(/\/resume$/);
    const firstReport = await page.evaluate((key) => localStorage.getItem(key), ACTIVE_REPORT_KEY);
    expect(firstReport).not.toBeNull();

    await page.goto("/upload");
    await page.locator('input[type="file"]').setInputFiles({
      name: "scanned.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("second"),
    });
    await page.getByRole("button", { name: "Analyze Resume" }).click();
    await expect(page.getByRole("alert")).toContainText("Scanned or image-only PDFs are not supported.");
    await expect(page).toHaveURL(/\/upload$/);
    const afterFailure = await page.evaluate((key) => localStorage.getItem(key), ACTIVE_REPORT_KEY);
    expect(afterFailure).toBe(firstReport);
    expect(provider.count("resume:insert", ACCOUNT_A.id)).toBe(1);
  },
);

test(
  "@launch-hardening @resume-extraction malformed non-JSON failure uses a fixed fallback and never becomes extracted text",
  async ({ page }) => {
    await page.route("**/api/resume/extract", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "text/html",
        body: "<h1>RAW_INTERNAL_PROVIDER_FAILURE</h1>",
      });
    });
    await login(page, ACCOUNT_A);
    await page.goto("/upload");
    await page.locator('input[type="file"]').setInputFiles({
      name: "resume.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("resume"),
    });
    await page.getByRole("button", { name: "Analyze Resume" }).click();
    await expect(page.getByRole("alert")).toContainText(SAFE_EXTRACTION_FALLBACK);
    await expect(page.getByRole("alert")).not.toContainText("RAW_INTERNAL_PROVIDER_FAILURE");
    await expect(page).toHaveURL(/\/upload$/);
  },
);

test(
  "@launch-hardening @resume-extraction a late failed request cannot replace newer browser state",
  async ({ page }) => {
    let releaseLateFailure = () => {};
    const lateFailure = new Promise<void>((resolve) => {
      releaseLateFailure = resolve;
    });
    let requestCount = 0;
    await page.route("**/api/resume/extract", async (route) => {
      requestCount += 1;
      if (requestCount === 1) {
        await lateFailure;
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            code: "extraction_failed",
            message: "Resume text extraction failed. Try another file.",
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ extractedText: "newer analysis" }),
      });
    });

    await login(page, ACCOUNT_A);
    await page.goto("/upload");
    await page.locator('input[type="file"]').setInputFiles({
      name: "old.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("old"),
    });
    const firstClick = page.getByRole("button", { name: "Analyze Resume" }).click();
    await expect.poll(() => requestCount).toBe(1);
    await page.locator('input[type="file"]').setInputFiles({
      name: "new.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("new"),
    });
    await page.getByRole("button", { name: "Analyze Resume" }).click();
    await expect(page).toHaveURL(/\/resume$/);
    const active = await page.evaluate((key) => localStorage.getItem(key), ACTIVE_REPORT_KEY);
    expect(active).toContain("newer analysis");
    releaseLateFailure();
    await firstClick;
    const afterLateFailure = await page.evaluate((key) => localStorage.getItem(key), ACTIVE_REPORT_KEY);
    expect(afterLateFailure).toBe(active);
  },
);

test(
  "@launch-hardening @critical @phase4-upload-accessibility keyboard upload announces pending and failed analysis before a successful retry",
  async ({ page }) => {
    let extractionCount = 0;
    await page.route("**/api/resume/extract", async (route) => {
      extractionCount += 1;
      if (extractionCount === 1) {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            code: "authentication_unavailable",
            message: "Resume analysis is temporarily unavailable.",
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ extractedText: "Skills: accessibility testing" }),
      });
    });

    await login(page, ACCOUNT_A);
    await page.goto("/upload");
    const chooser = page.locator('input[type="file"]');
    await chooser.focus();
    await expect(chooser).toBeFocused();
    await chooser.setInputFiles({
      name: "resume.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Skills: accessibility testing"),
    });
    const button = page.getByRole("button", { name: "Analyze Resume" });
    await button.focus();
    await expect(button).toBeFocused();
    await button.press("Enter");
    await expect(page.getByRole("status")).toContainText("Analyzing resume");
    await expect(page.getByRole("alert")).toContainText("temporarily unavailable");
    await expect(page).toHaveURL(/\/upload$/);
    await button.focus();
    await button.press("Enter");
    await expect(page).toHaveURL(/\/resume$/);
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations).toEqual([]);
  },
);

test(
  "@launch-hardening dashboard removes the readiness forecast without hiding current guidance",
  async ({ page }) => {
    await login(page, ACCOUNT_A);
    await page.goto("/dashboard");
    await expect(page.getByText(/days to interview-ready/i)).toHaveCount(0);
    await expect(page.getByText(/interview-ready in/i)).toHaveCount(0);
  },
);

test(
  "@launch-hardening security headers and coarse health response are served by the running app",
  async ({ page, request }) => {
    const health = await request.get(`${APP_ORIGIN}/api/health/config`);
    expect(health.status()).toBe(200);
    expect(health.headers()["cache-control"]).toContain("no-store");
    expect(await health.json()).toEqual(expect.objectContaining({ configured: expect.any(Boolean) }));

    const response = await page.goto("/");
    expect(response).not.toBeNull();
    const headers = response!.headers();
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  },
);
