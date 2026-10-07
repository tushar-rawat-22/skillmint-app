import AxeBuilder from "@axe-core/playwright";

import { expect, test } from "./support/runtime";

const PUBLIC_PAGES = [
  ["/", "https://skillmint-app-three.vercel.app/"],
  ["/candidates", "https://skillmint-app-three.vercel.app/candidates"],
  ["/recruiters", "https://skillmint-app-three.vercel.app/recruiters"],
  ["/privacy", "https://skillmint-app-three.vercel.app/privacy"],
] as const;

for (const [path, canonical] of PUBLIC_PAGES) {
  test(`@launch-discovery ${path} is intentionally indexable and canonical`, async ({ page }) => {
    await page.goto(path);

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /index, follow/i,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      canonical,
    );
  });
}

test("@launch-discovery robots and sitemap expose only the intended public launch surface", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBeTruthy();
  const robotsText = await robots.text();
  expect(robotsText).toContain("Sitemap: https://skillmint-app-three.vercel.app/sitemap.xml");
  expect(robotsText).toContain("Disallow: /dashboard");
  expect(robotsText).toContain("Disallow: /api/");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
  const sitemapText = await sitemap.text();

  for (const [, canonical] of PUBLIC_PAGES) {
    expect(sitemapText).toContain(`<loc>${canonical}</loc>`);
  }
  for (const privatePath of ["/dashboard", "/jobs", "/settings", "/recruiters/workspace"]) {
    expect(sitemapText).not.toContain(privatePath);
  }
});

test("@launch-discovery authenticated workspace routes remain non-indexable", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex, nofollow/i,
  );
});

test("@launch-discovery candidate and recruiter public pages keep distinct evidence-first compositions", async ({
  page,
}) => {
  const routes = [
    {
      path: "/candidates",
      composition: "candidate-editorial",
      heading: "What does my resume actually support?",
      primaryAction: "Request access",
      evidenceLabel: "Strongest support",
    },
    {
      path: "/recruiters",
      composition: "recruiter-review",
      heading: "What evidence supports this candidate for this role?",
      primaryAction: "Request recruiter access",
      evidenceLabel: "Role requirement",
    },
  ] as const;

  for (const { path, composition, heading, primaryAction, evidenceLabel } of routes) {
    await page.goto(path);

    await expect(page.locator(`main[data-role-composition="${composition}"]`)).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(page.getByRole("link", { name: primaryAction, exact: true })).toHaveAttribute(
      "href",
      "/signup",
    );
    await expect(page.getByText(evidenceLabel, { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Read Data & privacy", exact: true })).toHaveAttribute(
      "href",
      "/privacy",
    );
    await expect(page.locator("h1")).toHaveCount(1);

    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      accessibility.violations.filter((violation) =>
        violation.impact === "critical" || violation.impact === "serious"
      ),
    ).toEqual([]);
  }

  await page.goto("/recruiters");
  await expect(page.locator('[data-role-composition="candidate-editorial"]')).toHaveCount(0);
  await expect(page.getByText("SkillMint is not a searchable candidate database.")).toBeVisible();
  await expect(page.getByText(/does not rank candidates, predict hiring outcomes/i)).toBeVisible();
});

test("@launch-discovery role pages pass responsive overflow, focus, and target-size acceptance", async ({
  page,
}) => {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 780 });
    await page.emulateMedia({ reducedMotion: "reduce" });

    for (const path of ["/candidates", "/recruiters"]) {
      await page.goto(path);

      const overflow = await page.evaluate(() => ({
        body: document.body.scrollWidth - document.body.clientWidth,
        document:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      }));
      expect(overflow.body, `${path} body overflow at ${width}px`).toBeLessThanOrEqual(1);
      expect(overflow.document, `${path} document overflow at ${width}px`).toBeLessThanOrEqual(1);

      const primary = page.locator('main a[href="/signup"]').first();
      await primary.focus();
      expect(
        await primary.evaluate((element) => getComputedStyle(element).outlineStyle),
      ).not.toBe("none");

      const undersizedMainActions = await page.locator("main a:visible").evaluateAll(
        (elements) => elements.flatMap((element) => {
          const rectangle = element.getBoundingClientRect();
          return rectangle.width < 24 || rectangle.height < 24
            ? [{
                text: element.textContent?.trim() ?? "",
                width: rectangle.width,
                height: rectangle.height,
              }]
            : [];
        }),
      );
      expect(undersizedMainActions, `${path} undersized actions at ${width}px`).toEqual([]);
    }
  }
});

test("@launch-discovery shared public navigation remains persona-neutral and complete at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 780 });

  for (const path of ["/", "/privacy", "/candidates", "/recruiters"]) {
    await page.goto(path);
    const navigation = page.getByRole("navigation", { name: "Public navigation" });

    await expect(navigation.getByRole("link", { name: "Candidates", exact: true })).toBeVisible();
    await expect(navigation.getByRole("link", { name: "Recruiters", exact: true })).toBeVisible();
    await expect(navigation.getByRole("link", { name: "Log in", exact: true })).toBeVisible();
    await expect(navigation.getByRole("link", { name: "Candidate login", exact: true })).toHaveCount(0);

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  }
});

test("@launch-discovery landing secondary actions remain keyboard-visible and touch-sized at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  for (const name of [
    "Access details",
    "Hiring? See the recruiter workflow",
  ]) {
    const action = page.getByRole("link", { name, exact: true });
    await action.focus();
    await expect(action).toBeFocused();
    expect(
      await action.evaluate((element) => getComputedStyle(element).outlineStyle),
      `${name} should keep a visible keyboard focus indicator`,
    ).not.toBe("none");

    const rectangle = await action.boundingBox();
    expect(rectangle, `${name} should have a rendered hit target`).not.toBeNull();
    expect(
      rectangle!.height,
      `${name} touch target should be at least 44 CSS pixels high`,
    ).toBeGreaterThanOrEqual(44);
  }

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});

test("@launch-discovery privacy and support contacts remain keyboard-visible and touch-sized at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await page.emulateMedia({ reducedMotion: "reduce" });

  for (const path of ["/privacy", "/support"]) {
    await page.goto(path);
    const contact = page.locator('main a[href^="mailto:"]');
    await expect(contact).toHaveCount(1);
    await contact.focus();
    await expect(contact).toBeFocused();
    expect(
      await contact.evaluate((element) => getComputedStyle(element).outlineStyle),
      `${path} contact should keep a visible keyboard focus indicator`,
    ).not.toBe("none");

    const rectangle = await contact.boundingBox();
    expect(rectangle, `${path} contact should have a rendered hit target`).not.toBeNull();
    expect(
      rectangle!.height,
      `${path} contact touch target should be at least 44 CSS pixels high`,
    ).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  }
});
