import { ACCOUNT_B, PROVIDER_ORIGIN, expect, login, test } from "./support/runtime";

const viewports = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 320, height: 760 },
] as const;

test("@critical @recruiter-evidence recruiter workspace is keyboard-complete and overflow-safe at launch viewports", async ({ page, request }) => {
  await request.post(`${PROVIDER_ORIGIN}/__reset`);
  const persona = await request.post(`${PROVIDER_ORIGIN}/rest/v1/account_personas`, {
    data: { user_id: ACCOUNT_B.id, persona: "RECRUITER" },
  });
  expect(persona.ok()).toBeTruthy();
  await login(page, ACCOUNT_B);

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/recruiters/workspace");

    await expect(page.getByRole("heading", { name: /Translate one role description/u })).toBeVisible();
    const roleTitle = page.getByLabel("Role title");
    const jobDescription = page.getByLabel("Job description");
    const createMap = page.getByRole("button", { name: "Create evidence map" });
    await expect(roleTitle).toBeVisible();
    await expect(jobDescription).toBeVisible();
    await expect(createMap).toBeVisible();

    const overflow = await page.evaluate(() => ({
      body: document.body.scrollWidth - document.body.clientWidth,
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    expect(overflow.body).toBeLessThanOrEqual(1);
    expect(overflow.document).toBeLessThanOrEqual(1);

    await roleTitle.focus();
    await expect(roleTitle).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(jobDescription).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(createMap).toBeFocused();
  }
});
