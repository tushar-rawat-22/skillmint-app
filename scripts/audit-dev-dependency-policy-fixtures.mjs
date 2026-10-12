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
import {
  EXPIRES_AT,
  EXPECTED_CHAIN,
  TRACKED_GHSA,
  validatePolicy,
} from "./audit-dev-dependency-policy.mjs";

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

const exactReport = {
  auditReportVersion: 2,
  vulnerabilities: Object.fromEntries(
    EXPECTED_CHAIN.map((entry) => [
      entry.name,
      {
        name: entry.name,
        severity: "high",
        isDirect: entry.name === "eslint-config-next",
        via:
          entry.name === "braces"
            ? [
                {
                  source: 1240992,
                  name: "braces",
                  dependency: "braces",
                  title:
                    "braces vulnerable to stack-exhaustion denial of service through deeply nested patterns",
                  url: `https://github.com/advisories/${TRACKED_GHSA}`,
                  severity: "high",
                  range: "<=3.0.3",
                },
              ]
            : [entry.via],
        nodes: [entry.node],
      },
    ]),
  ),
  metadata: {
    vulnerabilities: {
      info: 0,
      low: 0,
      moderate: 3,
      high: 5,
      critical: 0,
      total: 8,
    },
  },
};

const exactLock = {
  name: "audit-policy-fixture",
  version: "1.0.0",
  lockfileVersion: 3,
  requires: true,
  packages: {
    "": {
      name: "audit-policy-fixture",
      version: "1.0.0",
      dependencies: {},
      devDependencies: { "eslint-config-next": "16.3.8" },
    },
    ...Object.fromEntries(
      EXPECTED_CHAIN.map((entry) => [
        entry.node,
        {
          version: entry.version,
          dev: true,
          ...(entry.dependency
            ? { dependencies: { [entry.dependency]: entry.dependencyRange } }
            : {}),
        },
      ]),
    ),
  },
};

function check(condition, message) {
  assertions += 1;
  assert.ok(condition, message);
}

function clone(value) {
  return structuredClone(value);
}

function expectPass(name, input, expectedOutput) {
  let output;
  try {
    output = validatePolicy(input);
  } catch (error) {
    check(false, `${name}: expected pass, received ${error.message}`);
    return;
  }
  check(output.includes(expectedOutput), `${name}: unexpected output: ${output}`);
}

function expectFailure(name, input, expectedOutput) {
  let error;
  try {
    validatePolicy(input);
  } catch (caught) {
    error = caught;
  }
  check(error instanceof Error, `${name}: expected policy failure`);
  check(
    error?.message.includes(expectedOutput),
    `${name}: expected ${JSON.stringify(expectedOutput)}, received ${error?.message}`,
  );
}

function exactInput() {
  return {
    report: clone(exactReport),
    auditStatus: 1,
    lock: clone(exactLock),
    runtimeBraces: [],
    nowMs: Date.parse("2026-10-12T12:00:00Z"),
  };
}

function runCliCase({
  name,
  report,
  auditStatus,
  queryReport = [],
  queryStatus = 0,
  expectedStatus,
  expectedOutput,
}) {
  const caseRoot = resolve(fixtureRoot, name);
  const binRoot = resolve(caseRoot, "bin");
  mkdirSync(binRoot, { recursive: true });
  writeFileSync(resolve(caseRoot, "package-lock.json"), JSON.stringify(exactLock));
  writeFileSync(
    resolve(binRoot, "npm"),
    [
      "#!/usr/bin/env node",
      `const isQuery = process.argv[2] === "query";`,
      `process.stdout.write(JSON.stringify(isQuery ? ${JSON.stringify(queryReport)} : ${JSON.stringify(report)}));`,
      `process.exit(isQuery ? ${queryStatus} : ${auditStatus});`,
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
  expectPass(
    "clean high/critical audit",
    {
      report: clone(completeModerateReport),
      auditStatus: 0,
      lock: {},
      runtimeBraces: [],
    },
    "No high/critical dependency advisories remain.",
  );

  expectFailure(
    "incomplete audit report",
    {
      report: {},
      auditStatus: 0,
      lock: {},
      runtimeBraces: [],
    },
    "incomplete vulnerability report",
  );

  expectFailure(
    "clean audit exit mismatch",
    {
      report: clone(completeModerateReport),
      auditStatus: 1,
      lock: {},
      runtimeBraces: [],
    },
    "did not confirm a clean high/critical",
  );

  expectPass(
    "exact temporary boundary",
    exactInput(),
    `only ${TRACKED_GHSA} on the exact eslint-config-next@16.3.8`,
  );

  const expired = exactInput();
  expired.nowMs = EXPIRES_AT + 1;
  expectFailure("expired boundary", expired, "boundary expired on 2026-10-19");

  const unrelated = exactInput();
  unrelated.report.vulnerabilities["unrelated-package"] = {
    name: "unrelated-package",
    severity: "critical",
    via: [],
    nodes: ["node_modules/unrelated-package"],
  };
  expectFailure("unrelated critical advisory", unrelated, "unexpected: unrelated-package");

  const missing = exactInput();
  delete missing.report.vulnerabilities.micromatch;
  expectFailure("missing expected path node", missing, "missing: micromatch");

  const metadataMismatch = exactInput();
  metadataMismatch.report.metadata.vulnerabilities.high = 6;
  expectFailure(
    "audit metadata mismatch",
    metadataMismatch,
    "metadata does not match the reported advisory set",
  );

  const wrongGhsa = exactInput();
  wrongGhsa.report.vulnerabilities.braces.via[0].url =
    "https://github.com/advisories/GHSA-xxxx-xxxx-xxxx";
  expectFailure("wrong advisory identity", wrongGhsa, `not exactly ${TRACKED_GHSA}`);

  const wrongAffectedRange = exactInput();
  wrongAffectedRange.report.vulnerabilities.braces.via[0].range = "<3.0.3";
  expectFailure("wrong affected range", wrongAffectedRange, "braces <=3.0.3");

  const wrongVersion = exactInput();
  wrongVersion.lock.packages["node_modules/braces"].version = "3.0.4";
  expectFailure("wrong package version", wrongVersion, "expected 3.0.3");

  const nonDev = exactInput();
  nonDev.lock.packages["node_modules/fast-glob"].dev = false;
  expectFailure("non-dev affected node", nonDev, "Cannot prove dev-only scope");

  const pathDrift = exactInput();
  pathDrift.lock.packages["node_modules/micromatch"].dependencies.braces = "^4.0.0";
  expectFailure("lock dependency path drift", pathDrift, "dependency path drifted");

  const auditPathDrift = exactInput();
  auditPathDrift.report.vulnerabilities["fast-glob"].via = ["other-package"];
  expectFailure("audit dependency path drift", auditPathDrift, "expected via micromatch");

  const nodeDrift = exactInput();
  nodeDrift.report.vulnerabilities.braces.nodes.push(
    "node_modules/runtime-package/node_modules/braces",
  );
  expectFailure("additional affected node", nodeDrift, "Audit node drifted for braces");

  const runtimeReachable = exactInput();
  runtimeReachable.runtimeBraces = [
    { name: "braces", version: "3.0.3", location: "node_modules/braces", dev: false },
  ];
  expectFailure(
    "runtime braces reachability",
    runtimeReachable,
    "reachable from the production dependency graph",
  );

  const productionRoot = exactInput();
  productionRoot.lock.packages[""].dependencies["eslint-config-next"] = "16.3.8";
  expectFailure(
    "production root dependency",
    productionRoot,
    "must remain a root dev dependency",
  );

  runCliCase({
    name: "cli-exact-boundary",
    report: exactReport,
    auditStatus: 1,
    expectedStatus: 0,
    expectedOutput: `only ${TRACKED_GHSA} on the exact eslint-config-next@16.3.8`,
  });

  runCliCase({
    name: "cli-query-failure",
    report: exactReport,
    auditStatus: 1,
    queryStatus: 1,
    expectedStatus: 1,
    expectedOutput: "npm query did not complete successfully",
  });
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}

console.log(`Audit dependency policy fixtures passed (${assertions} assertions).`);
