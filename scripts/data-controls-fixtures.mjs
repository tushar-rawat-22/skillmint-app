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
  OWNER_PARTITION_CONTAINER_FORMAT,
  OWNER_PARTITION_CONTAINER_VERSION,
  classifyStoredValue,
  createOwnedBrowserValue,
  getOwnerPartitionFromContainer,
  readVisibleStoredValue,
  removeOwnedStoragePartition,
  writeOwnedStorageValue,
} = require("../src/lib/storage/ownedSkillMintStorage.ts");
const {
  SKILLMINT_STORAGE_DESCRIPTORS,
  buildBrowserDataExport,
  clearSkillMintBrowserData,
  formatOtherWorkspaceSummary,
  getBrowserStorageSummary,
  getSkillMintStorageDescriptors,
  hasAnonymousBrowserWorkspace,
  importAnonymousBrowserWorkspaceToAccount,
  removeSkillMintOwnerData,
} = require("../src/lib/storage/skillMintStorageRegistry.ts");
const {
  resolveBrowserWorkspaceWriteOwner,
} = require("../src/lib/storage/skillMintStorageTypes.ts");
const {
  MISSION_STATUS_STORAGE_DESCRIPTOR,
  MISSION_STATUS_STORAGE_KEY,
  SELECTED_CAREER_PATH_STORAGE_DESCRIPTOR,
} = require("../src/intelligence/missions/missionStorage.ts");
const {
  TARGET_ROLE_SETUP_STORAGE_DESCRIPTOR,
} = require("../src/modules/onboarding/storage/targetRoleSetupStorage.ts");
const {
  ACTIVE_TARGET_STORAGE_DESCRIPTOR,
  ACTIVE_TARGET_STORAGE_VERSION,
  parseActiveTarget,
} = require("../src/intelligence/target/activeTargetStorage.ts");
const {
  createManualActiveTarget,
} = require("../src/intelligence/target/activeTargetSelection.ts");
const {
  ONBOARDING_DISMISSED_STORAGE_DESCRIPTOR,
  ONBOARDING_DISMISSED_STORAGE_KEY,
} = require("../src/modules/onboarding/storage/onboardingStorage.ts");
const {
  ACTIVE_RESUME_ANALYSIS_STORAGE_DESCRIPTOR,
  isActiveResumeAnalysis,
  prepareAnonymousActiveResumeAnalysis,
  prepareAnonymousResumeSyncStatus,
  RESUME_SYNC_STATUS_STORAGE_DESCRIPTOR,
} = require("../src/modules/resume/services/activeResumeReportStorage.ts");
const {
  JD_MATCH_STORAGE_DESCRIPTOR,
  JD_MATCH_SYNC_STATUS_STORAGE_DESCRIPTOR,
  prepareAnonymousCurrentJobMatch,
  prepareAnonymousJobMatchSyncStatus,
} = require("../src/lib/storage/jdMatchCurrentStorage.ts");
const {
  createImportedLocalJobMatchId,
  getAccountHistoryRestoreMessage,
  JD_MATCH_HISTORY_STORAGE_DESCRIPTOR,
  prepareAnonymousJobMatchHistory,
  saveJobMatch,
} = require("../src/lib/storage/jdMatchHistory.ts");
const {
  detachDeletedSavedReportReferences,
} = require("../src/lib/storage/reportReferenceCleanup.ts");
const {
  isConfirmedAccountDeletionResponse,
} = require("../src/modules/data-controls/accountDeletionClientContract.ts");
const { calculateCareerIQ } = require("../src/intelligence/core/careerIQ.ts");
const { calculateATS } = require("../src/intelligence/core/ats.ts");
const { calculateRoleMatches } = require("../src/intelligence/core/roleMatch.ts");
const { generateProofScore } = require("../src/intelligence/proof/proofScoring.ts");
const { analyzeJobDescriptionMatch } = require("../src/intelligence/core/jobDescriptionMatch.ts");
const {
  createActiveTargetResumeContext,
  isJdMatchCurrentForResume,
} = require("../src/intelligence/target/activeTargetResumeContext.ts");

global.window = { localStorage: createMemoryStorage(), dispatchEvent() {} };

const ANONYMOUS = { currentUserId: null };
const ACCOUNT_A = { currentUserId: "account-a" };
const ACCOUNT_B = { currentUserId: "account-b" };
const ACCOUNT_C = { currentUserId: "account-c" };
const TIME_0 = "2026-07-12T00:00:00.000Z";
const TIME_A = "2026-07-12T01:00:00.000Z";
const TIME_B = "2026-07-12T02:00:00.000Z";

function run(name, callback) {
  callback();
  console.log(`PASS ${name}`);
}

run("registry owns every runtime SkillMint storage key and policy", () => {
  const descriptors = getSkillMintStorageDescriptors();
  const keys = descriptors.map((descriptor) => descriptor.key);
  assert.equal(new Set(keys).size, keys.length);
  for (const descriptor of descriptors) {
    assert.ok(descriptor.version >= 1);
    assert.equal(typeof descriptor.validateValue, "function");
    assert.equal(typeof descriptor.importable, "boolean");
    assert.ok(descriptor.description.trim());
  }

  const runtimeKeys = new Set();
  for (const file of listSourceFiles(srcRoot)) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(/["'`](skillmint:[^"'`\s]+)["'`]/g)) {
      if (!["skillmint:workspace-updated", OWNER_PARTITION_CONTAINER_FORMAT].includes(match[1])) {
        runtimeKeys.add(match[1]);
      }
    }
  }
  assert.deepEqual([...runtimeKeys].sort(), [...keys].sort());
  assert.equal(SKILLMINT_STORAGE_DESCRIPTORS.length, descriptors.length);
});

run("owner-partition writes preserve anonymous, A, B, and untouched timestamps", () => {
  const storage = createMemoryStorage();
  assertWrite(storage, ANONYMOUS, { "mission-anon": "suggested" }, TIME_0);
  assertWrite(storage, ACCOUNT_A, { "mission-a": "started" }, TIME_A);
  assertWrite(storage, ACCOUNT_B, { "mission-b": "done_by_user" }, TIME_B);

  assert.deepEqual(readValue(storage, ANONYMOUS), { "mission-anon": "suggested" });
  assert.deepEqual(readValue(storage, ACCOUNT_A), { "mission-a": "started" });
  assert.deepEqual(readValue(storage, ACCOUNT_B), { "mission-b": "done_by_user" });
  assert.equal(readVisibleStoredValue(storage.getItem(MISSION_STATUS_STORAGE_KEY), MISSION_STATUS_STORAGE_DESCRIPTOR, { currentUserId: undefined }).status, "owner_unknown");
  const hidden = readVisibleStoredValue(storage.getItem(MISSION_STATUS_STORAGE_KEY), MISSION_STATUS_STORAGE_DESCRIPTOR, ACCOUNT_C);
  assert.equal(hidden.status, "hidden_for_owner");
  assert.equal(hidden.owner, null);

  const beforeUpdate = currentContainer(storage);
  const bBefore = JSON.stringify(getOwnerPartitionFromContainer(beforeUpdate, { kind: "account", userId: "account-b" }));
  assertWrite(storage, ACCOUNT_A, { "mission-a": "done_by_user" }, "2026-07-12T03:00:00.000Z");
  const afterUpdate = currentContainer(storage);
  assert.equal(JSON.stringify(getOwnerPartitionFromContainer(afterUpdate, { kind: "account", userId: "account-b" })), bBefore);
  assert.deepEqual(readValue(storage, ACCOUNT_A), { "mission-a": "done_by_user" });
  assert.deepEqual(readValue(storage, ANONYMOUS), { "mission-anon": "suggested" });

  window.localStorage = storage;
  const accountExport = buildBrowserDataExport(ACCOUNT_A, TIME_A);
  assert.equal(accountExport.ok, true);
  assert.equal(accountExport.json.includes("account-a"), false);
  assert.equal(accountExport.json.includes("account-b"), false);

  for (let index = 0; index < 3; index += 1) {
    assertWrite(storage, ACCOUNT_B, { "mission-b": index % 2 ? "started" : "blocked" }, `2026-07-12T0${index + 4}:00:00.000Z`);
    assertWrite(storage, ACCOUNT_A, { "mission-a": index % 2 ? "blocked" : "started" }, `2026-07-12T0${index + 7}:00:00.000Z`);
  }
  assert.ok(readValue(storage, ACCOUNT_A));
  assert.ok(readValue(storage, ACCOUNT_B));
  assert.ok(readValue(storage, ANONYMOUS));
});

run("invalid owners, undefined values, and quota failures preserve exact raw data", () => {
  const storage = createMemoryStorage();
  assertWrite(storage, ACCOUNT_A, { a: "started" }, TIME_A);
  assertWrite(storage, ACCOUNT_B, { b: "blocked" }, TIME_B);
  const exactRaw = storage.getItem(MISSION_STATUS_STORAGE_KEY);

  for (const currentUserId of [undefined, "", "   ", "undefined", "null"]) {
    const result = writeOwnedStorageValue(MISSION_STATUS_STORAGE_DESCRIPTOR, { bad: "started" }, { currentUserId }, { storage, updatedAt: TIME_0 });
    assert.equal(result.ok, false);
    assert.equal(storage.getItem(MISSION_STATUS_STORAGE_KEY), exactRaw);
  }
  assert.equal(writeOwnedStorageValue(MISSION_STATUS_STORAGE_DESCRIPTOR, undefined, ACCOUNT_A, { storage }).status, "value_invalid");
  assert.equal(storage.getItem(MISSION_STATUS_STORAGE_KEY), exactRaw);

  storage.failNextSet = true;
  const failedWrite = writeOwnedStorageValue(MISSION_STATUS_STORAGE_DESCRIPTOR, { a: "done_by_user" }, ACCOUNT_A, { storage, updatedAt: TIME_0 });
  assert.equal(failedWrite.status, "storage_write_failed");
  assert.equal(storage.getItem(MISSION_STATUS_STORAGE_KEY), exactRaw);
  assert.deepEqual(readValue(storage, ACCOUNT_B), { b: "blocked" });

  const readFailureStorage = createMemoryStorage();
  readFailureStorage.getFailures.add(MISSION_STATUS_STORAGE_KEY);
  assert.equal(writeOwnedStorageValue(MISSION_STATUS_STORAGE_DESCRIPTOR, { a: "started" }, ACCOUNT_A, { storage: readFailureStorage }).status, "storage_read_failed");
  const savedWindow = global.window;
  delete global.window;
  assert.equal(writeOwnedStorageValue(MISSION_STATUS_STORAGE_DESCRIPTOR, { a: "started" }, ACCOUNT_A).status, "storage_unavailable");
  global.window = savedWindow;
});

run("descriptor scopes enforce anonymous, account-only, import, and global rules", () => {
  const storage = createMemoryStorage();
  const accountOnly = {
    ...MISSION_STATUS_STORAGE_DESCRIPTOR,
    key: "fixture:account-only",
    ownerScope: "account_only",
    importable: false,
  };
  assert.equal(writeOwnedStorageValue(accountOnly, { x: "started" }, ANONYMOUS, { storage }).status, "owner_scope_rejected");
  assert.equal(writeOwnedStorageValue(accountOnly, { x: "started" }, ACCOUNT_A, { storage, updatedAt: TIME_A }).ok, true);
  const anonymousOnlyStorage = createMemoryStorage();
  assertWrite(anonymousOnlyStorage, ANONYMOUS, { x: "started" }, TIME_0);
  assert.equal(classifyStoredValue(
    anonymousOnlyStorage.getItem(MISSION_STATUS_STORAGE_KEY),
    accountOnly,
  ).status, "partial_container");
  assert.equal(MISSION_STATUS_STORAGE_DESCRIPTOR.importable, true);
  assert.equal(ONBOARDING_DISMISSED_STORAGE_DESCRIPTOR.importable, false);
  assert.equal(readVisibleStoredValue("true", ONBOARDING_DISMISSED_STORAGE_DESCRIPTOR, ANONYMOUS).status, "visible");
});

run("strict classifier separates valid, legacy, corrupt, partial, future, and ambiguous data", () => {
  const descriptor = MISSION_STATUS_STORAGE_DESCRIPTOR;
  const validRaw = JSON.stringify({ mission: "started" });
  const previousAnonymous = JSON.stringify(createOwnedBrowserValue({ mission: "started" }, { kind: "anonymous" }, TIME_0));
  const previousAccount = JSON.stringify(createOwnedBrowserValue({ mission: "blocked" }, { kind: "account", userId: "account-a" }, TIME_A));
  const currentStorage = createMemoryStorage();
  assertWrite(currentStorage, ACCOUNT_A, { mission: "started" }, TIME_A);

  const cases = [
    [currentStorage.getItem(descriptor.key), "current_container"],
    [previousAnonymous, "previous_owner_envelope"],
    [previousAccount, "previous_owner_envelope"],
    [validRaw, "legacy_raw_anonymous"],
    ["{bad", "corrupt_json"],
    ["42", "invalid_primitive"],
    [JSON.stringify({ version: 1, owner: { kind: "anonymous" } }), "partial_envelope"],
    [JSON.stringify({ format: OWNER_PARTITION_CONTAINER_FORMAT, version: 1, partitions: {} }), "partial_container"],
    [JSON.stringify({ version: 9, owner: { kind: "anonymous" }, value: { mission: "started" }, updatedAt: TIME_0 }), "unsupported_future_version"],
    [JSON.stringify({ format: OWNER_PARTITION_CONTAINER_FORMAT, version: 9, partitions: { accounts: {} } }), "unsupported_future_version"],
    [JSON.stringify({ mission: "not-a-status" }), "ambiguous_object"],
    [JSON.stringify({ version: 1, owner: { kind: "account", userId: "  " }, value: { mission: "started" }, updatedAt: TIME_0 }), "partial_envelope"],
    [JSON.stringify(["not-a-map"]), "invalid_descriptor_value"],
  ];
  for (const [raw, status] of cases) {
    assert.equal(classifyStoredValue(raw, descriptor).status, status);
  }

  for (const [raw, classification] of cases.slice(4)) {
    const storage = createMemoryStorage({ [descriptor.key]: raw });
    assert.equal(readVisibleStoredValue(raw, descriptor, ANONYMOUS).status, "corrupted");
    const write = writeOwnedStorageValue(descriptor, { safe: "started" }, ACCOUNT_A, { storage, updatedAt: TIME_A });
    assert.equal(write.ok, false);
    assert.equal(storage.getItem(descriptor.key), raw);
    window.localStorage = storage;
    const imported = importAnonymousBrowserWorkspaceToAccount("account-a", TIME_A);
    assert.equal(imported.ok, false);
    assert.equal(storage.getItem(descriptor.key), raw);
    const exported = buildBrowserDataExport(ANONYMOUS, TIME_A);
    assert.equal(exported.ok, false);
    assert.equal(
      exported.error.code,
      classification === "unsupported_future_version"
        ? "unsupported_storage_version"
        : "corrupt_visible_data",
    );
    assert.equal("json" in exported, false);
    assert.equal(storage.getItem(descriptor.key), raw);
  }
});

run("ordinary updatedAt fields remain descriptor-approved raw legacy data", () => {
  const targetRoleSetup = {
    targetRole: "Frontend Engineer",
    careerField: "tech_software",
    experienceLevel: "fresher",
    primaryGoal: "get_first_job",
    preferredJobType: "frontend",
    weeklyTimeCommitment: "medium",
    updatedAt: TIME_A,
  };
  const rawSetup = JSON.stringify(targetRoleSetup);
  assert.equal(
    classifyStoredValue(rawSetup, TARGET_ROLE_SETUP_STORAGE_DESCRIPTOR).status,
    "legacy_raw_anonymous",
  );
  assert.deepEqual(
    JSON.parse(readVisibleStoredValue(
      rawSetup,
      TARGET_ROLE_SETUP_STORAGE_DESCRIPTOR,
      ANONYMOUS,
    ).serializedValue),
    targetRoleSetup,
  );

  const setupStorage = createMemoryStorage({
    [TARGET_ROLE_SETUP_STORAGE_DESCRIPTOR.key]: rawSetup,
  });
  const setupWrite = writeOwnedStorageValue(
    TARGET_ROLE_SETUP_STORAGE_DESCRIPTOR,
    { ...targetRoleSetup, targetRole: "Full Stack Engineer" },
    ACCOUNT_A,
    { storage: setupStorage, updatedAt: TIME_B },
  );
  assert.equal(setupWrite.ok, true);
  assert.deepEqual(
    readValueForDescriptor(
      setupStorage,
      TARGET_ROLE_SETUP_STORAGE_DESCRIPTOR,
      ANONYMOUS,
    ),
    targetRoleSetup,
  );

  const activeTarget = createManualActiveTarget({
    title: "Frontend Engineer",
    now: TIME_A,
  });
  assert.ok(activeTarget);
  const rawActiveTarget = JSON.stringify(activeTarget);
  assert.equal(
    classifyStoredValue(rawActiveTarget, ACTIVE_TARGET_STORAGE_DESCRIPTOR).status,
    "legacy_raw_anonymous",
  );
  assert.equal(
    readVisibleStoredValue(
      rawActiveTarget,
      ACTIVE_TARGET_STORAGE_DESCRIPTOR,
      ANONYMOUS,
    ).status,
    "visible",
  );

  const previousActiveEnvelope = JSON.stringify({
    version: ACTIVE_TARGET_STORAGE_VERSION,
    ownerUserId: "account-a",
    target: activeTarget,
  });
  assert.equal(
    classifyStoredValue(
      previousActiveEnvelope,
      ACTIVE_TARGET_STORAGE_DESCRIPTOR,
    ).status,
    "previous_owner_envelope",
  );
  assert.equal(
    readVisibleStoredValue(
      previousActiveEnvelope,
      ACTIVE_TARGET_STORAGE_DESCRIPTOR,
      ACCOUNT_A,
    ).status,
    "visible",
  );
  assert.equal(
    classifyStoredValue(
      JSON.stringify({ version: 1, owner: { kind: "account" } }),
      ACTIVE_TARGET_STORAGE_DESCRIPTOR,
    ).status,
    "partial_envelope",
  );
  const futureActiveEnvelope = JSON.stringify({
    version: ACTIVE_TARGET_STORAGE_VERSION + 1,
    ownerUserId: "account-a",
    target: activeTarget,
  });
  const futureActiveStorage = createMemoryStorage({
    [ACTIVE_TARGET_STORAGE_DESCRIPTOR.key]: futureActiveEnvelope,
  });
  assert.equal(
    classifyStoredValue(
      futureActiveEnvelope,
      ACTIVE_TARGET_STORAGE_DESCRIPTOR,
    ).status,
    "unsupported_future_version",
  );
  assert.equal(
    writeOwnedStorageValue(
      ACTIVE_TARGET_STORAGE_DESCRIPTOR,
      activeTarget,
      ACCOUNT_A,
      { storage: futureActiveStorage, updatedAt: TIME_B },
    ).status,
    "unrecognized_existing_data",
  );
  assert.equal(
    futureActiveStorage.getItem(ACTIVE_TARGET_STORAGE_DESCRIPTOR.key),
    futureActiveEnvelope,
  );
});

run("parseActiveTarget applies owner context to every legacy and partition shape", () => {
  const activeTarget = createManualActiveTarget({
    title: "Frontend Engineer",
    now: TIME_A,
  });
  assert.ok(activeTarget);
  const directRaw = JSON.stringify(activeTarget);
  assert.equal(parseActiveTarget(directRaw, ANONYMOUS)?.id, activeTarget.id);
  assert.equal(parseActiveTarget(directRaw, ACCOUNT_A), null);
  assert.equal(parseActiveTarget(directRaw, ACCOUNT_B), null);
  assert.equal(parseActiveTarget(directRaw, { currentUserId: undefined }), null);

  const accountAEnvelope = JSON.stringify({
    version: ACTIVE_TARGET_STORAGE_VERSION,
    ownerUserId: "account-a",
    target: activeTarget,
  });
  assert.equal(parseActiveTarget(accountAEnvelope, ACCOUNT_A)?.id, activeTarget.id);
  assert.equal(parseActiveTarget(accountAEnvelope, ACCOUNT_B), null);
  assert.equal(parseActiveTarget(accountAEnvelope, ANONYMOUS), null);
  assert.equal(parseActiveTarget(JSON.stringify({
    version: ACTIVE_TARGET_STORAGE_VERSION + 1,
    ownerUserId: "account-a",
    target: activeTarget,
  }), ACCOUNT_A), null);

  const storage = createMemoryStorage();
  assert.equal(writeOwnedStorageValue(
    ACTIVE_TARGET_STORAGE_DESCRIPTOR,
    activeTarget,
    ACCOUNT_A,
    { storage, updatedAt: TIME_A },
  ).ok, true);
  const currentPartitionRaw = storage.getItem(ACTIVE_TARGET_STORAGE_DESCRIPTOR.key);
  assert.equal(parseActiveTarget(currentPartitionRaw, ACCOUNT_A)?.id, activeTarget.id);
  assert.equal(parseActiveTarget(currentPartitionRaw, ACCOUNT_B), null);
  assert.equal(parseActiveTarget(currentPartitionRaw, ANONYMOUS), null);
  assert.equal(parseActiveTarget("{bad", ACCOUNT_A), null);
});

run("descriptor-valid reserved-field raw values precede partial-envelope fallback", () => {
  const reservedFieldDescriptor = {
    ...MISSION_STATUS_STORAGE_DESCRIPTOR,
    key: "fixture:reserved-field-object",
    validateValue(value) {
      return Boolean(value) && typeof value === "object" &&
        !Array.isArray(value) &&
        Object.keys(value).length === 3 &&
        (value).version === 7 &&
        (value).value === "career-state" &&
        ((value).updatedAt === TIME_A || (value).updatedAt === TIME_B);
    },
  };
  const validRawValue = {
    version: 7,
    value: "career-state",
    updatedAt: TIME_A,
  };
  const validRaw = JSON.stringify(validRawValue);
  assert.equal(
    classifyStoredValue(validRaw, reservedFieldDescriptor).status,
    "legacy_raw_anonymous",
  );
  assert.deepEqual(
    JSON.parse(readVisibleStoredValue(
      validRaw,
      reservedFieldDescriptor,
      ANONYMOUS,
    ).serializedValue),
    validRawValue,
  );
  const storage = createMemoryStorage({ [reservedFieldDescriptor.key]: validRaw });
  const migratedValue = {
    version: 7,
    value: "career-state",
    updatedAt: TIME_B,
  };
  assert.equal(writeOwnedStorageValue(
    reservedFieldDescriptor,
    migratedValue,
    ACCOUNT_A,
    { storage, updatedAt: TIME_B },
  ).ok, true);
  assert.deepEqual(
    readValueForDescriptor(storage, reservedFieldDescriptor, ANONYMOUS),
    validRawValue,
  );
  assert.deepEqual(
    readValueForDescriptor(storage, reservedFieldDescriptor, ACCOUNT_A),
    migratedValue,
  );

  const invalidRaw = JSON.stringify({
    version: 7,
    value: "wrong",
    updatedAt: TIME_A,
  });
  assert.notEqual(
    classifyStoredValue(invalidRaw, reservedFieldDescriptor).status,
    "legacy_raw_anonymous",
  );
  assert.equal(
    readVisibleStoredValue(
      invalidRaw,
      reservedFieldDescriptor,
      ANONYMOUS,
    ).status,
    "corrupted",
  );

  const malformedGenericEnvelope = JSON.stringify({
    version: 1,
    owner: { kind: "account" },
    value: "career-state",
    updatedAt: TIME_A,
  });
  assert.equal(
    classifyStoredValue(
      malformedGenericEnvelope,
      reservedFieldDescriptor,
    ).status,
    "partial_envelope",
  );
  const unsupportedGenericEnvelope = JSON.stringify({
    version: 2,
    owner: { kind: "account", userId: "account-a" },
    value: "career-state",
    updatedAt: TIME_A,
  });
  const unsupportedStorage = createMemoryStorage({
    [reservedFieldDescriptor.key]: unsupportedGenericEnvelope,
  });
  assert.equal(
    classifyStoredValue(
      unsupportedGenericEnvelope,
      reservedFieldDescriptor,
    ).status,
    "unsupported_future_version",
  );
  assert.equal(writeOwnedStorageValue(
    reservedFieldDescriptor,
    migratedValue,
    ACCOUNT_A,
    { storage: unsupportedStorage, updatedAt: TIME_B },
  ).ok, false);
  assert.equal(
    unsupportedStorage.getItem(reservedFieldDescriptor.key),
    unsupportedGenericEnvelope,
  );
});

run("descriptor-aware container v2 safely migrates Slice 1 container v1", () => {
  const descriptor = MISSION_STATUS_STORAGE_DESCRIPTOR;
  const storage = createMemoryStorage();
  assertWrite(storage, ANONYMOUS, { anon: "suggested" }, TIME_0);
  assertWrite(storage, ACCOUNT_A, { a: "started" }, TIME_A);
  assertWrite(storage, ACCOUNT_B, { b: "blocked" }, TIME_B);
  const currentRaw = storage.getItem(descriptor.key);
  const currentParsed = JSON.parse(currentRaw);
  assert.equal(currentParsed.version, OWNER_PARTITION_CONTAINER_VERSION);
  assert.equal(currentParsed.descriptorVersion, descriptor.version);
  assert.equal(classifyStoredValue(currentRaw, descriptor).status, "current_container");

  const legacyParsed = {
    format: currentParsed.format,
    version: 1,
    partitions: currentParsed.partitions,
  };
  const legacyRaw = JSON.stringify(legacyParsed);
  const legacyClassification = classifyStoredValue(legacyRaw, descriptor);
  assert.equal(legacyClassification.status, "previous_container");
  const untouchedAnonymous = JSON.stringify(
    getOwnerPartitionFromContainer(
      legacyClassification.container,
      { kind: "anonymous" },
    ),
  );
  const untouchedB = JSON.stringify(
    getOwnerPartitionFromContainer(
      legacyClassification.container,
      { kind: "account", userId: "account-b" },
    ),
  );

  const legacyStorage = createMemoryStorage({ [descriptor.key]: legacyRaw });
  assert.equal(
    writeOwnedStorageValue(
      descriptor,
      { a: "done_by_user" },
      ACCOUNT_A,
      { storage: legacyStorage, updatedAt: "2026-07-12T03:00:00.000Z" },
    ).ok,
    true,
  );
  const migrated = currentContainer(legacyStorage);
  assert.equal(migrated.version, OWNER_PARTITION_CONTAINER_VERSION);
  assert.equal(migrated.descriptorVersion, descriptor.version);
  assert.equal(
    JSON.stringify(getOwnerPartitionFromContainer(migrated, { kind: "anonymous" })),
    untouchedAnonymous,
  );
  assert.equal(
    JSON.stringify(getOwnerPartitionFromContainer(
      migrated,
      { kind: "account", userId: "account-b" },
    )),
    untouchedB,
  );

  const higherVersionRaw = JSON.stringify({
    ...currentParsed,
    descriptorVersion: descriptor.version + 1,
  });
  const higherStorage = createMemoryStorage({ [descriptor.key]: higherVersionRaw });
  assert.equal(
    classifyStoredValue(higherVersionRaw, descriptor).status,
    "descriptor_version_mismatch",
  );
  assert.equal(
    writeOwnedStorageValue(descriptor, { a: "started" }, ACCOUNT_A, {
      storage: higherStorage,
      updatedAt: TIME_A,
    }).ok,
    false,
  );
  assert.equal(higherStorage.getItem(descriptor.key), higherVersionRaw);

  const descriptorV2 = { ...descriptor, version: descriptor.version + 1 };
  const lowerVersionRaw = JSON.stringify({
    ...currentParsed,
    descriptorVersion: descriptor.version,
  });
  const lowerStorage = createMemoryStorage({ [descriptor.key]: lowerVersionRaw });
  assert.equal(
    classifyStoredValue(lowerVersionRaw, descriptorV2).status,
    "descriptor_version_mismatch",
  );
  assert.equal(
    writeOwnedStorageValue(descriptorV2, { a: "started" }, ACCOUNT_A, {
      storage: lowerStorage,
      updatedAt: TIME_A,
    }).ok,
    false,
  );
  assert.equal(lowerStorage.getItem(descriptor.key), lowerVersionRaw);
});

run("account maps reject non-canonical collisions and use own-property lookup", () => {
  const descriptor = MISSION_STATUS_STORAGE_DESCRIPTOR;
  const partitionA = { value: { a: "started" }, updatedAt: TIME_A };
  const partitionB = { value: { b: "blocked" }, updatedAt: TIME_B };
  const canonicalRaw = JSON.stringify({
    format: OWNER_PARTITION_CONTAINER_FORMAT,
    version: OWNER_PARTITION_CONTAINER_VERSION,
    descriptorVersion: descriptor.version,
    partitions: {
      accounts: { "account-a": partitionA, "account-b": partitionB },
    },
  });
  const canonical = classifyStoredValue(canonicalRaw, descriptor);
  assert.equal(canonical.status, "current_container");
  assert.deepEqual(
    getOwnerPartitionFromContainer(
      canonical.container,
      { kind: "account", userId: "account-a" },
    ),
    partitionA,
  );
  assert.deepEqual(
    getOwnerPartitionFromContainer(
      canonical.container,
      { kind: "account", userId: "account-b" },
    ),
    partitionB,
  );

  const malformedMaps = [
    { " account-a ": partitionA },
    { "account-a": partitionA, " account-a ": partitionB },
  ];
  for (const accounts of malformedMaps) {
    const raw = JSON.stringify({
      format: OWNER_PARTITION_CONTAINER_FORMAT,
      version: OWNER_PARTITION_CONTAINER_VERSION,
      descriptorVersion: descriptor.version,
      partitions: { accounts },
    });
    const storage = createMemoryStorage({ [descriptor.key]: raw });
    assert.equal(classifyStoredValue(raw, descriptor).status, "partial_container");
    assert.equal(
      writeOwnedStorageValue(descriptor, { b: "started" }, ACCOUNT_B, {
        storage,
        updatedAt: TIME_B,
      }).ok,
      false,
    );
    assert.equal(storage.getItem(descriptor.key), raw);
  }

  const emptyAccountsRaw = JSON.stringify({
    format: OWNER_PARTITION_CONTAINER_FORMAT,
    version: OWNER_PARTITION_CONTAINER_VERSION,
    descriptorVersion: descriptor.version,
    partitions: { accounts: {} },
  });
  const emptyAccounts = classifyStoredValue(emptyAccountsRaw, descriptor);
  assert.equal(emptyAccounts.status, "current_container");
  for (const inheritedName of ["toString", "valueOf", "hasOwnProperty"]) {
    assert.equal(
      getOwnerPartitionFromContainer(
        emptyAccounts.container,
        { kind: "account", userId: inheritedName },
      ),
      null,
    );
    const storage = createMemoryStorage({ [descriptor.key]: emptyAccountsRaw });
    const removal = removeOwnedStoragePartition(
      descriptor,
      { currentUserId: inheritedName },
      { storage },
    );
    assert.equal(removal.changed, false);
    assert.equal(storage.getItem(descriptor.key), emptyAccountsRaw);
  }
});

run("lazy legacy migration preserves owners and refuses future data", () => {
  const descriptor = MISSION_STATUS_STORAGE_DESCRIPTOR;
  const legacyA = JSON.stringify(createOwnedBrowserValue({ a: "started" }, { kind: "account", userId: "account-a" }, TIME_A));
  const storage = createMemoryStorage({ [descriptor.key]: legacyA });
  assertWrite(storage, ACCOUNT_B, { b: "blocked" }, TIME_B);
  assert.deepEqual(readValue(storage, ACCOUNT_A), { a: "started" });
  assert.deepEqual(readValue(storage, ACCOUNT_B), { b: "blocked" });

  const rawAnonymous = JSON.stringify({ anonymous: "suggested" });
  const anonymousStorage = createMemoryStorage({ [descriptor.key]: rawAnonymous });
  assertWrite(anonymousStorage, ACCOUNT_A, { a: "started" }, TIME_A);
  assert.deepEqual(readValue(anonymousStorage, ANONYMOUS), { anonymous: "suggested" });

  const futureRaw = JSON.stringify({ format: OWNER_PARTITION_CONTAINER_FORMAT, version: 5, partitions: { accounts: {} } });
  const futureStorage = createMemoryStorage({ [descriptor.key]: futureRaw });
  assert.equal(writeOwnedStorageValue(descriptor, { a: "started" }, ACCOUNT_A, { storage: futureStorage }).status, "unrecognized_existing_data");
  assert.equal(futureStorage.getItem(descriptor.key), futureRaw);
});

run("anonymous import is all-or-nothing, conflict-safe, and owner-preserving", () => {
  const storage = createMemoryStorage();
  assertWrite(storage, ANONYMOUS, { anon: "suggested" }, TIME_0);
  assertWrite(storage, ACCOUNT_B, { b: "blocked" }, TIME_B);
  window.localStorage = storage;
  const bBefore = JSON.stringify(getOwnerPartitionFromContainer(currentContainer(storage), { kind: "account", userId: "account-b" }));
  const success = importAnonymousBrowserWorkspaceToAccount("account-a", TIME_A);
  assert.equal(success.outcome, "success");
  assert.deepEqual(readValue(storage, ACCOUNT_A), { anon: "suggested" });
  assert.equal(readVisibleStoredValue(storage.getItem(MISSION_STATUS_STORAGE_KEY), MISSION_STATUS_STORAGE_DESCRIPTOR, ANONYMOUS).status, "hidden_for_owner");
  assert.equal(JSON.stringify(getOwnerPartitionFromContainer(currentContainer(storage), { kind: "account", userId: "account-b" })), bBefore);

  const conflictStorage = createMemoryStorage();
  assertWrite(conflictStorage, ANONYMOUS, { anon: "suggested" }, TIME_0);
  assertWrite(conflictStorage, ACCOUNT_A, { a: "started" }, TIME_A);
  const conflictRaw = conflictStorage.getItem(MISSION_STATUS_STORAGE_KEY);
  window.localStorage = conflictStorage;
  const conflict = importAnonymousBrowserWorkspaceToAccount("account-a", TIME_B);
  assert.equal(conflict.outcome, "conflict_no_writes");
  assert.ok(conflict.conflictDescriptors.includes(MISSION_STATUS_STORAGE_KEY));
  assert.equal(conflictStorage.getItem(MISSION_STATUS_STORAGE_KEY), conflictRaw);

  for (const invalidRaw of ["{bad", JSON.stringify({ format: OWNER_PARTITION_CONTAINER_FORMAT, version: 7, partitions: { accounts: {} } })]) {
    const invalidStorage = createMemoryStorage({ [MISSION_STATUS_STORAGE_KEY]: invalidRaw });
    window.localStorage = invalidStorage;
    const result = importAnonymousBrowserWorkspaceToAccount("account-a", TIME_A);
    assert.equal(result.ok, false);
    assert.equal(result.destinationWritesSucceeded.length, 0);
    assert.equal(invalidStorage.getItem(MISSION_STATUS_STORAGE_KEY), invalidRaw);
  }

  for (const legacySource of [
    JSON.stringify(createOwnedBrowserValue({ legacy: "suggested" }, { kind: "anonymous" }, TIME_0)),
    JSON.stringify({ legacy: "suggested" }),
  ]) {
    const legacyStorage = createMemoryStorage({ [MISSION_STATUS_STORAGE_KEY]: legacySource });
    window.localStorage = legacyStorage;
    const legacyImport = importAnonymousBrowserWorkspaceToAccount("account-a", TIME_A);
    assert.equal(legacyImport.outcome, "success");
    assert.deepEqual(readValue(legacyStorage, ACCOUNT_A), { legacy: "suggested" });
    assert.equal(readValue(legacyStorage, ANONYMOUS), null);
  }
});

run("anonymous import uses one final write and guarded rollback reports truthfully", () => {
  let workspaceEvents = 0;
  const originalDispatchEvent = window.dispatchEvent;
  window.dispatchEvent = (event) => {
    if (event?.type === "skillmint:workspace-updated") workspaceEvents += 1;
    return true;
  };
  const buildTwoKeyStorage = () => {
    const storage = createMemoryStorage();
    assertWrite(storage, ANONYMOUS, { anon: "suggested" }, TIME_0);
    writeOwnedStorageValue(SELECTED_CAREER_PATH_STORAGE_DESCRIPTOR, "closest-role", ANONYMOUS, { storage, updatedAt: TIME_0 });
    storage.resetSetCount();
    return storage;
  };

  const restoredStorage = buildTwoKeyStorage();
  const restoredOriginal = restoredStorage.snapshot();
  restoredStorage.failSetCalls.add(2);
  window.localStorage = restoredStorage;
  const restored = importAnonymousBrowserWorkspaceToAccount("account-a", TIME_A);
  assert.equal(restored.outcome, "failure_complete_rollback");
  assert.equal(restored.exactStateRestored, true);
  assert.deepEqual(restoredStorage.snapshot(), restoredOriginal);
  assert.equal(workspaceEvents, 0);

  workspaceEvents = 0;
  const damagedStorage = buildTwoKeyStorage();
  damagedStorage.failSetCalls.add(2);
  damagedStorage.failSetCalls.add(3);
  window.localStorage = damagedStorage;
  const damaged = importAnonymousBrowserWorkspaceToAccount("account-a", TIME_A);
  assert.equal(damaged.outcome, "failure_incomplete_rollback");
  assert.equal(damaged.integrityWarning, true);
  assert.ok(damaged.rollbackFailedKeys.length > 0);
  assert.equal(workspaceEvents, 1);

  workspaceEvents = 0;
  const successfulStorage = buildTwoKeyStorage();
  window.localStorage = successfulStorage;
  const successful = importAnonymousBrowserWorkspaceToAccount("account-a", TIME_A);
  assert.equal(successful.outcome, "success");
  assert.equal(successfulStorage.setCount, 2);
  assert.equal(successful.destinationWritesSucceeded.length, 2);
  assert.equal(successful.anonymousRemovalsSucceeded.length, 2);
  assert.equal(workspaceEvents, 1);
  window.dispatchEvent = originalDispatchEvent;
});

run("anonymous import rolls back every final write that was not verified", () => {
  const verificationReadFailure = createMemoryStorage();
  assertWrite(verificationReadFailure, ANONYMOUS, { anon: "suggested" }, TIME_0);
  const verificationReadOriginal = verificationReadFailure.snapshot();
  verificationReadFailure.resetSetCount();
  verificationReadFailure.failGetAtByKey.set(
    MISSION_STATUS_STORAGE_KEY,
    new Set([3]),
  );
  window.localStorage = verificationReadFailure;
  const verificationReadResult = importAnonymousBrowserWorkspaceToAccount("account-a", TIME_A);
  assert.equal(verificationReadResult.outcome, "failure_complete_rollback");
  assert.equal(verificationReadResult.exactStateRestored, true);
  assert.equal(verificationReadResult.integrityWarning, false);
  assert.equal(verificationReadResult.destinationWritesSucceeded.includes(MISSION_STATUS_STORAGE_KEY), false);
  assert.ok(verificationReadResult.rollbackSucceededKeys.includes(MISSION_STATUS_STORAGE_KEY));
  assert.deepEqual(verificationReadFailure.snapshot(), verificationReadOriginal);
  assert.equal(readValue(verificationReadFailure, ACCOUNT_A), null);

  const externalBeforeVerification = createMemoryStorage();
  assertWrite(externalBeforeVerification, ANONYMOUS, { anon: "suggested" }, TIME_0);
  const externalRaw = "external-browser-change";
  externalBeforeVerification.resetSetCount();
  externalBeforeVerification.afterSet = (key, _value, storage) => {
    if (key === MISSION_STATUS_STORAGE_KEY && storage.setCount === 1) {
      storage.externalSet(key, externalRaw);
    }
  };
  window.localStorage = externalBeforeVerification;
  const externalResult = importAnonymousBrowserWorkspaceToAccount("account-a", TIME_A);
  assert.equal(externalResult.outcome, "failure_incomplete_rollback");
  assert.equal(externalResult.exactStateRestored, false);
  assert.equal(externalResult.integrityWarning, true);
  assert.equal(externalResult.destinationWritesSucceeded.includes(MISSION_STATUS_STORAGE_KEY), false);
  assert.ok(externalResult.rollbackFailedKeys.includes(MISSION_STATUS_STORAGE_KEY));
  assert.equal(externalBeforeVerification.getItem(MISSION_STATUS_STORAGE_KEY), externalRaw);

  let descriptorRemainsValid = true;
  const verificationConditionDescriptor = {
    ...MISSION_STATUS_STORAGE_DESCRIPTOR,
    key: "fixture:verification-condition-failure",
    validateValue: (value) => descriptorRemainsValid &&
      MISSION_STATUS_STORAGE_DESCRIPTOR.validateValue(value),
  };
  const verificationConditionFailure = createMemoryStorage();
  assert.equal(writeOwnedStorageValue(
    verificationConditionDescriptor,
    { anon: "suggested" },
    ANONYMOUS,
    { storage: verificationConditionFailure, updatedAt: TIME_0 },
  ).ok, true);
  const verificationConditionOriginal = verificationConditionFailure.snapshot();
  verificationConditionFailure.resetSetCount();
  verificationConditionFailure.afterSet = (key) => {
    if (key === verificationConditionDescriptor.key) {
      descriptorRemainsValid = false;
    }
  };
  SKILLMINT_STORAGE_DESCRIPTORS.push(verificationConditionDescriptor);
  try {
    window.localStorage = verificationConditionFailure;
    const conditionResult = importAnonymousBrowserWorkspaceToAccount("account-a", TIME_A);
    assert.equal(conditionResult.outcome, "failure_complete_rollback");
    assert.equal(conditionResult.exactStateRestored, true);
    assert.equal(conditionResult.destinationWritesSucceeded.includes(verificationConditionDescriptor.key), false);
    assert.ok(conditionResult.rollbackSucceededKeys.includes(verificationConditionDescriptor.key));
    assert.deepEqual(verificationConditionFailure.snapshot(), verificationConditionOriginal);
  } finally {
    SKILLMINT_STORAGE_DESCRIPTORS.pop();
  }

  const laterDescriptorFailure = createMemoryStorage();
  assertWrite(laterDescriptorFailure, ANONYMOUS, { anon: "suggested" }, TIME_0);
  assert.equal(writeOwnedStorageValue(
    SELECTED_CAREER_PATH_STORAGE_DESCRIPTOR,
    "closest-role",
    ANONYMOUS,
    { storage: laterDescriptorFailure, updatedAt: TIME_0 },
  ).ok, true);
  const laterDescriptorOriginal = laterDescriptorFailure.snapshot();
  laterDescriptorFailure.resetSetCount();
  laterDescriptorFailure.failGetAtByKey.set(
    SELECTED_CAREER_PATH_STORAGE_DESCRIPTOR.key,
    new Set([3]),
  );
  window.localStorage = laterDescriptorFailure;
  const laterDescriptorResult = importAnonymousBrowserWorkspaceToAccount("account-a", TIME_A);
  assert.equal(laterDescriptorResult.outcome, "failure_complete_rollback");
  assert.equal(laterDescriptorResult.exactStateRestored, true);
  assert.ok(laterDescriptorResult.destinationWritesSucceeded.includes(MISSION_STATUS_STORAGE_KEY));
  assert.equal(laterDescriptorResult.destinationWritesSucceeded.includes(SELECTED_CAREER_PATH_STORAGE_DESCRIPTOR.key), false);
  assert.ok(laterDescriptorResult.rollbackSucceededKeys.includes(MISSION_STATUS_STORAGE_KEY));
  assert.ok(laterDescriptorResult.rollbackSucceededKeys.includes(SELECTED_CAREER_PATH_STORAGE_DESCRIPTOR.key));
  assert.deepEqual(laterDescriptorFailure.snapshot(), laterDescriptorOriginal);
});

run("anonymous import preserves concurrent browser changes before and during writes", () => {
  const beforeFirst = createMemoryStorage();
  assertWrite(beforeFirst, ANONYMOUS, { anon: "suggested" }, TIME_0);
  beforeFirst.afterGet = (key, value, storage) => {
    if (key === MISSION_STATUS_STORAGE_KEY && storage.getCountByKey.get(key) === 1) {
      storage.externalSet(key, `${value}-external`);
    }
  };
  const beforeRaw = beforeFirst.snapshot();
  beforeFirst.resetSetCount();
  window.localStorage = beforeFirst;
  const beforeResult = importAnonymousBrowserWorkspaceToAccount("account-a", TIME_A);
  assert.equal(beforeResult.outcome, "conflict_no_writes");
  assert.equal(beforeResult.destinationWritesSucceeded.length, 0);
  assert.equal(beforeResult.exactStateRestored, false);
  assert.deepEqual(beforeFirst.snapshot(), { ...beforeRaw, [MISSION_STATUS_STORAGE_KEY]: `${beforeRaw[MISSION_STATUS_STORAGE_KEY]}-external` });

  const duringImport = createMemoryStorage();
  assertWrite(duringImport, ANONYMOUS, { anon: "suggested" }, TIME_0);
  writeOwnedStorageValue(SELECTED_CAREER_PATH_STORAGE_DESCRIPTOR, "closest-role", ANONYMOUS, { storage: duringImport, updatedAt: TIME_0 });
  duringImport.afterGet = (key, value, storage) => {
    if (key === SELECTED_CAREER_PATH_STORAGE_DESCRIPTOR.key && storage.getCountByKey.get(key) === 1) {
      storage.externalSet(key, `${value}-external`);
    }
  };
  duringImport.resetSetCount();
  window.localStorage = duringImport;
  const duringResult = importAnonymousBrowserWorkspaceToAccount("account-a", TIME_A);
  assert.equal(duringResult.outcome, "conflict_rolled_back");
  assert.equal(duringResult.exactStateRestored, false);
  assert.equal(duringResult.integrityWarning, true);
  assert.equal(readValue(duringImport, ACCOUNT_A), null);
  assert.ok(duringImport.getItem(SELECTED_CAREER_PATH_STORAGE_DESCRIPTOR.key).endsWith("-external"));

  const guardedRollback = createMemoryStorage();
  assertWrite(guardedRollback, ANONYMOUS, { anon: "suggested" }, TIME_0);
  writeOwnedStorageValue(SELECTED_CAREER_PATH_STORAGE_DESCRIPTOR, "closest-role", ANONYMOUS, { storage: guardedRollback, updatedAt: TIME_0 });
  guardedRollback.afterGet = (key, value, storage) => {
    if (key === MISSION_STATUS_STORAGE_KEY && storage.getCountByKey.get(key) === 3) {
      storage.externalSet(key, `${value}-external`);
    }
  };
  guardedRollback.resetSetCount();
  guardedRollback.failSetCalls.add(2);
  window.localStorage = guardedRollback;
  const guardedResult = importAnonymousBrowserWorkspaceToAccount("account-a", TIME_A);
  assert.equal(guardedResult.outcome, "failure_incomplete_rollback");
  assert.equal(guardedResult.integrityWarning, true);
  assert.ok(guardedResult.rollbackFailedKeys.includes(MISSION_STATUS_STORAGE_KEY));
  assert.ok(guardedRollback.getItem(MISSION_STATUS_STORAGE_KEY).endsWith("-external"));
});

run("anonymous import sanitizes unproven resume and JD account metadata without changing local work", () => {
  const storage = createMemoryStorage();
  const resume = {
    ...createActiveResume(TIME_A),
    databaseId: "unproven-resume-id",
    accountId: "other-account",
    userId: "other-user",
    serverRecordId: "server-resume",
    remoteId: "remote-resume",
  };
  const resumeContext = createActiveTargetResumeContext({
    fileName: resume.fileName,
    extractedText: resume.extractedText,
    analyzedAt: resume.analyzedAt,
    scoringVersion: "fixture",
    userProfile: resume.userProfile,
  });
  const preparedResume = prepareAnonymousActiveResumeAnalysis(resume);
  assert.equal(preparedResume.ok, true);
  assert.equal(preparedResume.value.databaseId, undefined);
  assert.equal(preparedResume.value.accountId, undefined);
  assert.equal(isActiveResumeAnalysis(preparedResume.value), true);
  const jdMatch = {
    ...createJobMatch("anonymous", TIME_A),
    id: "7bb7f43f-4a5d-4e5b-9001-123456789abc",
    databaseId: "unproven-jd-id",
    syncStatus: "synced",
    resumeContext,
    accountId: "other-account",
    serverRecordId: "server-jd",
  };
  const historyMatch = {
    ...createJobMatch("anonymous-history", TIME_A),
    id: "unproven-history-id",
    databaseId: "unproven-history-id",
    syncStatus: "synced",
    resumeContext,
  };
  writeOwnedStorageValue(ACTIVE_RESUME_ANALYSIS_STORAGE_DESCRIPTOR, resume, ANONYMOUS, { storage, updatedAt: TIME_A });
  writeOwnedStorageValue(RESUME_SYNC_STATUS_STORAGE_DESCRIPTOR, { status: "synced", message: "Resume saved to your SkillMint account.", syncedAt: TIME_A, databaseId: "unproven-resume-id" }, ANONYMOUS, { storage, updatedAt: TIME_A });
  writeOwnedStorageValue(JD_MATCH_STORAGE_DESCRIPTOR, jdMatch, ANONYMOUS, { storage, updatedAt: TIME_A });
  writeOwnedStorageValue(JD_MATCH_HISTORY_STORAGE_DESCRIPTOR, [historyMatch], ANONYMOUS, { storage, updatedAt: TIME_A });
  writeOwnedStorageValue(JD_MATCH_SYNC_STATUS_STORAGE_DESCRIPTOR, { status: "synced", message: "Job match saved to your SkillMint account.", syncedAt: TIME_A, databaseId: "unproven-jd-status-id" }, ANONYMOUS, { storage, updatedAt: TIME_A });
  writeOwnedStorageValue(MISSION_STATUS_STORAGE_DESCRIPTOR, { unchanged: "started" }, ANONYMOUS, { storage, updatedAt: TIME_A });
  window.localStorage = storage;

  const result = importAnonymousBrowserWorkspaceToAccount("account-a", TIME_B);
  assert.equal(result.ok, true);
  const importedResume = readValueForDescriptor(storage, ACTIVE_RESUME_ANALYSIS_STORAGE_DESCRIPTOR, ACCOUNT_A);
  assert.equal(importedResume.databaseId, undefined);
  assert.equal(importedResume.accountId, undefined);
  assert.equal(importedResume.userId, undefined);
  assert.equal(importedResume.serverRecordId, undefined);
  assert.equal(importedResume.remoteId, undefined);
  assert.deepEqual(importedResume.parsedProfile, resume.parsedProfile);
  assert.deepEqual(importedResume.userProfile, resume.userProfile);
  assert.equal(importedResume.analyzedAt, resume.analyzedAt);
  assert.equal(isActiveResumeAnalysis(importedResume), true);
  assert.deepEqual(readValue(storage, ACCOUNT_A), { unchanged: "started" });
  const importedResumeStatus = readValueForDescriptor(storage, RESUME_SYNC_STATUS_STORAGE_DESCRIPTOR, ACCOUNT_A);
  assert.equal(importedResumeStatus.status, "local-only");
  assert.equal(importedResumeStatus.databaseId, undefined);
  assert.equal(importedResumeStatus.syncedAt, undefined);
  assert.equal(importedResumeStatus.message, "Imported into this browser workspace. It is not saved to your account.");
  const importedCurrentJd = readValueForDescriptor(storage, JD_MATCH_STORAGE_DESCRIPTOR, ACCOUNT_A);
  assert.equal(importedCurrentJd.databaseId, undefined);
  assert.equal(importedCurrentJd.id, undefined);
  assert.equal(importedCurrentJd.accountId, undefined);
  assert.equal(importedCurrentJd.serverRecordId, undefined);
  assert.equal(importedCurrentJd.syncStatus, "local-only");
  assert.deepEqual(importedCurrentJd.result, jdMatch.result);
  assert.deepEqual(importedCurrentJd.resumeContext, resumeContext);
  const importedHistory = readValueForDescriptor(storage, JD_MATCH_HISTORY_STORAGE_DESCRIPTOR, ACCOUNT_A);
  assert.equal(importedHistory[0].databaseId, undefined);
  assert.notEqual(importedHistory[0].id, "unproven-history-id");
  assert.ok(importedHistory[0].id.startsWith("imported-jd-"));
  assert.equal(importedHistory[0].syncStatus, "local-only");
  assert.deepEqual(importedHistory[0].result, historyMatch.result);
  assert.deepEqual(importedHistory[0].resumeContext, resumeContext);
  const importedJdStatus = readValueForDescriptor(storage, JD_MATCH_SYNC_STATUS_STORAGE_DESCRIPTOR, ACCOUNT_A);
  assert.equal(importedJdStatus.status, "local-only");
  assert.equal(importedJdStatus.databaseId, undefined);
  assert.equal(importedJdStatus.syncedAt, undefined);
  assert.equal(readValueForDescriptor(storage, JD_MATCH_STORAGE_DESCRIPTOR, ANONYMOUS), null);
});

run("descriptor-owned JD reconstruction preserves local work with deterministic safe IDs", () => {
  const base = createJobMatch("safe-local-id", TIME_A);
  const currentLocal = prepareAnonymousCurrentJobMatch({
    ...base,
    id: "local-browser-match",
    databaseId: "remote-record",
    ownerId: "other-owner",
  });
  assert.equal(currentLocal.ok, true);
  assert.equal(currentLocal.value.id, "local-browser-match");
  assert.equal(currentLocal.value.databaseId, undefined);
  assert.equal(currentLocal.value.ownerId, undefined);
  assert.equal(currentLocal.value.syncStatus, "local-only");
  assert.deepEqual(currentLocal.value.result, base.result);
  assert.deepEqual(currentLocal.value.improvementPlan, base.improvementPlan);
  assert.deepEqual(currentLocal.value.rewritePlan, base.rewritePlan);
  assert.equal(currentLocal.value.analyzedAt, base.analyzedAt);

  const uuidId = "7bb7f43f-4a5d-4e5b-9001-123456789abc";
  const currentUuid = prepareAnonymousCurrentJobMatch({ ...base, id: uuidId });
  assert.equal(currentUuid.ok, true);
  assert.equal(currentUuid.value.id, undefined);
  const currentSameId = prepareAnonymousCurrentJobMatch({ ...base, id: "remote-record", databaseId: "remote-record" });
  assert.equal(currentSameId.ok, true);
  assert.equal(currentSameId.value.id, undefined);

  const historySource = [
    { ...base, id: uuidId, databaseId: "remote-a", accountId: "other" },
    { ...base, id: "remote-b", databaseId: "remote-b", analyzedAt: TIME_B },
    { ...base, id: "local-browser-match", analyzedAt: TIME_0 },
    { ...base, id: "local-browser-match", analyzedAt: TIME_0 },
  ];
  const first = prepareAnonymousJobMatchHistory(historySource);
  const second = prepareAnonymousJobMatchHistory(historySource);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.deepEqual(first.value.map((match) => match.id), second.value.map((match) => match.id));
  assert.equal(first.value[2].id, "local-browser-match");
  assert.equal(new Set(first.value.map((match) => match.id)).size, first.value.length);
  assert.ok(first.value[0].id.startsWith("imported-jd-"));
  assert.ok(first.value[1].id.startsWith("imported-jd-"));
  assert.equal(first.value[0].accountId, undefined);
  assert.ok(first.value.every((match) => match.syncStatus === "local-only"));
  assert.deepEqual(first.value[0].result, base.result);
  assert.deepEqual(first.value[0].improvementPlan, base.improvementPlan);
  assert.deepEqual(first.value[0].rewritePlan, base.rewritePlan);
  assert.equal(first.value[0].analyzedAt, base.analyzedAt);
  assert.equal(createImportedLocalJobMatchId(TIME_A, 0, new Set()), createImportedLocalJobMatchId(TIME_A, 0, new Set()));
});

run("imported sync status is always browser-local and truthful", () => {
  for (const status of ["synced", "local-only", "pending", "failed"]) {
    const resume = prepareAnonymousResumeSyncStatus({ status, message: "old", databaseId: "remote", syncedAt: TIME_A });
    const jd = prepareAnonymousJobMatchSyncStatus({ status, message: "old", databaseId: "remote", syncedAt: TIME_A });
    assert.equal(resume.ok, true);
    assert.equal(jd.ok, true);
    for (const imported of [resume.value, jd.value]) {
      assert.equal(imported.status, "local-only");
      assert.equal(imported.databaseId, undefined);
      assert.equal(imported.syncedAt, undefined);
      assert.equal(imported.message, "Imported into this browser workspace. It is not saved to your account.");
    }
  }
});

run("anonymous import rejection performs zero writes and preserves its exact source", () => {
  const descriptor = {
    ...MISSION_STATUS_STORAGE_DESCRIPTOR,
    key: "fixture:reject-anonymous-import",
    prepareAnonymousImport: () => ({ ok: false, reason: "fixture rejection" }),
  };
  const storage = createMemoryStorage();
  assertWrite(storage, ANONYMOUS, { source: "started" }, TIME_A);
  assert.equal(writeOwnedStorageValue(descriptor, { reject: "started" }, ANONYMOUS, { storage, updatedAt: TIME_A }).ok, true);
  const before = storage.snapshot();
  window.localStorage = storage;
  SKILLMINT_STORAGE_DESCRIPTORS.push(descriptor);
  try {
    const result = importAnonymousBrowserWorkspaceToAccount("account-a", TIME_B);
    assert.equal(result.ok, false);
    assert.deepEqual(result.rejectedDescriptors, [descriptor.key]);
    assert.equal(result.destinationWritesSucceeded.length, 0);
    assert.deepEqual(storage.snapshot(), before);
  } finally {
    SKILLMINT_STORAGE_DESCRIPTORS.pop();
  }
});

run("saved-report cleanup changes only the current owner and preserves no-op raw state", () => {
  const storage = createMemoryStorage();
  seedSavedReportReferences(storage, ANONYMOUS, "anon", TIME_0);
  seedSavedReportReferences(storage, ACCOUNT_A, "a", TIME_A);
  seedSavedReportReferences(storage, ACCOUNT_B, "b", TIME_B);
  window.localStorage = storage;

  const before = snapshotOwnerPartitions(storage);
  const cleanupA = detachDeletedSavedReportReferences(ACCOUNT_A);
  assert.ok(cleanupA.changedKeys.length > 0);
  const afterA = snapshotOwnerPartitions(storage);
  assert.deepEqual(afterA.anonymous, before.anonymous);
  assert.deepEqual(afterA.b, before.b);
  assert.notDeepEqual(afterA.a, before.a);
  assert.equal(readValueForDescriptor(storage, JD_MATCH_STORAGE_DESCRIPTOR, ACCOUNT_A).databaseId, undefined);
  assert.equal(readValueForDescriptor(storage, JD_MATCH_STORAGE_DESCRIPTOR, ACCOUNT_B).databaseId, "b-jd");

  const exactBeforeNoop = storage.snapshot();
  const noOp = detachDeletedSavedReportReferences(ACCOUNT_C);
  assert.equal(noOp.changedKeys.length, 0);
  assert.deepEqual(storage.snapshot(), exactBeforeNoop);

  const beforeAnonymousCleanup = snapshotOwnerPartitions(storage);
  detachDeletedSavedReportReferences(ANONYMOUS);
  const afterAnonymousCleanup = snapshotOwnerPartitions(storage);
  assert.deepEqual(afterAnonymousCleanup.a, beforeAnonymousCleanup.a);
  assert.deepEqual(afterAnonymousCleanup.b, beforeAnonymousCleanup.b);
});

run("saved-report cleanup detaches only deleted references and keeps local-only history byte-equivalent", () => {
  const storage = createMemoryStorage();
  const synced = {
    ...createJobMatch("a-synced", TIME_A),
    syncStatus: "failed",
  };
  const localOnly = {
    ...createJobMatch("a-local", TIME_A),
    syncStatus: "local-only",
  };
  delete localOnly.databaseId;
  const failed = {
    ...createJobMatch("a-failed", TIME_A),
    syncStatus: "failed",
  };
  delete failed.databaseId;
  writeOwnedStorageValue(RESUME_SYNC_STATUS_STORAGE_DESCRIPTOR, { status: "failed", message: "saved", syncedAt: TIME_A, databaseId: "a-resume" }, ACCOUNT_A, { storage, updatedAt: TIME_A });
  writeOwnedStorageValue(JD_MATCH_SYNC_STATUS_STORAGE_DESCRIPTOR, { status: "pending", message: "still saving" }, ACCOUNT_A, { storage, updatedAt: TIME_A });
  writeOwnedStorageValue(JD_MATCH_STORAGE_DESCRIPTOR, synced, ACCOUNT_A, { storage, updatedAt: TIME_A });
  writeOwnedStorageValue(JD_MATCH_HISTORY_STORAGE_DESCRIPTOR, [synced, localOnly, failed], ACCOUNT_A, { storage, updatedAt: TIME_A });
  seedSavedReportReferences(storage, ACCOUNT_B, "b", TIME_B);
  seedSavedReportReferences(storage, ANONYMOUS, "anon", TIME_0);
  window.localStorage = storage;
  const rawBefore = storage.snapshot();
  const historyBefore = JSON.stringify(readValueForDescriptor(storage, JD_MATCH_HISTORY_STORAGE_DESCRIPTOR, ACCOUNT_A)[1]);
  const failedBefore = JSON.stringify(readValueForDescriptor(storage, JD_MATCH_HISTORY_STORAGE_DESCRIPTOR, ACCOUNT_A)[2]);
  const result = detachDeletedSavedReportReferences(ACCOUNT_A);
  assert.ok(result.changedKeys.length > 0);
  assert.equal(readValueForDescriptor(storage, RESUME_SYNC_STATUS_STORAGE_DESCRIPTOR, ACCOUNT_A).status, "local-only");
  assert.equal(readValueForDescriptor(storage, RESUME_SYNC_STATUS_STORAGE_DESCRIPTOR, ACCOUNT_A).syncedAt, undefined);
  assert.deepEqual(readValueForDescriptor(storage, JD_MATCH_SYNC_STATUS_STORAGE_DESCRIPTOR, ACCOUNT_A), { status: "pending", message: "still saving" });
  const historyAfter = readValueForDescriptor(storage, JD_MATCH_HISTORY_STORAGE_DESCRIPTOR, ACCOUNT_A);
  assert.equal(historyAfter[0].databaseId, undefined);
  assert.equal(historyAfter[0].syncStatus, "local-only");
  assert.equal(JSON.stringify(historyAfter[1]), historyBefore);
  assert.equal(JSON.stringify(historyAfter[2]), failedBefore);
  assert.equal(storage.snapshot()[JD_MATCH_SYNC_STATUS_STORAGE_DESCRIPTOR.key], rawBefore[JD_MATCH_SYNC_STATUS_STORAGE_DESCRIPTOR.key]);
  assert.deepEqual(readValueForDescriptor(storage, JD_MATCH_HISTORY_STORAGE_DESCRIPTOR, ACCOUNT_B), [createJobMatch("b", TIME_B)]);
  assert.deepEqual(readValueForDescriptor(storage, JD_MATCH_HISTORY_STORAGE_DESCRIPTOR, ANONYMOUS), [createJobMatch("anon", TIME_0)]);
  const rawBeforeNoop = storage.snapshot();
  assert.equal(detachDeletedSavedReportReferences(ACCOUNT_C).changedKeys.length, 0);
  assert.deepEqual(storage.snapshot(), rawBeforeNoop);
});

run("workspace summary independently reports anonymous and other-account workspace truth", () => {
  const preferenceOnly = createMemoryStorage({ [ONBOARDING_DISMISSED_STORAGE_KEY]: "true" });
  window.localStorage = preferenceOnly;
  let summary = getBrowserStorageSummary(ACCOUNT_A);
  assert.equal(summary.otherWorkspaceDataExists, false);
  assert.equal(summary.anonymousWorkspaceDataExists, false);

  const aOnly = createMemoryStorage();
  assertWrite(aOnly, ACCOUNT_A, { a: "started" }, TIME_A);
  window.localStorage = aOnly;
  summary = getBrowserStorageSummary(ACCOUNT_A);
  assert.equal(summary.otherWorkspaceDataExists, false);
  assert.equal(summary.anonymousWorkspaceDataExists, false);

  const aAndB = createMemoryStorage();
  assertWrite(aAndB, ACCOUNT_A, { a: "started" }, TIME_A);
  assertWrite(aAndB, ACCOUNT_B, { b: "blocked" }, TIME_B);
  window.localStorage = aAndB;
  summary = getBrowserStorageSummary(ACCOUNT_A);
  assert.equal(summary.otherWorkspaceDataExists, true);
  assert.equal(summary.anonymousWorkspaceDataExists, false);
  assert.equal(JSON.stringify(summary).includes("account-b"), false);

  const aAndAnonymous = createMemoryStorage();
  assertWrite(aAndAnonymous, ACCOUNT_A, { a: "started" }, TIME_A);
  assertWrite(aAndAnonymous, ANONYMOUS, { anonymous: "blocked" }, TIME_0);
  window.localStorage = aAndAnonymous;
  summary = getBrowserStorageSummary(ACCOUNT_A);
  assert.equal(summary.otherWorkspaceDataExists, false);
  assert.equal(summary.anonymousWorkspaceDataExists, true);

  const allWorkspaces = createMemoryStorage();
  assertWrite(allWorkspaces, ACCOUNT_A, { a: "started" }, TIME_A);
  assertWrite(allWorkspaces, ACCOUNT_B, { b: "blocked" }, TIME_B);
  assertWrite(allWorkspaces, ANONYMOUS, { anonymous: "blocked" }, TIME_0);
  window.localStorage = allWorkspaces;
  summary = getBrowserStorageSummary(ACCOUNT_A);
  assert.equal(summary.otherWorkspaceDataExists, true);
  assert.equal(summary.anonymousWorkspaceDataExists, true);
  summary = getBrowserStorageSummary(ANONYMOUS);
  assert.equal(summary.otherWorkspaceDataExists, true);

  const malformed = createMemoryStorage({ [MISSION_STATUS_STORAGE_KEY]: "{bad" });
  window.localStorage = malformed;
  summary = getBrowserStorageSummary(ACCOUNT_A);
  assert.equal(summary.otherWorkspaceDataExists, false);
  assert.equal(summary.anonymousWorkspaceDataExists, false);

  assert.equal(formatOtherWorkspaceSummary(false, false), "No other SkillMint workspace data detected.");
  assert.equal(formatOtherWorkspaceSummary(true, false), "Signed-out or unassigned SkillMint workspace data exists in this browser.");
  assert.equal(formatOtherWorkspaceSummary(false, true), "Other SkillMint account workspace data exists in this browser.");
  assert.equal(formatOtherWorkspaceSummary(true, true), "Signed-out or unassigned and other SkillMint account workspace data exist in this browser.");
  for (const message of [
    formatOtherWorkspaceSummary(false, false),
    formatOtherWorkspaceSummary(true, false),
    formatOtherWorkspaceSummary(false, true),
    formatOtherWorkspaceSummary(true, true),
  ]) {
    assert.equal(/account-a|account-b|@|\d+/.test(message), false);
  }
  const settingsPage = fs.readFileSync(path.join(srcRoot, "app/settings/data/page.tsx"), "utf8");
  assert.ok(settingsPage.includes("browserSummary.anonymousWorkspaceDataExists"));
  assert.ok(settingsPage.includes("browserSummary.otherWorkspaceDataExists"));
});

run("ATS history restore status distinguishes a retryable latest-write failure", () => {
  assert.equal(getAccountHistoryRestoreMessage(true), "Loaded recent job matches from your account.");
  assert.equal(getAccountHistoryRestoreMessage(false), "Loaded recent history, but the latest match could not be set in this browser.");
  const restoredHistory = [createJobMatch("restored", TIME_A)];
  const failedLatestWrite = false;
  assert.equal(restoredHistory.length, 1);
  assert.equal(getAccountHistoryRestoreMessage(failedLatestWrite).includes("Loaded recent job matches"), false);
});

run("browser workspace write gating blocks unresolved auth and permits only resolved owners", () => {
  assert.deepEqual(resolveBrowserWorkspaceWriteOwner(undefined), { status: "checking", owner: null });
  assert.deepEqual(resolveBrowserWorkspaceWriteOwner(null), { status: "ready", owner: { kind: "anonymous" } });
  assert.deepEqual(resolveBrowserWorkspaceWriteOwner("account-a"), { status: "ready", owner: { kind: "account", userId: "account-a" } });
  const storage = createMemoryStorage();
  const failed = writeOwnedStorageValue(MISSION_STATUS_STORAGE_DESCRIPTOR, { write: "started" }, ACCOUNT_A, { storage });
  assert.equal(failed.ok, true);
  storage.failNextSet = true;
  const writeFailure = writeOwnedStorageValue(MISSION_STATUS_STORAGE_DESCRIPTOR, { write: "blocked" }, ACCOUNT_A, { storage });
  assert.equal(writeFailure.ok, false);
  assert.equal(writeFailure.status, "storage_write_failed");
  window.localStorage = storage;
  storage.failNextSet = true;
  assert.equal(saveJobMatch(createJobMatch("write-failure", TIME_A), ACCOUNT_A), null);
});

run("post-account-deletion cleanup is success-gated and owner-scoped", () => {
  const storage = createMemoryStorage({ [ONBOARDING_DISMISSED_STORAGE_KEY]: "true" });
  assertWrite(storage, ANONYMOUS, { anon: "suggested" }, TIME_0);
  assertWrite(storage, ACCOUNT_A, { a: "started" }, TIME_A);
  assertWrite(storage, ACCOUNT_B, { b: "blocked" }, TIME_B);
  window.localStorage = storage;

  const beforeServerFailure = storage.snapshot();
  if (isConfirmedAccountDeletionResponse(false, { ok: true })) {
    removeSkillMintOwnerData(ACCOUNT_A);
  }
  assert.deepEqual(storage.snapshot(), beforeServerFailure);

  assert.equal(
    isConfirmedAccountDeletionResponse(true, { ok: true, deleted: true }),
    true,
  );
  const cleanup = removeSkillMintOwnerData(ACCOUNT_A);
  assert.equal(cleanup.failedKeys.length, 0);
  assert.equal(readValue(storage, ACCOUNT_A), null);
  assert.deepEqual(readValue(storage, ACCOUNT_B), { b: "blocked" });
  assert.deepEqual(readValue(storage, ANONYMOUS), { anon: "suggested" });
  assert.equal(storage.getItem(ONBOARDING_DISMISSED_STORAGE_KEY), "true");

  const exactBeforeUnknown = storage.snapshot();
  const unknown = removeSkillMintOwnerData({ currentUserId: undefined });
  assert.ok(unknown.failedKeys.length > 0);
  assert.deepEqual(storage.snapshot(), exactBeforeUnknown);

  storage.failNextSet = true;
  const failedCleanup = removeSkillMintOwnerData(ACCOUNT_B);
  assert.ok(failedCleanup.failedKeys.length > 0);
  assert.deepEqual(readValue(storage, ACCOUNT_B), { b: "blocked" });
});

run("browser-wide clear distinguishes present, absent, removed, and failed keys", () => {
  const descriptors = getSkillMintStorageDescriptors().filter((descriptor) => descriptor.clearWithBrowserReset);
  const storage = createMemoryStorage({ unrelated: "keep" });
  storage.setItem(descriptors[0].key, "present");
  storage.setItem(descriptors[1].key, "blocked");
  storage.removeFailures.add(descriptors[1].key);
  window.localStorage = storage;

  const first = clearSkillMintBrowserData();
  assert.equal(first.attempted, descriptors.length);
  assert.equal(first.present, 2);
  assert.equal(first.removed, 1);
  assert.equal(first.absent, descriptors.length - 2);
  assert.deepEqual(first.failedKeys, [descriptors[1].key]);
  assert.equal(storage.getItem("unrelated"), "keep");

  storage.removeFailures.clear();
  const second = clearSkillMintBrowserData();
  assert.equal(second.present, 1);
  assert.equal(second.removed, 1);
  const third = clearSkillMintBrowserData();
  assert.equal(third.present, 0);
  assert.equal(third.removed, 0);
  assert.equal(third.absent, descriptors.length);
});

run("data controls preserve scoring, evidence, mission, and resume freshness truth", () => {
  const profile = createProfile();
  const resumeText = "Projects: Built a React TypeScript dashboard for 50 users. Skills: React TypeScript SQL";
  const jdText = "Frontend Engineer requires React TypeScript testing accessibility and SQL.";
  const before = productTruthSnapshot(profile, resumeText, jdText);
  const storage = createMemoryStorage();
  assertWrite(storage, ANONYMOUS, { mission: "done_by_user" }, TIME_0);
  window.localStorage = storage;
  buildBrowserDataExport(ANONYMOUS, TIME_A);
  clearSkillMintBrowserData();
  const after = productTruthSnapshot(profile, resumeText, jdText);
  assert.deepEqual(after, before);

  const resumeA = createActiveTargetResumeContext({ fileName: "a.pdf", extractedText: "resume A", analyzedAt: TIME_A, scoringVersion: "fixture", userProfile: profile });
  const resumeB = createActiveTargetResumeContext({ fileName: "b.pdf", extractedText: "resume B", analyzedAt: TIME_B, scoringVersion: "fixture", userProfile: profile });
  assert.equal(isJdMatchCurrentForResume({ resumeContext: resumeA }, resumeA), true);
  assert.equal(isJdMatchCurrentForResume({ resumeContext: resumeA }, resumeB), false);
  assert.equal(hasAnonymousBrowserWorkspace(), false);
});

console.log("Offline Slice 1 contract fixture complete. It does not prove deployed RLS, live Supabase isolation/cascades, remote account deletion, rendered accessibility, browser hydration, or provider backup/log deletion.");

function assertWrite(storage, context, value, updatedAt) {
  const result = writeOwnedStorageValue(MISSION_STATUS_STORAGE_DESCRIPTOR, value, context, { storage, updatedAt });
  assert.equal(result.ok, true, `write failed: ${result.status}`);
}

function readValue(storage, context) {
  return readValueForDescriptor(storage, MISSION_STATUS_STORAGE_DESCRIPTOR, context);
}

function readValueForDescriptor(storage, descriptor, context) {
  const result = readVisibleStoredValue(storage.getItem(descriptor.key), descriptor, context);
  return result.status === "visible" ? JSON.parse(result.serializedValue) : null;
}

function currentContainer(storage, descriptor = MISSION_STATUS_STORAGE_DESCRIPTOR) {
  const result = classifyStoredValue(storage.getItem(descriptor.key), descriptor);
  assert.equal(result.status, "current_container");
  return result.container;
}

function seedSavedReportReferences(storage, context, prefix, updatedAt) {
  writeOwnedStorageValue(RESUME_SYNC_STATUS_STORAGE_DESCRIPTOR, { status: "synced", message: "saved", syncedAt: updatedAt, databaseId: `${prefix}-resume` }, context, { storage, updatedAt });
  writeOwnedStorageValue(JD_MATCH_SYNC_STATUS_STORAGE_DESCRIPTOR, { status: "synced", message: "saved", syncedAt: updatedAt, databaseId: `${prefix}-jd` }, context, { storage, updatedAt });
  const match = createJobMatch(prefix, updatedAt);
  writeOwnedStorageValue(JD_MATCH_STORAGE_DESCRIPTOR, match, context, { storage, updatedAt });
  writeOwnedStorageValue(JD_MATCH_HISTORY_STORAGE_DESCRIPTOR, [match], context, { storage, updatedAt });
}

function createJobMatch(prefix, analyzedAt) {
  return {
    id: `${prefix}-match`,
    databaseId: `${prefix}-jd`,
    syncStatus: "synced",
    jobTitle: "Frontend Engineer",
    companyName: "Example",
    jobDescription: "React TypeScript testing",
    result: {
      matchScore: 70,
      verdict: "Developing",
      brutalReality: "More proof needed.",
      matchedSkills: ["React"],
      missingSkills: ["Testing"],
      missingKeywords: ["Accessibility"],
      strengths: ["Applied React"],
      weaknesses: ["Testing proof"],
      recommendations: ["Build tested work"],
    },
    improvementPlan: null,
    rewritePlan: null,
    analyzedAt,
  };
}

function createActiveResume(analyzedAt) {
  return {
    fileName: "resume.pdf",
    fileType: "application/pdf",
    fileSize: 128,
    extractedText: "Built a React TypeScript dashboard for 50 users.",
    parsedProfile: {
      skills: ["React", "TypeScript"],
      projects: ["Dashboard"],
      education: ["B.Tech"],
      experience: ["Frontend intern"],
      certifications: [],
      links: {},
      rawSections: {},
    },
    userProfile: createProfile(),
    analyzedAt,
    status: "completed",
  };
}

function snapshotOwnerPartitions(storage) {
  const snapshot = {};
  for (const [label, owner] of [["anonymous", { kind: "anonymous" }], ["a", { kind: "account", userId: "account-a" }], ["b", { kind: "account", userId: "account-b" }]]) {
    snapshot[label] = {};
    for (const descriptor of [RESUME_SYNC_STATUS_STORAGE_DESCRIPTOR, JD_MATCH_SYNC_STATUS_STORAGE_DESCRIPTOR, JD_MATCH_STORAGE_DESCRIPTOR, JD_MATCH_HISTORY_STORAGE_DESCRIPTOR]) {
      const classification = classifyStoredValue(storage.getItem(descriptor.key), descriptor);
      snapshot[label][descriptor.key] = classification.status === "current_container"
        ? getOwnerPartitionFromContainer(classification.container, owner)
        : null;
    }
  }
  return snapshot;
}

function productTruthSnapshot(profile, resumeText, jdText) {
  return {
    careerIQ: calculateCareerIQ(profile, { targetRole: "Frontend Engineer" }),
    ats: calculateATS(profile),
    roles: calculateRoleMatches(profile),
    proof: generateProofScore({ profile, resumeText }),
    jd: analyzeJobDescriptionMatch(profile, jdText),
  };
}

function createProfile() {
  return {
    resumeScore: 20, skillsScore: 14, projectsScore: 15, experienceScore: 5,
    educationScore: 8, githubScore: 4, linkedinScore: 3, atsScore: 5,
    recruiterScore: 5, activityScore: 4, skills: ["React", "TypeScript", "SQL"],
    projects: ["Built a React TypeScript dashboard with tests for 50 users."],
    experience: ["Frontend intern improved accessibility by 20%."],
    education: "B.Tech Computer Science", certifications: [], codingProfiles: [],
    analysisFlags: { hasMeasurableImpact: true, hasSectionClarity: true, hasProofLink: false, hasGenericProjects: false, isPlaceholderText: false },
  };
}

function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    removeFailures: new Set(),
    failSetCalls: new Set(),
    failNextSet: false,
    setCount: 0,
    getCountByKey: new Map(),
    failGetAtByKey: new Map(),
    afterGet: null,
    afterSet: null,
    getItem(key) {
      const count = (this.getCountByKey.get(key) ?? 0) + 1;
      this.getCountByKey.set(key, count);
      if (
        this.getFailures.has(key) ||
        this.failGetAtByKey.get(key)?.has(count)
      ) {
        throw new Error("read failure");
      }
      const value = values.has(key) ? values.get(key) : null;
      this.afterGet?.(key, value, this);
      return value;
    },
    setItem(key, value) {
      this.setCount += 1;
      if (this.failNextSet || this.failSetCalls.has(this.setCount)) {
        this.failNextSet = false;
        throw new Error("quota-like write failure");
      }
      const serializedValue = String(value);
      values.set(key, serializedValue);
      this.afterSet?.(key, serializedValue, this);
    },
    removeItem(key) {
      if (this.removeFailures.has(key)) throw new Error("remove failure");
      values.delete(key);
    },
    getFailures: new Set(),
    externalSet(key, value) { values.set(key, String(value)); },
    resetSetCount() { this.setCount = 0; this.getCountByKey.clear(); },
    snapshot() { return Object.fromEntries([...values.entries()].sort(([a], [b]) => a.localeCompare(b))); },
  };
}

function listSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(entryPath);
    return /\.(ts|tsx)$/.test(entry.name) ? [entryPath] : [];
  });
}
