import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const analyticsRoot = path.join(repoRoot, "src/platform/analytics");

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

const analytics = require(path.join(analyticsRoot, "index.ts"));
const { MemoryAnalyticsSink } = require(path.join(analyticsRoot, "testing.ts"));

const EXPECTED_EVENTS = [
  "career_setup_started",
  "resume_analysis_started",
  "resume_analysis_failed",
  "active_target_selected",
  "active_target_cleared",
  "jd_match_started",
  "jd_match_completed",
  "roadmap_reached",
  "mission_started",
  "mission_marked_done",
  "analysis_restored",
  "feedback_persisted",
  "product_operation_failed",
];
const DEFERRED_EVENTS = [
  "product_session_started",
  "career_setup_completed",
  "resume_analysis_completed",
  "onboarding_started",
  "onboarding_completed",
  "return_session",
  "workflow_abandoned",
  "mission_completed",
  "useful_feedback_submitted",
];
const VALID_PROPERTIES = {
  career_setup_started: { setup_mode: "create" },
  resume_analysis_started: { file_type: "pdf" },
  resume_analysis_failed: {
    file_type: "docx",
    error_code: "text_extraction_failed",
    duration_bucket: "5s_to_15s",
  },
  active_target_selected: {
    target_source: "profile_fit",
    selection_kind: "created",
  },
  active_target_cleared: { prior_target_source: "manual" },
  jd_match_started: {},
  jd_match_completed: { duration_bucket: "15s_to_60s" },
  roadmap_reached: { path_source: "ultimate_goal" },
  mission_started: {
    mission_category: "skill_backing",
    path_source: "profile_fit",
  },
  mission_marked_done: {
    mission_category: "proof",
    path_source: "global",
  },
  analysis_restored: { restore_kind: "selected" },
  feedback_persisted: {
    persistence_path: "browser_fallback",
    feedback_type: "confusion",
  },
  product_operation_failed: {
    operation: "feedback_persistence",
    error_code: "storage_write_failed",
    duration_bucket: "under_1s",
  },
};
const EXPORTED_CATALOG_NAMES = [
  "ANALYTICS_EVENT_NAMES",
  "ANALYTICS_ENVIRONMENTS",
  "ANALYTICS_SOURCE_SCREENS",
  "ANALYTICS_OWNER_MODES",
  "ANALYTICS_FILE_TYPES",
  "ANALYTICS_DURATION_BUCKETS",
  "ANALYTICS_TARGET_SOURCES",
  "ANALYTICS_PATH_SOURCES",
  "ANALYTICS_MISSION_CATEGORIES",
  "ANALYTICS_FEEDBACK_TYPES",
  "ANALYTICS_FEEDBACK_PERSISTENCE_PATHS",
  "ANALYTICS_RESUME_ERROR_CODES",
  "ANALYTICS_OPERATION_ERROR_CODES",
  "ANALYTICS_PRODUCT_OPERATIONS",
];
const tests = [];

function test(name, callback) {
  tests.push({ name, callback });
}

function eventId(index = 1) {
  return `00000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
}

function envelope(eventName, properties, overrides = {}) {
  return {
    event_id: eventId(),
    event_name: eventName,
    event_version: 1,
    occurred_at: "2026-07-19T10:20:30.000Z",
    environment: "test",
    build_id: "fixture-build_1.0",
    source_screen: "dashboard",
    owner_mode: "anonymous",
    properties,
    ...overrides,
  };
}

function emitInput(eventName = "jd_match_started", properties = {}) {
  return {
    eventId: eventId(),
    eventName,
    sourceScreen: "jd_match",
    ownerMode: "anonymous",
    properties,
  };
}

function assertRejected(value, expectedCode) {
  const result = analytics.validateAnalyticsEvent(value);
  assert.equal(result.ok, false);
  if (expectedCode) assert.equal(result.code, expectedCode);
  return result;
}

function emitter(sink, overrides = {}) {
  return analytics.createAnalyticsEmitter({
    environment: "test",
    buildId: "fixture-build",
    clock: () => new Date("2026-07-19T10:20:30.000Z"),
    sink,
    ...overrides,
  });
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

test("accepted event catalog is exact", () => {
  assert.deepEqual([...analytics.ANALYTICS_EVENT_NAMES], EXPECTED_EVENTS);
});

test("every exported catalog is runtime-frozen and mutation-safe", () => {
  for (const name of EXPORTED_CATALOG_NAMES) {
    const catalog = analytics[name];
    const before = [...catalog];
    assert.equal(Object.isFrozen(catalog), true, name);
    assert.throws(() => catalog.push("injected_unknown_value"), TypeError, name);
    assert.throws(() => catalog.splice(0, 0, "injected_unknown_value"), TypeError, name);
    assert.throws(() => { catalog[0] = "injected_unknown_value"; }, TypeError, name);
    assert.deepEqual([...catalog], before, name);
  }

  assertRejected(
    envelope("injected_unknown_event", {}),
    "invalid_event_name",
  );
  assertRejected(
    envelope("jd_match_started", {}, { owner_mode: "unresolved" }),
    "invalid_owner_mode",
  );
});

test("deferred event names are rejected", () => {
  for (const name of DEFERRED_EVENTS) {
    assertRejected(envelope(name, {}), "invalid_event_name");
  }
});

test("every accepted event has a valid executable example", () => {
  for (const name of EXPECTED_EVENTS) {
    const result = analytics.validateAnalyticsEvent(
      envelope(name, VALID_PROPERTIES[name]),
    );
    assert.equal(result.ok, true, name);
    assert.equal(Object.isFrozen(result.event), true);
    assert.equal(Object.isFrozen(result.event.properties), true);
  }
});

test("unknown envelope and event properties fail closed", () => {
  assertRejected(
    { ...envelope("jd_match_started", {}), extra: "value" },
    "unknown_property",
  );
  assertRejected(
    envelope("jd_match_started", { extra: "value" }),
    "unknown_property",
  );
});

test("missing envelope and required properties fail closed", () => {
  const missingEnvelopeKey = envelope("jd_match_started", {});
  delete missingEnvelopeKey.build_id;
  assertRejected(missingEnvelopeKey, "missing_property");
  assertRejected(
    envelope("resume_analysis_started", {}),
    "missing_property",
  );
});

test("invalid enums are rejected exactly", () => {
  assertRejected(
    envelope("career_setup_started", { setup_mode: "new" }),
    "invalid_property_value",
  );
  assertRejected(
    envelope("mission_started", {
      mission_category: "custom",
      path_source: "profile_fit",
    }),
    "invalid_property_value",
  );
});

test("nested objects and arrays cannot occupy fixed-enum properties", () => {
  assertRejected(
    envelope("career_setup_started", { setup_mode: { text: "create" } }),
    "invalid_property_value",
  );
  assertRejected(
    envelope("resume_analysis_started", { file_type: ["pdf"] }),
    "invalid_property_value",
  );
});

test("symbol keys are rejected", () => {
  const value = envelope("jd_match_started", {});
  value[Symbol("private")] = "secret";
  assertRejected(value, "symbol_key");
});

test("accessors are rejected without invoking getters", () => {
  let getterCalls = 0;
  const properties = {};
  Object.defineProperty(properties, "duration_bucket", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return "under_1s";
    },
  });
  assertRejected(
    envelope("jd_match_completed", properties),
    "accessor_property",
  );
  assert.equal(getterCalls, 0);
});

test("hostile throwing objects and proxies return only a fixed code", () => {
  const secret = "SECRET_PROVIDER_PAYLOAD";
  const hostile = new Proxy({}, {
    getPrototypeOf() {
      throw new Error(secret);
    },
  });
  const result = assertRejected(hostile, "hostile_object");
  assert.equal(JSON.stringify(result).includes(secret), false);

  const hostileProperties = new Proxy({}, {
    ownKeys() {
      throw new Error(secret);
    },
  });
  assertRejected(
    envelope("jd_match_started", hostileProperties),
    "hostile_object",
  );
});

test("a hostile thrown Proxy cannot escape caught-value classification", () => {
  const secret = "SECRET_THROWN_PROXY_PAYLOAD";
  const secondHostileProxy = new Proxy({}, {
    getPrototypeOf() {
      throw new Error(secret);
    },
  });
  const thrownHostileProxy = new Proxy({}, {
    getPrototypeOf() {
      throw secondHostileProxy;
    },
  });
  const input = new Proxy({}, {
    getPrototypeOf() {
      throw thrownHostileProxy;
    },
  });

  let result;
  assert.doesNotThrow(() => {
    result = analytics.validateAnalyticsEvent(input);
  });
  assert.deepEqual(result, { ok: false, code: "hostile_object" });
  assert.equal(JSON.stringify(result).includes(secret), false);
});

test("inherited enumerable properties are rejected", () => {
  Object.defineProperty(Object.prototype, "analytics_fixture_inherited", {
    configurable: true,
    enumerable: true,
    value: "secret",
  });
  try {
    assertRejected(
      envelope("jd_match_started", {}),
      "inherited_property",
    );
  } finally {
    delete Object.prototype.analytics_fixture_inherited;
  }
});

test("class instances are not plain data objects", () => {
  assertRejected(new (class EventLike {})(), "non_plain_object");
  assertRejected(
    envelope("jd_match_started", new (class Properties {})()),
    "non_plain_object",
  );
});

test("malformed event IDs are rejected", () => {
  for (const id of [
    "not-a-uuid",
    "00000000-0000-0000-0000-000000000000",
    "00000000-0000-4000-7000-000000000001",
    "00000000-0000-4000-8000-00000000000A",
  ]) {
    assertRejected(
      envelope("jd_match_started", {}, { event_id: id }),
      "invalid_event_id",
    );
  }
});

test("timestamps must be exact valid UTC millisecond ISO values", () => {
  for (const occurredAt of [
    "2026-07-19T10:20:30Z",
    "2026-07-19T10:20:30.000+00:00",
    "2026-02-30T10:20:30.000Z",
    "not-a-date",
  ]) {
    assertRejected(
      envelope("jd_match_started", {}, { occurred_at: occurredAt }),
      "invalid_timestamp",
    );
  }
});

test("environment is explicit and exact", () => {
  for (const environment of ["staging", "TEST", undefined]) {
    assertRejected(
      envelope("jd_match_started", {}, { environment }),
      "invalid_environment",
    );
  }
});

test("build IDs are bounded safe ASCII labels", () => {
  for (const buildId of [
    "",
    "a".repeat(65),
    "release/1",
    "white space",
    "déploy",
  ]) {
    assertRejected(
      envelope("jd_match_started", {}, { build_id: buildId }),
      "invalid_build_id",
    );
  }
  assert.equal(
    analytics.validateAnalyticsEvent(
      envelope("jd_match_started", {}, { build_id: "a".repeat(64) }),
    ).ok,
    true,
  );
});

test("unresolved owner mode is rejected", () => {
  for (const ownerMode of ["unresolved", null, undefined]) {
    assertRejected(
      envelope("jd_match_started", {}, { owner_mode: ownerMode }),
      "invalid_owner_mode",
    );
  }
});

test("raw routes and URLs cannot replace source-screen enums", () => {
  for (const sourceScreen of [
    "/dashboard",
    "/roadmap?source=jd",
    "https://example.test/dashboard",
    "dashboard#score",
  ]) {
    assertRejected(
      envelope("jd_match_started", {}, { source_screen: sourceScreen }),
      "invalid_source_screen",
    );
  }
});

test("the prohibited-key corpus is rejected as unknown data", () => {
  const prohibitedKeys = [
    "resume_text", "parsed_profile", "job_description", "evidence",
    "project_content", "feedback_body", "name", "email", "phone",
    "address", "account_uuid", "auth_id", "token", "filename", "url",
    "route", "query_string", "referrer", "storage_key", "storage_value",
    "exported_data", "career_iq", "proof_confidence", "jd_match_score",
    "role_score", "free_text", "provider_error", "error_message", "stack",
    "request_body", "response_body", "ip_address", "user_agent", "hash",
    "mission_id", "target_id", "report_id", "database_id",
  ];
  for (const key of prohibitedKeys) {
    assertRejected(
      envelope("jd_match_started", { [key]: "SECRET" }),
      "unknown_property",
    );
  }
});

test("free-form property values are rejected and never echoed", () => {
  const secret = "A user's free-form private content";
  const result = assertRejected(
    envelope("career_setup_started", { setup_mode: secret }),
    "invalid_property_value",
  );
  assert.equal(JSON.stringify(result).includes(secret), false);
});

test("raw Error and provider content cannot escape validation results", () => {
  const secret = "SECRET raw provider response";
  const error = new Error(secret);
  error.stack = `STACK ${secret}`;
  const result = assertRejected(
    envelope("product_operation_failed", {
      operation: "jd_match",
      error_code: error,
    }),
    "invalid_property_value",
  );
  assert.deepEqual(result, { ok: false, code: "invalid_property_value" });
  assert.equal(JSON.stringify(result).includes(secret), false);
});

test("the serialized event-size ceiling bounds the closed schema", () => {
  const largestValid = envelope(
    "product_operation_failed",
    {
      operation: "active_target_selection",
      error_code: "operation_unavailable",
      duration_bucket: "15s_to_60s",
    },
    {
      event_id: "ffffffff-ffff-8fff-bfff-ffffffffffff",
      build_id: "z".repeat(64),
      source_screen: "reset_password",
      owner_mode: "anonymous",
      environment: "development",
    },
  );
  assert.equal(analytics.validateAnalyticsEvent(largestValid).ok, true);
  assert.ok(JSON.stringify(largestValid).length <= analytics.MAX_ANALYTICS_EVENT_BYTES);

  const oversizeAttempt = envelope(
    "jd_match_started",
    {},
    { build_id: "z".repeat(analytics.MAX_ANALYTICS_EVENT_BYTES) },
  );
  assert.ok(JSON.stringify(oversizeAttempt).length > analytics.MAX_ANALYTICS_EVENT_BYTES);
  assertRejected(oversizeAttempt, "invalid_build_id");
});

test("the no-op sink succeeds without retaining or changing events", async () => {
  const validated = analytics.validateAnalyticsEvent(
    envelope("jd_match_started", {}),
  );
  assert.equal(validated.ok, true);
  await analytics.noOpAnalyticsSink.write(validated.event);
  await analytics.noOpAnalyticsSink.write(validated.event);
  assert.deepEqual(Object.keys(analytics.noOpAnalyticsSink), ["write"]);
  assert.equal(Object.isFrozen(validated.event), true);
});

test("one valid event reaches a sink exactly once", async () => {
  const sink = new MemoryAnalyticsSink();
  const result = await emitter(sink).emit(emitInput());
  assert.deepEqual(result, { ok: true, code: "emitted" });
  assert.equal(sink.snapshot().length, 1);
});

test("emitter configuration fields are snapshotted at creation", async () => {
  let deliveredEvent;
  let originalWrites = 0;
  let replacementWrites = 0;
  let replacedMethodWrites = 0;
  let preservedThis = false;
  const originalSink = {
    write(event) {
      preservedThis = this === originalSink;
      originalWrites += 1;
      deliveredEvent = event;
    },
  };
  const configuration = {
    environment: "test",
    buildId: "snapshot-build",
    clock: () => new Date("2026-07-19T10:20:30.000Z"),
    sink: originalSink,
  };
  const subject = analytics.createAnalyticsEmitter(configuration);

  configuration.environment = "production";
  configuration.buildId = "mutated-build";
  configuration.clock = () => { throw new Error("SECRET mutated clock"); };
  configuration.sink = { write() { replacementWrites += 1; } };
  originalSink.write = function replacedWrite() {
    replacedMethodWrites += 1;
  };

  assert.deepEqual(await subject.emit(emitInput()), { ok: true, code: "emitted" });
  assert.equal(replacementWrites, 0);
  assert.equal(replacedMethodWrites, 0);
  assert.equal(originalWrites, 1);
  assert.equal(preservedThis, true);
  assert.equal(deliveredEvent.environment, "test");
  assert.equal(deliveredEvent.build_id, "snapshot-build");
  assert.equal(deliveredEvent.occurred_at, "2026-07-19T10:20:30.000Z");
});

test("synchronous same-ID sink re-entry shares one successful delivery", async () => {
  const input = emitInput();
  let subject;
  let reentrant;
  let writes = 0;
  const sink = {
    write() {
      writes += 1;
      if (writes === 1) reentrant = subject.emit(input);
    },
  };
  subject = emitter(sink);

  const outer = subject.emit(input);
  await Promise.resolve();
  assert.ok(reentrant);
  const [outerResult, reentrantResult] = await Promise.all([outer, reentrant]);
  assert.equal(writes, 1);
  assert.deepEqual(outerResult, { ok: true, code: "emitted" });
  assert.strictEqual(reentrantResult, outerResult);
});

test("synchronous same-ID re-entrant failure is shared and retryable", async () => {
  const input = emitInput();
  const secret = "SECRET re-entrant sink failure";
  let subject;
  let reentrant;
  let writes = 0;
  const sink = {
    write() {
      writes += 1;
      if (writes === 1) {
        reentrant = subject.emit(input);
        throw new Error(secret);
      }
    },
  };
  subject = emitter(sink);

  const outer = subject.emit(input);
  await Promise.resolve();
  assert.ok(reentrant);
  const [outerResult, reentrantResult] = await Promise.all([outer, reentrant]);
  assert.equal(writes, 1);
  assert.deepEqual(outerResult, { ok: false, code: "sink_failure" });
  assert.strictEqual(reentrantResult, outerResult);
  assert.equal(JSON.stringify(outerResult).includes(secret), false);

  assert.deepEqual(await subject.emit(input), { ok: true, code: "emitted" });
  assert.equal(writes, 2);
});

test("concurrent same-ID success shares one write and one result", async () => {
  const gate = deferred();
  let writes = 0;
  const subject = emitter({
    write() {
      writes += 1;
      return gate.promise;
    },
  });

  const first = subject.emit(emitInput());
  const second = subject.emit(emitInput());
  await Promise.resolve();
  assert.equal(writes, 1);
  gate.resolve();
  const [firstResult, secondResult] = await Promise.all([first, second]);
  assert.deepEqual(firstResult, { ok: true, code: "emitted" });
  assert.strictEqual(secondResult, firstResult);
  assert.equal(writes, 1);
});

test("concurrent same-ID failure is shared and remains retryable", async () => {
  const gate = deferred();
  const secret = "SECRET delayed sink failure";
  let writes = 0;
  const subject = emitter({
    write() {
      writes += 1;
      return writes === 1 ? gate.promise : undefined;
    },
  });

  const first = subject.emit(emitInput());
  const second = subject.emit(emitInput());
  await Promise.resolve();
  assert.equal(writes, 1);
  gate.reject(new Error(secret));
  const [firstResult, secondResult] = await Promise.all([first, second]);
  assert.deepEqual(firstResult, { ok: false, code: "sink_failure" });
  assert.strictEqual(secondResult, firstResult);
  assert.equal(JSON.stringify(firstResult).includes(secret), false);

  assert.deepEqual(await subject.emit(emitInput()), { ok: true, code: "emitted" });
  assert.equal(writes, 2);
});

test("different event IDs may remain in flight independently", async () => {
  const gates = new Map();
  const writes = [];
  const subject = emitter({
    write(event) {
      const gate = deferred();
      writes.push(event.event_id);
      gates.set(event.event_id, gate);
      return gate.promise;
    },
  });
  const firstId = eventId(1);
  const secondId = eventId(2);
  const first = subject.emit({ ...emitInput(), eventId: firstId });
  const second = subject.emit({ ...emitInput(), eventId: secondId });
  await Promise.resolve();
  assert.deepEqual(writes, [firstId, secondId]);

  gates.get(secondId).resolve();
  gates.get(firstId).resolve();
  assert.deepEqual(await Promise.all([first, second]), [
    { ok: true, code: "emitted" },
    { ok: true, code: "emitted" },
  ]);
});

test("in-flight event-ID state is bounded and recovers capacity", async () => {
  const gate = deferred();
  let writes = 0;
  const subject = emitter({
    write() {
      writes += 1;
      return gate.promise;
    },
  });
  const pending = [];
  for (let index = 1; index <= analytics.ANALYTICS_IN_FLIGHT_ID_CAPACITY; index += 1) {
    pending.push(subject.emit({ ...emitInput(), eventId: eventId(index) }));
  }
  await Promise.resolve();
  assert.equal(writes, analytics.ANALYTICS_IN_FLIGHT_ID_CAPACITY);

  const overflowId = eventId(analytics.ANALYTICS_IN_FLIGHT_ID_CAPACITY + 1);
  assert.deepEqual(
    await subject.emit({ ...emitInput(), eventId: overflowId }),
    { ok: false, code: "emitter_capacity" },
  );
  assert.equal(writes, analytics.ANALYTICS_IN_FLIGHT_ID_CAPACITY);

  gate.resolve();
  const completed = await Promise.all(pending);
  assert.equal(completed.every((result) => result.code === "emitted"), true);
  assert.deepEqual(
    await subject.emit({ ...emitInput(), eventId: overflowId }),
    { ok: true, code: "emitted" },
  );
  assert.equal(writes, analytics.ANALYTICS_IN_FLIGHT_ID_CAPACITY + 1);
});

test("a successfully emitted same-ID duplicate is ignored", async () => {
  const sink = new MemoryAnalyticsSink();
  const subject = emitter(sink);
  assert.deepEqual(await subject.emit(emitInput()), { ok: true, code: "emitted" });
  assert.deepEqual(await subject.emit(emitInput()), { ok: true, code: "duplicate" });
  assert.equal(sink.snapshot().length, 1);
});

test("sink failure does not mark an event ID successful", async () => {
  const sink = new MemoryAnalyticsSink({ failOnce: true });
  const subject = emitter(sink);
  assert.deepEqual(await subject.emit(emitInput()), { ok: false, code: "sink_failure" });
  assert.equal(sink.snapshot().length, 0);
});

test("same-ID retry succeeds after one sink failure", async () => {
  const sink = new MemoryAnalyticsSink({ failOnce: true });
  const subject = emitter(sink);
  assert.deepEqual(await subject.emit(emitInput()), { ok: false, code: "sink_failure" });
  assert.deepEqual(await subject.emit(emitInput()), { ok: true, code: "emitted" });
  assert.equal(sink.snapshot().length, 1);
});

test("different successful event IDs both reach the sink", async () => {
  const sink = new MemoryAnalyticsSink();
  const subject = emitter(sink);
  await subject.emit(emitInput());
  await subject.emit({ ...emitInput(), eventId: eventId(2) });
  assert.equal(sink.snapshot().length, 2);
});

test("successful event-ID deduplication remains bounded", async () => {
  let writes = 0;
  const subject = emitter({ write() { writes += 1; } });
  for (let index = 1; index <= analytics.ANALYTICS_SUCCESSFUL_ID_CAPACITY + 1; index += 1) {
    const result = await subject.emit({ ...emitInput(), eventId: eventId(index) });
    assert.equal(result.code, "emitted");
  }
  const retryEvicted = await subject.emit({ ...emitInput(), eventId: eventId(1) });
  assert.deepEqual(retryEvicted, { ok: true, code: "emitted" });
  assert.equal(writes, analytics.ANALYTICS_SUCCESSFUL_ID_CAPACITY + 2);
});

test("the emitter never throws for malformed input, clock, or sink failure", async () => {
  const secret = "SECRET sink provider failure";
  const badInputs = [null, [], new Proxy({}, { get() { throw new Error(secret); } })];
  for (const input of badInputs) {
    const result = await emitter({ write() {} }).emit(input);
    assert.equal(result.ok, false);
    assert.equal(JSON.stringify(result).includes(secret), false);
  }
  const clockResult = await emitter(
    { write() {} },
    { clock() { throw new Error(secret); } },
  ).emit(emitInput());
  assert.deepEqual(clockResult, {
    ok: false,
    code: "invalid_event",
    validationCode: "hostile_object",
  });
  const sinkResult = await emitter({ write() { throw new Error(secret); } }).emit(emitInput());
  assert.deepEqual(sinkResult, { ok: false, code: "sink_failure" });
  assert.equal(JSON.stringify(sinkResult).includes(secret), false);
});

test("memory sink snapshots are defensive, fresh, and immutable", async () => {
  const properties = { setup_mode: "create" };
  const sink = new MemoryAnalyticsSink();
  await emitter(sink).emit(emitInput("career_setup_started", properties));
  properties.setup_mode = "edit";

  const first = sink.snapshot();
  const second = sink.snapshot();
  assert.notEqual(first, second);
  assert.notEqual(first[0], second[0]);
  assert.notEqual(first[0].properties, second[0].properties);
  assert.equal(first[0].properties.setup_mode, "create");
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first[0]), true);
  assert.equal(Object.isFrozen(first[0].properties), true);
  assert.throws(() => first.push(first[0]), TypeError);
  assert.throws(() => { first[0].properties.setup_mode = "edit"; }, TypeError);
});

test("analytics foundation source contains no network, storage, provider, timer, or logging APIs", () => {
  const sourceFiles = fs.readdirSync(analyticsRoot)
    .filter((name) => name.endsWith(".ts"))
    .map((name) => fs.readFileSync(path.join(analyticsRoot, name), "utf8"))
    .join("\n");
  const forbiddenPatterns = [
    /\bfetch\s*\(/,
    /XMLHttpRequest/,
    /sendBeacon/,
    /\blocalStorage\b/,
    /\bsessionStorage\b/,
    /\bindexedDB\b/i,
    /document\.cookie/,
    /\bcookieStore\b/,
    /\bcookies?\s*\(/,
    /\bSupabase\b/i,
    /@vercel\/analytics/,
    /\bsetTimeout\s*\(/,
    /\bsetInterval\s*\(/,
    /\bconsole\s*\./,
  ];
  for (const pattern of forbiddenPatterns) {
    assert.equal(pattern.test(sourceFiles), false, pattern.toString());
  }
});

test("production analytics dependencies remain local and provider-free", () => {
  const productionFiles = fs.readdirSync(analyticsRoot)
    .filter((name) => name.endsWith(".ts") && name !== "testing.ts")
    .map((name) => path.join(analyticsRoot, name));
  const providerPattern = /(?:supabase|vercel|segment|posthog|mixpanel|amplitude|analytics-provider)/i;
  const importPattern = /(?:from\s+|import\s+(?:type\s+)?|import\s*\(\s*)["']([^"']+)["']/g;

  for (const filename of productionFiles) {
    const source = fs.readFileSync(filename, "utf8");
    for (const match of source.matchAll(importPattern)) {
      const specifier = match[1];
      assert.equal(specifier.startsWith("./"), true, `${filename}: ${specifier}`);
      assert.equal(providerPattern.test(specifier), false, `${filename}: ${specifier}`);
      const resolved = path.resolve(path.dirname(filename), specifier);
      const relative = path.relative(analyticsRoot, resolved);
      assert.equal(relative.startsWith("..") || path.isAbsolute(relative), false, `${filename}: ${specifier}`);
      assert.notEqual(path.basename(resolved), "testing", `${filename}: ${specifier}`);
    }
  }
});

test("the production analytics index excludes testing utilities", () => {
  const indexSource = fs.readFileSync(path.join(analyticsRoot, "index.ts"), "utf8");
  assert.equal(indexSource.includes("testing"), false);
  assert.equal(indexSource.includes("MemoryAnalyticsSink"), false);
  assert.equal("MemoryAnalyticsSink" in analytics, false);
});

test("product architecture roots do not import the contract-only analytics foundation", () => {
  const roots = [
    path.join(repoRoot, "src/app"),
    path.join(repoRoot, "src/components"),
    path.join(repoRoot, "src/modules"),
    path.join(repoRoot, "src/intelligence"),
    path.join(repoRoot, "src/lib"),
  ];
  for (const root of roots) {
    for (const filename of walkFiles(root)) {
      if (!/\.(?:ts|tsx)$/.test(filename)) continue;
      const source = fs.readFileSync(filename, "utf8");
      assert.equal(source.includes("platform/analytics"), false, filename);
    }
  }
});

function walkFiles(root) {
  if (!fs.existsSync(root)) return [];
  const output = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const filename = path.join(root, entry.name);
    if (entry.isDirectory()) output.push(...walkFiles(filename));
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

console.log(`PASS ${passed}/${tests.length} analytics contract fixtures`);
console.log(
  "This contract fixture proves only local event validation, no-op behavior, and process-scoped deduplication. It does not prove product callsite truth, cross-tab or network exactly-once behavior, retention, identity, deletion, database security, provider privacy, or production analytics readiness. Branch path-boundary verification is a pull-request/review concern, not a permanent historical-SHA assertion.",
);
