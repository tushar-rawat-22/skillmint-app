import type { Page, Route } from "@playwright/test";

import {
  ACCOUNT_A,
  APP_ORIGIN,
  expiredSessionCookie,
  expect,
  login,
  ownerContainer,
  test,
} from "./support/runtime";

type CapturedAnalyticsEvent = Record<string, unknown> & {
  event_name: string;
  owner_mode: string;
  properties: Record<string, unknown>;
};

const ROADMAP_ANALYSIS = {
  fileName: "synthetic-roadmap.txt",
  fileType: "txt",
  fileSize: 512,
  extractedText: "React TypeScript accessibility project with measurable impact.",
  parsedProfile: {
    skills: ["react", "typescript", "accessibility"],
    projects: ["Built an accessible product interface"],
    education: ["B.Tech Computer Science"],
    experience: ["Frontend engineering internship"],
    certifications: [],
    links: {},
    rawSections: {},
  },
  userProfile: {
    resumeScore: 72,
    skillsScore: 75,
    projectsScore: 68,
    experienceScore: 55,
    educationScore: 70,
    githubScore: 40,
    linkedinScore: 30,
    atsScore: 70,
    recruiterScore: 65,
    activityScore: 50,
    skills: ["react", "typescript", "javascript", "html", "css", "accessibility"],
    projects: ["Accessible SkillMint interface"],
    experience: ["Frontend engineering internship"],
    education: "B.Tech Computer Science",
    certifications: [],
    codingProfiles: [],
  },
  analyzedAt: "2026-07-22T08:00:00.000Z",
  status: "completed",
};

async function captureAnalytics(page: Page) {
  const events: CapturedAnalyticsEvent[] = [];
  const requests: Array<{ url: string; method: string; headers: Record<string, string> }> = [];
  await page.route("**/api/analytics/events", async (route) => {
    const request = route.request();
    requests.push({
      url: request.url(),
      method: request.method(),
      headers: request.headers(),
    });
    events.push(request.postDataJSON() as CapturedAnalyticsEvent);
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, code: "accepted" }),
    });
  });
  return { events, requests };
}

async function openFeedback(page: Page, message: string) {
  await page.getByRole("button", { name: "Feedback", exact: true }).click();
  await page.getByPlaceholder("What felt broken, confusing, or useful?").fill(message);
  return page.getByRole("button", { name: "Send feedback" });
}

test("@critical analytics ignores invalid setup and emits one content-free anonymous action", async ({ page }) => {
  const capture = await captureAnalytics(page);
  await page.goto("/setup");

  await page.getByRole("button", { name: "Save direction" }).click();
  await expect(page.getByText(/add a target role/i)).toBeVisible();
  expect(capture.events).toHaveLength(0);

  const privateRole = "Synthetic Private Role Name";
  await page.getByLabel("Your career direction").fill(privateRole);
  await page.getByRole("button", { name: "Save direction" }).click();
  await expect.poll(() => capture.events.length).toBe(1);

  const [event] = capture.events;
  expect(event.event_name).toBe("career_setup_started");
  expect(event.owner_mode).toBe("anonymous");
  expect(event.properties).toEqual({ setup_mode: "create" });
  expect(JSON.stringify(event)).not.toContain(privateRole);
  expect(capture.requests[0]).toMatchObject({
    url: `${APP_ORIGIN}/api/analytics/events`,
    method: "POST",
  });
  expect(capture.requests[0].headers["content-type"]).toBe("application/json");
  expect(capture.requests[0].headers.authorization).toBeUndefined();
});

test("@critical anonymous feedback emits once without feedback content or an Auth user lookup", async ({ page, provider }) => {
  const capture = await captureAnalytics(page);
  await page.goto("/settings/data");
  const authUserBefore = provider.count("auth:user");
  const privateFeedback = "Synthetic private feedback body must never enter analytics";
  const submit = await openFeedback(page, privateFeedback);
  await submit.click();
  await expect(page.getByRole("status").filter({ hasText: /saved in this browser/i })).toBeVisible();
  await expect.poll(() => capture.events.length).toBe(1);

  const [event] = capture.events;
  expect(event.event_name).toBe("feedback_persisted");
  expect(event.owner_mode).toBe("anonymous");
  expect(event.source_screen).toBe("data_controls");
  expect(event.properties).toEqual({
    persistence_path: "browser",
    feedback_type: "bug",
  });
  expect(JSON.stringify(event)).not.toContain(privateFeedback);
  expect(provider.count("auth:user")).toBe(authUserBefore);
});

test("@critical account analytics contains only owner mode and never the account identifier", async ({ page }) => {
  const capture = await captureAnalytics(page);
  await login(page, ACCOUNT_A);
  await page.goto("/settings/data");
  const submit = await openFeedback(page, "Synthetic account feedback content");
  await submit.click();
  await expect(page.getByRole("status").filter({ hasText: /saved to your account/i })).toBeVisible();
  await expect.poll(() => capture.events.length).toBe(1);

  const [event] = capture.events;
  expect(event.event_name).toBe("feedback_persisted");
  expect(event.owner_mode).toBe("account");
  expect(event.properties).toEqual({
    persistence_path: "account",
    feedback_type: "bug",
  });
  const serialized = JSON.stringify(event);
  expect(serialized).not.toContain(ACCOUNT_A.id);
  expect(serialized).not.toContain(ACCOUNT_A.email);
  expect(serialized).not.toContain("Synthetic account feedback content");
});

test("@critical analytics transport failure never blocks the authoritative product workflow", async ({ page }) => {
  let analyticsRequests = 0;
  await page.route("**/api/analytics/events", async (route: Route) => {
    analyticsRequests += 1;
    await route.abort("connectionfailed");
  });
  await page.goto("/settings/data");
  const submit = await openFeedback(page, "Persist despite analytics transport failure");
  await submit.click();

  await expect(page.getByRole("status").filter({ hasText: /saved in this browser/i })).toBeVisible();
  await expect.poll(() => analyticsRequests).toBe(1);
  const stored = await page.evaluate(() => localStorage.getItem("skillmint:beta-feedback"));
  expect(stored).toContain("Persist despite analytics transport failure");
});

test("@critical roadmap waits for resolved Auth before consuming its one-event lifecycle marker", async ({ page, context, provider }) => {
  const capture = await captureAnalytics(page);
  const [authGate] = provider.holdNext("auth:refresh");
  await context.addCookies([expiredSessionCookie(ACCOUNT_A)]);
  const storedAnalysis = ownerContainer({
    accounts: { [ACCOUNT_A.id]: ROADMAP_ANALYSIS },
  });
  await page.addInitScript((raw) => {
    localStorage.setItem("skillmint:resume-analysis", raw);
  }, storedAnalysis);

  await page.goto("/roadmap");
  await provider.waitFor("auth:refresh", 1, ACCOUNT_A.id);
  expect(capture.events).toHaveLength(0);

  authGate.release();
  await expect(page.getByText("Career Path Engine", { exact: true })).toBeVisible();
  await expect.poll(() => capture.events.length).toBe(1);
  expect(capture.events[0]).toMatchObject({
    event_name: "roadmap_reached",
    owner_mode: "account",
    source_screen: "roadmap",
    properties: { path_source: "profile_fit" },
  });

  await page.evaluate(() => {
    window.dispatchEvent(new Event("skillmint:workspace-updated"));
    window.dispatchEvent(new Event("storage"));
  });
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  expect(capture.events).toHaveLength(1);
});
