import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import pg from "pg";

const { Client } = pg;

const EXPECTED_PROJECT_REF = "iylxqtpnhgckdbomfvtz";
const EXPECTED_CLI_VERSION = "2.109.1";
const RESTORE_CONFIRMATION = "YES_RESTORE_SKILLMINT_BACKUP_TO_ISOLATED_LOCAL_DB";
const LOCAL_DATABASE = Object.freeze({
  host: "127.0.0.1",
  port: 54322,
  database: "postgres",
  user: "postgres",
  password: "postgres",
});
const EXPECTED_MIGRATIONS = Object.freeze([
  "20260723000100",
  "20260723000200",
  "20260723000300",
  "20260723000400",
  "20260723000500",
  "20260723000600",
  "20260723000700",
  "20260727000750",
  "20260727000800",
  "20260730000900",
]);
const EXPECTED_PUBLIC_TABLES = Object.freeze([
  "active_resume_selections",
  "analytics_events",
  "beta_feedback",
  "career_snapshots",
  "job_matches",
  "profiles",
  "resume_analyses",
]);
const BACKUP_FILES = Object.freeze([
  "roles.sql",
  "schema.sql",
  "data.sql",
  "history_schema.sql",
  "history_data.sql",
]);

function fail(message) {
  throw new Error(message);
}

function redact(text, values = []) {
  let output = String(text ?? "");
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) {
      output = output.split(value).join("[REDACTED]");
    }
  }
  return output;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? process.cwd(),
    encoding: "utf8",
    env: options.env ?? process.env,
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
    timeout: options.timeout ?? 180000,
  });
  const redactions = options.redact ?? [];
  if (result.error) fail(`${command}_unavailable:${redact(result.error.message, redactions)}`);
  if (result.status !== 0) {
    const detail = redact(result.stderr || result.stdout || "command failed", redactions).trim();
    fail(`${command}_failed:${detail.slice(0, 1200)}`);
  }
  return result;
}

function repoRoot() {
  return path.resolve(process.cwd());
}

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function assertOutsideRepository(candidate) {
  const resolved = path.resolve(candidate);
  if (!path.isAbsolute(candidate)) fail("backup_directory_must_be_absolute");
  if (isInside(repoRoot(), resolved)) fail("backup_directory_must_be_outside_repository");
  const probe = spawnSync("git", ["-C", resolved, "rev-parse", "--show-toplevel"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (probe.status === 0) fail("backup_directory_must_not_be_inside_any_git_worktree");
  return resolved;
}

function ensurePrivateDirectory(candidate, { create = false } = {}) {
  const resolved = assertOutsideRepository(candidate);
  if (create) fs.mkdirSync(resolved, { recursive: true, mode: 0o700 });
  const stat = fs.statSync(resolved);
  if (!stat.isDirectory()) fail("backup_path_is_not_directory");
  fs.chmodSync(resolved, 0o700);
  return resolved;
}

function assertProductionUrl(raw) {
  if (!raw) fail("SKILLMINT_PRODUCTION_DB_URL_is_required");
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    fail("production_database_url_invalid");
  }
  if (!new Set(["postgres:", "postgresql:"]).has(parsed.protocol)) {
    fail("production_database_url_protocol_invalid");
  }
  const hostMatches = parsed.hostname === `db.${EXPECTED_PROJECT_REF}.supabase.co`;
  const userMatches = decodeURIComponent(parsed.username).includes(`postgres.${EXPECTED_PROJECT_REF}`);
  if (!hostMatches && !userMatches) fail("production_database_url_project_ref_mismatch");
  if (!parsed.password) fail("production_database_url_password_missing");
  return raw;
}

function assertPinnedCli() {
  const result = run("supabase", ["--version"]);
  assert.equal(result.stdout.trim(), EXPECTED_CLI_VERSION, "unexpected Supabase CLI version");
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function fileEvidence(directory) {
  return Object.fromEntries(BACKUP_FILES.map((name) => {
    const filePath = path.join(directory, name);
    const stat = fs.statSync(filePath);
    assert.ok(stat.isFile() && stat.size > 0, `${name}_missing_or_empty`);
    return [name, { bytes: stat.size, sha256: sha256(filePath) }];
  }));
}

async function sourceEvidence(connectionString) {
  const client = new Client({ connectionString, connectionTimeoutMillis: 15000 });
  await client.connect();
  try {
    await client.query("begin read only");
    const history = await client.query(
      "select version::text from supabase_migrations.schema_migrations order by version",
    );
    const tables = await client.query(
      "select tablename from pg_tables where schemaname = 'public' order by tablename",
    );
    const rowCounts = {};
    for (const table of EXPECTED_PUBLIC_TABLES) {
      const result = await client.query(`select count(*)::bigint::text as count from public.${table}`);
      rowCounts[`public.${table}`] = result.rows[0].count;
    }
    const authUsers = await client.query("select count(*)::bigint::text as count from auth.users");
    rowCounts["auth.users"] = authUsers.rows[0].count;
    await client.query("rollback");
    return {
      migrations: history.rows.map((row) => row.version),
      public_tables: tables.rows.map((row) => row.tablename),
      row_counts: rowCounts,
    };
  } finally {
    await client.end();
  }
}

function assertExpectedSource(evidence) {
  assert.deepEqual(evidence.migrations, EXPECTED_MIGRATIONS, "production_migration_history_drift");
  assert.deepEqual(evidence.public_tables, EXPECTED_PUBLIC_TABLES, "production_public_table_catalog_drift");
}

function dump(connectionString, directory) {
  const common = ["db", "dump", "--db-url", connectionString];
  const options = { redact: [connectionString] };
  run("supabase", [...common, "-f", path.join(directory, "roles.sql"), "--role-only"], options);
  run("supabase", [...common, "-f", path.join(directory, "schema.sql")], options);
  run("supabase", [
    ...common,
    "-f", path.join(directory, "data.sql"),
    "--use-copy",
    "--data-only",
    "-x", "storage.buckets_vectors",
    "-x", "storage.vector_indexes",
  ], options);
  run("supabase", [
    ...common,
    "-f", path.join(directory, "history_schema.sql"),
    "--schema", "supabase_migrations",
  ], options);
  run("supabase", [
    ...common,
    "-f", path.join(directory, "history_data.sql"),
    "--use-copy",
    "--data-only",
    "--schema", "supabase_migrations",
  ], options);
  for (const name of BACKUP_FILES) fs.chmodSync(path.join(directory, name), 0o600);
}

async function capture(directoryArg) {
  const directory = ensurePrivateDirectory(directoryArg, { create: true });
  if (fs.readdirSync(directory).length !== 0) fail("backup_directory_must_start_empty");
  const connectionString = assertProductionUrl(process.env.SKILLMINT_PRODUCTION_DB_URL);
  assertPinnedCli();

  const before = await sourceEvidence(connectionString);
  assertExpectedSource(before);
  dump(connectionString, directory);
  const after = await sourceEvidence(connectionString);
  assertExpectedSource(after);
  assert.deepEqual(after, before, "production_changed_during_logical_backup_capture");

  const manifest = {
    format: 1,
    project_ref: EXPECTED_PROJECT_REF,
    captured_at: new Date().toISOString(),
    supabase_cli: EXPECTED_CLI_VERSION,
    source: after,
    files: fileEvidence(directory),
  };
  const manifestPath = path.join(directory, "recovery-manifest.json");
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  process.stdout.write(`SKILLMINT_PRODUCTION_BACKUP_CAPTURE=PASS\nBACKUP_DIRECTORY=${directory}\n`);
}

function loadManifest(directory) {
  const manifestPath = path.join(directory, "recovery-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.project_ref, EXPECTED_PROJECT_REF, "backup_project_ref_mismatch");
  assert.equal(manifest.supabase_cli, EXPECTED_CLI_VERSION, "backup_cli_version_mismatch");
  assert.deepEqual(manifest.source?.migrations, EXPECTED_MIGRATIONS, "backup_migration_history_mismatch");
  assert.deepEqual(manifest.source?.public_tables, EXPECTED_PUBLIC_TABLES, "backup_public_tables_mismatch");
  const currentFiles = fileEvidence(directory);
  assert.deepEqual(currentFiles, manifest.files, "backup_file_integrity_mismatch");
  return manifest;
}

async function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    const finish = (value) => {
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(500);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

function localPsqlArgs() {
  return [
    "--host", LOCAL_DATABASE.host,
    "--port", String(LOCAL_DATABASE.port),
    "--username", LOCAL_DATABASE.user,
    "--dbname", LOCAL_DATABASE.database,
  ];
}

function localPsqlEnv() {
  return { ...process.env, PGPASSWORD: LOCAL_DATABASE.password };
}

function restoreSql(directory) {
  run("psql", [
    ...localPsqlArgs(),
    "--single-transaction",
    "--variable", "ON_ERROR_STOP=1",
    "--file", path.join(directory, "roles.sql"),
    "--file", path.join(directory, "schema.sql"),
    "--command", "SET session_replication_role = replica",
    "--file", path.join(directory, "data.sql"),
    "--file", path.join(directory, "history_schema.sql"),
    "--file", path.join(directory, "history_data.sql"),
  ], { env: localPsqlEnv(), timeout: 300000 });
}

async function localEvidence() {
  const client = new Client({ ...LOCAL_DATABASE, connectionTimeoutMillis: 10000 });
  await client.connect();
  try {
    const history = await client.query(
      "select version::text from supabase_migrations.schema_migrations order by version",
    );
    const tables = await client.query(
      "select tablename from pg_tables where schemaname = 'public' order by tablename",
    );
    const rowCounts = {};
    for (const table of EXPECTED_PUBLIC_TABLES) {
      const result = await client.query(`select count(*)::bigint::text as count from public.${table}`);
      rowCounts[`public.${table}`] = result.rows[0].count;
    }
    const authUsers = await client.query("select count(*)::bigint::text as count from auth.users");
    rowCounts["auth.users"] = authUsers.rows[0].count;
    const functionContract = await client.query(`
      select p.prosecdef,
             r.rolname as owner,
             coalesce(array_to_string(p.proconfig, ','), '') as config
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      join pg_roles r on r.oid = p.proowner
      where n.nspname = 'public' and p.proname = 'rls_auto_enable'
    `);
    const triggerContract = await client.query(`
      select evtname, evtevent, evtenabled,
             array_to_string(evttags, ',') as tags
      from pg_event_trigger
      where evtname = 'ensure_rls'
    `);
    const rls = await client.query(`
      select relname, relrowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
      order by relname
    `);
    return {
      migrations: history.rows.map((row) => row.version),
      public_tables: tables.rows.map((row) => row.tablename),
      row_counts: rowCounts,
      function_contract: functionContract.rows,
      trigger_contract: triggerContract.rows,
      rls: rls.rows,
    };
  } finally {
    await client.end();
  }
}

async function restore(directoryArg) {
  if (process.env.SKILLMINT_ALLOW_LOCAL_RECOVERY_RESTORE !== RESTORE_CONFIRMATION) {
    fail(`local_restore_not_authorized:set_SKILLMINT_ALLOW_LOCAL_RECOVERY_RESTORE=${RESTORE_CONFIRMATION}`);
  }
  const directory = ensurePrivateDirectory(directoryArg);
  const manifest = loadManifest(directory);
  assertPinnedCli();
  run("psql", ["--version"]);
  if (await isPortOpen(LOCAL_DATABASE.port)) fail("local_postgres_port_54322_already_in_use");

  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), "skillmint-recovery-drill-"));
  let started = false;
  try {
    run("supabase", ["init"], { cwd: workdir });
    run("supabase", ["start"], { cwd: workdir, timeout: 300000 });
    started = true;
    restoreSql(directory);
    const restored = await localEvidence();
    assert.deepEqual(restored.migrations, EXPECTED_MIGRATIONS, "restored_migration_history_mismatch");
    assert.deepEqual(restored.public_tables, EXPECTED_PUBLIC_TABLES, "restored_public_table_catalog_mismatch");
    assert.deepEqual(restored.row_counts, manifest.source.row_counts, "restored_row_count_mismatch");
    assert.equal(restored.function_contract.length, 1, "restored_rls_auto_enable_function_missing");
    assert.equal(restored.function_contract[0].owner, "postgres", "restored_rls_auto_enable_owner_mismatch");
    assert.equal(restored.function_contract[0].prosecdef, true, "restored_rls_auto_enable_security_definer_mismatch");
    assert.match(
      restored.function_contract[0].config,
      /search_path=pg_catalog/,
      "restored_rls_auto_enable_search_path_mismatch",
    );
    assert.equal(restored.trigger_contract.length, 1, "restored_ensure_rls_trigger_missing");
    assert.equal(restored.trigger_contract[0].evtevent, "ddl_command_end", "restored_event_trigger_event_mismatch");
    assert.equal(restored.trigger_contract[0].evtenabled, "O", "restored_event_trigger_disabled");
    assert.ok(restored.rls.every((row) => row.relrowsecurity === true), "restored_public_table_without_rls");
    process.stdout.write(`SKILLMINT_PRODUCTION_RECOVERY_DRILL=PASS\nSOURCE_CAPTURED_AT=${manifest.captured_at}\n`);
  } finally {
    if (started) {
      spawnSync("supabase", ["stop", "--no-backup"], {
        cwd: workdir,
        stdio: "ignore",
        timeout: 120000,
      });
    }
    fs.rmSync(workdir, { recursive: true, force: true });
  }
}

function selfTest() {
  assert.equal(EXPECTED_MIGRATIONS.at(-1), "20260730000900");
  assert.equal(EXPECTED_PUBLIC_TABLES.length, 7);
  assert.throws(() => assertProductionUrl("not-a-database-url"), /database_url_invalid/);
  assert.throws(() => assertOutsideRepository(path.join(repoRoot(), "recovery-private")), /outside_repository/);
  const outside = path.join(os.tmpdir(), `skillmint-recovery-self-test-${process.pid}-${Date.now()}`);
  fs.mkdirSync(outside, { mode: 0o700 });
  try {
    assert.equal(ensurePrivateDirectory(outside), outside);
  } finally {
    fs.rmSync(outside, { recursive: true, force: true });
  }
  process.stdout.write("PRODUCTION_LOGICAL_RECOVERY_DRILL_SELF_TEST=PASS\n");
}

async function main() {
  const [mode, directory] = process.argv.slice(2);
  if (mode === "--self-test") return selfTest();
  if (mode === "--capture" && directory) return capture(directory);
  if (mode === "--restore" && directory) return restore(directory);
  fail(
    "usage: node scripts/production-logical-recovery-drill.mjs --self-test | --capture /absolute/private/dir | --restore /absolute/private/dir",
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
