import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let assertions = 0;

function check(condition, message) {
  assertions += 1;
  if (!condition) {
    throw new Error(message);
  }
}

function text(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function gitFiles(...pathspecs) {
  const output = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z", "--", ...pathspecs],
    { cwd: root },
  );
  return output
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .sort();
}

function snapshot(paths) {
  return new Map(
    paths
      .filter((path) => existsSync(resolve(root, path)) && statSync(resolve(root, path)).isFile())
      .map((path) => [
        path,
        createHash("sha256").update(readFileSync(resolve(root, path))).digest("hex"),
      ]),
  );
}

const protectedPaths = gitFiles(
  "src",
  ".github",
  "supabase",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "next.config.*",
  "eslint.config.*",
  "postcss.config.*",
  "playwright.config.*",
  ".env.example",
);
const protectedBefore = snapshot(protectedPaths);

const closurePath = "docs/BLOCK_7_1_CLOSURE.md";
check(existsSync(resolve(root, closurePath)), `${closurePath} is missing`);
const closure = text(closurePath);
for (const [needle, label] of [
  ["b19daafbc52ff0e1786e61ced6c2651b0cf9fb25", "repair SHA"],
  ["2401db7b8613879119a000b4a5019f7f68d88ef4", "merge SHA"],
  ["PR #17", "PR #17"],
  ["PASS_SAFE_FOR_COMMIT_GATE", "independent verdict"],
]) {
  check(closure.includes(needle), `${closurePath} is missing ${label}`);
}

const currentStatusPaths = [
  "README.md",
  "docs/PROJECT_STATUS.md",
  "docs/TODO.md",
  "docs/V2_TRANSITION_GATE.md",
  "docs/V2_DYNAMIC_EXECUTION_ROADMAP.md",
];
const currentStatus = currentStatusPaths.map((path) => text(path)).join("\n");

const phase2StatusPaths = [
  "docs/PROJECT_STATUS.md",
  "docs/TODO.md",
  "docs/V2_DYNAMIC_EXECUTION_ROADMAP.md",
  "docs/V2_RESUME_PROGRESS_COMPARISON_ARCHITECTURE.md",
];
const phase2Status = phase2StatusPaths.map((path) => text(path)).join("\n");

for (const path of phase2StatusPaths) {
  check(
    !text(path).includes("local closure candidate"),
    `${path} retains obsolete Phase 2 local-candidate wording`,
  );
}

for (const [needle, label] of [
  ["PR #26", "Phase 2 pull request"],
  ["17b1167d9d01ad2e30bc3ecbab55ddbbc93ef433", "Phase 2 merge commit"],
  ["30469897446", "successful main CI run"],
  ["/resume/compare", "direct Production route verification"],
  ["Phase 3 has not started", "Phase 3 not-started boundary"],
  ["Controlled-user invitations remain unauthorized", "controlled-user launch boundary"],
  ["Production migrations remain unauthorized", "Production migration boundary"],
  ["public beta is not authorized", "public-beta boundary"],
  ["Authenticated Production comparison was not performed", "authenticated Production limit"],
  [
    "hosted Production PostgREST pair and pagination behavior was not verified",
    "hosted PostgREST limit",
  ],
  [
    "real-user comprehension and decision-value evidence remains pending",
    "real-user evidence limit",
  ],
]) {
  check(phase2Status.includes(needle), `Phase 2 status is missing ${label}`);
}

for (const path of [
  "docs/V2_TRANSITION_GATE.md",
  "docs/V2_DYNAMIC_EXECUTION_ROADMAP.md",
  "docs/RESUME_WORKSPACE_V1_ARCHITECTURE.md",
]) {
  check(existsSync(resolve(root, path)), `${path} is missing`);
}

const transitionGate = text("docs/V2_TRANSITION_GATE.md");
for (const [needle, label] of [
  ["July 27, 2026", "founder decision date"],
  ["783e1837028b92cf1edbf29f4699acdaa50df9f8", "Version 2 baseline"],
  ["Public beta is not authorized", "public beta boundary"],
  [
    "Payments, checkout, entitlements, subscriptions, and paywalls remain deferred until",
    "explicit payment deferral",
  ],
  ["08-v2-staging-verification.txt", "staging verification report"],
  [
    "0be7d87e3f34b877b412c2ddc73a397dacfeb07e071725a3a28fc16f08585d99",
    "staging verification hash",
  ],
  ["08-v2-preview-compiled-verification.txt", "compiled Preview verification report"],
  [
    "7cebb9bed5bcf8f8427b7bb4ce850c23b5ea01b7b2be7fc3d00a1528ab44bbd0",
    "compiled Preview verification hash",
  ],
]) {
  check(transitionGate.includes(needle), `Version 2 transition gate is missing ${label}`);
}

check(
  text("docs/V2_DYNAMIC_EXECUTION_ROADMAP.md").includes(
    "## 7. Version 2 UI and Information Architecture Foundation",
  ),
  "Version 2 roadmap is missing the UI and Information Architecture phase",
);
check(
  !/(?:has no Vercel connection|is not connected to the Vercel project)/.test(
    text("docs/DEPLOYMENT.md"),
  ),
  "deployment guidance retains a stale no-Vercel-connection claim",
);
check(
  !/Production (?:configuration|environment(?:-variable)? records?) remains unchanged/i.test(
    currentStatus,
  ),
  "current authority broadly claims Production configuration remained unchanged",
);

for (const path of ["README.md", "docs/PROJECT_STATUS.md", "docs/TODO.md"]) {
  check(
    /Block 7\.1[^\n]*(?:is )?complete/i.test(text(path)),
    `${path} does not say Block 7.1 is complete`,
  );
}

for (const [pattern, label] of [
  [/Block 7\.1[^\n]*(?:next planned|next engineering|suspected risk|not (?:yet )?reproduced)/i, "stale Block 7.1 risk or sequencing claim"],
  [/Block 7[^\n]*(?:has not started|had not started|not started)/i, "stale Block 7 not-started claim"],
  [/Block 7\.2[^\n]*(?:is )?the next read-only beta-release decision gate/i, "superseded Block 7.2 current-authority claim"],
]) {
  check(!pattern.test(currentStatus), `current status contains ${label}`);
}

for (const [pattern, label] of [
  [/public beta (?:is|remains) not (?:currently )?authorized/i, "public beta remains unauthorized"],
  [/Production V5(?:,|–) V6(?:,|, and|–) V7 remain unapplied/i, "Production V5–V7 remain unapplied"],
  [/analytics (?:collection )?remains disabled/i, "analytics remains disabled"],
  [/(?:public )?(?:brand|name)[^\n]*(?:domain)[^\n]*(?:pending|remain pending)|(?:public )?brand[^\n]*pending[\s\S]{0,120}domain[^\n]*pending/i, "brand and domain remain pending"],
]) {
  check(pattern.test(currentStatus), `current status does not confirm that ${label}`);
}

const changelog = text("docs/CHANGELOG.md");
check(changelog.trim().length > 0, "docs/CHANGELOG.md is empty");
check(
  /\[Block 7\.1 Closure\]\(BLOCK_7_1_CLOSURE\.md\)/.test(text("docs/README.md")),
  "docs/README.md does not link BLOCK_7_1_CLOSURE.md",
);
for (const path of [
  "V2_TRANSITION_GATE.md",
  "V2_DYNAMIC_EXECUTION_ROADMAP.md",
  "RESUME_WORKSPACE_V1_ARCHITECTURE.md",
]) {
  check(
    text("docs/README.md").includes(`](${path})`),
    `docs/README.md does not link ${path}`,
  );
}

function localLinkTarget(rawTarget) {
  const trimmed = rawTarget.trim();
  const destination = trimmed.startsWith("<")
    ? trimmed.slice(1, trimmed.indexOf(">"))
    : trimmed.split(/\s+["'(]/, 1)[0];
  const withoutFragment = destination.split("#", 1)[0].split("?", 1)[0];

  if (
    withoutFragment.length === 0
    || isAbsolute(withoutFragment)
    || withoutFragment.startsWith("//")
    || /^[a-z][a-z0-9+.-]*:/i.test(withoutFragment)
  ) {
    return null;
  }

  return decodeURIComponent(withoutFragment);
}

const markdownPaths = gitFiles("*.md").filter((path) => existsSync(resolve(root, path)));
for (const markdownPath of markdownPaths) {
  const markdown = text(markdownPath);
  const destinations = [];
  const inlineLinks = /!?\[[^\]\n]*\]\(([^)\n]+)\)/g;
  const referenceLinks = /^\s*\[[^\]\n]+\]:\s*(?:<([^>\n]+)>|(\S+))/gm;

  for (const match of markdown.matchAll(inlineLinks)) {
    destinations.push(match[1]);
  }
  for (const match of markdown.matchAll(referenceLinks)) {
    destinations.push(match[1] ?? match[2]);
  }

  for (const destination of destinations) {
    const target = localLinkTarget(destination);
    if (target === null) {
      continue;
    }

    const resolvedTarget = resolve(root, dirname(markdownPath), target);
    const repositoryRelative = relative(root, resolvedTarget);
    check(
      repositoryRelative !== ".."
        && !repositoryRelative.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`),
      `${markdownPath} links outside the repository: ${destination}`,
    );
    check(existsSync(resolvedTarget), `${markdownPath} has a broken relative link: ${destination}`);
  }
}

const protectedAfter = snapshot(protectedPaths);
check(
  JSON.stringify([...protectedBefore]) === JSON.stringify([...protectedAfter]),
  "documentation assertions modified a source, configuration, schema, or migration file",
);

console.log(`Documentation status fixtures: ${assertions} assertions passed.`);
