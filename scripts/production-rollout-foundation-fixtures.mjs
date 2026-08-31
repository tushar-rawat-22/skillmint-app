import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { evaluateProductionEvidence } from "./production-rollout-readiness.mjs";

const root = resolve(import.meta.dirname, "..");
let assertions = 0;

function check(condition, message) {
  assertions += 1;
  assert.ok(condition, message);
}

function equal(actual, expected, message) {
  assertions += 1;
  assert.deepEqual(actual, expected, message);
}

function text(path) {
  return readFileSync(join(root, path), "utf8");
}

function bytes(path) {
  return readFileSync(join(root, path));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

const frozenMigrations = [
  ["20260723000100_schema_v1.sql", "af7a9a7314b699d1e38fe6998bc382489a33532315f188d77d0f8f739b5357e5"],
  ["20260723000200_schema_v2_feedback.sql", "213fae232e106ff82cd6e300fc27507d77a612dd8c5f128bd91601f114f33701"],
  ["20260723000300_schema_v3_data_controls.sql", "a130483eac5ffafdbf293b3938e18dabea57a0e36c7d8617fb8bc448ae042959"],
  ["20260723000400_schema_v4_account_deletion_security.sql", "3ff175e86b79516ee896578d01b6b64fb747aa2b371187fa63f8225c09807587"],
  ["20260723000500_schema_v5_analytics_events.sql", "15498e432dcac694af1adc696e3f824d72e184b9f96827f3e4610e66397332b2"],
  ["20260723000600_schema_v6_analytics_aggregation.sql", "e46fabd2cf149f9bf97d4af18add4b125e8176fc577c162fa6b8f6dc385feba5"],
  ["20260723000700_schema_v7_analytics_acl_hardening.sql", "46f5606f45599d5955081d677a3f6bc51474fc0750a7daad87963b6bf9855b4c"],
  ["20260727000750_lifecycle_function_acl_normalization.sql", "6536263fd8cceb15e04daa60509a5923aff8562b50e4f19810fd59948dc89154"],
  ["20260727000800_schema_v8_active_resume_selections.sql", "233c4aa2d7f7fbf0fa8a034f763cbe38cd2399054641b6023a66c11cc730a3a1"],
];

for (const [name, expectedHash] of frozenMigrations) {
  equal(
    sha256(bytes(`supabase/migrations/${name}`)),
    expectedHash,
    `${name} changed`,
  );
}

const manifest = JSON.parse(text("supabase/migrations/manifest.json"));
equal(
  manifest.ordered_migrations.map((entry) => entry.version),
  [
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
  ],
  "migration order is not exact",
);
equal(
  manifest.generated_for.production.catalog_proof_required_before_marking_applied,
  ["20260723000100", "20260723000200"],
  "Production catalog baseline must be V1+V2 only",
);
equal(
  manifest.generated_for.production.pending_execution,
  [
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
  ],
  "Production pending order is not exact",
);
const expectedClassifications = new Map([
  [
    "20260723000100",
    "existing_production_catalog_verified_history_unknown",
  ],
  [
    "20260723000200",
    "existing_production_catalog_verified_history_unknown",
  ],
  ["20260723000300", "pending_data_controls"],
  ["20260723000400", "pending_account_deletion_security"],
  ["20260723000500", "pending_analytics_ingestion"],
  ["20260723000600", "pending_founder_aggregation"],
  ["20260723000700", "pending_analytics_acl_hardening"],
  ["20260727000750", "pending_lifecycle_function_acl_normalization"],
  ["20260727000800", "pending_resume_workspace_phase_1a"],
  ["20260730000900", "pending_public_function_acl_normalization"],
  ["20260823001000", "pending_two_sided_beta_foundation"],
  ["20260823001100", "pending_recruiter_evidence_review"],
  ["20260829001200", "pending_account_persona_authority"],
]);
equal(
  new Map(
    manifest.ordered_migrations.map((entry) => [
      entry.version,
      entry.rollout_classification,
    ]),
  ),
  expectedClassifications,
  "migration classifications are not exact",
);
const productionPendingVersions = new Set(
  manifest.generated_for.production.pending_execution,
);
for (const pendingVersion of productionPendingVersions) {
  const entry = manifest.ordered_migrations.find(
    (migrationEntry) => migrationEntry.version === pendingVersion,
  );
  check(
    entry.rollout_classification.startsWith("pending_"),
    `${pendingVersion} classification must begin with pending_`,
  );
  check(
    !entry.rollout_classification.startsWith("existing_production"),
    `${pendingVersion} cannot have an existing Production classification`,
  );
}
for (const baselineVersion of ["20260723000100", "20260723000200"]) {
  check(
    !productionPendingVersions.has(baselineVersion),
    `${baselineVersion} cannot be pending execution`,
  );
}
for (const pendingVersion of ["20260723000300", "20260723000400"]) {
  check(
    !expectedClassifications
      .get(pendingVersion)
      .includes("existing_production"),
    `${pendingVersion} cannot describe an existing Production baseline`,
  );
}

const migrationPath =
  "supabase/migrations/20260730000900_public_rls_auto_enable_acl_normalization.sql";
const sourcePath = "supabase/schema_v9_public_function_acl_normalization.sql";
const migration = text(migrationPath);
const migrationWithoutComments = migration.replace(/^--.*$/gm, "");
const migrationHash =
  "171404d422850c935300ad0384cc680a195849847705683c0b05016290e93983";
equal(Buffer.compare(bytes(sourcePath), bytes(migrationPath)), 0, "V9 source and migration differ");
equal(sha256(bytes(migrationPath)), migrationHash, "V9 migration hash changed");
equal(
  manifest.ordered_migrations.find((entry) => entry.version === "20260730000900"),
  {
    version: "20260730000900",
    source_path: sourcePath,
    migration_path: migrationPath,
    sha256: migrationHash,
    rollout_classification: "pending_public_function_acl_normalization",
  },
  "V9 manifest entry changed",
);

const v10MigrationPath =
  "supabase/migrations/20260823001000_schema_v10_two_sided_beta_foundation.sql";
const v10SourcePath = "supabase/schema_v10_two_sided_beta_foundation.sql";
const v10Migration = text(v10MigrationPath);
const v10Hash =
  "2b4f6dc8fc29e3a85439f90e854d48da60f295c4c3250be716c45a3ed0fd948a";
equal(
  Buffer.compare(bytes(v10SourcePath), bytes(v10MigrationPath)),
  0,
  "V10 source and migration differ",
);
equal(sha256(bytes(v10MigrationPath)), v10Hash, "V10 migration hash changed");
equal(
  manifest.ordered_migrations.find((entry) => entry.version === "20260823001000"),
  {
    version: "20260823001000",
    source_path: v10SourcePath,
    migration_path: v10MigrationPath,
    sha256: v10Hash,
    rollout_classification: "pending_two_sided_beta_foundation",
  },
  "V10 manifest entry changed",
);
check(/^begin;[\s\S]*commit;\s*$/m.test(v10Migration.replace(/^--.*$/gm, "").trim()), "V10 is not transactional");
for (const table of ["account_personas", "proof_briefs"]) {
  check(v10Migration.includes(`create table public.${table}`), `V10 is missing ${table}`);
  check(new RegExp(`alter table public\\.${table} enable row level security`, "i").test(v10Migration), `${table} RLS is missing`);
  check(new RegExp(`revoke all on table public\\.${table}[\\s\\S]*from public, anon, authenticated, service_role`, "i").test(v10Migration), `${table} baseline ACL is missing`);
}
check(/visibility text not null default 'PRIVATE'/i.test(v10Migration), "Proof Briefs are not private by default");
check(/visibility in \('PRIVATE', 'LINK_ONLY'\)/i.test(v10Migration), "Proof Brief visibility is not bounded");
check(/unique \(share_token_hash\)/i.test(v10Migration), "Proof Brief token hashes are not unique");
check(/requested_token_hash ~ '\^\[0-9a-f\]\{64\}\$'/i.test(v10Migration), "Shared Proof Brief lookup does not validate the token hash");
check(/security definer[\s\S]*set search_path = pg_catalog/i.test(v10Migration), "V10 security-definer search path is not pinned");
check(/grant execute on function public\.get_shared_proof_brief\(text\)[\s\S]*to anon, authenticated/i.test(v10Migration), "Public brief lookup grant is missing");
assert.doesNotMatch(v10Migration, /grant select[^;]*proof_briefs[^;]*anon/i, "Anonymous users can select the Proof Brief table");
assert.doesNotMatch(v10Migration, /grant (?:insert|update|delete)[^;]*proof_briefs[^;]*authenticated/i, "Authenticated clients can mutate the Proof Brief table directly");
check(/delete from public\.proof_briefs where user_id = target_user_id/i.test(v10Migration), "Account deletion does not remove Proof Briefs");
check(/delete from public\.account_personas where user_id = target_user_id/i.test(v10Migration), "Account deletion does not remove persona state");

check(/^begin;[\s\S]*commit;\s*$/m.test(migrationWithoutComments.trim()), "V9 is not transactional");
check(/target_count = 0[\s\S]*return;/i.test(migration), "absent function is not a safe no-op");
check(/target_count <> 1[\s\S]*unexpected signature or overload/i.test(migration), "overloads do not fail closed");
check(/pronargs = 0/i.test(migration), "no-argument signature is not asserted");
check(/prorettype[\s\S]*event_trigger/i.test(migration), "event-trigger return type is not asserted");
check(/language_row\.lanname = 'plpgsql'/i.test(migration), "plpgsql language is not asserted");
check(/function_row\.provolatile = 'v'/i.test(migration), "volatile behavior is not asserted");
check(/function_row\.prosecdef/i.test(migration), "SECURITY DEFINER is not asserted");
check(
  /proconfig is not distinct from[\s\S]*search_path=pg_catalog/i.test(migration),
  "safe search_path is not asserted",
);
check(/owner_row\.rolname = 'postgres'/i.test(migration), "postgres ownership is not asserted");
check(
  /event_trigger_count_before <> 1/i.test(migration),
  "exactly one attached event trigger is not asserted",
);
check(
  migrationWithoutComments.includes(
    "postgres|ensure_rls|ddl_command_end|O|CREATE TABLE,CREATE TABLE AS,SELECT INTO",
  ),
  "exact event-trigger owner, name, event, state, and normalized tags are not asserted",
);
equal(
  (
    migrationWithoutComments.match(
      /trigger_owner_row\.oid = trigger_row\.evtowner/g,
    ) ?? []
  ).length,
  2,
  "event-trigger owner must be joined before and after the ACL change",
);
equal(
  (
    migrationWithoutComments.match(
      /trigger_owner_row\.rolname,\s*trigger_row\.evtname/g,
    ) ?? []
  ).length,
  2,
  "event-trigger owner must be snapshotted before and after the ACL change",
);
check(
  /function_contract_after is distinct from function_contract_before/i.test(migration),
  "function-owner contract preservation is not asserted",
);
check(
  /event_trigger_contract_after is distinct from event_trigger_contract_before/i.test(migration),
  "event-trigger contract preservation is not asserted",
);
for (const role of ["public", "anon", "authenticated", "service_role"]) {
  check(
    migration.includes(
      `'revoke execute on function public.rls_auto_enable() from ${role}'`,
    ),
    `${role} EXECUTE is not revoked`,
  );
}
check(/aclexplode/i.test(migration), "direct PUBLIC/API ACL postflight is missing");
for (const role of ["anon", "authenticated", "service_role"]) {
  check(
    new RegExp(`has_function_privilege\\(\\s*'${role}'[\\s\\S]*?'EXECUTE'`, "i")
      .test(migration),
    `${role} effective EXECUTE postflight is missing`,
  );
}
assert.doesNotMatch(
  migrationWithoutComments,
  /\b(?:drop|create|alter|replace)\s+function\b|\balter\s+default\s+privileges\b/i,
  "V9 changes a function definition or default privilege",
);
assert.doesNotMatch(
  migrationWithoutComments,
  /\b(?:drop|create|alter)\s+event\s+trigger\b|\banalytics_events\b|\binsert\s+into\b|\bupdate\s+public\.|\bdelete\s+from\b/i,
  "V9 exceeds the one-function ACL scope",
);
assert.doesNotMatch(
  migrationWithoutComments,
  /\bprosrc\b|\bpg_get_functiondef\b/i,
  "V9 must not inspect or change the function body",
);

const validatorSource = text("scripts/production-rollout-readiness.mjs");
assert.doesNotMatch(
  validatorSource,
  /node:(?:http|https|net|tls|dgram|dns)|\bfetch\s*\(|XMLHttpRequest|WebSocket/i,
  "validator includes a network API",
);
equal(
  [...validatorSource.matchAll(/spawnSync\(\s*"([^"]+)"/g)].map((match) => match[1]),
  ["unzip", "unzip"],
  "validator may spawn only offline unzip reads",
);
assert.doesNotMatch(
  validatorSource,
  /\b(?:writeFile|appendFile|createWriteStream|rmSync|unlinkSync)\b/,
  "validator writes or deletes files",
);

function rowsFrom(specification, keys) {
  return specification.trim().split("\n").map((line) =>
    Object.fromEntries(
      line.split("|").map((value, index) => [keys[index], fixtureValue(value)]),
    ),
  );
}

function fixtureValue(value) {
  if (value === "null") {
    return null;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  if (/^[1-9][0-9]*$/.test(value)) {
    return Number(value);
  }
  return value;
}

function buildEvidenceFiles() {
  const files = new Map();
  const projectRef = ["iylxqtpnhgck", "dbomfvtz"].join("");
  files.set("02-production-project.json", JSON.stringify({
    name: "skillmint-beta",
    ref: projectRef,
  }));
  files.set("03-auth-config-sanitized.json", JSON.stringify({
    captcha_enabled: false,
    email_autoconfirm: true,
    email_provider_enabled: true,
    password_minimum_length: 6,
    provider_new_user_signup: "DISABLED",
    smtp_configured: false,
  }));
  files.set("04-backups-sanitized.json", JSON.stringify({
    backup_count: 0,
    pitr_enabled: false,
  }));
  files.set("05-readonly-mode.json", JSON.stringify({ enabled: false }));
  files.set("06-ssl-enforcement.json", JSON.stringify({
    currentConfig: { database: false },
  }));
  files.set("07-postgrest-openapi-summary.json", JSON.stringify({
    paths: [
      "/",
      "/beta_feedback",
      "/career_snapshots",
      "/job_matches",
      "/profiles",
      "/resume_analyses",
      "/rpc/rls_auto_enable",
    ],
  }));
  files.set("08-relations.json", JSON.stringify(
    rowsFrom(`
public|beta_feedback|table|true|false
public|career_snapshots|table|true|false
public|job_matches|table|true|false
public|profiles|table|true|false
public|resume_analyses|table|true|false`, [
      "schema_name",
      "relation_name",
      "relation_type",
      "rls_enabled",
      "rls_forced",
    ]),
  ));
  files.set("09-columns.json", JSON.stringify(rowsFrom(`
beta_feedback|1|id|uuid|uuid|NO|gen_random_uuid()
beta_feedback|2|user_id|uuid|uuid|YES|null
beta_feedback|3|feedback_type|text|text|NO|null
beta_feedback|4|sentiment|text|text|NO|null
beta_feedback|5|message|text|text|NO|null
beta_feedback|6|page_path|text|text|YES|null
beta_feedback|7|status|text|text|NO|'new'::text
beta_feedback|8|created_at|timestamp with time zone|timestamptz|NO|now()
career_snapshots|1|id|uuid|uuid|NO|gen_random_uuid()
career_snapshots|2|user_id|uuid|uuid|NO|null
career_snapshots|3|career_iq|jsonb|jsonb|YES|null
career_snapshots|4|recruiter_confidence|jsonb|jsonb|YES|null
career_snapshots|5|salary_projection|jsonb|jsonb|YES|null
career_snapshots|6|role_matches|jsonb|jsonb|YES|null
career_snapshots|7|created_at|timestamp with time zone|timestamptz|NO|now()
job_matches|1|id|uuid|uuid|NO|gen_random_uuid()
job_matches|2|user_id|uuid|uuid|NO|null
job_matches|3|job_title|text|text|YES|null
job_matches|4|company_name|text|text|YES|null
job_matches|5|job_description|text|text|NO|null
job_matches|6|match_result|jsonb|jsonb|YES|null
job_matches|7|improvement_plan|jsonb|jsonb|YES|null
job_matches|8|rewrite_plan|jsonb|jsonb|YES|null
job_matches|9|roadmap|jsonb|jsonb|YES|null
job_matches|10|created_at|timestamp with time zone|timestamptz|NO|now()
profiles|1|id|uuid|uuid|NO|null
profiles|2|full_name|text|text|YES|null
profiles|3|email|text|text|YES|null
profiles|4|career_goal|text|text|YES|null
profiles|5|target_role|text|text|YES|null
profiles|6|created_at|timestamp with time zone|timestamptz|NO|now()
profiles|7|updated_at|timestamp with time zone|timestamptz|NO|now()
resume_analyses|1|id|uuid|uuid|NO|gen_random_uuid()
resume_analyses|2|user_id|uuid|uuid|NO|null
resume_analyses|3|file_name|text|text|NO|null
resume_analyses|4|file_type|text|text|NO|null
resume_analyses|5|extracted_text|text|text|YES|null
resume_analyses|6|parsed_profile|jsonb|jsonb|YES|null
resume_analyses|7|user_profile|jsonb|jsonb|YES|null
resume_analyses|8|created_at|timestamp with time zone|timestamptz|NO|now()`, [
    "table_name",
    "ordinal_position",
    "column_name",
    "data_type",
    "udt_name",
    "is_nullable",
    "column_default",
  ])));
  files.set("10-constraints.json", JSON.stringify(rowsFrom(`
beta_feedback|beta_feedback_message_length_check|c|CHECK (char_length(message) >= 10 AND char_length(message) <= 1000)
beta_feedback|beta_feedback_pkey|p|PRIMARY KEY (id)
beta_feedback|beta_feedback_sentiment_check|c|CHECK (sentiment = ANY (ARRAY['negative'::text, 'neutral'::text, 'positive'::text]))
beta_feedback|beta_feedback_type_check|c|CHECK (feedback_type = ANY (ARRAY['bug'::text, 'confusion'::text, 'ui'::text, 'idea'::text, 'other'::text]))
beta_feedback|beta_feedback_user_id_fkey|f|FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
career_snapshots|career_snapshots_pkey|p|PRIMARY KEY (id)
career_snapshots|career_snapshots_user_id_fkey|f|FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
job_matches|job_matches_pkey|p|PRIMARY KEY (id)
job_matches|job_matches_user_id_fkey|f|FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
profiles|profiles_id_fkey|f|FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
profiles|profiles_pkey|p|PRIMARY KEY (id)
resume_analyses|resume_analyses_pkey|p|PRIMARY KEY (id)
resume_analyses|resume_analyses_user_id_fkey|f|FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`, [
    "relation_name",
    "constraint_name",
    "constraint_type",
    "definition",
  ])));
  files.set("11-indexes.json", JSON.stringify(rowsFrom(`
beta_feedback|beta_feedback_created_at_idx|CREATE INDEX beta_feedback_created_at_idx ON public.beta_feedback USING btree (created_at DESC)
beta_feedback|beta_feedback_pkey|CREATE UNIQUE INDEX beta_feedback_pkey ON public.beta_feedback USING btree (id)
beta_feedback|beta_feedback_user_id_idx|CREATE INDEX beta_feedback_user_id_idx ON public.beta_feedback USING btree (user_id)
career_snapshots|career_snapshots_created_at_idx|CREATE INDEX career_snapshots_created_at_idx ON public.career_snapshots USING btree (created_at DESC)
career_snapshots|career_snapshots_pkey|CREATE UNIQUE INDEX career_snapshots_pkey ON public.career_snapshots USING btree (id)
career_snapshots|career_snapshots_user_id_idx|CREATE INDEX career_snapshots_user_id_idx ON public.career_snapshots USING btree (user_id)
job_matches|job_matches_created_at_idx|CREATE INDEX job_matches_created_at_idx ON public.job_matches USING btree (created_at DESC)
job_matches|job_matches_pkey|CREATE UNIQUE INDEX job_matches_pkey ON public.job_matches USING btree (id)
job_matches|job_matches_user_id_idx|CREATE INDEX job_matches_user_id_idx ON public.job_matches USING btree (user_id)
profiles|profiles_pkey|CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id)
resume_analyses|resume_analyses_created_at_idx|CREATE INDEX resume_analyses_created_at_idx ON public.resume_analyses USING btree (created_at DESC)
resume_analyses|resume_analyses_pkey|CREATE UNIQUE INDEX resume_analyses_pkey ON public.resume_analyses USING btree (id)
resume_analyses|resume_analyses_user_id_idx|CREATE INDEX resume_analyses_user_id_idx ON public.resume_analyses USING btree (user_id)`, [
    "relation_name",
    "index_name",
    "definition",
  ])));
  files.set("12-policies.json", JSON.stringify(rowsFrom(`
beta_feedback|Users can insert their own beta feedback|PERMISSIVE|{authenticated}|INSERT|null|(auth.uid() = user_id)
beta_feedback|Users can select their own beta feedback|PERMISSIVE|{authenticated}|SELECT|(auth.uid() = user_id)|null
career_snapshots|Users can delete their own career snapshots|PERMISSIVE|{authenticated}|DELETE|(auth.uid() = user_id)|null
career_snapshots|Users can insert their own career snapshots|PERMISSIVE|{authenticated}|INSERT|null|(auth.uid() = user_id)
career_snapshots|Users can select their own career snapshots|PERMISSIVE|{authenticated}|SELECT|(auth.uid() = user_id)|null
career_snapshots|Users can update their own career snapshots|PERMISSIVE|{authenticated}|UPDATE|(auth.uid() = user_id)|(auth.uid() = user_id)
job_matches|Users can delete their own job matches|PERMISSIVE|{authenticated}|DELETE|(auth.uid() = user_id)|null
job_matches|Users can insert their own job matches|PERMISSIVE|{authenticated}|INSERT|null|(auth.uid() = user_id)
job_matches|Users can select their own job matches|PERMISSIVE|{authenticated}|SELECT|(auth.uid() = user_id)|null
job_matches|Users can update their own job matches|PERMISSIVE|{authenticated}|UPDATE|(auth.uid() = user_id)|(auth.uid() = user_id)
profiles|Users can delete their own profile|PERMISSIVE|{authenticated}|DELETE|(auth.uid() = id)|null
profiles|Users can insert their own profile|PERMISSIVE|{authenticated}|INSERT|null|(auth.uid() = id)
profiles|Users can select their own profile|PERMISSIVE|{authenticated}|SELECT|(auth.uid() = id)|null
profiles|Users can update their own profile|PERMISSIVE|{authenticated}|UPDATE|(auth.uid() = id)|(auth.uid() = id)
resume_analyses|Users can delete their own resume analyses|PERMISSIVE|{authenticated}|DELETE|(auth.uid() = user_id)|null
resume_analyses|Users can insert their own resume analyses|PERMISSIVE|{authenticated}|INSERT|null|(auth.uid() = user_id)
resume_analyses|Users can select their own resume analyses|PERMISSIVE|{authenticated}|SELECT|(auth.uid() = user_id)|null
resume_analyses|Users can update their own resume analyses|PERMISSIVE|{authenticated}|UPDATE|(auth.uid() = user_id)|(auth.uid() = user_id)`, [
    "relation_name",
    "policy_name",
    "permissive",
    "roles",
    "command",
    "using_expression",
    "check_expression",
  ])));
  files.set("13-functions.json", JSON.stringify([
    {
      function_name: "rls_auto_enable",
      identity_arguments: "",
      result_type: "event_trigger",
      language_name: "plpgsql",
      runtime_configuration: "{search_path=pg_catalog}",
      security_definer: true,
      volatility: "v",
    },
    {
      function_name: "set_updated_at",
      identity_arguments: "",
      result_type: "trigger",
      language_name: "plpgsql",
      runtime_configuration: null,
      security_definer: false,
      volatility: "v",
    },
  ]));
  files.set("14-triggers.json", JSON.stringify([
    {
      relation_name: "profiles",
      trigger_name: "set_profiles_updated_at",
      enabled_state: "O",
      definition:
        "CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at()",
    },
  ]));
  files.set("15-table-grants.json", "[]");
  files.set("17-remote-migrations.json", JSON.stringify({
    available: false,
    reason: "migration_table_not_visible",
  }));
  files.set("18-local-migration-authority.json", JSON.stringify({
    versions: frozenMigrations.map(([name]) => name.slice(0, 14)),
    files: frozenMigrations.map(([name, hash]) => ({
      path: `supabase/migrations/${name}`,
      sha256: hash,
    })),
  }));
  files.set("19-summary.json", JSON.stringify({
    relation_count: 5,
    column_count: 40,
    constraint_count: 13,
    index_count: 13,
    policy_count: 18,
    function_count: 2,
    trigger_count: 1,
    database_changed: false,
    auth_configuration_changed: false,
    user_data_queried: false,
    auth_user_rows_queried: false,
    migration_histories_match: "UNKNOWN",
    remote_migration_count: null,
  }));
  files.set("22-evidence-sha256.txt", "fixture");
  return files;
}

const validEvidence = buildEvidenceFiles();
const result = evaluateProductionEvidence(validEvidence);
equal(result.readiness, "NO_GO", "operational blockers must produce NO-GO");
equal(result.catalogBaseline, "V1+V2", "catalog baseline is inaccurate");
equal(
  result.catalogDrift,
  ["public.rls_auto_enable"],
  "known catalog drift is inaccurate",
);
equal(
  result.tableGrantVisibility,
  "UNKNOWN_READ_ONLY_ROLE",
  "read-only table-grant evidence must remain unknown",
);
equal(
  result.catalogPending,
  ["V3", "V4", "V5", "V6", "V7", "V7.1", "V8"],
  "catalog-pending versions are inaccurate",
);
equal(
  result.migrationHistory,
  "UNKNOWN_NOT_VISIBLE",
  "migration history is not reported as unknown",
);
check(result.blockers.includes("backup_count_zero"), "backup blocker is missing");
check(result.blockers.includes("untracked_rls_auto_enable_surface"), "drift blocker is missing");
check(
  result.blockers.includes("table_grant_visibility_unknown"),
  "table-grant visibility blocker is missing",
);

function mutateJsonEvidence(member, mutate) {
  const changed = new Map(validEvidence);
  const parsed = JSON.parse(changed.get(member));
  mutate(parsed);
  changed.set(member, JSON.stringify(parsed));
  return changed;
}

const reorderedCatalog = new Map(validEvidence);
for (const member of [
  "08-relations.json",
  "09-columns.json",
  "10-constraints.json",
  "11-indexes.json",
  "12-policies.json",
  "13-functions.json",
  "14-triggers.json",
]) {
  const rows = JSON.parse(reorderedCatalog.get(member));
  reorderedCatalog.set(
    member,
    JSON.stringify(
      rows.reverse().map((row) =>
        Object.fromEntries(Object.entries(row).reverse()),
      ),
    ),
  );
}
equal(
  evaluateProductionEvidence(reorderedCatalog).catalogDigest,
  result.catalogDigest,
  "catalog canonicalization must ignore array and JSON key order",
);

const missingDriftFunction = mutateJsonEvidence("13-functions.json", (rows) => {
  const index = rows.findIndex(
    (row) => row.function_name === "rls_auto_enable",
  );
  rows.splice(index, 1);
});
assert.throws(
  () => evaluateProductionEvidence(missingDriftFunction),
  (error) => error?.code === "catalog_metadata_not_exact_v1_v2",
  "removing the known drift function did not fail the exact catalog check",
);

const additionalFunction = mutateJsonEvidence("13-functions.json", (rows) => {
  rows.push({
    function_name: "unexpected_function",
    identity_arguments: "",
    result_type: "void",
    language_name: "sql",
    runtime_configuration: null,
    security_definer: false,
    volatility: "v",
  });
});
assert.throws(
  () => evaluateProductionEvidence(additionalFunction),
  (error) => error?.code === "catalog_metadata_not_exact_v1_v2",
  "adding another function did not fail the exact catalog check",
);

const changedDriftFunction = mutateJsonEvidence("13-functions.json", (rows) => {
  const functionRow = rows.find(
    (row) => row.function_name === "rls_auto_enable",
  );
  functionRow.runtime_configuration = null;
});
assert.throws(
  () => evaluateProductionEvidence(changedDriftFunction),
  (error) => error?.code === "catalog_metadata_not_exact_v1_v2",
  "changing captured drift-function attributes did not fail the exact catalog check",
);

for (const [label, member, mutate] of [
  [
    "column default",
    "09-columns.json",
    (rows) => {
      rows[0].column_default = "uuid_generate_v4()";
    },
  ],
  [
    "constraint definition",
    "10-constraints.json",
    (rows) => {
      rows[0].definition = "CHECK (char_length(message) >= 1)";
    },
  ],
  [
    "index definition",
    "11-indexes.json",
    (rows) => {
      rows[0].definition =
        "CREATE INDEX beta_feedback_created_at_idx ON public.beta_feedback USING btree (created_at)";
    },
  ],
  [
    "policy USING expression",
    "12-policies.json",
    (rows) => {
      rows[1].using_expression = "true";
    },
  ],
  [
    "policy WITH CHECK expression",
    "12-policies.json",
    (rows) => {
      rows[0].check_expression = "true";
    },
  ],
  [
    "function language",
    "13-functions.json",
    (rows) => {
      rows[0].language_name = "sql";
    },
  ],
  [
    "function security attribute",
    "13-functions.json",
    (rows) => {
      rows[0].security_definer = false;
    },
  ],
  [
    "trigger definition",
    "14-triggers.json",
    (rows) => {
      rows[0].definition =
        "CREATE TRIGGER set_profiles_updated_at AFTER UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at()";
    },
  ],
]) {
  assert.throws(
    () => evaluateProductionEvidence(mutateJsonEvidence(member, mutate)),
    (error) => error?.code === "catalog_metadata_not_exact_v1_v2",
    `${label} mutation did not fail closed`,
  );
}

const visibleLookingGrants = mutateJsonEvidence("15-table-grants.json", (rows) => {
  rows.push({
    grantee: "authenticated",
    privilege_type: "SELECT",
    relation_name: "profiles",
  });
});
equal(
  evaluateProductionEvidence(visibleLookingGrants).tableGrantVisibility,
  "UNKNOWN_READ_ONLY_ROLE",
  "partial table-grant rows must not be treated as complete visibility",
);
const invalidGrantJson = new Map(validEvidence);
invalidGrantJson.set("15-table-grants.json", "{");
assert.throws(
  () => evaluateProductionEvidence(invalidGrantJson),
  (error) => error?.code === "invalid_15_table_grants_json",
  "invalid table-grant JSON did not fail closed",
);
const invalidGrantShape = new Map(validEvidence);
invalidGrantShape.set("15-table-grants.json", "{}");
assert.throws(
  () => evaluateProductionEvidence(invalidGrantShape),
  (error) => error?.code === "table_grants_evidence_invalid",
  "non-array table-grant evidence did not fail closed",
);

const wrongProject = new Map(validEvidence);
wrongProject.set("02-production-project.json", JSON.stringify({
  name: "fixture-wrong-project",
  ref: "fixture-wrong-project-ref",
}));
assert.throws(
  () => evaluateProductionEvidence(wrongProject),
  (error) => error?.code === "wrong_project_name",
  "wrong project evidence did not fail",
);
const missingEvidence = new Map(validEvidence);
missingEvidence.delete("09-columns.json");
assert.throws(
  () => evaluateProductionEvidence(missingEvidence),
  (error) => error?.code === "missing_required_evidence",
  "incomplete evidence did not fail",
);

const temporaryDirectory = mkdtempSync(
  join(tmpdir(), "skillmint-production-readiness-fixture-"),
);
try {
  const hashLines = [];
  for (const [name, contents] of validEvidence) {
    if (name === "22-evidence-sha256.txt") {
      continue;
    }
    writeFileSync(join(temporaryDirectory, name), contents, { mode: 0o600 });
    hashLines.push(`${sha256(contents)}  ${name}`);
  }
  writeFileSync(
    join(temporaryDirectory, "22-evidence-sha256.txt"),
    `${hashLines.join("\n")}\n`,
    { mode: 0o600 },
  );

  const cliResult = spawnSync(
    process.execPath,
    [join(root, "scripts/production-rollout-readiness.mjs"), temporaryDirectory],
    { cwd: root, encoding: "utf8" },
  );
  equal(cliResult.status, 1, "valid blocked evidence must return status 1");
  check(
    cliResult.stdout.includes("PRODUCTION_ROLLOUT_READINESS=NO_GO"),
    "CLI did not report NO-GO",
  );
  check(
    cliResult.stdout.includes("CATALOG_DRIFT=public.rls_auto_enable"),
    "CLI did not report the known catalog drift",
  );
  check(
    cliResult.stdout.includes("MIGRATION_HISTORY=UNKNOWN_NOT_VISIBLE"),
    "CLI overclaimed migration history",
  );
  check(
    cliResult.stdout.includes(
      "TABLE_GRANT_VISIBILITY=UNKNOWN_READ_ONLY_ROLE",
    ),
    "CLI overclaimed table-grant visibility",
  );

  writeFileSync(
    join(temporaryDirectory, "02-production-project.json"),
    JSON.stringify({ name: "fixture-wrong-project", ref: "fixture-wrong-ref" }),
    { mode: 0o600 },
  );
  const wrongCliResult = spawnSync(
    process.execPath,
    [join(root, "scripts/production-rollout-readiness.mjs"), temporaryDirectory],
    { cwd: root, encoding: "utf8" },
  );
  equal(wrongCliResult.status, 2, "wrong CLI evidence did not fail");
  check(
    !wrongCliResult.stderr.includes("fixture-wrong-ref"),
    "wrong evidence leaked a project ref",
  );
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}

const environmentExample = text(".env.example");
check(
  /^NEXT_PUBLIC_ANALYTICS_COLLECTION_ENABLED=\s*$/m.test(environmentExample) &&
    /^ANALYTICS_COLLECTION_ENABLED=\s*$/m.test(environmentExample),
  "analytics defaults are not disabled",
);
const rolloutAuthority = text("docs/PRODUCTION_SCHEMA_ROLLOUT.md");
for (const requiredText of [
  "Current decision:** `NO-GO`",
  "V1+V2",
  "exact V1+V2 versioned catalog baseline plus the known untracked",
  "history is **unknown**, not absent",
  "table-grant visibility is **unknown**",
  "function owner and event-trigger contract were not captured",
  "function body",
  "Backup files and user data must never enter Git",
  "Provider signup is disabled and email login is enabled",
  "Analytics remains disabled",
  "Public launch, invitations",
  "Changing default function privileges was rejected",
  "The expected write downtime is **unknown",
]) {
  check(
    rolloutAuthority.includes(requiredText),
    `rollout authority is missing: ${requiredText}`,
  );
}

const packageJson = JSON.parse(text("package.json"));
equal(
  packageJson.scripts["check:production-rollout-readiness"],
  "node scripts/production-rollout-readiness.mjs",
  "readiness package script is missing",
);
equal(
  packageJson.scripts["fixtures:production-rollout-foundation"],
  "node scripts/production-rollout-foundation-fixtures.mjs",
  "Phase 5B fixture package script is missing",
);
check(
  text(".github/workflows/ci.yml").includes(
    "node scripts/production-rollout-foundation-fixtures.mjs",
  ),
  "Phase 5B fixtures are absent from CI",
);

console.log(
  `PASS production rollout foundation fixtures (${assertions} assertions)`,
);
