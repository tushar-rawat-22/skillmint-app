import AxeBuilder from "@axe-core/playwright";
import type { BrowserContext } from "@playwright/test";

import { ACCOUNT_A, ACCOUNT_B, APP_ORIGIN, PROVIDER_ORIGIN, expect, login, test } from "./support/runtime";

const TOKEN = "S".repeat(43);
const SOURCE_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const JD = "Build accessible TypeScript and React interfaces, test changes, improve performance, review delivery trade-offs, and explain implementation outcomes with a small product team.";

test("@recruiter-evidence recruiter creates a role map and sends bounded candidate feedback", async ({ page, request }) => {
  await request.post(`${PROVIDER_ORIGIN}/__reset`);
  await request.post(`${PROVIDER_ORIGIN}/__seed-shared-proof-brief`);
  await seedPersona(request, ACCOUNT_B.id, "RECRUITER");
  await login(page, ACCOUNT_B);
  await page.goto("/recruiters/workspace");
  await expect(page.getByRole("heading", { name: /Translate one role description/u })).toBeVisible();
  await page.getByLabel("Role title").fill("Junior frontend contributor");
  await page.getByLabel("Job description").fill(JD);
  await page.getByRole("button", { name: "Create evidence map" }).click();
  await expect(page.getByRole("heading", { name: "Junior frontend contributor" })).toBeVisible();
  await expect(page.getByText("Applied role skills:")).toBeVisible();

  await page.goto(`/recruiters/review/${TOKEN}`);
  await expect(page.getByRole("heading", { name: "What evidence supports this candidate for this role?" })).toBeVisible();
  await page.getByLabel("Evidence question").selectOption("OWNERSHIP_CONTEXT");
  await page.getByRole("combobox", { name: "Structured feedback" }).selectOption("NEEDS_MORE_OWNERSHIP_CONTEXT");
  await page.getByLabel("Optional note").fill("Please add one concrete decision and its outcome.");
  await page.getByRole("button", { name: "Send structured feedback" }).click();
  await expect(page.getByRole("status")).toContainText("sent to the candidate");

  const stored = await request.get(`${PROVIDER_ORIGIN}/__candidate-reviews`).then((response) => response.json());
  expect(stored).toHaveLength(1);
  expect(stored[0]).toEqual(expect.objectContaining({
    user_id: ACCOUNT_A.id,
    role_title: "Junior frontend contributor",
    question_category: "OWNERSHIP_CONTEXT",
    feedback_category: "NEEDS_MORE_OWNERSHIP_CONTEXT",
  }));
  expect(stored[0]).not.toHaveProperty("recruiter_user_id");
  expect(JSON.stringify(stored[0])).not.toContain(JD);

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);

  await login(page, ACCOUNT_A);
  const candidateResult = await page.evaluate(async ({ source, expectedUserId }) => {
    const response = await fetch(`/api/recruiter-evidence?candidateSource=${source}&expectedUserId=${expectedUserId}`, { credentials: "same-origin" });
    return { status: response.status, body: await response.json() };
  }, { source: SOURCE_ID, expectedUserId: ACCOUNT_A.id });
  expect(candidateResult.status).toBe(200);
  expect(candidateResult.body.reviews).toHaveLength(1);
  expect(candidateResult.body.reviews[0].questionText).toContain("What part of the strongest example did you own");
});

test("@recruiter-evidence mutation boundaries fail closed without writing", async ({ page, request }) => {
  await request.post(`${PROVIDER_ORIGIN}/__reset`);
  await request.post(`${PROVIDER_ORIGIN}/__seed-shared-proof-brief`);
  const originHeaders = { origin: APP_ORIGIN, "content-type": "application/json", "sec-fetch-site": "same-origin" };
  const roleMutation = { action: "create_role_map", expectedUserId: ACCOUNT_B.id, roleTitle: "Frontend role", jobDescription: JD };
  const loggedOut = await request.post(`${APP_ORIGIN}/api/recruiter-evidence`, { headers: originHeaders, data: roleMutation });
  expect(loggedOut.status()).toBe(401);
  const crossOrigin = await request.post(`${APP_ORIGIN}/api/recruiter-evidence`, { headers: { ...originHeaders, origin: "https://cross-origin.invalid" }, data: roleMutation });
  expect(crossOrigin.status()).toBe(403);
  const missingOrigin = await request.post(`${APP_ORIGIN}/api/recruiter-evidence`, { headers: { "content-type": "application/json" }, data: roleMutation });
  expect(missingOrigin.status()).toBe(403);
  const crossSite = await request.post(`${APP_ORIGIN}/api/recruiter-evidence`, { headers: { ...originHeaders, "sec-fetch-site": "cross-site" }, data: roleMutation });
  expect(crossSite.status()).toBe(403);
  const wrongMedia = await request.post(`${APP_ORIGIN}/api/recruiter-evidence`, { headers: { ...originHeaders, "content-type": "text/plain" }, data: "{}" });
  expect(wrongMedia.status()).toBe(415);
  const oversized = await request.post(`${APP_ORIGIN}/api/recruiter-evidence`, { headers: originHeaders, data: { ...roleMutation, padding: "x".repeat(17_000) } });
  expect(oversized.status()).toBe(413);
  const malformed = await request.post(`${APP_ORIGIN}/api/recruiter-evidence`, { headers: originHeaders, data: "{" });
  expect(malformed.status()).toBe(400);

  await seedPersona(request, ACCOUNT_A.id, "CANDIDATE");
  await login(page, ACCOUNT_A);
  await page.goto("/recruiters/workspace");
  const removedPersonaMutation = await page.evaluate(async (expectedUserId) => fetch("/api/recruiter-evidence", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "set_persona", expectedUserId, persona: "RECRUITER" }) }).then((response) => response.status), ACCOUNT_A.id);
  expect(removedPersonaMutation).toBe(400);
  const staleOwner = await page.evaluate(async ({ jobDescription, expectedUserId }) => fetch("/api/recruiter-evidence", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "create_role_map", expectedUserId, roleTitle: "Frontend role", jobDescription }) }).then((response) => response.status), { jobDescription: JD, expectedUserId: ACCOUNT_B.id });
  expect(staleOwner).toBe(409);
  const forbiddenRole = await page.evaluate(async ({ jobDescription, expectedUserId }) => fetch("/api/recruiter-evidence", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "create_role_map", expectedUserId, roleTitle: "Frontend role", jobDescription }) }).then((response) => response.status), { jobDescription: JD, expectedUserId: ACCOUNT_A.id });
  expect(forbiddenRole).toBe(403);
  const stored = await request.get(`${PROVIDER_ORIGIN}/__candidate-reviews`).then((response) => response.json());
  expect(stored).toEqual([]);
});

test("@recruiter-evidence revoked and replaced links reject new feedback", async ({ page, request }) => {
  for (const control of ["__revoke-shared-proof-brief", "__replace-shared-proof-brief"]) {
    await request.post(`${PROVIDER_ORIGIN}/__reset`);
    await request.post(`${PROVIDER_ORIGIN}/__seed-shared-proof-brief`);
    await request.post(`${PROVIDER_ORIGIN}/__seed-recruiter-context`, { data: { userId: ACCOUNT_B.id, roleTitle: "Revocation test role" } });
    await login(page, ACCOUNT_B);
    const roleMapId = await request.post(`${PROVIDER_ORIGIN}/__seed-recruiter-context`, { data: { userId: ACCOUNT_B.id, roleTitle: "Revocation test role" } }).then((response) => response.json()).then((body) => body.roleMapId as string);
    await request.post(`${PROVIDER_ORIGIN}/${control}`);
    const result = await page.evaluate(async ({ expectedUserId, roleMapId }) => fetch("/api/recruiter-evidence", {
      method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "submit_review", expectedUserId, shareToken: "S".repeat(43), roleMapId, questionCategory: "OWNERSHIP_CONTEXT", evidenceLabel: null, feedbackCategory: "NEEDS_MORE_OWNERSHIP_CONTEXT", reviewEase: "EASIER", reviewTimeSignal: "NOT_SURE", note: null }),
    }).then((response) => response.status), { expectedUserId: ACCOUNT_B.id, roleMapId });
    expect(result).toBe(404);
    const stored = await request.get(`${PROVIDER_ORIGIN}/__candidate-reviews`).then((response) => response.json());
    expect(stored).toEqual([]);
  }
});

test("@recruiter-evidence account transitions never render or mutate a stale recruiter workspace", async ({ page, context, request }) => {
  await request.post(`${PROVIDER_ORIGIN}/__reset`);
  await request.post(`${PROVIDER_ORIGIN}/__seed-shared-proof-brief`);
  await request.post(`${PROVIDER_ORIGIN}/__seed-recruiter-context`, { data: { userId: ACCOUNT_A.id, roleTitle: "Account A evidence role" } });
  await request.post(`${PROVIDER_ORIGIN}/__seed-recruiter-context`, { data: { userId: ACCOUNT_B.id, roleTitle: "Account B private evidence role" } });
  await login(page, ACCOUNT_A);
  await page.goto("/recruiters/workspace");
  await expect(page.getByRole("heading", { name: "Account A evidence role" })).toBeVisible();

  await switchRecruiterAccount(context, ACCOUNT_B);
  await expect(page.getByRole("heading", { name: "Account B private evidence role" })).toBeVisible();
  await expect(page.getByText("Account A evidence role")).toHaveCount(0);
  await switchRecruiterAccount(context, ACCOUNT_A);
  await expect(page.getByRole("heading", { name: "Account A evidence role" })).toBeVisible();
  await expect(page.getByText("Account B private evidence role")).toHaveCount(0);

  let releaseDelayedAccountB = () => {};
  const delayedAccountB = new Promise<void>((resolve) => { releaseDelayedAccountB = resolve; });
  let accountBRequestHeld = false;
  await page.route("**/api/recruiter-evidence?*", async (route) => {
    const requestedOwner = new URL(route.request().url()).searchParams.get("expectedUserId");
    if (requestedOwner === ACCOUNT_B.id && !accountBRequestHeld) {
      accountBRequestHeld = true;
      await delayedAccountB;
    }
    try { await route.continue(); } catch { /* The owner transition may abort the stale request first. */ }
  });
  await switchRecruiterAccount(context, ACCOUNT_B);
  await expect.poll(() => accountBRequestHeld).toBe(true);
  await switchRecruiterAccount(context, ACCOUNT_A);
  await expect(page.getByRole("heading", { name: "Account A evidence role" })).toBeVisible();
  releaseDelayedAccountB();
  await expect(page.getByText("Account B private evidence role")).toHaveCount(0);

  const staleMutation = await page.evaluate(async ({ jobDescription, expectedUserId }) => fetch("/api/recruiter-evidence", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "create_role_map", expectedUserId, roleTitle: "Stale account role", jobDescription }) }).then((response) => response.status), { jobDescription: JD, expectedUserId: ACCOUNT_B.id });
  expect(staleMutation).toBe(409);

  await page.unroute("**/api/recruiter-evidence?*");
  await page.goto(`/recruiters/review/${TOKEN}`);
  await expect(page.getByLabel("Role evidence map")).toContainText("Account A evidence role");
  await switchRecruiterAccount(context, ACCOUNT_B);
  await expect(page.getByLabel("Role evidence map")).toContainText("Account B private evidence role");
  await expect(page.getByLabel("Role evidence map")).not.toContainText("Account A evidence role");
  await switchRecruiterAccount(context, ACCOUNT_A);
  await expect(page.getByLabel("Role evidence map")).toContainText("Account A evidence role");
  await expect(page.getByLabel("Role evidence map")).not.toContainText("Account B private evidence role");
});

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

async function switchRecruiterAccount(context: BrowserContext, account: typeof ACCOUNT_A) {
  const controlPage = await context.newPage();
  await login(controlPage, account);
  await controlPage.close();
}
