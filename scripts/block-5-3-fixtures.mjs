import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const {
  ACCOUNT_DELETE_CONFIRMATION,
  ACCOUNT_DELETE_MAX_BODY_BYTES,
  getBearerToken,
  isAllowedAccountDeletionOrigin,
  parseAccountDeleteRequestText,
  validateAccountDeleteRequestMetadata,
} = require("../src/lib/accountDeletion/contract.ts");
const {
  RECENT_AUTH_MAX_AGE_SECONDS,
  decodeJwtPayload,
  validateRecentAuthentication,
} = require("../src/lib/accountDeletion/recentAuth.ts");
const {
  runAccountDeletionOrchestration,
} = require("../src/lib/accountDeletion/orchestration.ts");
const {
  deleteAuthUserWithVerifiedConvergence,
} = require("../src/lib/accountDeletion/authDeletionConvergence.ts");
const {
  parseAccountDeletionResponse,
} = require("../src/modules/data-controls/accountDeletionClientContract.ts");
const {
  PRIVACY_CONTACT_ENV,
  resolvePrivacyContact,
} = require("../src/config/privacyContact.ts");
const {
  MISSION_STATUS_STORAGE_DESCRIPTOR,
} = require("../src/intelligence/missions/missionStorage.ts");
const {
  ONBOARDING_DISMISSED_STORAGE_KEY,
} = require("../src/modules/onboarding/storage/onboardingStorage.ts");
const {
  writeOwnedStorageValue,
} = require("../src/lib/storage/ownedSkillMintStorage.ts");
const {
  removeSkillMintOwnerData,
} = require("../src/lib/storage/skillMintStorageRegistry.ts");

const ACCOUNT_A = "11111111-1111-4111-8111-111111111111";
const ACCOUNT_B = "22222222-2222-4222-8222-222222222222";
const NOW = 2_000_000_000;

const tests = [];
function test(name, callback) { tests.push({ name, callback }); }

test("database migration inventories every account table and hardens RLS contracts", () => {
  const sql = fs.readFileSync(
    path.join(repoRoot, "supabase/schema_v4_account_deletion_security.sql"),
    "utf8",
  );
  for (const table of ["profiles", "resume_analyses", "job_matches", "career_snapshots", "beta_feedback"]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
  const requiredPolicies = {
    profiles: ["select", "insert", "update"],
    resume_analyses: ["select", "insert", "delete"],
    job_matches: ["select", "insert", "update", "delete"],
    career_snapshots: ["select"],
    beta_feedback: ["select", "insert"],
  };
  for (const [table, operations] of Object.entries(requiredPolicies)) {
    for (const operation of operations) {
      assert.match(sql, new RegExp(`on public\\.${table}[\\s\\S]{0,180}for ${operation}[\\s\\S]{0,120}to authenticated`, "i"));
    }
  }
  assert.doesNotMatch(sql, /on public\.profiles[\s\S]{0,180}for delete[\s\S]{0,120}to authenticated/i);
  assert.doesNotMatch(sql, /on public\.resume_analyses[\s\S]{0,180}for update[\s\S]{0,120}to authenticated/i);
  assert.doesNotMatch(sql, /on public\.career_snapshots[\s\S]{0,180}for (?:insert|update|delete)[\s\S]{0,120}to authenticated/i);
  assert.doesNotMatch(sql, /on public\.beta_feedback[\s\S]{0,180}for (?:update|delete)[\s\S]{0,120}to authenticated/i);
  assert.match(sql, /with check \(public\.is_active_skillmint_user\(\) and auth\.uid\(\) = id\)/i);
  assert.equal((sql.match(/with check \(public\.is_active_skillmint_user\(\) and auth\.uid\(\) = user_id\)/gi) ?? []).length, 4);
  assert.match(sql, /revoke all on (?:table )?public\.beta_feedback from public, anon, authenticated/i);
  for (const index of [
    "resume_analyses_user_id_id_idx",
    "job_matches_user_id_id_idx",
    "career_snapshots_user_id_id_idx",
    "beta_feedback_user_id_id_idx",
  ]) assert.match(sql, new RegExp(index));
  assert.match(sql, /create or replace function public\.prepare_account_deletion\(target_user_id uuid\)/i);
  assert.match(sql, /security definer/i);
  assert.match(sql, /set search_path = pg_catalog/i);
  assert.match(sql, /revoke all on function public\.prepare_account_deletion\(uuid\)\s+from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.prepare_account_deletion\(uuid\)\s+to service_role/i);
  assert.doesNotMatch(sql, /grant execute on function public\.prepare_account_deletion\(uuid\)\s+to authenticated/i);
  assert.doesNotMatch(sql, /execute\s+format|\bexecute\s+['"]/i);
  assert.match(sql, /delete from public\.profiles[\s\S]*delete from public\.beta_feedback/i);
  assert.match(sql, /raise exception 'Account data cleanup verification failed'/i);
});

test("request contract rejects method, media type, malformed, oversized, unexpected, and identity fields", () => {
  assert.deepEqual(validateAccountDeleteRequestMetadata({ method: "GET", contentType: "application/json", contentLength: null }), { ok: false, code: "method_not_allowed" });
  assert.deepEqual(validateAccountDeleteRequestMetadata({ method: "POST", contentType: "text/plain", contentLength: null }), { ok: false, code: "unsupported_media_type" });
  assert.deepEqual(validateAccountDeleteRequestMetadata({ method: "POST", contentType: "application/json; charset=utf-8", contentLength: String(ACCOUNT_DELETE_MAX_BODY_BYTES + 1) }), { ok: false, code: "request_too_large" });
  assert.equal(parseAccountDeleteRequestText("{").ok, false);
  assert.equal(parseAccountDeleteRequestText("x".repeat(ACCOUNT_DELETE_MAX_BODY_BYTES + 1)).code, "request_too_large");
  assert.equal(parseAccountDeleteRequestText(JSON.stringify({ confirmation: ACCOUNT_DELETE_CONFIRMATION, extra: true })).ok, false);
  assert.equal(parseAccountDeleteRequestText(JSON.stringify({ confirmation: ACCOUNT_DELETE_CONFIRMATION, userId: ACCOUNT_B })).ok, false);
  assert.equal(parseAccountDeleteRequestText(JSON.stringify({ confirmation: "wrong" })).ok, false);
  assert.deepEqual(parseAccountDeleteRequestText(JSON.stringify({ confirmation: ACCOUNT_DELETE_CONFIRMATION })), { ok: true, data: { confirmation: ACCOUNT_DELETE_CONFIRMATION } });
  assert.equal(getBearerToken("Bearer token-value"), "token-value");
  assert.equal(getBearerToken("Basic token-value"), null);
  assert.equal(isAllowedAccountDeletionOrigin({ requestUrl: "https://app.example/api/account/delete", origin: "https://evil.example", trustedAppOrigin: "https://app.example" }), false);
});

test("server route keeps identity, service role, stages, and responses inside trusted boundaries", () => {
  const route = fs.readFileSync(path.join(repoRoot, "src/app/api/account/delete/route.ts"), "utf8");
  const admin = fs.readFileSync(path.join(repoRoot, "src/lib/supabase/admin.ts"), "utf8");
  assert.match(admin, /^import "server-only";/);
  assert.match(route, /await userClient\.auth\.getUser\(token\)/);
  assert.ok(route.indexOf("getUser(token)") < route.indexOf("decodeJwtPayload(token)"));
  assert.match(route, /const adminClient = createSupabaseAdminClient\(\)[\s\S]*adminClient[\s\S]*\.rpc\([\s\S]*"prepare_account_deletion"[\s\S]*target_user_id:\s*userData\.user\.id/);
  assert.doesNotMatch(route, /userClient[\s\S]{0,240}prepare_account_deletion/);
  assert.match(route, /activeDeletions/);
  assert.match(route, /"Cache-Control": "no-store, max-age=0"/);
  assert.doesNotMatch(route, /request(?:Body|Text|\.json\(\))[\s\S]{0,100}(?:userId|user_id|accountId)/);
  assert.doesNotMatch(route, /signInWithPassword|["']password["']\s*:/);
  for (const file of listFiles(srcRoot)) {
    const source = fs.readFileSync(file, "utf8");
    if (/^[\s\S]*?["']use client["'];/.test(source)) {
      assert.doesNotMatch(source, /@\/lib\/supabase\/admin|SUPABASE_SECRET_KEY/);
    }
  }
  const productionSource = listFiles(srcRoot).map((file) => fs.readFileSync(file, "utf8")).join("\n");
  assert.doesNotMatch(productionSource, /\.storage\.from\(|storage\.listBuckets\(/);
});

test("recent authentication trusts detailed provider AMR, not token issuance", () => {
  const claims = { sub: ACCOUNT_A, iat: NOW, amr: [{ method: "password", timestamp: NOW - RECENT_AUTH_MAX_AGE_SECONDS }] };
  assert.equal(validateRecentAuthentication({ claims, validatedUserId: ACCOUNT_A, provider: "email", nowSeconds: NOW }).ok, true);
  assert.equal(validateRecentAuthentication({ claims: { ...claims, iat: NOW, amr: [{ method: "password", timestamp: NOW - RECENT_AUTH_MAX_AGE_SECONDS - 1 }] }, validatedUserId: ACCOUNT_A, provider: "email", nowSeconds: NOW }).code, "stale");
  assert.equal(validateRecentAuthentication({ claims: { ...claims, iat: NOW, amr: [{ method: "password", timestamp: NOW - 3600 }] }, validatedUserId: ACCOUNT_A, provider: "email", nowSeconds: NOW }).code, "stale");
  assert.equal(validateRecentAuthentication({ claims: { ...claims, amr: [] }, validatedUserId: ACCOUNT_A, provider: "email", nowSeconds: NOW }).code, "missing");
  assert.equal(validateRecentAuthentication({ claims: { ...claims, amr: ["password"] }, validatedUserId: ACCOUNT_A, provider: "email", nowSeconds: NOW }).code, "malformed");
  assert.equal(validateRecentAuthentication({ claims: { ...claims, amr: [{ method: "password", timestamp: NOW + 31 }] }, validatedUserId: ACCOUNT_A, provider: "email", nowSeconds: NOW }).code, "future");
  assert.equal(validateRecentAuthentication({ claims, validatedUserId: ACCOUNT_A, provider: "google", nowSeconds: NOW }).code, "unsupported_method");
  assert.equal(validateRecentAuthentication({ claims, validatedUserId: ACCOUNT_B, provider: "email", nowSeconds: NOW }).code, "account_mismatch");
  const token = jwt(claims);
  assert.deepEqual(decodeJwtPayload(token), claims);
  assert.equal(decodeJwtPayload("not-a-jwt"), null);
});

test("orchestration is ordered, validates adapters, and never reports partial success", async () => {
  const calls = [];
  const success = await runAccountDeletionOrchestration({
    deleteAccountData: async () => { calls.push("database"); return cleanupSuccess(); },
    deleteAccountStorage: async () => { calls.push("storage"); return { ok: true, applicable: false, verified: true }; },
    deleteAuthUser: async () => { calls.push("auth"); return { ok: true, deleted: true }; },
  });
  assert.deepEqual(success, { ok: true });
  assert.deepEqual(calls, ["database", "storage", "auth"]);

  for (const failureAt of ["database", "storage", "auth"]) {
    const attempted = [];
    const result = await runAccountDeletionOrchestration({
      deleteAccountData: async () => { attempted.push("database"); return failureAt === "database" ? { ok: false } : cleanupSuccess(); },
      deleteAccountStorage: async () => { attempted.push("storage"); return failureAt === "storage" ? { ok: false } : { ok: true, applicable: false, verified: true }; },
      deleteAuthUser: async () => { attempted.push("auth"); return failureAt === "auth" ? { ok: false } : { ok: true, deleted: true }; },
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, `${failureAt}_deletion_failed`.replace("database_deletion", "account_data_cleanup"));
    if (failureAt !== "auth") assert.equal(attempted.includes("auth"), false);
  }
  const malformed = await runAccountDeletionOrchestration({
    deleteAccountData: async () => ({ ok: true, verifiedAbsent: false, counts: {} }),
    deleteAccountStorage: async () => ({ ok: true, applicable: false, verified: true }),
    deleteAuthUser: async () => ({ ok: true, deleted: true }),
  });
  assert.deepEqual(malformed, { ok: false, code: "account_data_cleanup_failed" });
});

test("Auth deletion converges only after bounded trusted absence verification", async () => {
  const succeeded = authBoundary({ deletionError: null });
  assert.deepEqual(await deleteAuthUserWithVerifiedConvergence(succeeded.auth, ACCOUNT_A, succeeded.wait), { ok: true, deleted: true });
  assert.equal(succeeded.deleteCalls, 1);
  assert.equal(succeeded.lookupCalls, 0);
  assert.deepEqual(succeeded.delays, []);

  const alreadyAbsent = authBoundary({
    deletionError: new Error("provider detail must stay private"),
    verifications: [{ error: { status: 404 }, data: { user: null } }],
  });
  assert.deepEqual(await deleteAuthUserWithVerifiedConvergence(alreadyAbsent.auth, ACCOUNT_A, alreadyAbsent.wait), { ok: true, deleted: true });
  assert.equal(alreadyAbsent.deleteCalls, 1);
  assert.equal(alreadyAbsent.lookupCalls, 1);
  assert.deepEqual(alreadyAbsent.delays, []);

  const converged = authBoundary({
    deletionError: new Error("losing process"),
    verifications: [
      { error: null, data: { user: { id: ACCOUNT_A } } },
      { error: { status: 404 }, data: { user: null } },
    ],
  });
  assert.deepEqual(await deleteAuthUserWithVerifiedConvergence(converged.auth, ACCOUNT_A, converged.wait), { ok: true, deleted: true });
  assert.equal(converged.deleteCalls, 1);
  assert.equal(converged.lookupCalls, 2);
  assert.deepEqual(converged.delays, [50]);

  for (const verifications of [
    Array.from({ length: 3 }, () => ({ error: null, data: { user: { id: ACCOUNT_A } } })),
    Array.from({ length: 3 }, () => ({ error: { status: 503 }, data: { user: null } })),
    Array.from({ length: 3 }, () => ({ error: { status: 404 }, data: { user: { id: ACCOUNT_A } } })),
    Array.from({ length: 3 }, () => ({ error: null, data: { user: null } })),
    Array.from({ length: 3 }, () => ({ error: { status: 404 } })),
    Array.from({ length: 3 }, () => null),
  ]) {
    const failed = authBoundary({ deletionError: new Error("private provider failure"), verifications });
    assert.deepEqual(await deleteAuthUserWithVerifiedConvergence(failed.auth, ACCOUNT_A, failed.wait), { ok: false });
    assert.equal(failed.deleteCalls, 1);
    assert.equal(failed.lookupCalls, 3);
    assert.deepEqual(failed.delays, [50, 100]);
  }
});

test("route preserves exact safe success and generic Auth-failure responses", async () => {
  const helperPath = require.resolve("../src/lib/accountDeletion/authDeletionConvergence.ts");
  const adminPath = require.resolve("../src/lib/supabase/admin.ts");
  const configPath = require.resolve("../src/lib/supabase/config.ts");
  const routePath = require.resolve("../src/app/api/account/delete/route.ts");
  const cached = new Map([helperPath, adminPath, configPath, routePath].map((key) => [key, require.cache[key]]));
  let helperResult = { ok: true, deleted: true };
  class MockAdminConfigurationError extends Error {}
  require.cache[helperPath] = moduleStub(helperPath, {
    deleteAuthUserWithVerifiedConvergence: async () => helperResult,
  });
  require.cache[adminPath] = moduleStub(adminPath, {
    createSupabaseAdminClient: () => ({
      rpc: async () => ({ error: null, data: cleanupRow() }),
      auth: { admin: {} },
    }),
    SupabaseAdminConfigurationError: MockAdminConfigurationError,
  });
  require.cache[configPath] = moduleStub(configPath, {
    getSupabasePublicConfig: () => ({ url: "https://isolated.example", publishableKey: "public-placeholder" }),
    getTrustedAppOrigin: () => "https://app.example",
  });
  delete require.cache[routePath];
  const originalLoad = Module._load;
  Module._load = function loadRouteDependency(request, parent, isMain) {
    if (request === "@supabase/supabase-js") {
      return {
        createClient: () => ({
          auth: {
            getUser: async () => ({
              error: null,
              data: { user: { id: ACCOUNT_A, app_metadata: { provider: "email" } } },
            }),
          },
        }),
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    const { POST } = require(routePath);
    const token = jwt({ sub: ACCOUNT_A, amr: [{ method: "password", timestamp: Math.floor(Date.now() / 1000) }] });
    const request = () => new Request("https://app.example/api/account/delete", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        origin: "https://app.example",
      },
      body: JSON.stringify({ confirmation: ACCOUNT_DELETE_CONFIRMATION }),
    });
    const success = await POST(request());
    assert.equal(success.status, 200);
    assert.deepEqual(await success.json(), { ok: true, deleted: true });

    helperResult = { ok: false, rawProviderError: "RAW_PROVIDER_IDENTIFIER" };
    const failure = await POST(request());
    assert.equal(failure.status, 500);
    const body = await failure.json();
    assert.deepEqual(body, {
      ok: false,
      code: "auth_deletion_failed",
      error: "Account deletion did not finish. Please try again.",
    });
    assert.doesNotMatch(JSON.stringify(body), /RAW_PROVIDER_IDENTIFIER/);
  } finally {
    Module._load = originalLoad;
    for (const [key, value] of cached) {
      if (value) require.cache[key] = value;
      else delete require.cache[key];
    }
  }
});

test("client accepts only the exact success and maps fixed safe failures", () => {
  assert.deepEqual(parseAccountDeletionResponse(true, { ok: true, deleted: true }), { ok: true });
  assert.equal(parseAccountDeletionResponse(true, { ok: true }).ok, false);
  assert.equal(parseAccountDeletionResponse(false, { ok: false, code: "recent_authentication_required", error: "RAW" }).message.includes("RAW"), false);
  assert.equal(parseAccountDeletionResponse(false, { ok: false, code: "unknown", error: "RAW_PROVIDER" }).message.includes("RAW_PROVIDER"), false);
});

test("owner cleanup preserves Account B, anonymous data, and global values with one event", () => {
  const storage = memoryStorage();
  let events = 0;
  global.window = { localStorage: storage, dispatchEvent() { events += 1; } };
  assert.equal(writeOwnedStorageValue(MISSION_STATUS_STORAGE_DESCRIPTOR, { anonymous: "started" }, { currentUserId: null }, { storage }).ok, true);
  assert.equal(writeOwnedStorageValue(MISSION_STATUS_STORAGE_DESCRIPTOR, { a: "started" }, { currentUserId: ACCOUNT_A }, { storage }).ok, true);
  assert.equal(writeOwnedStorageValue(MISSION_STATUS_STORAGE_DESCRIPTOR, { b: "started" }, { currentUserId: ACCOUNT_B }, { storage }).ok, true);
  storage.setItem(ONBOARDING_DISMISSED_STORAGE_KEY, "true");
  const result = removeSkillMintOwnerData({ currentUserId: ACCOUNT_A });
  assert.equal(result.failedKeys.length, 0);
  assert.equal(events, 1);
  const raw = storage.getItem(MISSION_STATUS_STORAGE_DESCRIPTOR.key);
  assert.equal(raw.includes(ACCOUNT_A), false);
  assert.equal(raw.includes(ACCOUNT_B), true);
  assert.match(raw, /anonymous/);
  assert.equal(storage.getItem(ONBOARDING_DISMISSED_STORAGE_KEY), "true");
  delete global.window;
});

test("privacy contact is central, syntax-validated, and missing remains a release blocker", () => {
  assert.equal(PRIVACY_CONTACT_ENV, "SKILLMINT_PRIVACY_CONTACT_EMAIL");
  assert.deepEqual(resolvePrivacyContact(""), { status: "missing", email: null, href: null, releaseReady: false });
  assert.equal(resolvePrivacyContact("not-an-email").status, "malformed");
  assert.deepEqual(resolvePrivacyContact("privacy@example.com"), { status: "configured", email: "privacy@example.com", href: "mailto:privacy@example.com", releaseReady: true });
  const example = fs.readFileSync(path.join(repoRoot, ".env.example"), "utf8");
  assert.match(example, /^SKILLMINT_PRIVACY_CONTACT_EMAIL=$/m);
  const privacyPage = fs.readFileSync(path.join(repoRoot, "src/app/privacy/page.tsx"), "utf8");
  assert.match(privacyPage, /getPrivacyContact/);
});

test("npm package boundary keeps the application private and excludes generated or environment artifacts", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"),
  );
  const npmIgnore = fs.readFileSync(path.join(repoRoot, ".npmignore"), "utf8");
  assert.equal(packageJson.private, true);
  for (const pattern of [
    ".env*",
    "node_modules/",
    ".next/",
    "coverage/",
    "test-results/",
    "playwright-report/",
    "traces/",
    "screenshots/",
    "videos/",
  ]) assert.ok(npmIgnore.split(/\r?\n/).includes(pattern));
});

test("live verification commands refuse unsafe and ambiguous execution", () => {
  const runId = "refusal-run-1234";
  const expectedRef = ["llay", "gmfp", "kdax", "khsv", "wrdk"].join("");
  const forbiddenRef = ["iylx", "qtpn", "hgck", "dbom", "fvtz"].join("");
  const projectReferenceSha256 = "ff15e0b7e0699288a6e0d171f6e751cf8ef215e7a3c2980b7d57e4a24ba1229b";
  const preflight = `/tmp/skillmint-block5-refusal-preflight-${process.pid}.json`;
  const bootstrap = `/tmp/skillmint-block5-refusal-bootstrap-${process.pid}.json`;
  const catalog = `/tmp/skillmint-block5-refusal-catalog-${process.pid}.json`;
  const result = `/tmp/skillmint-block5-refusal-result-${process.pid}.json`;
  const state = `/tmp/skillmint-block5-refusal-state-${process.pid}.json`;
  const artifact = (kind, createdAt = new Date().toISOString()) => ({
    version: 2, kind, ok: true, projectReferenceSha256, runId, createdAt,
  });
  fs.writeFileSync(preflight, JSON.stringify(artifact("skillmint-block-5-3-preflight", "2000-01-01T00:00:00.000Z")));
  fs.writeFileSync(bootstrap, JSON.stringify(artifact("skillmint-block-5-3-bootstrap")));
  fs.writeFileSync(catalog, JSON.stringify(artifact("skillmint-block-5-3-catalog-verification")));
  const env = {
    ...process.env,
    SKILLMINT_EXPECTED_SUPABASE_PROJECT_REF: expectedRef,
    SKILLMINT_FORBIDDEN_PRODUCTION_PROJECT_REF: forbiddenRef,
    NEXT_PUBLIC_SUPABASE_URL: `https://${expectedRef}.supabase.co`,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "synthetic-publishable-key",
    SUPABASE_SECRET_KEY: "synthetic-secret-key",
    SUPABASE_DB_URL: `postgresql://postgres.${expectedRef}:synthetic@pooler.example/postgres`,
  };
  const securityBase = [
    "--execute",
    "--confirmation=SKILLMINT BLOCK 5.3 DISPOSABLE SECURITY",
    `--run-id=${runId}`,
    `--marker=skillmint-block-5-3-disposable:${runId}`,
    `--preflight-artifact=${preflight}`,
    `--bootstrap-artifact=${bootstrap}`,
    `--catalog-artifact=${catalog}`,
    `--result=${result}`,
    `--state=${state}`,
  ];

  assertRefusal("scripts/block-5-3-live-preflight.mjs", [], env, "read_only_execution_not_enabled");
  assertRefusal("scripts/block-5-3-live-migration-verify.mjs", [], env, "read_only_execution_not_enabled");
  assertRefusal("scripts/block-5-3-live-security.mjs", [], env, "destructive_execution_not_enabled");
  assertRefusal("scripts/block-5-3-live-security.mjs", ["--execute"], env, "confirmation_mismatch");
  assertRefusal("scripts/block-5-3-live-security.mjs", ["--execute", "--confirmation=WRONG"], env, "confirmation_mismatch");
  assertRefusal("scripts/block-5-3-live-security.mjs", securityBase, { ...env, NEXT_PUBLIC_SUPABASE_URL: "https://other.example.supabase.co" }, "target_mismatch");
  assertRefusal("scripts/block-5-3-live-security.mjs", securityBase, env, "stale_preflight");
  assertRefusal("scripts/block-5-3-live-security.mjs", securityBase.filter((arg) => !arg.startsWith("--marker=")), env, "missing_disposable_marker");
  assertRefusal("scripts/block-5-3-live-security.mjs", securityBase, { ...env, NEXT_PUBLIC_SUPABASE_URL: "not-a-url" }, "malformed_configuration");
  assertRefusal("scripts/block-5-3-live-security.mjs", ["--user-id=11111111-1111-4111-8111-111111111111"], env, "arbitrary_target_rejected");

  const readiness = runScript("scripts/block-5-3-release-readiness.mjs", ["--diagnostic"], {
    ...env,
    SKILLMINT_PRIVACY_CONTACT_EMAIL: "",
  });
  assert.equal(readiness.status, 1);
  const readinessPayload = JSON.parse(readiness.stdout);
  assert.equal(readinessPayload.releaseReady, false);
  assert.ok(readinessPayload.blockers.includes("privacy_contact_missing"));
  assert.equal(
    readinessPayload.blockers.includes(
      "live_migration_and_disposable_account_verification_pending",
    ),
    false,
  );
  for (const blocker of [
    "production_schema_rollout_pending",
    "external_privacy_contact_ownership_unverified",
    "legal_review_unresolved",
    "provider_backup_log_retention_unverified",
    "operational_ownership_unresolved",
  ]) assert.ok(readinessPayload.blockers.includes(blocker));
  for (const secret of [env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, env.SUPABASE_SECRET_KEY]) {
    assert.equal(`${readiness.stdout}${readiness.stderr}`.includes(secret), false);
  }
  fs.rmSync(preflight, { force: true });
  fs.rmSync(bootstrap, { force: true });
  fs.rmSync(catalog, { force: true });
  fs.rmSync(result, { force: true });
  fs.rmSync(state, { force: true });
});

test("live artifacts are hash-only and deterministically reject sensitive evidence", () => {
  const common = fs.readFileSync(
    path.join(repoRoot, "scripts/block-5-3-live-common.mjs"),
    "utf8",
  );
  const liveFiles = [
    "block-5-3-live-preflight.mjs",
    "block-5-3-live-bootstrap.mjs",
    "block-5-3-live-migration-verify.mjs",
    "block-5-3-live-security.mjs",
  ].map((file) => fs.readFileSync(path.join(repoRoot, "scripts", file), "utf8"));

  assert.match(common, /projectReferenceSha256/);
  assert.match(common, /validateSecretFreeArtifact/);
  assert.match(common, /forbidden_artifact_content/);
  for (const source of liveFiles) {
    assert.doesNotMatch(source, /expectedOrigin\s*[,}]/);
    assert.doesNotMatch(source, /expectedOrigin\s*:/);
  }
  assert.doesNotMatch(liveFiles.join("\n"), /writeSecretFreeArtifact\([\s\S]{0,600}\b(?:url|origin|email|password|accessToken|refreshToken|userId)\s*:/i);

  const providerFamilies = [
    "providerResponse",
    "rawProviderResponse",
    "providerPayload",
    "rawProviderPayload",
    "providerError",
    "rawProviderError",
    "providerHeaders",
    "providerBody",
    "providerRequest",
    "rawProviderRequest",
  ];
  for (const key of providerFamilies) {
    const words = key.replace(/([a-z])([A-Z])/g, "$1 $2").split(" ");
    const variants = [
      key,
      words.join("_"),
      words.join("-"),
      words.join(" "),
      words.join("").split("").map((character, index) =>
        index % 2 ? character.toUpperCase() : character.toLowerCase()
      ).join(""),
    ];
    for (const variant of variants) {
      assertArtifactRejected({ [variant]: { status: 400, retryable: false } });
    }
  }
  assertArtifactRejected({ safe: { nested: [{ provider_response: { status: 400 } }] } });
  assertArtifactRejected({ entries: [{ ok: true }, { raw_provider_error: { retryable: true } }] });
  assertArtifactRejected({ providerBody: {}, providerHeaders: {}, providerRequest: {} });
  const secretKeyVariants = [
    "secretKey",
    "secret_key",
    "secret-key",
    "secret key",
    "sEcReT_kEy",
    "clientSecretKey",
    "rawSecretKey",
    "serverSecretKey",
  ];
  const secretKeyValues = ["masked", "", null, 42, true, false];
  for (const key of secretKeyVariants) {
    for (const value of secretKeyValues) assertArtifactRejected({ [key]: value });
  }
  assertArtifactRejected({ safe: { nested: [{ secret_key: "masked" }] } });
  assertArtifactRejected({ entries: [{ ok: true }, { rawSecretKey: null }] });
  assertArtifactRejected(
    { value: "synthetic-secret-value-for-artifact-test" },
    { SUPABASE_SECRET_KEY: "synthetic-secret-value-for-artifact-test" },
  );

  for (const safe of [
    {
      pass: true,
      testCount: 12,
      durationMs: 345,
      stage: "catalog_compare",
      httpStatusClass: "4xx",
      errorClassification: "redacted_provider_failure",
      digest: "abc123",
      maskedIdentifier: "account_***",
    },
    {
      providerResponseCount: 0,
      rawProviderResponseCount: 0,
      providerResponsiveness: "unknown",
      responseSummary: { safe: true },
    },
    {
      secretKeyCount: 0,
      secretKeyStatus: "not_present",
      secretKeyRotationCount: 0,
      providerSecretKeyCount: 0,
      secretKeyboardLayout: "unknown",
      providerStatus: "redacted_failure",
    },
    { checks: [{ pass: true }, { nested: { durationMs: 10, stage: "clean" } }] },
  ]) assertArtifactAccepted(safe);
});

test("deployed catalog verifier compares exact normalized definitions", () => {
  const verifier = fs.readFileSync(
    path.join(repoRoot, "scripts/block-5-3-live-migration-verify.mjs"),
    "utf8",
  );
  assert.match(verifier, /normalizedCatalog/);
  assert.match(verifier, /expectedCatalog/);
  assert.match(verifier, /catalogDigest/);
  assert.match(verifier, /prepare_account_deletion/);
  assert.match(verifier, /is_active_skillmint_user/);
  assert.doesNotMatch(verifier, /owner_policies|using_owner_policies|with_check_owner_policies/);
  assert.doesNotMatch(verifier, /\bqual\s+like\b|\bwith_check\s+like\b/i);
});

test("live runner inventories least privilege, auth, route, stale-token, concurrency, and cleanup cases", () => {
  const runner = fs.readFileSync(
    path.join(repoRoot, "scripts/block-5-3-live-security.mjs"),
    "utf8",
  );
  for (const caseId of [
    "anon_denial",
    "positive_operation_matrix",
    "cross_account_denial",
    "ownership_transfer_denial",
    "production_export_boundary",
    "wrong_password_rejected",
    "refresh_preserves_password_amr",
    "route_safe_failures",
    "stale_token_denial",
    "concurrent_write_containment",
    "disposable_cleanup",
  ]) assert.match(runner, new RegExp(caseId));
  assert.match(runner, /writeRunState/);
  assert.match(runner, /finally/);
  assert.doesNotMatch(runner, /stale-wait-seconds|setTimeout\(resolve, waitSeconds/);
});

test("hard deletion and active-user authorization are explicit", () => {
  const route = fs.readFileSync(
    path.join(repoRoot, "src/app/api/account/delete/route.ts"),
    "utf8",
  );
  const convergence = fs.readFileSync(
    path.join(repoRoot, "src/lib/accountDeletion/authDeletionConvergence.ts"),
    "utf8",
  );
  const sql = fs.readFileSync(
    path.join(repoRoot, "supabase/schema_v4_account_deletion_security.sql"),
    "utf8",
  );
  assert.match(route, /deleteAuthUserWithVerifiedConvergence\(\s*adminClient\.auth\.admin,\s*userData\.user\.id,?\s*\)/);
  assert.match(convergence, /deleteUser\(validatedUserId, false\)/);
  assert.match(sql, /function public\.is_active_skillmint_user\(\)/i);
  assert.match(sql, /deleted_at is null/i);
  assert.equal((sql.match(/public\.is_active_skillmint_user\(\)/gi) ?? []).length >= 12, true);
  assert.match(sql, /revoke all on function public\.set_updated_at\(\)\s+from public, anon, authenticated/i);
});

test("bootstrap is explicit, hash-locked, and uses the pinned development driver", () => {
  const bootstrap = fs.readFileSync(
    path.join(repoRoot, "scripts/block-5-3-live-bootstrap.mjs"),
    "utf8",
  );
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  assert.equal(pkg.devDependencies?.pg, "8.16.3");
  for (const file of [
    "schema_v1.sql",
    "schema_v2_feedback.sql",
    "schema_v3_data_controls.sql",
    "schema_v4_account_deletion_security.sql",
  ]) assert.match(bootstrap, new RegExp(file.replaceAll(".", "\\.")));
  assert.match(bootstrap, /createHash\(["']sha256["']\)/);
  assert.match(bootstrap, /begin[\s\S]*commit/i);
  assert.doesNotMatch(bootstrap, /db push|migration up/i);
});

test("v4 preconditions are unambiguous and bootstrap resumes only a verified applied prefix", () => {
  const sql = fs.readFileSync(
    path.join(repoRoot, "supabase/schema_v4_account_deletion_security.sql"),
    "utf8",
  );
  const bootstrap = fs.readFileSync(
    path.join(repoRoot, "scripts/block-5-3-live-bootstrap.mjs"),
    "utf8",
  );
  assert.match(sql, /and information_schema\.columns\.table_name = 'profiles'/i);
  assert.match(sql, /required_table_name text/i);
  assert.doesNotMatch(sql, /declare\s+table_name text/i);
  assert.match(bootstrap, /resumeAppliedPrefix/);
  assert.match(bootstrap, /applied_prefix_mismatch/);
  assert.doesNotMatch(bootstrap, /prior_run_state_exists/);
});

test("live failure recovery retains only secret-free actionable diagnostics", () => {
  const runner = fs.readFileSync(
    path.join(repoRoot, "scripts/block-5-3-live-security.mjs"),
    "utf8",
  );
  assert.match(runner, /failureStage/);
  assert.match(runner, /failureDigest/);
  assert.match(runner, /caseResults/);
  assert.doesNotMatch(runner, /failureMessage|providerResponse|error\.message\s*[,}]/);
});

test("live export fixtures satisfy the production contract and verify its exact fail-closed code", () => {
  const runner = fs.readFileSync(
    path.join(repoRoot, "scripts/block-5-3-live-security.mjs"),
    "utf8",
  );
  assert.match(runner, /parsed_profile:\s*null/);
  assert.match(runner, /match_result:\s*null/);
  assert.match(runner, /unsupported_data_contract/);
  assert.doesNotMatch(runner, /unsupported_data_present/);
});

const requestedGroup = process.argv.find((value) => value.startsWith("--group="))
  ?.slice("--group=".length);
const selectedTests = requestedGroup === "auth-convergence"
  ? tests.filter(({ name }) =>
    name.startsWith("Auth deletion") ||
    name.startsWith("route preserves exact safe success"))
  : requestedGroup === "recent-auth"
  ? tests.filter(({ name }) => name.startsWith("recent authentication"))
  : requestedGroup === "browser-cleanup"
    ? tests.filter(({ name }) => name.startsWith("owner cleanup"))
    : requestedGroup
      ? []
      : tests;
if (requestedGroup && selectedTests.length === 0) {
  throw new Error(`Unknown or empty Block 5.3 fixture group: ${requestedGroup}`);
}

for (const { name, callback } of selectedTests) {
  try {
    await callback();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

console.log(`PASS ${selectedTests.length} Block 5.3 offline fixture groups`);
console.log("LIMITATIONS static SQL and adapter fixtures do not prove live RLS, migration state, Auth deletion, provider retention, external contact ownership, or production readiness.");

function cleanupSuccess() {
  return {
    ok: true,
    verifiedAbsent: true,
    counts: { profiles: 0, resumeAnalyses: 0, jobMatches: 0, careerSnapshots: 0, betaFeedback: 0 },
  };
}

function cleanupRow() {
  return {
    profiles_deleted: 0,
    resume_analyses_deleted: 0,
    job_matches_deleted: 0,
    career_snapshots_deleted: 0,
    beta_feedback_deleted: 0,
    verified_absent: true,
  };
}

function authBoundary({ deletionError, verifications = [] }) {
  let deleteCalls = 0;
  let lookupCalls = 0;
  const delays = [];
  return {
    auth: {
      async deleteUser() {
        deleteCalls += 1;
        return { error: deletionError };
      },
      async getUserById() {
        const index = Math.min(lookupCalls, Math.max(verifications.length - 1, 0));
        lookupCalls += 1;
        return verifications[index];
      },
    },
    wait: async (delayMs) => { delays.push(delayMs); },
    get deleteCalls() { return deleteCalls; },
    get lookupCalls() { return lookupCalls; },
    delays,
  };
}

function moduleStub(filename, exports) {
  const stubModule = new Module(filename);
  stubModule.filename = filename;
  stubModule.loaded = true;
  stubModule.exports = exports;
  return stubModule;
}

function jwt(payload) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.signature`;
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(String(key), String(value)); },
    removeItem(key) { values.delete(String(key)); },
  };
}

function assertRefusal(script, args, env, code) {
  const result = runScript(script, args, env);
  assert.equal(result.status, 2, `${script} should refuse: ${result.stdout} ${result.stderr}`);
  const payload = JSON.parse(result.stdout);
  assert.deepEqual(payload, { ok: false, refused: true, code });
  for (const secret of [env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, env.SUPABASE_SECRET_KEY]) {
    if (secret) assert.equal(`${result.stdout}${result.stderr}`.includes(secret), false);
  }
}

function runScript(script, args, env) {
  return spawnSync(process.execPath, [path.join(repoRoot, script), ...args], {
    cwd: repoRoot,
    env,
    encoding: "utf8",
    timeout: 10_000,
  });
}

function runArtifactValidator(value, environment = {}) {
  const encoded = Buffer.from(JSON.stringify(value)).toString("base64url");
  const source = [
    "import { validateSecretFreeArtifact } from './scripts/block-5-3-live-common.mjs';",
    "const value = JSON.parse(Buffer.from(process.argv[1], 'base64url').toString('utf8'));",
    "validateSecretFreeArtifact(value);",
    "process.stdout.write('ACCEPTED\\n');",
  ].join(" ");
  return spawnSync(process.execPath, ["--input-type=module", "--eval", source, encoded], {
    cwd: repoRoot,
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "synthetic-publishable-key",
      SUPABASE_SECRET_KEY: "synthetic-secret-key",
      SUPABASE_DB_URL: "postgresql://synthetic:synthetic@pooler.example/postgres",
      ...environment,
    },
    encoding: "utf8",
    timeout: 10_000,
  });
}

function assertArtifactRejected(value, environment) {
  const result = runArtifactValidator(value, environment);
  assert.equal(result.status, 2, `artifact should be rejected: ${result.stdout} ${result.stderr}`);
  assert.deepEqual(JSON.parse(result.stdout), {
    ok: false,
    refused: true,
    code: "forbidden_artifact_content",
  });
}

function assertArtifactAccepted(value) {
  const result = runArtifactValidator(value);
  assert.equal(result.status, 0, `safe artifact should be accepted: ${result.stdout} ${result.stderr}`);
  assert.equal(result.stdout.trim(), "ACCEPTED");
}

function listFiles(root) {
  const output = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) output.push(...listFiles(target));
    else if (/\.(?:ts|tsx)$/.test(entry.name)) output.push(target);
  }
  return output;
}
