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
