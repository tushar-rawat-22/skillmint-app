import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const policyPath = resolve(root, "scripts/audit-dev-dependency-policy.mjs");
const fixtureRoot = mkdtempSync(join(tmpdir(), "skillmint-audit-policy-"));
let assertions = 0;

const completeModerateReport = {
  auditReportVersion: 2,
  vulnerabilities: {
    "sprintf-js": {
      name: "sprintf-js",
      severity: "moderate",
      isDirect: false,
      via: [],
      effects: ["argparse"],
      range: "*",
      nodes: ["node_modules/sprintf-js"],
      fixAvailable: false,
    },
  },
  metadata: {
    vulnerabilities: {
      info: 0,
      low: 0,
      moderate: 1,
      high: 0,
      critical: 0,
      total: 1,
    },
  },
};

function check(condition, message) {
  assertions += 1;
  assert.ok(condition, message);
}

function runCase({ name, report, auditStatus, expectedStatus, expectedOutput }) {
  const caseRoot = resolve(fixtureRoot, name);
  const binRoot = resolve(caseRoot, "bin");
  const packageLock = {
    name: "audit-policy-fixture",
    version: "1.0.0",
    lockfileVersion: 3,
    requires: true,
    packages: { "": { name: "audit-policy-fixture", version: "1.0.0" } },
  };

  mkdirSync(binRoot, { recursive: true });
  writeFileSync(resolve(caseRoot, "package-lock.json"), JSON.stringify(packageLock));
  writeFileSync(
    resolve(binRoot, "npm"),
    [
      "#!/usr/bin/env node",
      `process.stdout.write(${JSON.stringify(JSON.stringify(report))});`,
      `process.exit(${auditStatus});`,
      "",
    ].join("\n"),
  );
  chmodSync(resolve(binRoot, "npm"), 0o755);

  const env = {
    ...process.env,
    PATH: `${binRoot}${delimiter}${process.env.PATH ?? ""}`,
  };
  delete env.npm_execpath;

  const result = spawnSync(process.execPath, [policyPath], {
    cwd: caseRoot,
    encoding: "utf8",
    env,
  });
  const output = `${result.stdout}${result.stderr}`;

  check(
    result.status === expectedStatus,
    `${name}: expected exit ${expectedStatus}, received ${result.status}: ${output}`,
  );
  check(
    output.includes(expectedOutput),
    `${name}: expected output to include ${JSON.stringify(expectedOutput)}: ${output}`,
  );
}

try {
  runCase({
    name: "complete-moderate-report",
    report: completeModerateReport,
    auditStatus: 0,
    expectedStatus: 0,
    expectedOutput: "No high/critical dependency advisories remain.",
  });
  runCase({
    name: "malformed-report",
    report: {},
    auditStatus: 0,
    expectedStatus: 1,
    expectedOutput: "npm audit returned an error or an incomplete vulnerability report.",
  });
  runCase({
    name: "exit-report-mismatch",
    report: completeModerateReport,
    auditStatus: 1,
    expectedStatus: 1,
    expectedOutput: "npm audit did not confirm a clean high/critical dependency result.",
  });
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}

console.log(`Audit dependency policy fixtures passed (${assertions} assertions).`);
