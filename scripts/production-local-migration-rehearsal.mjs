import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import process from "node:process";
import pg from "pg";

const { Client } = pg;

export const BASELINE_VERSION = "20260723000200";
export const ORDERED_VERSIONS = [
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
  "20260823001000",
  "20260823001100",
  "20260829001200",
];
export const LOCAL_DATABASE_URL =
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

const V9_VERSION = "20260730000900";
const REQUIRED_CONFIRMATION = "YES_RESET_LOCAL_SKILLMINT_DB";

const compatibleDriftSql = `
create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $function$
begin
  null;
end;
$function$;
alter function public.rls_auto_enable() owner to postgres;
create event trigger ensure_rls
  on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function public.rls_auto_enable();
grant execute on function public.rls_auto_enable()
  to public, anon, authenticated, service_role;
`;

const incompatibleDriftSql = `
create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
volatile
set search_path = pg_catalog
as $function$
begin
  null;
end;
$function$;
alter function public.rls_auto_enable() owner to postgres;
create event trigger ensure_rls
  on ddl_command_end
  when tag in ('CREATE TABLE')
  execute function public.rls_auto_enable();
grant execute on function public.rls_auto_enable()
  to public, anon, authenticated, service_role;
`;

export function buildRehearsalPlan() {
  return [
    {
      scenario: "absent-v9-drift",
      reset: ["db", "reset", "--local", "--no-seed", "--version", BASELINE_VERSION],
      inject: null,
      migrate: ["migration", "up", "--local"],
      expectMigrationSuccess: true,
    },
    {
      scenario: "compatible-v9-drift",
      reset: ["db", "reset", "--local", "--no-seed", "--version", BASELINE_VERSION],
      inject: compatibleDriftSql,
      migrate: ["migration", "up", "--local"],
      expectMigrationSuccess: true,
    },
    {
      scenario: "incompatible-v9-drift",
      reset: ["db", "reset", "--local", "--no-seed", "--version", BASELINE_VERSION],
      inject: incompatibleDriftSql,
      migrate: ["migration", "up", "--local"],
      expectMigrationSuccess: false,
    },
  ];
}

export function validateLocalOnlyPlan(plan) {
  for (const scenario of plan) {
    for (const args of [scenario.reset, scenario.migrate]) {
      assert.ok(args.includes("--local"), `${scenario.scenario} is not local-only`);
      assert.ok(!args.includes("--linked"), `${scenario.scenario} permits linked execution`);
      assert.ok(!args.includes("--db-url"), `${scenario.scenario} permits an arbitrary database URL`);
    }
  }
  return true;
}

function runSupabase(args, { expectSuccess = true } = {}) {
  const result = spawnSync("supabase", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) {
    throw new Error(`supabase_cli_unavailable: ${result.error.message}`);
  }
  if (expectSuccess && result.status !== 0) {
    throw new Error(
      `supabase_failed: supabase ${args.join(" ")}\n${result.stderr || result.stdout}`,
    );
  }
  if (!expectSuccess && result.status === 0) {
    throw new Error(`expected_migration_failure: supabase ${args.join(" ")}`);
  }
  return result;
}

async function withDatabase(callback) {
  const client = new Client({ connectionString: LOCAL_DATABASE_URL });
  await client.connect();
  try {
    return await callback(client);
  } finally {
    await client.end();
  }
}

async function migrationHistory() {
  return withDatabase(async (client) => {
    const result = await client.query(
      "select version from supabase_migrations.schema_migrations order by version",
    );
    return result.rows.map((row) => String(row.version));
  });
}

async function executeSql(sql) {
  await withDatabase((client) => client.query(sql));
}

async function assertBaselineHistory() {
  assert.deepEqual(await migrationHistory(), ORDERED_VERSIONS.slice(0, 2));
}

async function assertCompleteHistory() {
  assert.deepEqual(await migrationHistory(), ORDERED_VERSIONS);
}

async function assertV9AclNormalized() {
  await withDatabase(async (client) => {
    const result = await client.query(`
      select
        has_function_privilege('anon', 'public.rls_auto_enable()', 'EXECUTE') as anon_execute,
        has_function_privilege('authenticated', 'public.rls_auto_enable()', 'EXECUTE') as authenticated_execute,
        has_function_privilege('service_role', 'public.rls_auto_enable()', 'EXECUTE') as service_role_execute,
        (
          select count(*)::integer
          from pg_catalog.pg_event_trigger event_trigger_row
          join pg_catalog.pg_proc function_row
            on function_row.oid = event_trigger_row.evtfoid
          join pg_catalog.pg_namespace namespace_row
            on namespace_row.oid = function_row.pronamespace
          where namespace_row.nspname = 'public'
            and function_row.proname = 'rls_auto_enable'
            and event_trigger_row.evtname = 'ensure_rls'
        ) as trigger_count
    `);
    assert.deepEqual(result.rows[0], {
      anon_execute: false,
      authenticated_execute: false,
      service_role_execute: false,
      trigger_count: 1,
    });
  });
}

async function assertIncompatibleDriftFailedClosed() {
  const history = await migrationHistory();
  assert.ok(!history.includes(V9_VERSION), "V9 was recorded despite incompatible drift");
  for (const version of ORDERED_VERSIONS.slice(10)) {
    assert.ok(!history.includes(version), `${version} ran after the V9 fail-closed boundary`);
  }
}

export async function runRehearsal() {
  if (process.env.SKILLMINT_ALLOW_LOCAL_DB_RESET !== REQUIRED_CONFIRMATION) {
    throw new Error(
      `local_reset_not_authorized: set SKILLMINT_ALLOW_LOCAL_DB_RESET=${REQUIRED_CONFIRMATION}`,
    );
  }

  const versionResult = runSupabase(["--version"]);
  const cliVersion = versionResult.stdout.trim();
  if (cliVersion !== "2.109.1") {
    throw new Error(`unexpected_supabase_cli_version: ${cliVersion || "unknown"}`);
  }

  const plan = buildRehearsalPlan();
  validateLocalOnlyPlan(plan);

  for (const scenario of plan) {
    process.stdout.write(`REHEARSAL_SCENARIO=${scenario.scenario}\n`);
    runSupabase(scenario.reset);
    await assertBaselineHistory();
    if (scenario.inject) {
      await executeSql(scenario.inject);
    }
    runSupabase(scenario.migrate, {
      expectSuccess: scenario.expectMigrationSuccess,
    });
    if (scenario.expectMigrationSuccess) {
      await assertCompleteHistory();
      if (scenario.scenario === "compatible-v9-drift") {
        await assertV9AclNormalized();
      }
    } else {
      await assertIncompatibleDriftFailedClosed();
    }
  }

  runSupabase(["db", "reset", "--local", "--no-seed"]);
  await assertCompleteHistory();
  process.stdout.write("PRODUCTION_LOCAL_MIGRATION_REHEARSAL=PASS\n");
}

function printPlan() {
  const plan = buildRehearsalPlan();
  validateLocalOnlyPlan(plan);
  process.stdout.write(
    `${JSON.stringify({
      destructive_target: "local SkillMint Supabase database only",
      confirmation_env: `SKILLMINT_ALLOW_LOCAL_DB_RESET=${REQUIRED_CONFIRMATION}`,
      cli_version: "2.109.1",
      database: LOCAL_DATABASE_URL.replace("postgres:postgres@", "***@"),
      baseline_version: BASELINE_VERSION,
      final_version: ORDERED_VERSIONS.at(-1),
      scenarios: plan.map(({ scenario, reset, migrate, expectMigrationSuccess }) => ({
        scenario,
        reset: `supabase ${reset.join(" ")}`,
        migrate: `supabase ${migrate.join(" ")}`,
        expectMigrationSuccess,
      })),
    }, null, 2)}\n`,
  );
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  if (process.argv.includes("--execute")) {
    runRehearsal().catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
  } else {
    printPlan();
  }
}
