import AxeBuilder from "@axe-core/playwright";

import {
  ACCOUNT_A,
  APP_ORIGIN,
  PROVIDER_ORIGIN,
  expect,
  login,
  test,
} from "./support/runtime";

const SHARED_TOKEN = "S".repeat(43);
const SYNTHETIC_RESUME_TEXT = [
  "Skills: TypeScript React testing PostgreSQL",
  "Projects: Built a typed interface with component tests and measurable performance improvement.",
  "Experience: Contributed reusable components with documented review checks.",
  "Education: Undergraduate computing programme",
].join("\n");

test("@proof-brief candidate creates, shares, and revokes a derived-only brief", async ({
  page,
  request,
}) => {
  await request.post(`${PROVIDER_ORIGIN}/__reset`);
  await seedPersona(request, ACCOUNT_A.id, "CANDIDATE");
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
    name: "synthetic-proof-brief.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Synthetic Proof Brief fixture"),
  });
  await page.getByRole("button", { name: "Analyze Resume" }).click();
  await expect(page).toHaveURL(/\/resume$/u);

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Proof Brief" })).toBeVisible();
  await expect(page.getByText("Never added automatically")).toBeVisible();
  await expect(page.getByText(/Raw resume text or file, email, phone/u)).toBeVisible();

  await request.post(`${PROVIDER_ORIGIN}/__proof-source-mode`, {
    data: { mode: "tampered" },
  });

  await page.getByRole("button", { name: "Create private Proof Brief" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Private Proof Brief ready. Nothing is shared yet.",
  );
  const privateBrief = await readStoredBrief(request);
  expect(privateBrief).toEqual(expect.objectContaining({
    user_id: ACCOUNT_A.id,
    visibility: "PRIVATE",
    share_token_hash: null,
  }));
  expect(privateBrief?.brief_payload.evidenceSignals.map(
    (signal: { label: string }) => signal.label,
  )).toEqual(["TypeScript"]);
  for (const forbidden of [
    "Jane Doe",
    "Acme Corp",
    "12 Main Street London",
    "+1 (555) 123-4567",
    "Synthetic University",
  ]) {
    expect(JSON.stringify(privateBrief)).not.toContain(forbidden);
  }

  await page.getByLabel(/anyone with the new link/u).check();
  await page.getByRole("button", { name: "Create link-only share" }).click();
  const linkField = page.getByLabel("Copy this link now");
  await expect(linkField).toHaveValue(/\/brief\/[A-Za-z0-9_-]{43}$/u);
  const shareUrl = await linkField.inputValue();
  const rawToken = shareUrl.split("/").at(-1);
  const stored = await readStoredBrief(request);
  expect(stored?.visibility).toBe("LINK_ONLY");
  expect(stored?.share_token_hash).toMatch(/^[0-9a-f]{64}$/u);
  expect(JSON.stringify(stored)).not.toContain(rawToken);

  await page.getByRole("button", { name: "Revoke link", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Link revoked. The brief is private again.",
  );
  expect((await readStoredBrief(request))?.visibility).toBe("PRIVATE");
  expect((await readStoredBrief(request))?.share_token_hash).toBeNull();
});

test("@proof-brief mutation API rejects untrusted request shapes without writing", async ({
  page,
  request,
}) => {
  await request.post(`${PROVIDER_ORIGIN}/__reset`);
  const body = {
    action: "create_or_refresh",
    sourceResumeAnalysisId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  };

  const loggedOut = await request.post(`${APP_ORIGIN}/api/proof-brief`, {
    headers: { Origin: APP_ORIGIN },
    data: body,
  });
  expect(loggedOut.status()).toBe(401);

  await seedPersona(request, ACCOUNT_A.id, "CANDIDATE");
  await login(page, ACCOUNT_A);
  const cases = [
    page.request.post(`${APP_ORIGIN}/api/proof-brief`, { data: body }),
    page.request.post(`${APP_ORIGIN}/api/proof-brief`, {
      headers: { Origin: "https://cross-origin.example" },
      data: body,
    }),
    page.request.post(`${APP_ORIGIN}/api/proof-brief`, {
      headers: { Origin: APP_ORIGIN, "Sec-Fetch-Site": "cross-site" },
      data: body,
    }),
    page.request.post(`${APP_ORIGIN}/api/proof-brief`, {
      headers: { Origin: APP_ORIGIN, "Content-Type": "text/plain" },
      data: JSON.stringify(body),
    }),
    page.request.post(`${APP_ORIGIN}/api/proof-brief`, {
      headers: { Origin: APP_ORIGIN, "Content-Type": "application/json" },
      data: JSON.stringify({ ...body, padding: "x".repeat(600) }),
    }),
    page.request.post(`${APP_ORIGIN}/api/proof-brief`, {
      headers: { Origin: APP_ORIGIN, "Content-Type": "application/json" },
      data: "{",
    }),
    page.request.post(`${APP_ORIGIN}/api/proof-brief`, {
      headers: { Origin: APP_ORIGIN },
      data: { ...body, brief_payload: { rawResume: "synthetic private payload" } },
    }),
  ];
  const responses = await Promise.all(cases);
  expect(responses.map((response) => response.status())).toEqual([
    403,
    403,
    403,
    415,
    413,
    400,
    400,
  ]);
  expect(await readStoredBrief(request)).toBeNull();
});

test("@proof-brief recruiter persona cannot use candidate Proof Brief API", async ({
  page,
  request,
}) => {
  await request.post(`${PROVIDER_ORIGIN}/__reset`);
  await seedPersona(request, ACCOUNT_A.id, "RECRUITER");
  await login(page, ACCOUNT_A);

  const read = await page.request.get(
    `${APP_ORIGIN}/api/proof-brief?source=dddddddd-dddd-4ddd-8ddd-dddddddddddd`,
  );
  expect(read.status()).toBe(403);
  expect(await read.json()).toEqual(expect.objectContaining({
    code: "candidate_persona_required",
  }));

  const mutation = await page.request.post(`${APP_ORIGIN}/api/proof-brief`, {
    headers: { Origin: APP_ORIGIN },
    data: {
      action: "create_or_refresh",
      sourceResumeAnalysisId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    },
  });
  expect(mutation.status()).toBe(403);
  expect(await mutation.json()).toEqual(expect.objectContaining({
    code: "candidate_persona_required",
  }));
  expect(await readStoredBrief(request)).toBeNull();
});

async function readStoredBrief(request: import("@playwright/test").APIRequestContext) {
  const response = await request.get(
    `${PROVIDER_ORIGIN}/__proof-brief?user=${encodeURIComponent(ACCOUNT_A.id)}`,
  );
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function seedPersona(
  request: import("@playwright/test").APIRequestContext,
  userId: string,
  persona: "CANDIDATE" | "RECRUITER",
) {
  const response = await request.post(`${PROVIDER_ORIGIN}/rest/v1/account_personas`, {
    data: { user_id: userId, persona },
  });
  expect(response.ok()).toBeTruthy();
}

test("@proof-brief public candidate-authorized brief is minimal and human-controlled", async ({
  page,
  request,
}) => {
  await request.post(`${PROVIDER_ORIGIN}/__reset`);
  const response = await page.goto(`/brief/${SHARED_TOKEN}`);
  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { level: 1, name: "What this resume currently supports" }),
  ).toBeVisible();
  await expect(page.getByText("Candidate-authorized · link only")).toBeVisible();
  await expect(page.getByText("No raw resume, email, phone, address", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Support states for human review" })).toBeVisible();
  await expect(page.getByText("Strong support", { exact: true })).toBeVisible();
  await expect(page.getByText("Unclear / missing support", { exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(
    /Recruiter Confidence|shortlist probability|hire probability|interview probability/iu,
  );

  await page.waitForTimeout(1_000);
  const counts = await request.get(`${PROVIDER_ORIGIN}/__requests`);
  expect(await counts.json()).toEqual({
    applicationRequests: 1,
    authUserRequests: 0,
  });

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    accessibility.violations.filter((violation) =>
      violation.impact === "critical" || violation.impact === "serious"
    ),
  ).toEqual([]);
});

test("@proof-brief malformed or absent share tokens fail closed", async ({
  page,
  request,
}) => {
  await request.post(`${PROVIDER_ORIGIN}/__reset`);
  const malformed = await page.goto("/brief/not-a-token");
  expect(malformed?.status()).toBe(404);
  expect(await (await request.get(`${PROVIDER_ORIGIN}/__requests`)).json()).toEqual({
    applicationRequests: 0,
    authUserRequests: 0,
  });

  await request.post(`${PROVIDER_ORIGIN}/__reset`);
  const absent = await page.goto(`/brief/${"Z".repeat(43)}`);
  expect(absent?.status()).toBe(404);
  expect(await (await request.get(`${PROVIDER_ORIGIN}/__requests`)).json()).toEqual({
    applicationRequests: 1,
    authUserRequests: 0,
  });
});
