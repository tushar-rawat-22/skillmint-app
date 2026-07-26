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
  "docs/BETA_V1_BUILD_ROADMAP.md",
];
const currentStatus = currentStatusPaths.map((path) => text(path)).join("\n");

for (const path of currentStatusPaths) {
  check(
    /Block 7\.1[^\n]*(?:is )?complete/i.test(text(path)),
    `${path} does not say Block 7.1 is complete`,
  );
}

for (const [pattern, label] of [
  [/Block 7\.1[^\n]*(?:next planned|next engineering|suspected risk|not (?:yet )?reproduced)/i, "stale Block 7.1 risk or sequencing claim"],
  [/Block 7[^\n]*(?:has not started|had not started|not started)/i, "stale Block 7 not-started claim"],
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
