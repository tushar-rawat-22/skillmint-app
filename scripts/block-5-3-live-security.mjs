import crypto from "node:crypto";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

import {
  ACCOUNT_TABLES,
  OPERATION_MATRIX,
  SECURITY_CONFIRMATION,
  assertSafeArtifactPath,
  assertSafeRunId,
  buildSanitizedChildEnv,
  fail,
  parseArgs,
  readFreshArtifact,
  refuse,
  rejectArbitraryTargets,
  requireString,
  resolveSafeTarget,
  sha256,
  validateSecretFreeArtifact,
  writeRunState,
  writeSecretFreeArtifact,
} from "./block-5-3-live-common.mjs";

const APP_ORIGIN = "http://127.0.0.1:3100";
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const ts = require("typescript");
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveSkillMintAlias(request, parent, isMain, options) {
  return request.startsWith("@/")
    ? originalResolveFilename.call(
      this,
      path.join(repoRoot, "src", request.slice(2)),
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
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};
const { buildAccountDataExportWithAdapter } = require(
  path.join(repoRoot, "src/modules/data-controls/services/accountDataRepository.ts"),
);

const args = parseArgs(process.argv.slice(2));
rejectArbitraryTargets(args);
if (args.execute !== true) refuse("destructive_execution_not_enabled");
if (args.confirmation !== SECURITY_CONFIRMATION) refuse("confirmation_mismatch");
const target = resolveSafeTarget();
const runId = assertSafeRunId(requireString(args, "run-id"));
const expectedMarker = `skillmint-block-5-3-disposable:${runId}`;
if (args.marker !== expectedMarker) refuse("missing_disposable_marker");
const resultArtifact = assertSafeArtifactPath(requireString(args, "result"));
const statePath = assertSafeArtifactPath(requireString(args, "state"));
for (const [argument, kind] of [
  ["preflight-artifact", "skillmint-block-5-3-preflight"],
  ["bootstrap-artifact", "skillmint-block-5-3-bootstrap"],
  ["catalog-artifact", "skillmint-block-5-3-catalog-verification"],
]) {
  readFreshArtifact(requireString(args, argument), {
    kind,
    projectReferenceSha256: target.projectReferenceSha256,
    runId,
  });
}

let priorState;
try {
  priorState = JSON.parse(fs.readFileSync(statePath, "utf8"));
  validateSecretFreeArtifact(priorState);
} catch {
  refuse("missing_or_unsafe_run_state");
}
if (
  priorState.projectReferenceSha256 !== target.projectReferenceSha256 ||
  priorState.runId !== runId ||
  !Array.isArray(priorState.appliedSql)
) refuse("run_state_mismatch");

const admin = createClient(target.projectOrigin, target.secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const created = [];
const resourceIdentifierHashes = [];
const appliedSql = priorState.appliedSql;
let server = null;
let completed = false;
let resultCode = "live_security_failed";
let currentStage = "live_recovery";
let failureStage = null;
let failureDigest = null;
const caseResults = Object.fromEntries([
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
].map((name) => [name, "PENDING"]));

try {
  await recoverMarkedUsers();
  writeState("live_starting", "in_progress");

  const passwordA = crypto.randomBytes(32).toString("base64url");
  const passwordB = crypto.randomBytes(32).toString("base64url");
  const emailA = `skillmint-${runId}-a@example.com`;
  const emailB = `skillmint-${runId}-b@example.com`;
  const accountA = await createDisposable(emailA, passwordA, "a");
  const accountB = await createDisposable(emailB, passwordB, "b");
  writeState("disposable_accounts_created", "in_progress");

  const signedA = await signInDisposable(emailA, passwordA);
  const signedB = await signInDisposable(emailB, passwordB);
  const seededA = await seedBrowserWritableTables(signedA.client, accountA.id, "a");
  const seededB = await seedBrowserWritableTables(signedB.client, accountB.id, "b");
  await seedCareerSnapshot(accountB.id, "b");

  await assertAnonDenied(accountA.id);
  pass("anon_denial");
  await assertCrossAccountIsolation(signedA.client, signedB.client, accountA.id, accountB.id, seededA, seededB);
  pass("cross_account_denial");
  pass("ownership_transfer_denial");

  await assertProductionExportBoundary(signedA.client, accountA.id, accountB.id);
  await seedCareerSnapshot(accountA.id, "a");
  await assertUnsupportedExportFailsClosed(signedA.client, accountA.id);
  pass("production_export_boundary");

  await assertPositiveAndForbiddenOperationMatrix(signedA.client, accountA.id, seededA);
  pass("positive_operation_matrix");
  await assertPasswordAndRefreshSemantics(emailA, passwordA, accountA.id, signedA);
  pass("wrong_password_rejected");
  pass("refresh_preserves_password_amr");

  const childEnv = buildSanitizedChildEnv(target, {
    NODE_ENV: "development",
    NEXT_PUBLIC_APP_URL: APP_ORIGIN,
    PORT: "3100",
  });
  if (resolveSafeTarget(childEnv).projectReferenceSha256 !== target.projectReferenceSha256) {
    throw new Error("child_target_mismatch");
  }
  server = spawn(
    "npm",
    ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", "3100"],
    { cwd: repoRoot, env: childEnv, stdio: "ignore" },
  );
  await waitForLocalServer(server);
  writeState("local_route_ready", "in_progress");

  const freshA = await signInDisposable(emailA, passwordA);
  await assertRouteSafeFailures(freshA.accessToken);
  pass("route_safe_failures");

  const staleAccessToken = freshA.accessToken;
  const staleRefreshToken = freshA.refreshToken;
  const staleClient = createTokenClient(staleAccessToken);
  const writes = Array.from({ length: 12 }, (_, index) =>
    staleClient.from("job_matches").insert({
      user_id: accountA.id,
      job_title: `Concurrent ${index}`,
      company_name: "Synthetic",
      job_description: "Bounded concurrent deletion probe",
      match_result: {},
      improvement_plan: {},
      rewrite_plan: {},
      roadmap: {},
    }).select("id")
  );
  const deletionRequests = [
    callDeletionRoute(staleAccessToken, { confirmation: "DELETE MY ACCOUNT" }),
    callDeletionRoute(staleAccessToken, { confirmation: "DELETE MY ACCOUNT" }),
  ];
  const [, routeResults] = await Promise.all([
    Promise.allSettled(writes),
    Promise.all(deletionRequests),
  ]);
  if (!routeResults.some((result) => result.status === 200 && result.ok)) {
    throw new Error("confirmed_deletion_missing");
  }
  if (!routeResults.every(isSafeDuplicateRouteResult)) {
    throw new Error("unsafe_duplicate_route_result");
  }

  await assertAccountAbsent(accountA.id);
  await assertAccountPresent(accountB.id, seededB);
  await assertPostDeletionAuth(emailA, passwordA, staleRefreshToken, emailB, passwordB, accountB.id);
  await assertStaleTokenDenied(staleAccessToken, accountA.id);
  await assertAccountAbsent(accountA.id);
  pass("stale_token_denial");
  pass("concurrent_write_containment");
  writeState("account_a_deleted_and_verified", "in_progress");

  const savedReports = await signedB.client.rpc("delete_current_user_saved_reports");
  if (savedReports.error) throw new Error("authenticated_saved_report_rpc_failed");
  await guardedDeleteMarkedUser(accountB.id);
  await assertAccountAbsent(accountB.id);
  await assertNoDisposableResources();
  pass("disposable_cleanup");

  completed = true;
  resultCode = "passed";
  currentStage = "clean";
  writeState("clean", "clean");
  writeSecretFreeArtifact(resultArtifact, {
    version: 2,
    kind: "skillmint-block-5-3-live-security-result",
    ok: true,
    projectReferenceSha256: target.projectReferenceSha256,
    runId,
    createdAt: new Date().toISOString(),
    caseResults,
    checks: {
      disposableAccountsCreatedByRun: 2,
      accountTablesCovered: ACCOUNT_TABLES.length,
      operationMatrixTables: Object.keys(OPERATION_MATRIX).length,
      anonDenied: true,
      crossAccountDenied: true,
      ownershipTransferDenied: true,
      productionExportVerified: true,
      unsupportedExportFailedClosed: true,
      wrongPasswordRejected: true,
      refreshNotNewPasswordEvent: true,
      hardAuthDeletionVerified: true,
      staleAccessDenied: true,
      staleRefreshDenied: true,
      concurrentWritesAbsentAfterSuccess: true,
      otherAccountPreserved: true,
      storageDiscovery: "VERIFIED_NOT_APPLICABLE_FOR_CURRENT_PRODUCT",
      routeBodyExcludesPasswordAndAccountIdentity: true,
      disposableCleanupComplete: true,
    },
  });
  process.stdout.write(`${JSON.stringify({
    ok: true,
    resultWritten: true,
    runId,
    cleanupStatus: "clean",
  })}\n`);
} catch (error) {
  failureStage = currentStage;
  failureDigest = sha256(
    typeof error?.message === "string" ? error.message : "unknown_live_failure",
  );
  resultCode = "live_security_failed";
} finally {
  if (server) {
    server.kill("SIGTERM");
    await waitForExit(server, 5_000);
  }
  if (!completed) {
    const cleanupComplete = await guardedEmergencyCleanup();
    currentStage = cleanupComplete ? "failed_but_clean" : "cleanup_incomplete";
    writeState(currentStage, cleanupComplete ? "clean" : "recovery_required");
    if (!cleanupComplete) resultCode = "incomplete_disposable_cleanup";
  }
}

if (!completed) fail(resultCode);

async function createDisposable(email, password, label) {
  const response = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      skillmint_disposable_marker: expectedMarker,
      skillmint_run_id: runId,
      skillmint_fixture_label: label,
    },
  });
  const user = response.data.user;
  if (user) {
    created.push(user.id);
    resourceIdentifierHashes.push(sha256(user.id));
  }
  if (
    response.error ||
    !user ||
    user.user_metadata?.skillmint_disposable_marker !== expectedMarker
  ) throw new Error("disposable_creation_failed");
  return user;
}

async function signInDisposable(email, password) {
  const client = createClient(target.projectOrigin, target.publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const response = await client.auth.signInWithPassword({ email, password });
  if (response.error || !response.data.session || !response.data.user) {
    throw new Error("disposable_signin_failed");
  }
  return {
    client,
    accessToken: response.data.session.access_token,
    refreshToken: response.data.session.refresh_token,
    user: response.data.user,
  };
}

function createTokenClient(accessToken) {
  return createClient(target.projectOrigin, target.publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

async function seedBrowserWritableTables(client, userId, label) {
  await must(client.from("profiles").insert({
    id: userId,
    full_name: `Synthetic ${label}`,
    email: null,
    career_goal: "Synthetic verification",
    target_role: "Synthetic role",
  }));
  const resume = await must(client.from("resume_analyses").insert({
    user_id: userId,
    file_name: `synthetic-${label}.txt`,
    file_type: "text/plain",
    extracted_text: "Synthetic disposable resume",
    parsed_profile: null,
    user_profile: null,
  }).select("id").single());
  const job = await must(client.from("job_matches").insert({
    user_id: userId,
    job_title: "Synthetic role",
    company_name: "Synthetic company",
    job_description: "Synthetic disposable job description",
    match_result: null,
    improvement_plan: null,
    rewrite_plan: null,
    roadmap: null,
  }).select("id").single());
  const feedback = await must(client.from("beta_feedback").insert({
    user_id: userId,
    feedback_type: "other",
    sentiment: "neutral",
    message: "Synthetic disposable feedback",
    page_path: "/settings/data",
  }).select("id").single());
  return { resumeId: resume.id, jobId: job.id, feedbackId: feedback.id };
}

async function seedCareerSnapshot(userId, label) {
  await must(admin.from("career_snapshots").insert({
    user_id: userId,
    career_iq: { fixture: label },
    recruiter_confidence: {},
    salary_projection: {},
    role_matches: {},
  }));
}

async function assertAnonDenied(ownerId) {
  const anon = createClient(target.projectOrigin, target.publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  for (const table of ACCOUNT_TABLES) {
    await mustDeniedOrEmpty(anon.from(table).select("id").limit(1));
    await mustDeniedOrEmpty(anon.from(table).insert(insertFor(table, ownerId, "anon")).select("id"));
    await mustDeniedOrEmpty(anon.from(table).update(updateFor(table, ownerId)).eq(ownerColumn(table), ownerId).select("id"));
    await mustDeniedOrEmpty(anon.from(table).delete().eq(ownerColumn(table), ownerId).select("id"));
  }
  await mustDenied(anon.rpc("delete_current_user_saved_reports"));
  await mustDenied(anon.rpc("prepare_account_deletion", { target_user_id: ownerId }));
}

async function assertPositiveAndForbiddenOperationMatrix(client, ownerId, seeded) {
  await mustOne(client.from("profiles").select("id").eq("id", ownerId));
  await mustOne(client.from("profiles").update({ career_goal: "Updated" }).eq("id", ownerId).select("id"));
  await mustDeniedOrEmpty(client.from("profiles").delete().eq("id", ownerId).select("id"));

  await mustOne(client.from("resume_analyses").select("id").eq("id", seeded.resumeId));
  const resume = await must(client.from("resume_analyses").insert(insertFor("resume_analyses", ownerId, "positive")).select("id").single());
  await mustDeniedOrEmpty(client.from("resume_analyses").update({ file_name: "forbidden" }).eq("id", resume.id).select("id"));
  await mustOne(client.from("resume_analyses").delete().eq("id", resume.id).select("id"));

  await mustOne(client.from("job_matches").select("id").eq("id", seeded.jobId));
  const job = await must(client.from("job_matches").insert(insertFor("job_matches", ownerId, "positive")).select("id").single());
  await mustOne(client.from("job_matches").update({ roadmap: { verified: true } }).eq("id", job.id).select("id"));
  await mustOne(client.from("job_matches").delete().eq("id", job.id).select("id"));

  await mustOne(client.from("career_snapshots").select("id").eq("user_id", ownerId));
  await mustDeniedOrEmpty(client.from("career_snapshots").insert(insertFor("career_snapshots", ownerId, "forbidden")).select("id"));
  await mustDeniedOrEmpty(client.from("career_snapshots").update({ career_iq: {} }).eq("user_id", ownerId).select("id"));
  await mustDeniedOrEmpty(client.from("career_snapshots").delete().eq("user_id", ownerId).select("id"));

  await mustOne(client.from("beta_feedback").select("id").eq("id", seeded.feedbackId));
  await must(client.from("beta_feedback").insert(insertFor("beta_feedback", ownerId, "positive")).select("id").single());
  await mustDeniedOrEmpty(client.from("beta_feedback").update({ status: "forbidden" }).eq("id", seeded.feedbackId).select("id"));
  await mustDeniedOrEmpty(client.from("beta_feedback").delete().eq("id", seeded.feedbackId).select("id"));

  await mustDenied(client.rpc("prepare_account_deletion", { target_user_id: ownerId }));
}

async function assertCrossAccountIsolation(clientA, clientB, aId, bId, seededA, seededB) {
  await assertOneWayIsolation(clientA, aId, bId, seededA, seededB);
  await assertOneWayIsolation(clientB, bId, aId, seededB, seededA);
}

async function assertOneWayIsolation(client, ownId, otherId, own, other) {
  for (const table of ACCOUNT_TABLES) {
    await mustDeniedOrEmpty(
      client.from(table).select("id").eq(ownerColumn(table), otherId),
    );
  }
  await mustDeniedOrEmpty(client.from("profiles").upsert(insertFor("profiles", otherId, "cross")).select("id"));
  for (const table of ["resume_analyses", "job_matches", "beta_feedback"]) {
    await mustDeniedOrEmpty(client.from(table).insert(insertFor(table, otherId, "cross")).select("id"));
  }
  await mustDeniedOrEmpty(client.from("profiles").update({ career_goal: "forbidden" }).eq("id", otherId).select("id"));
  await mustDeniedOrEmpty(client.from("job_matches").update({ roadmap: { forbidden: true } }).eq("id", other.jobId).select("id"));
  await mustDeniedOrEmpty(client.from("resume_analyses").delete().eq("id", other.resumeId).select("id"));
  await mustDeniedOrEmpty(client.from("job_matches").delete().eq("id", other.jobId).select("id"));
  await mustDeniedOrEmpty(client.from("profiles").update({ id: otherId }).eq("id", ownId).select("id"));
  await mustDeniedOrEmpty(client.from("job_matches").update({ user_id: otherId }).eq("id", own.jobId).select("id"));
}

async function assertProductionExportBoundary(client, aId, bId) {
  const result = await buildAccountDataExportWithAdapter(exportAdapter(client), new Date().toISOString(), {
    expectedUserId: aId,
  });
  if (!result.ok) throw new Error("production_export_failed");
  const payload = JSON.parse(result.data.json);
  const serialized = JSON.stringify(payload);
  if (
    serialized.includes(aId) || serialized.includes(bId) ||
    payload.accountScope !== "current_authenticated_account" ||
    payload.data.profiles.length !== 1 ||
    payload.data.resume_analyses.length < 1 ||
    payload.data.job_matches.length < 1 ||
    payload.data.beta_feedback.length < 1 ||
    payload.data.career_snapshots.length !== 0
  ) throw new Error("production_export_scope_failed");
}

async function assertUnsupportedExportFailsClosed(client, ownerId) {
  const result = await buildAccountDataExportWithAdapter(exportAdapter(client), new Date().toISOString(), {
    expectedUserId: ownerId,
  });
  if (result.ok || result.error?.code !== "unsupported_data_contract") {
    throw new Error("unsupported_export_did_not_fail_closed");
  }
}

function exportAdapter(client) {
  return {
    async getAuthenticatedUserId() {
      const { data, error } = await client.auth.getUser();
      return { data: data.user?.id ?? null, error };
    },
    async getExactCount(input) {
      const { count, error } = await client.from(input.tableName)
        .select("id", { count: "exact", head: true })
        .eq(input.ownerColumn, input.expectedUserId);
      return { data: count, error };
    },
    async getProfileRows(input) {
      const { data, error } = await client.from("profiles")
        .select(input.selectedColumns).eq("id", input.expectedUserId).limit(input.limit);
      return { data, error };
    },
    async getKeysetPage(input) {
      let query = client.from(input.tableName).select(input.selectedColumns)
        .eq(input.ownerColumn, input.expectedUserId).order("id", { ascending: true })
        .limit(input.limit);
      if (input.cursor) query = query.gt("id", input.cursor);
      const { data, error } = await query;
      return { data, error };
    },
  };
}

async function assertPasswordAndRefreshSemantics(email, password, userId, signed) {
  const wrong = createClient(target.projectOrigin, target.publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const rejected = await wrong.auth.signInWithPassword({ email, password: `${password}-wrong` });
  if (!rejected.error || rejected.data.session) throw new Error("wrong_password_accepted");

  const before = passwordAmrTimestamp(decodeJwt(signed.accessToken));
  if (!Number.isInteger(before)) throw new Error("password_amr_missing");
  const refreshed = await signed.client.auth.refreshSession({ refresh_token: signed.refreshToken });
  if (
    refreshed.error || !refreshed.data.session ||
    refreshed.data.user?.id !== userId
  ) throw new Error("session_refresh_failed");
  const after = passwordAmrTimestamp(decodeJwt(refreshed.data.session.access_token));
  if (after !== before) throw new Error("refresh_fabricated_password_event");
}

async function assertRouteSafeFailures(accessToken) {
  const wrongConfirmation = await callDeletionRoute(accessToken, { confirmation: "WRONG" });
  if (wrongConfirmation.status !== 400 || wrongConfirmation.code !== "invalid_request") {
    throw new Error("wrong_confirmation_not_rejected");
  }
  const malformed = await rawDeletionRoute(accessToken, "{", "application/json", APP_ORIGIN);
  if (malformed.status !== 400 || malformed.code !== "invalid_request") {
    throw new Error("malformed_body_not_rejected");
  }
  const wrongMedia = await rawDeletionRoute(accessToken, "{}", "text/plain", APP_ORIGIN);
  if (wrongMedia.status !== 415 || wrongMedia.code !== "unsupported_media_type") {
    throw new Error("media_type_not_rejected");
  }
  const wrongOrigin = await rawDeletionRoute(accessToken, "{}", "application/json", "https://invalid.example");
  if (wrongOrigin.status !== 403 || wrongOrigin.code !== "invalid_origin") {
    throw new Error("origin_not_rejected");
  }
  const invalidEvidence = await rawDeletionRoute("invalid-token", JSON.stringify({ confirmation: "DELETE MY ACCOUNT" }), "application/json", APP_ORIGIN);
  if (invalidEvidence.status !== 401 || invalidEvidence.code !== "not_authenticated") {
    throw new Error("invalid_auth_evidence_not_rejected");
  }
}

async function assertPostDeletionAuth(emailA, passwordA, refreshTokenA, emailB, passwordB, bId) {
  const authA = createClient(target.projectOrigin, target.publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const passwordResult = await authA.auth.signInWithPassword({ email: emailA, password: passwordA });
  if (!passwordResult.error || passwordResult.data.session) throw new Error("deleted_password_auth_succeeded");
  const refreshResult = await authA.auth.refreshSession({ refresh_token: refreshTokenA });
  if (!refreshResult.error || refreshResult.data.session) throw new Error("deleted_refresh_succeeded");
  const b = await signInDisposable(emailB, passwordB);
  if (b.user.id !== bId) throw new Error("other_account_auth_changed");
}

async function assertStaleTokenDenied(accessToken, ownerId) {
  const stale = createTokenClient(accessToken);
  for (const table of ACCOUNT_TABLES) {
    await mustDeniedOrEmpty(stale.from(table).select("id").eq(ownerColumn(table), ownerId));
  }
  for (const table of ["profiles", "resume_analyses", "job_matches", "beta_feedback"]) {
    await mustDeniedOrEmpty(stale.from(table).insert(insertFor(table, ownerId, "stale")).select("id"));
  }
  await mustDeniedOrEmpty(stale.from("profiles").update({ career_goal: "stale" }).eq("id", ownerId).select("id"));
  await mustDeniedOrEmpty(stale.from("job_matches").update({ roadmap: { stale: true } }).eq("user_id", ownerId).select("id"));
  await mustDeniedOrEmpty(stale.from("resume_analyses").delete().eq("user_id", ownerId).select("id"));
  await mustDenied(stale.rpc("delete_current_user_saved_reports"));
  await mustDenied(stale.rpc("prepare_account_deletion", { target_user_id: ownerId }));
}

async function callDeletionRoute(accessToken, body) {
  return rawDeletionRoute(
    accessToken,
    JSON.stringify(body),
    "application/json",
    APP_ORIGIN,
  );
}

async function rawDeletionRoute(accessToken, body, contentType, origin) {
  const response = await fetch(`${APP_ORIGIN}/api/account/delete`, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      Authorization: `Bearer ${accessToken}`,
      Origin: origin,
    },
    body,
  });
  let payload = {};
  try { payload = await response.json(); } catch { /* fixed safe shape below */ }
  return {
    status: response.status,
    ok: payload?.ok === true && payload?.deleted === true,
    code: typeof payload?.code === "string" ? payload.code : null,
    fixedShape: isFixedRoutePayload(payload),
  };
}

function isFixedRoutePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  const keys = Object.keys(payload).sort().join(",");
  return keys === "deleted,ok" || keys === "code,error,ok";
}

function isSafeDuplicateRouteResult(result) {
  if (!result.fixedShape) return false;
  if (result.status === 200) return result.ok;
  return [401, 500, 503].includes(result.status) && typeof result.code === "string";
}

async function assertAccountAbsent(userId) {
  for (const table of ACCOUNT_TABLES) {
    const { count, error } = await admin.from(table)
      .select("id", { count: "exact", head: true })
      .eq(ownerColumn(table), userId);
    if (error || count !== 0) throw new Error("deleted_rows_remain");
  }
  const user = await admin.auth.admin.getUserById(userId);
  if (user.data.user || !user.error || Number(user.error.status) !== 404) {
    throw new Error("deleted_auth_user_remains");
  }
}

async function assertAccountPresent(userId, seeded) {
  const profile = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();
  const resume = await admin.from("resume_analyses").select("id").eq("id", seeded.resumeId).maybeSingle();
  const auth = await admin.auth.admin.getUserById(userId);
  if (profile.error || resume.error || !profile.data || !resume.data || auth.error || !auth.data.user) {
    throw new Error("other_account_damaged");
  }
}

async function recoverMarkedUsers() {
  const users = await listAllUsers();
  const marked = users.filter((user) =>
    user.user_metadata?.skillmint_disposable_marker === expectedMarker &&
    user.user_metadata?.skillmint_run_id === runId
  );
  for (const user of marked) await guardedDeleteMarkedUser(user.id);
  if ((await listAllUsers()).some((user) =>
    user.user_metadata?.skillmint_disposable_marker === expectedMarker
  )) throw new Error("prior_run_recovery_failed");
}

async function guardedDeleteMarkedUser(userId) {
  const lookup = await admin.auth.admin.getUserById(userId);
  if (lookup.error && Number(lookup.error.status) === 404) return;
  if (
    lookup.error ||
    !lookup.data.user ||
    lookup.data.user.user_metadata?.skillmint_disposable_marker !== expectedMarker ||
    lookup.data.user.user_metadata?.skillmint_run_id !== runId
  ) throw new Error("cleanup_ownership_mismatch");
  const prepared = await admin.rpc("prepare_account_deletion", { target_user_id: userId });
  if (prepared.error) throw new Error("cleanup_preparation_failed");
  const removed = await admin.auth.admin.deleteUser(userId, false);
  if (removed.error) throw new Error("cleanup_auth_failed");
}

async function guardedEmergencyCleanup() {
  try {
    const users = await listAllUsers();
    for (const user of users) {
      if (
        user.user_metadata?.skillmint_disposable_marker === expectedMarker &&
        user.user_metadata?.skillmint_run_id === runId
      ) await guardedDeleteMarkedUser(user.id);
    }
    await assertNoDisposableResources();
    return true;
  } catch {
    return false;
  }
}

async function assertNoDisposableResources() {
  const users = await listAllUsers();
  if (users.some((user) => user.user_metadata?.skillmint_disposable_marker === expectedMarker)) {
    throw new Error("disposable_auth_remains");
  }
  for (const userId of created) {
    for (const table of ACCOUNT_TABLES) {
      const { count, error } = await admin.from(table)
        .select("id", { count: "exact", head: true })
        .eq(ownerColumn(table), userId);
      if (error || count !== 0) throw new Error("disposable_data_remains");
    }
  }
}

async function listAllUsers() {
  const users = [];
  for (let page = 1; page <= 10; page += 1) {
    const response = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (response.error || !Array.isArray(response.data.users)) {
      throw new Error("auth_inventory_failed");
    }
    users.push(...response.data.users);
    if (response.data.users.length < 100) return users;
  }
  throw new Error("auth_inventory_unbounded");
}

function insertFor(table, ownerId, label) {
  if (table === "profiles") return {
    id: ownerId, full_name: `Synthetic ${label}`, email: null,
    career_goal: "Synthetic", target_role: "Synthetic",
  };
  if (table === "resume_analyses") return {
    user_id: ownerId, file_name: `${label}.txt`, file_type: "text/plain",
    extracted_text: "Synthetic", parsed_profile: null, user_profile: null,
  };
  if (table === "job_matches") return {
    user_id: ownerId, job_title: "Synthetic", company_name: "Synthetic",
    job_description: "Synthetic job description", match_result: null,
    improvement_plan: null, rewrite_plan: null, roadmap: null,
  };
  if (table === "career_snapshots") return {
    user_id: ownerId, career_iq: {}, recruiter_confidence: {},
    salary_projection: {}, role_matches: {},
  };
  return {
    user_id: ownerId, feedback_type: "other", sentiment: "neutral",
    message: `Synthetic ${label} feedback`, page_path: "/settings/data",
  };
}

function updateFor(table, ownerId) {
  if (table === "profiles") return { career_goal: "forbidden" };
  if (table === "resume_analyses") return { file_name: "forbidden" };
  if (table === "job_matches") return { roadmap: { forbidden: true } };
  if (table === "career_snapshots") return { career_iq: { forbidden: true } };
  return { status: `forbidden-${ownerId.slice(0, 1)}` };
}

function ownerColumn(table) {
  return table === "profiles" ? "id" : "user_id";
}

async function must(query) {
  const response = await query;
  if (response.error) throw new Error("provider_operation_failed");
  return response.data;
}

async function mustOne(query) {
  const data = await must(query);
  if (!Array.isArray(data) || data.length !== 1) throw new Error("positive_operation_failed");
  return data[0];
}

async function mustDenied(query) {
  const response = await query;
  if (!response.error) throw new Error("forbidden_operation_succeeded");
}

async function mustDeniedOrEmpty(query) {
  const response = await query;
  if (response.error) return;
  if (Array.isArray(response.data) && response.data.length === 0) return;
  throw new Error("forbidden_operation_succeeded");
}

function decodeJwt(token) {
  try {
    const parts = token.split(".");
    return parts.length === 3
      ? JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"))
      : null;
  } catch {
    return null;
  }
}

function passwordAmrTimestamp(claims) {
  if (!Array.isArray(claims?.amr)) return null;
  const timestamps = claims.amr
    .filter((entry) => entry?.method === "password" && Number.isInteger(entry.timestamp))
    .map((entry) => entry.timestamp);
  return timestamps.length ? Math.max(...timestamps) : null;
}

async function waitForLocalServer(child) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error("local_server_exited");
    try {
      const response = await fetch(`${APP_ORIGIN}/api/health/config`, { cache: "no-store" });
      const payload = await response.json();
      if (response.ok && payload?.supabaseConfigured === true) return;
    } catch { /* not ready */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("local_server_timeout");
}

async function waitForExit(child, timeout) {
  if (child.exitCode !== null) return;
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, timeout)),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

function pass(name) {
  caseResults[name] = "PASS";
  currentStage = name;
  writeState(name, "in_progress");
}

function writeState(stage, cleanupStatus) {
  currentStage = stage;
  writeRunState(statePath, {
    version: 2,
    kind: "skillmint-block-5-run-state",
    ok: true,
    projectReferenceSha256: target.projectReferenceSha256,
    runId,
    createdAt: new Date().toISOString(),
    currentStage,
    appliedSql,
    resourceIdentifierHashes: [...resourceIdentifierHashes],
    cleanupStatus,
    caseResults,
    ...(failureStage ? { failureStage, failureDigest } : {}),
  });
}
