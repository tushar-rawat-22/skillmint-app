import { ACCOUNT_A, PROVIDER_ORIGIN, expect, login, test } from "./support/runtime";

const viewports = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 320, height: 760 },
] as const;

test("@critical @launch-hardening candidate workspace is keyboard-reachable and overflow-safe at launch viewports", async ({ page, request }) => {
  await request.post(`${PROVIDER_ORIGIN}/__reset`);
  const persona = await request.post(`${PROVIDER_ORIGIN}/rest/v1/account_personas`, {
    data: { user_id: ACCOUNT_A.id, persona: "CANDIDATE" },
  });
  expect(persona.ok()).toBeTruthy();
  await login(page, ACCOUNT_A);

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { level: 1, name: "What role are you aiming for?" })).toBeVisible();
    const primaryAction = page.getByRole("link", { name: "Set target role" });
    await expect(primaryAction).toBeVisible();

    const overflow = await page.evaluate(() => ({
      body: document.body.scrollWidth - document.body.clientWidth,
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    expect(overflow.body).toBeLessThanOrEqual(1);
    expect(overflow.document).toBeLessThanOrEqual(1);

    await primaryAction.focus();
    await expect(primaryAction).toBeFocused();
    expect(await primaryAction.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");
  }
});
