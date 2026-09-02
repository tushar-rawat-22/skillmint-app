import {
  ACCOUNT_A,
  PROVIDER_ORIGIN,
  expect,
  login,
  test,
} from "./support/runtime";

const ACTIVE_TARGET_STORAGE_KEY = "skillmint:active-target:v1";
const TARGET_ROLE_SETUP_STORAGE_KEY = "skillmint:target-role-setup";
const SYNTHETIC_RESUME_TEXT = [
  "Skills: TypeScript React testing PostgreSQL accessibility",
  "Projects: Built a typed web application with component tests and measurable performance improvements.",
  "Experience: Contributed reusable frontend components and documented review checks.",
  "Education: Undergraduate computing programme",
].join("\n");

const SYNTHETIC_JOB_DESCRIPTION = [
  "Build and maintain production React and TypeScript interfaces.",
  "Write automated tests, review frontend changes, and collaborate with product and design.",
  "Use PostgreSQL-backed services and accessibility standards to ship reliable user experiences.",
].join(" ");

test("@critical signed-in candidate restores account career direction on a fresh browser", async ({
  page,
  request,
}) => {
  await request.post(`${PROVIDER_ORIGIN}/__reset`);

  await login(page, ACCOUNT_A);
  await page.goto("/setup");

  await expect(page.getByLabel("Your career direction")).toHaveValue(
    "Synthetic engineer",
  );
  await expect(
    page.getByText(
      "Restored your saved target role from this SkillMint account. Review the remaining direction settings before saving.",
    ),
  ).toBeVisible();

  expect(
    await page.evaluate(
      (key) => localStorage.getItem(key),
      TARGET_ROLE_SETUP_STORAGE_KEY,
    ),
  ).toBeNull();
});

test("@critical controlled beta candidate reaches a private Proof Brief through the core product loop", async ({
  page,
  request,
}) => {
  await request.post(`${PROVIDER_ORIGIN}/__reset`);
  const persona = await request.post(
    `${PROVIDER_ORIGIN}/rest/v1/account_personas`,
    { data: { user_id: ACCOUNT_A.id, persona: "CANDIDATE" } },
  );
  expect(persona.ok()).toBeTruthy();

  await page.route("**/api/resume/extract", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ extractedText: SYNTHETIC_RESUME_TEXT }),
    });
  });

  await page.route(`${PROVIDER_ORIGIN}/rest/v1/job_matches**`, async (route) => {
    const request = route.request();
    if (request.method() !== "POST") {
      await route.fallback();
      return;
    }

    const input = JSON.parse(request.postData() ?? "{}");
    const row = {
      id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      user_id: ACCOUNT_A.id,
      ...input,
      created_at: "2026-01-02T03:04:05.000Z",
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

  await login(page, ACCOUNT_A);

  await page.goto("/upload");
  await page.locator("#resume-file-upload").setInputFiles({
    name: "controlled-beta-candidate.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Synthetic controlled-beta resume fixture"),
  });
  await page.getByRole("button", { name: "Analyze Resume" }).click();
  await expect(page).toHaveURL(/\/resume$/u);

  await page.goto("/ats");
  await page.getByLabel("Job title").fill("Frontend Developer");
  await page.getByLabel("Company name").fill("Synthetic Co");
  await page.getByLabel("Job description to match").fill(
    SYNTHETIC_JOB_DESCRIPTION,
  );
  await page.getByRole("button", { name: "Analyze Match" }).click();
  await page.getByRole("button", { name: "Set as Active Target" }).click();
  await expect(page.getByText(/Latest JD set as Active Target/u)).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Frontend Developer at Synthetic Co",
      exact: true,
    }),
  ).toBeVisible();

  const activeTargetBeforeNavigation = await page.evaluate(
    (key) => localStorage.getItem(key),
    ACTIVE_TARGET_STORAGE_KEY,
  );
  expect(activeTargetBeforeNavigation).toContain("Frontend Developer");
  expect(activeTargetBeforeNavigation).toContain("Synthetic Co");

  await page.goto("/dashboard");
  expect(
    await page.evaluate(
      (key) => localStorage.getItem(key),
      ACTIVE_TARGET_STORAGE_KEY,
    ),
  ).toBe(activeTargetBeforeNavigation);
  await expect(
    page.getByRole("heading", {
      name: "Frontend Developer at Synthetic Co",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Proof Brief" })).toBeVisible();

  await page.getByRole("button", { name: "Create private Proof Brief" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Private Proof Brief ready. Nothing is shared yet.",
  );
});
