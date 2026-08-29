import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
const expected = [
  {
    version: "20260823001100",
    source_path: "supabase/schema_v11_recruiter_evidence_review.sql",
    migration_path:
      "supabase/migrations/20260823001100_schema_v11_recruiter_evidence_review.sql",
    sha256: "007c6076a68de87bc96f6e85b886d93add5458dbfdc96da8210c22081ecd8cee",
    rollout_classification: "pending_recruiter_evidence_review",
  },
  {
    version: "20260829001200",
    source_path: "supabase/schema_v12_account_persona_authority.sql",
    migration_path:
      "supabase/migrations/20260829001200_schema_v12_account_persona_authority.sql",
    sha256: "2d9947abe9c4d4d2e5128998844c84a746041968b92c60cbcf6f1e4019c23507",
    rollout_classification: "pending_account_persona_authority",
  },
];

for (const contract of expected) {
  const manifestEntry = manifest.ordered_migrations.find(
    (entry) => entry.version === contract.version,
  );

  assert.deepEqual(
    manifestEntry,
    contract,
    `${contract.version} manifest contract changed`,
  );
  assert.equal(
    Buffer.compare(bytes(contract.source_path), bytes(contract.migration_path)),
    0,
    `${contract.version} source and migration differ`,
  );
  assert.equal(
    sha256(bytes(contract.migration_path)),
    contract.sha256,
    `${contract.version} migration hash changed`,
  );
  assert.ok(
    manifest.generated_for.production.pending_execution.includes(contract.version),
    `${contract.version} must remain pending for Production until direct evidence proves otherwise`,
  );
}

console.log(`PASS production pending migration integrity fixtures (${expected.length} migrations)`);
