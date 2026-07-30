import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";

const EXPECTED_PROJECT_NAME = "skillmint-beta";
const EXPECTED_PROJECT_REF_SHA256 =
  "c84507eaec854938ead288cde83dc20ab34fd75a339df1efe16bc61c1ef9ad30";
const EXPECTED_MIGRATION_HASHES = new Map([
  ["20260723000100", "af7a9a7314b699d1e38fe6998bc382489a33532315f188d77d0f8f739b5357e5"],
  ["20260723000200", "213fae232e106ff82cd6e300fc27507d77a612dd8c5f128bd91601f114f33701"],
  ["20260723000300", "a130483eac5ffafdbf293b3938e18dabea57a0e36c7d8617fb8bc448ae042959"],
  ["20260723000400", "3ff175e86b79516ee896578d01b6b64fb747aa2b371187fa63f8225c09807587"],
  ["20260723000500", "15498e432dcac694af1adc696e3f824d72e184b9f96827f3e4610e66397332b2"],
  ["20260723000600", "e46fabd2cf149f9bf97d4af18add4b125e8176fc577c162fa6b8f6dc385feba5"],
  ["20260723000700", "46f5606f45599d5955081d677a3f6bc51474fc0750a7daad87963b6bf9855b4c"],
  ["20260727000750", "6536263fd8cceb15e04daa60509a5923aff8562b50e4f19810fd59948dc89154"],
  ["20260727000800", "233c4aa2d7f7fbf0fa8a034f763cbe38cd2399054641b6023a66c11cc730a3a1"],
]);
const KNOWN_CATALOG_DRIFT = ["public.rls_auto_enable"];

const REQUIRED_MEMBERS = [
  "02-production-project.json",
  "03-auth-config-sanitized.json",
  "04-backups-sanitized.json",
  "05-readonly-mode.json",
  "06-ssl-enforcement.json",
  "07-postgrest-openapi-summary.json",
  "08-relations.json",
  "09-columns.json",
  "10-constraints.json",
  "11-indexes.json",
  "12-policies.json",
  "13-functions.json",
  "14-triggers.json",
  "15-table-grants.json",
  "17-remote-migrations.json",
  "18-local-migration-authority.json",
  "19-summary.json",
  "22-evidence-sha256.txt",
];

const EXPECTED_CATALOG = {
  relations: expectedRows(`
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
  columns: expectedRows(`
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
  ]),
  constraints: expectedRows(`
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
  ]),
  indexes: expectedRows(`
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
  ]),
  policies: expectedRows(`
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
  ]),
  functions: expectedRows(`
rls_auto_enable||event_trigger|plpgsql|true|v|{search_path=pg_catalog}
set_updated_at||trigger|plpgsql|false|v|null`, [
    "function_name",
    "identity_arguments",
    "result_type",
    "language_name",
    "security_definer",
    "volatility",
    "runtime_configuration",
  ]),
  triggers: expectedRows(`
profiles|set_profiles_updated_at|O|CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at()`, [
    "relation_name",
    "trigger_name",
    "enabled_state",
    "definition",
  ]),
};

class EvidenceError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

function fail(code) {
  throw new EvidenceError(code);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function expectedRows(specification, keys) {
  return specification
    .trim()
    .split("\n")
    .map((line) => {
      const values = line.split("|");
      if (values.length !== keys.length) {
        throw new Error("Invalid expected catalog row");
      }
      return Object.fromEntries(
        keys.map((key, index) => [key, expectedValue(values[index])]),
      );
    });
}

function expectedValue(value) {
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

function parseJson(files, name) {
  try {
    return JSON.parse(files.get(name));
  } catch {
    fail(`invalid_${name.replaceAll(/[^a-z0-9]+/gi, "_")}`);
  }
}

function equalSet(actual, expected, code) {
  const normalizedActual = [...actual].sort();
  const normalizedExpected = [...expected].sort();
  if (JSON.stringify(normalizedActual) !== JSON.stringify(normalizedExpected)) {
    fail(code);
  }
}

function requireCondition(condition, code) {
  if (!condition) {
    fail(code);
  }
}

function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

function canonicalValue(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => canonicalValue(entry))
      .sort((left, right) =>
        JSON.stringify(left).localeCompare(JSON.stringify(right)),
      );
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalValue(value[key])]),
    );
  }
  return value;
}

function policyRoles(value) {
  if (typeof value !== "string" || !/^\{[^{}]*\}$/.test(value)) {
    return value;
  }
  const inner = value.slice(1, -1);
  return inner.length === 0 ? [] : inner.split(",").sort();
}

function observedCatalog(files) {
  const relations = parseJson(files, "08-relations.json");
  const columns = parseJson(files, "09-columns.json");
  const constraints = parseJson(files, "10-constraints.json");
  const indexes = parseJson(files, "11-indexes.json");
  const policies = parseJson(files, "12-policies.json");
  const functions = parseJson(files, "13-functions.json");
  const triggers = parseJson(files, "14-triggers.json");
  for (const [rows, code] of [
    [relations, "catalog_relations_invalid"],
    [columns, "catalog_columns_invalid"],
    [constraints, "catalog_constraints_invalid"],
    [indexes, "catalog_indexes_invalid"],
    [policies, "catalog_policies_invalid"],
    [functions, "catalog_functions_invalid"],
    [triggers, "catalog_triggers_invalid"],
  ]) {
    requireCondition(Array.isArray(rows), code);
  }

  return {
    relations: relations.map((row) => ({
      schema_name: row.schema_name,
      relation_name: row.relation_name,
      relation_type: row.relation_type,
      rls_enabled: row.rls_enabled,
      rls_forced: row.rls_forced,
    })),
    columns: columns.map((row) => ({
      table_name: row.table_name,
      ordinal_position: row.ordinal_position,
      column_name: row.column_name,
      data_type: row.data_type,
      udt_name: row.udt_name,
      is_nullable: row.is_nullable,
      column_default: row.column_default,
    })),
    constraints: constraints.map((row) => ({
      relation_name: row.relation_name,
      constraint_name: row.constraint_name,
      constraint_type: row.constraint_type,
      definition: row.definition,
    })),
    indexes: indexes.map((row) => ({
      relation_name: row.relation_name,
      index_name: row.index_name,
      definition: row.definition,
    })),
    policies: policies.map((row) => ({
      relation_name: row.relation_name,
      policy_name: row.policy_name,
      permissive: row.permissive,
      roles: policyRoles(row.roles),
      command: row.command,
      using_expression: row.using_expression,
      check_expression: row.check_expression,
    })),
    functions: functions.map((row) => ({
      function_name: row.function_name,
      identity_arguments: row.identity_arguments,
      result_type: row.result_type,
      language_name: row.language_name,
      security_definer: row.security_definer,
      volatility: row.volatility,
      runtime_configuration: row.runtime_configuration,
    })),
    triggers: triggers.map((row) => ({
      relation_name: row.relation_name,
      trigger_name: row.trigger_name,
      enabled_state: row.enabled_state,
      definition: row.definition,
    })),
  };
}

export function evaluateProductionEvidence(files) {
  for (const member of REQUIRED_MEMBERS) {
    requireCondition(files.has(member), "missing_required_evidence");
  }

  const project = parseJson(files, "02-production-project.json");
  requireCondition(project.name === EXPECTED_PROJECT_NAME, "wrong_project_name");
  requireCondition(
    typeof project.ref === "string" &&
      sha256(project.ref) === EXPECTED_PROJECT_REF_SHA256,
    "wrong_project_ref",
  );

  const auth = parseJson(files, "03-auth-config-sanitized.json");
  requireCondition(
    auth.provider_new_user_signup === "DISABLED",
    "provider_signup_not_disabled",
  );
  requireCondition(auth.email_provider_enabled === true, "email_login_not_enabled");

  const catalog = observedCatalog(files);
  const catalogCanonical = canonicalJson(catalog);
  requireCondition(
    catalogCanonical === canonicalJson({
      ...EXPECTED_CATALOG,
      policies: EXPECTED_CATALOG.policies.map((row) => ({
        ...row,
        roles: policyRoles(row.roles),
      })),
    }),
    "catalog_metadata_not_exact_v1_v2",
  );
  const catalogDigest = sha256(catalogCanonical);

  const tableGrants = parseJson(files, "15-table-grants.json");
  requireCondition(Array.isArray(tableGrants), "table_grants_evidence_invalid");

  const openApi = parseJson(files, "07-postgrest-openapi-summary.json");
  equalSet(
    openApi.paths,
    [
      "/",
      "/beta_feedback",
      "/career_snapshots",
      "/job_matches",
      "/profiles",
      "/resume_analyses",
      "/rpc/rls_auto_enable",
    ],
    "openapi_surface_unexpected",
  );

  const summary = parseJson(files, "19-summary.json");
  requireCondition(
    summary.relation_count === 5 &&
      summary.column_count === 40 &&
      summary.constraint_count === 13 &&
      summary.index_count === 13 &&
      summary.policy_count === 18 &&
      summary.function_count === 2 &&
      summary.trigger_count === 1,
    "catalog_summary_counts_unexpected",
  );
  requireCondition(
    summary.database_changed === false &&
      summary.auth_configuration_changed === false &&
      summary.user_data_queried === false &&
      summary.auth_user_rows_queried === false,
    "evidence_boundary_invalid",
  );

  const remoteMigrations = parseJson(files, "17-remote-migrations.json");
  requireCondition(
    remoteMigrations.available === false &&
      remoteMigrations.reason === "migration_table_not_visible" &&
      summary.migration_histories_match === "UNKNOWN" &&
      summary.remote_migration_count === null,
    "migration_history_not_unknown",
  );

  const localAuthority = parseJson(files, "18-local-migration-authority.json");
  equalSet(
    localAuthority.versions,
    EXPECTED_MIGRATION_HASHES.keys(),
    "local_migration_versions_unexpected",
  );
  const observedMigrationHashes = new Map(
    localAuthority.files.map((entry) => [
      basename(entry.path).slice(0, 14),
      entry.sha256,
    ]),
  );
  requireCondition(
    [...EXPECTED_MIGRATION_HASHES].every(
      ([version, hash]) => observedMigrationHashes.get(version) === hash,
    ),
    "local_migration_hashes_unexpected",
  );

  const backups = parseJson(files, "04-backups-sanitized.json");
  const ssl = parseJson(files, "06-ssl-enforcement.json");
  const readonly = parseJson(files, "05-readonly-mode.json");
  requireCondition(readonly.enabled === false, "readonly_inventory_unexpected");

  const blockers = [
    "production_catalog_v1_v2_only",
    "migration_history_visibility_unknown",
    "table_grant_visibility_unknown",
    "backup_count_zero",
    "pitr_disabled",
    "ssl_enforcement_disabled",
    "custom_smtp_absent",
    "captcha_disabled",
    "email_autoconfirm_enabled",
    "password_minimum_length_6",
    "untracked_rls_auto_enable_surface",
  ];
  requireCondition(backups.backup_count === 0, "backup_count_unexpected");
  requireCondition(backups.pitr_enabled === false, "pitr_state_unexpected");
  requireCondition(
    ssl.currentConfig?.database === false,
    "ssl_enforcement_state_unexpected",
  );
  requireCondition(auth.smtp_configured === false, "smtp_state_unexpected");
  requireCondition(auth.captcha_enabled === false, "captcha_state_unexpected");
  requireCondition(auth.email_autoconfirm === true, "autoconfirm_state_unexpected");
  requireCondition(
    auth.password_minimum_length === 6,
    "password_minimum_state_unexpected",
  );

  return {
    readiness: "NO_GO",
    project: EXPECTED_PROJECT_NAME,
    projectRef: "VERIFIED",
    catalogBaseline: "V1+V2",
    catalogDrift: [...KNOWN_CATALOG_DRIFT],
    catalogDigest,
    catalogPending: ["V3", "V4", "V5", "V6", "V7", "V7.1", "V8"],
    migrationHistory: "UNKNOWN_NOT_VISIBLE",
    tableGrantVisibility: "UNKNOWN_READ_ONLY_ROLE",
    providerSignup: "DISABLED",
    emailLogin: "ENABLED",
    analytics: "DISABLED_REQUIRED",
    blockers,
  };
}

function loadAndVerifyEvidence(inputPath, expectedSha256) {
  let stats;
  try {
    stats = statSync(inputPath);
  } catch {
    fail("inventory_path_unreadable");
  }

  let readMember;
  if (stats.isDirectory()) {
    requireCondition(
      expectedSha256 === undefined,
      "archive_sha_requires_zip_input",
    );
    readMember = (name) => {
      try {
        return readFileSync(join(inputPath, name));
      } catch {
        fail("evidence_member_unreadable");
      }
    };
  } else if (stats.isFile()) {
    if (expectedSha256 !== undefined) {
      requireCondition(
        /^[a-f0-9]{64}$/i.test(expectedSha256),
        "archive_sha256_invalid",
      );
      requireCondition(
        sha256(readFileSync(inputPath)) === expectedSha256.toLowerCase(),
        "archive_sha256_mismatch",
      );
    }
    const listResult = spawnSync("unzip", ["-Z1", inputPath], {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
    });
    requireCondition(listResult.status === 0, "inventory_zip_invalid");
    const members = new Set(listResult.stdout.split(/\r?\n/).filter(Boolean));
    readMember = (name) => {
      requireCondition(members.has(name), "missing_required_evidence");
      const result = spawnSync("unzip", ["-p", inputPath, name], {
        encoding: null,
        maxBuffer: 1024 * 1024,
      });
      requireCondition(result.status === 0, "evidence_member_unreadable");
      return result.stdout;
    };
  } else {
    fail("inventory_path_invalid");
  }

  const hashManifestLines = readMember("22-evidence-sha256.txt")
    .toString("utf8")
    .trim()
    .split(/\r?\n/);
  const hashManifest = hashManifestLines.map((line) =>
    line.match(/^([a-f0-9]{64})  ([0-9A-Za-z._-]+)$/i),
  );
  requireCondition(
    hashManifest.length > 0 && hashManifest.every(Boolean),
    "evidence_hash_manifest_invalid",
  );
  const hashedMembers = new Set(hashManifest.map((match) => match[2]));
  requireCondition(
    hashedMembers.size === hashManifest.length &&
      REQUIRED_MEMBERS
        .filter((member) => member !== "22-evidence-sha256.txt")
        .every((member) => hashedMembers.has(member)),
    "evidence_hash_manifest_incomplete",
  );

  const files = new Map();
  for (const member of REQUIRED_MEMBERS) {
    files.set(member, readMember(member).toString("utf8"));
  }
  for (const [, expectedHash, member] of hashManifest) {
    const bytes = readMember(member);
    requireCondition(
      sha256(bytes) === expectedHash.toLowerCase(),
      "evidence_member_hash_mismatch",
    );
  }
  return files;
}

export function inspectProductionInventory(inputPath, options = {}) {
  const files = loadAndVerifyEvidence(inputPath, options.expectedSha256);
  return evaluateProductionEvidence(files);
}

function parseArguments(argv) {
  let inputPath;
  let expectedSha256;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--sha256") {
      expectedSha256 = argv[index + 1];
      index += 1;
    } else if (argument.startsWith("-") || inputPath !== undefined) {
      fail("invalid_arguments");
    } else {
      inputPath = argument;
    }
  }
  requireCondition(typeof inputPath === "string", "inventory_argument_required");
  return { inputPath, expectedSha256 };
}

function render(result) {
  return [
    `PRODUCTION_ROLLOUT_READINESS=${result.readiness}`,
    `PROJECT=${result.project}`,
    `PROJECT_REF=${result.projectRef}`,
    `CATALOG_BASELINE=${result.catalogBaseline}`,
    `CATALOG_DRIFT=${result.catalogDrift.join(",")}`,
    `CATALOG_DIGEST=${result.catalogDigest}`,
    `CATALOG_PENDING=${result.catalogPending.join(",")}`,
    `MIGRATION_HISTORY=${result.migrationHistory}`,
    `TABLE_GRANT_VISIBILITY=${result.tableGrantVisibility}`,
    `PROVIDER_SIGNUP=${result.providerSignup}`,
    `EMAIL_LOGIN=${result.emailLogin}`,
    `ANALYTICS=${result.analytics}`,
    `BLOCKERS=${result.blockers.join(",")}`,
  ].join("\n");
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  try {
    const { inputPath, expectedSha256 } = parseArguments(process.argv.slice(2));
    const result = inspectProductionInventory(inputPath, { expectedSha256 });
    process.stdout.write(`${render(result)}\n`);
    process.exitCode = 1;
  } catch (error) {
    const code = error instanceof EvidenceError ? error.code : "unexpected_failure";
    process.stderr.write(`PRODUCTION_ROLLOUT_READINESS=INVALID_EVIDENCE\nERROR=${code}\n`);
    process.exitCode = 2;
  }
}
