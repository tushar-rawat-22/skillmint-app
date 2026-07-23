import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  extractProjects,
  runGuard,
  validateTargetInventory,
} from "./block6-target-guard.mjs";

const root = resolve(import.meta.dirname, "..");
let assertionCount = 0;

function check(condition, message) {
  assertionCount += 1;
  assert.ok(condition, message);
}

function equal(actual, expected, message) {
  assertionCount += 1;
  assert.deepEqual(actual, expected, message);
}

function read(path) {
  return readFileSync(join(root, path));
}

function text(path) {
  return read(path).toString("utf8");
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function exactKeys(value, keys, label) {
  equal(Object.keys(value).sort(), [...keys].sort(), `${label} has unexpected keys`);
}

function expectRefusal(action, expectedCode, label) {
  assertionCount += 1;
  assert.throws(action, (error) => error?.code === expectedCode, label);
}

const rolloutFoundationPaths = [
  ".github/workflows/ci.yml",
  ".gitignore",
  "docs/ANALYTICS.md",
  "docs/BETA_V1_BUILD_ROADMAP.md",
  "docs/BLOCK_6_ROLLOUT_RUNBOOK.md",
  "docs/DEPLOYMENT.md",
  "docs/PROJECT_STATUS.md",
  "docs/README.md",
  "docs/TODO.md",
  "package.json",
  "scripts/block6-rollout-foundation-fixtures.mjs",
  "scripts/block6-target-guard.mjs",
  "supabase/config.toml",
  "supabase/schema_v1.sql",
  "supabase/schema_v2_feedback.sql",
  "supabase/schema_v3_data_controls.sql",
  "supabase/schema_v4_account_deletion_security.sql",
  "supabase/schema_v5_analytics_events.sql",
  "supabase/schema_v6_analytics_aggregation.sql",
  "supabase/migrations/20260723000100_schema_v1.sql",
  "supabase/migrations/20260723000200_schema_v2_feedback.sql",
  "supabase/migrations/20260723000300_schema_v3_data_controls.sql",
  "supabase/migrations/20260723000400_schema_v4_account_deletion_security.sql",
  "supabase/migrations/20260723000500_schema_v5_analytics_events.sql",
  "supabase/migrations/20260723000600_schema_v6_analytics_aggregation.sql",
  "supabase/migrations/manifest.json",
];

const migrations = [
  {
    version: "20260723000100",
    source: "supabase/schema_v1.sql",
    migration: "supabase/migrations/20260723000100_schema_v1.sql",
    hash: "af7a9a7314b699d1e38fe6998bc382489a33532315f188d77d0f8f739b5357e5",
    classification: "existing_production_baseline_requires_catalog_proof",
  },
  {
    version: "20260723000200",
    source: "supabase/schema_v2_feedback.sql",
    migration: "supabase/migrations/20260723000200_schema_v2_feedback.sql",
    hash: "213fae232e106ff82cd6e300fc27507d77a612dd8c5f128bd91601f114f33701",
    classification: "existing_production_baseline_requires_catalog_proof",
  },
  {
    version: "20260723000300",
    source: "supabase/schema_v3_data_controls.sql",
    migration: "supabase/migrations/20260723000300_schema_v3_data_controls.sql",
    hash: "a130483eac5ffafdbf293b3938e18dabea57a0e36c7d8617fb8bc448ae042959",
    classification: "existing_production_baseline_requires_catalog_proof",
  },
  {
    version: "20260723000400",
    source: "supabase/schema_v4_account_deletion_security.sql",
    migration: "supabase/migrations/20260723000400_schema_v4_account_deletion_security.sql",
    hash: "3ff175e86b79516ee896578d01b6b64fb747aa2b371187fa63f8225c09807587",
    classification: "existing_production_baseline_requires_catalog_proof",
  },
  {
    version: "20260723000500",
    source: "supabase/schema_v5_analytics_events.sql",
    migration: "supabase/migrations/20260723000500_schema_v5_analytics_events.sql",
    hash: "15498e432dcac694af1adc696e3f824d72e184b9f96827f3e4610e66397332b2",
    classification: "pending_analytics_ingestion",
  },
  {
    version: "20260723000600",
    source: "supabase/schema_v6_analytics_aggregation.sql",
    migration: "supabase/migrations/20260723000600_schema_v6_analytics_aggregation.sql",
    hash: "e46fabd2cf149f9bf97d4af18add4b125e8176fc577c162fa6b8f6dc385feba5",
    classification: "pending_founder_aggregation",
  },
];

for (const item of migrations) {
  const source = read(item.source);
  const migration = read(item.migration);
  equal(Buffer.compare(source, migration), 0, `${item.migration} is not a byte copy`);
  equal(sha256(source), item.hash, `${item.source} has the wrong SHA-256`);
  equal(sha256(migration), item.hash, `${item.migration} has the wrong SHA-256`);
}

const migrationSqlFiles = readdirSync(join(root, "supabase/migrations"))
  .filter((name) => name.endsWith(".sql"))
  .sort();
equal(
  migrationSqlFiles,
  migrations.map((item) => basename(item.migration)),
  "migration directory must contain the exact ordered six SQL files",
);

const manifest = JSON.parse(text("supabase/migrations/manifest.json"));
exactKeys(manifest, ["contract_version", "generated_for", "ordered_migrations"], "manifest");
equal(manifest.contract_version, "skillmint.block6.migration_manifest.v1", "manifest version changed");
exactKeys(manifest.generated_for, ["empty_isolated_project", "production"], "generated_for");
exactKeys(manifest.generated_for.empty_isolated_project, ["apply_in_order"], "isolated rule");
exactKeys(
  manifest.generated_for.production,
  ["catalog_proof_required_before_marking_applied", "pending_execution", "migration_history_repair"],
  "production rule",
);
equal(
  manifest.generated_for.empty_isolated_project.apply_in_order,
  migrations.map((item) => item.version),
  "empty isolated project order changed",
);
equal(
  manifest.generated_for.production.catalog_proof_required_before_marking_applied,
  migrations.slice(0, 4).map((item) => item.version),
  "Production baseline versions changed",
);
equal(
  manifest.generated_for.production.pending_execution,
  migrations.slice(4).map((item) => item.version),
  "Production pending versions changed",
);
equal(
  manifest.generated_for.production.migration_history_repair,
  "history_only_no_sql_execution",
  "migration repair must be history-only",
);
equal(manifest.ordered_migrations.length, 6, "manifest must contain six migrations");

manifest.ordered_migrations.forEach((entry, index) => {
  const expected = migrations[index];
  exactKeys(
    entry,
    ["version", "source_path", "migration_path", "sha256", "rollout_classification"],
    `manifest migration ${index + 1}`,
  );
  equal(entry.version, expected.version, "manifest migration version changed");
  equal(entry.source_path, expected.source, "manifest source path changed");
  equal(entry.migration_path, expected.migration, "manifest migration path changed");
  equal(entry.sha256, expected.hash, "manifest hash changed");
  equal(entry.rollout_classification, expected.classification, "manifest classification changed");
});
equal(manifest.ordered_migrations[4].version, migrations[4].version, "V5 must follow V4");
equal(manifest.ordered_migrations[5].version, migrations[5].version, "V6 must follow V5");

const config = text("supabase/config.toml");
check(config.startsWith("# Generated with Supabase CLI 2.109.1 for local and migration tooling."), "config provenance missing");
check(/^project_id = "skillmint-app"$/m.test(config), "local config project_id changed");
check(
  config.includes("https://supabase.com/docs/guides/local-development/cli/config"),
  "config documentation provenance is missing",
);
const seedHeaders = [...config.matchAll(/^\[db\.seed\]\s*$/gm)];
equal(seedHeaders.length, 1, "db.seed must exist exactly once");
const seedRemainder = config.slice(seedHeaders[0].index + seedHeaders[0][0].length);
const nextTomlSection = seedRemainder.match(/^\[[^\]]+\]\s*$/m);
const seedSection = seedRemainder.slice(0, nextTomlSection?.index ?? seedRemainder.length);
const seedSettings = seedSection
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && !line.startsWith("#"));
equal(seedSettings, ["enabled = false", "sql_paths = []"], "db.seed must be disabled with an empty sql_paths list");
check(
  seedSection.includes("# SkillMint has no committed seed dataset."),
  "db.seed must explain the absence of a seed dataset",
);
check(!/\b(?:seed\.sql|seeds\/)/i.test(config), "config references a seed file");
check(!existsSync(join(root, "supabase/seed.sql")), "supabase/seed.sql must not exist");
check(!existsSync(join(root, "supabase/.temp")), "supabase/.temp exists in the worktree");
check(/^supabase\/\.temp\/$/m.test(text(".gitignore")), "Supabase .temp ignore is missing");

const hostedProjectEndpoint =
  /https?:\/\/[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.supabase\.co(?=[:/\s"'`]|$)/i;
for (const path of rolloutFoundationPaths) {
  const contents = text(path);
  check(!hostedProjectEndpoint.test(contents), `${path} contains a hosted project URL`);
  check(!/postgres(?:ql)?:\/\/[^\s"']+/i.test(contents), `${path} contains a database connection string`);
  check(!/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/.test(contents), `${path} contains a token-like value`);
  check(!/(?:password|secret|token)\s*=\s*["'](?!env\()[^"']{8,}["']/i.test(contents), `${path} contains a secret-like literal`);
  check(!/\b[a-z]{20}\b/.test(contents), `${path} contains a raw project-ref-shaped value`);
}

const approvedHash = "13aa45a92e3781bac5760ed0b589350457bf25df7a6c22c99d816cd17d7608ed";
const productionHash = "c84507eaec854938ead288cde83dc20ab34fd75a339df1efe16bc61c1ef9ad30";
const isolatedProject = {
  id: "fixture-private-isolated-ref",
  name: "skillmint-block6-test",
  status: "ACTIVE_HEALTHY",
  region: "ap-northeast-1",
};
const fixtureHasher = (projectRef) => {
  equal(projectRef, isolatedProject.id, "guard hashed an unexpected project ref");
  return approvedHash;
};
equal(extractProjects([isolatedProject]), [isolatedProject], "array inventory was not accepted");
equal(extractProjects({ projects: [isolatedProject] }), [isolatedProject], "projects container was not accepted");
equal(
  validateTargetInventory([isolatedProject], isolatedProject.name, { hashProjectRef: fixtureHasher }),
  {
    name: isolatedProject.name,
    status: isolatedProject.status,
    region: isolatedProject.region,
    refSha256: approvedHash,
  },
  "valid isolated target was refused",
);

expectRefusal(
  () => validateTargetInventory([isolatedProject], "skillmint-beta", { hashProjectRef: fixtureHasher }),
  "production_target_name",
  "Production name must fail",
);
expectRefusal(
  () => validateTargetInventory([isolatedProject], isolatedProject.name, { hashProjectRef: () => productionHash }),
  "production_target_ref",
  "Production hash must fail",
);
expectRefusal(
  () => validateTargetInventory([{ ...isolatedProject, region: "us-east-1" }], isolatedProject.name, { hashProjectRef: fixtureHasher }),
  "wrong_target_region",
  "wrong region must fail",
);
expectRefusal(
  () => validateTargetInventory([{ ...isolatedProject, status: "PAUSED" }], isolatedProject.name, { hashProjectRef: fixtureHasher }),
  "unhealthy_target_status",
  "unhealthy status must fail",
);
expectRefusal(
  () => validateTargetInventory([{ ...isolatedProject, status: "active healthy" }], isolatedProject.name, { hashProjectRef: fixtureHasher }),
  "malformed_target_status",
  "malformed status must fail",
);
expectRefusal(
  () => validateTargetInventory([isolatedProject, isolatedProject], isolatedProject.name, { hashProjectRef: fixtureHasher }),
  "duplicate_target",
  "duplicate target must fail",
);
expectRefusal(() => extractProjects({ data: [isolatedProject] }), "unknown_inventory_container", "unknown container must fail");
expectRefusal(
  () => validateTargetInventory([{ name: isolatedProject.name }], isolatedProject.name, { hashProjectRef: fixtureHasher }),
  "missing_target_status",
  "missing fields must fail",
);
expectRefusal(
  () => validateTargetInventory([isolatedProject], isolatedProject.name, { hashProjectRef: () => "0".repeat(64) }),
  "wrong_target_ref",
  "wrong target hash must fail",
);

const guardResult = await runGuard(["--inventory", "private.json", "--target", isolatedProject.name], {
  readInventory: async () => JSON.stringify({ projects: [isolatedProject] }),
  hashProjectRef: fixtureHasher,
});
equal(guardResult.refSha256, approvedHash, "runGuard did not validate the expected hash");

const guardSource = text("scripts/block6-target-guard.mjs");
check(
  !/node:(?:child_process|http|https|net|tls|dgram)|\bfetch\s*\(|XMLHttpRequest|WebSocket/.test(guardSource),
  "target guard uses a network, shell, or child-process API",
);
check(!/writeFile|appendFile|createWriteStream/.test(guardSource), "target guard uses a file-write API");

const importProbe = spawnSync(
  process.execPath,
  ["--input-type=module", "--eval", `import(${JSON.stringify(pathToFileURL(join(root, "scripts/block6-target-guard.mjs")).href)})`],
  { cwd: root, encoding: "utf8" },
);
equal(importProbe.status, 0, "target guard import failed");
equal(importProbe.stdout, "", "target guard import wrote to stdout");
equal(importProbe.stderr, "", "target guard import wrote to stderr");

const temporaryDirectory = mkdtempSync(join(tmpdir(), "skillmint-block6-guard-fixture-"));
try {
  const inventoryPath = join(temporaryDirectory, "inventory.json");
  const unrelatedRef = "must-never-be-printed";
  writeFileSync(
    inventoryPath,
    JSON.stringify([{ id: unrelatedRef, name: "unrelated", status: "ACTIVE_HEALTHY", region: "ap-northeast-1" }]),
    { mode: 0o600 },
  );
  const refusalProbe = spawnSync(
    process.execPath,
    [join(root, "scripts/block6-target-guard.mjs"), "--inventory", inventoryPath, "--target", "skillmint-beta"],
    { cwd: root, encoding: "utf8" },
  );
  check(refusalProbe.status !== 0, "Production CLI selection did not fail");
  equal(refusalProbe.stdout, "", "refusal printed a PASS summary");
  check(!refusalProbe.stderr.includes(unrelatedRef), "refusal leaked an unrelated project ref");
  check(!refusalProbe.stderr.includes("unrelated"), "refusal printed an unrelated project");
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}

const currentDocs = [
  "docs/README.md",
  "docs/ANALYTICS.md",
  "docs/DEPLOYMENT.md",
  "docs/PROJECT_STATUS.md",
  "docs/BETA_V1_BUILD_ROADMAP.md",
  "docs/TODO.md",
  "docs/BLOCK_6_ROLLOUT_RUNBOOK.md",
];
const documentation = currentDocs.map((path) => text(path)).join("\n");
for (const [pattern, claim] of [
  [/Block 6\.1 and Block 6\.2 are merged and frozen pending rollout/i, "Block 6.1/6.2 merged and frozen"],
  [/fail-closed[^.]*automatically deployed|automatically deployed[^.]*fail-closed/i, "fail-closed automatic deployment"],
  [/skillmint-block6-test[^.]*ACTIVE_HEALTHY|ACTIVE_HEALTHY[^.]*skillmint-block6-test/i, "isolated project state"],
  [/V5 and V6 remain unapplied/i, "V5/V6 unapplied"],
  [/analytics remains disabled/i, "analytics disabled"],
  [/founder UUID[^.]*WAF[^.]*retention[^.]*unconfigured/i, "founder/WAF/retention unconfigured"],
  [/Preview and Production[^.]*share[^.]*two public Supabase variables/i, "Preview/Production shared backend"],
  [/not Production activation|not a Production database rollout|no Production readiness/i, "no Production rollout claim"],
  [/Events are not people/i, "events are not people"],
  [/Migration repair changes (?:migration )?history only[^.]*executes no (?:migration )?SQL/i, "history-only migration repair"],
  [/no configured seed dataset/i, "no configured seed dataset"],
  [/Supabase CLI 2\.109\.1/i, "pinned Supabase CLI"],
  [/dry-run[\s\S]{0,220}does not execute[^.]*migration SQL/i, "dry-run limitation"],
  [/same validated inventory[^.]*same fail-closed process/i, "target-to-link inventory binding"],
  [/mission_started[^.]*mission_marked_done/i, "frozen mission event taxonomy"],
  [/Brand & Domain[^.]*paused by founder decision/i, "paused Brand & Domain Gate"],
  [/\[Block 6 Rollout Runbook\]\(BLOCK_6_ROLLOUT_RUNBOOK\.md\)/, "runbook link"],
]) {
  check(pattern.test(documentation), `documentation is missing: ${claim}`);
}

const bannedPhrases = [
  "seamless",
  "robust",
  "comprehensive",
  "cutting-edge",
  "revolutionary",
  "game-changing",
  "world-class",
  "best-in-class",
  "leverage",
  "leveraging",
  "delve",
  "furthermore",
  "moreover",
  "empower",
  "unlock",
  "transformative",
  "it is important to note",
  "this document serves as",
];
for (const phrase of bannedPhrases) {
  check(!documentation.toLowerCase().includes(phrase), `banned writing phrase found: ${phrase}`);
}

for (const path of currentDocs) {
  const withoutCode = text(path).replace(/```[\s\S]*?```/g, "");
  const proseParagraphs = withoutCode.split(/\n\s*\n/).filter((paragraph) => {
    const lines = paragraph.split("\n").filter(Boolean);
    return lines.length > 0 && lines.every((line) => !/^\s*(?:#|\||-|\d+\.)/.test(line));
  });

  for (const paragraph of proseParagraphs) {
    const wordCount = paragraph.match(/[A-Za-z0-9_'-]+/g)?.length ?? 0;
    check(wordCount <= 120, `${path} has a prose paragraph over 120 words`);
  }
}

const packageJson = JSON.parse(text("package.json"));
equal(
  packageJson.scripts["fixtures:block6-rollout-foundation"],
  "node scripts/block6-rollout-foundation-fixtures.mjs",
  "package fixture script is missing",
);
check(
  /node scripts\/analytics-dashboard-fixtures\.mjs\s+node scripts\/block6-rollout-foundation-fixtures\.mjs/.test(
    text(".github/workflows/ci.yml"),
  ),
  "CI fixture is not immediately after the analytics dashboard fixture",
);

process.stdout.write(`PASS durable rollout-foundation content contracts passed (${assertionCount} assertions)\n`);
process.stdout.write("REVIEW changed-path, unrelated-file, and staging checks remain independent review responsibilities\n");
process.stdout.write("LIMIT static fixtures do not prove live migration behavior or human authorship\n");
