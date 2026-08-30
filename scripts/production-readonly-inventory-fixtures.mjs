import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = readFileSync(
  resolve(root, "scripts/production-readonly-inventory.mjs"),
  "utf8",
);

assert.match(source, /begin read only/i, "collector must use a read-only transaction");
assert.match(source, /statement_timeout/i, "collector must set a statement timeout");
assert.match(source, /lock_timeout/i, "collector must set a lock timeout");
assert.match(source, /rollback/i, "collector must end by rolling back");
assert.match(source, /mode: 0o600/, "inventory file must be owner-readable only");
assert.match(source, /tmpdir\(\)/, "inventory must default outside the repository");
assert.match(
  source,
  /SKILLMINT_PRODUCTION_DATABASE_URL/,
  "collector must receive the connection string at runtime",
);
assert.doesNotMatch(
  source,
  /console\.(?:log|error)\([^\n]*connectionString|process\.stdout\.write\([^\n]*connectionString/,
  "collector must not print the connection string",
);

const sqlBodies = [...source.matchAll(/sql: `([\s\S]*?)`/g)].map((match) => match[1]);
assert.equal(sqlBodies.length, 4, "collector query set changed unexpectedly");
for (const sql of sqlBodies) {
  assert.doesNotMatch(
    sql,
    /\b(?:insert|update|delete|alter|create|drop|truncate|grant|revoke|call|copy|vacuum|refresh)\b/i,
    "inventory SQL contains a mutating command",
  );
}

const joinedSql = sqlBodies.join("\n");
for (const required of [
  "supabase_migrations.schema_migrations",
  "pg_class",
  "pg_namespace",
  "aclexplode",
  "pg_get_userbyid",
  "relacl",
  "pg_get_functiondef",
  "pg_event_trigger",
]) {
  assert.match(joinedSql, new RegExp(required.replaceAll(".", "\\."), "i"), `missing ${required}`);
}
assert.doesNotMatch(
  joinedSql,
  /information_schema\.table_privileges/i,
  "grant inventory must not depend on role-filtered information_schema visibility",
);
assert.match(
  joinedSql,
  /coalesce\(c\.relacl,\s*acldefault\('r',\s*c\.relowner\)\)/i,
  "grant inventory must expose effective default owner ACL when relacl is null",
);
assert.match(joinedSql, /c\.relkind in \('r', 'p'\)/i, "grant inventory must stay scoped to public tables");

for (const userTable of [
  "profiles",
  "resume_analyses",
  "career_snapshots",
  "job_matches",
  "beta_feedback",
  "proof_briefs",
  "recruiter_evidence_reviews",
]) {
  assert.doesNotMatch(
    joinedSql,
    new RegExp(`(?:from|join)\\s+(?:public\\.)?${userTable}\\b`, "i"),
    `collector must not read user table ${userTable}`,
  );
}

const dryRun = spawnSync(
  process.execPath,
  [resolve(root, "scripts/production-readonly-inventory.mjs"), "--dry-run"],
  { encoding: "utf8", env: { ...process.env, SKILLMINT_PRODUCTION_DATABASE_URL: "" } },
);
assert.equal(dryRun.status, 0, dryRun.stderr || "dry-run failed");
const dryRunPayload = JSON.parse(dryRun.stdout.trim());
assert.deepEqual(dryRunPayload, {
  mode: "dry-run",
  transaction: "READ ONLY",
  query_names: [
    "migration_history",
    "table_grants",
    "rls_auto_enable_function",
    "rls_auto_enable_event_triggers",
  ],
});

console.log("Production read-only inventory fixtures passed.");
