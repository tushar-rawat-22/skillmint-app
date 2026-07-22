import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, "..");
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveSkillMintAlias(request, parent, isMain, options) {
  if (request === "server-only") return path.join(repoRoot, "scripts", "server-only-fixture-stub.cjs");
  if (request.startsWith("@/")) {
    return originalResolveFilename.call(this, path.join(repoRoot, "src", request.slice(2)), parent, isMain, options);
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions[".ts"] = function compileTypeScript(module, filename) {
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const stubPath = path.join(repoRoot, "scripts", "server-only-fixture-stub.cjs");
require.cache[stubPath] = {
  id: stubPath,
  filename: stubPath,
  loaded: true,
  exports: {},
  children: [],
  paths: [],
};

const contract = require(path.join(repoRoot, "src/modules/analytics/founderDashboardContract.ts"));
const {
  createProcessLocalFounderDashboardLimiter,
  createProcessLocalPreAuthLimiter,
} = require(path.join(repoRoot, "src/modules/analytics/founderDashboardRateLimit.ts"));
const { handleFounderAnalyticsSummaryGet } = require(path.join(repoRoot, "src/app/api/founder/analytics/summary/handler.ts"));
const { getFounderAnalyticsConfiguration } = require(path.join(repoRoot, "src/config/founderAnalytics.ts"));
const eventContract = require(path.join(repoRoot, "src/platform/analytics/eventContract.ts"));

const FOUNDER_ID = "10000000-0000-4000-8000-000000000001";
const OTHER_ID = "20000000-0000-4000-8000-000000000002";
const TOKEN = "synthetic.fixture.token";
const tests = [];
function test(name, callback) { tests.push({ name, callback }); }

function zeroRecord(keys) {
  return Object.fromEntries(keys.map((key) => [key, 0]));
}

function zeroOperationErrors() {
  return Object.fromEntries(
    eventContract.ANALYTICS_PRODUCT_OPERATIONS.map((operation) => [
      operation,
      zeroRecord(eventContract.ANALYTICS_OPERATION_ERROR_CODES),
    ]),
  );
}

function aggregate(overrides = {}) {
  const eventCounts = {
    ...zeroRecord(eventContract.ANALYTICS_EVENT_NAMES),
    resume_analysis_started: 2,
    resume_analysis_failed: 1,
    jd_match_started: 1,
    jd_match_completed: 1,
    feedback_persisted: 1,
    product_operation_failed: 1,
    ...(overrides.event_counts ?? {}),
  };
  const operationErrorCounts = zeroOperationErrors();
  operationErrorCounts.feedback_persistence.network_failure = 1;
  const feedbackCounts = {
    account: 0,
    browser: 1,
    browser_fallback: 0,
    ...(overrides.feedback_persistence_counts ?? {}),
  };
  const base = {
    contract_version: "founder_analytics_summary.v1",
    as_of: "2026-07-22T12:00:00.000Z",
    window_name: "24h",
    window_start: "2026-07-21T12:00:00.000Z",
    window_end: "2026-07-22T12:00:00.000Z",
    canonical_environment: "production",
    total_event_count: Object.values(eventCounts).reduce((sum, value) => sum + value, 0),
    last_received_at: "2026-07-22T11:59:59.999Z",
    event_counts: eventCounts,
    operation_error_counts: operationErrorCounts,
    feedback_persistence_counts: feedbackCounts,
    retention_overdue_count: 3,
  };
  return {
    ...base,
    ...overrides,
    event_counts: eventCounts,
    feedback_persistence_counts: feedbackCounts,
  };
}

function emptyAggregate() {
  return aggregate({
    event_counts: zeroRecord(eventContract.ANALYTICS_EVENT_NAMES),
    operation_error_counts: zeroOperationErrors(),
    feedback_persistence_counts: zeroRecord(
      eventContract.ANALYTICS_FEEDBACK_PERSISTENCE_PATHS,
    ),
    last_received_at: null,
  });
}

function rpc(overrides = {}) {
  return [{ summary: aggregate(overrides) }];
}

function successBody(aggregateValue = aggregate()) {
  const parsed = contract.parseFounderAnalyticsRpcResult([{ summary: aggregateValue }]);
  assert.ok(parsed, "fixture aggregate must be valid");
  return {
    ok: true,
    code: "aggregate_summary",
    summary: contract.buildFounderAnalyticsSummary(parsed),
  };
}

function request(url = "https://app.example/api/founder/analytics/summary?window=24h", authorization = `Bearer ${TOKEN}`) {
  return new Request(url, {
    method: "GET",
    headers: authorization === null ? {} : { authorization },
  });
}

function dependencies(overrides = {}) {
  return {
    founderUserId: FOUNDER_ID,
    canonicalEnvironment: "production",
    authenticate: async () => ({ ok: true, userId: FOUNDER_ID }),
    loadAggregate: async () => ({ ok: true, data: rpc() }),
    preAuthLimiter: createProcessLocalPreAuthLimiter(),
    founderLimiter: createProcessLocalFounderDashboardLimiter(),
    now: () => 10_000,
    ...overrides,
  };
}

async function responseBody(response, retryAfter = null) {
  assert.equal(
    response.headers.get("cache-control"),
    "private, no-store, max-age=0, must-revalidate",
  );
  assert.equal(response.headers.get("pragma"), "no-cache");
  assert.equal(response.headers.get("vary"), "Authorization");
  assert.equal(response.headers.get("retry-after"), retryAfter);
  return response.json();
}

test("server-only founder UUID configuration fails closed", () => {
  assert.deepEqual(getFounderAnalyticsConfiguration({}), { enabled: false });
  assert.deepEqual(getFounderAnalyticsConfiguration({ ANALYTICS_FOUNDER_USER_ID: "not-a-uuid" }), { enabled: false });
  assert.deepEqual(getFounderAnalyticsConfiguration({ ANALYTICS_FOUNDER_USER_ID: "00000000-0000-0000-0000-000000000000" }), { enabled: false });
  assert.deepEqual(getFounderAnalyticsConfiguration({ ANALYTICS_FOUNDER_USER_ID: FOUNDER_ID }), { enabled: true, founderUserId: FOUNDER_ID });
  assert.deepEqual(getFounderAnalyticsConfiguration({ ANALYTICS_FOUNDER_USER_ID: FOUNDER_ID.toUpperCase() }), { enabled: true, founderUserId: FOUNDER_ID });
});

test("malformed route, query, configuration, and bearer fail before limiters and Auth", async () => {
  let preAuthCalls = 0;
  let founderCalls = 0;
  let authCalls = 0;
  const guarded = dependencies({
    preAuthLimiter: { tryConsume() { preAuthCalls += 1; return true; } },
    founderLimiter: { tryAcquire() { founderCalls += 1; return { ok: false, reason: "rate" }; } },
    authenticate: async () => { authCalls += 1; return { ok: true, userId: FOUNDER_ID }; },
  });
  const candidates = [
    request("https://app.example/api/founder/analytics/summary"),
    request(undefined, null),
    request(undefined, `Bearer  ${TOKEN}`),
  ];
  for (const candidate of candidates) {
    await handleFounderAnalyticsSummaryGet(candidate, guarded);
  }
  await handleFounderAnalyticsSummaryGet(request(), { ...guarded, founderUserId: null });
  assert.deepEqual([preAuthCalls, founderCalls, authCalls], [0, 0, 0]);
});

test("strict query contract rejects missing, duplicate, unknown, and extra parameters", async () => {
  const urls = [
    "https://app.example/api/founder/analytics/summary",
    "https://app.example/api/founder/analytics/summary?window=24h&window=7d",
    "https://app.example/api/founder/analytics/summary?window=1h",
    "https://app.example/api/founder/analytics/summary?window=24h&limit=1",
    "https://app.example/api/founder/analytics/summary?environment=test&window=24h",
  ];
  for (const url of urls) {
    const response = await handleFounderAnalyticsSummaryGet(request(url), dependencies());
    assert.equal(response.status, 400);
    assert.deepEqual(await responseBody(response), { ok: false, code: "invalid_request" });
  }
});

test("every allowed window reaches only the current server environment", async () => {
  const calls = [];
  for (const window of contract.FOUNDER_ANALYTICS_WINDOWS) {
    const adjusted = aggregate({
      window_name: window,
      window_start: window === "24h" ? "2026-07-21T12:00:00.000Z" : window === "7d" ? "2026-07-15T12:00:00.000Z" : "2026-06-22T12:00:00.000Z",
    });
    const response = await handleFounderAnalyticsSummaryGet(
      request(`https://app.example/api/founder/analytics/summary?window=${window}`),
      dependencies({
        canonicalEnvironment: "preview",
        loadAggregate: async (receivedWindow, environment) => {
          calls.push([receivedWindow, environment]);
          return { ok: true, data: [{ summary: { ...adjusted, canonical_environment: "preview" } }] };
        },
      }),
    );
    assert.equal(response.status, 200);
    await responseBody(response);
  }
  assert.deepEqual(calls, [["24h", "preview"], ["7d", "preview"], ["30d", "preview"]]);
});

test("validated RPC aggregates remain bound to requested window and trusted environment", async () => {
  const calls = [];
  const loadAggregate = (data) => async (window, environment) => {
    calls.push([window, environment]);
    return { ok: true, data: [{ summary: data }] };
  };

  const wrongWindow = await handleFounderAnalyticsSummaryGet(
    request(),
    dependencies({
      loadAggregate: loadAggregate(aggregate({
        window_name: "7d",
        window_start: "2026-07-15T12:00:00.000Z",
      })),
    }),
  );
  assert.equal(wrongWindow.status, 503);
  const wrongWindowBody = await responseBody(wrongWindow);
  assert.deepEqual(wrongWindowBody, {
    ok: false,
    code: "temporarily_unavailable",
  });

  const wrongEnvironment = await handleFounderAnalyticsSummaryGet(
    request(),
    dependencies({
      loadAggregate: loadAggregate(aggregate({
        canonical_environment: "preview",
      })),
    }),
  );
  assert.equal(wrongEnvironment.status, 503);
  const wrongEnvironmentBody = await responseBody(wrongEnvironment);
  assert.deepEqual(wrongEnvironmentBody, {
    ok: false,
    code: "temporarily_unavailable",
  });

  for (const mismatch of [wrongWindowBody, wrongEnvironmentBody]) {
    assert.deepEqual(Object.keys(mismatch).sort(), ["code", "ok"]);
    assert.doesNotMatch(
      JSON.stringify(mismatch),
      /summary|window_name|canonical_environment|event_counts|operation_error_counts/,
    );
  }

  const matching = await handleFounderAnalyticsSummaryGet(
    request("https://app.example/api/founder/analytics/summary?window=7d"),
    dependencies({
      loadAggregate: loadAggregate(aggregate({
        window_name: "7d",
        window_start: "2026-07-15T12:00:00.000Z",
      })),
    }),
  );
  assert.equal(matching.status, 200);
  const matchingBody = await responseBody(matching);
  assert.equal(matchingBody.ok, true);
  assert.equal(matchingBody.code, "aggregate_summary");
  assert.equal(matchingBody.summary.window_name, "7d");
  assert.equal(matchingBody.summary.canonical_environment, "production");
  assert.deepEqual(calls, [
    ["24h", "production"],
    ["24h", "production"],
    ["7d", "production"],
  ]);
});

test("disabled dashboard and exact Bearer parsing return fixed responses", async () => {
  const disabled = await handleFounderAnalyticsSummaryGet(request(), dependencies({ founderUserId: null }));
  assert.equal(disabled.status, 404);
  assert.deepEqual(await responseBody(disabled), { ok: false, code: "dashboard_disabled" });
  for (const header of [null, "", TOKEN, `bearer ${TOKEN}`, `Bearer  ${TOKEN}`, `Bearer ${TOKEN} trailing`]) {
    const response = await handleFounderAnalyticsSummaryGet(request(undefined, header), dependencies());
    assert.equal(response.status, 401);
    assert.deepEqual(await responseBody(response), { ok: false, code: "not_authenticated" });
  }
});

test("invalid and non-founder tokens consume only coarse allowance", async () => {
  let preAuthCalls = 0;
  let founderCalls = 0;
  const shared = {
    preAuthLimiter: { tryConsume() { preAuthCalls += 1; return true; } },
    founderLimiter: { tryAcquire() { founderCalls += 1; return { ok: false, reason: "rate" }; } },
  };
  const invalid = await handleFounderAnalyticsSummaryGet(request(), dependencies({
    ...shared,
    authenticate: async () => ({ ok: false, code: "not_authenticated" }),
  }));
  assert.equal(invalid.status, 401);
  const other = await handleFounderAnalyticsSummaryGet(request(), dependencies({
    ...shared,
    authenticate: async () => ({ ok: true, userId: OTHER_ID }),
  }));
  assert.equal(other.status, 403);
  assert.deepEqual(await responseBody(other), { ok: false, code: "not_authorized" });
  assert.deepEqual([preAuthCalls, founderCalls], [2, 0]);
});

test("fixed public service failures never expose provider details", async () => {
  for (const code of ["not_configured", "schema_unavailable", "temporarily_unavailable"]) {
    const response = code === "not_configured"
      ? await handleFounderAnalyticsSummaryGet(request(), dependencies({ authenticate: async () => ({ ok: false, code }) }))
      : await handleFounderAnalyticsSummaryGet(request(), dependencies({ loadAggregate: async () => ({ ok: false, code, provider: "SECRET_SQL" }) }));
    assert.equal(response.status, 503);
    const body = await responseBody(response);
    assert.deepEqual(body, { ok: false, code });
    assert.doesNotMatch(JSON.stringify(body), /SECRET|SQL|token|uuid/i);
  }
});

test("coarse pre-auth limiter enforces 60, resets exactly, and retains no identifiers", () => {
  const limiter = createProcessLocalPreAuthLimiter();
  for (let index = 0; index < 60; index += 1) assert.equal(limiter.tryConsume(1_000), true);
  assert.equal(limiter.tryConsume(60_999), false);
  assert.equal(limiter.tryConsume(61_000), true);
  assert.equal(limiter.tryConsume(60_999), false);
  assert.equal(limiter.tryConsume(Number.NaN), false);
  assert.equal(limiter.tryConsume(Number.POSITIVE_INFINITY), false);
  assert.equal(limiter.tryConsume(-1), false);
  assert.deepEqual(Object.keys(limiter), ["tryConsume"]);
  assert.equal(JSON.stringify(limiter).includes(TOKEN), false);
  const source = fs.readFileSync(path.join(repoRoot, "src/modules/analytics/founderDashboardRateLimit.ts"), "utf8");
  assert.doesNotMatch(source, /bearer|token|uuid|user|account|ip address/i);
});

test("61st syntactically valid bearer request is rejected before authenticate", async () => {
  const preAuthLimiter = createProcessLocalPreAuthLimiter();
  let authCalls = 0;
  const shared = dependencies({
    preAuthLimiter,
    authenticate: async () => {
      authCalls += 1;
      return { ok: false, code: "not_authenticated" };
    },
  });
  for (let index = 0; index < 60; index += 1) {
    assert.equal((await handleFounderAnalyticsSummaryGet(request(), shared)).status, 401);
  }
  const limited = await handleFounderAnalyticsSummaryGet(request(), shared);
  assert.equal(limited.status, 429);
  assert.deepEqual(await responseBody(limited, "60"), { ok: false, code: "rate_limited" });
  assert.equal(authCalls, 60);
});

test("authorized founder limiter enforces ten and moving clocks fail safely", () => {
  const limiter = createProcessLocalFounderDashboardLimiter();
  for (let index = 0; index < 10; index += 1) {
    const lease = limiter.tryAcquire(1_000);
    assert.equal(lease.ok, true);
    lease.release();
  }
  assert.deepEqual(limiter.tryAcquire(60_999), { ok: false, reason: "rate" });
  const reset = limiter.tryAcquire(61_000);
  assert.equal(reset.ok, true);
  reset.release();
  assert.deepEqual(limiter.tryAcquire(60_999), { ok: false, reason: "rate" });
  assert.deepEqual(limiter.tryAcquire(Number.NaN), { ok: false, reason: "rate" });
  assert.deepEqual(limiter.tryAcquire(Number.POSITIVE_INFINITY), { ok: false, reason: "rate" });
});

test("11th authorized founder request is rejected with fixed-window retry", async () => {
  let authCalls = 0;
  let queryCalls = 0;
  const shared = dependencies({
    authenticate: async () => {
      authCalls += 1;
      return { ok: true, userId: FOUNDER_ID };
    },
    loadAggregate: async () => {
      queryCalls += 1;
      return { ok: true, data: rpc() };
    },
  });
  for (let index = 0; index < 10; index += 1) {
    assert.equal((await handleFounderAnalyticsSummaryGet(request(), shared)).status, 200);
  }
  const limited = await handleFounderAnalyticsSummaryGet(request(), shared);
  assert.equal(limited.status, 429);
  assert.deepEqual(await responseBody(limited, "60"), { ok: false, code: "rate_limited" });
  assert.deepEqual([authCalls, queryCalls], [11, 10]);
});

test("one aggregate query is allowed and concurrent rejection retries after one second", async () => {
  let releaseQuery;
  const gate = new Promise((resolve) => { releaseQuery = resolve; });
  let calls = 0;
  const shared = dependencies({
    loadAggregate: async () => {
      calls += 1;
      await gate;
      return { ok: true, data: rpc() };
    },
  });
  const firstPromise = handleFounderAnalyticsSummaryGet(request(), shared);
  await new Promise((resolve) => setImmediate(resolve));
  const second = await handleFounderAnalyticsSummaryGet(request(), shared);
  assert.equal(second.status, 429);
  assert.deepEqual(await responseBody(second, "1"), { ok: false, code: "rate_limited" });
  assert.equal(calls, 1);
  releaseQuery();
  assert.equal((await firstPromise).status, 200);
});

test("exact HTTP parser accepts success and every approved failure pair", () => {
  const success = contract.parseFounderAnalyticsHttpResponse(200, successBody());
  assert.equal(success.kind, "success");
  assert.equal(success.summary.observed_event_ratios.resume_analysis_failure.ratio, 0.5);
  const failures = [
    [400, "invalid_request"], [401, "not_authenticated"],
    [403, "not_authorized"], [404, "dashboard_disabled"],
    [429, "rate_limited"], [503, "not_configured"],
    [503, "schema_unavailable"], [503, "temporarily_unavailable"],
  ];
  for (const [status, code] of failures) {
    assert.deepEqual(
      contract.parseFounderAnalyticsHttpResponse(status, { ok: false, code }),
      { kind: "failure", status, code },
    );
  }
  assert.equal(
    contract.parseFounderAnalyticsHttpResponse(503, { ok: false, code: "rate_limited" }).kind,
    "invalid",
  );
});

test("HTTP parser keeps ratios over one and rejects top-level or summary key drift", () => {
  const uncapped = successBody(aggregate({
    event_counts: { resume_analysis_started: 1, resume_analysis_failed: 2 },
  }));
  const parsed = contract.parseFounderAnalyticsHttpResponse(200, uncapped);
  assert.equal(parsed.kind, "success");
  assert.equal(parsed.summary.observed_event_ratios.resume_analysis_failure.ratio, 2);

  const extraTop = { ...successBody(), extra: true };
  const missingTop = { ok: true, code: "aggregate_summary" };
  const extraSummary = structuredClone(successBody());
  extraSummary.summary.source_screen = "dashboard";
  const missingSummary = structuredClone(successBody());
  delete missingSummary.summary.as_of;
  for (const candidate of [extraTop, missingTop, extraSummary, missingSummary]) {
    assert.equal(contract.parseFounderAnalyticsHttpResponse(200, candidate).kind, "invalid");
  }
});

test("HTTP parser rejects malformed counts, totals, ratios, and non-finite values", () => {
  const candidates = [];
  const extraEvent = structuredClone(successBody());
  extraEvent.summary.event_counts.unknown_event = 0;
  candidates.push(extraEvent);
  const wrongTotal = structuredClone(successBody());
  wrongTotal.summary.total_event_count += 1;
  candidates.push(wrongTotal);
  const ratioExtra = structuredClone(successBody());
  ratioExtra.summary.observed_event_ratios.resume_analysis_failure.extra = 0;
  candidates.push(ratioExtra);
  const ratioMath = structuredClone(successBody());
  ratioMath.summary.observed_event_ratios.resume_analysis_failure.ratio = 0.75;
  candidates.push(ratioMath);
  const ratioAggregate = structuredClone(successBody());
  ratioAggregate.summary.observed_event_ratios.resume_analysis_failure.numerator = 2;
  ratioAggregate.summary.observed_event_ratios.resume_analysis_failure.ratio = 1;
  candidates.push(ratioAggregate);
  for (const value of [-1, Number.MAX_SAFE_INTEGER + 1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const invalidRatio = structuredClone(successBody());
    invalidRatio.summary.observed_event_ratios.resume_analysis_failure.numerator = value;
    candidates.push(invalidRatio);
  }
  for (const value of [-1, Number.MAX_SAFE_INTEGER + 1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const invalid = structuredClone(successBody());
    invalid.summary.retention_overdue_count = value;
    candidates.push(invalid);
  }
  const zeroWrong = structuredClone(successBody(emptyAggregate()));
  zeroWrong.summary.observed_event_ratios.jd_match_completion.ratio = 0;
  candidates.push(zeroWrong);
  for (const candidate of candidates) {
    assert.equal(contract.parseFounderAnalyticsHttpResponse(200, candidate).kind, "invalid");
  }
});

test("HTTP and RPC parsers reject inherited, accessor, symbol, and hostile input", () => {
  const inherited = Object.create({ ok: true });
  inherited.code = "aggregate_summary";
  inherited.summary = successBody().summary;
  const accessor = { ok: true, code: "aggregate_summary" };
  Object.defineProperty(accessor, "summary", {
    enumerable: true,
    get() { throw new Error("must not run"); },
  });
  const symbol = { ...successBody(), [Symbol("hidden")]: true };
  const hostile = new Proxy({}, { ownKeys() { throw new Error("hostile"); } });
  for (const candidate of [inherited, accessor, symbol, hostile, [], null]) {
    assert.doesNotThrow(() => contract.parseFounderAnalyticsHttpResponse(200, candidate));
    assert.equal(contract.parseFounderAnalyticsHttpResponse(200, candidate).kind, "invalid");
  }
  const hostileArray = new Proxy([], { getPrototypeOf() { throw new Error("hostile"); } });
  assert.doesNotThrow(() => contract.parseFounderAnalyticsRpcResult(hostileArray));
  assert.equal(contract.parseFounderAnalyticsRpcResult(hostileArray), null);
});

test("validated HTTP and RPC outputs are fresh and deeply mutation-protected", () => {
  const httpInput = structuredClone(successBody());
  const parsedHttp = contract.parseFounderAnalyticsHttpResponse(200, httpInput);
  assert.equal(parsedHttp.kind, "success");
  httpInput.summary.event_counts.resume_analysis_started = 999;
  httpInput.summary.operation_error_counts.feedback_persistence.network_failure = 999;
  assert.equal(parsedHttp.summary.event_counts.resume_analysis_started, 2);
  assert.equal(parsedHttp.summary.operation_error_counts.feedback_persistence.network_failure, 1);
  assert.throws(() => { parsedHttp.summary.event_counts.resume_analysis_started = 4; }, TypeError);
  assert.throws(() => {
    parsedHttp.summary.operation_error_counts.feedback_persistence.network_failure = 4;
  }, TypeError);

  const rpcInput = rpc();
  const parsedRpc = contract.parseFounderAnalyticsRpcResult(rpcInput);
  rpcInput[0].summary.event_counts.resume_analysis_started = 999;
  assert.equal(parsedRpc.event_counts.resume_analysis_started, 2);
  assert.throws(() => {
    parsedRpc.operation_error_counts.feedback_persistence.network_failure = 4;
  }, TypeError);
});

test("public aggregate response contains no forbidden dimensions or limiter internals", async () => {
  const response = await handleFounderAnalyticsSummaryGet(request(), dependencies());
  const serialized = JSON.stringify(await responseBody(response));
  for (const forbidden of [
    FOUNDER_ID, TOKEN, "owner_mode", "source_screen", "build_id", "duration_bucket",
    "file_type", "target_source", "path_source", "mission_category", "feedback_type",
    "user_id", "ordering", "limit", "concurrent", "pre_auth",
  ]) assert.equal(serialized.includes(forbidden), false, forbidden);
});

test("V6 SQL uses fail-closed creation, aligned time, exact hours, and bounded purge", () => {
  const sql = fs.readFileSync(path.join(repoRoot, "supabase/schema_v6_analytics_aggregation.sql"), "utf8").toLowerCase();
  assert.doesNotMatch(sql, /create\s+or\s+replace\s+function/);
  assert.match(sql, /create function public\.get_founder_analytics_summary\(\s*requested_window text,\s*canonical_environment text\s*\)/);
  assert.match(sql, /create function public\.purge_expired_analytics_events\(\)/);
  assert.equal((sql.match(/security definer/g) ?? []).length, 2);
  assert.equal((sql.match(/set search_path = ''/g) ?? []).length, 2);
  assert.equal((sql.match(/set statement_timeout = '2s'/g) ?? []).length, 2);
  assert.match(sql, /as_of_time timestamptz := date_trunc\('milliseconds', statement_timestamp\(\)\)/);
  for (const hours of [24, 168, 720, 1080]) assert.match(sql, new RegExp(`interval '${hours} hours'`));
  assert.doesNotMatch(sql, /interval '(?:7|30|45) days'/);
  assert.match(sql, /analytics\.received_at >= window_start_time/);
  assert.match(sql, /analytics\.received_at < as_of_time/);
  assert.match(sql, /analytics\.received_at < as_of_time - interval '1080 hours'/);
  assert.match(sql, /select analytics\.event_id[\s\S]*order by analytics\.received_at, analytics\.event_id[\s\S]*limit 10000/);
  assert.match(sql, /using expired_event_ids[\s\S]*analytics\.event_id = expired_event_ids\.event_id/);
  assert.doesNotMatch(sql, /purge_expired_analytics_events\([^)]*[a-z_]+[^)]*\)/);
  assert.match(sql, /revoke all on function public\.get_founder_analytics_summary\(text, text\) from public/);
  assert.match(sql, /revoke all on function public\.get_founder_analytics_summary\(text, text\) from anon/);
  assert.match(sql, /revoke all on function public\.get_founder_analytics_summary\(text, text\) from authenticated/);
  assert.match(sql, /grant execute on function public\.get_founder_analytics_summary\(text, text\) to service_role/);
  for (const role of ["public", "anon", "authenticated", "service_role"]) {
    assert.match(sql, new RegExp(`revoke all on function public\\.purge_expired_analytics_events\\(\\) from ${role}`));
  }
  assert.doesNotMatch(sql, /grant\s+select/);
  assert.doesNotMatch(sql, /execute\s+public\.purge_expired_analytics_events|cron\./);
  const applicationSource = fs.readFileSync(path.join(repoRoot, "src/modules/analytics/services/founderAnalyticsServer.ts"), "utf8");
  assert.doesNotMatch(applicationSource, /rpc\(["']purge_expired_analytics_events/);
});

test("founder component is isolated from ordinary navigation and feedback shell", () => {
  const source = fs.readFileSync(
    path.join(repoRoot, "src/modules/analytics/components/FounderAnalyticsDashboard.tsx"),
    "utf8",
  );
  for (const forbidden of ["DashboardLayout", "Sidebar", "Topbar", "FeedbackWidget"]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
  assert.match(source, /<main\s/);
  assert.doesNotMatch(source, /auto-refresh|setinterval/i);
});

test("V5 analytics migration remains byte-for-byte unchanged", () => {
  const data = fs.readFileSync(path.join(repoRoot, "supabase/schema_v5_analytics_events.sql"));
  const gitBlob = Buffer.concat([Buffer.from(`blob ${data.length}\0`), data]);
  assert.equal(crypto.createHash("sha1").update(gitBlob).digest("hex"), "1e7dc0beeab5dbd1e58075ec9a4845fa58ad61a6");
});

let passed = 0;
for (const fixture of tests) {
  try {
    await fixture.callback();
    passed += 1;
    console.log(`PASS ${fixture.name}`);
  } catch (error) {
    console.error(`FAIL ${fixture.name}`);
    throw error;
  }
}
console.log(`Analytics dashboard fixtures passed: ${passed}/${tests.length}`);
