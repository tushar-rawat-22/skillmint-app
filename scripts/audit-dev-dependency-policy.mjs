import fs from "node:fs";
import { spawnSync } from "node:child_process";

const TRACKED_GHSA = "GHSA-vfj7-8cjw-p6xm";
const EXPIRES_AT = Date.parse("2026-10-10T23:59:59Z");
const ALLOWED_PACKAGES = new Set([
  "braces",
  "micromatch",
  "fast-glob",
  "@next/eslint-plugin-next",
  "eslint-config-next",
]);

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (Date.now() > EXPIRES_AT) {
  fail(
    "Temporary dev-only advisory boundary expired on 2026-10-10; re-evaluate GHSA-vfj7-8cjw-p6xm before continuing."
  );
}

const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const result = spawnSync(
  process.execPath,
  [process.env.npm_execpath, "audit", "--json", "--audit-level=high"],
  { encoding: "utf8", env: process.env }
);

if (result.error) {
  fail(`Unable to execute npm audit: ${result.error.message}`);
}

let report;
try {
  report = JSON.parse(result.stdout || "{}");
} catch (error) {
  console.error(result.stdout);
  console.error(result.stderr);
  fail(`Unable to parse npm audit JSON: ${error.message}`);
}

const vulnerabilities = Object.entries(report.vulnerabilities ?? {}).filter(
  ([, vulnerability]) =>
    vulnerability &&
    (vulnerability.severity === "high" || vulnerability.severity === "critical")
);

if (vulnerabilities.length === 0) {
  console.log("No high/critical dependency advisories remain.");
  process.exit(0);
}

let foundTrackedAdvisory = false;

for (const [name, vulnerability] of vulnerabilities) {
  if (!ALLOWED_PACKAGES.has(name)) {
    fail(
      `Unexpected high/critical advisory package ${name}; only the tracked dev-only braces chain is temporarily allowed.`
    );
  }

  for (const node of vulnerability.nodes ?? []) {
    const lockEntry = lock.packages?.[node];
    if (!lockEntry || lockEntry.dev !== true) {
      fail(
        `High/critical advisory reached non-dev node ${node}; temporary dev-only boundary is invalid.`
      );
    }
  }

  for (const via of vulnerability.via ?? []) {
    if (typeof via === "string") {
      if (!ALLOWED_PACKAGES.has(via)) {
        fail(
          `Unexpected high/critical meta-vulnerability dependency ${via} in ${name}.`
        );
      }
      continue;
    }

    if (!via || typeof via !== "object") {
      fail(`Unexpected npm audit via entry for ${name}.`);
    }

    const identifiers = [via.url, via.title, String(via.source ?? "")]
      .filter(Boolean)
      .join(" ");

    if (!identifiers.includes(TRACKED_GHSA)) {
      fail(
        `Unexpected high/critical advisory in ${name}: ${via.url ?? via.title ?? via.source}.`
      );
    }

    foundTrackedAdvisory = true;
  }
}

if (!foundTrackedAdvisory) {
  fail(
    `High/critical advisories exist but ${TRACKED_GHSA} was not the direct tracked advisory.`
  );
}

console.warn(
  `Temporarily allowing only ${TRACKED_GHSA} because every affected node is dev-only, the advisory has no patched braces release, and the boundary expires 2026-10-10. See issue #167.`
);
