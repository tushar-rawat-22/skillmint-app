import { createClient } from "@supabase/supabase-js";

import {
  ACCOUNT_TABLES,
  assertSafeRunId,
  createDatabaseClient,
  fail,
  parseArgs,
  refuse,
  requireString,
  resolveSafeTarget,
  writeSecretFreeArtifact,
} from "./block-5-3-live-common.mjs";

const args = parseArgs(process.argv.slice(2));
if (args["execute-read-only"] !== true) refuse("read_only_execution_not_enabled");
const target = resolveSafeTarget();
const runId = assertSafeRunId(requireString(args, "run-id"));
const artifact = requireString(args, "artifact");
const admin = createClient(target.projectOrigin, target.secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let database;
try {
  const settings = await fetch(new URL("/auth/v1/settings", target.projectOrigin), {
    method: "GET",
    headers: { apikey: target.publishableKey },
    cache: "no-store",
  });
  await settings.arrayBuffer();
  if (!settings.ok) fail("read_only_preflight_failed");

  const buckets = await fetch(new URL("/storage/v1/bucket", target.projectOrigin), {
    method: "GET",
    headers: {
      apikey: target.secretKey,
      Authorization: `Bearer ${target.secretKey}`,
    },
    cache: "no-store",
  });
  const bucketRows = await buckets.json();
  if (!buckets.ok || !Array.isArray(bucketRows)) fail("read_only_preflight_failed");

  const users = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (users.error || !Array.isArray(users.data.users)) fail("read_only_preflight_failed");

  database = createDatabaseClient(target, {
    applicationName: "skillmint_block5_cleanliness_gate",
  });
  await database.connect();
  await database.query("begin read only");
  const identity = await database.query(
    "select current_database() is not null as identity_ok, current_setting('transaction_read_only') = 'on' as read_only",
  );
  const catalog = await database.query(`
    select
      coalesce((select json_agg(c.relname order by c.relname)
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind in ('r','p')), '[]'::json) as public_tables,
      (select count(*)::integer from auth.users) as auth_users,
      (select count(*)::integer from storage.objects) as storage_objects,
      to_regclass('supabase_migrations.schema_migrations') is not null as has_migration_table
  `);
  const migrationRows = catalog.rows[0]?.has_migration_table
    ? Number((await database.query(
      "select count(*)::integer as count from supabase_migrations.schema_migrations",
    )).rows[0]?.count)
    : 0;
  await database.query("rollback");

  const row = catalog.rows[0];
  const publicTables = Array.isArray(row?.public_tables) ? row.public_tables : null;
  const clean =
    identity.rows[0]?.identity_ok === true &&
    identity.rows[0]?.read_only === true &&
    publicTables !== null &&
    publicTables.length === 0 &&
    Number(row.auth_users) === 0 &&
    users.data.users.length === 0 &&
    bucketRows.length === 0 &&
    Number(row.storage_objects) === 0 &&
    migrationRows === 0;
  if (!clean) fail("isolated_project_not_clean");

  writeSecretFreeArtifact(artifact, {
    version: 2,
    kind: "skillmint-block-5-3-preflight",
    ok: true,
    projectReferenceSha256: target.projectReferenceSha256,
    runId,
    createdAt: new Date().toISOString(),
    checks: {
      targetMatched: true,
      productionBlocked: true,
      authSettingsReachable: true,
      databaseAuthenticated: true,
      databaseIdentityConsistent: true,
      transactionReadOnly: true,
      authUserCount: 0,
      publicApplicationTableCount: 0,
      storageBucketCount: 0,
      storageObjectCount: 0,
      migrationStateCount: 0,
      expectedAccountTableCount: ACCOUNT_TABLES.length,
      mutationPerformed: false,
    },
  });
  process.stdout.write(`${JSON.stringify({
    ok: true,
    artifactWritten: true,
    clean: true,
    mutationPerformed: false,
  })}\n`);
} catch {
  fail("read_only_preflight_failed");
} finally {
  if (database) await database.end().catch(() => {});
}
