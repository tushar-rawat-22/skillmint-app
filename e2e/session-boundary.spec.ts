import {
  ACCOUNT_A,
  PROVIDER_ORIGIN,
  expiredSessionCookie,
  expect,
  login,
  signOut,
  test,
} from "./support/runtime";

async function seedCandidatePersona(request: Parameters<typeof test>[0] extends never ? never : any) {
  const reset = await request.post(`${PROVIDER_ORIGIN}/__reset`);
  expect(reset.ok()).toBeTruthy();

  const persona = await request.post(
    `${PROVIDER_ORIGIN}/rest/v1/account_personas`,
    { data: { user_id: ACCOUNT_A.id, persona: "CANDIDATE" } },
  );
  expect(persona.ok()).toBeTruthy();
}

test(
  "@launch-hardening expired session cookies cannot render private workspace deep links",
  async ({ page, context, request }) => {
    await seedCandidatePersona(request);

    await context.addCookies([expiredSessionCookie(ACCOUNT_A)]);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "What your resume currently supports",
      }),
    ).toHaveCount(0);

    await context.addCookies([expiredSessionCookie(ACCOUNT_A)]);
    await page.goto("/recruiters/workspace");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
  },
);

test(
  "@launch-hardening logout invalidates subsequent candidate workspace deep links",
  async ({ page, context, request }) => {
    await seedCandidatePersona(request);
    await login(page, ACCOUNT_A);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);

    await signOut(context);
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "What your resume currently supports",
      }),
    ).toHaveCount(0);
  },
);
