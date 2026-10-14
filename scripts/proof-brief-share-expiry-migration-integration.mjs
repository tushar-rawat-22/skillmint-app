import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import pg from "pg";

const { Client } = pg;
const connection = {
  host: "127.0.0.1",
  port: 54322,
  database: "postgres",
  user: "postgres",
  password: "postgres",
};
const migration = readFileSync(
  resolve(
    import.meta.dirname,
    "../supabase/migrations/20261013184117_proof_brief_share_expiry.sql",
  ),
  "utf8",
);
const db = new Client(connection);

try {
  await db.connect();
  await db.query(migration);
  const afterFirstReplay = await functionContract();
  await db.query(migration);
  const afterSecondReplay = await functionContract();
  assert.deepEqual(afterSecondReplay, afterFirstReplay);
  console.log("PASS V16 migration replays idempotently with an unchanged function and ACL contract");

  await db.query("begin");
  await db.query(
    "comment on function public.get_shared_proof_brief(text) is 'synthetic rollback probe'",
  );
  await db.query(
    "revoke execute on function public.get_shared_proof_brief(text) from anon",
  );
  await db.query("rollback");
  const afterRollback = await functionContract();
  assert.deepEqual(afterRollback, afterSecondReplay);
  console.log("PASS function-only recovery rollback restores the exact V16 definition, comment, and ACL contract");
} catch (error) {
  try { await db.query("rollback"); } catch {}
  console.error("FAIL V16 migration replay/recovery integration");
  console.error(error instanceof Error ? error.message : "Unknown database failure");
  process.exitCode = 1;
} finally {
  await db.end();
}

async function functionContract() {
  const result = await db.query(`
    select
      p.oid::regprocedure::text as signature,
      p.prosecdef as security_definer,
      p.provolatile as volatility,
      p.proconfig as config,
      pg_catalog.obj_description(p.oid, 'pg_proc') as comment,
      pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
      pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
      pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute,
      pg_catalog.pg_get_functiondef(p.oid) as definition
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('get_shared_proof_brief', 'submit_candidate_evidence_review')
    order by p.proname
  `);
  assert.equal(result.rows.length, 2);
  return result.rows;
}
