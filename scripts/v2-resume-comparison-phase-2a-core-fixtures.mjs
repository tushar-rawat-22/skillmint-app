import assert from "node:assert/strict";
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
const originalResolveFilename = Module._resolveFilename;
const acceptedCoreCommit =
  "02501543fdb39a7ad51d08a29adb15a175844f15";
const fixtureArguments = process.argv.slice(2);
const closureMode =
  fixtureArguments.length === 1 && fixtureArguments[0] === "--closure";

if (fixtureArguments.length > 0 && !closureMode) {
  throw new Error(
    "Use no arguments for implementation-time mode or --closure for committed closure mode.",
  );
}

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

require.extensions[".ts"] = function compileTypeScript(module, filename) {
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const ACCOUNT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ACCOUNT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SOURCE_A_ID = uuid(1);
const SOURCE_B_ID = uuid(2);
const SOURCE_C_ID = uuid(3);
const SAVED_AT_A = "2026-07-29T10:00:00.000Z";
const SAVED_AT_B = "2026-07-29T11:00:00.000Z";
const EXPECTED_PAIR_SELECTIONS = [
  "id",
  "user_id",
  "file_name",
  "created_at",
  "comparison_skills:parsed_profile->skills",
  "comparison_projects:parsed_profile->projects",
  "comparison_experience:parsed_profile->experience",
  "comparison_certifications:parsed_profile->certifications",
  "link_github:parsed_profile->links->github",
  "link_linkedin:parsed_profile->links->linkedin",
  "link_portfolio:parsed_profile->links->portfolio",
  "link_leetcode:parsed_profile->links->leetcode",
  "link_codeforces:parsed_profile->links->codeforces",
  "flag_has_measurable_impact:user_profile->analysisFlags->hasMeasurableImpact",
  "flag_has_section_clarity:user_profile->analysisFlags->hasSectionClarity",
  "flag_has_proof_link:user_profile->analysisFlags->hasProofLink",
  "flag_has_generic_projects:user_profile->analysisFlags->hasGenericProjects",
  "flag_is_placeholder_text:user_profile->analysisFlags->isPlaceholderText",
];
const EXPECTED_PAIR_PROJECTION = EXPECTED_PAIR_SELECTIONS.join(", ");
const domainPath =
  "src/modules/resume/domain/resumeComparison.ts";
const repositoryPath =
  "src/modules/resume/services/resumeComparisonRepository.ts";
const fixturePath =
  "scripts/v2-resume-comparison-phase-2a-core-fixtures.mjs";
const indexPath = "src/modules/resume/index.ts";
const approvedPaths = [
  domainPath,
  repositoryPath,
  fixturePath,
  indexPath,
].sort();
const closureApprovedPaths = [
  ".github/workflows/ci.yml",
  "docs/PROJECT_STATUS.md",
  "docs/TODO.md",
  "docs/V2_DYNAMIC_EXECUTION_ROADMAP.md",
  "docs/V2_RESUME_PROGRESS_COMPARISON_ARCHITECTURE.md",
  "e2e/resume-comparison.spec.ts",
  "package.json",
  "scripts/resume-workspace-phase-1a-fixtures.mjs",
  fixturePath,
  "src/modules/resume/components/ResumeComparisonView.tsx",
].sort();
const domainSource = readText(domainPath);
const repositorySource = readText(repositoryPath);
const indexSource = readText(indexPath);

let currentClient = null;
const clientModulePath = require.resolve("../src/lib/supabase/client.ts");
const configModulePath = require.resolve("../src/lib/supabase/config.ts");
require.cache[clientModulePath] = moduleStub(clientModulePath, {
  createSupabaseBrowserClient: () => currentClient,
});
require.cache[configModulePath] = moduleStub(configModulePath, {
  getSupabaseConfigStatus: () => ({
    isConfigured: true,
    message: "Configured for deterministic comparison fixtures.",
  }),
});

const {
  compareResumeEvidence: compareValidatedResumeEvidence,
  RESUME_COMPARISON_FLAG_TYPES,
  RESUME_COMPARISON_LINK_TYPES,
  validateResumeComparisonEvidence,
} = require("../src/modules/resume/domain/resumeComparison.ts");
const {
  listCurrentUserResumeAnalysisPage,
  RESUME_COMPARISON_PAGE_SIZE,
  resolveCurrentUserResumeAnalysisPair,
} = require(
  "../src/modules/resume/services/resumeComparisonRepository.ts"
);

const tests = [];

function test(name, callback, kind = "behavior") {
  tests.push({ name, callback, kind });
}

function compareResumeEvidence(sourceA, sourceB) {
  return compareValidatedResumeEvidence(
    validateResumeComparisonEvidence(sourceA),
    validateResumeComparisonEvidence(sourceB),
  );
}

test("domain compares exactly two valid sources in caller order", () => {
  const sourceA = persistentSource({
    id: SOURCE_A_ID,
    fileName: "Source A.pdf",
    savedAt: SAVED_AT_A,
  });
  const sourceB = persistentSource({
    id: SOURCE_B_ID,
    fileName: "Source B.pdf",
    savedAt: SAVED_AT_B,
  });
  const result = compareResumeEvidence(sourceA, sourceB);
  assert.equal(result.status, "comparable");
  assert.equal(result.sourceA.id, SOURCE_A_ID);
  assert.equal(result.sourceB.id, SOURCE_B_ID);
  assert.equal(result.sourceA.fileName, "Source A.pdf");
  assert.equal(result.sourceB.fileName, "Source B.pdf");
});

test("domain output is structurally deterministic", () => {
  const sourceA = persistentSource();
  const sourceB = persistentSource({ id: SOURCE_B_ID });
  assert.deepEqual(
    compareResumeEvidence(sourceA, sourceB),
    compareResumeEvidence(sourceA, sourceB),
  );
});

test("domain never modifies either input", () => {
  const sourceA = persistentSource({
    parsedProfile: parsedEvidence({
      skills: [" TypeScript ", "React"],
    }),
  });
  const sourceB = persistentSource({
    id: SOURCE_B_ID,
    parsedProfile: parsedEvidence({
      skills: ["React", "Node.js"],
    }),
  });
  const beforeA = structuredClone(sourceA);
  const beforeB = structuredClone(sourceB);
  compareResumeEvidence(sourceA, sourceB);
  assert.deepEqual(sourceA, beforeA);
  assert.deepEqual(sourceB, beforeB);
  assert.equal(JSON.stringify(sourceA), JSON.stringify(beforeA));
  assert.equal(JSON.stringify(sourceB), JSON.stringify(beforeB));
});

test("equal skills are retained without additions or removals", () => {
  const result = compareWithSkills(
    ["React", "TypeScript"],
    ["React", "TypeScript"],
  );
  assert.deepEqual(result.skills, {
    status: "available",
    retained: ["React", "TypeScript"],
    onlyInSourceA: [],
    onlyInSourceB: [],
    truncated: false,
  });
});

test("skills produce retained and source-only groups", () => {
  const result = compareWithSkills(
    ["React", "CSS"],
    ["React", "Node.js"],
  );
  assert.deepEqual(result.skills, {
    status: "available",
    retained: ["React"],
    onlyInSourceA: ["CSS"],
    onlyInSourceB: ["Node.js"],
    truncated: false,
  });
});

test("skills use bounded whitespace and case-insensitive canonicalization", () => {
  const result = compareWithSkills(
    ["  TypeScript  ", "React   Query", "typescript"],
    ["TYPESCRIPT", " react query ", "Node.js"],
  );
  assert.equal(result.skills.status, "available");
  assert.deepEqual(result.skills.retained, ["React Query", "TypeScript"]);
  assert.deepEqual(result.skills.onlyInSourceA, []);
  assert.deepEqual(result.skills.onlyInSourceB, ["Node.js"]);
});

test("long skills cannot collide through prefix truncation", () => {
  const sharedPrefix = "x".repeat(120);
  const result = compareWithSkills(
    [`${sharedPrefix}A`],
    [`${sharedPrefix}B`],
  );
  assert.deepEqual(result.skills, {
    status: "unavailable",
    sourceA: "unavailable",
    sourceB: "unavailable",
  });
});

test("an over-limit skill makes its complete evidence group unavailable", () => {
  const result = compareWithSkills(
    ["React", "x".repeat(121)],
    ["React"],
  );
  assert.deepEqual(result.skills, {
    status: "unavailable",
    sourceA: "unavailable",
    sourceB: "available",
  });
});

test("blank and whitespace-only skills make evidence unavailable", () => {
  const blank = compareWithSkills(["React", ""], ["React"]);
  assert.equal(blank.skills.status, "unavailable");
  assert.equal(blank.skills.sourceA, "unavailable");

  const whitespace = compareWithSkills(["   "], ["React"]);
  assert.equal(whitespace.skills.status, "unavailable");
  assert.equal(whitespace.skills.sourceA, "unavailable");
});

test("skill labels and ordering are deterministic", () => {
  const result = compareWithSkills(
    ["typescript", "React", "CSS"],
    ["TypeScript", "react", "Angular"],
  );
  assert.equal(result.skills.status, "available");
  assert.deepEqual(result.skills.retained, ["React", "typescript"]);
  assert.deepEqual(result.skills.onlyInSourceA, ["CSS"]);
  assert.deepEqual(result.skills.onlyInSourceB, ["Angular"]);
});

test("skill output is bounded and reports truncation", () => {
  const sourceASkills = Array.from(
    { length: 130 },
    (_, index) => `A skill ${String(index).padStart(3, "0")}`,
  );
  const sourceBSkills = Array.from(
    { length: 130 },
    (_, index) => `B skill ${String(index).padStart(3, "0")}`,
  );
  const result = compareWithSkills(sourceASkills, sourceBSkills);
  assert.equal(result.skills.status, "available");
  assert.equal(result.skills.onlyInSourceA.length, 100);
  assert.equal(result.skills.onlyInSourceB.length, 100);
  assert.equal(result.skills.truncated, true);
});

test("valid empty evidence arrays remain available zero values", () => {
  const result = compareEvidence(
    { skills: [], projects: [], experience: [], certifications: [] },
    { skills: [], projects: [], experience: [], certifications: [] },
  );
  assert.equal(result.skills.status, "available");
  assert.deepEqual(result.skills.retained, []);
  assert.deepEqual(result.counts.projects, {
    status: "available",
    sourceA: 0,
    sourceB: 0,
    delta: 0,
  });
  assert.equal(result.counts.experience.sourceA, 0);
  assert.equal(result.counts.certifications.sourceB, 0);
});

test("missing evidence arrays remain unavailable", () => {
  const result = compareEvidence(
    {
      skills: undefined,
      projects: undefined,
      experience: undefined,
      certifications: undefined,
    },
    {
      skills: undefined,
      projects: undefined,
      experience: undefined,
      certifications: undefined,
    },
  );
  assert.deepEqual(result.skills, {
    status: "unavailable",
    sourceA: "unavailable",
    sourceB: "unavailable",
  });
  assert.equal(result.counts.projects.status, "unavailable");
  assert.equal(result.counts.experience.status, "unavailable");
  assert.equal(result.counts.certifications.status, "unavailable");
});

test("malformed evidence arrays remain unavailable", () => {
  const result = compareEvidence(
    {
      skills: ["React", 42],
      projects: "project",
      experience: [null],
      certifications: {},
    },
    {},
  );
  assert.equal(result.skills.status, "unavailable");
  assert.equal(result.counts.projects.status, "unavailable");
  assert.equal(result.counts.experience.status, "unavailable");
  assert.equal(result.counts.certifications.status, "unavailable");
});

test("blank project evidence is unavailable rather than count one", () => {
  const result = compareEvidence(
    { projects: [""] },
    { projects: ["valid"] },
  );
  assert.equal(result.counts.projects.status, "unavailable");
  assert.deepEqual(result.counts.projects.sourceA, {
    status: "unavailable",
  });
});

test("whitespace-only experience evidence is unavailable", () => {
  const result = compareEvidence(
    { experience: ["   "] },
    { experience: ["valid"] },
  );
  assert.equal(result.counts.experience.status, "unavailable");
  assert.deepEqual(result.counts.experience.sourceA, {
    status: "unavailable",
  });
});

test("one blank certification invalidates the complete count", () => {
  const result = compareEvidence(
    { certifications: ["valid", " "] },
    { certifications: ["valid"] },
  );
  assert.equal(result.counts.certifications.status, "unavailable");
  assert.deepEqual(result.counts.certifications.sourceA, {
    status: "unavailable",
  });
});

test("valid non-empty evidence arrays preserve exact counts", () => {
  const result = compareEvidence(
    {
      projects: ["one", "two"],
      experience: ["one"],
      certifications: ["one", "two", "three"],
    },
    {
      projects: ["one"],
      experience: ["one", "two"],
      certifications: ["one"],
    },
  );
  assert.equal(result.counts.projects.sourceA, 2);
  assert.equal(result.counts.projects.sourceB, 1);
  assert.equal(result.counts.experience.sourceA, 1);
  assert.equal(result.counts.experience.sourceB, 2);
  assert.equal(result.counts.certifications.sourceA, 3);
  assert.equal(result.counts.certifications.sourceB, 1);
});

test("equal detected counts produce a zero signed delta", () => {
  const result = compareEvidence(
    { projects: ["a"], experience: ["a"], certifications: ["a"] },
    { projects: ["b"], experience: ["b"], certifications: ["b"] },
  );
  assert.equal(result.counts.projects.delta, 0);
  assert.equal(result.counts.experience.delta, 0);
  assert.equal(result.counts.certifications.delta, 0);
});

test("counts produce a positive sourceB-minus-sourceA delta", () => {
  const result = compareEvidence(
    { projects: ["a"] },
    { projects: ["a", "b", "c"] },
  );
  assert.deepEqual(result.counts.projects, {
    status: "available",
    sourceA: 1,
    sourceB: 3,
    delta: 2,
  });
});

test("counts produce a negative sourceB-minus-sourceA delta", () => {
  const result = compareEvidence(
    { experience: ["a", "b", "c"] },
    { experience: ["a"] },
  );
  assert.deepEqual(result.counts.experience, {
    status: "available",
    sourceA: 3,
    sourceB: 1,
    delta: -2,
  });
});

test("a missing sourceA count is unavailable rather than zero", () => {
  const result = compareEvidence(
    { certifications: undefined },
    { certifications: [] },
  );
  assert.deepEqual(result.counts.certifications, {
    status: "unavailable",
    sourceA: { status: "unavailable" },
    sourceB: { status: "available", value: 0 },
  });
});

test("a missing sourceB count is unavailable rather than zero", () => {
  const result = compareEvidence(
    { projects: [] },
    { projects: undefined },
  );
  assert.deepEqual(result.counts.projects, {
    status: "unavailable",
    sourceA: { status: "available", value: 0 },
    sourceB: { status: "unavailable" },
  });
});

test("equal link presence is represented without URLs", () => {
  const result = compareWithLinks(
    { github: "https://private.invalid/a" },
    { github: "https://private.invalid/b" },
  );
  assert.deepEqual(result.links.github, {
    sourceA: "detected",
    sourceB: "detected",
    change: "retained",
  });
});

test("a link detected only in sourceB is represented by category", () => {
  const result = compareWithLinks({}, { portfolio: "https://secret.invalid" });
  assert.deepEqual(result.links.portfolio, {
    sourceA: "not_detected",
    sourceB: "detected",
    change: "only_in_source_b",
  });
});

test("a link detected only in sourceA is represented by category", () => {
  const result = compareWithLinks({ leetcode: "https://secret.invalid" }, {});
  assert.deepEqual(result.links.leetcode, {
    sourceA: "detected",
    sourceB: "not_detected",
    change: "only_in_source_a",
  });
});

test("a malformed projected link value remains unavailable", () => {
  const result = compareWithLinks({ github: 42 }, {});
  assert.deepEqual(result.links.github, {
    sourceA: "unavailable",
    sourceB: "not_detected",
    change: "unavailable",
  });
});

test("only the five approved link categories appear", () => {
  const result = compareWithLinks(
    {
      github: "https://secret.invalid",
      email: "private@example.invalid",
      phone: "+91 0000000000",
      other: "https://other.invalid",
    },
    {},
  );
  assert.deepEqual(Object.keys(result.links), [
    ...RESUME_COMPARISON_LINK_TYPES,
  ]);
});

test("link values never appear in comparison output", () => {
  const result = compareWithLinks(
    {
      github: "https://source-a.invalid/private",
      linkedin: "https://source-a.invalid/profile",
    },
    {
      portfolio: "https://source-b.invalid/private",
      codeforces: "https://source-b.invalid/contest",
    },
  );
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /https?:\/\//i);
  assert.doesNotMatch(serialized, /source-[ab]\.invalid/i);
});

test("all approved flags cover every tri-state transition", () => {
  for (const flag of RESUME_COMPARISON_FLAG_TYPES) {
    const detectedToDetected = compareWithFlags(
      { [flag]: true },
      { [flag]: true },
    );
    assert.equal(detectedToDetected.flags[flag].change, "retained");

    const absentToAbsent = compareWithFlags(
      { [flag]: false },
      { [flag]: false },
    );
    assert.equal(absentToAbsent.flags[flag].change, "absent_in_both");

    const removed = compareWithFlags(
      { [flag]: true },
      { [flag]: false },
    );
    assert.equal(removed.flags[flag].change, "only_in_source_a");

    const added = compareWithFlags(
      { [flag]: false },
      { [flag]: true },
    );
    assert.equal(added.flags[flag].change, "only_in_source_b");

    const unavailable = compareWithFlags(
      { [flag]: true },
      { [flag]: "malformed" },
    );
    assert.equal(unavailable.flags[flag].change, "unavailable");
  }
});

test("missing analysis flags remain unavailable", () => {
  const result = compareResumeEvidence(
    persistentSource({ userProfile: {} }),
    persistentSource({ id: SOURCE_B_ID, userProfile: null }),
  );
  for (const flag of RESUME_COMPARISON_FLAG_TYPES) {
    assert.equal(result.flags[flag].sourceA, "unavailable");
    assert.equal(result.flags[flag].sourceB, "unavailable");
    assert.equal(result.flags[flag].change, "unavailable");
  }
});

test("placeholder sourceA returns typed unusable evidence", () => {
  const result = compareWithFlags(
    { isPlaceholderText: true },
    { isPlaceholderText: false },
  );
  assert.deepEqual(result, {
    status: "unusable_evidence",
    sourceA: {
      id: SOURCE_A_ID,
      fileName: "Source A.pdf",
      savedAt: SAVED_AT_A,
      versionStatus: "not_recorded",
    },
    sourceB: {
      id: SOURCE_B_ID,
      fileName: "Source B.pdf",
      savedAt: SAVED_AT_B,
      versionStatus: "not_recorded",
    },
    unusableSources: ["sourceA"],
    reason: "placeholder_text",
  });
});

test("placeholder sourceB and both-source states are deterministic", () => {
  const sourceBOnly = compareWithFlags(
    { isPlaceholderText: false },
    { isPlaceholderText: true },
  );
  assert.deepEqual(sourceBOnly.unusableSources, ["sourceB"]);

  const both = compareWithFlags(
    { isPlaceholderText: true },
    { isPlaceholderText: true },
  );
  assert.deepEqual(both.unusableSources, ["sourceA", "sourceB"]);
});

test("saved time is retained as context and version is not recorded", () => {
  const result = compareResumeEvidence(
    persistentSource({ savedAt: SAVED_AT_A }),
    persistentSource({ id: SOURCE_B_ID, savedAt: SAVED_AT_B }),
  );
  assert.equal(result.sourceA.savedAt, SAVED_AT_A);
  assert.equal(result.sourceB.savedAt, SAVED_AT_B);
  assert.equal(result.sourceA.versionStatus, "not_recorded");
  assert.equal(result.sourceB.versionStatus, "not_recorded");
  assert.equal("analyzedAt" in result.sourceA, false);
});

test("validator consumes a narrow source and returns only sanitized evidence", () => {
  const validated = validateResumeComparisonEvidence(
    persistentSource({
      parsedProfile: parsedEvidence({
        links: {
          github: "https://private.invalid",
          email: "person@example.invalid",
        },
        rawSections: {
          projects: "RAW_PROJECT_SECRET",
        },
      }),
      userProfile: userEvidence({
        resumeScore: 991,
      }),
    }),
  );
  const serialized = JSON.stringify(validated);
  assert.doesNotMatch(serialized, /RAW_PROJECT_SECRET/);
  assert.doesNotMatch(serialized, /person@example\.invalid/);
  assert.doesNotMatch(serialized, /private\.invalid/);
  assert.doesNotMatch(serialized, /resumeScore|991/);
});

test("comparison output contains no numeric score field", () => {
  const result = compareResumeEvidence(
    persistentSource({
      userProfile: userEvidence({
        resumeScore: 91,
        atsScore: 4,
        recruiterScore: 5,
      }),
    }),
    persistentSource({
      id: SOURCE_B_ID,
      userProfile: userEvidence({
        resumeScore: 12,
        atsScore: 1,
        recruiterScore: 2,
      }),
    }),
  );
  assert.deepEqual(
    collectObjectKeys(result).filter((key) => /score/i.test(key)),
    [],
  );
});

test("comparison output excludes raw, contact, owner and file-type fields", () => {
  const result = compareResumeEvidence(
    persistentSource({
      parsedProfile: parsedEvidence({
        rawSections: { projects: "RAW_A" },
      }),
    }),
    persistentSource({
      id: SOURCE_B_ID,
      parsedProfile: parsedEvidence({
        rawSections: { projects: "RAW_B" },
      }),
    }),
  );
  const keys = collectObjectKeys(result);
  assert.equal(keys.includes("userId"), false);
  assert.equal(keys.includes("fileType"), false);
  assert.equal(keys.includes("extractedText"), false);
  assert.equal(keys.includes("rawSections"), false);
  assert.equal(keys.includes("email"), false);
  assert.equal(keys.includes("phone"), false);
});

test("comparison output contains no forbidden claims", () => {
  const serialized = JSON.stringify(compareResumeEvidence(
    persistentSource(),
    persistentSource({ id: SOURCE_B_ID }),
  ));
  assert.doesNotMatch(
    serialized,
    /\b(progress|improv(?:e|ed|ement)|hiring|employab\w*|caus(?:e|ed|al))\b/i,
  );
});

test("comparison has no next-action or recommendation field", () => {
  const result = compareResumeEvidence(
    persistentSource(),
    persistentSource({ id: SOURCE_B_ID }),
  );
  assert.deepEqual(
    collectObjectKeys(result).filter((key) =>
      /nextAction|recommendation|coaching/i.test(key)
    ),
    [],
  );
  assert.doesNotMatch(
    domainSource,
    /\b(nextAction|recommendation|coaching)\b/,
  );
});

test("domain has no forbidden runtime import or invocation", () => {
  assert.doesNotMatch(
    domainSource,
    /analyzeResume|calculateATS|calculateCareerIQ|generateProofScore|calculateRoleMatches/,
  );
  assert.doesNotMatch(
    domainSource,
    /@\/(?:intelligence|lib\/storage|lib\/supabase|lib\/parser|lib\/pdf)|react|analytics/,
  );
});

test("domain input type contains only context and approved projected evidence", () => {
  const sourceType = domainSource.match(
    /export type ResumeComparisonEvidenceInput = \{[\s\S]*?\n\};/,
  )?.[0];
  assert.equal(typeof sourceType, "string");
  for (const field of [
    "id",
    "fileName",
    "savedAt",
    "skills",
    "projects",
    "experience",
    "certifications",
    "links",
    "flags",
    "placeholderText",
  ]) {
    assert.match(sourceType, new RegExp(`\\b${field}\\b`));
  }
  assert.doesNotMatch(
    sourceType,
    /userId|extractedText|fileType|parsedProfile|userProfile|rawSections|score/i,
  );
  assert.doesNotMatch(
    domainSource,
    /PersistentResumeAnalysis|ResumeComparisonSource\b/,
  );
});

test("pair rejects fewer than two IDs before auth or query", async () => {
  currentClient = createComparisonClient();
  const result = await resolveCurrentUserResumeAnalysisPair([SOURCE_A_ID]);
  assertFailure(result, "invalid_pair");
  assert.equal(currentClient.observed.identityCalls, 0);
  assert.equal(currentClient.observed.queries.length, 0);
});

test("pair rejects more than two IDs before auth or query", async () => {
  currentClient = createComparisonClient();
  const result = await resolveCurrentUserResumeAnalysisPair([
    SOURCE_A_ID,
    SOURCE_B_ID,
    SOURCE_C_ID,
  ]);
  assertFailure(result, "invalid_pair");
  assert.equal(currentClient.observed.identityCalls, 0);
  assert.equal(currentClient.observed.queries.length, 0);
});

test("pair rejects invalid UUIDs before auth or query", async () => {
  currentClient = createComparisonClient();
  const result = await resolveCurrentUserResumeAnalysisPair([
    SOURCE_A_ID,
    "invalid",
  ]);
  assertFailure(result, "invalid_pair");
  assert.equal(currentClient.observed.identityCalls, 0);
  assert.equal(currentClient.observed.queries.length, 0);
});

test("pair rejects exact duplicate IDs before repository work", async () => {
  currentClient = createComparisonClient();
  const result = await resolveCurrentUserResumeAnalysisPair([
    SOURCE_A_ID,
    SOURCE_A_ID,
  ]);
  assertFailure(result, "duplicate_source");
  assert.equal(currentClient.observed.identityCalls, 0);
  assert.equal(currentClient.observed.queries.length, 0);
});

test("pair rejects case-only duplicate IDs before repository work", async () => {
  currentClient = createComparisonClient();
  const result = await resolveCurrentUserResumeAnalysisPair([
    SOURCE_A_ID,
    SOURCE_A_ID.toUpperCase(),
  ]);
  assertFailure(result, "duplicate_source");
  assert.equal(currentClient.observed.identityCalls, 0);
  assert.equal(currentClient.observed.queries.length, 0);
});

test("authenticated same-owner pair succeeds with bounded query", async () => {
  currentClient = createComparisonClient({
    respond: () => okResponse([
      savedRow(SOURCE_A_ID),
      savedRow(SOURCE_B_ID),
    ]),
  });
  const result = await resolveCurrentUserResumeAnalysisPair([
    SOURCE_A_ID,
    SOURCE_B_ID,
  ], {
    expectedUserId: ACCOUNT_A,
  });
  assert.equal(result.ok, true);
  assert.equal(currentClient.observed.identityCalls, 2);
  assert.equal(currentClient.observed.queries.length, 1);
  const query = currentClient.observed.queries[0];
  assert.deepEqual(query.eqFilters, [["user_id", ACCOUNT_A]]);
  assert.deepEqual(query.inFilters, [[
    "id",
    [SOURCE_A_ID, SOURCE_B_ID],
  ]]);
  assert.equal(query.selectedColumns, EXPECTED_PAIR_PROJECTION);
  assert.deepEqual(
    query.selectedColumns.split(", "),
    EXPECTED_PAIR_SELECTIONS,
  );
  assert.doesNotMatch(
    query.selectedColumns,
    /extracted_text|file_type|rawSections|email|phone|score|coding/i,
  );
  for (const selection of EXPECTED_PAIR_SELECTIONS) {
    assert.notEqual(selection, "parsed_profile");
    assert.notEqual(selection, "user_profile");
    if (/parsed_profile|user_profile/.test(selection)) {
      assert.match(selection, /^[^:]+:[^,]+->[^,]+$/);
    }
  }
  assert.equal(query.limit, 3);
});

test("pair returns sanitized validated evidence without nested decoys", async () => {
  const projectMarker = "PROJECT_RAW_SECRET_7c1f";
  const experienceMarker = "EXPERIENCE_RAW_SECRET_8d2a";
  const certificationMarker = "CERTIFICATION_RAW_SECRET_9e3b";
  const githubMarker = "https://github.invalid/private-profile-4f2c";
  const contactMarker = "private.person@example.invalid";
  const rawSectionMarker = "RAW_SECTION_SECRET_5a3d";
  const scoreMarker = 987654321;
  currentClient = createComparisonClient({
    respond: () => okResponse([
      savedRow(SOURCE_A_ID, {
        parsed_profile: parsedEvidence({
          skills: [" React ", "TypeScript"],
          projects: [projectMarker, "Second project"],
          experience: [experienceMarker],
          certifications: [certificationMarker],
          links: {
            github: githubMarker,
            email: contactMarker,
            unapproved: "https://unapproved.invalid",
          },
          rawSections: {
            projects: rawSectionMarker,
          },
          email: contactMarker,
        }),
        user_profile: userEvidence({
          resumeScore: scoreMarker,
          email: contactMarker,
          codingProfiles: {
            private: "CODING_PROFILE_SECRET",
          },
          analysisFlags: {
            hasMeasurableImpact: true,
            hasSectionClarity: false,
            hasProofLink: true,
            hasGenericProjects: false,
            isPlaceholderText: false,
          },
        }),
      }),
      savedRow(SOURCE_B_ID),
    ]),
  });
  const result = await validPairRequest();
  assert.equal(result.ok, true);
  assert.deepEqual(Object.keys(result.data.sourceA).sort(), [
    "certificationCount",
    "context",
    "experienceCount",
    "flags",
    "links",
    "placeholderText",
    "projectCount",
    "skills",
  ]);
  assert.deepEqual(result.data.sourceA.context, {
    id: SOURCE_A_ID,
    fileName: "resume-1.pdf",
    savedAt: SAVED_AT_A,
    versionStatus: "not_recorded",
  });
  assert.deepEqual(result.data.sourceA.skills, {
    status: "available",
    value: [
      { key: "react", label: "React" },
      { key: "typescript", label: "TypeScript" },
    ],
  });
  assert.deepEqual(result.data.sourceA.projectCount, {
    status: "available",
    value: 2,
  });
  assert.deepEqual(result.data.sourceA.experienceCount, {
    status: "available",
    value: 1,
  });
  assert.deepEqual(result.data.sourceA.certificationCount, {
    status: "available",
    value: 1,
  });
  assert.equal(result.data.sourceA.links.github, "detected");
  assert.equal(result.data.sourceA.links.linkedin, "not_detected");
  assert.equal(
    result.data.sourceA.flags.hasMeasurableImpact,
    "detected",
  );
  assert.equal(result.data.sourceA.flags.hasSectionClarity, "not_detected");
  assert.equal(result.data.sourceA.placeholderText, "not_detected");

  const serialized = JSON.stringify(result.data);
  for (const marker of [
    projectMarker,
    experienceMarker,
    certificationMarker,
    githubMarker,
    contactMarker,
    rawSectionMarker,
    "unapproved.invalid",
    "CODING_PROFILE_SECRET",
    String(scoreMarker),
  ]) {
    assert.doesNotMatch(serialized, new RegExp(marker.replaceAll(".", "\\.")));
  }
  assert.doesNotMatch(
    serialized,
    /https?:\/\/|userId|user_id|parsedProfile|userProfile|rawSections|extractedText|extracted_text|fileType|file_type/i,
  );
  assert.equal(
    compareValidatedResumeEvidence(
      result.data.sourceA,
      result.data.sourceB,
    ).status,
    "comparable",
  );
});

test("pair derives its owner filter from current authentication", async () => {
  currentClient = createComparisonClient({
    identities: [ACCOUNT_B],
    respond: () => okResponse([
      savedRow(SOURCE_A_ID, { user_id: ACCOUNT_B }),
      savedRow(SOURCE_B_ID, { user_id: ACCOUNT_B }),
    ]),
  });
  const result = await resolveCurrentUserResumeAnalysisPair([
    SOURCE_A_ID,
    SOURCE_B_ID,
  ]);
  assert.equal(result.ok, true);
  assert.deepEqual(
    currentClient.observed.queries[0].eqFilters,
    [["user_id", ACCOUNT_B]],
  );
});

test("pair preserves caller source order independent of row order", async () => {
  currentClient = createComparisonClient({
    respond: () => okResponse([
      savedRow(SOURCE_A_ID, { file_name: "A.pdf" }),
      savedRow(SOURCE_B_ID, { file_name: "B.pdf" }),
    ]),
  });
  const result = await resolveCurrentUserResumeAnalysisPair([
    SOURCE_B_ID,
    SOURCE_A_ID,
  ]);
  assert.equal(result.ok, true);
  assert.equal(result.data.sourceA.context.id, SOURCE_B_ID);
  assert.equal(result.data.sourceA.context.fileName, "B.pdf");
  assert.equal(result.data.sourceB.context.id, SOURCE_A_ID);
  assert.equal(result.data.sourceB.context.fileName, "A.pdf");
});

test("pair rejects zero returned rows", async () => {
  currentClient = createComparisonClient({
    respond: () => okResponse([]),
  });
  const result = await validPairRequest();
  assertFailure(result, "source_missing");
});

test("pair rejects one returned row", async () => {
  currentClient = createComparisonClient({
    respond: () => okResponse([savedRow(SOURCE_A_ID)]),
  });
  const result = await validPairRequest();
  assertFailure(result, "source_missing");
});

test("pair rejects three returned rows", async () => {
  currentClient = createComparisonClient({
    respond: () => okResponse([
      savedRow(SOURCE_A_ID),
      savedRow(SOURCE_B_ID),
      savedRow(SOURCE_C_ID),
    ]),
  });
  const result = await validPairRequest();
  assertFailure(result, "malformed_source");
});

test("pair rejects duplicate returned rows", async () => {
  currentClient = createComparisonClient({
    respond: () => okResponse([
      savedRow(SOURCE_A_ID),
      savedRow(SOURCE_A_ID),
    ]),
  });
  const result = await validPairRequest();
  assertFailure(result, "malformed_source");
});

test("pair rejects an unexpected returned ID", async () => {
  currentClient = createComparisonClient({
    respond: () => okResponse([
      savedRow(SOURCE_A_ID),
      savedRow(SOURCE_C_ID),
    ]),
  });
  const result = await validPairRequest();
  assertFailure(result, "malformed_source");
});

test("pair rejects a cross-owner returned row", async () => {
  currentClient = createComparisonClient({
    respond: () => okResponse([
      savedRow(SOURCE_A_ID),
      savedRow(SOURCE_B_ID, { user_id: ACCOUNT_B }),
    ]),
  });
  const result = await validPairRequest();
  assertFailure(result, "malformed_source");
});

test("pair rejects a malformed saved row", async () => {
  const malformed = savedRow(SOURCE_B_ID);
  delete malformed.created_at;
  currentClient = createComparisonClient({
    respond: () => okResponse([
      savedRow(SOURCE_A_ID),
      malformed,
    ]),
  });
  const result = await validPairRequest();
  assertFailure(result, "malformed_source");
});

test("pair rejects authentication change before query", async () => {
  currentClient = createComparisonClient({
    identities: [ACCOUNT_B],
  });
  const result = await resolveCurrentUserResumeAnalysisPair([
    SOURCE_A_ID,
    SOURCE_B_ID,
  ], {
    expectedUserId: ACCOUNT_A,
  });
  assertFailure(result, "owner_changed");
  assert.equal(currentClient.observed.queries.length, 0);
});

test("pair rejects authentication change after query", async () => {
  currentClient = createComparisonClient({
    identities: [ACCOUNT_A, ACCOUNT_B],
    respond: () => okResponse([
      savedRow(SOURCE_A_ID),
      savedRow(SOURCE_B_ID),
    ]),
  });
  const result = await validPairRequest();
  assertFailure(result, "owner_changed");
});

test("pair never exposes a raw provider error", async () => {
  currentClient = createComparisonClient({
    respond: () => ({
      data: null,
      error: {
        message: "RAW_PROVIDER_SECRET owner and source details",
      },
    }),
  });
  const result = await validPairRequest();
  assertFailure(result, "repository_failure");
  assert.doesNotMatch(result.error, /RAW_PROVIDER_SECRET|owner and source/i);
});

test("pair exposes a finite unauthenticated error", async () => {
  currentClient = createComparisonClient({
    identities: [null],
  });
  const result = await validPairRequest();
  assertFailure(result, "unauthenticated");
});

test("page uses exactly ten items and eleven-row lookahead", async () => {
  currentClient = createComparisonClient({
    respond: () => okResponse([]),
  });
  const result = await listCurrentUserResumeAnalysisPage();
  assert.equal(result.ok, true);
  assert.equal(RESUME_COMPARISON_PAGE_SIZE, 10);
  const query = currentClient.observed.queries[0];
  assert.equal(query.limit, 11);
  assert.deepEqual(query.eqFilters, [["user_id", ACCOUNT_A]]);
  assert.equal(
    query.selectedColumns,
    "id, user_id, file_name, created_at",
  );
  assert.doesNotMatch(
    query.selectedColumns,
    /extracted_text|file_type|parsed_profile|user_profile/,
  );
});

test("page requests stable created_at DESC and id ASC ordering", async () => {
  currentClient = createComparisonClient({
    respond: () => okResponse([]),
  });
  await listCurrentUserResumeAnalysisPage();
  assert.deepEqual(currentClient.observed.queries[0].orders, [
    ["created_at", { ascending: false }],
    ["id", { ascending: true }],
  ]);
});

test("page validates cursor timestamp before repository work", async () => {
  currentClient = createComparisonClient();
  const result = await listCurrentUserResumeAnalysisPage({
    createdAt: "2026-02-30T10:00:00.000Z",
    id: SOURCE_A_ID,
  });
  assertFailure(result, "invalid_cursor");
  assert.equal(currentClient.observed.identityCalls, 0);
  assert.equal(currentClient.observed.queries.length, 0);
});

test("page validates cursor UUID before repository work", async () => {
  currentClient = createComparisonClient();
  const result = await listCurrentUserResumeAnalysisPage({
    createdAt: SAVED_AT_A,
    id: "invalid",
  });
  assertFailure(result, "invalid_cursor");
  assert.equal(currentClient.observed.identityCalls, 0);
  assert.equal(currentClient.observed.queries.length, 0);
});

test("page applies the precise next-page logical boundary", async () => {
  const cursor = {
    createdAt: "2026-07-29T10:00:00.000900Z",
    id: uuid(20),
  };
  currentClient = createComparisonClient({
    respond: () => okResponse([
      savedRow(uuid(21), {
        created_at: cursor.createdAt,
      }),
      savedRow(uuid(1), {
        created_at: "2026-07-29T09:59:59.999999Z",
      }),
    ]),
  });
  const result = await listCurrentUserResumeAnalysisPage(cursor);
  assert.equal(result.ok, true);
  assert.equal(
    currentClient.observed.queries[0].orFilter,
    `created_at.lt."${cursor.createdAt}",and(created_at.eq."${cursor.createdAt}",id.gt.${cursor.id})`,
  );
  assert.equal(
    currentClient.observed.queries[0].orFilter
      .match(new RegExp(`"${cursor.createdAt}"`, "g"))?.length,
    2,
  );
  assert.match(
    currentClient.observed.queries[0].orFilter,
    new RegExp(`id\\.gt\\.${cursor.id}\\)$`),
  );
  assert.notEqual(
    currentClient.observed.queries[0].orFilter,
    `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.gt.${cursor.id})`,
  );
});

test("cursor accepts an older microsecond row despite a lower UUID", async () => {
  const cursor = {
    createdAt: "2026-07-29T10:00:00.000900Z",
    id: uuid(20),
  };
  currentClient = createComparisonClient({
    respond: () => okResponse([
      savedRow(uuid(19), {
        created_at: "2026-07-29T10:00:00.000800Z",
      }),
    ]),
  });
  const result = await listCurrentUserResumeAnalysisPage(cursor);
  assert.equal(result.ok, true);
  assert.equal(result.data.items[0].id, uuid(19));
});

test("cursor rejects a newer microsecond row despite a higher UUID", async () => {
  const cursor = {
    createdAt: "2026-07-29T10:00:00.000900Z",
    id: uuid(20),
  };
  currentClient = createComparisonClient({
    respond: () => okResponse([
      savedRow(uuid(21), {
        created_at: "2026-07-29T10:00:00.000950Z",
      }),
    ]),
  });
  const result = await listCurrentUserResumeAnalysisPage(cursor);
  assertFailure(result, "malformed_source");
});

test("page accepts exact descending microsecond row order", async () => {
  currentClient = createComparisonClient({
    respond: () => okResponse([
      savedRow(uuid(2), {
        created_at: "2026-07-29T10:00:00.000900Z",
      }),
      savedRow(uuid(1), {
        created_at: "2026-07-29T10:00:00.000800Z",
      }),
    ]),
  });
  const result = await listCurrentUserResumeAnalysisPage();
  assert.equal(result.ok, true);
  assert.deepEqual(
    result.data.items.map((item) => item.id),
    [uuid(2), uuid(1)],
  );
});

test("page rejects reversed microsecond row order", async () => {
  currentClient = createComparisonClient({
    respond: () => okResponse([
      savedRow(uuid(1), {
        created_at: "2026-07-29T10:00:00.000800Z",
      }),
      savedRow(uuid(2), {
        created_at: "2026-07-29T10:00:00.000900Z",
      }),
    ]),
  });
  const result = await listCurrentUserResumeAnalysisPage();
  assertFailure(result, "malformed_source");
});

test("equal six-digit timestamps continue using ascending UUID order", async () => {
  currentClient = createComparisonClient({
    respond: () => okResponse([
      savedRow(uuid(1), {
        created_at: "2026-07-29T10:00:00.000900Z",
      }),
      savedRow(uuid(2), {
        created_at: "2026-07-29T10:00:00.000900Z",
      }),
    ]),
  });
  const result = await listCurrentUserResumeAnalysisPage();
  assert.equal(result.ok, true);
  assert.deepEqual(
    result.data.items.map((item) => item.id),
    [uuid(1), uuid(2)],
  );
});

test("seven fractional digits are rejected before repository work", async () => {
  currentClient = createComparisonClient();
  const result = await listCurrentUserResumeAnalysisPage({
    createdAt: "2026-07-29T10:00:00.0009001Z",
    id: SOURCE_A_ID,
  });
  assertFailure(result, "invalid_cursor");
  assert.equal(currentClient.observed.identityCalls, 0);
  assert.equal(currentClient.observed.queries.length, 0);
});

test("explicit offsets preserve exact microsecond cursor ordering", async () => {
  const cursor = {
    createdAt: "2026-07-29T15:30:00.000900+05:30",
    id: uuid(20),
  };
  currentClient = createComparisonClient({
    respond: () => okResponse([
      savedRow(uuid(19), {
        created_at: "2026-07-29T15:30:00.000800+05:30",
      }),
    ]),
  });
  const result = await listCurrentUserResumeAnalysisPage(cursor);
  assert.equal(result.ok, true);
  assert.equal(result.data.items[0].savedAt.endsWith("+05:30"), true);
});

test("pre-epoch timestamps retain sub-millisecond ordering", async () => {
  currentClient = createComparisonClient({
    respond: () => okResponse([
      savedRow(uuid(2), {
        created_at: "1969-12-31T23:59:59.999900Z",
      }),
      savedRow(uuid(1), {
        created_at: "1969-12-31T23:59:59.999800Z",
      }),
    ]),
  });
  const result = await listCurrentUserResumeAnalysisPage();
  assert.equal(result.ok, true);
  assert.deepEqual(
    result.data.items.map((item) => item.id),
    [uuid(2), uuid(1)],
  );
});

test("page hasNext is false for ten rows", async () => {
  const rows = chronologicalRows(10);
  currentClient = createComparisonClient({
    respond: () => okResponse(rows),
  });
  const result = await listCurrentUserResumeAnalysisPage();
  assert.equal(result.ok, true);
  assert.equal(result.data.items.length, 10);
  assert.equal(result.data.hasNext, false);
  assert.equal(result.data.nextCursor, null);
});

test("page hasNext is false for fewer than ten rows", async () => {
  currentClient = createComparisonClient({
    respond: () => okResponse(chronologicalRows(4)),
  });
  const result = await listCurrentUserResumeAnalysisPage();
  assert.equal(result.ok, true);
  assert.equal(result.data.items.length, 4);
  assert.equal(result.data.hasNext, false);
  assert.equal(result.data.nextCursor, null);
});

test("page returns ten items and the tenth-row cursor with lookahead", async () => {
  const rows = chronologicalRows(11);
  currentClient = createComparisonClient({
    respond: () => okResponse(rows),
  });
  const result = await listCurrentUserResumeAnalysisPage();
  assert.equal(result.ok, true);
  assert.equal(result.data.items.length, 10);
  assert.equal(result.data.hasNext, true);
  assert.deepEqual(result.data.nextCursor, {
    createdAt: rows[9].created_at,
    id: rows[9].id,
  });
  assert.equal(
    result.data.items.some((item) => item.id === rows[10].id),
    false,
  );
});

test("page returns bounded summaries without raw or owner data", async () => {
  currentClient = createComparisonClient({
    respond: () => okResponse([
      savedRow(SOURCE_A_ID, {
        extracted_text: "RAW_PAGE_SECRET",
        parsed_profile: {
          email: "private@example.invalid",
        },
      }),
    ]),
  });
  const result = await listCurrentUserResumeAnalysisPage();
  assert.equal(result.ok, true);
  assert.deepEqual(result.data.items[0], {
    id: SOURCE_A_ID,
    fileName: "resume-1.pdf",
    savedAt: SAVED_AT_A,
    versionStatus: "not_recorded",
  });
  assert.doesNotMatch(
    JSON.stringify(result.data),
    /RAW_PAGE_SECRET|private@example|userId|user_id|extracted/i,
  );
});

test("page accepts deterministic created_at ties in id order", async () => {
  currentClient = createComparisonClient({
    respond: () => okResponse([
      savedRow(uuid(1), { created_at: SAVED_AT_A }),
      savedRow(uuid(2), { created_at: SAVED_AT_A }),
      savedRow(uuid(3), { created_at: "2026-07-29T09:00:00.000Z" }),
    ]),
  });
  const result = await listCurrentUserResumeAnalysisPage();
  assert.equal(result.ok, true);
  assert.deepEqual(
    result.data.items.map((item) => item.id),
    [uuid(1), uuid(2), uuid(3)],
  );
});

test("page rejects malformed rows", async () => {
  const malformed = savedRow(SOURCE_A_ID);
  malformed.created_at = "invalid";
  currentClient = createComparisonClient({
    respond: () => okResponse([malformed]),
  });
  const result = await listCurrentUserResumeAnalysisPage();
  assertFailure(result, "malformed_source");
});

test("page rejects duplicate rows", async () => {
  currentClient = createComparisonClient({
    respond: () => okResponse([
      savedRow(SOURCE_A_ID),
      savedRow(SOURCE_A_ID),
    ]),
  });
  const result = await listCurrentUserResumeAnalysisPage();
  assertFailure(result, "malformed_source");
});

test("page rejects an owner mismatch", async () => {
  currentClient = createComparisonClient({
    respond: () => okResponse([
      savedRow(SOURCE_A_ID, { user_id: ACCOUNT_B }),
    ]),
  });
  const result = await listCurrentUserResumeAnalysisPage();
  assertFailure(result, "malformed_source");
});

test("page rejects owner change before return", async () => {
  currentClient = createComparisonClient({
    identities: [ACCOUNT_A, ACCOUNT_B],
    respond: () => okResponse([]),
  });
  const result = await listCurrentUserResumeAnalysisPage();
  assertFailure(result, "owner_changed");
});

test("page rejects rows outside the requested cursor", async () => {
  const cursor = {
    createdAt: SAVED_AT_A,
    id: uuid(20),
  };
  currentClient = createComparisonClient({
    respond: () => okResponse([
      savedRow(uuid(19), { created_at: SAVED_AT_A }),
    ]),
  });
  const result = await listCurrentUserResumeAnalysisPage(cursor);
  assertFailure(result, "malformed_source");
});

test("page rejects provider rows in invalid chronological order", async () => {
  currentClient = createComparisonClient({
    respond: () => okResponse([
      savedRow(uuid(1), {
        created_at: "2026-07-29T09:00:00.000Z",
      }),
      savedRow(uuid(2), {
        created_at: "2026-07-29T10:00:00.000Z",
      }),
    ]),
  });
  const result = await listCurrentUserResumeAnalysisPage();
  assertFailure(result, "malformed_source");
});

test("page rejects provider responses beyond the eleven-row bound", async () => {
  currentClient = createComparisonClient({
    respond: () => okResponse(chronologicalRows(12)),
  });
  const result = await listCurrentUserResumeAnalysisPage();
  assertFailure(result, "malformed_source");
});

test("page never exposes raw provider errors", async () => {
  currentClient = createComparisonClient({
    respond: () => ({
      data: null,
      error: {
        message: "RAW_PAGE_PROVIDER_SECRET",
      },
    }),
  });
  const result = await listCurrentUserResumeAnalysisPage();
  assertFailure(result, "repository_failure");
  assert.doesNotMatch(result.error, /RAW_PAGE_PROVIDER_SECRET/);
});

test("repository has finite error codes and no account-export reuse", () => {
  for (const code of [
    "unauthenticated",
    "invalid_pair",
    "duplicate_source",
    "invalid_cursor",
    "source_missing",
    "malformed_source",
    "owner_changed",
    "repository_failure",
  ]) {
    assert.match(repositorySource, new RegExp(`"${code}"`));
  }
  assert.doesNotMatch(
    repositorySource,
    /accountDataRepository|ACCOUNT_EXPORT|collectKeysetTable|maxRowsPerTable/,
  );
});

test("repository reuses shared identity and scalar validation helpers", () => {
  for (const helper of [
    "authenticateResumeOwner",
    "confirmResumeOwner",
    "hasExactKeys",
    "isRecord",
    "isUuid",
    "isValidTimestamp",
    "ResumeSupabaseClient",
  ]) {
    assert.match(repositorySource, new RegExp(`\\b${helper}\\b`));
  }
  assert.doesNotMatch(
    repositorySource,
    /RESUME_ANALYSIS_COLUMNS|parsePersistentResumeAnalysis/,
  );
  assert.doesNotMatch(repositorySource, /extracted_text|file_type/);
  assert.doesNotMatch(
    repositorySource,
    /function isUuid|function isValidTimestamp|function hasExactKeys/,
  );
});

test("public pair type returns validated evidence rather than raw input", () => {
  const pairType = repositorySource.match(
    /export type ResumeComparisonAnalysisPair = \{[\s\S]*?\n\};/,
  )?.[0];
  assert.equal(typeof pairType, "string");
  assert.equal(
    pairType.match(/ValidatedResumeComparisonEvidence/g)?.length,
    2,
  );
  assert.doesNotMatch(
    pairType,
    /ResumeComparisonEvidenceInput|parsedProfile|userProfile|PairRow/,
  );
  assert.match(
    repositorySource,
    /validateResumeComparisonEvidence\(toEvidenceInput\(analysis\)\)/,
  );
  assert.doesNotMatch(repositorySource, /\bparsedProfile\b|\buserProfile\b/);
});

test("timestamp ordering uses one exact BigInt microsecond helper", () => {
  assert.equal(repositorySource.match(/Date\.parse/g)?.length, 1);
  assert.match(
    repositorySource,
    /function timestampOrderKey\(value: unknown\): bigint \| null/,
  );
  assert.match(
    repositorySource,
    /BigInt\(parsedMilliseconds\) \* BigInt\(1000\)/,
  );
  assert.match(repositorySource, /fraction\.length > 6/);
  assert.match(repositorySource, /createdAtOrder/);

  const strictBoundary = repositorySource.match(
    /function isStrictlyAfterCursor\([\s\S]*?\n\}/,
  )?.[0];
  const orderBoundary = repositorySource.match(
    /function compareHistoryOrder\([\s\S]*?\n\}/,
  )?.[0];
  assert.doesNotMatch(strictBoundary, /Date\.parse/);
  assert.doesNotMatch(orderBoundary, /Date\.parse/);
});

test("repository performs no logging and no persistence or mutation", () => {
  assert.doesNotMatch(repositorySource, /console\.|logger|log\(/);
  assert.doesNotMatch(
    repositorySource,
    /\.(?:insert|update|delete|upsert)\s*\(/,
  );
  assert.doesNotMatch(
    repositorySource,
    /localStorage|sessionStorage|skillmint:|active_resume_selections/,
  );
});

test("repository page is bounded rather than all-history loading", () => {
  assert.match(repositorySource, /RESUME_COMPARISON_PAGE_SIZE = 10/);
  assert.match(
    repositorySource,
    /RESUME_COMPARISON_PAGE_QUERY_LIMIT\s*=\s*[\s\S]*RESUME_COMPARISON_PAGE_SIZE \+ 1/,
  );
  assert.doesNotMatch(repositorySource, /MAX_LIST_LIMIT|limit\s*=\s*25/);
});

test("new module index exports only the approved core modules", () => {
  assert.match(indexSource, /export \* from "\.\/domain\/resumeComparison";/);
  assert.match(
    indexSource,
    /export \* from "\.\/services\/resumeComparisonRepository";/,
  );
});

test(
  closureMode
    ? "closure mode pins the accepted Core runtime and ancestry"
    : "only the four approved repository paths are changed or untracked",
  () => {
    if (!closureMode) {
      assert.deepEqual(getChangedAndUntrackedPaths(), approvedPaths);
      return;
    }

    execFileSync(
      "git",
      ["merge-base", "--is-ancestor", acceptedCoreCommit, "HEAD"],
      {
        cwd: repoRoot,
        stdio: "pipe",
      },
    );
    execFileSync(
      "git",
      [
        "diff",
        "--exit-code",
        acceptedCoreCommit,
        "--",
        domainPath,
        repositoryPath,
        indexPath,
      ],
      {
        cwd: repoRoot,
        stdio: "pipe",
      },
    );
  },
  "path-context",
);

test("preservation boundary excludes UI, routes, packages and frozen systems", () => {
  const changed = getChangedAndUntrackedPaths();
  if (closureMode) {
    assert.deepEqual(
      changed.filter((changedPath) =>
        !closureApprovedPaths.includes(changedPath)
      ),
      [],
    );
  }
  const forbiddenPatterns = closureMode
    ? [
        /^src\/app\//,
        /^src\/components\//,
        /^src\/intelligence\//,
        /^src\/lib\/storage\//,
        /^src\/lib\/accountDeletion\//,
        /^src\/modules\/data-controls\//,
        /^src\/modules\/resume\/domain\//,
        /^src\/modules\/resume\/services\//,
        /^src\/modules\/resume\/index\.ts$/,
        /^supabase\//,
        /^package-lock\.json$/,
        /workspaceResumeRepository/,
        /activeResumeReportStorage/,
      ]
    : [
        /^src\/app\//,
        /^src\/components\//,
        /^src\/intelligence\//,
        /^src\/lib\/storage\//,
        /^src\/lib\/accountDeletion\//,
        /^src\/modules\/data-controls\//,
        /^supabase\//,
        /^docs\//,
        /^\.github\//,
        /^package(?:-lock)?\.json$/,
        /workspaceResumeRepository/,
        /activeResumeReportStorage/,
      ];
  for (const changedPath of changed) {
    for (const pattern of forbiddenPatterns) {
      assert.doesNotMatch(changedPath, pattern);
    }
  }
}, "path-context");

test("no UI, URL selection, browser key or comparison persistence is added", () => {
  const newSource = `${domainSource}\n${repositorySource}\n${indexSource}`;
  assert.doesNotMatch(newSource, /useState|useEffect|react|next\/|href=|searchParams/);
  assert.doesNotMatch(newSource, /localStorage|sessionStorage|skillmint:/);
  assert.doesNotMatch(
    newSource,
    /comparison_history|resume_comparisons|active_resume_selections/,
  );
});

test("no scoring, ATS, Career IQ, proof or role-match code is referenced", () => {
  const newRuntimeSource = `${domainSource}\n${repositorySource}`;
  assert.doesNotMatch(
    newRuntimeSource,
    /analyzeResume|scoring|scoreComparison|calculateATS|CareerIQ|ProofConfidence|generateProofScore|roleMatch|calculateRoleMatches/,
  );
});

test("package lock and every forbidden tracked path have zero diff", () => {
  execFileSync("git", ["diff", "--exit-code", "--", "package-lock.json"], {
    cwd: repoRoot,
    stdio: "pipe",
  });
  execFileSync(
    "git",
    ["diff", "--cached", "--exit-code", "--", "package-lock.json"],
    {
      cwd: repoRoot,
      stdio: "pipe",
    },
  );
  const activeApprovedPaths = closureMode
    ? closureApprovedPaths
    : approvedPaths;
  assert.deepEqual(
    getChangedAndUntrackedPaths().filter((changedPath) =>
      !activeApprovedPaths.includes(changedPath)
    ),
    [],
  );
}, "path-context");

let passed = 0;
for (const { name, callback } of tests) {
  try {
    await callback();
    passed += 1;
  } catch (error) {
    console.error(`FAIL: ${name}`);
    throw error;
  }
}

console.log(
  `Phase 2A-Core fixtures (${closureMode ? "closure" : "implementation-time"} mode) passed: ${passed}/${tests.length} tests; ${
    tests.filter(({ kind }) => kind === "behavior").length
  } behavioral tests and ${
    tests.filter(({ kind }) => kind === "path-context").length
  } path-context tests.`,
);

function compareWithSkills(sourceASkills, sourceBSkills) {
  return compareResumeEvidence(
    persistentSource({
      parsedProfile: parsedEvidence({ skills: sourceASkills }),
    }),
    persistentSource({
      id: SOURCE_B_ID,
      parsedProfile: parsedEvidence({ skills: sourceBSkills }),
    }),
  );
}

function compareEvidence(sourceAEvidence, sourceBEvidence) {
  return compareResumeEvidence(
    persistentSource({
      parsedProfile: parsedEvidence(sourceAEvidence),
    }),
    persistentSource({
      id: SOURCE_B_ID,
      parsedProfile: parsedEvidence(sourceBEvidence),
    }),
  );
}

function compareWithLinks(sourceALinks, sourceBLinks) {
  return compareResumeEvidence(
    persistentSource({
      parsedProfile: parsedEvidence({ links: sourceALinks }),
    }),
    persistentSource({
      id: SOURCE_B_ID,
      parsedProfile: parsedEvidence({ links: sourceBLinks }),
    }),
  );
}

function compareWithFlags(sourceAFlags, sourceBFlags) {
  return compareResumeEvidence(
    persistentSource({
      userProfile: userEvidence({
        analysisFlags: sourceAFlags,
      }),
    }),
    persistentSource({
      id: SOURCE_B_ID,
      fileName: "Source B.pdf",
      savedAt: SAVED_AT_B,
      userProfile: userEvidence({
        analysisFlags: sourceBFlags,
      }),
    }),
  );
}

function persistentSource(overrides = {}) {
  const parsedProfile = Object.prototype.hasOwnProperty.call(
    overrides,
    "parsedProfile",
  )
    ? overrides.parsedProfile
    : parsedEvidence();
  const userProfile = Object.prototype.hasOwnProperty.call(
    overrides,
    "userProfile",
  )
    ? overrides.userProfile
    : userEvidence();
  const remainingOverrides = { ...overrides };
  delete remainingOverrides.parsedProfile;
  delete remainingOverrides.userProfile;

  return {
    id: SOURCE_A_ID,
    fileName: "Source A.pdf",
    savedAt: SAVED_AT_A,
    skills: readJsonPath(parsedProfile, ["skills"]),
    projects: readJsonPath(parsedProfile, ["projects"]),
    experience: readJsonPath(parsedProfile, ["experience"]),
    certifications: readJsonPath(parsedProfile, ["certifications"]),
    links: Object.fromEntries(
      RESUME_COMPARISON_LINK_TYPES.map((key) => [
        key,
        readJsonPath(parsedProfile, ["links", key]),
      ]),
    ),
    flags: Object.fromEntries(
      RESUME_COMPARISON_FLAG_TYPES.map((key) => [
        key,
        readJsonPath(userProfile, ["analysisFlags", key]),
      ]),
    ),
    placeholderText: readJsonPath(
      userProfile,
      ["analysisFlags", "isPlaceholderText"],
    ),
    ...remainingOverrides,
  };
}

function parsedEvidence(overrides = {}) {
  const base = {
    skills: ["React"],
    projects: ["Project body must never be returned"],
    experience: ["Experience body must never be returned"],
    certifications: ["Certification mention"],
    links: {},
    rawSections: {
      projects: "Raw section must never be returned",
    },
  };
  const result = {
    ...base,
    ...overrides,
  };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete result[key];
    }
  }
  return result;
}

function userEvidence(overrides = {}) {
  return {
    resumeScore: 20,
    skillsScore: 15,
    projectsScore: 15,
    experienceScore: 12,
    educationScore: 10,
    githubScore: 8,
    linkedinScore: 5,
    atsScore: 5,
    recruiterScore: 5,
    activityScore: 5,
    analysisFlags: {
      hasMeasurableImpact: false,
      hasSectionClarity: false,
      hasProofLink: false,
      hasGenericProjects: false,
      isPlaceholderText: false,
    },
    ...overrides,
  };
}

function savedRow(id, overrides = {}) {
  return {
    id,
    user_id: ACCOUNT_A,
    file_name: `resume-${Number.parseInt(id.slice(-2), 16) || 1}.pdf`,
    file_type: "application/pdf",
    extracted_text: "Raw saved resume text",
    parsed_profile: parsedEvidence(),
    user_profile: userEvidence(),
    created_at: SAVED_AT_A,
    ...overrides,
  };
}

function chronologicalRows(count) {
  return Array.from({ length: count }, (_, index) =>
    savedRow(uuid(index + 1), {
      created_at: new Date(
        Date.UTC(2026, 6, 29, 12, 0, 0) - index * 60_000,
      ).toISOString(),
    })
  );
}

function createComparisonClient({
  identities = [ACCOUNT_A],
  respond = () => okResponse([]),
} = {}) {
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
        const index = Math.min(
          identityIndex,
          identitySequence.length - 1,
        );
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
        selectedColumns: null,
        eqFilters: [],
        inFilters: [],
        orders: [],
        limit: null,
        orFilter: null,
      };
      const query = {
        select(columns) {
          state.operation = "select";
          state.selectedColumns = columns;
          return query;
        },
        eq(column, value) {
          state.eqFilters.push([column, value]);
          return query;
        },
        in(column, values) {
          state.inFilters.push([column, [...values]]);
          return query;
        },
        order(column, options) {
          state.orders.push([column, { ...options }]);
          return query;
        },
        limit(value) {
          state.limit = value;
          return query;
        },
        or(filter) {
          state.orFilter = filter;
          return query;
        },
        then(onFulfilled, onRejected) {
          const snapshot = {
            table: state.table,
            operation: state.operation,
            selectedColumns: state.selectedColumns,
            eqFilters: state.eqFilters.map((filter) => [...filter]),
            inFilters: state.inFilters.map(([column, values]) => [
              column,
              [...values],
            ]),
            orders: state.orders.map(([column, options]) => [
              column,
              { ...options },
            ]),
            limit: state.limit,
            orFilter: state.orFilter,
          };
          observed.queries.push(snapshot);
          return Promise.resolve()
            .then(() => respond(snapshot))
            .then((response) =>
              projectSelectedColumns(response, snapshot.selectedColumns)
            )
            .then(onFulfilled, onRejected);
        },
      };
      return query;
    },
  };
}

async function validPairRequest() {
  return resolveCurrentUserResumeAnalysisPair([
    SOURCE_A_ID,
    SOURCE_B_ID,
  ], {
    expectedUserId: ACCOUNT_A,
  });
}

function okResponse(data) {
  return {
    data,
    error: null,
  };
}

function projectSelectedColumns(response, selectedColumns) {
  if (
    !Array.isArray(response.data) ||
    typeof selectedColumns !== "string"
  ) {
    return response;
  }

  const columns = selectedColumns
    .split(",")
    .map((column) => column.trim());
  return {
    ...response,
    data: response.data.map((row) =>
      Object.fromEntries(
        columns.map((selection) => {
          const separatorIndex = selection.indexOf(":");
          const alias = separatorIndex === -1
            ? selection
            : selection.slice(0, separatorIndex);
          const expression = separatorIndex === -1
            ? selection
            : selection.slice(separatorIndex + 1);
          const [column, ...jsonPath] = expression.split("->");
          return [
            alias,
            readJsonPath(row[column], jsonPath),
          ];
        }),
      )
    ),
  };
}

function readJsonPath(value, pathSegments) {
  let current = value;
  for (const segment of pathSegments) {
    if (
      !current ||
      typeof current !== "object" ||
      Array.isArray(current) ||
      !Object.prototype.hasOwnProperty.call(current, segment)
    ) {
      return null;
    }
    current = current[segment];
  }
  return current === undefined ? null : current;
}

function assertFailure(result, code) {
  assert.equal(result.ok, false);
  assert.equal(result.code, code);
  assert.equal("data" in result, false);
  assert.equal(typeof result.error, "string");
}

function collectObjectKeys(value, keys = []) {
  if (!value || typeof value !== "object") {
    return keys;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectObjectKeys(item, keys);
    }
    return keys;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    keys.push(key);
    collectObjectKeys(nestedValue, keys);
  }
  return keys;
}

function getChangedAndUntrackedPaths() {
  return execFileSync(
    "git",
    ["status", "--porcelain=v1", "--untracked-files=all"],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  )
    .trimEnd()
    .split("\n")
    .filter(Boolean)
    .map((line) => line.slice(3))
    .sort();
}

function moduleStub(filename, exports) {
  const stub = new Module(filename);
  stub.filename = filename;
  stub.loaded = true;
  stub.exports = exports;
  return stub;
}

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function uuid(value) {
  return `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
}
