import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import process from "node:process";
import pg from "pg";

const { Client } = pg;

const REQUIRED_CONFIRMATION = "YES_RESET_LOCAL_SKILLMINT_DB";
const LOCK_TIMEOUT_MS = 1500;
const STATEMENT_TIMEOUT_MS = 15000;
const MIGRATION_PROCESS_TIMEOUT_MS = 120000;
const V2_VERSION = "20260723000200";
const V5_VERSION = "20260723000500";
const V7_VERSION = "20260723000700";
const FINAL_VERSION = "20260829001200";

const DATABASE = Object.freeze({
  host: "127.0.0.1",
  port: 54322,
  database: "postgres",
  user: "postgres",
  password: "postgres",
});

function assertAuthorizedLocalTarget() {
  if (process.env.SKILLMINT_ALLOW_LOCAL_DB_RESET !== REQUIRED_CONFIRMATION) {
    throw new Error(
      `local_reset_not_authorized: set SKILLMINT_ALLOW_LOCAL_DB_RESET=${REQUIRED_CONFIRMATION}`,
    );
  }
  assert.deepEqual(
    {
      host: DATABASE.host,
      port: DATABASE.port,
      database: DATABASE.database,
      user: DATABASE.user,
    },
    {
      host: "127.0.0.1",
      port: 54322,
      database: "postgres",
      user: "postgres",
    },
    "lock rehearsal target changed",
  );
}

function runSupabase(args, { expectSuccess = true, env = process.env, timeout = MIGRATION_PROCESS_TIMEOUT_MS } = {}) {
  assert.ok(args.includes("--local") || args[0] === "--version", "Supabase command lost local-only boundary");
  assert.ok(!args.includes("--linked"), "linked execution is forbidden");
  assert.ok(!args.includes("--db-url"), "arbitrary database URLs are forbidden");

  const startedAt = performance.now();
  const result = spawnSync("supabase", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env,
    timeout,
  });
  const elapsedMs = Math.round(performance.now() - startedAt);

  if (result.error && result.error.code === "ETIMEDOUT") {
    throw new Error(`supabase_process_timeout:${elapsedMs}ms: supabase ${args.join(" ")}`);
  }
  if (result.error) {
    throw new Error(`supabase_cli_unavailable: ${result.error.message}`);
  }
  if (expectSuccess && result.status !== 0) {
    throw new Error(`supabase_failed:${elapsedMs}ms: ${result.stderr || result.stdout}`);
  }
  if (!expectSuccess && result.status === 0) {
    throw new Error(`expected_lock_failure_missing:${elapsedMs}ms`);
  }
  return { result, elapsedMs };
}

async function withClient(callback) {
  const client = new Client(DATABASE);
  await client.connect();
  try {
    return await callback(client);
  } finally {
    await client.end();
  }
}

async function migrationHistory() {
  return withClient(async (client) => {
    const result = await client.query(
      "select version from supabase_migrations.schema_migrations order by version",
    );
    return result.rows.map((row) => String(row.version));
  });
}

function migrationEnv() {
  return {
    ...process.env,
    PGOPTIONS: `-c lock_timeout=${LOCK_TIMEOUT_MS}ms -c statement_timeout=${STATEMENT_TIMEOUT_MS}ms`,
  };
}

async function assertAnalyticsTablePresent() {
  await withClient(async (client) => {
    const result = await client.query(
      "select to_regclass('public.analytics_events') is not null as present",
    );
    assert.equal(result.rows[0]?.present, true, "V5 analytics_events table is missing");
  });
}

async function runTimedCleanMigration() {
  runSupabase(["db", "reset", "--local", "--no-seed", "--version", V2_VERSION]);
  const { elapsedMs } = runSupabase(["migration", "up", "--local"], {
    env: migrationEnv(),
  });
  const history = await migrationHistory();
  assert.equal(history.at(-1), FINAL_VERSION, "clean migration rehearsal did not reach V12");
  process.stdout.write(`CLEAN_V2_TO_V12_MIGRATION_MS=${elapsedMs}\n`);
}

async function runLockContentionMigration() {
  runSupabase(["db", "reset", "--local", "--no-seed", "--version", V5_VERSION]);
  await assertAnalyticsTablePresent();

  const holder = new Client(DATABASE);
  await holder.connect();
  try {
    await holder.query("begin");
    await holder.query("lock table public.analytics_events in access exclusive mode");

    const { elapsedMs } = runSupabase(["migration", "up", "--local"], {
      expectSuccess: false,
      env: migrationEnv(),
      timeout: STATEMENT_TIMEOUT_MS + 5000,
    });

    assert.ok(
      elapsedMs >= LOCK_TIMEOUT_MS - 500 && elapsedMs < STATEMENT_TIMEOUT_MS + 5000,
      `lock failure timing is outside the bounded window: ${elapsedMs}ms`,
    );

    const history = await migrationHistory();
    assert.ok(!history.includes(V7_VERSION), "V7 was recorded despite the blocked table lock");
    const v7Index = history.indexOf(V7_VERSION);
    assert.equal(v7Index, -1, "lock-blocked migration crossed the V7 boundary");
    process.stdout.write(`LOCK_CONTENTION_FAILURE_MS=${elapsedMs}\n`);
  } finally {
    try {
      await holder.query("rollback");
    } finally {
      await holder.end();
    }
  }

  const { elapsedMs } = runSupabase(["migration", "up", "--local"], {
    env: migrationEnv(),
  });
  const history = await migrationHistory();
  assert.equal(history.at(-1), FINAL_VERSION, "migration did not recover to V12 after lock release");
  process.stdout.write(`POST_LOCK_RECOVERY_MIGRATION_MS=${elapsedMs}\n`);
}

async function main() {
  assertAuthorizedLocalTarget();

  const version = runSupabase(["--version"]);
  assert.equal(version.result.stdout.trim(), "2.109.1", "unexpected Supabase CLI version");

  await runTimedCleanMigration();
  await runLockContentionMigration();

  process.stdout.write("PRODUCTION_MIGRATION_LOCK_TIMING_REHEARSAL=PASS\n");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
