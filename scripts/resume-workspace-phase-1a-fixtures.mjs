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

// Existing workspace, export, deletion, UI, and security fixtures remain unchanged above this gate.
// This focused frozen-product contract is intentionally exact: any additional path must be reviewed
// and pinned here rather than broadening the exception surface.
test("frozen product and analytics contracts allow only reviewed product changes", () => {
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
    "src/intelligence/target/activeTargetStorage.ts",
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
    sha256(readBuffer("src/intelligence/target/activeTargetStorage.ts")),
    "877d4ad5a5e3e51455386a8da25072af70e957a301bf1fd2a06198f023e67427",
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
