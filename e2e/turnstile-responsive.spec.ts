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
              challenge.style.width = '300px';
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


test(
  "@turnstile a blocked challenge script explains the failure while recovery remains disabled",
  async ({ page }) => {
    await page.route(TURNSTILE_SCRIPT, async (route) => {
      await route.abort("failed");
    });

    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto("/forgot-password");

    await expect(
      page.getByRole("button", { name: "Send reset link" }),
    ).toBeDisabled();
    await expect(page.getByRole("alert")).toContainText(
      "Security check could not load. Check your connection or browser settings, then reload this page.",
    );
    await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 320);
  },
);


test(
  "@turnstile a recovery request consumes its challenge before any retry",
  async ({ page, provider }) => {
    await page.route(TURNSTILE_SCRIPT, async (route) => {
      await route.fulfill({
        contentType: "text/javascript",
        body: "window.turnstile = { reset: () => { window.__syntheticTurnstileResets = (window.__syntheticTurnstileResets || 0) + 1; } };",
      });
    });

    provider.passwordResetMode = "reject";
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill("account-a@example.test");
    const submit = page.getByRole("button", { name: "Send reset link" });

    await page.evaluate(() => {
      window.skillmintTurnstileSuccess("consumed-token");
    });
    await expect(submit).toBeEnabled();
    await submit.click();

    await expect(
      page.getByText("We could not send a reset link. Please try again."),
    ).toBeVisible();
    expect(provider.count("auth:password-reset")).toBe(1);
    await expect(submit).toBeDisabled();
    expect(
      await page.evaluate(() => window.__syntheticTurnstileResets),
    ).toBe(1);

    provider.passwordResetMode = "success";
    await page.evaluate(() => {
      window.skillmintTurnstileSuccess("fresh-token");
    });
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(
      page.getByText(
        "If an account exists for that email, a password reset link will be sent.",
      ),
    ).toBeVisible();
    expect(provider.count("auth:password-reset")).toBe(2);
    await expect(submit).toBeDisabled();
  },
);

declare global {
  interface Window {
    __syntheticTurnstileResets?: number;
    skillmintTurnstileExpired: () => void;
    skillmintTurnstileSuccess: (token: string) => void;
  }
}
