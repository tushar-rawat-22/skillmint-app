import assert from "node:assert/strict";
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
    return originalResolveFilename.call(
      this,
      path.join(repoRoot, "src", request.slice(2)),
      parent,
      isMain,
      options,
    );
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions[".ts"] = function compileTypeScript(module, filename) {
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
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

const analytics = require(path.join(repoRoot, "src/platform/analytics/index.ts"));
const { MemoryAnalyticsSink } = require(path.join(repoRoot, "src/platform/analytics/testing.ts"));
const { handleAnalyticsPost } = require(path.join(repoRoot, "src/app/api/analytics/events/handler.ts"));
const { getServerAnalyticsContext } = require(path.join(repoRoot, "src/app/api/analytics/events/normalization.ts"));
const {
  createAnalyticsEventRepository,
  isServerAnalyticsCollectionEnabled,
  persistAnalyticsEvent,
} = require(path.join(repoRoot, "src/modules/analytics/services/analyticsEventRepository.ts"));

const tests = [];
function test(name, callback) { tests.push({ name, callback }); }

function eventId(index = 1) {
  return `10000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
}

function event(overrides = {}) {
  return {
    event_id: eventId(),
    event_name: "feedback_persisted",
    event_version: 1,
    occurred_at: "2026-07-22T08:00:00.000Z",
    environment: "production",
    build_id: "untrusted-client-build",
    source_screen: "data_controls",
    owner_mode: "anonymous",
    properties: { persistence_path: "browser", feedback_type: "idea" },
    ...overrides,
  };
}

function request(body = event(), overrides = {}) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  const { headers: headerOverrides = {}, ...requestOverrides } = overrides;
  return new Request("https://skillmint.example/api/analytics/events", {
    method: "POST",
    headers: {
      Origin: "https://skillmint.example",
      "Content-Type": "application/json",
      "Sec-Fetch-Site": "same-origin",
      ...headerOverrides,
    },
    body: text,
    ...requestOverrides,
  });
}

function trackedRequest(chunks, options = {}) {
  const activity = { reads: 0, cancels: 0, releases: 0 };
  let index = 0;
  const headerValues = Object.fromEntries(
    Object.entries({
      Origin: "https://skillmint.example",
      "Content-Type": "application/json",
      "Sec-Fetch-Site": "same-origin",
      ...(options.headers ?? {}),
    }).map(([key, value]) => [key.toLowerCase(), String(value)]),
  );
  const headers = {
    get(name) { return headerValues[name.toLowerCase()] ?? null; },
  };
  const body = options.nullBody
    ? null
    : {
        getReader() {
          if (options.throwOnGetReader) {
            throw new Error(options.throwText ?? "RAW_LOCKED_STREAM_SECRET");
          }
          return {
            async read() {
              activity.reads += 1;
              if (options.throwOnRead === activity.reads) {
                throw new Error(options.throwText ?? "RAW_STREAM_SECRET");
              }
              if (index >= chunks.length) return { done: true, value: undefined };
              const value = chunks[index];
              index += 1;
              return { done: false, value };
            },
            async cancel() {
              activity.cancels += 1;
              if (options.cancelThrows) throw new Error("RAW_CANCEL_SECRET");
            },
            releaseLock() { activity.releases += 1; },
          };
        },
      };

  return {
    activity,
    request: {
      method: options.method ?? "POST",
      url: "https://skillmint.example/api/analytics/events",
      headers,
      body,
    },
  };
}

function bytes(value) {
  return typeof value === "string" ? new TextEncoder().encode(value) : value;
}

async function responseBody(response) {
  return JSON.parse(await response.text());
}

const testServerContext = { environment: "test", buildId: "local-test" };

test("HTTP sink uses one fixed same-origin JSON POST without identity headers", async () => {
  const calls = [];
  const sink = analytics.createHttpAnalyticsSink({
    fetchImpl: async (input, init) => {
      calls.push({ input, init });
      return { ok: true };
    },
  });
  await sink.write(event());
  assert.equal(calls.length, 1);
  assert.equal(calls[0].input, "/api/analytics/events");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers["Content-Type"], "application/json");
  assert.equal(calls[0].init.credentials, "same-origin");
  assert.equal(calls[0].init.referrerPolicy, "no-referrer");
  assert.equal("Authorization" in calls[0].init.headers, false);
  assert.deepEqual(JSON.parse(calls[0].init.body), event());
});

test("HTTP sink aborts on timeout and treats non-2xx as failure without retry", async () => {
  let timeoutCalls = 0;
  const timeoutSink = analytics.createHttpAnalyticsSink({
    scheduleTimeout(callback) { timeoutCalls += 1; callback(); return 1; },
    cancelTimeout() {},
    fetchImpl: async (_input, init) => {
      assert.equal(init.signal.aborted, true);
      throw new Error("aborted");
    },
  });
  await assert.rejects(() => timeoutSink.write(event()));
  assert.equal(timeoutCalls, 1);

  let writes = 0;
  const rejectedSink = analytics.createHttpAnalyticsSink({
    fetchImpl: async () => { writes += 1; return { ok: false }; },
  });
  await assert.rejects(() => rejectedSink.write(event()));
  assert.equal(writes, 1);
});

test("runtime derives anonymous/account mode without storing an account identifier", async () => {
  for (const [index, hasAccount] of [false, true].entries()) {
    const sink = new MemoryAnalyticsSink();
    const runtime = analytics.createAnalyticsRuntime({
      isAuthResolved: true,
      hasAccount,
      isBrowser: true,
      environment: "test",
      buildId: "fixture-build",
      clock: () => new Date("2026-07-22T08:00:00.000Z"),
      createId: () => eventId(index + 10),
      sink,
    });
    await runtime.feedbackPersisted("data_controls", {
      persistence_path: "browser",
      feedback_type: "idea",
    });
    const [stored] = sink.snapshot();
    assert.equal(stored.owner_mode, hasAccount ? "account" : "anonymous");
    assert.equal(JSON.stringify(stored).includes("account-a"), false);
    assert.deepEqual(Object.keys(stored).sort(), [
      "build_id", "environment", "event_id", "event_name", "event_version",
      "occurred_at", "owner_mode", "properties", "source_screen",
    ].sort());
  }
});

test("runtime is no-op during SSR/unresolved auth and never breaks workflow on sink failure", async () => {
  let writes = 0;
  const disabled = analytics.createAnalyticsRuntime({
    isAuthResolved: false,
    hasAccount: false,
    isBrowser: true,
    environment: "test",
    buildId: "fixture-build",
    clock: () => new Date(),
    createId: () => eventId(20),
    sink: { write() { writes += 1; } },
  });
  await disabled.jdMatchStarted();
  assert.equal(writes, 0);

  const failing = analytics.createAnalyticsRuntime({
    isAuthResolved: true,
    hasAccount: false,
    isBrowser: true,
    environment: "test",
    buildId: "fixture-build",
    clock: () => new Date("2026-07-22T08:00:00.000Z"),
    createId: () => eventId(21),
    sink: { write() { throw new Error("RAW_DATABASE_SECRET"); } },
  });
  let productContinued = false;
  await failing.jdMatchStarted();
  productContinued = true;
  assert.equal(productContinued, true);
});

test("browser collection flag accepts exact true and rejects every default-off variant", () => {
  for (const value of [
    undefined,
    "",
    "false",
    "TRUE",
    "True",
    " true",
    "true ",
    "\ttrue",
    "true\n",
  ]) {
    assert.equal(analytics.isBrowserAnalyticsCollectionEnabled(value), false, JSON.stringify(value));
  }
  assert.equal(analytics.isBrowserAnalyticsCollectionEnabled("true"), true);
});

test("disabled browser runtime has zero sink, fetch, UUID, timer, cache, or retained-event activity", async () => {
  const runtimePath = path.join(repoRoot, "src/platform/analytics/runtime.ts");
  const originalFlag = process.env.NEXT_PUBLIC_ANALYTICS_COLLECTION_ENABLED;
  const descriptors = Object.fromEntries(
    ["window", "fetch", "crypto", "setTimeout", "clearTimeout"].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  const activity = { fetches: 0, uuids: 0, timers: 0 };

  try {
    Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: async () => { activity.fetches += 1; return { ok: true }; },
    });
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: { randomUUID() { activity.uuids += 1; return eventId(30); } },
    });
    Object.defineProperty(globalThis, "setTimeout", {
      configurable: true,
      value: () => { activity.timers += 1; return 1; },
    });
    Object.defineProperty(globalThis, "clearTimeout", {
      configurable: true,
      value: () => undefined,
    });

    for (const value of [undefined, "", "false", "TRUE", "True", " true", "true "]) {
      if (value === undefined) delete process.env.NEXT_PUBLIC_ANALYTICS_COLLECTION_ENABLED;
      else process.env.NEXT_PUBLIC_ANALYTICS_COLLECTION_ENABLED = value;
      delete require.cache[require.resolve(runtimePath)];
      const freshRuntime = require(runtimePath);
      const first = freshRuntime.getBrowserAnalyticsRuntime({
        isAuthResolved: true,
        hasAccount: false,
      });
      const second = freshRuntime.getBrowserAnalyticsRuntime({
        isAuthResolved: true,
        hasAccount: false,
      });
      await first.jdMatchStarted();
      await second.jdMatchStarted();
    }

    assert.deepEqual(activity, { fetches: 0, uuids: 0, timers: 0 });
  } finally {
    if (originalFlag === undefined) delete process.env.NEXT_PUBLIC_ANALYTICS_COLLECTION_ENABLED;
    else process.env.NEXT_PUBLIC_ANALYTICS_COLLECTION_ENABLED = originalFlag;
    delete require.cache[require.resolve(runtimePath)];
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});

test("exact public true enables an eligible resolved browser but unresolved Auth remains disabled", async () => {
  const runtimePath = path.join(repoRoot, "src/platform/analytics/runtime.ts");
  const originalFlag = process.env.NEXT_PUBLIC_ANALYTICS_COLLECTION_ENABLED;
  const descriptors = Object.fromEntries(
    ["window", "fetch", "crypto", "setTimeout", "clearTimeout"].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  const activity = { fetches: 0, uuids: 0, timers: 0 };

  try {
    process.env.NEXT_PUBLIC_ANALYTICS_COLLECTION_ENABLED = "true";
    Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: async () => { activity.fetches += 1; return { ok: true }; },
    });
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: { randomUUID() { activity.uuids += 1; return eventId(31); } },
    });
    Object.defineProperty(globalThis, "setTimeout", {
      configurable: true,
      value: () => { activity.timers += 1; return 1; },
    });
    Object.defineProperty(globalThis, "clearTimeout", {
      configurable: true,
      value: () => undefined,
    });
    delete require.cache[require.resolve(runtimePath)];
    const freshRuntime = require(runtimePath);

    const unresolved = freshRuntime.getBrowserAnalyticsRuntime({
      isAuthResolved: false,
      hasAccount: true,
    });
    await unresolved.jdMatchStarted();
    assert.deepEqual(activity, { fetches: 0, uuids: 0, timers: 0 });

    const enabled = freshRuntime.getBrowserAnalyticsRuntime({
      isAuthResolved: true,
      hasAccount: false,
    });
    await enabled.jdMatchStarted();
    assert.deepEqual(activity, { fetches: 1, uuids: 1, timers: 1 });
  } finally {
    if (originalFlag === undefined) delete process.env.NEXT_PUBLIC_ANALYTICS_COLLECTION_ENABLED;
    else process.env.NEXT_PUBLIC_ANALYTICS_COLLECTION_ENABLED = originalFlag;
    delete require.cache[require.resolve(runtimePath)];
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});

test("server collection flag accepts exact true and rejects all default-off variants", () => {
  for (const value of [undefined, "", "false", "TRUE", " true", "true "]) {
    assert.equal(
      isServerAnalyticsCollectionEnabled({ ANALYTICS_COLLECTION_ENABLED: value }),
      false,
      JSON.stringify(value),
    );
  }
  assert.equal(
    isServerAnalyticsCollectionEnabled({ ANALYTICS_COLLECTION_ENABLED: "true" }),
    true,
  );
});

test("disabled handler stops after cheap checks without reading or persisting", async () => {
  const tracked = trackedRequest([bytes(JSON.stringify(event()))]);
  let persists = 0;
  const disabled = await handleAnalyticsPost(tracked.request, {
    enabled: false,
    persist: async () => { persists += 1; return { ok: true, code: "stored" }; },
    serverContext: testServerContext,
  });
  assert.equal(disabled.status, 503);
  assert.deepEqual(await responseBody(disabled), { ok: false, code: "not_configured" });
  assert.deepEqual(tracked.activity, { reads: 0, cancels: 0, releases: 0 });
  assert.equal(persists, 0);

  const invalidMethod = trackedRequest([bytes("RAW_BODY_SECRET")], { method: "PUT" });
  const rejected = await handleAnalyticsPost(invalidMethod.request, {
    enabled: false,
    persist: async () => { persists += 1; return { ok: true, code: "stored" }; },
  });
  assert.equal(rejected.status, 405);
  assert.equal((await responseBody(rejected)).code, "invalid_method");
  assert.equal(invalidMethod.activity.reads, 0);
  assert.equal(persists, 0);
});

test("disabled top-level repository constructs no admin client and performs no writer operation", async () => {
  const adminPath = path.join(repoRoot, "src/lib/supabase/admin.ts");
  const adminModule = require(adminPath);
  const originalCreateAdmin = adminModule.createSupabaseAdminClient;
  const originalFlag = process.env.ANALYTICS_COLLECTION_ENABLED;
  let adminConstructions = 0;
  let writerOperations = 0;

  try {
    delete process.env.ANALYTICS_COLLECTION_ENABLED;
    adminModule.createSupabaseAdminClient = () => {
      adminConstructions += 1;
      return {
        from() {
          return {
            async insert() {
              writerOperations += 1;
              return { error: null, status: 201 };
            },
          };
        },
      };
    };
    assert.deepEqual(
      await persistAnalyticsEvent(event()),
      { ok: false, code: "not_configured" },
    );
    assert.equal(adminConstructions, 0);
    assert.equal(writerOperations, 0);
  } finally {
    adminModule.createSupabaseAdminClient = originalCreateAdmin;
    if (originalFlag === undefined) delete process.env.ANALYTICS_COLLECTION_ENABLED;
    else process.env.ANALYTICS_COLLECTION_ENABLED = originalFlag;
  }
});

test("enabled top-level repository rejects malformed input before unavailable admin configuration", async () => {
  const environmentKeys = [
    "ANALYTICS_COLLECTION_ENABLED",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SECRET_KEY",
  ];
  const originalEnvironment = Object.fromEntries(
    environmentKeys.map((key) => [key, process.env[key]]),
  );
  const originalFetch = Object.getOwnPropertyDescriptor(globalThis, "fetch");
  let networkRequests = 0;

  try {
    process.env.ANALYTICS_COLLECTION_ENABLED = "true";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.SUPABASE_SECRET_KEY;
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: async () => {
        networkRequests += 1;
        throw new Error("RAW_NETWORK_SECRET");
      },
    });

    assert.deepEqual(
      await persistAnalyticsEvent({ malformed: true }),
      { ok: false, code: "invalid_event" },
    );
    assert.equal(networkRequests, 0);
  } finally {
    for (const key of environmentKeys) {
      const originalValue = originalEnvironment[key];
      if (originalValue === undefined) delete process.env[key];
      else process.env[key] = originalValue;
    }
    if (originalFetch) Object.defineProperty(globalThis, "fetch", originalFetch);
    else delete globalThis.fetch;
  }
});

test("top-level and injected repository validation precede their privileged writer boundaries", () => {
  const repositoryPath = path.join(
    repoRoot,
    "src/modules/analytics/services/analyticsEventRepository.ts",
  );
  const source = fs.readFileSync(repositoryPath, "utf8");
  const factorySource = source.slice(
    source.indexOf("export function createAnalyticsEventRepository"),
    source.indexOf("export function isServerAnalyticsCollectionEnabled"),
  );
  assert.match(factorySource, /persist\(input: unknown\)/);
  assert.ok(
    factorySource.indexOf("validateAnalyticsEvent(input)") <
      factorySource.indexOf("writer.insert(validation.event)"),
  );

  const topLevelSource = source.slice(
    source.indexOf("export async function persistAnalyticsEvent"),
  );
  const serverGate = topLevelSource.indexOf("if (!isServerAnalyticsCollectionEnabled())");
  const validation = topLevelSource.indexOf("validateAnalyticsEvent(input)");
  const invalidRejection = topLevelSource.indexOf('code: "invalid_event"');
  const validatorOwnedEvent = topLevelSource.indexOf("const event = validation.event");
  const adminClient = topLevelSource.indexOf("createSupabaseAdminClient()");
  const validatedPersistence = topLevelSource.indexOf("repository.persist(event)");
  assert.ok(serverGate >= 0);
  assert.ok(serverGate < validation);
  assert.ok(validation < invalidRejection);
  assert.ok(invalidRejection < validatorOwnedEvent);
  assert.ok(validatorOwnedEvent < adminClient);
  assert.ok(adminClient < validatedPersistence);
});

test("strict Content-Length rejects malformed and canonical oversize values before body read", async () => {
  const malformed = [
    "", "1e3", "+12", "-1", "1.0", "NaN", "Infinity", "1,024", "12x", " 12", "12 ",
  ];
  let persists = 0;
  for (const value of malformed) {
    const tracked = trackedRequest([bytes("RAW_CONTENT_LENGTH_SECRET")], {
      headers: { "Content-Length": value },
    });
    const result = await handleAnalyticsPost(tracked.request, {
      enabled: true,
      persist: async () => { persists += 1; return { ok: true, code: "stored" }; },
      serverContext: testServerContext,
    });
    assert.equal(result.status, 400, JSON.stringify(value));
    assert.equal((await responseBody(result)).code, "invalid_event");
    assert.equal(tracked.activity.reads, 0);
  }

  const oversized = trackedRequest([bytes("RAW_OVERSIZE_HEADER_SECRET")], {
    headers: { "Content-Length": "1025" },
  });
  const result = await handleAnalyticsPost(oversized.request, {
    enabled: true,
    persist: async () => { persists += 1; return { ok: true, code: "stored" }; },
    serverContext: testServerContext,
  });
  assert.equal(result.status, 413);
  assert.equal((await responseBody(result)).code, "request_too_large");
  assert.equal(oversized.activity.reads, 0);
  assert.equal(persists, 0);
});

test("bounded stream rejects absent or false length oversize and cancellation failure stays fixed", async () => {
  const oversizedBytes = bytes("x".repeat(1025));
  const cases = [
    trackedRequest([oversizedBytes.subarray(0, 700), oversizedBytes.subarray(700)]),
    trackedRequest([oversizedBytes], { headers: { "Content-Length": "4" } }),
    trackedRequest([oversizedBytes], { cancelThrows: true }),
  ];
  let persists = 0;
  for (const tracked of cases) {
    const result = await handleAnalyticsPost(tracked.request, {
      enabled: true,
      persist: async () => { persists += 1; return { ok: true, code: "stored" }; },
      serverContext: testServerContext,
    });
    const text = await result.text();
    assert.equal(result.status, 413);
    assert.deepEqual(JSON.parse(text), { ok: false, code: "request_too_large" });
    assert.equal(text.includes("RAW_CANCEL_SECRET"), false);
    assert.equal(tracked.activity.cancels, 1);
    assert.equal(tracked.activity.releases, 1);
  }
  assert.equal(persists, 0);
});

test("body read, UTF-8, empty, JSON, and validation failures are fixed and never persist", async () => {
  const secret = "RAW_BODY_PROVIDER_DECODER_STREAM_SECRET";
  const invalidCases = [
    trackedRequest([bytes(secret)], { throwOnGetReader: true, throwText: secret }),
    trackedRequest([bytes(secret)], { throwOnRead: 1, throwText: secret }),
    trackedRequest([new Uint8Array([0xc3, 0x28])]),
    trackedRequest([], { nullBody: true }),
    trackedRequest([]),
    trackedRequest([bytes(`{"secret":"${secret}"`)]),
    trackedRequest([bytes(JSON.stringify({ ...event(), email: secret }))]),
    trackedRequest(["not-a-byte-chunk"]),
  ];
  let persists = 0;
  for (const tracked of invalidCases) {
    const result = await handleAnalyticsPost(tracked.request, {
      enabled: true,
      persist: async () => { persists += 1; return { ok: true, code: "stored" }; },
      serverContext: testServerContext,
    });
    const text = await result.text();
    assert.equal(result.status, 400);
    assert.deepEqual(JSON.parse(text), { ok: false, code: "invalid_event" });
    assert.equal(text.includes(secret), false);
  }
  assert.equal(persists, 0);
});

test("valid bounded, exact-ceiling, and one-byte-over requests enforce byte-accurate limits", async () => {
  const serialized = JSON.stringify(event());
  const serializedBytes = bytes(serialized);
  const exactText = serialized + " ".repeat(1024 - serializedBytes.byteLength);
  assert.equal(bytes(exactText).byteLength, 1024);
  let persists = 0;

  for (const body of [serializedBytes, bytes(exactText)]) {
    const tracked = trackedRequest([body.subarray(0, 17), body.subarray(17)]);
    const result = await handleAnalyticsPost(tracked.request, {
      enabled: true,
      persist: async () => { persists += 1; return { ok: true, code: "stored" }; },
      serverContext: testServerContext,
    });
    assert.equal(result.status, 202);
    assert.deepEqual(await responseBody(result), { ok: true, code: "accepted" });
  }

  const oneOver = trackedRequest([bytes(`${exactText} `)]);
  const rejected = await handleAnalyticsPost(oneOver.request, {
    enabled: true,
    persist: async () => { persists += 1; return { ok: true, code: "stored" }; },
    serverContext: testServerContext,
  });
  assert.equal(rejected.status, 413);
  assert.equal((await responseBody(rejected)).code, "request_too_large");
  assert.equal(persists, 2);
});

test("server environment and build replace untrusted client values before persistence", async () => {
  let persisted = null;
  const response = await handleAnalyticsPost(request(), {
    enabled: true,
    serverContext: testServerContext,
    persist: async (canonicalEvent) => {
      persisted = canonicalEvent;
      return { ok: true, code: "stored" };
    },
  });
  assert.equal(response.status, 202);
  assert.deepEqual(await responseBody(response), { ok: true, code: "accepted" });
  assert.equal(persisted.environment, "test");
  assert.equal(persisted.build_id, "local-test");
  assert.equal(persisted.owner_mode, "anonymous");
});

test("server canonical context uses only allowlisted server/Vercel values and fixed fallbacks", () => {
  assert.deepEqual(getServerAnalyticsContext({ NODE_ENV: "test" }), testServerContext);
  assert.deepEqual(getServerAnalyticsContext({
    NODE_ENV: "production",
    VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_SHA: "abc123",
  }), { environment: "preview", buildId: "abc123" });
  assert.deepEqual(getServerAnalyticsContext({
    NODE_ENV: "production",
    VERCEL_ENV: "attacker-value",
    VERCEL_GIT_COMMIT_SHA: "bad build id!",
  }), { environment: "production", buildId: "server-build-unavailable" });
});

test("ingestion rejects malformed, unknown-key, oversized, media-type, and origin failures", async () => {
  const persist = async () => { throw new Error("must not persist"); };
  const cases = [
    [request("{"), 400, "invalid_event"],
    [request({ ...event(), email: "private@example.test" }), 400, "invalid_event"],
    [request("x".repeat(1025)), 413, "request_too_large"],
    [request(event(), { headers: { "Content-Type": "text/plain" } }), 415, "unsupported_media_type"],
    [request(event(), { headers: { Origin: "https://cross-origin.example" } }), 403, "invalid_origin"],
    [request(event(), { headers: { "Sec-Fetch-Site": "cross-site" } }), 403, "invalid_origin"],
    [request(event(), { headers: { Origin: "" } }), 403, "invalid_origin"],
  ];
  for (const [candidate, status, code] of cases) {
    const response = await handleAnalyticsPost(candidate, {
      enabled: true,
      persist,
      serverContext: testServerContext,
    });
    assert.equal(response.status, status);
    assert.equal((await responseBody(response)).code, code);
  }
});

test("duplicate IDs are idempotent success and persistence failures stay fixed and sanitized", async () => {
  const duplicate = await handleAnalyticsPost(request(), {
    enabled: true,
    serverContext: testServerContext,
    persist: async () => ({ ok: true, code: "duplicate" }),
  });
  assert.equal(duplicate.status, 202);
  assert.deepEqual(await responseBody(duplicate), { ok: true, code: "accepted" });

  for (const code of ["not_configured", "schema_unavailable", "network_failure", "temporarily_unavailable"]) {
    const failure = await handleAnalyticsPost(request(), {
      enabled: true,
      serverContext: testServerContext,
      persist: async () => ({ ok: false, code }),
    });
    assert.equal(failure.status, 503);
    assert.deepEqual(await responseBody(failure), { ok: false, code });
  }

  const thrown = await handleAnalyticsPost(request(), {
    enabled: true,
    serverContext: testServerContext,
    persist: async () => { throw new Error("RAW_DATABASE_PROVIDER_SECRET"); },
  });
  const text = await thrown.text();
  assert.equal(thrown.status, 503);
  assert.equal(text.includes("RAW_DATABASE_PROVIDER_SECRET"), false);

  const invalid = await handleAnalyticsPost(request(), {
    enabled: true,
    serverContext: testServerContext,
    persist: async () => ({ ok: false, code: "invalid_event" }),
  });
  assert.equal(invalid.status, 400);
  assert.deepEqual(await responseBody(invalid), { ok: false, code: "invalid_event" });
});

test("write-only repository maps duplicate, schema, network, and unknown errors to fixed codes", async () => {
  const cases = [
    [null, { ok: true, code: "stored" }],
    [{ code: "23505" }, { ok: true, code: "duplicate" }],
    [{ code: "42P01" }, { ok: false, code: "schema_unavailable" }],
    [{ code: "PGRST205" }, { ok: false, code: "schema_unavailable" }],
    [{ status: 0 }, { ok: false, code: "network_failure" }],
    [{ code: "RAW_SECRET" }, { ok: false, code: "temporarily_unavailable" }],
  ];
  for (const [error, expected] of cases) {
    const repository = createAnalyticsEventRepository({
      insert: async () => ({ error }),
    });
    assert.deepEqual(await repository.persist(event()), expected);
    assert.equal("list" in repository, false);
    assert.equal("read" in repository, false);
  }
  const network = createAnalyticsEventRepository({
    insert: async () => { throw new Error("RAW_NETWORK_SECRET"); },
  });
  assert.deepEqual(await network.persist(event()), { ok: false, code: "network_failure" });
});

test("repository rejects malformed, inherited, accessor, proxy, hostile, and unknown input before writer", async () => {
  let writes = 0;
  const repository = createAnalyticsEventRepository({
    async insert() { writes += 1; return { error: null }; },
  });
  class EventClass { constructor() { Object.assign(this, event()); } }
  const accessor = { ...event() };
  Object.defineProperty(accessor, "event_id", {
    enumerable: true,
    get() { throw new Error("RAW_ACCESSOR_SECRET"); },
  });
  const inherited = Object.create(event());
  const proxy = new Proxy({}, {
    ownKeys() { throw new Error("RAW_PROXY_SECRET"); },
  });
  const candidates = [
    undefined,
    null,
    [],
    new EventClass(),
    inherited,
    { ...event(), unknown: "RAW_UNKNOWN_SECRET" },
    { ...event(), event_id: "not-a-uuid" },
    { ...event(), occurred_at: "not-a-time" },
    { ...event(), environment: "staging" },
    { ...event(), owner_mode: "person" },
    { ...event(), properties: [] },
    { ...event(), properties: { persistence_path: "browser", feedback_type: "idea", extra: true } },
    accessor,
    proxy,
  ];

  for (const candidate of candidates) {
    assert.deepEqual(
      await repository.persist(candidate),
      { ok: false, code: "invalid_event" },
    );
  }
  assert.equal(writes, 0);
});

test("repository writes only validator-owned frozen data and later mutation cannot change it", async () => {
  let writerEvent = null;
  let releaseWriter;
  const writerGate = new Promise((resolve) => { releaseWriter = resolve; });
  let writes = 0;
  const repository = createAnalyticsEventRepository({
    async insert(canonicalEvent) {
      writes += 1;
      writerEvent = canonicalEvent;
      await writerGate;
      return { error: null };
    },
  });
  const original = event({
    properties: { persistence_path: "browser", feedback_type: "idea" },
  });
  const persistence = repository.persist(original);
  original.owner_mode = "account";
  original.properties.feedback_type = "bug";

  assert.notEqual(writerEvent, original);
  assert.notEqual(writerEvent.properties, original.properties);
  assert.equal(Object.isFrozen(writerEvent), true);
  assert.equal(Object.isFrozen(writerEvent.properties), true);
  assert.equal(writerEvent.owner_mode, "anonymous");
  assert.equal(writerEvent.properties.feedback_type, "idea");
  releaseWriter();
  assert.deepEqual(await persistence, { ok: true, code: "stored" });
  assert.equal(writes, 1);
});

test("event payloads contain no prohibited key or sensitive content", () => {
  const payload = event();
  const serialized = JSON.stringify(payload);
  const keys = collectKeys(payload);
  const prohibited = [
    "user_id", "account_id", "email", "name", "phone", "ip", "user_agent",
    "cookie", "authorization", "access_token", "refresh_token", "resume_text",
    "file_name", "jd_text", "company_name", "role_title", "mission_title",
    "feedback_body", "score", "proof_text", "session_id", "visitor_id",
  ];
  for (const key of prohibited) assert.equal(keys.has(key), false, key);
  assert.equal(serialized.includes("Synthetic private feedback body"), false);
});

function collectKeys(value, output = new Set()) {
  if (!value || typeof value !== "object") return output;
  for (const [key, child] of Object.entries(value)) {
    output.add(key);
    collectKeys(child, output);
  }
  return output;
}

test("SQL table, RLS, grants, constraints, and indexes enforce the repository-only contract", () => {
  const sqlPath = path.join(repoRoot, "supabase/schema_v5_analytics_events.sql");
  const sql = fs.readFileSync(sqlPath, "utf8").toLowerCase();
  assert.match(sql, /create table public\.analytics_events/);
  assert.match(sql, /event_id uuid primary key/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /force row level security/);
  assert.match(sql, /revoke all on table public\.analytics_events from public, anon, authenticated/);
  assert.match(sql, /grant insert on table public\.analytics_events to service_role/);
  assert.equal(/grant\s+[^;]+\s+to\s+(?:anon|authenticated)/.test(sql), false);
  assert.equal(/create policy/.test(sql), false);
  assert.match(sql, /jsonb_typeof\(properties\) = 'object'/);
  assert.match(sql, /analytics_events_event_name_check/);
  assert.match(sql, /analytics_events_event_version_check/);
  assert.match(sql, /analytics_events_environment_check/);
  assert.match(sql, /analytics_events_source_screen_check/);
  assert.match(sql, /analytics_events_owner_mode_check/);
  assert.match(sql, /received_at timestamptz not null default now\(\)/);
  assert.equal(sql.includes("timezone('utc', now())"), false);
  assert.match(sql, /analytics_events_received_at_idx\s+on public\.analytics_events\(received_at desc\)/);
  assert.match(sql, /analytics_events_event_name_received_at_idx\s+on public\.analytics_events\(event_name, received_at desc\)/);
  assert.match(sql, /analytics_events_environment_received_at_idx\s+on public\.analytics_events\(environment, received_at desc\)/);
  assert.equal(/create index[^;]+occurred_at/gs.test(sql), false);
  assert.equal(/grant\s+select/i.test(sql), false);
  assert.equal(/create\s+(?:or replace\s+)?function/i.test(sql), false);
  assert.equal(/create\s+trigger/i.test(sql), false);
  assert.equal(/foreign key|references\s+(?:auth|public)\./i.test(sql), false);
  for (const forbiddenColumn of ["user_id", "email", "ip_address", "user_agent", "session_id", "visitor_id"]) {
    assert.equal(new RegExp(`\\b${forbiddenColumn}\\s+(?:uuid|text|inet)`).test(sql), false, forbiddenColumn);
  }
});

test("analytics repository is server-only and client components cannot import it", () => {
  const repositoryPath = path.join(repoRoot, "src/modules/analytics/services/analyticsEventRepository.ts");
  assert.match(fs.readFileSync(repositoryPath, "utf8"), /import "server-only"/);
  for (const filename of walk(path.join(repoRoot, "src"))) {
    if (!/\.(?:ts|tsx)$/.test(filename)) continue;
    const source = fs.readFileSync(filename, "utf8");
    if (!source.trimStart().startsWith('"use client"')) continue;
    assert.equal(source.includes("analyticsEventRepository"), false, filename);
  }
});

function walk(root) {
  const output = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const filename = path.join(root, entry.name);
    if (entry.isDirectory()) output.push(...walk(filename));
    else output.push(filename);
  }
  return output;
}

let passed = 0;
for (const [index, fixture] of tests.entries()) {
  try {
    await fixture.callback();
    passed += 1;
    console.log(`PASS ${String(index + 1).padStart(2, "0")} ${fixture.name}`);
  } catch (error) {
    console.error(`FAIL ${String(index + 1).padStart(2, "0")} ${fixture.name}`);
    throw error;
  }
}

console.log(`PASS ${passed}/${tests.length} analytics runtime fixtures`);
console.log("Repository-only proof: no live Supabase project, production endpoint, migration command, or third-party analytics provider was contacted.");
