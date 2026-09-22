import { expect, test } from "./support/runtime";

const TURNSTILE_SCRIPT =
  "https://challenges.cloudflare.com/turnstile/v0/api.js";

const VIEWPORTS = [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
  { width: 320, height: 720 },
] as const;

test(
  "@turnstile recovery challenge stays responsive and fails closed across token lifecycle states",
  async ({ page }) => {
    await page.route(TURNSTILE_SCRIPT, async (route) => {
      await route.fulfill({
        contentType: "text/javascript",
        body: `(() => {
          const mount = () => {
            document.querySelectorAll('.cf-turnstile').forEach((widget) => {
              const challenge = document.createElement('div');
              challenge.dataset.syntheticTurnstile = 'true';
              challenge.style.width = widget.dataset.size === 'flexible'
                ? '100%'
                : '300px';
              challenge.style.height = '65px';
              widget.append(challenge);
            });
          };
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', mount, { once: true });
          } else {
            mount();
          }
        })();`,
      });
    });

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);
      await page.goto("/forgot-password");

      const widget = page.locator(".cf-turnstile");
      const submit = page.getByRole("button", {
        name: "Send reset link",
      });

      await expect(widget).toHaveAttribute("data-size", "flexible");
      await expect(
        widget.locator('[data-synthetic-turnstile="true"]'),
      ).toBeVisible();
      await expect(submit).toBeDisabled();
      await expect(page.locator("body")).toHaveJSProperty(
        "scrollWidth",
        viewport.width,
      );

      await page.evaluate(() => {
        window.skillmintTurnstileSuccess("synthetic-turnstile-token");
      });
      await expect(submit).toBeEnabled();

      await page.evaluate(() => {
        window.skillmintTurnstileExpired();
      });
      await expect(submit).toBeDisabled();

      expect(await widget.getAttribute("data-error-callback")).toBe(
        "skillmintTurnstileExpired",
      );
      await page.evaluate(() => {
        window.skillmintTurnstileSuccess("synthetic-turnstile-token");
        window.skillmintTurnstileExpired();
      });
      await expect(submit).toBeDisabled();
    }
  },
);

declare global {
  interface Window {
    skillmintTurnstileExpired: () => void;
    skillmintTurnstileSuccess: (token: string) => void;
  }
}
