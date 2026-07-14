import AxeBuilder from "@axe-core/playwright";

import { expect, test } from "./support/runtime";

async function expectNoSeriousAxeViolations(page: import("@playwright/test").Page) {
  await page.evaluate(async () => {
    await Promise.all(
      document.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
    );
  });
  const result = await new AxeBuilder({ page }).analyze();
  const serious = result.violations.filter((violation) =>
    violation.impact === "serious" || violation.impact === "critical"
  );
  expect(serious.map(({ id, impact, nodes }) => ({
    id,
    impact,
    targets: nodes.map((node) => node.target),
  }))).toEqual([]);
}

test("@critical Trust Center, feedback, and confirmation dialog have no serious structural violations", async ({ page }) => {
  await page.goto("/settings/data");
  await expect(page.getByRole("heading", { name: "Your data & privacy" })).toBeVisible();
  await expectNoSeriousAxeViolations(page);

  await page.getByRole("button", { name: "Feedback", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Beta feedback" })).toBeVisible();
  await expectNoSeriousAxeViolations(page);
  await page.getByRole("button", { name: "Close beta feedback" }).click();

  await page.getByRole("button", { name: "Clear SkillMint data from this browser" }).click();
  const dialog = page.getByRole("dialog", { name: "Clear SkillMint data from this browser" });
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect(dialog).toHaveAccessibleName("Clear SkillMint data from this browser");
  await expectNoSeriousAxeViolations(page);

  const duplicateIds = await page.evaluate(() => {
    const ids = [...document.querySelectorAll<HTMLElement>("[id]")].map((element) => element.id);
    return ids.filter((id, index) => ids.indexOf(id) !== index);
  });
  expect(duplicateIds).toEqual([]);
});

test("@critical 320 CSS-pixel reduced-motion reflow has reachable controls and no closure-critical overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/settings/data");
  await expect(page.getByRole("heading", { name: "Your data & privacy" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Download browser data" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Feedback", exact: true })).toBeVisible();
  const overflow = await page.evaluate(() => ({
    body: document.body.scrollWidth - document.body.clientWidth,
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  expect(overflow.body).toBeLessThanOrEqual(1);
  expect(overflow.document).toBeLessThanOrEqual(1);

  await page.getByRole("button", { name: "Feedback", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "Beta feedback" });
  await expect(panel).toBeVisible();
  const box = await panel.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(320.5);
  await expectNoSeriousAxeViolations(page);
});

test("keyboard-only nondestructive path exposes truthful expanded, busy, status, and alert roles", async ({ page }) => {
  await page.goto("/settings/data");
  const feedback = page.getByRole("button", { name: "Feedback", exact: true });
  await feedback.focus();
  await page.keyboard.press("Enter");
  await expect(feedback).toHaveAttribute("aria-expanded", "true");
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Send feedback" }) });
  await expect(form).toHaveAttribute("aria-busy", "false");
  await page.getByPlaceholder("What felt broken, confusing, or useful?").fill("Keyboard-only synthetic feedback");
  await page.getByRole("button", { name: "Send feedback" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: /saved in this browser/i })).toBeVisible();
  await expect(feedback).toHaveAttribute("aria-expanded", "true");

  await page.getByRole("button", { name: "Close beta feedback" }).focus();
  await page.keyboard.press("Enter");
  await expect(feedback).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Clear SkillMint data from this browser" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Clear SkillMint data from this browser" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Clear SkillMint data from this browser" })).toHaveCount(0);
});
