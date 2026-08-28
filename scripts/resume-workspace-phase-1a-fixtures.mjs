import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(repoRoot, "src");
const authorizedBaseline = "af7be0b9433e41300f28f951f7b46a92782296ab";
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveSkillMintAlias(
  request,
  parent,
  isMain,
  options,
) {
  return request.startsWith("@/")
    ? originalResolveFilename.call(
      this,
      path.join(srcRoot, request.slice(2)),
      parent,
      isMain,
      options,
    )
    : originalResolveFilename.call(this, request, parent, isMain, options);
};

for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = function compileTypeScript(module, filename) {
    const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
      },
      fileName: filename,
    });
    module._compile(output.outputText, filename);
  };
}

const ACCOUNT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ACCOUNT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ANALYSIS_ONE = "00000000-0000-4000-8000-000000000001";
const ANALYSIS_TWO = "00000000-0000-4000-8000-0000000000ab";
const SELECTED_AT = "2026-07-27T09:30:00.000Z";
const EXPORTED_AT = "2026-07-27T10:00:00.000Z";
const V8_SHA256 =
  "233c4aa2d7f7fbf0fa8a034f763cbe38cd2399054641b6023a66c11cc730a3a1";
const ACL_NORMALIZATION_SHA256 =
  "6536263fd8cceb15e04daa60509a5923aff8562b50e4f19810fd59948dc89154";
const BASELINE_PACKAGE_LOCK_SHA256 =
  "e7223d454d346a5f5407a0989731ec7d76964be77c5f16f3bf654f0903441ae5";
const SECURITY_PACKAGE_LOCK_SHA256 =
  "4e20c5c5db9198a8a00efbaba9d56f10cd7835ac652d3f3493a1d85b98f264a8";

const FROZEN_MIGRATIONS = [
  {
    version: "20260723000100",
    source: "supabase/schema_v1.sql",
    migration: "supabase/migrations/20260723000100_schema_v1.sql",
    sha256:
      "af7a9a7314b699d1e38fe6998bc382489a33532315f188d77d0f8f739b5357e5",
  },
  {
    version: "20260723000200",
    source: "supabase/schema_v2_feedback.sql",
    migration:
      "supabase/migrations/20260723000200_schema_v2_feedback.sql",
    sha256:
      "213fae232e106ff82cd6e300fc27507d77a612dd8c5f128bd91601f114f33701",
  },
  {
    version: "20260723000300",
    source: "supabase/schema_v3_data_controls.sql",
    migration:
      "supabase/migrations/20260723000300_schema_v3_data_controls.sql",
    sha256:
      "a130483eac5ffafdbf293b3938e18dabea57a0e36c7d8617fb8bc448ae042959",
  },
  {
    version: "20260723000400",
    source: "supabase/schema_v4_account_deletion_security.sql",
    migration:
      "supabase/migrations/20260723000400_schema_v4_account_deletion_security.sql",
    sha256:
      "3ff175e86b79516ee896578d01b6b64fb747aa2b371187fa63f8225c09807587",
  },
  {
    version: "20260723000500",
    source: "supabase/schema_v5_analytics_events.sql",
    migration:
      "supabase/migrations/20260723000500_schema_v5_analytics_events.sql",
    sha256:
      "15498e432dcac694af1adc696e3f824d72e184b9f96827f3e4610e66397332b2",
  },
  {
    version: "20260723000600",
    source: "supabase/schema_v6_analytics_aggregation.sql",
    migration:
      "supabase/migrations/20260723000600_schema_v6_analytics_aggregation.sql",
    sha256:
      "e46fabd2cf149f9bf97d4af18add4b125e8176fc577c162fa6b8f6dc385feba5",
  },
  {
    version: "20260723000700",
    source: "supabase/schema_v7_analytics_acl_hardening.sql",
    migration:
      "supabase/migrations/20260723000700_schema_v7_analytics_acl_hardening.sql",
    sha256:
      "46f5606f45599d5955081d677a3f6bc51474fc0750a7daad87963b6bf9855b4c",
  },
];

const aclNormalizationVersion = "20260727000750";
const aclNormalizationSourcePath = "supabase/schema_v7_1_lifecycle_function_acl_normalization.sql";
const aclNormalizationMigrationPath = "supabase/migrations/20260727000750_lifecycle_function_acl_normalization.sql";
const aclNormalizationSource = readText(aclNormalizationSourcePath);
const aclNormalizationMigration = readText(aclNormalizationMigrationPath);

const v8SourcePath = "supabase/schema_v8_active_resume_selections.sql";
const v8MigrationPath =
  "supabase/migrations/20260727000800_schema_v8_active_resume_selections.sql";
const v8Source = readText(v8SourcePath);
const v8Migration = readText(v8MigrationPath);
const manifest = JSON.parse(readText("supabase/migrations/manifest.json"));
const generatedTypesSource = readText("src/lib/supabase/database.types.ts");
const workspaceRepositorySource = readText(
  "src/modules/resume/services/workspaceResumeRepository.ts",
);
const resumeRepositorySupportSource = readText(
  "src/modules/resume/services/resumeRepositorySupport.ts",
);
const resumeRepositorySource = readText(
  "src/modules/resume/services/resumeAnalysisRepository.ts",
);
const activeResumeStorageSource = readText(
  "src/modules/resume/services/activeResumeReportStorage.ts",
);
const resumePageSource = readText("src/app/resume/page.tsx");
const dashboardPageSource = readText("src/app/dashboard/page.tsx");
const settingsPageSource = readText("src/app/settings/data/page.tsx");
const accountRepositorySource = readText(
  "src/modules/data-controls/services/accountDataRepository.ts",
);
const accountExportContractSource = readText(
  "src/modules/data-controls/accountDataExportContract.ts",
);
const accountDataTypesSource = readText(
  "src/modules/data-controls/types.ts",
);
const trustCenterSource = readText(
  "src/modules/data-controls/trustCenterState.ts",
);
const accountDeletionRouteSource = readText(
  "src/app/api/account/delete/route.ts",
);
const accountDeletionOrchestrationSource = readText(
  "src/lib/accountDeletion/orchestration.ts",
);

let currentWorkspaceClient = null;
const clientModulePath = require.resolve("../src/lib/supabase/client.ts");
const configModulePath = require.resolve("../src/lib/supabase/config.ts");
require.cache[clientModulePath] = moduleStub(clientModulePath, {
  createSupabaseBrowserClient: () => currentWorkspaceClient,
});
require.cache[configModulePath] = moduleStub(configModulePath, {
  getSupabaseConfigStatus: () => ({
    isConfigured: true,
    message: "Configured for deterministic fixture.",
  }),
});

const {
  clearCurrentUserWorkspaceResumeSelection,
  resolveCurrentUserWorkspaceResume,
  setCurrentUserWorkspaceResumeSelection,
} = require("../src/modules/resume/services/workspaceResumeRepository.ts");
const {
  deleteCurrentUserResumeAnalysis,
  listCurrentUserResumeAnalyses,
} = require("../src/modules/resume/services/resumeAnalysisRepository.ts");
const {
  ACCOUNT_EXPORT_LIMITS,
  buildAccountDataExportWithAdapter,
} = require("../src/modules/data-controls/services/accountDataRepository.ts");
const {
  ACCOUNT_EXPORT_TABLE_CONTRACTS,
  ACCOUNT_EXPORT_TABLE_ORDER,
} = require("../src/modules/data-controls/accountDataExportContract.ts");
const {
  getAccountCountsPresentation,
} = require("../src/modules/data-controls/trustCenterState.ts");
const {
  runAccountDeletionOrchestration,
} = require("../src/lib/accountDeletion/orchestration.ts");
const {
  ACCOUNT_DELETE_CONFIRMATION,
} = require("../src/lib/accountDeletion/contract.ts");
const {
  getSkillMintStorageDescriptors,
} = require("../src/lib/storage/skillMintStorageRegistry.ts");

const tests = [];

function test(name, callback) {
  tests.push({ name, callback });
}

test("V1-V7 retain their authorized hashes, byte identity, and zero diff", () => {
  const frozenPaths = [];

  for (const contract of FROZEN_MIGRATIONS) {
    const source = readBuffer(contract.source);
    const migration = readBuffer(contract.migration);
    assert.equal(sha256(source), contract.sha256, contract.source);
    assert.equal(sha256(migration), contract.sha256, contract.migration);
    assert.equal(source.equals(migration), true, contract.version);
    frozenPaths.push(contract.source, contract.migration);
  }

  assertGitZeroDiff(frozenPaths);
});

test("ACL normalization and V8 source, migration, hashes, and frozen order prefix are exact", () => {
  assert.equal(aclNormalizationSource, aclNormalizationMigration);
  assert.equal(
    Buffer.compare(
      readBuffer(aclNormalizationSourcePath),
      readBuffer(aclNormalizationMigrationPath),
    ),
    0,
  );
  assert.equal(
    sha256(readBuffer(aclNormalizationSourcePath)),
    ACL_NORMALIZATION_SHA256,
  );
  assert.equal(
    sha256(readBuffer(aclNormalizationMigrationPath)),
    ACL_NORMALIZATION_SHA256,
  );

  assert.equal(v8Source, v8Migration);
  assert.equal(
    Buffer.compare(readBuffer(v8SourcePath), readBuffer(v8MigrationPath)),
    0,
  );
  assert.equal(sha256(readBuffer(v8SourcePath)), V8_SHA256);
  assert.equal(sha256(readBuffer(v8MigrationPath)), V8_SHA256);

  const expectedVersions = [
    ...FROZEN_MIGRATIONS.map((entry) => entry.version),
    aclNormalizationVersion,
    "20260727000800",
    "20260730000900",
  ];

  assert.deepEqual(
    manifest.ordered_migrations
      .map((entry) => entry.version)
      .slice(0, expectedVersions.length),
    expectedVersions,
  );

  assert.deepEqual(
    manifest.ordered_migrations.find(
      (entry) => entry.version === aclNormalizationVersion,
    ),
    {
      version: aclNormalizationVersion,
      source_path: aclNormalizationSourcePath,
      migration_path: aclNormalizationMigrationPath,
      sha256: ACL_NORMALIZATION_SHA256,
      rollout_classification:
        "pending_lifecycle_function_acl_normalization",
    },
  );

  assert.deepEqual(
    manifest.ordered_migrations.find(
      (entry) => entry.version === "20260727000800",
    ),
    {
      version: "20260727000800",
      source_path: v8SourcePath,
      migration_path: v8MigrationPath,
      sha256: V8_SHA256,
      rollout_classification: "pending_resume_workspace_phase_1a",
    },
  );

  assert.deepEqual(
    manifest.generated_for.empty_isolated_project.apply_in_order
      .slice(0, expectedVersions.length),
    expectedVersions,
  );

  assert.deepEqual(
    manifest.generated_for.production.pending_execution.filter((version) =>
      [aclNormalizationVersion, "20260727000800", "20260730000900"].includes(version)
    ),
    [aclNormalizationVersion, "20260727000800", "20260730000900"],
  );

  assert.equal(
    manifest.generated_for.production
      .catalog_proof_required_before_marking_applied
      .includes(aclNormalizationVersion),
    false,
  );
});

test("Lifecycle ACL normalization is transactional and narrowly scoped", () => {
  assert.match(
    aclNormalizationSource,
    /\nbegin;\n\ndo \$acl_normalization_preflight\$/,
  );
  assert.match(
    aclNormalizationSource,
    /do \$acl_normalization_postflight\$/,
  );
  assert.match(
    aclNormalizationSource,
    /revoke execute\s+on function public\.is_active_skillmint_user\(\)\s+from service_role;/,
  );
  assert.match(
    aclNormalizationSource,
    /revoke execute\s+on function public\.delete_current_user_saved_reports\(\)\s+from service_role;/,
  );
  assert.doesNotMatch(
    aclNormalizationSource,
    /revoke execute\s+on function public\.prepare_account_deletion\(uuid\)/,
  );
  assert.match(
    aclNormalizationSource,
    /\$acl_normalization_postflight\$;\n\ncommit;\s*$/,
  );
});

test("V8 is transactional and has explicit fail-closed preflight/postflight", () => {
  assert.match(v8Source, /\nbegin;\n\ndo \$v8_preflight\$/);
  assert.match(v8Source, /\$v8_preflight\$;\n\nalter table public\.resume_analyses/);
  assert.match(v8Source, /do \$v8_postflight\$/);
  assert.match(v8Source, /\$v8_postflight\$;\n\ncommit;\s*$/);

  const preflight = sliceSource(
    v8Source,
    "do $v8_preflight$",
    "$v8_preflight$;",
  );
  const postflight = sliceSource(
    v8Source,
    "do $v8_postflight$",
    "$v8_postflight$;",
  );

  assert.match(preflight, /Required SkillMint database roles are missing/);
  assert.match(preflight, /Required SkillMint table is missing/);
  assert.match(preflight, /V8 objects already exist or the baseline is incompatible/);
  assert.match(preflight, /resume_analyses ownership, columns, RLS, or keys are incompatible/);
  assert.match(preflight, /resume_analyses indexes are incompatible/);
  assert.match(preflight, /Required SkillMint lifecycle functions are missing/);
  assert.match(preflight, /is_active_skillmint_user\(\) has an incompatible contract/);
  assert.match(preflight, /delete_current_user_saved_reports\(\) has an incompatible contract/);
  assert.match(preflight, /prepare_account_deletion\(uuid\) has an incompatible contract/);
  assert(countMatches(preflight, /raise exception/gi) >= 9);

  assert.match(postflight, /table verification failed/);
  assert.match(postflight, /constraint verification failed/);
  assert.match(postflight, /trigger verification failed/);
  assert.match(postflight, /policy verification failed/);
  assert.match(postflight, /privileges are incompatible/);
  assert.match(postflight, /lifecycle function verification failed/);
  assert.match(postflight, /account-deletion function verification failed/);
  assert(countMatches(postflight, /raise exception/gi) >= 9);
});

test("V8 schema uses the exact owner-qualified selection model and indexes", () => {
  const tableDefinition = sliceSource(
    v8Source,
    "create table public.active_resume_selections (",
    "alter table public.active_resume_selections owner to postgres;",
  );
  const columnNames = [...tableDefinition.matchAll(
    /^\s{2}(user_id|resume_analysis_id|selected_at)\s+/gm,
  )].map((match) => match[1]);

  assert.deepEqual(columnNames, [
    "user_id",
    "resume_analysis_id",
    "selected_at",
  ]);
  assert.match(tableDefinition, /user_id uuid not null/);
  assert.match(tableDefinition, /resume_analysis_id uuid not null/);
  assert.match(
    tableDefinition,
    /selected_at timestamptz not null default pg_catalog\.now\(\)/,
  );
  assert.match(
    tableDefinition,
    /active_resume_selections_pkey\s+primary key \(user_id\)/,
  );
  assert.match(
    tableDefinition,
    /foreign key \(user_id\)\s+references auth\.users\(id\)\s+on delete cascade/,
  );
  assert.match(
    tableDefinition,
    /foreign key \(user_id, resume_analysis_id\)\s+references public\.resume_analyses\(user_id, id\)\s+on delete cascade/,
  );
  assert.doesNotMatch(
    tableDefinition,
    /foreign key\s*\(\s*resume_analysis_id\s*\)/,
  );
  assert.equal(countMatches(tableDefinition, /^\s{2}constraint /gm), 3);

  assert.match(
    v8Source,
    /add constraint resume_analyses_user_id_id_key\s+unique \(user_id, id\)/,
  );
  assert.match(
    v8Source,
    /drop index public\.resume_analyses_user_id_id_idx;/,
  );
  assert.doesNotMatch(
    v8Source,
    /drop index public\.resume_analyses_user_id_created_at_id_idx/,
  );
  assert.match(
    v8Source,
    /public\.resume_analyses_user_id_created_at_id_idx'\s*\)\s*is null/,
  );
  assert.match(
    v8Source,
    /alter table public\.active_resume_selections enable row level security;/,
  );
});

test("V8 trigger makes selected_at database-controlled and user_id immutable", () => {
  const triggerFunction = sliceSource(
    v8Source,
    "create function public.enforce_active_resume_selection_write()",
    "alter function public.enforce_active_resume_selection_write()",
  );

  assert.match(triggerFunction, /returns trigger/);
  assert.match(triggerFunction, /security invoker/);
  assert.match(triggerFunction, /set search_path = pg_catalog/);
  assert.match(
    triggerFunction,
    /if tg_op = 'INSERT' then\s+new\.selected_at := pg_catalog\.statement_timestamp\(\)/,
  );
  assert.match(
    triggerFunction,
    /new\.user_id is distinct from old\.user_id[\s\S]*user_id is immutable/,
  );
  assert.match(
    triggerFunction,
    /new\.resume_analysis_id is distinct from old\.resume_analysis_id[\s\S]*new\.selected_at := pg_catalog\.statement_timestamp\(\)[\s\S]*else\s+new\.selected_at := old\.selected_at/,
  );
  assert.doesNotMatch(triggerFunction, /updated_at/i);
  assert.match(
    v8Source,
    /before insert or update on public\.active_resume_selections/,
  );
  assert.match(
    v8Source,
    /revoke all on function public\.enforce_active_resume_selection_write\(\)\s+from public, anon, authenticated, service_role;/,
  );

  const grantArea = sliceSource(
    v8Source,
    "grant select (",
    "create policy \"Users can select their own active resume selection\"",
  );
  assert.match(
    grantArea,
    /grant select \(\s*user_id,\s*resume_analysis_id,\s*selected_at\s*\)[\s\S]*to authenticated;/,
  );
  assert.match(
    grantArea,
    /grant insert \(\s*user_id,\s*resume_analysis_id\s*\)[\s\S]*to authenticated;/,
  );
  assert.match(
    grantArea,
    /grant update \(\s*resume_analysis_id\s*\)[\s\S]*to authenticated;/,
  );
  assert.match(
    grantArea,
    /grant delete\s+on table public\.active_resume_selections\s+to authenticated;/,
  );
  assert.doesNotMatch(grantArea, /grant insert \([^)]*selected_at/i);
  assert.doesNotMatch(grantArea, /grant update \([^)]*(?:user_id|selected_at)/i);
  assert.doesNotMatch(grantArea, /to (?:public|anon|service_role)/i);
});

test("V8 RLS, table ACL, policy, and hardened function checks are exact", () => {
  const policyArea = sliceSource(
    v8Source,
    "create policy \"Users can select their own active resume selection\"",
    "create or replace function public.delete_current_user_saved_reports()",
  );
  const postflight = sliceSource(
    v8Source,
    "do $v8_postflight$",
    "$v8_postflight$;",
  );

  assert.equal(countMatches(policyArea, /create policy /g), 4);
  assert.equal(countMatches(policyArea, /public\.is_active_skillmint_user\(\)/g), 5);
  assert.equal(countMatches(policyArea, /auth\.uid\(\) = user_id/g), 5);
  assert.match(policyArea, /for select\s+to authenticated\s+using/);
  assert.match(policyArea, /for insert\s+to authenticated\s+with check/);
  assert.match(
    policyArea,
    /for update\s+to authenticated\s+using \([\s\S]*\)\s+with check \(/,
  );
  assert.match(policyArea, /for delete\s+to authenticated\s+using/);
  assert.match(
    v8Source,
    /revoke all privileges\s+on table public\.active_resume_selections\s+from public, anon, authenticated, service_role;/,
  );
  assert.match(postflight, /pg_catalog\.pg_policy/);
  assert.match(postflight, /count\(distinct polcmd\)/);
  assert.match(postflight, /array\[authenticated_oid\]::oid\[\]/);
  assert.match(postflight, /foreach required_role_name in array array\['anon', 'service_role'\]/);
  assert.match(postflight, /has_any_column_privilege/);
  assert.match(postflight, /'selected_at',\s+'INSERT'/);
  assert.match(postflight, /'selected_at',\s+'UPDATE'/);
  assert.match(postflight, /acl_row\.grantee <> proowner/);
});

test("V8 deletion functions preserve public shape and add protected lifecycle proof", () => {
  const savedReportsFunction = sliceSource(
    v8Source,
    "create or replace function public.delete_current_user_saved_reports()",
    "alter function public.delete_current_user_saved_reports() owner to postgres;",
  );
  const protectedFunction = sliceSource(
    v8Source,
    "create function public.prepare_account_deletion(target_user_id uuid)",
    "alter function public.prepare_account_deletion(uuid) owner to postgres;",
  );

  assert.match(
    savedReportsFunction,
    /returns table \(\s*resume_analyses_deleted integer,\s*job_matches_deleted integer,\s*career_snapshots_deleted integer\s*\)/,
  );
  assert.doesNotMatch(
    sliceSource(savedReportsFunction, "returns table (", ")"),
    /active_resume_selections_deleted/,
  );
  assert.match(savedReportsFunction, /security definer/);
  assert.match(savedReportsFunction, /set search_path = pg_catalog/);
  assert.match(savedReportsFunction, /current_user_id uuid := auth\.uid\(\)/);
  assert.match(savedReportsFunction, /public\.is_active_skillmint_user\(\)/);
  assert(
    savedReportsFunction.indexOf("delete from public.active_resume_selections") <
      savedReportsFunction.indexOf("delete from public.resume_analyses"),
  );
  assert.match(savedReportsFunction, /Workspace resume selection cleanup verification failed/);
  assert.match(
    v8Source,
    /grant execute on function public\.delete_current_user_saved_reports\(\)\s+to authenticated;/,
  );

  assert.match(v8Source, /drop function public\.prepare_account_deletion\(uuid\);/);
  assert.match(protectedFunction, /target_user_id is null/);
  assert.match(protectedFunction, /active_resume_selections_deleted integer/);
  assert.match(protectedFunction, /verified_absent boolean/);
  assert(
    protectedFunction.indexOf("delete from public.active_resume_selections") <
      protectedFunction.indexOf("delete from public.resume_analyses"),
  );
  assert.match(
    protectedFunction,
    /into active_resume_selections_deleted/,
  );
  assert.match(
    sliceSource(protectedFunction, "verified_absent := not exists", "if not verified_absent"),
    /from public\.active_resume_selections/,
  );
  assert.match(protectedFunction, /Account data cleanup verification failed/);
  assert.match(protectedFunction, /security definer/);
  assert.match(protectedFunction, /set search_path = pg_catalog/);
  assert.match(
    v8Source,
    /revoke all on function public\.prepare_account_deletion\(uuid\)\s+from public, anon, authenticated, service_role;/,
  );
  assert.match(
    v8Source,
    /grant execute on function public\.prepare_account_deletion\(uuid\)\s+to service_role;/,
  );
});

test("generated Supabase types expose the exact V8 table and function shapes", () => {
  const tableTypes = sliceSource(
    generatedTypesSource,
    "active_resume_selections: {",
    "analytics_events: {",
  );
  const savedReportsTypes = sliceSource(
    generatedTypesSource,
    "delete_current_user_saved_reports: {",
    "get_founder_analytics_summary: {",
  );
  const protectedTypes = sliceSource(
    generatedTypesSource,
    "prepare_account_deletion: {",
    "purge_expired_analytics_events: {",
  );

  assert.match(
    tableTypes,
    /Row: \{\s*resume_analysis_id: string\s*selected_at: string\s*user_id: string\s*\}/,
  );
  assert.match(
    tableTypes,
    /Insert: \{\s*resume_analysis_id: string\s*selected_at\?: string\s*user_id: string\s*\}/,
  );
  assert.match(
    tableTypes,
    /Update: \{\s*resume_analysis_id\?: string\s*selected_at\?: string\s*user_id\?: string\s*\}/,
  );
  assert.match(
    tableTypes,
    /foreignKeyName: "active_resume_selections_user_id_resume_analysis_id_fkey"/,
  );
  assert.match(tableTypes, /columns: \["user_id", "resume_analysis_id"\]/);
  assert.match(tableTypes, /referencedColumns: \["user_id", "id"\]/);
  assert.doesNotMatch(savedReportsTypes, /active_resume_selections_deleted/);
  assert.match(protectedTypes, /active_resume_selections_deleted: number/);
  assert.match(protectedTypes, /verified_absent: boolean/);
});

test("workspace repository is generated-type-backed, owner-qualified, and timestamp-safe", () => {
  assert.doesNotMatch(workspaceRepositorySource, /\bany\b/);
  assert.doesNotMatch(workspaceRepositorySource, /\bas\s+(?:User|WorkspaceResumeSelection)/);
  assert.match(
    workspaceRepositorySource,
    /Database\["public"\]\["Tables"\]\["active_resume_selections"\]\["Insert"\]/,
  );
  assert.match(
    workspaceRepositorySource,
    /Database\["public"\]\["Tables"\]\["active_resume_selections"\]\["Update"\]/,
  );
  assert.doesNotMatch(workspaceRepositorySource, /\bselected_at\s*:/);
  assert.match(
    workspaceRepositorySource,
    /const updateInput: WorkspaceSelectionUpdate = \{\s*resume_analysis_id: resumeAnalysisId,\s*\}/,
  );
  assert.match(
    workspaceRepositorySource,
    /const insertInput: WorkspaceSelectionInsert = \{\s*user_id: user\.id,\s*resume_analysis_id: resumeAnalysisId,\s*\}/,
  );
  assert.equal(
    countMatches(
      workspaceRepositorySource,
      /expectedUserId: string \| null/g,
    ),
    4,
  );

  const exactRead = sliceSource(
    workspaceRepositorySource,
    "async function executeExactAnalysisRead(",
    "function parseSingleSelectionResponse(",
  );
  assert.match(exactRead, /\.from\("resume_analyses"\)/);
  assert.match(exactRead, /\.eq\("user_id", ownerId\)/);
  assert.match(exactRead, /\.eq\("id", analysisId\)/);
  assert.match(exactRead, /\.limit\(2\)/);
  assert.doesNotMatch(exactRead, /\.order\(/);
  assert.doesNotMatch(workspaceRepositorySource, /getLatestCurrentUserResumeAnalysis/);
  assert.doesNotMatch(workspaceRepositorySource, /\.order\(/);
  assert.match(workspaceRepositorySource, /hasExactKeys\(value, SELECTION_ROW_KEYS\)/);
  assert.match(workspaceRepositorySource, /selection\.userId !== expectedOwnerId/);
  assert.match(workspaceRepositorySource, /analysis\.userId !== ownerId/);
  assert.match(workspaceRepositorySource, /analysis\.id !== analysisId/);
  assert.match(workspaceRepositorySource, /confirmResumeOwner/);
  assert.match(
    resumeRepositorySupportSource,
    /authenticateResumeOwner[\s\S]*supabase\.auth\.getUser\(\)/,
  );
  assert.match(
    resumeRepositorySupportSource,
    /confirmResumeOwner[\s\S]*currentUserId !== expectedUserId/,
  );
  assert.match(
    workspaceRepositorySource,
    /const reason = insertResponse\.error\.code === "23505"[\s\S]*\? "selection_conflict"/,
  );
  assert.match(workspaceRepositorySource, /workspaceFailure\(\s*reason,/);
  assert.doesNotMatch(
    workspaceRepositorySource,
    /localStorage|sessionStorage|skillmint:|fireAndForgetAnalytics|analytics\./,
  );
  assert.match(
    resumeRepositorySource,
    /getLatestCurrentUserResumeAnalysis\(\s*options: ResumeAnalysisRepositoryOptions/,
  );
  assert.match(
    resumeRepositorySource,
    /listCurrentUserResumeAnalyses\([\s\S]*options: ResumeAnalysisRepositoryOptions/,
  );
  assert.match(
    resumeRepositorySource,
    /deleteCurrentUserResumeAnalysis\([\s\S]*options: ResumeAnalysisRepositoryOptions/,
  );
  assert.match(
    resumeRepositorySource,
    /\.eq\("id", id\)\s*\.eq\("user_id", ownerId\)/,
  );
  assert.match(resumeRepositorySource, /confirmResumeOwner/);
});

test("workspace repository runtime enforces owner checkpoints and exact analysis lookup", async () => {
  currentWorkspaceClient = createWorkspaceClient({
    identities: [ACCOUNT_A, ACCOUNT_A],
    respond(query) {
      if (query.table === "resume_analyses") {
        return okResponse(createAnalysis(ANALYSIS_TWO));
      }
      if (query.table === "active_resume_selections" && query.operation === "select") {
        return okResponse(createSelection(ANALYSIS_TWO));
      }
      throw new Error(`Unexpected query ${query.table}:${query.operation}`);
    },
  });

  const resolved = await resolveCurrentUserWorkspaceResume(ACCOUNT_A);
  assert.equal(resolved.ok, true);
  assert.equal(resolved.data.status, "selected");
  assert.equal(resolved.data.analysis.id, ANALYSIS_TWO);
  assert.equal(currentWorkspaceClient.observed.identityCalls, 2);

  const exactQuery = currentWorkspaceClient.observed.queries.find(
    (query) => query.table === "resume_analyses",
  );
  assert.deepEqual(exactQuery.filters, [
    ["user_id", ACCOUNT_A],
    ["id", ANALYSIS_TWO],
  ]);
  assert.equal(
    currentWorkspaceClient.observed.queries.filter(
      (query) => query.table === "active_resume_selections",
    ).length,
    2,
  );

  currentWorkspaceClient = createWorkspaceClient({
    identities: [ACCOUNT_A, ACCOUNT_A],
    respond(query) {
      if (query.table === "active_resume_selections") {
        return okResponse(createSelection(ANALYSIS_TWO));
      }
      if (query.table === "resume_analyses") return okResponse([]);
      throw new Error("Unexpected query");
    },
  });
  const deletedSource = await resolveCurrentUserWorkspaceResume(ACCOUNT_A);
  assert.equal(deletedSource.ok, true);
  assert.equal(deletedSource.data.status, "source_deleted");

  currentWorkspaceClient = createWorkspaceClient({
    identities: [ACCOUNT_A, ACCOUNT_A],
    respond(query) {
      if (query.table === "active_resume_selections") return okResponse([]);
      throw new Error("No analysis query is allowed without a selection");
    },
  });
  const absent = await resolveCurrentUserWorkspaceResume(ACCOUNT_A);
  assert.equal(absent.ok, true);
  assert.equal(absent.data.status, "none");
  assert.equal(
    currentWorkspaceClient.observed.queries.some(
      (query) => query.table === "resume_analyses",
    ),
    false,
  );
});

test("workspace set, replace, clear, malformed rows, and account changes fail closed", async () => {
  currentWorkspaceClient = createWorkspaceClient({
    identities: [ACCOUNT_A, ACCOUNT_A],
    respond(query) {
      if (query.table === "resume_analyses") {
        return okResponse(createAnalysis(ANALYSIS_TWO));
      }
      if (query.table === "active_resume_selections" && query.operation === "update") {
        return okResponse([]);
      }
      if (query.table === "active_resume_selections" && query.operation === "insert") {
        return okResponse(createSelection(ANALYSIS_TWO));
      }
      if (query.table === "active_resume_selections" && query.operation === "select") {
        return okResponse(createSelection(ANALYSIS_TWO));
      }
      throw new Error(`Unexpected query ${query.table}:${query.operation}`);
    },
  });
  const setResult = await setCurrentUserWorkspaceResumeSelection(
    ANALYSIS_TWO,
    ACCOUNT_A,
  );
  assert.equal(setResult.ok, true);
  const updateQuery = currentWorkspaceClient.observed.queries.find(
    (query) => query.operation === "update",
  );
  const insertQuery = currentWorkspaceClient.observed.queries.find(
    (query) => query.operation === "insert",
  );
  assert.deepEqual(updateQuery.payload, {
    resume_analysis_id: ANALYSIS_TWO,
  });
  assert.deepEqual(insertQuery.payload, {
    user_id: ACCOUNT_A,
    resume_analysis_id: ANALYSIS_TWO,
  });
  assert.equal("selected_at" in updateQuery.payload, false);
  assert.equal("selected_at" in insertQuery.payload, false);
  assert.deepEqual(updateQuery.filters, [["user_id", ACCOUNT_A]]);

  currentWorkspaceClient = createWorkspaceClient({
    identities: [ACCOUNT_A, ACCOUNT_B],
    respond(query) {
      if (query.table === "resume_analyses") {
        return okResponse(createAnalysis(ANALYSIS_TWO));
      }
      if (query.operation === "update") {
        return okResponse(createSelection(ANALYSIS_TWO));
      }
      throw new Error("Unexpected query");
    },
  });
  const switched = await setCurrentUserWorkspaceResumeSelection(
    ANALYSIS_TWO,
    ACCOUNT_A,
  );
  assertFailure(switched, "account_changed");

  currentWorkspaceClient = createWorkspaceClient({
    identities: [ACCOUNT_A, ACCOUNT_A],
    respond(query) {
      if (query.table === "active_resume_selections") {
        return okResponse([
          createSelection(ANALYSIS_ONE),
          createSelection(ANALYSIS_TWO),
        ]);
      }
      throw new Error("Malformed selection must stop resolution");
    },
  });
  const malformed = await resolveCurrentUserWorkspaceResume(ACCOUNT_A);
  assertFailure(malformed, "invalid_response");

  currentWorkspaceClient = createWorkspaceClient({
    identities: [ACCOUNT_A, ACCOUNT_A],
    respond(query) {
      if (query.operation === "delete") {
        return okResponse(createSelection(ANALYSIS_TWO));
      }
      if (query.operation === "select") {
        return okResponse([]);
      }
      throw new Error("Unexpected query");
    },
  });
  const cleared = await clearCurrentUserWorkspaceResumeSelection(ACCOUNT_A);
  assert.equal(cleared.ok, true);
  assert.equal(cleared.data.cleared, true);
  const deleteQuery = currentWorkspaceClient.observed.queries[0];
  assert.deepEqual(deleteQuery.filters, [["user_id", ACCOUNT_A]]);

  currentWorkspaceClient = createWorkspaceClient({
    identities: [ACCOUNT_A, ACCOUNT_A],
    respond(query) {
      if (query.table === "resume_analyses") {
        return okResponse(createAnalysis(ANALYSIS_TWO));
      }
      if (query.operation === "update") {
        return okResponse(createSelection(ANALYSIS_TWO));
      }
      if (query.operation === "select") {
        return okResponse(createSelection(ANALYSIS_ONE));
      }
      throw new Error("Unexpected query");
    },
  });
  const replacedByConcurrentSet =
    await setCurrentUserWorkspaceResumeSelection(ANALYSIS_TWO, ACCOUNT_A);
  assertFailure(replacedByConcurrentSet, "selection_conflict");

  currentWorkspaceClient = createWorkspaceClient({
    identities: [ACCOUNT_A, ACCOUNT_A],
    respond(query) {
      if (query.operation === "delete") {
        return okResponse(createSelection(ANALYSIS_TWO));
      }
      if (query.operation === "select") {
        return okResponse(createSelection(ANALYSIS_ONE));
      }
      throw new Error("Unexpected query");
    },
  });
  const replacedAfterClear =
    await clearCurrentUserWorkspaceResumeSelection(ACCOUNT_A);
  assertFailure(replacedAfterClear, "selection_conflict");

  const callsBeforeRejectedOwner = currentWorkspaceClient.observed.identityCalls;
  const rejectedOwner = await setCurrentUserWorkspaceResumeSelection(
    ANALYSIS_TWO,
    null,
  );
  assertFailure(rejectedOwner, "not_authenticated");
  assert.equal(
    currentWorkspaceClient.observed.identityCalls,
    callsBeforeRejectedOwner,
  );
});

test("saved-analysis reads and deletes discard late results after an account change", async () => {
  currentWorkspaceClient = createWorkspaceClient({
    identities: [ACCOUNT_A, ACCOUNT_B],
    respond(query) {
      if (query.table === "resume_analyses" && query.operation === "select") {
        return okResponse(createAnalysis(ANALYSIS_TWO));
      }
      throw new Error("Unexpected list query");
    },
  });
  const staleList = await listCurrentUserResumeAnalyses(10, {
    expectedUserId: ACCOUNT_A,
  });
  assertFailure(staleList, "account_changed");

  currentWorkspaceClient = createWorkspaceClient({
    identities: [ACCOUNT_A, ACCOUNT_B],
    respond(query) {
      if (query.table === "resume_analyses" && query.operation === "delete") {
        return okResponse({
          id: ANALYSIS_TWO,
          user_id: ACCOUNT_A,
        });
      }
      throw new Error("Unexpected delete query");
    },
  });
  const staleDelete = await deleteCurrentUserResumeAnalysis(
    ANALYSIS_TWO,
    { expectedUserId: ACCOUNT_A },
  );
  assertFailure(staleDelete, "account_changed");
});

test("account counts expose a separate fail-closed zero-or-one selection count", () => {
  assert.match(
    accountRepositorySource,
    /getCount\(supabase, "active_resume_selections", "user_id", userId\)/,
  );
  assert.match(
    accountRepositorySource,
    /workspaceResumeSelectionCount\.data > 1/,
  );
  assert.match(
    accountRepositorySource,
    /workspaceResumeSelection: workspaceResumeSelectionCount\.data/,
  );
  assert.match(
    trustCenterSource,
    /"workspaceResumeSelection"/,
  );
  assert.match(
    trustCenterSource,
    /record\.workspaceResumeSelection as number\) <= 1/,
  );
  assert.match(settingsPageSource, /label="Workspace resume selection"/);

  const valid = getAccountCountsPresentation({
    isAuthLoading: false,
    isConfigured: true,
    currentUserId: ACCOUNT_A,
    currentOwnerKey: `trust-center:account:${ACCOUNT_A}`,
    currentContextEpoch: 2,
    state: {
      ownerKey: `trust-center:account:${ACCOUNT_A}`,
      request: {
        ownerKey: `trust-center:account:${ACCOUNT_A}`,
        contextEpoch: 2,
        requestToken: 1,
      },
      status: "ready",
      data: {
        profile: 1,
        resumeAnalyses: 4,
        workspaceResumeSelection: 1,
        jobMatches: 2,
        careerSnapshots: 0,
        betaFeedback: 3,
        accountPersona: 0,
        proofBriefs: 0,
        recruiterRoleMaps: 0,
        candidateEvidenceReviews: 0,
      },
      error: null,
    },
  });
  assert.equal(valid.status, "ready");
  assert.equal(valid.countDisplay.workspaceResumeSelection, "1");

  const invalid = getAccountCountsPresentation({
    isAuthLoading: false,
    isConfigured: true,
    currentUserId: ACCOUNT_A,
    currentOwnerKey: `trust-center:account:${ACCOUNT_A}`,
    currentContextEpoch: 2,
    state: {
      ownerKey: `trust-center:account:${ACCOUNT_A}`,
      request: {
        ownerKey: `trust-center:account:${ACCOUNT_A}`,
        contextEpoch: 2,
        requestToken: 2,
      },
      status: "ready",
      data: {
        profile: 1,
        resumeAnalyses: 4,
        workspaceResumeSelection: 2,
        jobMatches: 2,
        careerSnapshots: 0,
        betaFeedback: 3,
        accountPersona: 0,
        proofBriefs: 0,
        recruiterRoleMaps: 0,
        candidateEvidenceReviews: 0,
      },
      error: null,
    },
  });
  assert.equal(invalid.status, "error");
  assert.equal(invalid.counts, null);
});

test("account export v5/v4 validates, reconciles, and omits owner identity", async () => {
  assert.deepEqual([...ACCOUNT_EXPORT_TABLE_ORDER], [
    "profiles",
    "resume_analyses",
    "active_resume_selections",
    "job_matches",
    "career_snapshots",
    "beta_feedback",
    "account_personas",
    "proof_briefs",
    "recruiter_role_evidence_maps",
    "candidate_evidence_reviews",
  ]);
  assert.deepEqual(ACCOUNT_EXPORT_TABLE_CONTRACTS.active_resume_selections, {
    tableName: "active_resume_selections",
    ownerColumn: "user_id",
    cardinality: "zero_or_one",
    selectedColumns: "user_id,resume_analysis_id,selected_at",
    primaryKey: "user_id",
    pagination: "none",
    internalFieldsExcluded: ["user_id"],
    reconstructRow:
      ACCOUNT_EXPORT_TABLE_CONTRACTS.active_resume_selections.reconstructRow,
  });
  assert.deepEqual(ACCOUNT_EXPORT_LIMITS, {
    pageSize: 250,
    maxPagesPerTable: 100,
    maxRowsPerTable: 25_000,
    maxTotalRows: 50_000,
    maxSerializedBytes: 10 * 1024 * 1024,
  });
  assert.match(
    accountDataTypesSource,
    /exportVersion: "skillmint-account-export-v5"/,
  );
  assert.match(
    accountDataTypesSource,
    /schemaContractVersion: "skillmint-account-contract-v4"/,
  );
  assert.match(
    accountDataTypesSource,
    /active_resume_selections: WorkspaceResumeSelectionExportRow\[\]/,
  );

  const adapter = createExportAdapter({
    resumeAnalyses: [
      createExportAnalysis(ANALYSIS_TWO),
      createExportAnalysis(ANALYSIS_ONE),
    ],
    selections: [
      createSelection(ANALYSIS_TWO.toUpperCase()),
    ],
  });
  const result = await buildAccountDataExportWithAdapter(
    adapter,
    EXPORTED_AT,
    {
      expectedUserId: ACCOUNT_A,
      limits: { pageSize: 1 },
    },
  );
  assert.equal(result.ok, true);
  const payload = JSON.parse(result.data.json);
  assert.equal(payload.exportVersion, "skillmint-account-export-v5");
  assert.equal(
    payload.schemaContractVersion,
    "skillmint-account-contract-v4",
  );
  assert.deepEqual(payload.data.active_resume_selections, [{
    resume_analysis_id: ANALYSIS_TWO.toUpperCase(),
    selected_at: SELECTED_AT,
  }]);
  assert.equal(
    "user_id" in payload.data.active_resume_selections[0],
    false,
  );
  assert.deepEqual(
    payload.manifest.tables.active_resume_selections.pagination,
    {
      strategy: "none",
      queryCompleted: true,
      pagesFetched: 1,
    },
  );
  assert.equal(adapter.observed.selectionLimit, 2);
  assert.equal(adapter.observed.resumePageCalls, 2);
  assert.equal(adapter.observed.identityCalls, 11);
  assert(
    adapter.observed.ownerFilters.some(
      (filter) =>
        JSON.stringify(filter) === JSON.stringify([
          "active_resume_selections",
          "user_id",
          ACCOUNT_A,
        ]),
    ),
  );
});

test("account export rejects malformed, cross-owner, duplicate, stale, and orphan selections", async () => {
  const validAnalysis = createExportAnalysis(ANALYSIS_TWO);
  const invalidSelections = [
    {
      ...createSelection(ANALYSIS_TWO),
      user_id: ACCOUNT_B,
    },
    {
      ...createSelection(ANALYSIS_TWO),
      resume_analysis_id: "not-a-uuid",
    },
    {
      ...createSelection(ANALYSIS_TWO),
      selected_at: "2026-02-30T00:00:00.000Z",
    },
    {
      ...createSelection(ANALYSIS_TWO),
      unexpected: true,
    },
  ];

  for (const selection of invalidSelections) {
    const result = await buildAccountDataExportWithAdapter(
      createExportAdapter({
        resumeAnalyses: [validAnalysis],
        selections: [selection],
      }),
      EXPORTED_AT,
      { expectedUserId: ACCOUNT_A },
    );
    assertExportFailure(result, "invalid_response");
  }

  const duplicate = await buildAccountDataExportWithAdapter(
    createExportAdapter({
      resumeAnalyses: [validAnalysis],
      selections: [
        createSelection(ANALYSIS_TWO),
        createSelection(ANALYSIS_TWO),
      ],
    }),
    EXPORTED_AT,
    { expectedUserId: ACCOUNT_A },
  );
  assertExportFailure(duplicate, "cardinality_violation");

  const orphan = await buildAccountDataExportWithAdapter(
    createExportAdapter({
      selections: [createSelection(ANALYSIS_TWO)],
    }),
    EXPORTED_AT,
    { expectedUserId: ACCOUNT_A },
  );
  assertExportFailure(orphan, "count_mismatch");

  const switched = await buildAccountDataExportWithAdapter(
    createExportAdapter({
      resumeAnalyses: [validAnalysis],
      selections: [createSelection(ANALYSIS_TWO)],
      identities: [ACCOUNT_A, ACCOUNT_A, ACCOUNT_A, ACCOUNT_A, ACCOUNT_B],
    }),
    EXPORTED_AT,
    { expectedUserId: ACCOUNT_A },
  );
  assertExportFailure(switched, "account_changed");
});

test("deletion parser/orchestration contracts require the selection count and stay generic", async () => {
  assert.match(
    accountDeletionRouteSource,
    /active_resume_selections_deleted: number/,
  );
  assert.match(
    accountDeletionRouteSource,
    /"active_resume_selections_deleted"/,
  );
  assert.match(
    accountDeletionRouteSource,
    /Number\(row\.active_resume_selections_deleted\) > 1/,
  );
  assert.match(
    accountDeletionRouteSource,
    /activeResumeSelections: row\.active_resume_selections_deleted/,
  );
  assert.match(
    accountDeletionRouteSource,
    /jsonResponse\(\{ ok: true, deleted: true \}, 200\)/,
  );
  assert.doesNotMatch(
    sliceSource(
      accountDeletionRouteSource,
      "return result.ok",
      "} catch (error)",
    ),
    /profiles_deleted|active_resume_selections_deleted|userData\.user\.id/,
  );
  assert.match(
    accountDeletionOrchestrationSource,
    /"activeResumeSelections"/,
  );
  assert.match(
    accountDeletionOrchestrationSource,
    /Object\.keys\(value\.counts\)\.length !== expected\.length/,
  );

  const calls = [];
  const completeCounts = {
    profiles: 1,
    resumeAnalyses: 2,
    jobMatches: 3,
    careerSnapshots: 0,
    betaFeedback: 4,
    activeResumeSelections: 1,
  };
  const success = await runAccountDeletionOrchestration({
    deleteAccountData: async () => {
      calls.push("database");
      return {
        ok: true,
        verifiedAbsent: true,
        counts: completeCounts,
      };
    },
    deleteAccountStorage: async () => {
      calls.push("storage");
      return { ok: true, applicable: false, verified: true };
    },
    deleteAuthUser: async () => {
      calls.push("auth");
      return { ok: true, deleted: true };
    },
  });
  assert.deepEqual(success, { ok: true });
  assert.deepEqual(calls, ["database", "storage", "auth"]);

  const incompleteCounts = { ...completeCounts };
  delete incompleteCounts.activeResumeSelections;
  let laterStageCalled = false;
  const rejected = await runAccountDeletionOrchestration({
    deleteAccountData: async () => ({
      ok: true,
      verifiedAbsent: true,
      counts: incompleteCounts,
    }),
    deleteAccountStorage: async () => {
      laterStageCalled = true;
      return { ok: true, applicable: false, verified: true };
    },
    deleteAuthUser: async () => {
      laterStageCalled = true;
      return { ok: true, deleted: true };
    },
  });
  assert.deepEqual(rejected, {
    ok: false,
    code: "account_data_cleanup_failed",
  });
  assert.equal(laterStageCalled, false);
});

test("protected HTTP deletion parser rejects missing/excess selection counts generically", async () => {
  const helperPath = require.resolve(
    "../src/lib/accountDeletion/authDeletionConvergence.ts",
  );
  const adminPath = require.resolve("../src/lib/supabase/admin.ts");
  const routePath = require.resolve("../src/app/api/account/delete/route.ts");
  const cachedModules = new Map(
    [helperPath, adminPath, configModulePath, routePath].map(
      (modulePath) => [modulePath, require.cache[modulePath]],
    ),
  );
  let preparationRow = createPreparationRow();
  class MockAdminConfigurationError extends Error {}

  require.cache[helperPath] = moduleStub(helperPath, {
    deleteAuthUserWithVerifiedConvergence: async () => ({
      ok: true,
      deleted: true,
    }),
  });
  require.cache[adminPath] = moduleStub(adminPath, {
    createSupabaseAdminClient: () => ({
      rpc: async () => ({ data: preparationRow, error: null }),
      auth: { admin: {} },
    }),
    SupabaseAdminConfigurationError: MockAdminConfigurationError,
  });
  require.cache[configModulePath] = moduleStub(configModulePath, {
    getSupabasePublicConfig: () => ({
      url: "https://isolated.invalid",
      publishableKey: "public-fixture-placeholder",
    }),
    getTrustedAppOrigin: () => "https://app.example",
  });
  delete require.cache[routePath];

  const originalLoad = Module._load;
  Module._load = function loadRouteDependency(request, parent, isMain) {
    if (request === "@supabase/supabase-js") {
      return {
        createClient: () => ({
          auth: {
            getUser: async () => ({
              data: {
                user: {
                  id: ACCOUNT_A,
                  app_metadata: { provider: "email" },
                },
              },
              error: null,
            }),
          },
        }),
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    const { POST } = require(routePath);
    const token = jwt({
      sub: ACCOUNT_A,
      amr: [{
        method: "password",
        timestamp: Math.floor(Date.now() / 1000),
      }],
    });
    const request = () => new Request(
      "https://app.example/api/account/delete",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          origin: "https://app.example",
        },
        body: JSON.stringify({
          confirmation: ACCOUNT_DELETE_CONFIRMATION,
        }),
      },
    );

    const success = await POST(request());
    assert.equal(success.status, 200);
    assert.deepEqual(await success.json(), { ok: true, deleted: true });
    assert.match(success.headers.get("cache-control") ?? "", /no-store/);

    preparationRow = createPreparationRow();
    delete preparationRow.active_resume_selections_deleted;
    const missing = await POST(request());
    assert.equal(missing.status, 500);
    assert.deepEqual(await missing.json(), {
      ok: false,
      code: "account_data_cleanup_failed",
      error: "Account deletion did not finish. Please try again.",
    });

    preparationRow = createPreparationRow({
      active_resume_selections_deleted: 2,
    });
    const impossible = await POST(request());
    assert.equal(impossible.status, 500);
    const impossibleBody = await impossible.json();
    assert.deepEqual(impossibleBody, {
      ok: false,
      code: "account_data_cleanup_failed",
      error: "Account deletion did not finish. Please try again.",
    });
    assert.doesNotMatch(
      JSON.stringify(impossibleBody),
      /active_resume_selections|aaaaaaaa-aaaa/,
    );
  } finally {
    Module._load = originalLoad;
    for (const [modulePath, cached] of cachedModules) {
      if (cached) require.cache[modulePath] = cached;
      else delete require.cache[modulePath];
    }
  }
});

test("browser/account separation has no new key or descriptor and preserves explicit activation", () => {
  const descriptors = getSkillMintStorageDescriptors();
  assert.equal(descriptors.length, 12);
  assert.deepEqual(
    descriptors.map((descriptor) => descriptor.key),
    [
      "skillmint:active-target:v1",
      "skillmint:beta-feedback",
      "skillmint:jd-match",
      "skillmint:jd-match-history",
      "skillmint:jd-match-sync-status",
      "skillmint:mission-status:v1",
      "skillmint:onboarding-dismissed",
      "skillmint:resume-analysis",
      "skillmint:resume-sync-status",
      "skillmint:selected-career-path:v1",
      "skillmint:target-role-setup",
      "skillmint:upgrade-interest",
    ],
  );
  assert.equal(
    descriptors.some((descriptor) =>
      /workspace.*resume|resume.*selection/i.test(descriptor.key)
    ),
    false,
  );
  assert.equal(countMatches(activeResumeStorageSource, /"skillmint:/g), 2);
  assert.doesNotMatch(
    `${workspaceRepositorySource}\n${resumePageSource}\n${dashboardPageSource}`,
    /skillmint:workspace|skillmint:active-resume-selection/,
  );
  assertGitZeroDiff([
    "src/lib/storage/skillMintStorageRegistry.ts",
    "src/lib/storage/ownedSkillMintStorage.ts",
    "src/lib/storage/skillMintStorageTypes.ts",
  ]);

  const setHandler = sliceSource(
    resumePageSource,
    "async function handleSetWorkspaceResume(",
    "async function handleClearWorkspaceResume()",
  );
  const clearHandler = sliceSource(
    resumePageSource,
    "async function handleClearWorkspaceResume()",
    "function handleChooseDeleteCandidate(",
  );
  const clearBrowserHandler = sliceSource(
    settingsPageSource,
    "function handleClearBrowserData()",
    "async function handleDeleteSavedReports()",
  );
  const dashboardOfferLoad = sliceSource(
    dashboardPageSource,
    "async function loadResumeOffer()",
    "async function handleUseWorkspaceResume()",
  );
  const dashboardUseHandler = sliceSource(
    dashboardPageSource,
    "async function handleUseWorkspaceResume()",
    "async function handleRestoreLatestSavedReport()",
  );

  for (const handler of [setHandler, clearHandler]) {
    assert.doesNotMatch(
      handler,
      /setActiveResumeReportFromSavedAnalysis|writeActiveResumeReport|writeResumeSyncStatus|analytics\./,
    );
  }
  assert.match(
    setHandler,
    /This browser’s active report was not changed/,
  );
  assert.match(
    clearHandler,
    /Saved analyses and this browser’s active report were preserved/,
  );
  assert.match(clearBrowserHandler, /clearSkillMintBrowserData\(\)/);
  assert.match(clearBrowserHandler, /Account records were not deleted/);
  assert.doesNotMatch(
    clearBrowserHandler,
    /clearCurrentUserWorkspaceResumeSelection|deleteCurrentUserSavedReports/,
  );
  assert.doesNotMatch(
    dashboardOfferLoad,
    /setActiveResumeReportFromSavedAnalysis/,
  );
  assert.match(
    dashboardUseHandler,
    /resolveCurrentUserWorkspaceResume[\s\S]*setActiveResumeReportFromSavedAnalysis/,
  );
  assert.equal(
    countMatches(
      dashboardUseHandler,
      /setActiveResumeReportFromSavedAnalysis/g,
    ),
    1,
  );
});

test("UI copy and actions keep saved, Workspace, and browser-active concepts distinct", () => {
  assert.match(resumePageSource, /Set as workspace resume/);
  assert.match(resumePageSource, /Change workspace resume/);
  assert.match(resumePageSource, /Clear workspace resume/);
  assert.match(resumePageSource, /Workspace resume selected/);
  assert.match(resumePageSource, /Workspace resume unavailable/);
  assert.match(resumePageSource, /Active report on this browser/);
  assert.match(
    resumePageSource,
    /Sign in to select a Workspace resume\. Signed-out browser reports remain separate\./,
  );
  assert.match(
    resumePageSource,
    /SkillMint did not substitute another analysis/,
  );
  assert.match(
    resumePageSource,
    /If it was the Workspace resume, that selection was removed\. The browser active report was preserved/,
  );
  assert.match(
    resumePageSource,
    /detachActiveResumeSyncStatus\(deletedAnalysis\.id/,
  );
  assert.match(resumePageSource, /role=\{state\.status === "error" \? "alert" : "status"\}/);
  assert.match(resumePageSource, /aria-live=\{state\.status === "error" \? "assertive" : "polite"\}/);
  assert.match(resumePageSource, /flex max-w-full flex-wrap gap-2/);

  assert.match(
    dashboardPageSource,
    /if \(\s*hasResumeAnalysis \|\|\s*isAuthLoading/,
  );
  assert.match(
    dashboardPageSource,
    /Use workspace resume on this browser/,
  );
  assert.match(
    dashboardPageSource,
    /The selected Workspace resume is unavailable\. SkillMint did not substitute the latest saved analysis\./,
  );
  const offerLoad = sliceSource(
    dashboardPageSource,
    "async function loadResumeOffer()",
    "async function handleUseWorkspaceResume()",
  );
  assert(
    offerLoad.indexOf('status === "source_deleted"') <
      offerLoad.indexOf("getLatestCurrentUserResumeAnalysis"),
  );
  assert.match(
    sliceSource(
      offerLoad,
      'if (workspaceResult.data.status === "source_deleted")',
      "const latestResult",
    ),
    /return;/,
  );
  assert.match(dashboardPageSource, /className="mt-6 flex flex-wrap gap-3"/);
  assert.match(dashboardPageSource, /aria-live=/);
});

test("frozen product and analytics contracts allow the reviewed hostname fix and additive role-map engine", () => {
  const frozenProductPaths = [
    "src/intelligence",
    "src/platform/analytics",
    "src/modules/analytics",
    "src/app/api/analytics",
    "src/app/founder/analytics/page.tsx",
    "src/config/founderAnalytics.ts",
  ];
  const changedFrozenProductPaths = new Set(
    [gitChangedPaths(frozenProductPaths), gitUntracked(frozenProductPaths)]
      .flatMap((value) => value.split("\n"))
      .filter(Boolean),
  );
  assert.deepEqual([...changedFrozenProductPaths].sort(), [
    "src/intelligence/core/roleEvidenceMap.ts",
    "src/intelligence/proof/proofLinkExtraction.ts",
  ]);
  assert.equal(
    sha256(readBuffer("src/intelligence/core/roleEvidenceMap.ts")),
    "0495e13722053b686719c2f64ec2244e35e3c363098b67d8d0f3938d56bb504d",
  );
  assert.equal(
    sha256(readBuffer("src/intelligence/proof/proofLinkExtraction.ts")),
    "7bee6025dd80f12db9e16253f515e8cfe4ec7b5f8f4d296bb4cc74f053e947a9",
  );
  assert.equal(
    sha256(Buffer.from(gitShow(
      `${authorizedBaseline}:src/intelligence/proof/proofLinkExtraction.ts`,
    ))),
    "bbb5b2bc3792b700463c31dc805c55760a2510b15ff40e77e987ba8288410d89",
  );
  assert.equal(
    sha256(readBuffer("src/platform/analytics/eventContract.ts")),
    "1839287ffe53b8cb000764d06b4c152a9d4394811cf0dff7566624f2a27bd086",
  );
  assert.doesNotMatch(
    accountExportContractSource,
    /Workspace resume selected|Workspace resume cleared|cross-device restore/,
  );
  assert.doesNotMatch(
    workspaceRepositorySource,
    /analytics|event_name|emit\(/i,
  );
});

test("package metadata permits only authorized fixture scripts and audited lock stays exact", () => {
  const currentPackage = JSON.parse(readText("package.json"));
  const baselinePackage = JSON.parse(
    gitShow(`${authorizedBaseline}:package.json`),
  );
  const currentWithoutScripts = { ...currentPackage };
  const baselineWithoutScripts = { ...baselinePackage };
  delete currentWithoutScripts.scripts;
  delete baselineWithoutScripts.scripts;

  assert.equal(currentPackage.dependencies.next, "16.3.3");
assert.equal(currentPackage.devDependencies["eslint-config-next"], "16.3.3");
const normalizedCurrentWithoutScripts = structuredClone(currentWithoutScripts);
normalizedCurrentWithoutScripts.dependencies.next =
  baselineWithoutScripts.dependencies.next;
normalizedCurrentWithoutScripts.devDependencies["eslint-config-next"] =
  baselineWithoutScripts.devDependencies["eslint-config-next"];
assert.deepEqual(normalizedCurrentWithoutScripts, baselineWithoutScripts);
  for (const [name, command] of Object.entries(baselinePackage.scripts)) {
    assert.equal(currentPackage.scripts[name], command, name);
  }
  assert.deepEqual(
    Object.keys(currentPackage.scripts)
      .filter((name) => !(name in baselinePackage.scripts))
      .sort(),
    [
      "check:controlled-access-client-bundles",
      "check:production-rollout-readiness",
      "check:public-evidence-demo-client-bundles",
      "check:secret-paths",
      "fixtures:controlled-access",
      "fixtures:launch-hardening",
      "fixtures:production-rollout-foundation",
      "fixtures:proof-brief",
      "fixtures:proof-brief:database",
      "fixtures:public-evidence-demo",
      "fixtures:recruiter-evidence",
      "fixtures:recruiter-evidence:database",
      "fixtures:resume-comparison",
      "fixtures:resume-workspace-phase-1a",
      "test:e2e:controlled-access",
      "test:e2e:forgot-password",
      "test:e2e:launch-hardening",
      "test:e2e:password-recovery",
      "test:e2e:proof-brief",
      "test:e2e:public-evidence-demo",
      "test:e2e:recruiter-evidence",
      "test:e2e:resume-comparison",
      "test:e2e:resume-comparison:firefox",
      "test:e2e:resume-comparison:race",
      "test:e2e:resume-comparison:webkit",
      "test:e2e:resume-workspace",
    ],
  );
  assert.equal(
    currentPackage.scripts["check:controlled-access-client-bundles"],
    "node scripts/controlled-access-fixtures.mjs --require-client-build",
  );
  assert.equal(
    currentPackage.scripts["check:public-evidence-demo-client-bundles"],
    "node scripts/public-evidence-demo-fixtures.mjs --require-client-build",
  );
  assert.equal(
    currentPackage.scripts["check:secret-paths"],
    "node scripts/secret-path-regression.mjs",
  );
  assert.equal(
    currentPackage.scripts["fixtures:controlled-access"],
    "node scripts/controlled-access-fixtures.mjs",
  );
  assert.equal(
    currentPackage.scripts["fixtures:launch-hardening"],
    "node scripts/launch-hardening-fixtures.mjs",
  );
  assert.equal(
    currentPackage.scripts["fixtures:resume-comparison"],
    "node scripts/v2-resume-comparison-phase-2a-core-fixtures.mjs --closure",
  );
  assert.equal(
    currentPackage.scripts["fixtures:resume-workspace-phase-1a"],
    "node scripts/resume-workspace-phase-1a-fixtures.mjs",
  );
  assert.equal(
    currentPackage.scripts["test:e2e:controlled-access"],
    "playwright test e2e/controlled-access.spec.ts --project=chromium --grep @closed --workers=1 --retries=0 && SKILLMINT_E2E_PUBLIC_SIGNUP_ENABLED=true playwright test e2e/controlled-access.spec.ts --project=chromium --grep @enabled --workers=1 --retries=0",
  );
  assert.equal(
    currentPackage.scripts["test:e2e:forgot-password"],
    "playwright test e2e/password-recovery.spec.ts --project=chromium --grep @forgot-password --workers=1 --retries=0",
  );
  assert.equal(
    currentPackage.scripts["test:e2e:launch-hardening"],
    "playwright test e2e/launch-hardening.spec.ts --project=chromium --workers=1 --retries=0",
  );
  assert.equal(
    currentPackage.scripts["test:e2e:password-recovery"],
    "playwright test e2e/password-recovery.spec.ts --project=chromium --grep @password-recovery --workers=1 --retries=0",
  );
  assert.equal(
    currentPackage.scripts["test:e2e:resume-comparison"],
    "playwright test e2e/resume-comparison.spec.ts --project=chromium --workers=1 --retries=0",
  );
  assert.equal(
    currentPackage.scripts["test:e2e:resume-comparison:firefox"],
    "playwright test e2e/resume-comparison.spec.ts --project=firefox --grep @critical --workers=1 --retries=0",
  );
  assert.equal(
    currentPackage.scripts["test:e2e:resume-comparison:race"],
    "playwright test e2e/resume-comparison.spec.ts --project=chromium --grep @race --repeat-each=3 --workers=1 --retries=0",
  );
  assert.equal(
    currentPackage.scripts["test:e2e:resume-comparison:webkit"],
    "playwright test e2e/resume-comparison.spec.ts --project=webkit --grep @critical --workers=1 --retries=0",
  );
  assert.equal(
    currentPackage.scripts["test:e2e:resume-workspace"],
    "playwright test e2e/resume-workspace.spec.ts --project=chromium --workers=1 --retries=0",
  );
  assert.equal(
    sha256(readBuffer("package-lock.json")),
    SECURITY_PACKAGE_LOCK_SHA256,
  );
  assert.equal(
    sha256(Buffer.from(gitShow(`${authorizedBaseline}:package-lock.json`))),
    BASELINE_PACKAGE_LOCK_SHA256,
  );

  const currentLock = JSON.parse(readText("package-lock.json"));
  assert.equal(currentLock.packages["node_modules/nanoid"].version, "3.3.18");
  assert.equal(currentLock.packages["node_modules/js-yaml"].version, "4.3.1");
  assert.equal(
    currentLock.packages["node_modules/brace-expansion"].version,
    "1.1.18",
  );
  assert.equal(
    currentLock.packages[
      "node_modules/@typescript-eslint/typescript-estree/node_modules/brace-expansion"
    ].version,
    "5.0.9",
  );
});

for (const [index, { name, callback }] of tests.entries()) {
  await callback();
  console.log(`PASS ${String(index + 1).padStart(2, "0")} ${name}`);
}

console.log(
  `Resume Workspace Phase 1A deterministic fixture complete: ${tests.length} checks passed. Static SQL/catalog assertions do not replace local migration replay, live catalog/RLS tests, generated-type provenance review, Playwright, lint, or build evidence.`,
);

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function readBuffer(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function countMatches(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

function sliceSource(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return source.slice(start, end);
}

function gitShow(objectName) {
  return execFileSync("git", ["show", objectName], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

function assertGitZeroDiff(paths) {
  const changed = gitChangedPaths(paths);
  assert.equal(changed, "", `Unexpected baseline diff:\n${changed}`);
}

function gitChangedPaths(paths) {
  return execFileSync(
    "git",
    [
      "diff",
      "--no-ext-diff",
      "--name-only",
      authorizedBaseline,
      "--",
      ...paths,
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  ).trim();
}

function gitUntracked(paths) {
  return execFileSync(
    "git",
    ["ls-files", "--others", "--exclude-standard", "--", ...paths],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  ).trim();
}

function moduleStub(filename, exports) {
  const stubModule = new Module(filename);
  stubModule.filename = filename;
  stubModule.loaded = true;
  stubModule.exports = exports;
  return stubModule;
}

function okResponse(data) {
  return {
    data: Array.isArray(data) ? data : [data],
    error: null,
  };
}

function createSelection(resumeAnalysisId, overrides = {}) {
  return {
    user_id: ACCOUNT_A,
    resume_analysis_id: resumeAnalysisId,
    selected_at: SELECTED_AT,
    ...overrides,
  };
}

function createAnalysis(id, overrides = {}) {
  return {
    id,
    user_id: ACCOUNT_A,
    file_name: "resume.pdf",
    file_type: "application/pdf",
    extracted_text: "Deterministic resume text",
    parsed_profile: null,
    user_profile: null,
    created_at: "2026-07-26T10:00:00.000Z",
    ...overrides,
  };
}

function createWorkspaceClient({
  identities = [ACCOUNT_A],
  respond,
}) {
  const identitySequence = [...identities];
  let identityIndex = 0;
  const observed = {
    identityCalls: 0,
    queries: [],
  };

  return {
    observed,
    auth: {
      async getUser() {
        observed.identityCalls += 1;
        const index = Math.min(identityIndex, identitySequence.length - 1);
        identityIndex += 1;
        const id = identitySequence[index] ?? null;
        return {
          data: {
            user: id ? { id } : null,
          },
          error: null,
        };
      },
    },
    from(table) {
      const state = {
        table,
        operation: null,
        payload: null,
        selectedColumns: null,
        filters: [],
        limit: null,
        order: null,
      };
      const query = {
        select(columns) {
          state.operation ??= "select";
          state.selectedColumns = columns;
          return query;
        },
        update(payload) {
          state.operation = "update";
          state.payload = { ...payload };
          return query;
        },
        insert(payload) {
          state.operation = "insert";
          state.payload = { ...payload };
          return query;
        },
        delete() {
          state.operation = "delete";
          return query;
        },
        eq(column, value) {
          state.filters.push([column, value]);
          return query;
        },
        order(column, options) {
          state.order = [column, { ...options }];
          return query;
        },
        limit(value) {
          state.limit = value;
          return query;
        },
        then(onFulfilled, onRejected) {
          const snapshot = {
            table: state.table,
            operation: state.operation,
            payload: state.payload ? { ...state.payload } : null,
            selectedColumns: state.selectedColumns,
            filters: state.filters.map((filter) => [...filter]),
            limit: state.limit,
            order: state.order
              ? [state.order[0], { ...state.order[1] }]
              : null,
          };
          observed.queries.push(snapshot);
          return Promise.resolve()
            .then(() => respond(snapshot))
            .then(onFulfilled, onRejected);
        },
      };
      return query;
    },
  };
}

function assertFailure(result, reason) {
  assert.equal(result.ok, false);
  assert.equal(result.reason, reason);
  assert.equal("data" in result, false);
}

function createExportAnalysis(id, overrides = {}) {
  return {
    id,
    user_id: ACCOUNT_A,
    file_name: "resume.pdf",
    file_type: "application/pdf",
    extracted_text: null,
    parsed_profile: null,
    user_profile: null,
    created_at: "2026-07-26T10:00:00.000Z",
    ...overrides,
  };
}

function createExportAdapter({
  resumeAnalyses = [],
  selections = [],
  identities = [ACCOUNT_A],
} = {}) {
  const tables = {
    profiles: [],
    resume_analyses: resumeAnalyses,
    active_resume_selections: selections,
    job_matches: [],
    career_snapshots: [],
    beta_feedback: [],
    account_personas: [],
    proof_briefs: [],
    recruiter_role_evidence_maps: [],
    candidate_evidence_reviews: [],
  };
  const identitySequence = [...identities];
  let identityIndex = 0;
  const observed = {
    identityCalls: 0,
    ownerFilters: [],
    resumePageCalls: 0,
    selectionLimit: null,
  };

  return {
    observed,
    async getAuthenticatedUserId() {
      observed.identityCalls += 1;
      const index = Math.min(identityIndex, identitySequence.length - 1);
      identityIndex += 1;
      return {
        data: identitySequence[index] ?? null,
        error: null,
      };
    },
    async getExactCount(input) {
      observed.ownerFilters.push([
        input.tableName,
        input.ownerColumn,
        input.expectedUserId,
      ]);
      return {
        data: tables[input.tableName].length,
        error: null,
      };
    },
    async getProfileRows(input) {
      observed.ownerFilters.push([
        "profiles",
        "id",
        input.expectedUserId,
      ]);
      return { data: [], error: null };
    },
    async getActiveResumeSelectionRows(input) {
      observed.selectionLimit = input.limit;
      observed.ownerFilters.push([
        "active_resume_selections",
        "user_id",
        input.expectedUserId,
      ]);
      return {
        data: selections.slice(0, input.limit),
        error: null,
      };
    },
    async getAccountPersonaRows(input) {
      observed.ownerFilters.push([
        "account_personas",
        "user_id",
        input.expectedUserId,
      ]);
      return { data: [], error: null };
    },
    async getKeysetPage(input) {
      observed.ownerFilters.push([
        input.tableName,
        input.ownerColumn,
        input.expectedUserId,
      ]);
      if (input.tableName === "resume_analyses") {
        observed.resumePageCalls += 1;
      }
      const rows = [...tables[input.tableName]]
        .sort((left, right) =>
          left.id.toLowerCase().localeCompare(right.id.toLowerCase())
        )
        .filter((row) =>
          !input.cursor ||
          row.id.toLowerCase() > input.cursor.toLowerCase()
        )
        .slice(0, input.limit);
      return { data: rows, error: null };
    },
  };
}

function assertExportFailure(result, code) {
  assert.equal(result.ok, false);
  assert.equal(result.error.code, code);
  assert.equal("data" in result, false);
}

function createPreparationRow(overrides = {}) {
  return {
    profiles_deleted: 1,
    resume_analyses_deleted: 2,
    job_matches_deleted: 3,
    career_snapshots_deleted: 0,
    beta_feedback_deleted: 4,
    active_resume_selections_deleted: 1,
    verified_absent: true,
    ...overrides,
  };
}

function jwt(payload) {
  const encode = (value) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.fixture`;
}
