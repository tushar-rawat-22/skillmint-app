import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import "./production-local-migration-rehearsal-fixtures.mjs";

const root = resolve(import.meta.dirname, "..");

function bytes(path) {
  return readFileSync(resolve(root, path));
}

function text(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

const manifest = JSON.parse(text("supabase/migrations/manifest.json"));
const applied = [
  {
    version: "20260823001000",
    source_path: "supabase/schema_v10_two_sided_beta_foundation.sql",
    migration_path: "supabase/migrations/20260823001000_schema_v10_two_sided_beta_foundation.sql",
    sha256: "2b4f6dc8fc29e3a85439f90e854d48da60f295c4c3250be716c45a3ed0fd948a",
    rollout_classification: "existing_production_migration_history_verified",
  },
  {
    version: "20260823001100",
    source_path: "supabase/schema_v11_recruiter_evidence_review.sql",
    migration_path: "supabase/migrations/20260823001100_schema_v11_recruiter_evidence_review.sql",
    sha256: "007c6076a68de87bc96f6e85b886d93add5458dbfdc96da8210c22081ecd8cee",
    rollout_classification: "existing_production_migration_history_verified",
  },
  {
    version: "20260829001200",
    source_path: "supabase/schema_v12_account_persona_authority.sql",
    migration_path: "supabase/migrations/20260829001200_schema_v12_account_persona_authority.sql",
    sha256: "2d9947abe9c4d4d2e5128998844c84a746041968b92c60cbcf6f1e4019c23507",
    rollout_classification: "existing_production_migration_history_verified",
  },
  {
    version: "20260911001300",
    source_path: "supabase/schema_v13_access_requests.sql",
    migration_path: "supabase/migrations/20260911001300_schema_v13_access_requests.sql",
    sha256: "c35d9925a8861da4f20e1edd52d7b05e29d86dd924b73a32675d506555b87c19",
    rollout_classification: "existing_production_migration_history_verified",
  },
];
const pending = {
  version: "20260912001400",
  source_path: "supabase/schema_v14_candidate_job_lifecycle.sql",
  migration_path: "supabase/migrations/20260912001400_schema_v14_candidate_job_lifecycle.sql",
  sha256: "fef568bee5dfcd8e5a8a361c8da726026ed7c95c2ad9778fca7746530e3c650b",
  rollout_classification: "pending_candidate_job_lifecycle",
};

for (const contract of applied) {
  const manifestEntry = manifest.ordered_migrations.find((entry) => entry.version === contract.version);
  assert.deepEqual(manifestEntry, contract, `${contract.version} manifest contract changed`);
  assert.equal(Buffer.compare(bytes(contract.source_path), bytes(contract.migration_path)), 0, `${contract.version} source and migration differ`);
  assert.equal(sha256(bytes(contract.migration_path)), contract.sha256, `${contract.version} migration hash changed`);
  assert.ok(!manifest.generated_for.production.pending_execution.includes(contract.version), `${contract.version} must not remain pending after Production migration-history verification`);
}

const v10Sql = text(applied[0].migration_path);
assert.match(v10Sql, /grant select on table public\.account_personas to authenticated;/i, "authenticated users must retain owner-scoped persona read access");
assert.match(v10Sql, /grant select, insert, update, delete on table public\.account_personas to service_role;/i, "server-owned persona assignment path is missing");
assert.doesNotMatch(v10Sql, /grant\s+[^;]*\b(?:insert|update|delete)\b[^;]*\bon\s+table\s+public\.account_personas\b[^;]*\bto\s+authenticated\b/i, "authenticated browser sessions must not receive direct persona write grants");
assert.doesNotMatch(v10Sql, /create policy\s+"[^"]+"\s+on\s+public\.account_personas\s+for\s+(?:insert|update|delete)\s+to\s+authenticated/i, "authenticated browser sessions must not receive persona write policies");

const pendingEntry = manifest.ordered_migrations.find((entry) => entry.version === pending.version);
assert.deepEqual(pendingEntry, pending, "V14 manifest contract changed");
assert.equal(Buffer.compare(bytes(pending.source_path), bytes(pending.migration_path)), 0, "V14 source and migration differ");
assert.equal(sha256(bytes(pending.migration_path)), pending.sha256, "V14 migration hash changed");
assert.deepEqual(manifest.generated_for.production.pending_execution, [pending.version], "V14 must be the only pending Production migration");

const v14Sql = text(pending.migration_path);
assert.match(v14Sql, /grant select on table public\.candidate_job_lifecycle to authenticated;/i, "candidate lifecycle owner reads must remain explicit");
assert.match(v14Sql, /grant select, insert, update, delete on table public\.candidate_job_lifecycle to service_role;/i, "trusted server lifecycle mutation authority is missing");
assert.doesNotMatch(v14Sql, /grant\s+[^;]*\b(?:insert|update|delete)\b[^;]*\bon\s+table\s+public\.candidate_job_lifecycle\b[^;]*\bto\s+authenticated\b/i, "authenticated browser sessions must not receive lifecycle write grants");
assert.doesNotMatch(v14Sql, /create policy\s+"[^"]+"\s+on\s+public\.candidate_job_lifecycle\s+for\s+(?:insert|update|delete)\s+to\s+authenticated/i, "authenticated browser sessions must not receive latent lifecycle write policies");

console.log(`PASS production migration integrity fixtures (${applied.length} applied, 1 pending)`);
