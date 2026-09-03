import AxeBuilder from "@axe-core/playwright";

import {
  ACCOUNT_A,
  PROVIDER_ORIGIN,
  expect,
  login,
  test,
} from "./support/runtime";

async function expectNoSeriousAxeViolations(
  page: import("@playwright/test").Page,
) {
  const result = await new AxeBuilder({ page }).analyze();
  expect(
    result.violations
      .filter((violation) =>
        violation.impact === "serious" || violation.impact === "critical"
      )
      .map(({ id, impact, nodes }) => ({
        id,
        impact,
        targets: nodes.map((node) => node.target),
      })),
  ).toEqual([]);
}

async function expectNoHorizontalOverflow(
  page: import("@playwright/test").Page,
  width: number,
) {
  const overflow = await page.evaluate(() => ({
    body: document.body.scrollWidth - document.body.clientWidth,
    document:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  }));
  expect(overflow.body).toBeLessThanOrEqual(1);
  expect(overflow.document).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => window.innerWidth)).toBe(width);
}

async function installProfileUpsertContract(
  page: import("@playwright/test").Page,
) {
  await page.route(`${PROVIDER_ORIGIN}/rest/v1/profiles**`, async (route) => {
    const request = route.request();
    if (request.method() !== "POST") {
      await route.fallback();
      return;
    }

    const input = JSON.parse(request.postData() ?? "{}");
    const row = {
      id: ACCOUNT_A.id,
      full_name: input.full_name ?? "",
      email: input.email ?? null,
      career_goal: input.career_goal ?? null,
      target_role: input.target_role ?? null,
      created_at: "2026-01-02T03:04:05.000Z",
      updated_at: "2026-01-02T03:04:05.000Z",
    };
    const acceptsSingle = request.headers().accept?.includes(
      "application/vnd.pgrst.object+json",
    );

    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify(acceptsSingle ? row : [row]),
    });
  });
}

test("@critical candidate-first landing has one dominant value and a secondary recruiter path", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /Know what your resume proves.*Know what to fix next/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Candidate login" }).first(),
  ).toHaveAttribute("href", "/login");
  await expect(
    page.getByRole("link", { name: /recruiter workflow/i }),
  ).toHaveAttribute("href", "/recruiters");
  await expect(page.locator("h1")).not.toContainText("Career Operating System");

  const primary = page.getByRole("link", { name: "Candidate login" }).first();
  await primary.focus();
  expect(
    await primary.evaluate((element) => getComputedStyle(element).outlineStyle),
  ).not.toBe("none");
  await expectNoSeriousAxeViolations(page);
});

test("@critical first candidate journey stays progressive through resume handoff", async ({
  browserName,
  page,
  request,
}) => {
  await request.post(`${PROVIDER_ORIGIN}/__reset`);
  await installProfileUpsertContract(page);
  await login(page, ACCOUNT_A);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await expect(
    page.getByRole("heading", { level: 1, name: "What role are you aiming for?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Set target role", exact: true }),
  ).toHaveAttribute("href", "/setup");
  await expect(page.getByText("Career IQ", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Proof Confidence", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Active Target", { exact: true })).toHaveCount(0);
  await expectNoSeriousAxeViolations(page);

  await page.getByRole("link", { name: "Set target role", exact: true }).click();
  await expect(page).toHaveURL(/\/setup$/u);
  await expect(page.getByLabel("Target role")).toBeVisible();
  await expect(page.locator("select:visible")).toHaveCount(0);
  await expect(
    page.getByText("Add optional details for more tailored next steps"),
  ).toBeVisible();

  await page.getByLabel("Target role").fill("Frontend Developer");
  const saveTargetRole = page.getByRole("button", { name: "Save target role" });
  if (browserName === "chromium") {
    await page.getByLabel("Target role").focus();
    await page.keyboard.press("Tab");
    await expect(saveTargetRole).toBeFocused();
  } else {
    await saveTargetRole.focus();
    await expect(saveTargetRole).toBeFocused();
  }
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Now show us what your resume says." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Continue to resume upload" }),
  ).toHaveAttribute("href", "/upload");

  await page.getByRole("link", { name: "Continue to resume upload" }).click();
  await expect(page).toHaveURL(/\/upload$/u);
  await expect(
    page.getByRole("heading", { level: 1, name: "Now, show us what your resume says." }),
  ).toBeVisible();
  await expect(page.locator("#resume-file-upload")).toBeVisible();
  await expect(page.getByText("Private by default")).toBeVisible();
  await expectNoSeriousAxeViolations(page);
});

test("@critical candidate first-run flow reflows at 320px", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await request.post(`${PROVIDER_ORIGIN}/__reset`);
  await installProfileUpsertContract(page);

  await page.goto("/");
  await expectNoHorizontalOverflow(page, 320);

  await login(page, ACCOUNT_A);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expectNoHorizontalOverflow(page, 320);

  await page.goto("/setup");
  await expect(page.getByLabel("Target role")).toBeVisible();
  await expect(page.locator("select:visible")).toHaveCount(0);
  await expectNoHorizontalOverflow(page, 320);
  await expectNoSeriousAxeViolations(page);

  await page.getByLabel("Target role").fill("Data Analyst");
  await page.getByRole("button", { name: "Save target role" }).click();
  await page.getByRole("link", { name: "Continue to resume upload" }).click();
  await expectNoHorizontalOverflow(page, 320);
  await expect(page.locator("#resume-file-upload")).toBeVisible();
  await expectNoSeriousAxeViolations(page);
});
