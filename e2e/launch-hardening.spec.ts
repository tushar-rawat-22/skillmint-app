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
    await request.post(`${PROVIDER_ORIGIN}/__reset`);
    const persona = await request.post(
      `${PROVIDER_ORIGIN}/rest/v1/account_personas`,
      { data: { user_id: ACCOUNT_A.id, persona: "CANDIDATE" } },
    );
    expect(persona.ok()).toBeTruthy();
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
    await page.goto("/upload");
    const authRequestsBeforeFailure =
      provider.count("auth:user");
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
    await login(page, ACCOUNT_A);
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
    await login(page, ACCOUNT_A);
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
  "@launch-hardening @critical @phase4-upload-accessibility keyboard upload announces pending and failed analysis before a successful retry",
  async ({ browserName, page }) => {
    let extractionCount = 0;
    let signalStarted!: () => void;
    let releaseFailure!: () => void;
    const started = new Promise<void>((resolve) => {
      signalStarted = resolve;
    });
    const released = new Promise<void>((resolve) => {
      releaseFailure = resolve;
    });

    await page.setViewportSize({ width: 320, height: 760 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("**/api/resume/extract", async (route) => {
      extractionCount += 1;

      if (extractionCount === 1) {
        signalStarted();
        await released;
        await route.fulfill({
          status: 422,
          contentType: "application/json",
          body: JSON.stringify({
            code: "scanned_pdf_unsupported",
            message: "RAW_UNTRUSTED_EXTRACTION_DETAIL",
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          extractedText: [
            "Skills: TypeScript React accessibility testing",
            "Projects: Built an accessible application with measurable results.",
            "Education: B.Tech Computer Science",
          ].join("\n"),
        }),
      });
    });

    await login(page, ACCOUNT_A);
    await page.goto("/upload");
    await expect(
      page.getByRole("heading", {
        name: "Choose your resume file",
      }),
    ).toBeVisible();

    const fileInput = page.locator("#resume-file-upload");
    const uploadSurface = page.locator(
      'label[for="resume-file-upload"]',
    );
    const tabKey =
      browserName === "webkit" ? "Alt+Tab" : "Tab";
    let reachedFileInput = false;

    for (let index = 0; index < 20; index += 1) {
      await page.keyboard.press(tabKey);
      reachedFileInput = await fileInput.evaluate(
        (input) => input === document.activeElement,
      );
      if (reachedFileInput) break;
    }

    expect(reachedFileInput).toBe(true);
    await expect(fileInput).toBeFocused();
    const focusedSurfaceStyle = await uploadSurface.evaluate(
      (surface) => {
        const style = getComputedStyle(surface);
        return {
          borderColor: style.borderColor,
          boxShadow: style.boxShadow,
        };
      },
    );
    expect(focusedSurfaceStyle.boxShadow).not.toBe("none");

    const [fileChooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.keyboard.press("Enter"),
    ]);
    await fileChooser.setFiles({
      name: "keyboard-resume.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\nsynthetic keyboard fixture"),
    });

    const analyzeButton = page.getByRole("button", {
      name: "Analyze Resume",
    });
    await expect(analyzeButton).toBeVisible();
    await analyzeButton.click();
    await started;

    await expect(
      page.getByRole("status"),
    ).toHaveText("Resume analysis is processing.");
    await expect(
      page.locator('[aria-busy="true"]'),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Building report...",
      }),
    ).toBeDisabled();

    releaseFailure();

    const alert = page.locator(
      '[role="alert"][aria-atomic="true"]',
    );
    await expect(alert).toContainText("Analysis failed");
    await expect(alert).toContainText(
      "Scanned or image-only PDFs are not supported.",
    );
    await expect(page.locator("body")).not.toContainText(
      "RAW_UNTRUSTED_EXTRACTION_DETAIL",
    );
    await expect(analyzeButton).toBeEnabled();

    const overflow = await page.evaluate(() => ({
      body:
        document.body.scrollWidth -
        document.body.clientWidth,
      document:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    }));
    expect(overflow.body).toBeLessThanOrEqual(1);
    expect(overflow.document).toBeLessThanOrEqual(1);

    const axeResult = await new AxeBuilder({ page }).analyze();
    const serious = axeResult.violations.filter(
      (violation) =>
        violation.impact === "serious" ||
        violation.impact === "critical",
    );
    expect(
      serious.map(({ id, impact, nodes }) => ({
        id,
        impact,
        targets: nodes.map((node) => node.target),
      })),
    ).toEqual([]);

    const keysBeforeRetry = await page.evaluate(() =>
      Object.keys(localStorage).sort()
    );
    await analyzeButton.click();
    await expect(page).toHaveURL(/\/resume$/);
    const keysAfterRetry = await page.evaluate(() =>
      Object.keys(localStorage).sort()
    );
    expect(
      keysAfterRetry.filter(
        (key) =>
          !keysBeforeRetry.includes(key) &&
          key !== ACTIVE_REPORT_KEY &&
          key !== RESUME_SYNC_STATUS_KEY,
      ),
    ).toEqual([]);
  },
);

test(
  "@launch-hardening dashboard removes the readiness forecast without hiding current guidance",
  async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("**/api/resume/extract", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          extractedText: [
            "Skills: TypeScript React Node.js SQL",
            "Projects: Built and deployed an accessible career dashboard with automated tests and measurable performance improvements.",
            "Education: B.Tech Computer Science",
          ].join("\n"),
        }),
      });
    });

    await login(page, ACCOUNT_A);
    await page.goto("/upload");
    await page.locator('input[type="file"]').setInputFiles({
      name: "dashboard-truth-resume.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("synthetic dashboard truth fixture"),
    });
    await page.getByRole("button", {
      name: "Analyze Resume",
    }).click();
    await expect(page).toHaveURL(/\/resume$/);

    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "What your resume currently supports",
      }),
    ).toBeVisible();
    await page.getByText(
      "How this analysis was calculated",
      { exact: true },
    ).click();
    await expect(
      page.getByText("Current readiness signal", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Career IQ", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("Readiness Signals", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Next best things", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Projected Readiness Path", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText(
        "Projection only, based on completing the next visible mission",
        { exact: false },
      ),
    ).toHaveCount(0);
    await expect(
      page.locator('[aria-label="Projected readiness path"]'),
    ).toHaveCount(0);

    for (const label of ["30d", "60d", "90d"]) {
      await expect(
        page.getByText(label, { exact: true }),
      ).toHaveCount(0);
    }

    const overflow = await page.evaluate(() => ({
      body: document.body.scrollWidth - document.body.clientWidth,
      document:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    }));
    expect(overflow.body).toBeLessThanOrEqual(1);
    expect(overflow.document).toBeLessThanOrEqual(1);
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
