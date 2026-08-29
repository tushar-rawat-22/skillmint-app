import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

import {
  BASELINE_VERSION,
  LOCAL_DATABASE_CONFIG,
  ORDERED_VERSIONS,
  buildRehearsalPlan,
  validateLocalOnlyPlan,
} from "./production-local-migration-rehearsal.mjs";

let assertions = 0;

function equal(actual, expected, message) {
  assertions += 1;
  assert.deepEqual(actual, expected, message);
}

function check(condition, message) {
  assertions += 1;
  assert.ok(condition, message);
}

const plan = buildRehearsalPlan();
check(validateLocalOnlyPlan(plan), "rehearsal plan must validate");
equal(
  plan.map((entry) => entry.scenario),
  ["absent-v9-drift", "compatible-v9-drift", "incompatible-v9-drift"],
  "rehearsal scenarios changed",
);
equal(BASELINE_VERSION, "20260723000200", "baseline is not exact V1+V2");
equal(ORDERED_VERSIONS.length, 13, "migration chain length changed");
equal(
  ORDERED_VERSIONS.at(-1),
  "20260829001200",
  "rehearsal no longer ends at V12",
);
equal(
  {
    host: LOCAL_DATABASE_CONFIG.host,
    port: LOCAL_DATABASE_CONFIG.port,
    database: LOCAL_DATABASE_CONFIG.database,
    user: LOCAL_DATABASE_CONFIG.user,
  },
  {
    host: "127.0.0.1",
    port: 54322,
    database: "postgres",
    user: "postgres",
  },
  "rehearsal database is not the committed local Supabase database",
);

for (const scenario of plan) {
  for (const args of [scenario.reset, scenario.migrate]) {
    check(args.includes("--local"), `${scenario.scenario} lost --local`);
    check(!args.includes("--linked"), `${scenario.scenario} gained --linked`);
    check(!args.includes("--db-url"), `${scenario.scenario} gained --db-url`);
  }
  equal(
    scenario.reset,
    ["db", "reset", "--local", "--no-seed", "--version", BASELINE_VERSION],
    `${scenario.scenario} reset target changed`,
  );
  equal(
    scenario.migrate,
    ["migration", "up", "--local"],
    `${scenario.scenario} migration target changed`,
  );
}

equal(plan[0].inject, null, "absent-drift scenario must not inject V9 drift");
check(
  plan[1].inject.includes("security definer") &&
    plan[1].inject.includes("CREATE TABLE AS") &&
    plan[1].inject.includes("SELECT INTO"),
  "compatible-drift scenario lost the exact V9 shape",
);
check(
  !plan[2].inject.includes("security definer") &&
    !plan[2].inject.includes("CREATE TABLE AS") &&
    !plan[2].inject.includes("SELECT INTO"),
  "incompatible-drift scenario no longer violates the V9 contract",
);
equal(
  plan.map((entry) => entry.expectMigrationSuccess),
  [true, true, false],
  "fail-closed expectations changed",
);

const script = resolve(
  import.meta.dirname,
  "production-local-migration-rehearsal.mjs",
);
const dryRun = spawnSync(process.execPath, [script], {
  encoding: "utf8",
  env: {
    ...process.env,
    SKILLMINT_ALLOW_LOCAL_DB_RESET: "",
  },
});
equal(dryRun.status, 0, "dry-run plan failed");
check(
  dryRun.stdout.includes('"destructive_target": "local SkillMint Supabase database only"'),
  "dry-run does not identify its destructive target",
);
check(
  dryRun.stdout.includes('"database": "127.0.0.1:54322/postgres"'),
  "dry-run does not identify the fixed local database target",
);
check(
  dryRun.stdout.includes('"scenario": "incompatible-v9-drift"'),
  "dry-run omits the fail-closed scenario",
);
check(!dryRun.stdout.includes("postgresql://"), "dry-run prints a PostgreSQL connection string");
check(!dryRun.stdout.includes("--linked"), "dry-run exposes linked execution");
check(!dryRun.stdout.includes("--db-url"), "dry-run exposes arbitrary database execution");

const unauthorizedExecute = spawnSync(process.execPath, [script, "--execute"], {
  encoding: "utf8",
  env: {
    ...process.env,
    SKILLMINT_ALLOW_LOCAL_DB_RESET: "",
  },
});
equal(unauthorizedExecute.status, 1, "execute must fail without explicit local reset confirmation");
check(
  unauthorizedExecute.stderr.includes("local_reset_not_authorized"),
  "unauthorized execute did not fail at the confirmation boundary",
);
check(
  !unauthorizedExecute.stderr.includes("supabase_cli_unavailable"),
  "execute touched the Supabase CLI before authorization",
);

console.log(`production local migration rehearsal fixtures: ${assertions} assertions passed`);
