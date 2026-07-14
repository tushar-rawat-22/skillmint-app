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
Module._resolveFilename = function resolveAlias(request, parent, isMain, options) {
  return request.startsWith("@/")
    ? originalResolveFilename.call(this, path.join(srcRoot, request.slice(2)), parent, isMain, options)
    : originalResolveFilename.call(this, request, parent, isMain, options);
};
require.extensions[".ts"] = function compileTypeScript(module, filename) {
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const reliabilityPath = path.join(srcRoot, "modules/feedback/feedbackReliability.ts");
const repositoryPath = path.join(srcRoot, "modules/feedback/services/feedbackRepository.ts");
const localPath = path.join(srcRoot, "modules/feedback/services/feedbackLocalStorage.ts");
const widgetPath = path.join(srcRoot, "modules/feedback/components/FeedbackWidget.tsx");
const exportPath = path.join(srcRoot, "modules/data-controls/browserDataExportContract.ts");
const typesPath = path.join(srcRoot, "modules/feedback/types.ts");
const reliabilitySource = fs.readFileSync(reliabilityPath, "utf8");
const repositorySource = fs.readFileSync(repositoryPath, "utf8");
const localSource = fs.readFileSync(localPath, "utf8");
const widgetSource = fs.readFileSync(widgetPath, "utf8");
const exportSource = fs.readFileSync(exportPath, "utf8");
const typesSource = fs.readFileSync(typesPath, "utf8");
const reliability = require(reliabilityPath);
const { submitBetaFeedbackWithAdapter } = require(repositoryPath);
const {
  BETA_FEEDBACK_STORAGE_DESCRIPTOR,
  BETA_FEEDBACK_STORAGE_KEY,
  getLocalFeedbackItemsWithEnvironment,
  saveFeedbackLocallyWithEnvironment,
} = require(localPath);

const tests = [];
function test(name, callback) { tests.push({ name, callback }); }
const timestamp = "2026-07-13T10:20:30.000Z";
const validInput = {
  feedbackType: "bug",
  sentiment: "neutral",
  message: "A useful feedback message",
  pagePath: "/dashboard",
};
function row(overrides = {}) {
  return {
    id: "server-feedback-1",
    user_id: "account-a",
    feedback_type: validInput.feedbackType,
    sentiment: validInput.sentiment,
    message: validInput.message,
    page_path: validInput.pagePath,
    status: "new",
    created_at: timestamp,
    ...overrides,
  };
}
function adapter(options = {}) {
  const calls = { auth: 0, insert: 0, inserted: null };
  return {
    calls,
    value: {
      async getCurrentUser() {
        calls.auth += 1;
        if (options.authThrow) throw options.authThrow;
        return options.authResult ?? { userId: "account-a" };
      },
      async insertFeedback(input) {
        calls.insert += 1;
        calls.inserted = input;
        if (options.insertThrow) throw options.insertThrow;
        return options.insertResult ?? { data: row() };
      },
    },
  };
}
function localItem(overrides = {}) {
  return {
    id: "local-1",
    feedbackType: "idea",
    sentiment: "positive",
    message: "Preserve this authored message",
    pagePath: "/roadmap",
    createdAt: timestamp,
    syncStatus: "local-only",
    ...overrides,
  };
}
function ownerContainer({ anonymous, accounts = {} } = {}) {
  return JSON.stringify({
    format: "skillmint-owner-partitions",
    version: 2,
    descriptorVersion: 1,
    partitions: {
      ...(anonymous === undefined ? {} : { anonymous: { value: anonymous, updatedAt: timestamp } }),
      accounts: Object.fromEntries(Object.entries(accounts).map(([key, value]) => [
        key, { value, updatedAt: timestamp },
      ])),
    },
  });
}
function fakeStorage(initial = null, options = {}) {
  let raw = initial;
  const calls = { reads: 0, writes: 0 };
  return {
    calls,
    get raw() { return raw; },
    getItem(key) {
      assert.equal(key, BETA_FEEDBACK_STORAGE_KEY);
      calls.reads += 1;
      if (options.readThrow) throw new Error("SECRET read");
      return raw;
    },
    setItem(key, value) {
      assert.equal(key, BETA_FEEDBACK_STORAGE_KEY);
      calls.writes += 1;
      if (options.writeThrow) throw new Error("SECRET write");
      raw = value;
    },
  };
}
function localEnvironment(storage, options = {}) {
  const state = { notifications: 0, ids: [...(options.ids ?? ["feedback-generated-1"])] };
  return {
    state,
    value: {
      getStorage() {
        if (options.storageThrow) throw new Error("SECRET storage");
        return options.unavailable ? null : storage;
      },
      now: () => options.now ?? timestamp,
      createId: () => state.ids.shift() ?? "feedback-generated-fallback",
      notifyWorkspaceUpdated() {
        state.notifications += 1;
        if (options.notifyThrow) throw new Error("notify");
      },
    },
  };
}
function assertFailure(result, code, retryable) {
  assert.equal(result.ok, false);
  assert.equal(result.error.code, code);
  if (retryable !== undefined) assert.equal(result.error.retryable, retryable);
  const serialized = JSON.stringify(result);
  for (const secret of ["SECRET", "account-a", "beta_feedback", "permission policy"]) {
    assert.equal(serialized.includes(secret), false, secret);
  }
}

test("1 input normalization is exact, bounded, fresh, and side-effect free", async () => {
  for (const feedbackType of ["bug", "confusion", "ui", "idea", "other"]) {
    for (const sentiment of ["negative", "neutral", "positive"]) {
      const result = reliability.normalizeFeedbackInput({ ...validInput, feedbackType, sentiment });
      assert.equal(result.ok, true);
      assert.notEqual(result.data, validInput);
    }
  }
  for (const value of ["BUG", "feature", "", null]) {
    assertFailure(reliability.normalizeFeedbackInput({ ...validInput, feedbackType: value }), "invalid_input", false);
  }
  for (const value of ["mixed", "happy", "", 2]) {
    assertFailure(reliability.normalizeFeedbackInput({ ...validInput, sentiment: value }), "invalid_input", false);
  }
  assertFailure(reliability.normalizeFeedbackInput({ ...validInput, message: 42 }), "invalid_input", false);
  const hostileInput = new Proxy({}, { get() { throw new Error("SECRET hostile input getter"); } });
  assertFailure(reliability.normalizeFeedbackInput(hostileInput), "invalid_input", false);
  const revokedInput = Proxy.revocable({}, {});
  revokedInput.revoke();
  assertFailure(reliability.normalizeFeedbackInput(revokedInput.proxy), "invalid_input", false);
  for (const [length, ok] of [[9, false], [10, true], [1000, true], [1001, false]]) {
    assert.equal(reliability.normalizeFeedbackInput({ ...validInput, message: "x".repeat(length) }).ok, ok);
  }
  const preserved = reliability.normalizeFeedbackInput({ ...validInput, message: "  ten  internal\n spaces  ", pagePath: null });
  assert.equal(preserved.ok, true);
  assert.equal(preserved.data.message, "ten  internal\n spaces");
  assert.equal(preserved.data.pagePath, null);
  for (const pagePath of ["settings", "//evil.test", "https://evil.test", "/https://evil.test", "/path?q=1", "/path#x", "/bad\u0000path", " /path", "/path "]) {
    assertFailure(reliability.normalizeFeedbackInput({ ...validInput, pagePath }), "invalid_input", false);
  }
  const repo = adapter();
  await submitBetaFeedbackWithAdapter({ ...validInput, message: "short" }, "account-a", repo.value);
  assert.deepEqual(repo.calls, { auth: 0, insert: 0, inserted: null });
  let storageCalls = 0;
  const invalidLocal = saveFeedbackLocallyWithEnvironment(
    { ...validInput, message: "short" },
    { currentUserId: null },
    undefined,
    { ...localEnvironment(fakeStorage()).value, getStorage() { storageCalls += 1; return null; } },
  );
  assertFailure(invalidLocal, "invalid_input", false);
  assert.equal(storageCalls, 0);
});

test("2 owner keys and request identity reject stale and A-B-A contexts", () => {
  assert.equal(reliability.getFeedbackOwnerKey(undefined), null);
  assert.equal(reliability.getFeedbackOwnerKey(""), null);
  assert.equal(reliability.getFeedbackOwnerKey(null), "anonymous");
  assert.equal(reliability.getFeedbackOwnerKey(null), reliability.getFeedbackOwnerKey(null));
  const ownerA = reliability.getFeedbackOwnerKey("account-a");
  const ownerB = reliability.getFeedbackOwnerKey("account-b");
  assert.notEqual(ownerA, ownerB);
  assert.deepEqual(reliability.getFeedbackOwnerContext(null), {
    ownerKey: "anonymous",
    accountUserId: null,
  });
  assert.deepEqual(reliability.getFeedbackOwnerContext("account-a"), {
    ownerKey: ownerA,
    accountUserId: "account-a",
  });
  const request = { ownerKey: ownerA, contextEpoch: 1, requestToken: 2 };
  const live = { isMounted: true, ownerKey: ownerA, contextEpoch: 1 };
  assert.equal(reliability.isCurrentFeedbackRequest(request, live, request), true);
  assert.equal(reliability.isCurrentFeedbackRequest(request, { ...live, ownerKey: ownerB }, request), false);
  assert.equal(reliability.isCurrentFeedbackRequest(request, { ...live, contextEpoch: 2 }, request), false);
  assert.equal(reliability.isCurrentFeedbackRequest(request, live, { ...request, requestToken: 3 }), false);
  assert.equal(reliability.isCurrentFeedbackRequest(request, live, null), false);
  assert.equal(reliability.isCurrentFeedbackRequest(request, { ...live, isMounted: false }, request), false);
  assert.equal(reliability.isCurrentFeedbackRequest(request, { ...live, contextEpoch: 3 }, request), false);
});

test("3 signed-out widget contract is direct anonymous local persistence", () => {
  assert.match(widgetSource, /if \(startingUserId === null\)[\s\S]*?saveFeedbackLocally\([\s\S]*?currentUserId: null/);
  const signedOutBranch = widgetSource.match(/if \(startingUserId === null\)([\s\S]*?)let accountResult/)?.[1] ?? "";
  assert.doesNotMatch(signedOutBranch, /submitBetaFeedback/);
  assert.doesNotMatch(signedOutBranch, /syncError|persistedCode/);
  assert.equal(reliability.FEEDBACK_SIGNED_OUT_SUCCESS_COPY, "Feedback was saved in this browser. Sign in to save future feedback to your account.");
});

test("4 repository authenticates the exact expected owner before insert", async () => {
  const matching = adapter();
  const success = await submitBetaFeedbackWithAdapter(validInput, "account-a", matching.value);
  assert.equal(success.ok, true);
  assert.equal(matching.calls.insert, 1);
  assert.equal(matching.calls.inserted.userId, "account-a");
  const absent = adapter({ authResult: { userId: null } });
  assertFailure(await submitBetaFeedbackWithAdapter(validInput, "account-a", absent.value), "not_authenticated", true);
  assert.equal(absent.calls.insert, 0);
  const mismatch = adapter({ authResult: { userId: "account-b" } });
  assertFailure(await submitBetaFeedbackWithAdapter(validInput, "account-a", mismatch.value), "account_changed", true);
  assert.equal(mismatch.calls.insert, 0);
  assertFailure(await submitBetaFeedbackWithAdapter(validInput, "account-a", null), "not_configured", false);
  assertFailure(await submitBetaFeedbackWithAdapter(validInput, undefined, matching.value), "not_authenticated", true);
  assertFailure(await submitBetaFeedbackWithAdapter(validInput, "account-a", adapter({ authThrow: new Error("SECRET fetch failed") }).value), "network_failure", true);
});

test("5 provider failures map to fixed structured output without raw text", async () => {
  const cases = [
    [{ message: "SECRET fetch timeout", status: 503 }, "network_failure", true],
    [{ message: "SECRET row-level security permission policy", code: "42501" }, "permission_denied", false],
    [{ message: "SECRET relation beta_feedback does not exist", code: "42P01" }, "schema_unavailable", false],
    [{ message: "SECRET strange provider failure", code: "X-PRIVATE" }, "unknown", true],
  ];
  for (const [error, code, retryable] of cases) {
    const result = await submitBetaFeedbackWithAdapter(validInput, "account-a", adapter({ insertResult: { data: null, error } }).value);
    assertFailure(result, code, retryable);
  }
  assertFailure(await submitBetaFeedbackWithAdapter(validInput, "account-a", adapter({ insertThrow: new Error("SECRET connection") }).value), "network_failure", true);
  const hostileProviderError = new Proxy({}, { get() { throw new Error("SECRET hostile provider getter"); } });
  assertFailure(await submitBetaFeedbackWithAdapter(validInput, "account-a", adapter({ insertThrow: hostileProviderError }).value), "unknown", true);
  const revokedProviderError = Proxy.revocable({}, {});
  revokedProviderError.revoke();
  assertFailure(await submitBetaFeedbackWithAdapter(validInput, "account-a", adapter({ insertThrow: revokedProviderError.proxy }).value), "unknown", true);
  const hostileSuccessfulRow = new Proxy({}, { get() { throw new Error("SECRET hostile response getter"); } });
  assertFailure(await submitBetaFeedbackWithAdapter(validInput, "account-a", adapter({ insertResult: { data: hostileSuccessfulRow } }).value), "invalid_response", false);
  const revokedSuccessfulRow = Proxy.revocable({}, {});
  revokedSuccessfulRow.revoke();
  assertFailure(await submitBetaFeedbackWithAdapter(validInput, "account-a", adapter({ insertResult: { data: revokedSuccessfulRow.proxy } }).value), "invalid_response", false);
  assert.doesNotMatch(repositorySource, /console\.|return message|getDatabaseErrorMessage/);
});

test("6 successful rows are strictly reconstructed without mutation or spread", async () => {
  const validRow = row();
  const frozen = Object.freeze({ ...validRow });
  const success = await submitBetaFeedbackWithAdapter(validInput, "account-a", adapter({ insertResult: { data: frozen } }).value);
  assert.equal(success.ok, true);
  assert.notEqual(success.data, frozen);
  assert.deepEqual(frozen, validRow);
  for (const data of [
    null, [], "row", { ...validRow, id: "" }, { ...validRow, user_id: "account-b" },
    { ...validRow, feedback_type: "other" }, { ...validRow, sentiment: "positive" },
    { ...validRow, message: "different" }, { ...validRow, page_path: "/other" },
    { ...validRow, status: " " }, { ...validRow, created_at: "2025-02-29T00:00:00.000Z" },
    { ...validRow, created_at: "not-a-date" },
  ]) {
    assertFailure(await submitBetaFeedbackWithAdapter(validInput, "account-a", adapter({ insertResult: { data } }).value), "invalid_response", false);
  }
  assert.doesNotMatch(repositorySource, /\.\.\.value|\.\.\.row/);
});

test("7 local reads distinguish missing, hidden, visible, corrupt, and unavailable", () => {
  const missing = fakeStorage();
  assert.deepEqual(getLocalFeedbackItemsWithEnvironment({ currentUserId: null }, localEnvironment(missing).value), { ok: true, data: [] });
  const hidden = fakeStorage(ownerContainer({ accounts: { "account-b": [localItem()] } }));
  assert.deepEqual(getLocalFeedbackItemsWithEnvironment({ currentUserId: "account-a" }, localEnvironment(hidden).value), { ok: true, data: [] });
  const visible = fakeStorage(ownerContainer({ accounts: { "account-a": [localItem()] } }));
  const visibleResult = getLocalFeedbackItemsWithEnvironment({ currentUserId: "account-a" }, localEnvironment(visible).value);
  assert.equal(visibleResult.ok, true);
  assert.equal(visibleResult.data.length, 1);
  const corruptValues = [
    "{bad",
    JSON.stringify({ future: true }),
    ownerContainer({ accounts: { "account-a": [{ ...localItem(), message: 42 }] } }),
    ownerContainer({ accounts: { "account-a": [localItem({ id: "duplicate" }), localItem({ id: "duplicate" })] } }),
    ownerContainer({ accounts: { "account-a": [localItem({ createdAt: "2025-02-29T00:00:00.000Z" })] } }),
  ];
  for (const raw of corruptValues) {
    const storage = fakeStorage(raw);
    assertFailure(getLocalFeedbackItemsWithEnvironment({ currentUserId: "account-a" }, localEnvironment(storage).value), "storage_corrupted", false);
    assert.equal(storage.raw, raw);
    assert.equal(storage.calls.writes, 0);
  }
  assertFailure(getLocalFeedbackItemsWithEnvironment({ currentUserId: undefined }, localEnvironment(fakeStorage(), { unavailable: true }).value), "owner_unresolved", true);
  assertFailure(getLocalFeedbackItemsWithEnvironment({ currentUserId: null }, localEnvironment(fakeStorage(), { unavailable: true }).value), "storage_unavailable", true);
  assertFailure(getLocalFeedbackItemsWithEnvironment({ currentUserId: null }, localEnvironment(fakeStorage(null, { readThrow: true })).value), "storage_read_failed", true);
  const hostileContext = new Proxy({}, { get() { throw new Error("SECRET hostile context getter"); } });
  assertFailure(getLocalFeedbackItemsWithEnvironment(hostileContext, localEnvironment(fakeStorage()).value), "unknown", true);
});

test("8 unsafe legacy sync metadata is omitted on read without a write", () => {
  const items = [
    localItem({ id: "none" }),
    localItem({ id: "safe", syncError: "network_failure" }),
    localItem({ id: "unsafe", syncError: "SECRET raw provider detail" }),
  ];
  const storage = fakeStorage(ownerContainer({ accounts: { "account-a": items } }));
  const result = getLocalFeedbackItemsWithEnvironment({ currentUserId: "account-a" }, localEnvironment(storage).value);
  assert.equal(result.ok, true);
  assert.equal(result.data[0].syncError, undefined);
  assert.equal(result.data[1].syncError, "network_failure");
  assert.equal(result.data[2].syncError, undefined);
  assert.equal(result.data[2].message, items[2].message);
  assert.equal(storage.calls.writes, 0);
});

test("9 local saves isolate owners, sanitize lazily, cap, collide safely, and notify once", () => {
  const bItems = [localItem({ id: "b-1", message: "Account B private authored message" })];
  const anonymousItems = [localItem({ id: "anon-1", message: "Anonymous authored message" })];
  const aItems = [localItem({ id: "a-old", syncError: "SECRET legacy provider detail" })];
  const storage = fakeStorage(ownerContainer({ anonymous: anonymousItems, accounts: { "account-a": aItems, "account-b": bItems } }));
  const before = JSON.parse(storage.raw);
  const env = localEnvironment(storage, { ids: ["feedback-a-new"] });
  const result = saveFeedbackLocallyWithEnvironment(validInput, { currentUserId: "account-a" }, "network_failure", env.value);
  assert.equal(result.ok, true);
  assert.equal(result.data.syncError, "network_failure");
  assert.equal(env.state.notifications, 1);
  const after = JSON.parse(storage.raw);
  assert.deepEqual(after.partitions.accounts["account-b"], before.partitions.accounts["account-b"]);
  assert.deepEqual(after.partitions.anonymous, before.partitions.anonymous);
  assert.equal(after.partitions.accounts["account-a"].value[1].syncError, undefined);

  const anonymousStorage = fakeStorage();
  const anonymousEnv = localEnvironment(anonymousStorage);
  const anonymous = saveFeedbackLocallyWithEnvironment(validInput, { currentUserId: null }, "network_failure", anonymousEnv.value);
  assert.equal(anonymous.ok, true);
  assert.equal(anonymous.data.syncError, undefined);

  const many = Array.from({ length: 20 }, (_, index) => localItem({ id: `existing-${index}` }));
  const cappedStorage = fakeStorage(ownerContainer({ accounts: { "account-a": many } }));
  const cappedEnv = localEnvironment(cappedStorage, { ids: ["existing-0", "feedback-unique"] });
  const capped = saveFeedbackLocallyWithEnvironment(validInput, { currentUserId: "account-a" }, "unknown", cappedEnv.value);
  assert.equal(capped.ok, true);
  assert.equal(JSON.parse(cappedStorage.raw).partitions.accounts["account-a"].value.length, 20);
  assert.equal(capped.data.id, "feedback-unique");

  const collisions = fakeStorage(ownerContainer({ accounts: { "account-a": [localItem({ id: "same" })] } }));
  assertFailure(saveFeedbackLocallyWithEnvironment(validInput, { currentUserId: "account-a" }, undefined, localEnvironment(collisions, { ids: Array(8).fill("same") }).value), "id_generation_failed", true);
  const badTimestamp = saveFeedbackLocallyWithEnvironment(validInput, { currentUserId: null }, undefined, localEnvironment(fakeStorage(), { now: "2025-02-29T00:00:00.000Z" }).value);
  assertFailure(badTimestamp, "unknown", true);
  const writeStorage = fakeStorage(null, { writeThrow: true });
  assertFailure(saveFeedbackLocallyWithEnvironment(validInput, { currentUserId: null }, undefined, localEnvironment(writeStorage).value), "storage_write_failed", true);
  assertFailure(saveFeedbackLocallyWithEnvironment(validInput, { currentUserId: "account-a" }, "raw_provider_text", localEnvironment(fakeStorage()).value), "invalid_input", false);
  const corrupt = fakeStorage("{bad");
  const corruptRaw = corrupt.raw;
  assertFailure(saveFeedbackLocallyWithEnvironment(validInput, { currentUserId: "account-a" }, undefined, localEnvironment(corrupt).value), "storage_corrupted", false);
  assert.equal(corrupt.raw, corruptRaw);
  assert.equal(corrupt.calls.writes, 0);
});

test("10 user copy is exact, truthful, and makes no sync promise", () => {
  assert.equal(reliability.FEEDBACK_ACCOUNT_SUCCESS_COPY, "Feedback was saved to your account. Thank you.");
  assert.equal(reliability.FEEDBACK_SIGNED_OUT_SUCCESS_COPY, "Feedback was saved in this browser. Sign in to save future feedback to your account.");
  assert.equal(reliability.FEEDBACK_ACCOUNT_FALLBACK_COPY, "Feedback was saved in this browser. Saving it to your account did not finish.");
  assert.equal(reliability.FEEDBACK_DUAL_FAILURE_COPY, "Feedback could not be saved to your account or this browser. Your message is still here so you can copy it and try again.");
  assert.equal(reliability.FEEDBACK_AUTH_UNRESOLVED_COPY, "Wait while SkillMint checks your account.");
  const copy = [reliabilitySource, widgetSource].join("\n");
  assert.doesNotMatch(copy, /added later|sync later|will sync|queued|Feedback sent|Saved locally/i);
  assert.doesNotMatch(copy, /account-a|account-b/);
});

test("11 widget source binds async publication to owner epoch, token, and mount", () => {
  assert.match(widgetSource, /try \{[\s\S]*?catch[\s\S]*?finally/);
  assert.match(widgetSource, /liveContextRef|isMounted|contextEpoch|requestTokenRef|activeRequestRef/);
  assert.match(widgetSource, /getFeedbackOwnerContext/);
  assert.match(widgetSource, /committedContextRef/);
  assert.match(widgetSource, /useLayoutEffect/);
  assert.match(widgetSource, /accountUserId/);
  assert.doesNotMatch(widgetSource, /liveContextRef\.current\s*=\s*\{[\s\S]*?const requestTokenRef/);
  assert.doesNotMatch(widgetSource, /startingUserId\s*=\s*request\.ownerKey[\s\S]*?user\?\.id/);
  assert.match(widgetSource, /active &&[\s\S]*?active\.ownerKey === live\.ownerKey/);
  assert.match(widgetSource, /isCurrentFeedbackRequest\(/);
  assert.match(widgetSource, /currentUserId: startingUserId/);
  assert.match(widgetSource, /accountResult\.error\.code/);
  assert.match(widgetSource, /if \(accountResult\.ok\)[\s\S]*?return;/);
  assert.match(widgetSource, /setMessage\(""\)[\s\S]*?setStatus\(IDLE_STATUS\)/);
  assert.match(widgetSource, /disabled=\{isSubmitting \|\| ownerKey === null\}/);
  assert.match(widgetSource, /aria-expanded=\{visibleIsOpen\}/);
  assert.match(widgetSource, /role=\{visibleStatus\.tone === "error" \? "alert" : "status"\}/);
  assert.match(widgetSource, /aria-live=\{visibleStatus\.tone === "error" \? "assertive" : "polite"\}/);
  assert.doesNotMatch(widgetSource, /setTimeout|setInterval|retry|queue|console\./i);
});

test("12 descriptor and frozen export compatibility remain unchanged", () => {
  assert.equal(BETA_FEEDBACK_STORAGE_DESCRIPTOR.key, "skillmint:beta-feedback");
  assert.equal(BETA_FEEDBACK_STORAGE_DESCRIPTOR.version, 1);
  assert.equal(BETA_FEEDBACK_STORAGE_DESCRIPTOR.ownerScope, "anonymous_or_account");
  assert.equal(BETA_FEEDBACK_STORAGE_DESCRIPTOR.validateValue([localItem({ syncError: "arbitrary legacy text" })]), true);
  assert.match(typesSource, /syncError\?: PersistedAccountFailureCode/);
  assert.match(localSource, /isSafePersistedAccountFailureCode\(syncError\)/);
  assert.match(exportSource, /Omit<LocalBetaFeedback, "syncError">/);
  assert.match(exportSource, /feedback_sync_error_excluded/);
});

test("13 boundaries remain pure, offline, silent, and foreground-only", () => {
  assert.doesNotMatch(reliabilitySource, /from ["']react|window\.|document\.|localStorage\.|supabase|Date\.now|new Date\(\)|Math\.random|crypto|fetch\(|console\./i);
  assert.doesNotMatch(repositorySource + localSource + widgetSource, /console\./);
  assert.doesNotMatch(widgetSource, /setTimeout|setInterval|Worker|navigator\.sendBeacon|retry|queue/i);
  assert.doesNotMatch(localSource, /useEffect|mount/i);
  assert.equal(fs.readFileSync(path.join(repoRoot, "supabase/schema_v2_feedback.sql"), "utf8").includes("create table"), true);
});

for (const { name, callback } of tests) {
  try {
    await callback();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

console.log(`PASS ${tests.length} feedback reliability fixture groups`);
console.log("LIMITATIONS live Supabase/RLS, rendered account switching, quota behavior, screen-reader behavior, legal compliance, and production readiness remain unproved.");
console.log("LIMITATIONS same-owner cross-tab writes remain non-transactional; no automatic retry or sync was added; moderation is unchanged.");
