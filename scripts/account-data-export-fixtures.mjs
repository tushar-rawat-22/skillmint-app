import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(repoRoot, "src");
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveSkillMintAlias(
  request,
  parent,
  isMain,
  options,
) {
  return request.startsWith("@/")
    ? originalResolveFilename.call(
      this,
      path.join(srcRoot, request.slice(2)),
      parent,
      isMain,
      options,
    )
    : originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions[".ts"] = function compileTypeScript(module, filename) {
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const {
  ACCOUNT_EXPORT_LIMITS,
  buildAccountDataExportWithAdapter,
} = require("../src/modules/data-controls/services/accountDataRepository.ts");
const {
  ACCOUNT_EXPORT_TABLE_CONTRACTS,
  isValidAccountExportTimestamp,
} = require("../src/modules/data-controls/accountDataExportContract.ts");

const EXPECTED_USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_USER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const EXPORTED_AT = "2026-07-12T12:00:00.000Z";
const RAW_PROVIDER_FAILURE = "relation private_payload leaked raw provider detail";

const tests = [];

function test(name, callback) {
  tests.push({ name, callback });
}

test("central contracts declare the five known account tables", () => {
  assert.deepEqual(Object.keys(ACCOUNT_EXPORT_TABLE_CONTRACTS), [
    "profiles",
    "resume_analyses",
    "job_matches",
    "career_snapshots",
    "beta_feedback",
  ]);
  assert.equal(ACCOUNT_EXPORT_TABLE_CONTRACTS.career_snapshots.pagination, "count_only");
  assert.equal(ACCOUNT_EXPORT_TABLE_CONTRACTS.career_snapshots.reconstructRow, null);
});

test("empty valid account exports every table with zero integrity counts", async () => {
  const result = await build(createAdapter());
  assert.equal(result.ok, true);
  const payload = parseSuccess(result);
  for (const table of Object.keys(payload.manifest.tables)) {
    assert.equal(payload.manifest.tables[table].preCount, 0);
    assert.equal(payload.manifest.tables[table].exportedCount, 0);
    assert.equal(payload.manifest.tables[table].postCount, 0);
  }
  assert.deepEqual(payload.data.career_snapshots, []);
});

test("manifest reports only applicable pagination integrity checks", async () => {
  const payload = parseSuccess(await build(createAdapter()));
  const profilePagination = payload.manifest.tables.profiles.pagination;
  const careerPagination = payload.manifest.tables.career_snapshots.pagination;

  assert.deepEqual(profilePagination, {
    strategy: "none",
    queryCompleted: true,
    pagesFetched: 1,
  });
  assert.deepEqual(careerPagination, {
    strategy: "count_only",
    pagesFetched: 0,
  });
  for (const table of ["resume_analyses", "job_matches", "beta_feedback"]) {
    assert.deepEqual(payload.manifest.tables[table].pagination, {
      strategy: "id_keyset",
      pagesFetched: 1,
      everyPageValidated: true,
      terminatedNormally: true,
      duplicatePrimaryKeysObserved: false,
      monotonicCursorObserved: true,
    });
  }
  assert.equal("everyPageValidated" in profilePagination, false);
  assert.equal("terminatedNormally" in profilePagination, false);
  assert.equal("monotonicCursorObserved" in profilePagination, false);
  assert.equal("everyPageValidated" in careerPagination, false);
  assert.equal("terminatedNormally" in careerPagination, false);
  assert.equal("monotonicCursorObserved" in careerPagination, false);
});

test("an absent authenticated identity fails not_authenticated", async () => {
  const result = await build(createAdapter({ identitySequence: [null] }));
  assertFailure(result, "not_authenticated");
});

test("a UI-captured expected account must match provider identity before collection", async () => {
  const adapter = createAdapter({ identitySequence: [OTHER_USER_ID] });
  const result = await build(adapter, { expectedUserId: EXPECTED_USER_ID });
  assertFailure(result, "account_changed");
});

test("an invalid explicit expected account fails before any adapter call", async () => {
  let adapterCalls = 0;
  const adapter = {
    async getAuthenticatedUserId() {
      adapterCalls += 1;
      return { data: EXPECTED_USER_ID, error: null };
    },
    async getExactCount() {
      adapterCalls += 1;
      return { data: 0, error: null };
    },
    async getProfileRows() {
      adapterCalls += 1;
      return { data: [], error: null };
    },
    async getKeysetPage() {
      adapterCalls += 1;
      return { data: [], error: null };
    },
  };
  const result = await build(adapter, { expectedUserId: " not-a-uuid " });
  assertFailure(result, "not_authenticated");
  assert.equal(adapterCalls, 0);
});

test("one valid profile is reconstructed without its account id", async () => {
  const profile = createProfile({ id: EXPECTED_USER_ID, server_note: "hidden" });
  const result = await build(createAdapter({ profiles: [profile] }));
  const payload = parseSuccess(result);
  assert.equal(payload.data.profiles.length, 1);
  assert.equal(payload.data.profiles[0].full_name, profile.full_name);
  assert.equal(payload.data.profiles[0].id, undefined);
  assert.equal(payload.data.profiles[0].server_note, undefined);
});

test("a provider row owned by another account is rejected even after filtering", async () => {
  const result = await build(createAdapter({
    resume_analyses: [createResumeAnalysis(1, { user_id: OTHER_USER_ID })],
  }));
  assertFailure(result, "invalid_response");
});

test("more than 1000 rows paginate in deterministic ascending id order", async () => {
  const rows = Array.from({ length: 1_251 }, (_, index) =>
    createResumeAnalysis(index + 1));
  const result = await build(createAdapter({ resume_analyses: rows }));
  const payload = parseSuccess(result);
  assert.equal(payload.data.resume_analyses.length, 1_251);
  assert.equal(payload.manifest.tables.resume_analyses.pagination.pagesFetched, 6);
  assert.deepEqual(
    payload.data.resume_analyses.map((row) => row.id),
    [...rows].sort(compareRowsById).map((row) => row.id),
  );
});

test("duplicate primary id across pages fails without partial JSON", async () => {
  const one = createFeedback(1);
  const two = createFeedback(2);
  const three = createFeedback(3);
  const adapter = createAdapter({
    beta_feedback: [one, two, one, three],
    pageResolver(input, pageIndex) {
      if (input.tableName !== "beta_feedback") return undefined;
      return pageIndex === 0 ? [one, two] : [one, three];
    },
  });
  const result = await build(adapter, {
    limits: { pageSize: 2 },
  });
  assertFailure(result, "duplicate_rows");
});

test("repeated or non-increasing page cursor fails pagination_stalled", async () => {
  const one = createFeedback(1);
  const two = createFeedback(2);
  const adapter = createAdapter({
    beta_feedback: [one, two, createFeedback(3)],
    pageResolver(input) {
      return input.tableName === "beta_feedback" ? [one, two] : undefined;
    },
  });
  const result = await build(adapter, {
    limits: { pageSize: 2 },
  });
  assertFailure(result, "pagination_stalled");
});

test("malformed non-array page response fails invalid_response", async () => {
  const adapter = createAdapter({
    resume_analyses: [createResumeAnalysis(1)],
    pageResolver(input) {
      return input.tableName === "resume_analyses" ? { malformed: true } : undefined;
    },
  });
  assertFailure(await build(adapter), "invalid_response");
});

test("malformed provider row cannot become an empty successful object", async () => {
  const adapter = createAdapter({
    beta_feedback: [{ id: uuid(1), message: "missing documented fields" }],
  });
  assertFailure(await build(adapter), "invalid_response");
});

test("malformed nested resume data fails closed", async () => {
  const row = createResumeAnalysis(1);
  row.parsed_profile.links.github = 42;
  assertFailure(
    await build(createAdapter({ resume_analyses: [row] })),
    "invalid_response",
  );
});

test("malformed nested JD data and malformed roadmap fail closed", async () => {
  const badResult = createJobMatch(1);
  badResult.match_result.matchScore = "high";
  assertFailure(
    await build(createAdapter({ job_matches: [badResult] })),
    "invalid_response",
  );

  const badRoadmap = createJobMatch(2);
  badRoadmap.roadmap.thirtyDayPlan.tasks[0].priority = "Urgent";
  assertFailure(
    await build(createAdapter({ job_matches: [badRoadmap] })),
    "invalid_response",
  );
});

test("normalized sensitive unexpected nested keys fail closed", async () => {
  for (const key of [
    "accessToken",
    "refresh-token",
    "Raw Provider Error",
    "stack_trace",
    "user-id",
    "__proto__",
    "constructor",
  ]) {
    const row = createResumeAnalysis(1);
    Object.defineProperty(row.user_profile.github, key, {
      value: "must-not-export",
      enumerable: true,
      configurable: true,
    });
    assertFailure(
      await build(createAdapter({ resume_analyses: [row] })),
      "invalid_response",
    );
  }
});

test("documented user text containing status token and authorization is preserved", async () => {
  const text = "status token authorization are ordinary words in this feedback";
  const feedback = createFeedback(1, { message: text });
  const result = await build(createAdapter({ beta_feedback: [feedback] }));
  const payload = parseSuccess(result);
  assert.equal(payload.data.beta_feedback[0].message, text);
});

test("feedback moderation status and ownership fields are excluded", async () => {
  const feedback = createFeedback(1, {
    status: "internal-review",
    user_id: EXPECTED_USER_ID,
  });
  const payload = parseSuccess(
    await build(createAdapter({ beta_feedback: [feedback] })),
  );
  assert.equal(payload.data.beta_feedback[0].status, undefined);
  assert.equal(payload.data.beta_feedback[0].user_id, undefined);
});

test("profile cardinality violation fails closed after requesting two rows", async () => {
  const adapter = createAdapter({
    profiles: [createProfile(), createProfile({ full_name: "Duplicate" })],
  });
  assertFailure(await build(adapter), "cardinality_violation");
  assert.equal(adapter.observed.profileLimits[0], 2);
});

test("pre-count mismatch fails count_mismatch", async () => {
  const adapter = createAdapter({
    beta_feedback: [createFeedback(1)],
    countSequences: { beta_feedback: [2, 2] },
  });
  assertFailure(await build(adapter), "count_mismatch");
});

test("post-count mismatch fails count_mismatch", async () => {
  const adapter = createAdapter({
    beta_feedback: [createFeedback(1)],
    countSequences: { beta_feedback: [1, 2] },
  });
  assertFailure(await build(adapter), "count_mismatch");
});

test("one table query failure returns only fixed safe error copy", async () => {
  const adapter = createAdapter({
    queryErrors: {
      "page:job_matches": {
        message: RAW_PROVIDER_FAILURE,
        code: "opaque-provider-code",
      },
    },
  });
  const result = await build(adapter);
  assertFailure(result, "unknown");
  assert.equal(JSON.stringify(result).includes(RAW_PROVIDER_FAILURE), false);
});

test("opaque provider error plus response status 503 maps to network_failure", async () => {
  const result = await build(createOpaqueCountFailureAdapter(503));
  assertSafeProviderFailure(result, "network_failure");
});

test("opaque provider error plus response status 429 maps to network_failure", async () => {
  const result = await build(createOpaqueCountFailureAdapter(429));
  assertSafeProviderFailure(result, "network_failure");
});

test("opaque provider error plus response status 403 maps to permission_denied", async () => {
  const result = await build(createOpaqueCountFailureAdapter(403));
  assertSafeProviderFailure(result, "permission_denied");
});

test("opaque provider error without meaningful response status remains unknown", async () => {
  const result = await build(createOpaqueCountFailureAdapter());
  assertSafeProviderFailure(result, "unknown");
});

test("identity adapter synchronous throw resolves to a safe failure", async () => {
  const adapter = createAdapter();
  adapter.getAuthenticatedUserId = () => {
    throw new Error(RAW_PROVIDER_FAILURE);
  };
  assertSafeThrownFailure(await build(adapter), "unknown");
});

test("pre-count adapter throw resolves to a safe failure", async () => {
  const adapter = createAdapter();
  adapter.getExactCount = () => {
    throw new Error(`fetch timeout ${RAW_PROVIDER_FAILURE}`);
  };
  assertSafeThrownFailure(await build(adapter), "network_failure");
});

test("profile-row adapter throw resolves to a safe failure", async () => {
  const adapter = createAdapter({ profiles: [createProfile()] });
  adapter.getProfileRows = () => {
    throw new Error(RAW_PROVIDER_FAILURE);
  };
  assertSafeThrownFailure(await build(adapter), "unknown");
});

test("keyset page adapter rejection resolves without partial data", async () => {
  const adapter = createAdapter({
    profiles: [createProfile()],
    resume_analyses: [createResumeAnalysis(1)],
  });
  adapter.getKeysetPage = () =>
    Promise.reject(new Error(`network failed ${RAW_PROVIDER_FAILURE}`));
  const result = await build(adapter);
  assertSafeThrownFailure(result, "network_failure");
  assert.equal("data" in result, false);
});

test("post-count adapter throw resolves without returning collected rows", async () => {
  const adapter = createAdapter({ profiles: [createProfile()] });
  const getExactCount = adapter.getExactCount;
  let profileCountCalls = 0;
  adapter.getExactCount = (query) => {
    if (query.tableName === "profiles") {
      profileCountCalls += 1;
      if (profileCountCalls === 2) throw new Error(RAW_PROVIDER_FAILURE);
    }
    return getExactCount(query);
  };
  const result = await build(adapter);
  assertSafeThrownFailure(result, "unknown");
  assert.equal("data" in result, false);
});

test("account change between table collectors discards all data", async () => {
  const identities = Array(8).fill(EXPECTED_USER_ID);
  identities[3] = OTHER_USER_ID;
  const result = await build(createAdapter({ identitySequence: identities }));
  assertFailure(result, "account_changed");
});

test("account change immediately before final return discards serialized data", async () => {
  const identities = Array(8).fill(EXPECTED_USER_ID);
  identities[7] = OTHER_USER_ID;
  const result = await build(createAdapter({ identitySequence: identities }));
  assertFailure(result, "account_changed");
});

test("career_snapshots zero count exports an explicit empty table", async () => {
  const payload = parseSuccess(await build(createAdapter()));
  assert.deepEqual(payload.data.career_snapshots, []);
  assert.equal(payload.manifest.tables.career_snapshots.exportedCount, 0);
  assert.deepEqual(payload.manifest.tables.career_snapshots.pagination, {
    strategy: "count_only",
    pagesFetched: 0,
  });
});

test("nonzero career_snapshots count blocks the entire export without raw query", async () => {
  const adapter = createAdapter({ career_snapshots: [{ id: uuid(1) }] });
  const result = await build(adapter);
  assertFailure(result, "unsupported_data_contract");
  assert.equal(adapter.observed.pageTables.includes("career_snapshots"), false);
});

test("per-table row guard is an operational fail-closed limit", async () => {
  const result = await build(
    createAdapter({ beta_feedback: [createFeedback(1), createFeedback(2)] }),
    { limits: { maxRowsPerTable: 1 } },
  );
  assertFailure(result, "export_too_large");
});

test("exact production row-limit boundary completes in 100 full pages", async () => {
  const rows = Array.from({ length: 25_000 }, (_, index) =>
    createFeedback(index + 1));
  const payload = parseSuccess(await build(createAdapter({ beta_feedback: rows })));
  assert.equal(payload.data.beta_feedback.length, 25_000);
  assert.equal(
    payload.manifest.tables.beta_feedback.pagination.pagesFetched,
    100,
  );
});

test("small injected row/page boundary terminates on a full final page", async () => {
  const rows = Array.from({ length: 4 }, (_, index) => createFeedback(index + 1));
  const payload = parseSuccess(await build(createAdapter({ beta_feedback: rows }), {
    limits: { pageSize: 2, maxPagesPerTable: 2, maxRowsPerTable: 4 },
  }));
  assert.equal(payload.data.beta_feedback.length, 4);
  assert.equal(payload.manifest.tables.beta_feedback.pagination.pagesFetched, 2);
});

test("one row over the production table boundary fails export_too_large", async () => {
  const rows = Array.from({ length: 25_001 }, (_, index) =>
    createFeedback(index + 1));
  assertFailure(
    await build(createAdapter({ beta_feedback: rows })),
    "export_too_large",
  );
});

test("a full page below preCount requires another page", async () => {
  const adapter = createAdapter({
    beta_feedback: [createFeedback(1), createFeedback(2), createFeedback(3)],
  });
  const payload = parseSuccess(await build(adapter, {
    limits: { pageSize: 2, maxPagesPerTable: 2, maxRowsPerTable: 3 },
  }));
  assert.equal(payload.manifest.tables.beta_feedback.pagination.pagesFetched, 2);
  assert.equal(
    adapter.observed.pageTables.filter((table) => table === "beta_feedback").length,
    2,
  );
});

test("provider stopping after a full page below preCount cannot succeed", async () => {
  const rows = [createFeedback(1), createFeedback(2), createFeedback(3)];
  const adapter = createAdapter({
    beta_feedback: rows,
    pageResolver(input, pageIndex) {
      if (input.tableName !== "beta_feedback") return undefined;
      return pageIndex === 0 ? rows.slice(0, 2) : [];
    },
  });
  const result = await build(adapter, {
    limits: { pageSize: 2, maxPagesPerTable: 2, maxRowsPerTable: 3 },
  });
  assertFailure(result, "count_mismatch");
});

test("page guard prevents an unbounded pagination loop", async () => {
  const rows = [createFeedback(1), createFeedback(2), createFeedback(3)];
  const result = await build(createAdapter({ beta_feedback: rows }), {
    limits: { pageSize: 2, maxPagesPerTable: 1, maxRowsPerTable: 10 },
  });
  assertFailure(result, "export_too_large");
});

test("total row guard applies across sequential collectors", async () => {
  const result = await build(createAdapter({
    profiles: [createProfile()],
    resume_analyses: [createResumeAnalysis(1)],
  }), {
    limits: { maxTotalRows: 1 },
  });
  assertFailure(result, "export_too_large");
});

test("final size guard rejects oversized serialized output", async () => {
  const result = await build(createAdapter({
    beta_feedback: [createFeedback(1, { message: "x".repeat(1_000) })],
  }), {
    limits: { maxSerializedBytes: 300 },
  });
  assertFailure(result, "export_too_large");
});

test("serialization failure returns no partial JSON", async () => {
  const result = await build(createAdapter(), {
    serialize() {
      throw new Error("fixture serialization failure");
    },
  });
  assertFailure(result, "serialization_failed");
});

test("non-string serializer outputs fail instead of being coerced", async () => {
  for (const serializedValue of [undefined, null, { json: "not a string" }]) {
    const result = await build(createAdapter(), {
      serialize() {
        return serializedValue;
      },
    });
    assertFailure(result, "serialization_failed");
  }
});

test("normal custom string serializer remains successful", async () => {
  const result = await build(createAdapter(), {
    serialize(payload) {
      return JSON.stringify(payload, null, 2);
    },
  });
  assert.equal(result.ok, true);
});

test("valid ISO timestamps pass and are preserved exactly", async () => {
  const validTimestamps = [
    "2026-07-12T12:34:56Z",
    "2026-07-12T12:34:56.123456Z",
    "2026-07-12T12:34:56+05:30",
    "2026-07-12T12:34:56-04:45",
    "2024-02-29T23:59:59.999Z",
  ];
  for (const timestamp of validTimestamps) {
    assert.equal(isValidAccountExportTimestamp(timestamp), true, timestamp);
  }

  const preservedTimestamp = "2024-02-29T23:59:59.123+05:30";
  const payload = parseSuccess(await build(createAdapter({
    profiles: [createProfile({
      created_at: preservedTimestamp,
      updated_at: preservedTimestamp,
    })],
  })));
  assert.equal(payload.data.profiles[0].created_at, preservedTimestamp);
  assert.equal(payload.data.profiles[0].updated_at, preservedTimestamp);
});

test("impossible and non-contract timestamps fail strict validation", async () => {
  const invalidTimestamps = [
    "2026-02-30T12:00:00Z",
    "2025-02-29T12:00:00Z",
    "2026-00-12T12:00:00Z",
    "2026-13-12T12:00:00Z",
    "2026-07-00T12:00:00Z",
    "2026-07-12T24:00:00Z",
    "2026-07-12T12:60:00Z",
    "2026-07-12T12:00:60Z",
    "2026-07-12T12:00:00+24:00",
    "2026-07-12T12:00:00+05:60",
    "2026-07-12",
    "07/12/2026 12:00:00",
    " 2026-07-12T12:00:00Z",
    "2026-07-12T12:00:00Z ",
    "0000-01-01T00:00:00Z",
  ];
  for (const timestamp of invalidTimestamps) {
    assert.equal(isValidAccountExportTimestamp(timestamp), false, timestamp);
  }

  const result = await build(createAdapter({
    profiles: [createProfile({ created_at: invalidTimestamps[0] })],
  }));
  assertFailure(result, "invalid_response");
});

test("manifest counts match reconstructed row arrays", async () => {
  const payload = parseSuccess(await build(createAdapter({
    profiles: [createProfile()],
    resume_analyses: [createResumeAnalysis(1), createResumeAnalysis(2)],
    job_matches: [createJobMatch(3)],
    beta_feedback: [createFeedback(4), createFeedback(5)],
  })));
  for (const table of [
    "profiles",
    "resume_analyses",
    "job_matches",
    "career_snapshots",
    "beta_feedback",
  ]) {
    assert.equal(
      payload.manifest.tables[table].exportedCount,
      payload.data[table].length,
    );
  }
  assert.equal(payload.manifest.consistency.pointInTimeSnapshot, false);
  assert.match(payload.manifest.consistency.statement, /not a point-in-time/);
});

test("raw provider messages never escape any mapped provider error", async () => {
  for (const providerError of [
    { status: 401, message: RAW_PROVIDER_FAILURE },
    { status: 403, message: RAW_PROVIDER_FAILURE },
    { code: "42P01", message: RAW_PROVIDER_FAILURE },
    { status: 503, message: RAW_PROVIDER_FAILURE },
    { message: RAW_PROVIDER_FAILURE },
  ]) {
    const result = await build(createAdapter({
      queryErrors: { "count:profiles:0": providerError },
    }));
    assert.equal(result.ok, false);
    assert.equal(JSON.stringify(result).includes(RAW_PROVIDER_FAILURE), false);
  }
});

test("shared account errors remain operation-neutral and identifier-free", async () => {
  const result = await build(
    createAdapter({ identitySequence: [OTHER_USER_ID] }),
    { expectedUserId: EXPECTED_USER_ID },
  );
  assertFailure(result, "account_changed");
  assert.doesNotMatch(result.error.message, /export|file/i);
  assert.equal(result.error.message.includes(EXPECTED_USER_ID), false);
  assert.equal(result.error.message.includes(OTHER_USER_ID), false);
});

test("account ownership ids do not enter successful JSON", async () => {
  const result = await build(createAdapter({
    profiles: [createProfile({ id: EXPECTED_USER_ID })],
    resume_analyses: [createResumeAnalysis(1, { user_id: EXPECTED_USER_ID })],
    job_matches: [createJobMatch(2, { user_id: EXPECTED_USER_ID })],
    beta_feedback: [createFeedback(3, { user_id: EXPECTED_USER_ID })],
  }));
  assert.equal(result.ok, true);
  assert.equal(result.data.json.includes(EXPECTED_USER_ID), false);
  assert.equal(result.data.json.includes('"user_id"'), false);
});

test("one collector failure never returns partial successful file data", async () => {
  const result = await build(createAdapter({
    profiles: [createProfile()],
    resume_analyses: [createResumeAnalysis(1)],
    queryErrors: {
      "page:job_matches": { message: "network failed", status: 503 },
    },
  }));
  assert.equal(result.ok, false);
  assert.equal("data" in result, false);
  assert.equal("json" in result, false);
});

test("fixed input and exportedAt produce byte-identical deterministic JSON", async () => {
  const tables = {
    profiles: [createProfile()],
    resume_analyses: [createResumeAnalysis(2), createResumeAnalysis(1)],
    job_matches: [createJobMatch(4), createJobMatch(3)],
    beta_feedback: [createFeedback(6), createFeedback(5)],
  };
  const first = await build(createAdapter(tables));
  const second = await build(createAdapter(tables));
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(first.data.json, second.data.json);
});

test("production beta safeguards use the requested conservative values", () => {
  assert.deepEqual(ACCOUNT_EXPORT_LIMITS, {
    pageSize: 250,
    maxPagesPerTable: 100,
    maxRowsPerTable: 25_000,
    maxTotalRows: 50_000,
    maxSerializedBytes: 10 * 1024 * 1024,
  });
});

for (const { name, callback } of tests) {
  await callback();
  console.log(`PASS ${name}`);
}

console.log(
  "Offline Slice 2A1 account-export fixture complete. It does not prove live database schema, live RLS, live indexes, database transactions, browser download behavior, provider backup behavior, legal compliance, or production readiness.",
);

async function build(adapter, options = {}) {
  return buildAccountDataExportWithAdapter(adapter, EXPORTED_AT, options);
}

function createAdapter(input = {}) {
  const tables = {
    profiles: input.profiles ?? [],
    resume_analyses: input.resume_analyses ?? [],
    job_matches: input.job_matches ?? [],
    career_snapshots: input.career_snapshots ?? [],
    beta_feedback: input.beta_feedback ?? [],
  };
  const identitySequence = [...(input.identitySequence ?? [EXPECTED_USER_ID])];
  const countSequences = Object.fromEntries(
    Object.entries(input.countSequences ?? {}).map(([table, values]) => [
      table,
      [...values],
    ]),
  );
  const countCalls = new Map();
  const pageCalls = new Map();
  let identityIndex = 0;

  const observed = {
    pageTables: [],
    profileLimits: [],
    ownerFilters: [],
  };

  return {
    observed,
    async getAuthenticatedUserId() {
      const index = Math.min(identityIndex, identitySequence.length - 1);
      identityIndex += 1;
      return { data: identitySequence[index] ?? null, error: null };
    },
    async getExactCount(query) {
      observed.ownerFilters.push([query.tableName, query.ownerColumn, query.expectedUserId]);
      const callIndex = countCalls.get(query.tableName) ?? 0;
      countCalls.set(query.tableName, callIndex + 1);
      const keyedError = input.queryErrors?.[`count:${query.tableName}:${callIndex}`] ??
        input.queryErrors?.[`count:${query.tableName}`];
      if (keyedError) return { data: null, error: keyedError };

      const sequence = countSequences[query.tableName];
      const data = sequence && callIndex < sequence.length
        ? sequence[callIndex]
        : tables[query.tableName].length;
      return { data, error: null };
    },
    async getProfileRows(query) {
      observed.profileLimits.push(query.limit);
      observed.ownerFilters.push(["profiles", "id", query.expectedUserId]);
      const error = input.queryErrors?.["profile"];
      return error
        ? { data: null, error }
        : { data: tables.profiles.slice(0, query.limit), error: null };
    },
    async getKeysetPage(query) {
      observed.pageTables.push(query.tableName);
      observed.ownerFilters.push([query.tableName, query.ownerColumn, query.expectedUserId]);
      const pageIndex = pageCalls.get(query.tableName) ?? 0;
      pageCalls.set(query.tableName, pageIndex + 1);
      const error = input.queryErrors?.[`page:${query.tableName}:${pageIndex}`] ??
        input.queryErrors?.[`page:${query.tableName}`];
      if (error) return { data: null, error };

      const resolved = input.pageResolver?.(query, pageIndex);
      if (resolved !== undefined) return { data: resolved, error: null };

      const rows = [...tables[query.tableName]].sort(compareRowsById)
        .filter((row) => !query.cursor || row.id.toLowerCase() > query.cursor.toLowerCase())
        .slice(0, query.limit);
      return { data: rows, error: null };
    },
  };
}

function createOpaqueCountFailureAdapter(status) {
  const adapter = createAdapter();
  adapter.getExactCount = async () => {
    const response = {
      data: null,
      error: {
        code: "opaque-provider-code",
        details: RAW_PROVIDER_FAILURE,
        hint: RAW_PROVIDER_FAILURE,
        message: RAW_PROVIDER_FAILURE,
      },
    };
    if (status !== undefined) response.status = status;
    return response;
  };
  return adapter;
}

function parseSuccess(result) {
  assert.equal(result.ok, true, result.ok ? "" : result.error.message);
  return JSON.parse(result.data.json);
}

function assertFailure(result, code) {
  assert.equal(result.ok, false);
  assert.equal(result.error.code, code);
  assert.equal(typeof result.error.message, "string");
  assert.equal(typeof result.error.retryable, "boolean");
  assert.equal("data" in result, false);
}

function assertSafeThrownFailure(result, code) {
  assertFailure(result, code);
  assert.equal(JSON.stringify(result).includes(RAW_PROVIDER_FAILURE), false);
  assert.equal(JSON.stringify(result).toLowerCase().includes("stack"), false);
}

function assertSafeProviderFailure(result, code) {
  assertFailure(result, code);
  assert.equal(JSON.stringify(result).includes(RAW_PROVIDER_FAILURE), false);
}

function createProfile(overrides = {}) {
  return {
    id: EXPECTED_USER_ID,
    full_name: "Ada Lovelace",
    email: "ada@example.com",
    career_goal: "Build reliable systems",
    target_role: "Software Engineer",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

function createResumeAnalysis(index, overrides = {}) {
  return {
    id: uuid(index),
    user_id: EXPECTED_USER_ID,
    file_name: `resume-${index}.pdf`,
    file_type: "application/pdf",
    extracted_text: `Resume text ${index}`,
    parsed_profile: createParsedProfile(),
    user_profile: createUserProfile(),
    created_at: "2026-02-01T00:00:00.000Z",
    ...overrides,
  };
}

function createParsedProfile() {
  return {
    skills: ["TypeScript"],
    projects: ["SkillMint"],
    education: ["B.Tech"],
    experience: ["Internship"],
    certifications: ["Cloud fundamentals"],
    links: {
      github: "https://github.com/example",
      email: "student@example.com",
    },
    rawSections: {
      skills: "TypeScript",
      projects: "SkillMint",
    },
  };
}

function createUserProfile() {
  return {
    resumeScore: 70,
    skillsScore: 72,
    projectsScore: 68,
    experienceScore: 60,
    educationScore: 80,
    githubScore: 50,
    linkedinScore: 40,
    atsScore: 66,
    recruiterScore: 62,
    activityScore: 55,
    skills: ["TypeScript"],
    projects: ["SkillMint"],
    experience: ["Internship"],
    education: "B.Tech",
    certifications: [{ name: "Cloud", issuer: "Example", tier: "B", verified: false }],
    codingProfiles: [{ platform: "leetcode", username: "student", solved: 100 }],
    github: {
      url: "https://github.com/example",
      repositories: 4,
      stars: 2,
      followers: 3,
      openSourceContributions: 1,
    },
    linkedin: {
      url: "https://linkedin.com/in/example",
      connections: 120,
      hasHeadline: true,
      hasAbout: true,
      hasFeatured: false,
    },
    analysisFlags: {
      hasMeasurableImpact: true,
      hasSectionClarity: true,
      hasProofLink: true,
      hasGenericProjects: false,
      isPlaceholderText: false,
    },
  };
}

function createJobMatch(index, overrides = {}) {
  return {
    id: uuid(index),
    user_id: EXPECTED_USER_ID,
    job_title: "Software Engineer",
    company_name: "Example Co",
    job_description: `User-authored job description ${index}`,
    match_result: {
      matchScore: 71,
      verdict: "Tailor before applying",
      brutalReality: "More proof is needed",
      matchedSkills: ["TypeScript"],
      missingSkills: ["PostgreSQL"],
      missingKeywords: ["testing"],
      strengths: ["Projects"],
      weaknesses: ["Experience"],
      recommendations: ["Add proof"],
    },
    improvement_plan: {
      readiness: "Tailor before applying",
      summary: "Improve proof before applying",
      priorityFixes: [{
        title: "Add tests",
        reason: "The role asks for testing",
        action: "Add one tested project",
        priority: "High",
        impact: "High",
        category: "Proof",
      }],
      keywordAdditions: ["testing"],
      projectSuggestions: ["Tested API"],
      proofGaps: ["No test link"],
      sectionFixes: ["Projects"],
      beforeApplyChecklist: ["Add evidence"],
    },
    rewrite_plan: {
      headline: "Software engineer with project proof",
      summaryRewrite: createRewriteSuggestion("Summary"),
      skillsRewrite: createRewriteSuggestion("Skills"),
      projectRewrites: [createRewriteSuggestion("Projects")],
      experienceRewrites: [createRewriteSuggestion("Experience")],
      finalWarnings: ["Do not invent metrics"],
    },
    roadmap: createRoadmap(),
    created_at: "2026-03-01T00:00:00.000Z",
    ...overrides,
  };
}

function createRewriteSuggestion(section) {
  return {
    section,
    title: `${section} rewrite`,
    weakExample: "Worked on an app",
    improvedExample: "Built and tested an app",
    whyBetter: "Adds evidence",
    evidenceNeeded: ["Repository link"],
    caution: "Keep claims truthful",
  };
}

function createRoadmapTask() {
  return {
    title: "Ship a tested project",
    reason: "Proof is missing",
    action: "Add tests and deploy",
    category: "Projects",
    priority: "High",
    estimatedTime: "1 week",
  };
}

function createRoadmapPhase(title) {
  return {
    title,
    goal: `${title} goal`,
    tasks: [createRoadmapTask()],
  };
}

function createRoadmap() {
  return {
    targetRole: "Software Engineer",
    readiness: "Getting ready",
    brutalSummary: "Proof needs strengthening",
    currentBlockers: ["Testing evidence"],
    thirtyDayPlan: createRoadmapPhase("30 day"),
    sixtyDayPlan: createRoadmapPhase("60 day"),
    ninetyDayPlan: createRoadmapPhase("90 day"),
    weeklyMissions: [createRoadmapTask()],
    projectRoadmap: [createRoadmapTask()],
    skillRoadmap: [createRoadmapTask()],
    applicationStrategy: ["Apply selectively"],
  };
}

function createFeedback(index, overrides = {}) {
  return {
    id: uuid(index),
    user_id: EXPECTED_USER_ID,
    feedback_type: "idea",
    sentiment: "positive",
    message: `Feedback message ${index}`,
    page_path: "/settings/data",
    status: "new",
    created_at: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

function uuid(index) {
  return `00000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
}

function compareRowsById(left, right) {
  return left.id.toLowerCase().localeCompare(right.id.toLowerCase());
}
