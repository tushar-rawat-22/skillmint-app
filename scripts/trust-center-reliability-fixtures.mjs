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

const trustStatePath = path.join(srcRoot, "modules/data-controls/trustCenterState.ts");
const downloadPath = path.join(srcRoot, "modules/data-controls/jsonDownload.ts");
const pagePath = path.join(srcRoot, "app/settings/data/page.tsx");
const trustStateSource = fs.readFileSync(trustStatePath, "utf8");
const downloadSource = fs.readFileSync(downloadPath, "utf8");
const pageSource = fs.readFileSync(pagePath, "utf8");
const {
  getAccountCountsPresentation,
  getBrowserSummaryOwnerKey,
  getVisibleBrowserSummaryState,
  isCurrentOwnedRequest,
} = require(trustStatePath);
const {
  JSON_DOWNLOAD_REVOKE_DELAY_MS,
  requestJsonDownload,
  requestJsonDownloadWithEnvironment,
} = require(downloadPath);
const { getBrowserDataOwner } = require(path.join(srcRoot, "lib/storage/skillMintStorageTypes.ts"));

const tests = [];
function test(name, callback) { tests.push({ name, callback }); }
function idleBrowser(ownerKey = null) {
  return { ownerKey, contextEpoch: 4, status: "idle", data: null, error: null };
}
function summary(overrides = {}) {
  return {
    ownerScope: "anonymous",
    items: [],
    visibleCount: 0,
    anonymousWorkspaceDataExists: false,
    otherWorkspaceDataExists: false,
    corruptedCount: 0,
    clearableCount: 12,
    ...overrides,
  };
}
function countState(ownerKey, overrides = {}) {
  return {
    ownerKey,
    request: { ownerKey, contextEpoch: 4, requestToken: 1 },
    status: "ready",
    data: { profile: 0, resumeAnalyses: 0, jobMatches: 0, careerSnapshots: 0, betaFeedback: 0 },
    error: null,
    ...overrides,
  };
}
function accountPresentation(input = {}) {
  const currentUserId = input.currentUserId === undefined ? "account-a" : input.currentUserId;
  const ownerKey = input.currentOwnerKey === undefined
    ? getBrowserSummaryOwnerKey(currentUserId)
    : input.currentOwnerKey;
  return getAccountCountsPresentation({
    isAuthLoading: input.isAuthLoading ?? false,
    isConfigured: input.isConfigured ?? true,
    currentUserId,
    currentOwnerKey: ownerKey,
    currentContextEpoch: input.currentContextEpoch ?? 4,
    state: input.state ?? countState(ownerKey),
  });
}
function assertNoOwnerCopy(value, ownerKey) {
  assert.equal(JSON.stringify(value).includes(ownerKey), false);
}

test("1 owner keys reuse frozen normalization and never enter presentation copy", () => {
  for (const value of [undefined, "", "   ", "undefined", "null", "__proto__", "prototype", "constructor"]) {
    assert.equal(getBrowserSummaryOwnerKey(value), null);
  }
  const anonymousA = getBrowserSummaryOwnerKey(null);
  const anonymousB = getBrowserSummaryOwnerKey(null);
  const accountA = getBrowserSummaryOwnerKey(" account-a ");
  const accountANormalized = getBrowserSummaryOwnerKey("account-a");
  const accountB = getBrowserSummaryOwnerKey("account-b");
  assert.equal(anonymousA, anonymousB);
  assert.equal(accountA, accountANormalized);
  assert.notEqual(accountA, accountB);
  assert.equal(getBrowserDataOwner(" account-a ").userId, "account-a");
  assertNoOwnerCopy(getVisibleBrowserSummaryState(accountA, 4, idleBrowser(accountA)), accountA);
  assertNoOwnerCopy(accountPresentation({ currentOwnerKey: accountA }), accountA);
});

test("2 request identity rejects every owner, epoch, token, and active-request race", () => {
  const ownerA = getBrowserSummaryOwnerKey("account-a");
  const ownerB = getBrowserSummaryOwnerKey("account-b");
  const request = { ownerKey: ownerA, contextEpoch: 4, requestToken: 7 };
  assert.equal(isCurrentOwnedRequest(request, { ownerKey: ownerA, contextEpoch: 4 }, request), true);
  assert.equal(isCurrentOwnedRequest(request, { ownerKey: ownerB, contextEpoch: 4 }, request), false);
  assert.equal(isCurrentOwnedRequest(request, { ownerKey: ownerA, contextEpoch: 5 }, request), false);
  assert.equal(isCurrentOwnedRequest(request, { ownerKey: ownerA, contextEpoch: 4 }, { ...request, requestToken: 8 }), false);
  assert.equal(isCurrentOwnedRequest(request, { ownerKey: ownerA, contextEpoch: 4 }, null), false);
  const newer = { ownerKey: ownerA, contextEpoch: 4, requestToken: 8 };
  assert.equal(isCurrentOwnedRequest(request, { ownerKey: ownerA, contextEpoch: 4 }, newer), false);
  assert.equal(isCurrentOwnedRequest(request, { ownerKey: ownerB, contextEpoch: 5 }, request), false);
  assert.equal(isCurrentOwnedRequest(request, { ownerKey: ownerA, contextEpoch: 6 }, request), false);
  assert.equal(isCurrentOwnedRequest(request, { ownerKey: ownerA, contextEpoch: 5 }, request), false);
});

test("3 browser summary presentation masks stale data and distinguishes unavailable storage", () => {
  const ownerA = getBrowserSummaryOwnerKey("account-a");
  const ownerB = getBrowserSummaryOwnerKey("account-b");
  assert.equal(getVisibleBrowserSummaryState(null, 4, idleBrowser()).status, "checking");
  const stale = { ownerKey: ownerA, contextEpoch: 4, status: "ready", data: summary({ visibleCount: 9 }), error: null };
  const stalePresentation = getVisibleBrowserSummaryState(ownerB, 5, stale);
  assert.equal(stalePresentation.status, "checking");
  assert.equal(stalePresentation.summary, null);
  const returnedToA = getVisibleBrowserSummaryState(ownerA, 6, stale);
  assert.equal(returnedToA.status, "checking");
  assert.equal(returnedToA.summary, null);
  for (const status of ["idle", "loading"]) {
    assert.equal(getVisibleBrowserSummaryState(ownerA, 4, { ...idleBrowser(ownerA), status }).status, "checking");
  }
  const readyZero = getVisibleBrowserSummaryState(ownerA, 4, { ownerKey: ownerA, contextEpoch: 4, status: "ready", data: summary(), error: null });
  assert.equal(readyZero.status, "ready");
  assert.equal(readyZero.overviewValue, "0 visible items");
  assert.equal(readyZero.canExport, true);
  assert.equal(getVisibleBrowserSummaryState(ownerA, 4, { ownerKey: ownerA, contextEpoch: 4, status: "error", data: null, error: "safe" }).status, "unavailable");
  assert.equal(getVisibleBrowserSummaryState(ownerA, 4, { ownerKey: ownerA, contextEpoch: 4, status: "ready", data: null, error: null }).status, "unavailable");
  const unavailableItem = { descriptor: { key: "fixture" }, status: "corrupted", legacy: false, bytes: 0, issue: "storage_unavailable" };
  const unavailable = getVisibleBrowserSummaryState(ownerA, 4, { ownerKey: ownerA, contextEpoch: 4, status: "ready", data: summary({ items: [unavailableItem] }), error: null });
  assert.equal(unavailable.status, "unavailable");
  assert.equal(unavailable.summary, null);
  const unreadableItem = { ...unavailableItem, issue: "storage_read_failed" };
  const unreadable = getVisibleBrowserSummaryState(ownerA, 4, { ownerKey: ownerA, contextEpoch: 4, status: "ready", data: summary({ items: [unreadableItem], corruptedCount: 1 }), error: null });
  assert.equal(unreadable.status, "ready");
  assert.equal(unreadable.summary.items[0].issue, "storage_read_failed");
  assertNoOwnerCopy(unavailable, ownerA);
});

test("4 account counts never invent zero and export eligibility ignores count-query failure", () => {
  const ownerA = getBrowserSummaryOwnerKey("account-a");
  const ownerB = getBrowserSummaryOwnerKey("account-b");
  assert.equal(accountPresentation({ isAuthLoading: true }).status, "checking_auth");
  assert.equal(accountPresentation({ currentOwnerKey: null }).countDisplay.profile, "Checking…");
  const signedOut = accountPresentation({ currentUserId: null, currentOwnerKey: getBrowserSummaryOwnerKey(null) });
  assert.equal(signedOut.status, "signed_out");
  assert.equal(signedOut.countDisplay.profile, "Not available while signed out");
  assert.equal(signedOut.canExport, false);
  const notConfigured = accountPresentation({ isConfigured: false });
  assert.equal(notConfigured.status, "not_configured");
  assert.equal(notConfigured.countDisplay.profile, "Unavailable");
  assert.equal(notConfigured.canExport, false);
  assert.equal(accountPresentation({ state: countState(ownerA, { status: "loading", data: null }) }).countDisplay.profile, "Checking…");
  const stale = accountPresentation({ currentUserId: "account-b", currentOwnerKey: ownerB, state: countState(ownerA, { data: { profile: 99, resumeAnalyses: 99, jobMatches: 99, careerSnapshots: 99, betaFeedback: 99 } }) });
  assert.equal(stale.status, "loading");
  assert.equal(stale.countDisplay.profile, "Checking…");
  const staleEpoch = accountPresentation({ currentContextEpoch: 5, state: countState(ownerA) });
  assert.equal(staleEpoch.status, "loading");
  assert.equal(staleEpoch.countDisplay.profile, "Checking…");
  const error = accountPresentation({ state: countState(ownerA, { status: "error", data: null, error: "Safe repository message" }) });
  assert.equal(error.countDisplay.profile, "Unavailable");
  assert.equal(error.canExport, true);
  const zero = accountPresentation();
  assert.equal(zero.status, "ready");
  assert.equal(zero.countDisplay.profile, "0");
  const nonzero = accountPresentation({ state: countState(ownerA, { data: { profile: 1, resumeAnalyses: 2, jobMatches: 3, careerSnapshots: 4, betaFeedback: 5 } }) });
  assert.deepEqual(nonzero.countDisplay, { profile: "1", resumeAnalyses: "2", jobMatches: "3", careerSnapshots: "4", betaFeedback: "5" });
  for (const invalid of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
    const malformed = accountPresentation({ state: countState(ownerA, { data: { profile: invalid, resumeAnalyses: 0, jobMatches: 0, careerSnapshots: 0, betaFeedback: 0 } }) });
    assert.equal(malformed.status, "error");
    assert.equal(malformed.countDisplay.profile, "Unavailable");
  }
  assert.equal(accountPresentation({ isAuthLoading: true }).canExport, false);
  assertNoOwnerCopy(error, ownerA);
});

function downloadEnvironment(options = {}) {
  const events = [];
  const scheduled = [];
  const anchorState = { href: "", download: "", rel: "" };
  const anchor = {
    get href() { return anchorState.href; },
    set href(value) { if (options.throwHref) throw new Error("SECRET href"); anchorState.href = value; },
    get download() { return anchorState.download; },
    set download(value) { if (options.throwDownload) throw new Error("SECRET download"); anchorState.download = value; },
    get rel() { return anchorState.rel; },
    set rel(value) { if (options.throwRel) throw new Error("SECRET rel"); anchorState.rel = value; },
    click() { events.push("click"); if (options.throwClick) throw new Error("SECRET click"); },
    remove() { events.push("remove"); if (options.throwRemove) throw new Error("SECRET remove"); },
  };
  const environment = {
    createBlob(json, mimeType) {
      events.push(["blob", json, mimeType]);
      if (options.throwBlob) throw new Error("SECRET blob");
      return { json, mimeType };
    },
    createObjectURL(blob) {
      events.push(["create-url", blob]);
      if (options.throwCreateUrl) throw new Error("SECRET url");
      return options.objectUrl === undefined ? "blob:fixture-url" : options.objectUrl;
    },
    revokeObjectURL(url) {
      events.push(["revoke", url]);
      if (options.throwRevoke) throw new Error("SECRET revoke");
    },
    createAnchor() {
      events.push("create-anchor");
      if (options.throwCreateAnchor) throw new Error("SECRET anchor");
      return anchor;
    },
    appendAnchor(value) {
      events.push(["append", value]);
      if (options.throwAppend) throw new Error("SECRET append");
    },
    setTimeout(callback, delay) {
      events.push(["schedule", delay]);
      if (options.throwTimeout) throw new Error("SECRET timeout");
      scheduled.push({ callback, delay });
      return 1;
    },
  };
  return { environment, events, scheduled, anchor, anchorState };
}
function downloadFailure(result, code, retryable) {
  assert.equal(result.ok, false);
  assert.equal(result.error.code, code);
  assert.equal(result.error.retryable, retryable);
  const serialized = JSON.stringify(result);
  for (const text of ["SECRET", "skillmint-browser-test.json", "{\"private\":true}", "blob:fixture-url"]) {
    assert.equal(serialized.includes(text), false);
  }
}

test("5 download input validation is strict and preserves supplied JSON bytes", () => {
  const json = "{not parsed}\n";
  for (const fileName of ["skillmint-browser-anonymous-2026-07-13.json", "skillmint-account-2026-07-13.json"]) {
    const fixture = downloadEnvironment();
    assert.equal(requestJsonDownloadWithEnvironment(fileName, json, fixture.environment).ok, true);
    assert.equal(fixture.events[0][1], json);
  }
  const validEnvironment = downloadEnvironment().environment;
  for (const fileName of ["", 42, `${"a".repeat(176)}.json`, "bad name.json", "../bad.json", "bad\\name.json", "bad\u0000name.json", "file.JSON", "file.txt"]) {
    downloadFailure(requestJsonDownloadWithEnvironment(fileName, "{}", validEnvironment), "invalid_input", false);
  }
  for (const jsonInput of ["", null, 42]) {
    downloadFailure(requestJsonDownloadWithEnvironment("valid.json", jsonInput, validEnvironment), "invalid_input", false);
  }
});

test("6 successful download preserves order, exact inputs, and delayed revocation", () => {
  const fixture = downloadEnvironment();
  const json = "{\"exact\":true}\n";
  const result = requestJsonDownloadWithEnvironment("skillmint-browser-test.json", json, fixture.environment);
  assert.deepEqual(result, { ok: true, status: "download_requested" });
  assert.deepEqual(Object.keys(result), ["ok", "status"]);
  assert.deepEqual(fixture.events[0], ["blob", json, "application/json;charset=utf-8"]);
  assert.equal(fixture.events.filter((event) => Array.isArray(event) && event[0] === "create-url").length, 1);
  assert.equal(fixture.anchorState.href, "blob:fixture-url");
  assert.equal(fixture.anchorState.download, "skillmint-browser-test.json");
  assert.equal(fixture.anchorState.rel, "noopener");
  assert(fixture.events.findIndex((event) => Array.isArray(event) && event[0] === "append") < fixture.events.indexOf("click"));
  assert.equal(fixture.events.filter((event) => event === "click").length, 1);
  assert(fixture.events.indexOf("remove") > fixture.events.indexOf("click"));
  assert.equal(fixture.events.some((event) => Array.isArray(event) && event[0] === "revoke"), false);
  assert.equal(fixture.scheduled.length, 1);
  assert.equal(fixture.scheduled[0].delay, JSON_DOWNLOAD_REVOKE_DELAY_MS);
  assert.equal(JSON_DOWNLOAD_REVOKE_DELAY_MS, 1000);
  fixture.scheduled[0].callback();
  assert.equal(fixture.events.filter((event) => Array.isArray(event) && event[0] === "revoke").length, 1);
});

test("7 download failures map safely and clean pre-click resources", () => {
  downloadFailure(requestJsonDownload("valid.json", "{}"), "environment_unavailable", true);
  const throwingEnvironment = new Proxy({}, { get() { throw new Error("SECRET getter"); } });
  downloadFailure(requestJsonDownloadWithEnvironment("valid.json", "{}", throwingEnvironment), "environment_unavailable", true);
  for (const [options, code] of [
    [{ throwBlob: true }, "blob_creation_failed"],
    [{ throwCreateUrl: true }, "object_url_creation_failed"],
    [{ objectUrl: "" }, "object_url_creation_failed"],
    [{ objectUrl: 42 }, "object_url_creation_failed"],
    [{ throwCreateAnchor: true }, "download_trigger_failed"],
    [{ throwHref: true }, "download_trigger_failed"],
    [{ throwDownload: true }, "download_trigger_failed"],
    [{ throwRel: true }, "download_trigger_failed"],
    [{ throwAppend: true }, "download_trigger_failed"],
    [{ throwClick: true }, "download_trigger_failed"],
  ]) {
    const fixture = downloadEnvironment(options);
    const result = requestJsonDownloadWithEnvironment("skillmint-browser-test.json", "{\"private\":true}", fixture.environment);
    downloadFailure(result, code, true);
    if (code === "download_trigger_failed") {
      assert.equal(fixture.events.some((event) => Array.isArray(event) && event[0] === "revoke"), true);
    }
    if (options.throwAppend || options.throwClick) {
      assert.equal(fixture.events.includes("remove"), true);
    }
  }
  const cleanupFailure = downloadEnvironment({ throwClick: true, throwRemove: true, throwRevoke: true });
  downloadFailure(requestJsonDownloadWithEnvironment("valid.json", "{}", cleanupFailure.environment), "download_trigger_failed", true);
});

test("8 post-click cleanup failures remain successful and never retry the click", () => {
  for (const options of [{ throwRemove: true }, { throwTimeout: true }]) {
    const fixture = downloadEnvironment(options);
    const result = requestJsonDownloadWithEnvironment("valid.json", "{}", fixture.environment);
    assert.deepEqual(result, { ok: true, status: "download_requested" });
    assert.equal(fixture.events.filter((event) => event === "click").length, 1);
    assert.equal(fixture.events.some((event) => Array.isArray(event) && event[0] === "revoke"), false);
  }
  const delayed = downloadEnvironment({ throwRevoke: true });
  assert.equal(requestJsonDownloadWithEnvironment("valid.json", "{}", delayed.environment).ok, true);
  assert.doesNotThrow(() => delayed.scheduled[0].callback());
  assert.equal(JSON.stringify(requestJsonDownloadWithEnvironment("valid.json", "{}", downloadEnvironment().environment)).includes("saved"), false);
});

test("9 page integration removes render-time storage and binds export/count state", () => {
  assert.match(pageSource, /requestJsonDownload/);
  assert.match(pageSource, /getVisibleBrowserSummaryState/);
  assert.match(pageSource, /isCurrentOwnedRequest/);
  assert.match(pageSource, /subscribeToSkillMintWorkspaceUpdates/);
  assert.doesNotMatch(pageSource, /hasAnonymousBrowserWorkspace/);
  assert.doesNotMatch(pageSource, /localStorage|sessionStorage/);
  assert.doesNotMatch(pageSource, /function downloadJson/);
  assert.doesNotMatch(pageSource, /new Blob|createObjectURL|revokeObjectURL/);
  assert.doesNotMatch(pageSource, /useState\([^)]*getBrowserStorageSummary/);
  assert.doesNotMatch(pageSource, /const browserSummary\s*=\s*getBrowserStorageSummary/);
  assert.match(pageSource, /useEffect\([\s\S]*getBrowserStorageSummary/);
  assert.doesNotMatch(pageSource, /browserSummaryVersion/);
  assert.doesNotMatch(pageSource, /accountCountData\?\.|\?\?\s*0/);
  assert.doesNotMatch(pageSource, /createEmptyAccountCounts/);
  assert.match(pageSource, /accountCountsState/);
  assert.match(pageSource, /accountExportState/);
  assert.match(pageSource, /const isTrustCenterMountedRef = useRef\(true\)/);
  assert.match(
    pageSource,
    /return \(\) => \{[\s\S]*isTrustCenterMountedRef\.current = false;[\s\S]*activeCountRequestRef\.current = null;[\s\S]*activeAccountExportRef\.current = null;/,
  );
  const accountExportHandlerSource = pageSource.slice(
    pageSource.indexOf("async function handleAccountExport"),
    pageSource.indexOf("function handleImportAnonymousWorkspace"),
  );
  assert(accountExportHandlerSource.indexOf("!isTrustCenterMountedRef.current") >= 0);
  assert(
    accountExportHandlerSource.indexOf("!isTrustCenterMountedRef.current") <
      accountExportHandlerSource.indexOf("requestJsonDownload("),
  );
  assert.doesNotMatch(pageSource, /useState[^\n]*(?:fileName|\.json|json:)/);
  assert.equal((pageSource.match(/getCurrentUserAccountDataCounts\(live\.currentUserId\)/g) ?? []).length, 1);
  assert.match(pageSource, /activeBrowserExportRef/);
  const browserExportHandlerSource = pageSource.slice(
    pageSource.indexOf("function handleBrowserExport"),
    pageSource.indexOf("async function handleAccountExport"),
  );
  assert(
    browserExportHandlerSource.indexOf("!isTrustCenterMountedRef.current") <
      browserExportHandlerSource.indexOf("requestJsonDownload("),
  );
  assert.match(accountExportHandlerSource, /expectedUserId: live\.currentUserId/);
  assert.match(pageSource, /Browser download was requested/);
  assert.match(pageSource, /Account download was requested/);
  assert.doesNotMatch(pageSource, /Browser export created|Account export created/);
  assert.match(pageSource, /role=\{status === "error" \? "alert" : "status"\}/);
});

test("10 new modules preserve pure boundaries and touch no real browser state", () => {
  assert.doesNotMatch(trustStateSource, /from ["']react["']|\bwindow\b|\bdocument\b|localStorage|sessionStorage|supabase/i);
  assert.doesNotMatch(trustStateSource, /browserDataExportEngine|browserDataExportContract|accountDataRepository/);
  assert.doesNotMatch(downloadSource, /buildBrowserDataExport|buildCurrentUserAccountDataExport|localStorage|ownedSkillMintStorage|skillMintStorageRegistry/);
  assert.doesNotMatch(downloadSource, /JSON\.parse|JSON\.stringify/);
  assert.equal(typeof global.window, "undefined");
});

for (const { name, callback } of tests) {
  await callback();
  console.log(`PASS ${name}`);
}

console.log(
  "Offline Block 5.2.5 Trust Center reliability fixture complete. It does not prove that the browser saved a file, Safari/Chrome/Firefox download behavior, real object-URL timing in every browser, rendered hydration without browser QA, account switching against live Supabase, screen-reader behavior, ConfirmDialog accessibility, destructive-operation race safety, live database/RLS behavior, legal compliance, or production readiness.",
);
