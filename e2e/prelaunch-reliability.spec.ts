import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { cpus, freemem, platform, release, totalmem } from "node:os";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";

import {
  expect,
  test,
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  type Page,
  type Request,
} from "@playwright/test";

import {
  ACCOUNT_A,
  ACCOUNT_B,
  APP_ORIGIN,
  login,
  PROVIDER_ORIGIN,
  SyntheticProvider,
} from "./support/runtime";

const SHARED_TOKEN = "S".repeat(43);
const SOURCE_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const JD = "Build accessible TypeScript and React interfaces, test changes, improve performance, review delivery trade-offs, and explain implementation outcomes with a small product team.";
const AVERAGE_ITERATIONS = positiveInteger(
  process.env.SKILLMINT_RELIABILITY_AVERAGE_ITERATIONS,
  5,
);
const STAGE = process.env.SKILLMINT_RELIABILITY_STAGE ?? "smoke";

if (STAGE !== "smoke" && STAGE !== "average") {
  throw new Error("SKILLMINT_RELIABILITY_STAGE must be smoke or average");
}

type Stage = "smoke" | "average";
type Sample = {
  readonly kind: "request" | "step";
  readonly journey: string;
  readonly label: string;
  readonly method?: string;
  readonly path?: string;
  readonly status?: number;
  readonly expected: boolean;
  readonly durationMs: number;
};
type ErrorRecord = {
  readonly classification: string;
  readonly journey: string;
  readonly detail: string;
};
type ObservedContext = {
  readonly context: BrowserContext;
  readonly page: Page;
  readonly provider: SyntheticProvider;
  readonly stopObserving: () => void;
};

class Recorder {
  readonly samples: Sample[] = [];
  readonly errors: ErrorRecord[] = [];
  readonly correctness = new Map<string, boolean>();
  readonly requestStarts = new WeakMap<Request, number>();
  readonly expectedResponses = new Map<string, number[]>();
  peakHarnessRssBytes = process.memoryUsage().rss;

  sample(sample: Sample) {
    this.samples.push({ ...sample, durationMs: round(sample.durationMs) });
    this.peakHarnessRssBytes = Math.max(
      this.peakHarnessRssBytes,
      process.memoryUsage().rss,
    );
  }

  error(error: ErrorRecord) {
    this.errors.push(error);
  }

  pass(name: string) {
    this.correctness.set(name, true);
  }

  fail(name: string) {
    this.correctness.set(name, false);
  }

  expectResponse(method: string, path: string, status: number) {
    const key = `${method} ${normalizePath(path)}`;
    this.expectedResponses.set(key, [
      ...(this.expectedResponses.get(key) ?? []),
      status,
    ]);
  }

  consumeExpectedResponse(method: string, path: string) {
    const key = `${method} ${normalizePath(path)}`;
    const queue = this.expectedResponses.get(key);
    const status = queue?.shift();
    if (queue?.length === 0) this.expectedResponses.delete(key);
    return status;
  }
}

test(`@reliability ${STAGE} prelaunch reliability baseline`, async ({
  browser,
  request,
}, testInfo) => {
  const stage = STAGE as Stage;
  const recorder = new Recorder();
  const startedAt = new Date();
  const started = performance.now();
  const contexts: ObservedContext[] = [];
  const git = gitIdentity();
  let verdict: "PASS" | "ABORTED" = "ABORTED";
  let recovery: { status: number; durationMs: number } | null = null;

  test.skip(
    testInfo.project.name !== "chromium",
    "The reliability baseline is intentionally pinned to one local Chromium target.",
  );
  assertLoopback(APP_ORIGIN);
  assertLoopback(PROVIDER_ORIGIN);
  if (git.dirty && process.env.SKILLMINT_RELIABILITY_ALLOW_DIRTY !== "true") {
    throw new Error(
      "Refusing certification from a dirty worktree. Commit the harness or set SKILLMINT_RELIABILITY_ALLOW_DIRTY=true for a non-certifying development run.",
    );
  }

  try {
    await resetAndSeed(request);
    await warmTarget(request, recorder);

    if (stage === "smoke") {
      await runSmoke(browser, request, recorder, contexts);
    } else {
      await runAverage(browser, request, recorder, contexts);
    }

    recovery = await recoveryProbe(request, recorder);
    expect(recovery.status).toBe(200);
    expect(recovery.durationMs).toBeLessThanOrEqual(4_000);
    recorder.pass("returned_to_single_vu_baseline");

    expect(recorder.errors, "classified reliability errors").toEqual([]);
    expect(
      [...recorder.correctness.entries()].filter(([, passed]) => !passed),
      "correctness gates",
    ).toEqual([]);
    verdict = "PASS";
  } catch (error) {
    recorder.error({
      classification: "stage_abort",
      journey: "stage",
      detail: sanitizeError(error),
    });
    throw error;
  } finally {
    contexts.forEach(({ stopObserving }) => stopObserving());
    await Promise.allSettled(
      contexts.map(({ context }) => context.close()),
    );
    const endedAt = new Date();
    const evidence = buildEvidence({
      stage,
      git,
      recorder,
      startedAt,
      endedAt,
      durationMs: performance.now() - started,
      recovery,
      verdict,
    });
    const evidencePath = resolve(
      "test-results",
      "prelaunch-reliability",
      `${git.sha}-${stage}.json`,
    );
    mkdirSync(resolve(evidencePath, ".."), { recursive: true });
    writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
    await testInfo.attach(`prelaunch-reliability-${stage}`, {
      body: Buffer.from(`${JSON.stringify(evidence, null, 2)}\n`),
      contentType: "application/json",
    });
    process.stdout.write(`RELIABILITY_EVIDENCE=${evidencePath}\n`);
    process.stdout.write(`${JSON.stringify(evidence.summary)}\n`);
  }
});

async function runSmoke(
  browser: Browser,
  request: APIRequestContext,
  recorder: Recorder,
  contexts: ObservedContext[],
) {
  const publicContext = await observedContext(browser, "public", recorder);
  contexts.push(publicContext);
  await publicJourney(publicContext.page, recorder, 1);
  publicContext.stopObserving();
  await publicContext.context.close();
  contexts.splice(contexts.indexOf(publicContext), 1);

  const candidateContext = await observedContext(browser, "candidate", recorder);
  contexts.push(candidateContext);
  await candidateSetupAndCorrectness(candidateContext, recorder);
  await candidateReadLoop(candidateContext.page, recorder, 1);
  candidateContext.stopObserving();
  await candidateContext.context.close();
  contexts.splice(contexts.indexOf(candidateContext), 1);

  const recruiterContext = await observedContext(browser, "recruiter", recorder);
  contexts.push(recruiterContext);
  await recruiterSetupAndCorrectness(recruiterContext, request, recorder);
  await recruiterReadLoop(recruiterContext.page, recorder, 1);
  recruiterContext.stopObserving();
  await recruiterContext.context.close();
  contexts.splice(contexts.indexOf(recruiterContext), 1);

  await revokeAndRecover(request, browser, recorder, contexts);
}

async function runAverage(
  browser: Browser,
  request: APIRequestContext,
  recorder: Recorder,
  contexts: ObservedContext[],
) {
  const publicContext = await observedContext(browser, "public", recorder);
  const candidateContext = await observedContext(browser, "candidate", recorder);
  const recruiterContext = await observedContext(browser, "recruiter", recorder);
  contexts.push(publicContext, candidateContext, recruiterContext);

  await candidateSetupAndCorrectness(candidateContext, recorder);
  await recruiterSetupAndCorrectness(recruiterContext, request, recorder);

  await Promise.all([
    publicJourney(publicContext.page, recorder, AVERAGE_ITERATIONS),
    candidateReadLoop(candidateContext.page, recorder, AVERAGE_ITERATIONS),
    recruiterReadLoop(recruiterContext.page, recorder, AVERAGE_ITERATIONS),
  ]);

  await revokeAndRecover(request, browser, recorder, contexts);
}

async function resetAndSeed(request: APIRequestContext) {
  expect((await request.post(`${PROVIDER_ORIGIN}/__reset`)).ok()).toBeTruthy();
  expect((await request.post(`${PROVIDER_ORIGIN}/rest/v1/account_personas`, {
    data: { user_id: ACCOUNT_A.id, persona: "CANDIDATE" },
  })).ok()).toBeTruthy();
  expect((await request.post(`${PROVIDER_ORIGIN}/__seed-shared-proof-brief`)).ok()).toBeTruthy();
  expect((await request.post(`${PROVIDER_ORIGIN}/__seed-recruiter-context`, {
    data: {
      userId: ACCOUNT_B.id,
      roleTitle: "Reliability baseline role",
      jobDescription: JD,
    },
  })).ok()).toBeTruthy();
}

async function warmTarget(request: APIRequestContext, recorder: Recorder) {
  const started = performance.now();
  const response = await request.get(`${APP_ORIGIN}/support`);
  recorder.sample({
    kind: "step",
    journey: "preflight",
    label: "warm_target",
    status: response.status(),
    expected: response.status() === 200,
    durationMs: performance.now() - started,
  });
  expect(response.status()).toBe(200);
  recorder.pass("isolated_target_reachable");
}

async function observedContext(
  browser: Browser,
  journey: string,
  recorder: Recorder,
): Promise<ObservedContext> {
  const context = await browser.newContext();
  const provider = new SyntheticProvider();
  await provider.install(context);
  const page = await context.newPage();
  let observing = true;
  page.on("request", (request) => {
    if (!observing) return;
    if (isObservedApplicationRequest(request)) {
      recorder.requestStarts.set(request, performance.now());
    }
  });
  page.on("response", (response) => {
    if (!observing) return;
    const request = response.request();
    const requestStarted = recorder.requestStarts.get(request);
    if (requestStarted === undefined || !isObservedApplicationRequest(request)) return;
    const status = response.status();
    const path = normalizePath(new URL(request.url()).pathname);
    const expectedStatus = recorder.consumeExpectedResponse(request.method(), path);
    const expected = expectedStatus === undefined
      ? status < 400
      : status === expectedStatus;
    recorder.sample({
      kind: "request",
      journey,
      label: `${request.method()} ${path}`,
      method: request.method(),
      path,
      status,
      expected,
      durationMs: performance.now() - requestStarted,
    });
    if (!expected && status >= 500) {
      recorder.error({
        classification: "server_error",
        journey,
        detail: `${request.method()} ${normalizePath(new URL(request.url()).pathname)} returned ${status}`,
      });
    } else if (!expected && status >= 400) {
      recorder.error({
        classification: "unexpected_client_error",
        journey,
        detail: `${request.method()} ${normalizePath(new URL(request.url()).pathname)} returned ${status}`,
      });
    }
  });
  page.on("requestfailed", (request) => {
    if (!observing) return;
    if (!isObservedApplicationRequest(request)) return;
    recorder.error({
      classification: "transport_error",
      journey,
      detail: `${request.method()} ${normalizePath(new URL(request.url()).pathname)} failed`,
    });
  });
  page.on("pageerror", (error) => {
    if (!observing) return;
    recorder.error({
      classification: "browser_page_error",
      journey,
      detail: sanitizeError(error),
    });
  });
  page.on("console", (message) => {
    if (!observing) return;
    if (message.type() !== "error") return;
    if (/^Failed to load resource: the server responded with a status of/iu.test(message.text())) {
      return;
    }
    recorder.error({
      classification: "browser_console_error",
      journey,
      detail: sanitizeText(message.text()),
    });
  });
  return { context, page, provider, stopObserving: () => { observing = false; } };
}

async function publicJourney(page: Page, recorder: Recorder, iterations: number) {
  const pages = ["/", "/candidates", "/recruiters", "/privacy", "/support"];
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (const path of pages) {
      await navigate(page, recorder, "public", `read ${path}`, path);
      await expect(page.locator("main")).toBeVisible();
    }
    await navigate(
      page,
      recorder,
      "public",
      "read candidate-authorized brief",
      `/brief/${SHARED_TOKEN}`,
    );
    await expect(page.getByText("Candidate-authorized · link only")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(
      /account-a@example\.test|11111111-1111-4111-8111-111111111111|Synthetic controlled-beta resume fixture/iu,
    );
  }
  recorder.pass("public_pages_and_shared_brief_are_safe");
}

async function candidateSetupAndCorrectness(
  observed: ObservedContext,
  recorder: Recorder,
) {
  const { page, provider } = observed;
  await step(recorder, "candidate", "login", async () => login(page, ACCOUNT_A));
  await navigate(page, recorder, "candidate", "open upload", "/upload");
  await page.locator("#resume-file-upload").setInputFiles({
    name: "reliability-candidate.txt",
    mimeType: "text/plain",
    buffer: Buffer.from([
      "Skills: TypeScript React testing PostgreSQL accessibility",
      "Projects: Built an accessible typed interface with automated tests and measured performance improvements.",
      "Experience: Documented review checks and delivery trade-offs.",
      "Education: Undergraduate computing programme",
    ].join("\n")),
  });
  await step(recorder, "candidate", "analyze synthetic resume", async () => {
    await page.getByRole("button", { name: "Analyze Resume" }).click();
    await expect(page).toHaveURL(/\/resume$/u);
    await page.waitForLoadState("networkidle");
  });
  await expect(page.getByText(/account-b@example\.test/iu)).toHaveCount(0);
  const wrongOwnerStatus = await measuredFetch(
    page,
    recorder,
    "candidate",
    "wrong-owner recruiter read",
    `/api/recruiter-evidence?expectedUserId=${ACCOUNT_B.id}`,
    { expectedStatus: 409 },
  );
  expect(wrongOwnerStatus).toBe(409);
  const forbiddenRecruiterMutation = await measuredFetch(
    page,
    recorder,
    "candidate",
    "candidate denied recruiter mutation",
    "/api/recruiter-evidence",
    {
      method: "POST",
      body: {
        action: "create_role_map",
        expectedUserId: ACCOUNT_A.id,
        roleTitle: "Forbidden recruiter role",
        jobDescription: JD,
      },
      expectedStatus: 403,
    },
  );
  expect(forbiddenRecruiterMutation).toBe(403);
  expect(provider.unexpectedRequests).toEqual([]);
  recorder.pass("candidate_owner_and_persona_isolation");
  recorder.pass("synthetic_resume_analysis_completed");
}

async function candidateReadLoop(page: Page, recorder: Recorder, iterations: number) {
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    await navigate(page, recorder, "candidate", "read dashboard", "/dashboard");
    await expect(page.locator("main")).toBeVisible();
    await navigate(page, recorder, "candidate", "read resume reality", "/resume");
    await expect(page.locator("main")).toBeVisible();
    await navigate(page, recorder, "candidate", "read job match", "/ats");
    await expect(page.locator("main")).toBeVisible();
  }
}

async function recruiterSetupAndCorrectness(
  observed: ObservedContext,
  request: APIRequestContext,
  recorder: Recorder,
) {
  const { page, provider } = observed;
  await step(recorder, "recruiter", "login", async () => login(page, ACCOUNT_B));
  await expect(page.getByRole("heading", { name: "Reliability baseline role" })).toBeVisible();
  const proofBriefStatus = await measuredFetch(
    page,
    recorder,
    "recruiter",
    "recruiter denied candidate Proof Brief API",
    `/api/proof-brief?source=${SOURCE_ID}`,
    { expectedStatus: 403 },
  );
  expect(proofBriefStatus).toBe(403);

  const roleMapId = await request
    .post(`${PROVIDER_ORIGIN}/__seed-recruiter-context`, {
      data: { userId: ACCOUNT_B.id, roleTitle: "Reliability idempotency role", jobDescription: JD },
    })
    .then((response) => response.json())
    .then((body) => body.roleMapId as string);
  const review = {
    action: "submit_review",
    expectedUserId: ACCOUNT_B.id,
    shareToken: SHARED_TOKEN,
    roleMapId,
    questionCategory: "OWNERSHIP_CONTEXT",
    evidenceLabel: null,
    feedbackCategory: "NEEDS_MORE_OWNERSHIP_CONTEXT",
    reviewEase: "EASIER",
    reviewTimeSignal: "NOT_SURE",
    note: "Synthetic retry and idempotency probe.",
  };
  const first = await measuredFetch(page, recorder, "recruiter", "submit review", "/api/recruiter-evidence", {
    method: "POST",
    body: review,
    expectedStatus: 201,
  });
  const retry = await measuredFetch(page, recorder, "recruiter", "retry same review", "/api/recruiter-evidence", {
    method: "POST",
    body: review,
    expectedStatus: 409,
  });
  expect([first, retry]).toEqual([201, 409]);
  const stored = await request
    .get(`${PROVIDER_ORIGIN}/__candidate-reviews`)
    .then((response) => response.json());
  expect(stored).toHaveLength(1);
  expect(stored[0]).not.toHaveProperty("recruiter_user_id");
  expect(JSON.stringify(stored[0])).not.toContain(JD);
  expect(provider.unexpectedRequests).toEqual([]);
  recorder.pass("recruiter_denied_candidate_authority");
  recorder.pass("retry_has_no_duplicate_effect");
}

async function recruiterReadLoop(page: Page, recorder: Recorder, iterations: number) {
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    await navigate(page, recorder, "recruiter", "read recruiter workspace", "/recruiters/workspace");
    await expect(page.getByRole("heading", { name: /Reliability/iu }).first()).toBeVisible();
    await navigate(page, recorder, "recruiter", "read authorized brief", `/brief/${SHARED_TOKEN}`);
    await expect(page.getByText("Candidate-authorized · link only")).toBeVisible();
    await navigate(page, recorder, "recruiter", "read review workflow", `/recruiters/review/${SHARED_TOKEN}`);
    await expect(page.getByRole("heading", { name: "What evidence supports this candidate for this role?" })).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/account-a@example\.test/iu);
  }
  recorder.pass("recruiter_reads_only_authorized_derived_evidence");
}

async function revokeAndRecover(
  request: APIRequestContext,
  browser: Browser,
  recorder: Recorder,
  contexts: ObservedContext[],
) {
  expect((await request.post(`${PROVIDER_ORIGIN}/__revoke-shared-proof-brief`)).ok()).toBeTruthy();
  const probe = await observedContext(browser, "recovery", recorder);
  contexts.push(probe);
  recorder.expectResponse("GET", "/brief/:token", 404);
  const revoked = await step(recorder, "recovery", "revoked brief rejects access", async () =>
    probe.page.goto(`/brief/${SHARED_TOKEN}`, { waitUntil: "domcontentloaded" }),
  );
  expect(revoked?.status()).toBe(404);
  expect((await request.post(`${PROVIDER_ORIGIN}/__seed-shared-proof-brief`)).ok()).toBeTruthy();
  const restored = await step(recorder, "recovery", "provider fixture recovers", async () =>
    probe.page.goto(`/brief/${SHARED_TOKEN}`, { waitUntil: "domcontentloaded" }),
  );
  expect(restored?.status()).toBe(200);
  await expect(probe.page.getByText("Candidate-authorized · link only")).toBeVisible();
  recorder.pass("revocation_fails_closed_and_fixture_recovers");
  probe.stopObserving();
  await probe.context.close();
  contexts.splice(contexts.indexOf(probe), 1);
}

async function recoveryProbe(request: APIRequestContext, recorder: Recorder) {
  const started = performance.now();
  const response = await request.get(`${APP_ORIGIN}/support`);
  const durationMs = round(performance.now() - started);
  recorder.sample({
    kind: "step",
    journey: "recovery",
    label: "single-vu support probe",
    status: response.status(),
    expected: response.status() === 200,
    durationMs,
  });
  return { status: response.status(), durationMs };
}

async function navigate(
  page: Page,
  recorder: Recorder,
  journey: string,
  label: string,
  path: string,
) {
  const response = await step(recorder, journey, label, async () => {
    const result = await page.goto(path, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    return result;
  });
  expect(response?.status(), `${label} status`).toBe(200);
  return response;
}

async function measuredFetch(
  page: Page,
  recorder: Recorder,
  journey: string,
  label: string,
  path: string,
  options: {
    readonly method?: "GET" | "POST";
    readonly body?: unknown;
    readonly expectedStatus: number;
  },
) {
  const started = performance.now();
  recorder.expectResponse(
    options.method ?? "GET",
    normalizePath(path.split("?", 1)[0]),
    options.expectedStatus,
  );
  const result = await page.evaluate(async ({ path: requestPath, method, body }) => {
    const response = await fetch(requestPath, {
      method,
      credentials: "same-origin",
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    await response.text();
    return { status: response.status };
  }, { path, method: options.method ?? "GET", body: options.body });
  recorder.sample({
    kind: "step",
    journey,
    label,
    method: options.method ?? "GET",
    path: normalizePath(path.split("?", 1)[0]),
    status: result.status,
    expected: result.status === options.expectedStatus,
    durationMs: performance.now() - started,
  });
  if (result.status !== options.expectedStatus) {
    recorder.fail(label);
  } else {
    recorder.pass(label);
  }
  return result.status;
}

async function step<T>(
  recorder: Recorder,
  journey: string,
  label: string,
  operation: () => Promise<T>,
): Promise<T> {
  const started = performance.now();
  try {
    const result = await operation();
    recorder.sample({
      kind: "step",
      journey,
      label,
      expected: true,
      durationMs: performance.now() - started,
    });
    return result;
  } catch (error) {
    recorder.sample({
      kind: "step",
      journey,
      label,
      expected: false,
      durationMs: performance.now() - started,
    });
    recorder.error({
      classification: "journey_failure",
      journey,
      detail: `${label}: ${sanitizeError(error)}`,
    });
    throw error;
  }
}

function buildEvidence(input: {
  readonly stage: Stage;
  readonly git: ReturnType<typeof gitIdentity>;
  readonly recorder: Recorder;
  readonly startedAt: Date;
  readonly endedAt: Date;
  readonly durationMs: number;
  readonly recovery: { status: number; durationMs: number } | null;
  readonly verdict: "PASS" | "ABORTED";
}) {
  const measured = input.recorder.samples.filter((sample) => sample.journey !== "preflight");
  const requestSamples = measured.filter((sample) => sample.kind === "request");
  const unexpected = measured.filter((sample) => !sample.expected);
  const serverErrors = measured.filter((sample) => (sample.status ?? 0) >= 500);
  const byJourney = Object.fromEntries(
    [...new Set(measured.map((sample) => sample.journey))].sort().map((journey) => {
      const durations = measured
        .filter((sample) => sample.journey === journey)
        .map((sample) => sample.durationMs);
      return [journey, summarize(durations)];
    }),
  );
  const summary = {
    verdict: input.verdict,
    stage: input.stage,
    sha: input.git.sha,
    dirty: input.git.dirty,
    virtualUsers: input.stage === "smoke" ? 1 : 3,
    journeyIterations: input.stage === "smoke" ? 1 : AVERAGE_ITERATIONS,
    measuredSamples: measured.length,
    measuredRequests: requestSamples.length,
    p50Ms: summarize(measured.map((sample) => sample.durationMs)).p50Ms,
    p95Ms: summarize(measured.map((sample) => sample.durationMs)).p95Ms,
    p99Ms: summarize(measured.map((sample) => sample.durationMs)).p99Ms,
    unexpectedErrors: unexpected.length + input.recorder.errors.length,
    serverErrors: serverErrors.length,
  };
  return {
    schemaVersion: 1,
    summary,
    identity: input.git,
    environment: {
      target: "isolated loopback production build",
      appOrigin: APP_ORIGIN,
      provider: "repository synthetic Auth/PostgREST server",
      analytics: "disabled",
      publicSignup: "disabled",
      externalNetwork: "blocked by browser provider guard",
      node: process.version,
      os: `${platform()} ${release()}`,
      logicalCpuCount: cpus().length,
      hostTotalMemoryBytes: totalmem(),
      hostFreeMemoryBytesAtEnd: freemem(),
    },
    workload: {
      virtualUsers: summary.virtualUsers,
      averageIterations: input.stage === "average" ? AVERAGE_ITERATIONS : null,
      journeyMix: input.stage === "smoke"
        ? ["public", "candidate", "recruiter", "negative/retry", "recovery"]
        : ["public", "candidate", "recruiter"],
      note: "Virtual users are synthetic browser contexts, not human beta users.",
    },
    timing: {
      startedAt: input.startedAt.toISOString(),
      endedAt: input.endedAt.toISOString(),
      durationMs: round(input.durationMs),
      aggregate: summarize(measured.map((sample) => sample.durationMs)),
      byJourney,
    },
    reliability: {
      requestStatusCounts: countStatuses(requestSamples),
      unexpectedSamples: unexpected,
      errors: input.recorder.errors,
      fiveXx: serverErrors.length,
      correctness: Object.fromEntries(input.recorder.correctness),
      recovery: input.recovery,
    },
    resources: {
      peakHarnessRssBytes: input.recorder.peakHarnessRssBytes,
      targetCpu: "unavailable",
      targetMemory: "unavailable",
      databaseConnections: "unavailable (synthetic provider has no database)",
      limit: "Host and harness memory are diagnostic only; no isolated service quota is known.",
    },
    assumptions: [
      "One smoke VU and three mixed average VUs are regression workloads, not observed human concurrency.",
      "The local production build removes network/provider variance and does not predict hosted latency.",
      "No stress, spike, soak, or breakpoint claim is made without target resource and quota observability.",
    ],
    verdict: input.verdict,
  };
}

function summarize(values: number[]) {
  const ordered = [...values].sort((left, right) => left - right);
  return {
    count: ordered.length,
    minMs: quantile(ordered, 0),
    p50Ms: quantile(ordered, 0.5),
    p95Ms: quantile(ordered, 0.95),
    p99Ms: quantile(ordered, 0.99),
    maxMs: quantile(ordered, 1),
  };
}

function quantile(ordered: number[], percentile: number) {
  if (ordered.length === 0) return null;
  const index = Math.min(
    ordered.length - 1,
    Math.ceil(percentile * ordered.length) - 1,
  );
  return round(ordered[Math.max(0, index)]);
}

function countStatuses(samples: Sample[]) {
  const output: Record<string, number> = {};
  for (const sample of samples) {
    const key = String(sample.status ?? "transport_error");
    output[key] = (output[key] ?? 0) + 1;
  }
  return output;
}

function isObservedApplicationRequest(request: Request) {
  if (new URL(request.url()).origin !== APP_ORIGIN) return false;
  if (request.resourceType() === "document") return true;
  return ["fetch", "xhr"].includes(request.resourceType()) &&
    new URL(request.url()).pathname.startsWith("/api/");
}

function normalizePath(path: string) {
  if (/^\/brief\/[A-Za-z0-9_-]+$/u.test(path)) return "/brief/:token";
  if (/^\/recruiters\/review\/[A-Za-z0-9_-]+$/u.test(path)) {
    return "/recruiters/review/:token";
  }
  return path;
}

function gitIdentity() {
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const tree = execFileSync("git", ["rev-parse", "HEAD^{tree}"], { encoding: "utf8" }).trim();
  const dirty = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim().length > 0;
  return { sha, tree, dirty };
}

function assertLoopback(origin: string) {
  const host = new URL(origin).hostname;
  if (host !== "127.0.0.1" && host !== "localhost" && host !== "::1") {
    throw new Error(`Reliability target must be loopback, received ${host}`);
  }
}

function positiveInteger(value: string | undefined, fallback: number) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 20) {
    throw new Error("SKILLMINT_RELIABILITY_AVERAGE_ITERATIONS must be an integer from 1 to 20");
  }
  return parsed;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function sanitizeError(error: unknown) {
  return sanitizeText(error instanceof Error ? error.message : String(error));
}

function sanitizeText(value: string) {
  return value
    .replace(/\u001b\[[0-9;]*m/gu, "")
    .replace(/[A-Za-z0-9_-]{43}/gu, "[redacted-token]")
    .replace(/[\w.+-]+@[\w.-]+/gu, "[redacted-email]")
    .slice(0, 500);
}
