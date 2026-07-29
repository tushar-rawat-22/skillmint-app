import {
  APP_ORIGIN,
  expect,
  test,
} from "./support/runtime";

const ACTIVE_REPORT_KEY = "skillmint:resume-analysis";
const SAFE_EXTRACTION_FALLBACK =
  "Resume text extraction failed. Try another file.";

test(
  "@launch-hardening @resume-extraction valid same-origin TXT succeeds and explicit cross-origin submission fails",
  async ({ page }) => {
    await page.goto("/upload");
    const sameOrigin = await page.evaluate(async () => {
      const formData = new FormData();
      formData.set(
        "file",
        new File(
          [
            "Skills: TypeScript\nProjects: Built an accessible app.",
          ],
          "resume.txt",
          { type: "text/plain" },
        ),
      );
      const response = await fetch("/api/resume/extract", {
        method: "POST",
        body: formData,
      });
      return {
        status: response.status,
        cacheControl: response.headers.get("cache-control"),
        body: await response.json(),
      };
    });
    expect(sameOrigin.status).toBe(200);
    expect(sameOrigin.cacheControl).toContain("no-store");
    expect(sameOrigin.body).toEqual({
      extractedText:
        "Skills: TypeScript\nProjects: Built an accessible app.",
    });

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
    await page.goto("/upload");
    await page.locator('input[type="file"]').setInputFiles({
      name: "previous-valid-resume.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(
        "Skills: TypeScript\nProjects: Built a safe application.",
      ),
    });
    await page.getByRole("button", {
      name: "Analyze Resume",
    }).click();
    await expect(page).toHaveURL(/\/resume$/);
    const previousActiveReport = await page.evaluate(
      (key) => localStorage.getItem(key),
      ACTIVE_REPORT_KEY,
    );
    expect(previousActiveReport).not.toBeNull();
    const authRequestsBeforeFailure =
      provider.count("auth:user");

    await page.goto("/upload");
    await page.locator('input[type="file"]').setInputFiles({
      name: "resume.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\nsynthetic"),
    });
    await page.getByRole("button", {
      name: "Analyze Resume",
    }).click();

    await expect(
      page.getByText(
        "Scanned or image-only PDFs are not supported.",
      ),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/upload$/);
    expect(
      await page.evaluate(
        (key) => localStorage.getItem(key),
        ACTIVE_REPORT_KEY,
      ),
    ).toBe(previousActiveReport);
    expect(provider.count("auth:user")).toBe(
      authRequestsBeforeFailure,
    );
  },
);

test(
  "@launch-hardening @resume-extraction malformed non-JSON failure uses a fixed fallback and never becomes extracted text",
  async ({ page }) => {
    await page.route("**/api/resume/extract", async (route) => {
      await route.fulfill({
        status: 502,
        contentType: "text/plain",
        body: "RAW_PROXY_OR_PROVIDER_DETAIL",
      });
    });
    await page.goto("/upload");
    await page.locator('input[type="file"]').setInputFiles({
      name: "resume.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Skills: TypeScript"),
    });
    await page.getByRole("button", {
      name: "Analyze Resume",
    }).click();

    await expect(
      page.getByText(SAFE_EXTRACTION_FALLBACK),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText(
      "RAW_PROXY_OR_PROVIDER_DETAIL",
    );
    await expect(page).toHaveURL(/\/upload$/);
  },
);

test(
  "@launch-hardening @resume-extraction a late failed request cannot replace newer browser state",
  async ({ page }) => {
    let signalStarted!: () => void;
    let releaseFailure!: () => void;
    const started = new Promise<void>((resolve) => {
      signalStarted = resolve;
    });
    const released = new Promise<void>((resolve) => {
      releaseFailure = resolve;
    });
    await page.route("**/api/resume/extract", async (route) => {
      signalStarted();
      await released;
      await route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({
          code: "empty_document",
          message: "This resume does not contain readable text.",
        }),
      });
    });
    await page.goto("/upload");
    await page.locator('input[type="file"]').setInputFiles({
      name: "late.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("pending extraction"),
    });
    await page.getByRole("button", {
      name: "Analyze Resume",
    }).click();
    await started;

    const newerState = '{"fixture":"newer-browser-state"}';
    await page.evaluate(
      ({ key, value }) => localStorage.setItem(key, value),
      { key: ACTIVE_REPORT_KEY, value: newerState },
    );
    releaseFailure();

    await expect(
      page.getByText(
        "This resume does not contain readable text.",
      ),
    ).toBeVisible();
    expect(
      await page.evaluate(
        (key) => localStorage.getItem(key),
        ACTIVE_REPORT_KEY,
      ),
    ).toBe(newerState);
  },
);

test(
  "@launch-hardening security headers and coarse health response are served by the running app",
  async ({ page }) => {
    const pageResponse = await page.request.get(
      `${APP_ORIGIN}/forgot-password`,
    );
    expect(pageResponse.status()).toBe(200);
    const headers = pageResponse.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(headers["permissions-policy"]).toContain("camera=()");
    expect(headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers["content-security-policy"]).toContain(
      "connect-src 'self' http://127.0.0.1:54321 ws://127.0.0.1:54321",
    );

    const health = await page.request.get(
      `${APP_ORIGIN}/api/health/config`,
    );
    expect(health.status()).toBe(200);
    expect(await health.json()).toEqual({ status: "healthy" });
    expect(health.headers()["cache-control"]).toContain("no-store");
  },
);
