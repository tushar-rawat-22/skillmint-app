import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const TRACKED_GHSA = "GHSA-vfj7-8cjw-p6xm";
export const EXPIRES_AT = Date.parse("2026-10-19T23:59:59Z");

export const EXPECTED_CHAIN = [
  {
    name: "eslint-config-next",
    node: "node_modules/eslint-config-next",
    version: "16.3.8",
    dependency: "@next/eslint-plugin-next",
    dependencyRange: "16.3.8",
    via: "@next/eslint-plugin-next",
  },
  {
    name: "@next/eslint-plugin-next",
    node: "node_modules/@next/eslint-plugin-next",
    version: "16.3.8",
    dependency: "fast-glob",
    dependencyRange: "3.3.1",
    via: "fast-glob",
  },
  {
    name: "fast-glob",
    node: "node_modules/fast-glob",
    version: "3.3.1",
    dependency: "micromatch",
    dependencyRange: "^4.0.4",
    via: "micromatch",
  },
  {
    name: "micromatch",
    node: "node_modules/micromatch",
    version: "4.0.8",
    dependency: "braces",
    dependencyRange: "^3.0.3",
    via: "braces",
  },
  {
    name: "braces",
    node: "node_modules/braces",
    version: "3.0.3",
    dependency: null,
    dependencyRange: null,
    via: TRACKED_GHSA,
  },
];

const EXPECTED_NAMES = new Set(EXPECTED_CHAIN.map(({ name }) => name));

export function validatePolicy({
  report,
  auditStatus,
  lock,
  runtimeBraces,
  nowMs = Date.now(),
}) {
  validateCompleteAuditReport(report);

  const vulnerabilities = Object.entries(report.vulnerabilities).filter(
    ([, vulnerability]) =>
      vulnerability &&
      (vulnerability.severity === "high" || vulnerability.severity === "critical"),
  );

  if (vulnerabilities.length === 0) {
    if (
      auditStatus !== 0 ||
      Number(report.metadata?.vulnerabilities?.high ?? 0) > 0 ||
      Number(report.metadata?.vulnerabilities?.critical ?? 0) > 0
    ) {
      throw new Error("npm audit did not confirm a clean high/critical dependency result.");
    }
    return "No high/critical dependency advisories remain.";
  }

  if (auditStatus !== 1) {
    throw new Error("npm audit exit status does not match reported high/critical vulnerabilities.");
  }
  if (nowMs > EXPIRES_AT) {
    throw new Error(
      "Temporary dev-only advisory boundary expired on 2026-10-19; re-evaluate GHSA-vfj7-8cjw-p6xm before continuing.",
    );
  }

  const actualNames = new Set(vulnerabilities.map(([name]) => name));
  const unexpectedNames = [...actualNames].filter((name) => !EXPECTED_NAMES.has(name));
  const missingNames = [...EXPECTED_NAMES].filter((name) => !actualNames.has(name));
  if (unexpectedNames.length > 0 || missingNames.length > 0) {
    throw new Error(
      `High/critical advisory set changed (unexpected: ${unexpectedNames.join(", ") || "none"}; missing: ${missingNames.join(", ") || "none"}).`,
    );
  }
  const actualHighCount = vulnerabilities.filter(
    ([, vulnerability]) => vulnerability.severity === "high",
  ).length;
  const actualCriticalCount = vulnerabilities.filter(
    ([, vulnerability]) => vulnerability.severity === "critical",
  ).length;
  if (
    Number(report.metadata?.vulnerabilities?.high) !== actualHighCount ||
    Number(report.metadata?.vulnerabilities?.critical) !== actualCriticalCount
  ) {
    throw new Error("npm audit high/critical metadata does not match the reported advisory set.");
  }

  validateLockChain(lock);

  for (const expected of EXPECTED_CHAIN) {
    const vulnerability = report.vulnerabilities[expected.name];
    if (vulnerability.severity !== "high") {
      throw new Error(`Expected high severity for ${expected.name}.`);
    }
    if (
      !Array.isArray(vulnerability.nodes) ||
      vulnerability.nodes.length !== 1 ||
      vulnerability.nodes[0] !== expected.node
    ) {
      throw new Error(`Audit node drifted for ${expected.name}; expected only ${expected.node}.`);
    }

    const via = vulnerability.via;
    if (!Array.isArray(via) || via.length !== 1) {
      throw new Error(`Audit via path drifted for ${expected.name}.`);
    }

    if (expected.name === "braces") {
      const advisory = via[0];
      if (
        !advisory ||
        typeof advisory !== "object" ||
        advisory.name !== "braces" ||
        advisory.severity !== "high" ||
        advisory.range !== "<=3.0.3" ||
        advisory.url !== `https://github.com/advisories/${TRACKED_GHSA}`
      ) {
        throw new Error(`Direct braces advisory is not exactly ${TRACKED_GHSA} for braces <=3.0.3.`);
      }
    } else if (via[0] !== expected.via) {
      throw new Error(`Audit dependency path drifted for ${expected.name}; expected via ${expected.via}.`);
    }
  }

  if (!Array.isArray(runtimeBraces)) {
    throw new Error("npm query did not return a complete production dependency result.");
  }
  if (runtimeBraces.length !== 0) {
    throw new Error("braces is reachable from the production dependency graph; the dev-only boundary is invalid.");
  }

  return `Temporarily allowing only ${TRACKED_GHSA} on the exact eslint-config-next@16.3.8 > @next/eslint-plugin-next@16.3.8 > fast-glob@3.3.1 > micromatch@4.0.8 > braces@3.0.3 dev-only path; boundary expires 2026-10-19. See issue #167.`;
}

function validateCompleteAuditReport(report) {
  if (
    !report ||
    typeof report !== "object" ||
    Array.isArray(report) ||
    report.error ||
    !report.vulnerabilities ||
    typeof report.vulnerabilities !== "object" ||
    Array.isArray(report.vulnerabilities)
  ) {
    throw new Error("npm audit returned an error or an incomplete vulnerability report.");
  }
}

function validateLockChain(lock) {
  const root = lock?.packages?.[""];
  if (!root || root.dependencies?.["eslint-config-next"] !== undefined) {
    throw new Error("eslint-config-next must remain a root dev dependency, not a production dependency.");
  }
  if (root.devDependencies?.["eslint-config-next"] !== "16.3.8") {
    throw new Error("Root eslint-config-next dev dependency drifted from 16.3.8.");
  }

  for (const expected of EXPECTED_CHAIN) {
    const entry = lock.packages?.[expected.node];
    if (!entry || entry.version !== expected.version) {
      throw new Error(`Lockfile version drifted for ${expected.node}; expected ${expected.version}.`);
    }
    if (entry.dev !== true) {
      throw new Error(`Cannot prove dev-only scope for ${expected.node}.`);
    }
    if (
      expected.dependency &&
      entry.dependencies?.[expected.dependency] !== expected.dependencyRange
    ) {
      throw new Error(
        `Lockfile dependency path drifted at ${expected.node} -> ${expected.dependency}.`,
      );
    }
  }
}

function runNpm(args) {
  const npmExecPath = process.env.npm_execpath?.trim();
  const result = npmExecPath
    ? spawnSync(process.execPath, [npmExecPath, ...args], {
        encoding: "utf8",
        env: process.env,
      })
    : spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", args, {
        encoding: "utf8",
        env: process.env,
      });

  if (result.error) {
    throw new Error(`Unable to execute npm ${args[0]}: ${result.error.message}`);
  }
  if (result.signal || (result.status !== 0 && result.status !== 1)) {
    throw new Error(
      `npm ${args[0]} did not complete normally (exit ${result.status}, signal ${result.signal ?? "none"}).`,
    );
  }
  return result;
}

function parseJsonResult(result, label) {
  try {
    return JSON.parse(result.stdout || "null");
  } catch (error) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`Unable to parse ${label} JSON: ${error.message}`);
  }
}

function main() {
  try {
    const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
    const auditResult = runNpm(["audit", "--json", "--audit-level=high"]);
    const report = parseJsonResult(auditResult, "npm audit");

    let runtimeBraces = [];
    const hasHighOrCritical = Object.values(report?.vulnerabilities ?? {}).some(
      (vulnerability) =>
        vulnerability?.severity === "high" || vulnerability?.severity === "critical",
    );
    if (hasHighOrCritical) {
      const queryResult = runNpm(["query", ":not(.dev)#braces"]);
      if (queryResult.status !== 0) {
        throw new Error("npm query did not complete successfully for the production braces check.");
      }
      runtimeBraces = parseJsonResult(queryResult, "npm query");
    }

    const message = validatePolicy({
      report,
      auditStatus: auditResult.status,
      lock,
      runtimeBraces,
    });
    console.warn(message);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (invokedPath === import.meta.url) {
  main();
}
