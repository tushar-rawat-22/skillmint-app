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

Module._resolveFilename = function resolveSkillMintAlias(request, parent, isMain, options) {
  return request.startsWith("@/")
    ? originalResolveFilename.call(this, path.join(srcRoot, request.slice(2)), parent, isMain, options)
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
  BROWSER_DATA_EXPORT_MAX_BYTES,
  BROWSER_DATA_EXPORT_VERSION,
  buildBrowserDataExportWithEngine,
} = require("../src/modules/data-controls/browserDataExportEngine.ts");
const {
  BROWSER_DATA_EXPORT_CONTRACTS,
  BROWSER_DATA_EXPORT_CONTRACT_VERSION,
} = require("../src/modules/data-controls/browserDataExportContract.ts");
const {
  SKILLMINT_STORAGE_DESCRIPTORS,
  buildBrowserDataExport,
  getSkillMintStorageDescriptors,
} = require("../src/lib/storage/skillMintStorageRegistry.ts");
const {
  OWNER_PARTITION_CONTAINER_FORMAT,
  OWNER_PARTITION_CONTAINER_VERSION,
  createOwnedBrowserValue,
} = require("../src/lib/storage/ownedSkillMintStorage.ts");
const {
  MISSION_STATUS_STORAGE_DESCRIPTOR,
  MISSION_STATUS_STORAGE_KEY,
  SELECTED_CAREER_PATH_STORAGE_KEY,
} = require("../src/intelligence/missions/missionStorage.ts");
const {
  ONBOARDING_DISMISSED_STORAGE_KEY,
} = require("../src/modules/onboarding/storage/onboardingStorage.ts");
const {
  TARGET_ROLE_SETUP_STORAGE_KEY,
} = require("../src/modules/onboarding/storage/targetRoleSetupStorage.ts");
const {
  RESUME_SYNC_STATUS_STORAGE_DESCRIPTOR,
  RESUME_SYNC_STATUS_STORAGE_KEY,
} = require("../src/modules/resume/services/activeResumeReportStorage.ts");
const {
  JD_MATCH_SYNC_STATUS_STORAGE_DESCRIPTOR,
  JD_MATCH_SYNC_STATUS_STORAGE_KEY,
} = require("../src/lib/storage/jdMatchCurrentStorage.ts");
const {
  BETA_FEEDBACK_STORAGE_DESCRIPTOR,
  BETA_FEEDBACK_STORAGE_KEY,
} = require("../src/modules/feedback/services/feedbackLocalStorage.ts");

const ANONYMOUS = { currentUserId: null };
const ACCOUNT_A = { currentUserId: "account-a" };
const EXPORTED_AT = "2026-07-12T12:34:56.789Z";
const OFFSET_EXPORTED_AT = "2026-07-12T18:04:56.789+05:30";
const tests = [];

function test(name, callback) { tests.push({ name, callback }); }
function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  const calls = [];
  return {
    values,
    calls,
    getItem(key) {
      calls.push(key);
      return values.has(key) ? values.get(key) : null;
    },
  };
}
function engine(input = {}) {
  return buildBrowserDataExportWithEngine({
    context: input.context ?? ANONYMOUS,
    exportedAt: input.exportedAt ?? EXPORTED_AT,
    descriptors: input.descriptors ?? getSkillMintStorageDescriptors(),
    storage: input.storage === undefined ? storage() : input.storage,
    ...(input.serializer === undefined ? {} : { serializer: input.serializer }),
    ...(input.maxBytes === undefined ? {} : { maxBytes: input.maxBytes }),
  });
}
function parse(result) {
  assert.equal(result.ok, true, result.ok ? "" : JSON.stringify(result.error));
  return JSON.parse(result.json);
}
function fail(result, code, retryable) {
  assert.equal(result.ok, false);
  assert.deepEqual(Object.keys(result), ["ok", "error"]);
  assert.equal(result.error.code, code);
  assert.equal(result.error.retryable, retryable);
  assert.equal(typeof result.error.message, "string");
  for (const key of ["json", "fileName", "manifest", "records"]) assert.equal(key in result, false);
  return result;
}
function replaceDescriptor(key, changes) {
  return getSkillMintStorageDescriptors().map((item) =>
    item.key === key ? { ...item, ...changes } : item);
}
function currentContainer(item, anonymousValue, accounts = {}) {
  const partitions = { accounts: {} };
  if (anonymousValue !== undefined) partitions.anonymous = { value: anonymousValue, updatedAt: EXPORTED_AT };
  for (const [ownerId, value] of Object.entries(accounts)) {
    partitions.accounts[ownerId] = { value, updatedAt: EXPORTED_AT };
  }
  return JSON.stringify({
    format: OWNER_PARTITION_CONTAINER_FORMAT,
    version: OWNER_PARTITION_CONTAINER_VERSION,
    descriptorVersion: item.version,
    partitions,
  });
}
function targetRole(overrides = {}) {
  return {
    targetRole: "Software Engineer",
    careerField: "tech_software",
    experienceLevel: "student",
    primaryGoal: "get_first_job",
    preferredJobType: "full_stack",
    weeklyTimeCommitment: "medium",
    updatedAt: EXPORTED_AT,
    ...overrides,
  };
}
function syncStatus(databaseId) {
  return {
    status: "synced",
    message: "Raw operational status is intentionally excluded.",
    syncedAt: EXPORTED_AT,
    ...(databaseId ? { databaseId } : {}),
  };
}
function feedback(overrides = {}) {
  return [{
    id: "feedback-1",
    feedbackType: "idea",
    sentiment: "positive",
    message: "token authorization secret remain ordinary feedback words",
    pagePath: "/settings/data?tab=privacy#export",
    createdAt: EXPORTED_AT,
    syncStatus: "local-only",
    syncError: "raw provider secret",
    ...overrides,
  }];
}

test("1 integration and coverage use 12 real contracts and identical public/direct production paths", () => {
  assert.equal(BROWSER_DATA_EXPORT_VERSION, "skillmint-browser-export-v2");
  assert.equal(BROWSER_DATA_EXPORT_CONTRACT_VERSION, "skillmint-browser-contract-v1");
  assert.equal(SKILLMINT_STORAGE_DESCRIPTORS.filter((item) => item.exportable).length, 12);
  assert.equal(BROWSER_DATA_EXPORT_CONTRACTS.length, 12);
  const memory = storage({ [MISSION_STATUS_STORAGE_KEY]: JSON.stringify({ mission: "started" }) });
  global.window = { localStorage: memory, dispatchEvent() {} };
  const direct = engine({ storage: memory });
  const publicResult = buildBrowserDataExport(ANONYMOUS, EXPORTED_AT);
  assert.equal(direct.ok, true);
  assert.equal(publicResult.ok, true);
  assert.equal(publicResult.json, direct.json);
  assert.equal(publicResult.fileName, direct.fileName);

  const unknown = { ...MISSION_STATUS_STORAGE_DESCRIPTOR, key: "skillmint:fixture-unknown" };
  fail(engine({ descriptors: [...getSkillMintStorageDescriptors(), unknown] }), "missing_export_contract", false);
  fail(engine({ descriptors: replaceDescriptor(MISSION_STATUS_STORAGE_KEY, { category: "feedback" }) }), "unsupported_browser_data_contract", false);
});

test("2-3 empty anonymous/account exports are deterministic and owner resolution fails closed", () => {
  for (const [context, scope] of [[ANONYMOUS, "anonymous"], [ACCOUNT_A, "account"]]) {
    const result = engine({ context });
    const payload = parse(result);
    assert.equal(payload.records.length, 0);
    assert.equal(payload.manifest.visibleRecordCount, 0);
    assert.equal(payload.manifest.requestedOwnerScope, scope);
    assert.equal(result.fileName, `skillmint-browser-${scope}-2026-07-12.json`);
    assert.equal(result.json.includes("account-a"), false);
  }
  fail(engine({ context: { currentUserId: undefined } }), "owner_unresolved", true);
  for (const currentUserId of ["", "   ", "undefined", "null", "__proto__"]) {
    fail(engine({ context: { currentUserId } }), "owner_unresolved", true);
  }
});

test("4 storage availability/read failures are safe and the engine performs no writes", () => {
  fail(engine({ storage: null }), "storage_unavailable", true);
  const throwing = { getItem() { throw new Error("SECRET provider storage detail"); } };
  const thrown = fail(engine({ storage: throwing }), "storage_read_failed", true);
  assert.equal(JSON.stringify(thrown).includes("SECRET"), false);
  fail(engine({ storage: { getItem() { return 42; } } }), "storage_read_failed", true);
  const readable = storage();
  assert.equal("setItem" in readable, false);
  assert.equal("removeItem" in readable, false);
  assert.equal(engine({ storage: readable }).ok, true);
  assert.equal(readable.calls.length, 24);
  assert.deepEqual(readable.calls.slice(0, 12), readable.calls.slice(12));
  assert.equal(new Set(readable.calls.slice(0, 12)).size, 12);
});

test("5 owner isolation hides other partitions and exposes only requested/global values", () => {
  const rawMission = currentContainer(MISSION_STATUS_STORAGE_DESCRIPTOR, { anonymous: "started" }, {
    "account-a": { accountA: "done_by_user" },
    "account-b-private-id": { accountBSecretMission: "blocked" },
  });
  const memory = storage({
    [MISSION_STATUS_STORAGE_KEY]: rawMission,
    [ONBOARDING_DISMISSED_STORAGE_KEY]: "true",
  });
  const anonymousPayload = parse(engine({ context: ANONYMOUS, storage: memory }));
  assert.deepEqual(anonymousPayload.records.map((item) => item.key), [MISSION_STATUS_STORAGE_KEY, ONBOARDING_DISMISSED_STORAGE_KEY]);
  assert.deepEqual(anonymousPayload.records[0].value, { anonymous: "started" });
  const accountPayload = parse(engine({ context: ACCOUNT_A, storage: memory }));
  assert.deepEqual(accountPayload.records[0].value, { accountA: "done_by_user" });
  assert.equal(JSON.stringify(accountPayload).includes("account-b-private-id"), false);
  assert.equal(JSON.stringify(accountPayload).includes("accountBSecretMission"), false);

  const hiddenOnly = storage({ [MISSION_STATUS_STORAGE_KEY]: currentContainer(MISSION_STATUS_STORAGE_DESCRIPTOR, undefined, { "account-b": { hiddenMission: "started" } }) });
  const hiddenPayload = parse(engine({ context: ACCOUNT_A, storage: hiddenOnly }));
  assert.equal(hiddenPayload.records.length, 0);
  assert.equal(JSON.stringify(hiddenPayload).includes(MISSION_STATUS_STORAGE_KEY), false);
  assert.equal("omitted" in hiddenPayload, false);
});

test("6 classification preserves authoritative legacy flags and fails corrupt/future versions atomically", () => {
  const current = parse(engine({ context: ACCOUNT_A, storage: storage({
    [MISSION_STATUS_STORAGE_KEY]: currentContainer(MISSION_STATUS_STORAGE_DESCRIPTOR, undefined, { "account-a": { mission: "started" } }),
  }) }));
  assert.equal(current.records[0].legacySource, false);

  const rawLegacy = parse(engine({ storage: storage({ [MISSION_STATUS_STORAGE_KEY]: JSON.stringify({ mission: "started" }) }) }));
  assert.equal(rawLegacy.records[0].legacySource, true);
  const envelope = JSON.stringify(createOwnedBrowserValue({ mission: "started" }, { kind: "anonymous" }, EXPORTED_AT));
  const previous = parse(engine({ storage: storage({ [MISSION_STATUS_STORAGE_KEY]: envelope }) }));
  assert.equal(previous.records[0].legacySource, true);

  fail(engine({ storage: storage({ [MISSION_STATUS_STORAGE_KEY]: "{bad" }) }), "corrupt_visible_data", false);
  const future = JSON.stringify({ version: 9, owner: { kind: "anonymous" }, value: { mission: "started" }, updatedAt: EXPORTED_AT });
  fail(engine({ storage: storage({ [MISSION_STATUS_STORAGE_KEY]: future }) }), "unsupported_storage_version", false);
  const mismatched = JSON.parse(currentContainer(MISSION_STATUS_STORAGE_DESCRIPTOR, { mission: "started" }));
  mismatched.descriptorVersion = 99;
  fail(engine({ storage: storage({ [MISSION_STATUS_STORAGE_KEY]: JSON.stringify(mismatched) }) }), "unsupported_storage_version", false);
});

test("7 contract handoff maps strict failures and preserves user-authored sensitive words without sanitizing", () => {
  const permissiveSetup = replaceDescriptor(TARGET_ROLE_SETUP_STORAGE_KEY, { validateValue: () => true });
  fail(engine({ descriptors: permissiveSetup, storage: storage({
    [TARGET_ROLE_SETUP_STORAGE_KEY]: JSON.stringify(targetRole({ unknown: true })),
  }) }), "invalid_export_value", false);
  fail(engine({ descriptors: permissiveSetup, storage: storage({
    [TARGET_ROLE_SETUP_STORAGE_KEY]: JSON.stringify(targetRole({ updatedAt: "2026-02-30T00:00:00Z" })),
  }) }), "invalid_export_timestamp", false);
  fail(engine({ descriptors: permissiveSetup, storage: storage({
    [TARGET_ROLE_SETUP_STORAGE_KEY]: JSON.stringify(targetRole({ "owner-id": "private" })),
  }) }), "unsupported_browser_data_contract", false);

  const pathText = "path:token-authorization-secret";
  const result = parse(engine({ storage: storage({ [SELECTED_CAREER_PATH_STORAGE_KEY]: JSON.stringify(pathText) }) }));
  assert.equal(result.records[0].value, pathText);
});

test("8 string and boolean decoding accepts proven forms and never converts invalid boolean to false", () => {
  const jsonString = parse(engine({ storage: storage({ [SELECTED_CAREER_PATH_STORAGE_KEY]: JSON.stringify("path:json") }) }));
  assert.equal(jsonString.records[0].value, "path:json");
  const rawString = parse(engine({ storage: storage({ [SELECTED_CAREER_PATH_STORAGE_KEY]: "path:legacy" }) }));
  assert.equal(rawString.records[0].value, "path:legacy");
  const boolean = parse(engine({ storage: storage({ [ONBOARDING_DISMISSED_STORAGE_KEY]: "true" }) }));
  assert.equal(boolean.records[0].value, true);
  const permissiveBoolean = replaceDescriptor(ONBOARDING_DISMISSED_STORAGE_KEY, { validateValue: () => true });
  fail(engine({ descriptors: permissiveBoolean, storage: storage({ [ONBOARDING_DISMISSED_STORAGE_KEY]: '"true"' }) }), "invalid_export_value", false);
  fail(engine({ storage: storage({ [MISSION_STATUS_STORAGE_KEY]: "{bad" }) }), "corrupt_visible_data", false);
});

test("9-10 records and manifest use exact v2 fields, real metadata, safe scopes, and truthful consistency wording", () => {
  const memory = storage({
    [MISSION_STATUS_STORAGE_KEY]: JSON.stringify({ mission: "started" }),
    [ONBOARDING_DISMISSED_STORAGE_KEY]: "false",
  });
  const payload = parse(engine({ storage: memory }));
  assert.deepEqual(payload.records.map((item) => item.key), [MISSION_STATUS_STORAGE_KEY, ONBOARDING_DISMISSED_STORAGE_KEY]);
  const record = payload.records[0];
  assert.deepEqual(Object.keys(record), ["key", "descriptorVersion", "contractVersion", "category", "description", "ownerScope", "legacySource", "value"]);
  assert.equal(record.description, MISSION_STATUS_STORAGE_DESCRIPTOR.description);
  assert.equal(record.descriptorVersion, MISSION_STATUS_STORAGE_DESCRIPTOR.version);
  assert.equal(record.contractVersion, BROWSER_DATA_EXPORT_CONTRACT_VERSION);
  assert.equal(record.ownerScope, "anonymous");
  assert.equal(payload.records[1].ownerScope, "global_preference");
  assert.equal(JSON.stringify(record).includes("classification"), false);
  assert.deepEqual(Object.keys(payload), ["manifest", "records"]);
  assert.deepEqual(Object.keys(payload.manifest), [
    "exportVersion", "contractVersion", "source", "exportedAt", "requestedOwnerScope", "visibleRecordCount",
    "everyVisibleRecordValidated", "rawValuesMatchedDuringFinalVerificationPass", "atomicSnapshot", "consistencyStatement", "privacyTransformations",
  ]);
  assert.equal(payload.manifest.exportVersion, "skillmint-browser-export-v2");
  assert.equal(payload.manifest.source, "browser");
  assert.equal(payload.manifest.exportedAt, EXPORTED_AT);
  assert.equal(payload.manifest.visibleRecordCount, payload.records.length);
  assert.equal(payload.manifest.everyVisibleRecordValidated, true);
  assert.equal(payload.manifest.rawValuesMatchedDuringFinalVerificationPass, true);
  assert.equal(payload.manifest.atomicSnapshot, false);
  assert.match(payload.manifest.consistencyStatement, /sequential browser-storage read pass/);
  assert.match(payload.manifest.consistencyStatement, /atomic point-in-time snapshot is not guaranteed/);
  for (const key of ["omitted", "categories", "ownerScope", "snapshotVerified", "completenessVerified", "transactional"]) {
    assert.equal(key in payload.manifest, false, key);
  }
});

test("11 privacy transformations are actual, deduplicated, deterministic, and identifier-free", () => {
  const memory = storage({
    [RESUME_SYNC_STATUS_STORAGE_KEY]: currentContainer(RESUME_SYNC_STATUS_STORAGE_DESCRIPTOR, syncStatus("remote-resume")),
    [JD_MATCH_SYNC_STATUS_STORAGE_KEY]: currentContainer(JD_MATCH_SYNC_STATUS_STORAGE_DESCRIPTOR, syncStatus("remote-jd")),
    [BETA_FEEDBACK_STORAGE_KEY]: currentContainer(BETA_FEEDBACK_STORAGE_DESCRIPTOR, feedback()),
  });
  const payload = parse(engine({ storage: memory }));
  assert.deepEqual(payload.manifest.privacyTransformations, [
    "feedback_sync_error_excluded", "feedback_query_removed", "feedback_fragment_removed",
    "sync_status_message_excluded", "database_reference_excluded",
  ]);
  const json = JSON.stringify(payload);
  for (const privateValue of ["remote-resume", "remote-jd", "raw provider secret", "syncError", "databaseId"]) {
    assert.equal(json.includes(privateValue), false, privateValue);
  }
  const empty = parse(engine());
  assert.deepEqual(empty.manifest.privacyTransformations, []);
});

test("12 final verification detects visible, hidden, and missing mutations after serialization", () => {
  const visible = storage({ [MISSION_STATUS_STORAGE_KEY]: JSON.stringify({ mission: "started" }) });
  fail(engine({ storage: visible, serializer(payload) {
    visible.values.set(MISSION_STATUS_STORAGE_KEY, JSON.stringify({ mission: "blocked" }));
    return JSON.stringify(payload);
  } }), "browser_data_changed", true);

  const hidden = storage({ [MISSION_STATUS_STORAGE_KEY]: currentContainer(MISSION_STATUS_STORAGE_DESCRIPTOR, undefined, { "account-b": { hidden: "started" } }) });
  const hiddenFailure = fail(engine({ context: ACCOUNT_A, storage: hidden, serializer(payload) {
    hidden.values.set(MISSION_STATUS_STORAGE_KEY, currentContainer(MISSION_STATUS_STORAGE_DESCRIPTOR, undefined, { "account-b": { secretChanged: "blocked" } }));
    return JSON.stringify(payload);
  } }), "browser_data_changed", true);
  assert.equal(JSON.stringify(hiddenFailure).includes("secretChanged"), false);

  const missing = storage();
  fail(engine({ storage: missing, serializer(payload) {
    missing.values.set(MISSION_STATUS_STORAGE_KEY, JSON.stringify({ appeared: "started" }));
    return JSON.stringify(payload);
  } }), "browser_data_changed", true);

  const finalThrow = storage();
  let totalReads = 0;
  finalThrow.getItem = function getItem(key) {
    totalReads += 1;
    if (totalReads > 12) throw new Error("private final read detail");
    return this.values.has(key) ? this.values.get(key) : null;
  };
  fail(engine({ storage: finalThrow }), "storage_read_failed", true);
});

test("13 serialization is called once and every malformed output fails without partial fields", () => {
  let calls = 0;
  assert.equal(engine({ serializer(payload) { calls += 1; return JSON.stringify(payload); } }).ok, true);
  assert.equal(calls, 1);
  fail(engine({ serializer() { throw new Error("private serializer error"); } }), "serialization_failed", true);
  for (const output of [undefined, null, {}, 1, true]) {
    fail(engine({ serializer() { return output; } }), "serialization_failed", true);
  }
});

test("14 UTF-8 size enforcement includes the newline and permits the exact boundary", () => {
  assert.equal(BROWSER_DATA_EXPORT_MAX_BYTES, 10 * 1024 * 1024);
  const exact = engine({ serializer() { return "abc"; }, maxBytes: 4 });
  assert.equal(exact.ok, true);
  assert.equal(exact.json, "abc\n");
  fail(engine({ serializer() { return "abc"; }, maxBytes: 3 }), "export_too_large", false);
  fail(engine({ maxBytes: 0 }), "unknown", true);
});

test("15 strict timestamps and filenames preserve valid forms and read nothing on invalid input", () => {
  const z = engine({ exportedAt: EXPORTED_AT });
  assert.equal(z.ok, true);
  assert.equal(z.fileName, "skillmint-browser-anonymous-2026-07-12.json");
  const offset = engine({ context: ACCOUNT_A, exportedAt: OFFSET_EXPORTED_AT });
  assert.equal(offset.ok, true);
  assert.equal(offset.manifest.exportedAt, OFFSET_EXPORTED_AT);
  assert.equal(offset.fileName, "skillmint-browser-account-2026-07-12.json");
  assert.equal(offset.fileName.includes("account-a"), false);
  const memory = storage();
  fail(engine({ storage: memory, exportedAt: "2026-02-30T00:00:00Z" }), "invalid_export_timestamp", false);
  assert.equal(memory.calls.length, 0);
});

test("16 fixed input is byte deterministic with stable records and transformations", () => {
  const initial = {
    [MISSION_STATUS_STORAGE_KEY]: JSON.stringify({ z: "started", a: "blocked" }),
    [RESUME_SYNC_STATUS_STORAGE_KEY]: currentContainer(RESUME_SYNC_STATUS_STORAGE_DESCRIPTOR, syncStatus("remote")),
  };
  const first = engine({ storage: storage(initial) });
  const second = engine({ storage: storage(initial) });
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(first.json, second.json);
  assert.deepEqual(first.manifest.privacyTransformations, second.manifest.privacyTransformations);
});

test("17 representative failures are atomic, fixed, and carry required retryability", () => {
  const cases = [
    [engine({ storage: null }), "storage_unavailable", true],
    [engine({ context: { currentUserId: undefined } }), "owner_unresolved", true],
    [engine({ storage: { getItem() { throw new Error("raw"); } } }), "storage_read_failed", true],
    [engine({ storage: storage({ [MISSION_STATUS_STORAGE_KEY]: "{bad" }) }), "corrupt_visible_data", false],
    [engine({ serializer() { return null; } }), "serialization_failed", true],
    [engine({ serializer() { return "large"; }, maxBytes: 1 }), "export_too_large", false],
  ];
  for (const [result, code, retryable] of cases) fail(result, code, retryable);
  assert.equal(new Set(cases.map(([result]) => result.error.message)).size, cases.length);
});

test("18 public export reads only, preserves raw storage, and keeps production registry unchanged", () => {
  const raw = currentContainer(MISSION_STATUS_STORAGE_DESCRIPTOR, { mission: "started" }, { "account-b": { hidden: "blocked" } });
  const memory = storage({ [MISSION_STATUS_STORAGE_KEY]: raw });
  global.window = { localStorage: memory, dispatchEvent() {} };
  const before = [...memory.values.entries()];
  const result = buildBrowserDataExport(ANONYMOUS, EXPORTED_AT);
  assert.equal(result.ok, true);
  assert.deepEqual([...memory.values.entries()], before);
  assert.equal(SKILLMINT_STORAGE_DESCRIPTORS.length, 12);
});

for (const { name, callback } of tests) {
  callback();
  console.log(`PASS ${name}`);
}

console.log(
  "Offline Block 5.2.4 browser-export engine fixture complete. It does not prove atomic browser-storage snapshots, detection of change-then-change-back races, download success, Blob behavior, object URL lifecycle, browser hydration, rendered accessibility, live database behavior, live RLS, provider backups, legal compliance, or production readiness.",
);
