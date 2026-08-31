import {
  ACCOUNT_A,
  PROVIDER_ORIGIN,
  expect,
  login,
  test,
} from "./support/runtime";

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

  await page.goto("/dashboard");
  await expect(page.getByText("Active Target", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Frontend Developer at Synthetic Co" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Proof Brief" })).toBeVisible();

  await page.getByRole("button", { name: "Create private Proof Brief" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Private Proof Brief ready. Nothing is shared yet.",
  );
});
