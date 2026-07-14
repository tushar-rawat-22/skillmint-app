import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertSafeArtifactPath,
  assertSafeRunId,
  createDatabaseClient,
  fail,
  parseArgs,
  readFreshArtifact,
  refuse,
  requireString,
  resolveSafeTarget,
  validateSecretFreeArtifact,
  writeRunState,
  writeSecretFreeArtifact,
} from "./block-5-3-live-common.mjs";

const BOOTSTRAP_CONFIRMATION = "SKILLMINT BLOCK 5 EMPTY TEST PROJECT BOOTSTRAP";
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = Object.freeze([
  Object.freeze({
    identifier: "schema_v1.sql",
    sha256: "af7a9a7314b699d1e38fe6998bc382489a33532315f188d77d0f8f739b5357e5",
    beforeTableCount: 0,
    afterTableCount: 4,
    selfTransactional: false,
  }),
  Object.freeze({
    identifier: "schema_v2_feedback.sql",
    sha256: "213fae232e106ff82cd6e300fc27507d77a612dd8c5f128bd91601f114f33701",
    beforeTableCount: 4,
    afterTableCount: 5,
    selfTransactional: false,
  }),
  Object.freeze({
    identifier: "schema_v3_data_controls.sql",
    sha256: "a130483eac5ffafdbf293b3938e18dabea57a0e36c7d8617fb8bc448ae042959",
    beforeTableCount: 5,
    afterTableCount: 5,
    selfTransactional: false,
  }),
  Object.freeze({
    identifier: "schema_v4_account_deletion_security.sql",
    sha256: "3ff175e86b79516ee896578d01b6b64fb747aa2b371187fa63f8225c09807587",
    beforeTableCount: 5,
    afterTableCount: 5,
    selfTransactional: true,
  }),
]);

const args = parseArgs(process.argv.slice(2));
if (args.execute !== true) refuse("schema_execution_not_enabled");
if (args.confirmation !== BOOTSTRAP_CONFIRMATION) refuse("confirmation_mismatch");
const target = resolveSafeTarget();
const runId = assertSafeRunId(requireString(args, "run-id"));
const statePath = assertSafeArtifactPath(requireString(args, "state"));
const resultPath = assertSafeArtifactPath(requireString(args, "result"));
readFreshArtifact(requireString(args, "preflight-artifact"), {
  kind: "skillmint-block-5-3-preflight",
  projectReferenceSha256: target.projectReferenceSha256,
  runId,
});
let priorState = null;
if (fs.existsSync(statePath)) {
  try {
    priorState = JSON.parse(fs.readFileSync(statePath, "utf8"));
    validateSecretFreeArtifact(priorState);
  } catch {
    refuse("unsafe_prior_run_state");
  }
}

const resumeIndex = resumeAppliedPrefix(priorState);
const appliedSql = manifest.slice(0, resumeIndex).map(({ identifier, sha256 }) => ({
  identifier,
  sha256,
}));
const state = (currentStage, cleanupStatus = "not_started") => ({
  version: 2,
  kind: "skillmint-block-5-run-state",
  ok: true,
  projectReferenceSha256: target.projectReferenceSha256,
  runId,
  createdAt: new Date().toISOString(),
  currentStage,
  appliedSql: [...appliedSql],
  resourceIdentifierHashes: [],
  cleanupStatus,
});
writeRunState(statePath, state("bootstrap_started"));

const database = createDatabaseClient(target, {
  applicationName: "skillmint_block5_schema_bootstrap",
  statementTimeout: 60_000,
  queryTimeout: 90_000,
});
try {
  await database.connect();
  if (resumeIndex > 0) {
    await assertTableCount(database, manifest[resumeIndex - 1].afterTableCount);
    if (resumeIndex >= 3) await assertV3State(database);
    if (resumeIndex >= 4) await assertV4State(database);
  }
  for (const entry of manifest.slice(resumeIndex)) {
    const file = path.join(repoRoot, "supabase", entry.identifier);
    const bytes = fs.readFileSync(file);
    const digest = crypto.createHash("sha256").update(bytes).digest("hex");
    if (digest !== entry.sha256) throw new Error("schema_hash_mismatch");
    await assertTableCount(database, entry.beforeTableCount);

    try {
      if (!entry.selfTransactional) await database.query("begin");
      await database.query(bytes.toString("utf8"));
      if (!entry.selfTransactional) await database.query("commit");
    } catch (error) {
      await database.query("rollback").catch(() => {});
      throw error;
    }

    await assertTableCount(database, entry.afterTableCount);
    if (entry.identifier === "schema_v3_data_controls.sql") {
      await assertV3State(database);
    }
    if (entry.identifier === "schema_v4_account_deletion_security.sql") {
      await assertV4State(database);
    }
    const postDigest = crypto.createHash("sha256")
      .update(fs.readFileSync(file))
      .digest("hex");
    if (postDigest !== entry.sha256) throw new Error("applied_schema_bytes_changed");
    appliedSql.push({ identifier: entry.identifier, sha256: entry.sha256 });
    writeRunState(statePath, state(`applied_${entry.identifier}`));
  }

  writeRunState(statePath, state("bootstrap_complete"));
  writeSecretFreeArtifact(resultPath, {
    version: 2,
    kind: "skillmint-block-5-3-bootstrap",
    ok: true,
    projectReferenceSha256: target.projectReferenceSha256,
    runId,
    createdAt: new Date().toISOString(),
    appliedSql,
    checks: {
      orderedFilesApplied: manifest.length,
      hashLocked: true,
      previousStateVerifiedBeforeEveryFile: true,
      postStateVerifiedAfterEveryFile: true,
      appliedBytesUnchanged: true,
      forwardFixCount: 0,
    },
  });
  process.stdout.write(`${JSON.stringify({
    ok: true,
    appliedFileCount: manifest.length,
    forwardFixCount: 0,
  })}\n`);
} catch {
  writeRunState(statePath, state("bootstrap_failed", "recovery_required"));
  fail("schema_bootstrap_failed");
} finally {
  await database.end().catch(() => {});
}

async function assertTableCount(databaseClient, expected) {
  const result = await databaseClient.query(`
    select count(*)::integer as count
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r','p')
      and c.relname in ('profiles','resume_analyses','job_matches','career_snapshots','beta_feedback')
  `);
  if (Number(result.rows[0]?.count) !== expected) {
    throw new Error("unexpected_bootstrap_state");
  }
}

async function assertV3State(databaseClient) {
  const result = await databaseClient.query(`
    select
      to_regprocedure('public.delete_current_user_saved_reports()') is not null as saved_report_rpc,
      (select confdeltype = 'c'
       from pg_catalog.pg_constraint
       where conrelid = 'public.beta_feedback'::regclass
         and confrelid = 'auth.users'::regclass
         and contype = 'f') as feedback_cascade
  `);
  if (
    result.rows[0]?.saved_report_rpc !== true ||
    result.rows[0]?.feedback_cascade !== true
  ) throw new Error("unexpected_v3_state");
}

async function assertV4State(databaseClient) {
  const result = await databaseClient.query(`
    select
      to_regprocedure('public.is_active_skillmint_user()') is not null as active_guard,
      to_regprocedure('public.prepare_account_deletion(uuid)') is not null as prepare_rpc,
      to_regprocedure('public.prepare_current_account_deletion()') is null as obsolete_rpc_absent
  `);
  if (
    result.rows[0]?.active_guard !== true ||
    result.rows[0]?.prepare_rpc !== true ||
    result.rows[0]?.obsolete_rpc_absent !== true
  ) throw new Error("unexpected_v4_state");
}

function resumeAppliedPrefix(stateValue) {
  if (stateValue === null) return 0;
  if (
    !stateValue ||
    typeof stateValue !== "object" ||
    stateValue.projectReferenceSha256 !== target.projectReferenceSha256 ||
    stateValue.runId !== runId ||
    !Array.isArray(stateValue.appliedSql) ||
    stateValue.appliedSql.length > manifest.length ||
    !["recovery_required", "not_started"].includes(stateValue.cleanupStatus)
  ) refuse("applied_prefix_mismatch");
  for (let index = 0; index < stateValue.appliedSql.length; index += 1) {
    const actual = stateValue.appliedSql[index];
    const expected = manifest[index];
    if (
      !actual ||
      actual.identifier !== expected.identifier ||
      actual.sha256 !== expected.sha256
    ) refuse("applied_prefix_mismatch");
  }
  return stateValue.appliedSql.length;
}
