import assert from "node:assert/strict";
import crypto from "node:crypto";
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

for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = function compileTypeScript(module, filename) {
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
}

const pagePath = path.join(srcRoot, "app/settings/data/page.tsx");
const pageSource = fs.readFileSync(pagePath, "utf8");
const feedbackWidgetSource = fs.readFileSync(
  path.join(srcRoot, "modules/feedback/components/FeedbackWidget.tsx"),
  "utf8",
);
const confirmDialogSource = fs.readFileSync(
  path.join(srcRoot, "components/ui/ConfirmDialog.tsx"),
  "utf8",
);
const confirmHelperSource = fs.readFileSync(
  path.join(srcRoot, "components/ui/confirmDialogAccessibility.ts"),
  "utf8",
);
const accountRepositorySource = fs.readFileSync(
  path.join(srcRoot, "modules/data-controls/services/accountDataRepository.ts"),
  "utf8",
);
const pageAst = parseTypeScriptSource(pagePath, pageSource);
const feedbackWidgetAst = parseTypeScriptSource(
  path.join(srcRoot, "modules/feedback/components/FeedbackWidget.tsx"),
  feedbackWidgetSource,
);
const localFeedbackPath = path.join(
  srcRoot,
  "modules/feedback/services/feedbackLocalStorage.ts",
);
const {
  getAccountCountsPresentation,
  getBrowserSummaryOwnerKey,
  getVisibleBrowserSummaryState,
  isCurrentOwnedRequest,
} = require(path.join(srcRoot, "modules/data-controls/trustCenterState.ts"));
const {
  buildAccountDataExportWithAdapter,
} = require(path.join(
  srcRoot,
  "modules/data-controls/services/accountDataRepository.ts",
));
const {
  getSkillMintStorageDescriptors,
} = require(path.join(srcRoot, "lib/storage/skillMintStorageRegistry.ts"));
const {
  getBrowserDataExportContract,
  validateBrowserDataExportContractCoverage,
} = require(path.join(
  srcRoot,
  "modules/data-controls/browserDataExportContract.ts",
));
const {
  requestJsonDownloadWithEnvironment,
} = require(path.join(srcRoot, "modules/data-controls/jsonDownload.ts"));
const {
  BETA_FEEDBACK_STORAGE_KEY,
  getLocalFeedbackItemsWithEnvironment,
  saveFeedbackLocallyWithEnvironment,
} = require(localFeedbackPath);

const ACCOUNT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ACCOUNT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const TIME = "2026-07-13T10:20:30.000Z";
const tests = [];

function test(name, callback) {
  tests.push({ name, callback });
}

test("1 registry and browser-export contracts have exact production coverage", () => {
  const descriptors = getSkillMintStorageDescriptors();
  assert.equal(descriptors.length, 12);
  assert.deepEqual(validateBrowserDataExportContractCoverage(descriptors), { ok: true });
  assert.equal(descriptors.filter((item) => item.exportable).length, 12);
});

test("2 Trust Center uses public exports and independent owner-bound state", () => {
  assert.match(pageSource, /buildBrowserDataExport\(\{/);
  assert.match(pageSource, /buildCurrentUserAccountDataExport\(\{/);
  assert.match(pageSource, /expectedUserId: live\.currentUserId/);
  assert.match(pageSource, /accountCountsState/);
  assert.match(pageSource, /accountExportState/);
  assert.match(pageSource, /browserNotice/);
  assert.match(pageSource, /activeBrowserExportRef/);
  assert.match(pageSource, /visibleShowSavedReportsDialog = showSavedReportsDialog &&\s*!contextChanged/);
  assert.match(pageSource, /visibleShowAccountDeleteDialog = showAccountDeleteDialog &&\s*!contextChanged/);
  assert.doesNotMatch(pageSource, /useState[^\n]*(?:fileName|json:|\.json)/);
  assert.doesNotMatch(pageSource, /accountCountData\?\.|\?\?\s*0|\|\|\s*0/);
  assertAssignmentsRunOnlyInHook(
    pageAst,
    "liveRequestContextRef.current",
    "useLayoutEffect",
  );
  assertAssignmentsRunOnlyInHook(
    pageAst,
    "committedRequestContextRef.current",
    "useLayoutEffect",
  );
});

test("3 count failure stays unknown while account export remains eligible", () => {
  const ownerKey = getBrowserSummaryOwnerKey(ACCOUNT_A);
  const presentation = getAccountCountsPresentation({
    isAuthLoading: false,
    isConfigured: true,
    currentUserId: ACCOUNT_A,
    currentOwnerKey: ownerKey,
    currentContextEpoch: 4,
    state: {
      ownerKey,
      request: { ownerKey, contextEpoch: 4, requestToken: 1 },
      status: "error",
      data: null,
      error: "Unavailable",
    },
  });
  assert.equal(presentation.canExport, true);
  assert.equal(presentation.countDisplay.profile, "Unavailable");
  assert.equal(presentation.counts, null);
});

test("4 A-B-A, owner changes, newer requests, and unmount fail closed", () => {
  const ownerA = getBrowserSummaryOwnerKey(ACCOUNT_A);
  const ownerB = getBrowserSummaryOwnerKey(ACCOUNT_B);
  const originalA = { ownerKey: ownerA, contextEpoch: 4, requestToken: 1 };
  assert.equal(isCurrentOwnedRequest(originalA, { ownerKey: ownerA, contextEpoch: 4 }, originalA), true);
  assert.equal(isCurrentOwnedRequest(originalA, { ownerKey: ownerB, contextEpoch: 5 }, originalA), false);
  assert.equal(isCurrentOwnedRequest(originalA, { ownerKey: ownerA, contextEpoch: 6 }, originalA), false);
  assert.equal(isCurrentOwnedRequest(originalA, { ownerKey: ownerA, contextEpoch: 4 }, { ...originalA, requestToken: 2 }), false);
  assert.equal(isCurrentOwnedRequest(originalA, { ownerKey: ownerA, contextEpoch: 4 }, null), false);
  assert.match(pageSource, /isTrustCenterMountedRef\.current = false/);
  assert.match(pageSource, /activeBrowserExportRef\.current = null/);
  assert.match(pageSource, /activeAccountExportRef\.current = null/);
});

test("5 account collection rejects a provider owner different from captured UI owner", async () => {
  let identityCalls = 0;
  const result = await buildAccountDataExportWithAdapter({
    async getAuthenticatedUserId() {
      identityCalls += 1;
      return { data: ACCOUNT_B, error: null };
    },
    async getExactCount() {
      throw new Error("counts must not run after identity mismatch");
    },
    async getProfileRows() {
      throw new Error("profiles must not run after identity mismatch");
    },
    async getKeysetPage() {
      throw new Error("pages must not run after identity mismatch");
    },
  }, TIME, { expectedUserId: ACCOUNT_A });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "account_changed");
  assert.equal(identityCalls, 1);
  assert.match(accountRepositorySource, /getCurrentUserAccountDataCounts\(\s*expectedUserId\?: string/);
  assert.match(accountRepositorySource, /deleteCurrentUserSavedReports\(\s*expectedUserId\?: string/);
});

test("6 account and browser download handoffs preserve exact returned fields", () => {
  const accountHandler = sliceSource(
    pageSource,
    "async function handleAccountExport",
    "function handleImportAnonymousWorkspace",
  );
  const browserHandler = sliceSource(
    pageSource,
    "function handleBrowserExport",
    "async function handleAccountExport",
  );
  assert.match(accountHandler, /requestJsonDownload\(\s*result\.data\.fileName,\s*result\.data\.json,?\s*\)/);
  assert.match(browserHandler, /requestJsonDownload\(result\.fileName, result\.json\)/);
  assert(
    accountHandler.indexOf("isCurrentOwnedRequest(") <
      accountHandler.indexOf("requestJsonDownload("),
  );
  assertGuardBeforeDownload(pageAst, "handleAccountExport");
  assertGuardBeforeDownload(pageAst, "handleBrowserExport");
  assert(
    browserHandler.indexOf("isCurrentOwnedRequest(") <
      browserHandler.indexOf("requestJsonDownload("),
  );

  const calls = [];
  const result = requestJsonDownloadWithEnvironment("exact-name.json", "{\"exact\":true}\n", {
    createBlob(json, mimeType) {
      calls.push(["blob", json, mimeType]);
      return { json };
    },
    createObjectURL(blob) {
      calls.push(["url", blob]);
      return "blob:exact";
    },
    revokeObjectURL(url) {
      calls.push(["revoke", url]);
    },
    createAnchor() {
      return {
        href: "",
        download: "",
        rel: "",
        click() { calls.push(["click", this.download, this.href]); },
        remove() { calls.push(["remove"]); },
      };
    },
    appendAnchor(anchor) { calls.push(["append", anchor.download]); },
    setTimeout(callback, delay) { calls.push(["timeout", delay]); return callback; },
  });
  assert.equal(result.ok, true);
  assert.deepEqual(calls[0].slice(0, 2), ["blob", "{\"exact\":true}\n"]);
  assert(calls.some((call) => call[0] === "click" && call[1] === "exact-name.json"));
});

test("7 download copy is requested-only and JSON never enters React state", () => {
  assert.match(pageSource, /Browser download was requested/);
  assert.match(pageSource, /Account download was requested/);
  assert.doesNotMatch(pageSource, /download (?:was )?(?:saved|completed)|file (?:was )?saved|downloaded successfully/i);
  assert.doesNotMatch(pageSource, /useState[^\n]*(?:fileName|json:|\.json)/);
  assertStringLiteralExists(
    pageAst,
    "Browser download was requested. Check your browser’s downloads.",
  );
  assertStringLiteralExists(
    pageAst,
    "Account download was requested. Check your browser’s downloads.",
  );
});

test("8 browser summary is effect-loaded and workspace subscription cleans up", () => {
  assert.doesNotMatch(pageSource, /localStorage|sessionStorage/);
  assert.doesNotMatch(pageSource, /useState\([^)]*getBrowserStorageSummary/);
  assert.match(pageSource, /useEffect\(\(\) => \{[\s\S]*getBrowserStorageSummary/);
  assert.match(pageSource, /subscribeToSkillMintWorkspaceUpdates\(loadSummary\)/);
  assert.match(pageSource, /return \(\) => \{[\s\S]*unsubscribe\(\)/);
  const ownerA = getBrowserSummaryOwnerKey(ACCOUNT_A);
  const ownerB = getBrowserSummaryOwnerKey(ACCOUNT_B);
  const stale = {
    ownerKey: ownerA,
    contextEpoch: 4,
    status: "ready",
    data: {
      ownerScope: "account",
      items: [],
      visibleCount: 9,
      anonymousWorkspaceDataExists: false,
      otherWorkspaceDataExists: false,
      corruptedCount: 0,
      clearableCount: 12,
    },
    error: null,
  };
  assert.equal(getVisibleBrowserSummaryState(ownerB, 5, stale).status, "checking");
  assertTrustCenterUnmountCleanup(pageAst);
});

test("9 feedback handoffs isolate owners, events, fallback, and exports", () => {
  const input = {
    feedbackType: "bug",
    sentiment: "neutral",
    message: "A deterministic feedback message",
    pagePath: "/settings/data",
  };
  const successStorage = fakeFeedbackStorage();
  let successEvents = 0;
  const successEnvironment = feedbackEnvironment(successStorage, () => {
    successEvents += 1;
  });
  const saved = saveFeedbackLocallyWithEnvironment(
    input,
    { currentUserId: ACCOUNT_A },
    "network_failure",
    successEnvironment,
  );
  assert.equal(saved.ok, true);
  assert.equal(successEvents, 1);
  assert.equal(getLocalFeedbackItemsWithEnvironment(
    { currentUserId: ACCOUNT_B },
    successEnvironment,
  ).data.length, 0);
  assert.equal(getLocalFeedbackItemsWithEnvironment(
    { currentUserId: ACCOUNT_A },
    successEnvironment,
  ).data.length, 1);

  let failureEvents = 0;
  const failedStorage = fakeFeedbackStorage({ failWrite: true });
  const failed = saveFeedbackLocallyWithEnvironment(
    input,
    { currentUserId: null },
    undefined,
    feedbackEnvironment(failedStorage, () => { failureEvents += 1; }),
  );
  assert.equal(failed.ok, false);
  assert.equal(failureEvents, 0);

  const contract = getBrowserDataExportContract(BETA_FEEDBACK_STORAGE_KEY);
  const reconstructed = contract.reconstruct([{
    ...saved.data,
    syncError: "network_failure",
  }]);
  assert.equal(reconstructed.ok, true);
  assert.equal("syncError" in reconstructed.value[0], false);
  assert.deepEqual(reconstructed.privacyTransformations, ["feedback_sync_error_excluded"]);

  const signedOutBranch = sliceSource(
    feedbackWidgetSource,
    "if (startingUserId === null)",
    "let accountResult",
  );
  assert.match(signedOutBranch, /saveFeedbackLocally/);
  assert.doesNotMatch(signedOutBranch, /submitBetaFeedback/);
  const accountSuccessBranch = sliceSource(
    feedbackWidgetSource,
    "if (accountResult.ok)",
    "const persistedCode",
  );
  assert.doesNotMatch(accountSuccessBranch, /saveFeedbackLocally/);
  assertPositiveAccountSuccessBranch(feedbackWidgetAst);
});

test("10 dialog, feedback disclosure, and processing semantics remain integrated", () => {
  assert.match(pageSource, /initialFocusRef=\{accountDeleteConfirmationInputRef\}/);
  assert.match(confirmDialogSource, /aria-busy=\{isProcessing\}/);
  assert.match(confirmDialogSource, /disabled=\{isProcessing \|\| confirmDisabled\}/);
  assert.match(confirmHelperSource, /if \(!input\.getIsProcessing\(\) && !closeRequested\)/);
  assert.match(feedbackWidgetSource, /aria-expanded=\{visibleIsOpen\}/);
  assert.match(feedbackWidgetSource, /role=\{visibleStatus\.tone === "error" \? "alert" : "status"\}/);
  assert.match(feedbackWidgetSource, /visibleStatus\.tone !== "idle" && visibleStatus\.message/);
  const accountDeletionHandler = sliceSource(
    pageSource,
    "async function handleDeleteAccount",
    "function isCurrentAccountDeletionRequest",
  );
  assert.doesNotMatch(accountDeletionHandler, /\.signOut\s*\(/);
  assert.match(accountDeletionHandler, /currentUserId: deletionOwnerId/);
});

test("10b count collection performs a final same-provider checkpoint", () => {
  const countHandler = sliceSource(
    accountRepositorySource,
    "export async function getCurrentUserAccountDataCounts",
    "export async function buildCurrentUserAccountDataExport",
  );
  assert.match(
    countHandler,
    /confirmSupabaseIdentity\(supabase, userId\)/,
  );
});

test("11 Block 5 documentation keeps downloads and 5.3 boundaries truthful", () => {
  const blockFiveDocs = [
    "DATA_CONTROLS.md",
    "DATA_EXPORT.md",
    "DATA_MAP.md",
    "TRUST_CENTER.md",
    "QA_DATA_CONTROLS.md",
    "PRIVACY_NOTICE.md",
    "ACCOUNT_DELETION.md",
    "RELEASE_NOTES.md",
    "BETA_V1_BUILD_ROADMAP.md",
    "TODO.md",
    "DEPLOYMENT.md",
  ].map((name) => fs.readFileSync(path.join(repoRoot, "docs", name), "utf8"));
  const combined = blockFiveDocs.join("\n");
  const completionClaimLines = combined.split("\n").filter((line) =>
    /download (?:was )?(?:saved|completed)|file (?:was )?saved|downloaded successfully/i.test(line)
  );
  for (const line of completionClaimLines) {
    assert.match(line, /\b(?:not|never|cannot|doesn't|isn't)\b/i);
  }
  assert.match(combined, /not (?:an? )?(?:atomic )?(?:point-in-time )?transactional/i);
  assert.match(combined, /live RLS/i);
  assert.match(combined, /disposable account/i);
  assert.match(combined, /Block 5 engineering gate is \*\*CLOSED AND FROZEN\*\*/i);
  assert.match(combined, /Automated Chromium, Firefox, and WebKit coverage passed with zero retries, skips, or flakes/i);
  assert.doesNotMatch(combined, /manual[- ]QA[^\n]*(?:pending|required)/i);
  assert.match(combined, /WebKit is not Safari certification/i);
  assert.match(combined, /not real (?:VoiceOver, NVDA, or JAWS |)speech certification/i);
  assert.match(combined, /not permanent OS-save proof/i);
  const certificationClaimLines = combined.split("\n").filter((line) =>
    /Safari[^\n]*certif|screen-reader[^\n]*certif|permanent OS-save proof/i.test(line)
  );
  for (const line of certificationClaimLines) {
    assert.match(line, /\b(?:not|never|no|isn't|wasn't|does not)\b/i);
  }
  assert.match(combined, /SUPABASE_SECRET_KEY/);
  assert.match(combined, /SUPABASE_DB_URL/);
  assert.match(combined, /schema_v3_data_controls\.sql/);
  assert.match(combined, /schema_v4_account_deletion_security\.sql/);
  assert.match(combined, /Preview and Production scopes must be reviewed separately/i);
  assert.match(combined, /Unknown remote deployment behavior blocks remote push readiness/i);
  assert.match(combined, /BETA_RELEASE_READINESS=BLOCKED_PENDING_PRODUCTION_ROLLOUT_AND_EXTERNAL_PRIVACY_CONTACT/);
  assert.match(combined, /verified privacy\/support contact[^\n]*release blocker/i);
  assert.doesNotMatch(combined, /GDPR compliant|DPDP compliant|production ready/i);
});

test("12 protected fixtures are byte-stable and production imports no closure fixture", () => {
  const expectedHashes = new Map([
    ["scripts/active-target-fixtures.mjs", "4855e6f481ef01cbfcefab7cb93ba6cb7b3c3cd2a1f9c6657415624282144fa3"],
    ["scripts/mission-path-fixtures.mjs", "1ed9a3e2550c4dff6db6fa12f05bb4e1b2f3987334c4bd36195e17237c4bfe20"],
    ["scripts/scoring-truth-fixtures.mjs", "7c4729b6aea68fc74db740d4997abd26e42657394b8fe059f3e99d4b366a65a2"],
  ]);
  for (const [relativePath, expectedHash] of expectedHashes) {
    const bytes = fs.readFileSync(path.join(repoRoot, relativePath));
    assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), expectedHash);
  }
  for (const file of walkFiles(srcRoot)) {
    assert.equal(
      fs.readFileSync(file, "utf8").includes("block-5-2-8-integration-fixtures"),
      false,
    );
  }
  assert.equal(typeof global.window, "undefined");
  assert.equal(typeof global.localStorage, "undefined");
  assert.doesNotMatch(fs.readFileSync(fileURLToPath(import.meta.url), "utf8"), /fetch\(|https?:\/\//);
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

console.log(`PASS ${tests.length} Block 5.2.8 integration fixture groups`);
console.log("LIMITATIONS source inspection does not prove rendered React timing, browser download saving, object-URL behavior across browsers, or manual accessibility behavior.");
console.log("LIMITATIONS live Supabase schema/RLS/indexes, destructive deletion races/cascades, provider backups/logs, verified privacy/support contact, legal compliance, and production readiness remain unproved or deferred to Block 5.3.");

function sliceSource(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert(startIndex >= 0 && endIndex > startIndex);
  return source.slice(startIndex, endIndex);
}

function fakeFeedbackStorage(options = {}) {
  let raw = null;
  return {
    getItem(key) {
      assert.equal(key, BETA_FEEDBACK_STORAGE_KEY);
      return raw;
    },
    setItem(key, value) {
      assert.equal(key, BETA_FEEDBACK_STORAGE_KEY);
      if (options.failWrite) throw new Error("offline write failure");
      raw = value;
    },
  };
}

function feedbackEnvironment(storage, notifyWorkspaceUpdated) {
  return {
    getStorage: () => storage,
    now: () => TIME,
    createId: () => "feedback-integration-1",
    notifyWorkspaceUpdated,
  };
}

function walkFiles(root) {
  const output = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) output.push(...walkFiles(target));
    else output.push(target);
  }
  return output;
}

function parseTypeScriptSource(fileName, source) {
  return ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

function walkAst(node, visit) {
  visit(node);
  ts.forEachChild(node, (child) => walkAst(child, visit));
}

function getEnclosingCallName(node) {
  let current = node.parent;
  while (current) {
    if (ts.isCallExpression(current) && ts.isIdentifier(current.expression)) {
      return current.expression.text;
    }
    if (ts.isSourceFile(current)) return null;
    current = current.parent;
  }
  return null;
}

function assertAssignmentsRunOnlyInHook(sourceFile, targetText, hookName) {
  const assignments = [];
  walkAst(sourceFile, (node) => {
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      node.left.getText(sourceFile) === targetText
    ) assignments.push(node);
  });
  assert(assignments.length > 0, `${targetText} assignment missing`);
  for (const assignment of assignments) {
    assert.equal(getEnclosingCallName(assignment), hookName);
  }
}

function findNamedFunction(sourceFile, name) {
  let found = null;
  walkAst(sourceFile, (node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node;
  });
  assert(found?.body, `${name} function missing`);
  return found;
}

function nodeContains(node, predicate) {
  let found = false;
  walkAst(node, (candidate) => {
    if (!found && predicate(candidate)) found = true;
  });
  return found;
}

function isNegatedCall(node, name) {
  return ts.isPrefixUnaryExpression(node) &&
    node.operator === ts.SyntaxKind.ExclamationToken &&
    ts.isCallExpression(node.operand) &&
    ts.isIdentifier(node.operand.expression) &&
    node.operand.expression.text === name;
}

function isNegatedMountedRef(node, sourceFile) {
  return ts.isPrefixUnaryExpression(node) &&
    node.operator === ts.SyntaxKind.ExclamationToken &&
    node.operand.getText(sourceFile) === "isTrustCenterMountedRef.current";
}

function statementReturns(statement) {
  return ts.isReturnStatement(statement) || (
    ts.isBlock(statement) &&
    statement.statements.some((child) => ts.isReturnStatement(child))
  );
}

function assertGuardBeforeDownload(sourceFile, functionName) {
  const fn = findNamedFunction(sourceFile, functionName);
  let guarded = false;
  walkAst(fn.body, (node) => {
    if (!ts.isBlock(node)) return;
    const downloadIndex = node.statements.findIndex((statement) =>
      nodeContains(statement, (candidate) =>
        ts.isCallExpression(candidate) &&
        ts.isIdentifier(candidate.expression) &&
        candidate.expression.text === "requestJsonDownload")
    );
    if (downloadIndex < 0) return;
    guarded = node.statements.slice(0, downloadIndex).some((statement) =>
      ts.isIfStatement(statement) &&
      statementReturns(statement.thenStatement) &&
      nodeContains(statement.expression, (candidate) =>
        isNegatedCall(candidate, "isCurrentOwnedRequest")) &&
      nodeContains(statement.expression, (candidate) =>
        isNegatedMountedRef(candidate, sourceFile))
    );
  });
  assert.equal(guarded, true, `${functionName} lacks a negative current-owner/mount guard before download`);
}

function assertStringLiteralExists(sourceFile, expected) {
  let found = false;
  walkAst(sourceFile, (node) => {
    if (ts.isStringLiteral(node) && node.text === expected) found = true;
  });
  assert.equal(found, true, `string literal missing: ${expected}`);
}

function assertTrustCenterUnmountCleanup(sourceFile) {
  let verified = false;
  walkAst(sourceFile, (node) => {
    if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression) ||
      node.expression.text !== "useEffect") return;
    const callback = node.arguments[0];
    if (!callback || !ts.isArrowFunction(callback) || !ts.isBlock(callback.body)) return;
    if (!nodeContains(callback.body, (candidate) =>
      ts.isBinaryExpression(candidate) &&
      candidate.left.getText(sourceFile) === "isTrustCenterMountedRef.current" &&
      candidate.right.kind === ts.SyntaxKind.TrueKeyword)) return;
    const cleanup = callback.body.statements.find((statement) => ts.isReturnStatement(statement));
    if (!cleanup || !ts.isReturnStatement(cleanup) || !cleanup.expression ||
      !ts.isArrowFunction(cleanup.expression)) return;
    const body = cleanup.expression.body;
    const expectedNullRefs = [
      "activeCountRequestRef.current",
      "activeBrowserExportRef.current",
      "activeAccountExportRef.current",
      "activeSavedReportsDeletionRef.current",
      "activeAccountDeletionRef.current",
    ];
    const hasFalseMount = nodeContains(body, (candidate) =>
      ts.isBinaryExpression(candidate) &&
      candidate.left.getText(sourceFile) === "isTrustCenterMountedRef.current" &&
      candidate.right.kind === ts.SyntaxKind.FalseKeyword);
    const hasAllNulls = expectedNullRefs.every((target) =>
      nodeContains(body, (candidate) =>
        ts.isBinaryExpression(candidate) &&
        candidate.left.getText(sourceFile) === target &&
        candidate.right.kind === ts.SyntaxKind.NullKeyword)
    );
    verified ||= hasFalseMount && hasAllNulls;
  });
  assert.equal(verified, true, "Trust Center unmount cleanup is incomplete");
}

function assertPositiveAccountSuccessBranch(sourceFile) {
  let found = false;
  walkAst(sourceFile, (node) => {
    if (!ts.isIfStatement(node)) return;
    if (node.expression.getText(sourceFile) !== "accountResult.ok") return;
    const hasLocalFallback = nodeContains(node.thenStatement, (candidate) =>
      ts.isCallExpression(candidate) &&
      ts.isIdentifier(candidate.expression) &&
      candidate.expression.text === "saveFeedbackLocally");
    if (!hasLocalFallback) found = true;
  });
  assert.equal(found, true, "account success branch polarity or fallback behavior changed");
}
