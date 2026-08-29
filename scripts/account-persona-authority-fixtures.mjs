import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dirname, "..");
const sourcePath = "supabase/schema_v12_account_persona_authority.sql";
const migrationPath = "supabase/migrations/20260829001200_schema_v12_account_persona_authority.sql";

const source = read(sourcePath);
const migration = read(migrationPath);
const recruiterRoute = read("src/app/api/recruiter-evidence/route.ts");
const manifest = JSON.parse(read("supabase/migrations/manifest.json"));

assert.equal(source, migration, "V12 source and migration must remain byte-identical");
assert.match(migration, /revoke insert, update, delete on table public\.account_personas from authenticated;/);
assert.match(migration, /drop policy if exists account_personas_insert_own/);
assert.match(migration, /drop policy if exists account_personas_update_own/);
assert.match(migration, /drop policy if exists account_personas_delete_own/);
assert.match(migration, /before update of user_id, persona on public\.account_personas/);
assert.match(migration, /raise exception 'account persona identity is immutable'/);
assert.match(migration, /revoke all on function public\.reject_account_persona_identity_change\(\) from public, anon, authenticated;/);
assert.doesNotMatch(migration, /grant (insert|update|delete)[^;]*account_personas[^;]*authenticated/i);

const record = manifest.ordered_migrations.find((entry) => entry.version === "20260829001200");
assert.ok(record, "V12 must be registered in the migration manifest");
assert.equal(record.source_path, sourcePath);
assert.equal(record.migration_path, migrationPath);
assert.equal(record.rollout_classification, "pending_account_persona_authority");
assert.equal(record.sha256, crypto.createHash("sha256").update(migration).digest("hex"));
assert.equal(manifest.generated_for.empty_isolated_project.apply_in_order.at(-1), "20260829001200");
assert.equal(manifest.generated_for.production.pending_execution.at(-1), "20260829001200");

assert.match(recruiterRoute, /const authorization = await getServerAuthorization\(\)/);
assert.match(recruiterRoute, /authorization\.userId !== mutation\.expectedUserId/);
assert.match(recruiterRoute, /const admin = createSupabaseAdminClient\(\)/);
assert.match(recruiterRoute, /admin\.from\("account_personas"\)[\s\S]*\.insert\(\{ user_id: authorization\.userId, persona: mutation\.persona \}\)/);
assert.match(recruiterRoute, /persona\.value && persona\.value !== mutation\.persona/);

console.log("Account persona authority fixtures: PASS.");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}
