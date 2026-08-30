import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";

import pg from "pg";

const { Client } = pg;

const args = new Set(process.argv.slice(2));
const execute = args.has("--execute");
const dryRun = args.has("--dry-run") || !execute;

const queries = [
  {
    name: "migration_history",
    sql: `
      select version
      from supabase_migrations.schema_migrations
      order by version
    `,
  },
  {
    name: "table_grants",
    sql: `
      select
        n.nspname as table_schema,
        c.relname as table_name,
        pg_get_userbyid(c.relowner) as owner_name,
        c.relacl::text[] as explicit_acl,
        pg_get_userbyid(a.grantor) as grantor,
        case
          when a.grantee = 0 then 'PUBLIC'
          else pg_get_userbyid(a.grantee)
        end as grantee,
        a.privilege_type,
        a.is_grantable
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      left join lateral aclexplode(
        coalesce(c.relacl, acldefault('r', c.relowner))
      ) a on true
      where n.nspname = 'public'
        and c.relkind in ('r', 'p')
      order by c.relname, grantee, a.privilege_type, grantor
    `,
  },
  {
    name: "rls_auto_enable_function",
    sql: `
      select
        n.nspname as schema_name,
        p.proname as function_name,
        pg_get_function_identity_arguments(p.oid) as identity_arguments,
        pg_get_function_result(p.oid) as result_type,
        l.lanname as language_name,
        r.rolname as owner_name,
        p.prosecdef as security_definer,
        p.provolatile as volatility,
        p.proconfig as runtime_configuration,
        p.proacl as acl,
        pg_get_functiondef(p.oid) as definition
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      join pg_language l on l.oid = p.prolang
      join pg_roles r on r.oid = p.proowner
      where n.nspname = 'public'
        and p.proname = 'rls_auto_enable'
      order by pg_get_function_identity_arguments(p.oid)
    `,
  },
  {
    name: "rls_auto_enable_event_triggers",
    sql: `
      select
        et.evtname as trigger_name,
        et.evtevent as event_name,
        et.evtenabled as enabled_state,
        et.evttags as tags,
        r.rolname as owner_name,
        n.nspname as function_schema,
        p.proname as function_name,
        pg_get_function_identity_arguments(p.oid) as identity_arguments
      from pg_event_trigger et
      join pg_roles r on r.oid = et.evtowner
      join pg_proc p on p.oid = et.evtfoid
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'rls_auto_enable'
      order by et.evtname
    `,
  },
];

if (dryRun) {
  process.stdout.write(`${JSON.stringify({
    mode: "dry-run",
    transaction: "READ ONLY",
    query_names: queries.map(({ name }) => name),
  })}\n`);
  process.exit(0);
}

const connectionString = process.env.SKILLMINT_PRODUCTION_DATABASE_URL;
if (!connectionString) {
  throw new Error("SKILLMINT_PRODUCTION_DATABASE_URL is required with --execute");
}

const client = new Client({ connectionString });
const startedAt = new Date().toISOString();
const output = {
  generated_at: startedAt,
  mode: "read-only-production-inventory",
  user_table_rows_read: false,
  results: {},
};

try {
  await client.connect();
  await client.query("begin read only");
  await client.query("set local statement_timeout = '15s'");
  await client.query("set local lock_timeout = '2s'");

  for (const { name, sql } of queries) {
    const result = await client.query(sql);
    output.results[name] = result.rows;
  }

  await client.query("rollback");
} catch (error) {
  try {
    await client.query("rollback");
  } catch {
    // Ignore rollback failure after a connection/query failure.
  }
  throw error;
} finally {
  await client.end().catch(() => {});
}

const outputPath = join(
  tmpdir(),
  `skillmint-production-readonly-inventory-${Date.now()}.json`,
);
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, {
  encoding: "utf8",
  mode: 0o600,
  flag: "wx",
});

process.stdout.write(`Inventory written locally: ${outputPath}\n`);
process.stdout.write("Do not commit, upload, email, or paste the inventory file.\n");
