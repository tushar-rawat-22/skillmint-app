import assert from "node:assert/strict";
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

Module._resolveFilename = function resolveSkillMintAlias(request, parent, isMain, options) {
  return request.startsWith("@/")
    ? originalResolveFilename.call(this, path.join(srcRoot, request.slice(2)), parent, isMain, options)
    : originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions[".ts"] = function compileTypeScript(module, filename) {
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const browserContractPath = path.join(srcRoot, "modules/data-controls/browserDataExportContract.ts");
const browserContractSource = fs.readFileSync(browserContractPath, "utf8");
const {
  BROWSER_DATA_EXPORT_CONTRACTS,
  BROWSER_DATA_EXPORT_CONTRACT_VERSION,
  getBrowserDataExportContract,
  validateBrowserDataExportContractCoverage,
} = require(browserContractPath);
const {
  reconstructParsedResumeProfileContractValue,
  reconstructUserProfileContractValue,
  reconstructJobDescriptionMatchResultContractValue,
  reconstructResumeImprovementPlanContractValue,
  reconstructResumeRewritePlanContractValue,
  reconstructCareerRoadmapContractValue,
} = require(path.join(srcRoot, "modules/data-controls/accountDataExportContract.ts"));
const { SKILLMINT_STORAGE_DESCRIPTORS } = require(path.join(srcRoot, "lib/storage/skillMintStorageRegistry.ts"));

const tests = [];
function test(name, callback) { tests.push({ name, callback }); }
function contract(key) {
  const value = getBrowserDataExportContract(key);
  assert(value, `Missing contract ${key}`);
  return value;
}
function clone(value) { return structuredClone(value); }
function assertSuccess(result) { assert.equal(result.ok, true, JSON.stringify(result)); return result; }
function assertFailure(result, code) { assert.equal(result.ok, false); assert.equal(result.code, code); }
function issue(result, code) { assert.equal(result.ok, false); assert(result.issues.some((item) => item.code === code), JSON.stringify(result)); }
function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

const parsedProfile = {
  skills: ["TypeScript"], projects: ["SkillMint"], education: ["B.Tech"], experience: ["Internship"], certifications: ["Cloud"],
  links: { github: "https://github.com/example", email: "student@example.com" },
  rawSections: { skills: "TypeScript", projects: "SkillMint" },
};
const userProfile = {
  resumeScore: 70, skillsScore: 72, projectsScore: 68, experienceScore: 60, educationScore: 80,
  githubScore: 50, linkedinScore: 40, atsScore: 66, recruiterScore: 62, activityScore: 55,
  skills: ["TypeScript"], projects: ["SkillMint"], experience: ["Internship"], education: "B.Tech",
  certifications: [{ name: "Cloud", issuer: "Example", tier: "B", verified: false }],
  codingProfiles: [{ platform: "leetcode", username: "student", solved: 100 }],
  github: { url: "https://github.com/example", repositories: 4, stars: 2, followers: 3, openSourceContributions: 1 },
  linkedin: { url: "https://linkedin.com/in/example", connections: 120, hasHeadline: true, hasAbout: true, hasFeatured: false },
  analysisFlags: { hasMeasurableImpact: true, hasSectionClarity: true, hasProofLink: true, hasGenericProjects: false, isPlaceholderText: false },
};
const matchResult = {
  matchScore: 71, verdict: "Tailor before applying", brutalReality: "More proof is needed",
  matchedSkills: ["TypeScript"], missingSkills: ["PostgreSQL"], missingKeywords: ["testing"],
  strengths: ["Projects"], weaknesses: ["Experience"], recommendations: ["Add proof"],
};
const improvementPlan = {
  readiness: "Tailor before applying", summary: "Improve proof before applying",
  priorityFixes: [{ title: "Add tests", reason: "Role asks for testing", action: "Add tests", priority: "High", impact: "High", category: "Proof" }],
  keywordAdditions: ["testing"], projectSuggestions: ["Tested API"], proofGaps: ["No test link"], sectionFixes: ["Projects"], beforeApplyChecklist: ["Add evidence"],
};
function rewriteSuggestion(section) {
  return { section, title: `${section} rewrite`, weakExample: "Worked on app", improvedExample: "Built and tested app", whyBetter: "Adds evidence", evidenceNeeded: ["Repository"], caution: "Keep claims truthful" };
}
const rewritePlan = {
  headline: "Engineer with proof", summaryRewrite: rewriteSuggestion("Summary"), skillsRewrite: rewriteSuggestion("Skills"),
  projectRewrites: [rewriteSuggestion("Projects")], experienceRewrites: [rewriteSuggestion("Experience")], finalWarnings: ["Do not invent metrics"],
};
const roadmapTask = { title: "Ship a tested project", reason: "Proof missing", action: "Add tests", category: "Projects", priority: "High", estimatedTime: "1 week" };
const roadmap = {
  targetRole: "Software Engineer", readiness: "Getting ready", brutalSummary: "Proof needs strengthening", currentBlockers: ["Testing evidence"],
  thirtyDayPlan: { title: "30 day", goal: "Build proof", tasks: [roadmapTask] },
  sixtyDayPlan: { title: "60 day", goal: "Deepen proof", tasks: [roadmapTask] },
  ninetyDayPlan: { title: "90 day", goal: "Apply", tasks: [roadmapTask] },
  weeklyMissions: [roadmapTask], projectRoadmap: [roadmapTask], skillRoadmap: [roadmapTask], applicationStrategy: ["Apply selectively"],
};
const resumeContext = { fingerprint: "resume-a", analyzedAt: "2026-07-11T00:00:00.000Z", fileName: "resume.pdf", scoringVersion: "v1" };
const currentMatch = {
  id: "local-jd-1", databaseId: "remote-row-1", syncStatus: "synced", jobTitle: "Software Engineer", companyName: "Example Co",
  jobDescription: "token authorization secret remain ordinary JD text", result: matchResult, improvementPlan, rewritePlan, roadmap, resumeContext,
  analyzedAt: "2026-07-11T00:00:00.000Z",
};
const activeResume = {
  fileName: "resume.pdf", fileType: "application/pdf", fileSize: 1234,
  extractedText: "token authorization secret remain ordinary resume text", parsedProfile, userProfile,
  analyzedAt: "2026-07-11T00:00:00.000Z", status: "completed",
};
const latestTarget = {
  id: "active-target:latest-jd:abc", source: "latest_jd", status: "active", title: "Software Engineer",
  companyName: "Example Co", roleTitle: "Software Engineer", jdText: "Unnormalized  JD text", jdHash: "abc", targetRole: "Software Engineer",
  mainGap: "Testing proof", nextBestMove: "Add tests", createdAt: "2026-07-11T00:00:00.000Z", updatedAt: "2026-07-11T00:00:00.000Z",
  jdMatch: { score: 71, verdict: "Tailor", brutalReality: "Need proof", matchedSkills: ["TypeScript"], missingSkills: ["Testing"], missingKeywords: ["tests"], strengths: ["Projects"], weaknesses: ["Experience"], recommendations: ["Add proof"], resumeContext },
};
const targetRole = {
  targetRole: "  Software Engineer  ", careerField: "tech_software", experienceLevel: "student", primaryGoal: "get_first_job",
  preferredJobType: "full_stack", weeklyTimeCommitment: "medium", updatedAt: "2026-07-11T00:00:00.000Z",
};
const feedback = {
  id: "feedback-1", feedbackType: "idea", sentiment: "positive", message: "status token authorization secret are user text",
  pagePath: "/settings/data?tab=privacy#export", createdAt: "2026-07-11T00:00:00.000Z", syncStatus: "local-only", syncError: "raw provider detail",
};
const upgrade = { id: "upgrade-1", source: "dashboard", label: "Tell me more", createdAt: "2026-07-11T00:00:00.000Z" };

test("1-12 contract coverage uses the real registry and detects every metadata drift class", () => {
  assert.equal(BROWSER_DATA_EXPORT_CONTRACT_VERSION, "skillmint-browser-contract-v1");
  assert.deepEqual(BROWSER_DATA_EXPORT_CONTRACTS.map((item) => item.key), [...BROWSER_DATA_EXPORT_CONTRACTS].map((item) => item.key).sort());
  assert.deepEqual(validateBrowserDataExportContractCoverage(SKILLMINT_STORAGE_DESCRIPTORS), { ok: true });
  assert.equal(BROWSER_DATA_EXPORT_CONTRACTS.length, SKILLMINT_STORAGE_DESCRIPTORS.filter((item) => item.exportable).length);
  assert.equal(browserContractSource.includes("skillMintStorageRegistry"), false);

  const descriptors = SKILLMINT_STORAGE_DESCRIPTORS.map((item) => ({ ...item }));
  issue(validateBrowserDataExportContractCoverage([...descriptors, descriptors[0]]), "duplicate_descriptor_key");
  issue(validateBrowserDataExportContractCoverage(descriptors, [...BROWSER_DATA_EXPORT_CONTRACTS, BROWSER_DATA_EXPORT_CONTRACTS[0]]), "duplicate_contract_key");
  issue(validateBrowserDataExportContractCoverage(descriptors, BROWSER_DATA_EXPORT_CONTRACTS.slice(1)), "missing_contract");
  issue(validateBrowserDataExportContractCoverage([...descriptors, { ...descriptors[0], key: "skillmint:unknown", exportable: false }], [...BROWSER_DATA_EXPORT_CONTRACTS, { ...BROWSER_DATA_EXPORT_CONTRACTS[0], key: "skillmint:unknown", descriptorKey: "skillmint:unknown" }]), "non_exportable_descriptor");
  issue(validateBrowserDataExportContractCoverage(descriptors, [{ ...BROWSER_DATA_EXPORT_CONTRACTS[0], key: "skillmint:unknown", descriptorKey: "skillmint:unknown" }, ...BROWSER_DATA_EXPORT_CONTRACTS]), "unknown_descriptor");
  issue(validateBrowserDataExportContractCoverage(descriptors, [{ ...BROWSER_DATA_EXPORT_CONTRACTS[0], descriptorKey: "wrong" }, ...BROWSER_DATA_EXPORT_CONTRACTS.slice(1)]), "key_mismatch");
  for (const [field, code, value] of [
    ["descriptorVersion", "descriptor_version_mismatch", 99], ["category", "category_mismatch", "feedback"],
    ["ownerScope", "owner_scope_mismatch", "global_preference"], ["exportPolicy", "export_policy_mismatch", "string_value"],
    ["containsPersonalData", "personal_data_classification_mismatch", false],
  ]) {
    issue(validateBrowserDataExportContractCoverage(descriptors, [{ ...BROWSER_DATA_EXPORT_CONTRACTS[0], [field]: value }, ...BROWSER_DATA_EXPORT_CONTRACTS.slice(1)]), code);
  }
  assert.ok(BROWSER_DATA_EXPORT_CONTRACTS.every((item) =>
    item.browserContractVersion === BROWSER_DATA_EXPORT_CONTRACT_VERSION
  ));
  for (const browserContractVersion of [undefined, 1, "skillmint-browser-contract-v0"]) {
    issue(validateBrowserDataExportContractCoverage(descriptors, [{
      ...BROWSER_DATA_EXPORT_CONTRACTS[0],
      browserContractVersion,
    }, ...BROWSER_DATA_EXPORT_CONTRACTS.slice(1)]), "browser_contract_version_mismatch");
  }
  const missingPolicy = descriptors.map((item, index) => index ? item : { ...item, exportPolicy: undefined });
  issue(validateBrowserDataExportContractCoverage(missingPolicy), "missing_export_policy");
  const throwingDescriptor = new Proxy({}, { getPrototypeOf() { throw new Error("synthetic"); } });
  assert.equal(validateBrowserDataExportContractCoverage([throwingDescriptor]).ok, false);
  issue(validateBrowserDataExportContractCoverage([{ ...descriptors[0], version: "1" }]), "malformed_descriptor");
  issue(validateBrowserDataExportContractCoverage(descriptors, [{
    ...BROWSER_DATA_EXPORT_CONTRACTS[0],
    descriptorVersion: "1",
  }, ...BROWSER_DATA_EXPORT_CONTRACTS.slice(1)]), "malformed_contract");
});

test("13-15 shared account reconstructors accept proven shapes, reject malformed values, and remain deterministic", () => {
  const cases = [
    [reconstructParsedResumeProfileContractValue, parsedProfile], [reconstructUserProfileContractValue, userProfile],
    [reconstructJobDescriptionMatchResultContractValue, matchResult], [reconstructResumeImprovementPlanContractValue, improvementPlan],
    [reconstructResumeRewritePlanContractValue, rewritePlan], [reconstructCareerRoadmapContractValue, roadmap],
  ];
  for (const [reconstruct, value] of cases) {
    assert.deepEqual(reconstruct(value), reconstruct(value));
    assert.equal(reconstruct(value).ok, true);
    assert.equal(reconstruct({ ...value, unknown: true }).ok, false);
  }
});

test("16-22 active resume is exact, strict, fresh, and preserves ordinary sensitive-word text", () => {
  const frozen = deepFreeze(clone(activeResume));
  const result = assertSuccess(contract("skillmint:resume-analysis").reconstruct(frozen));
  assert.deepEqual(result.value, activeResume);
  assert.notEqual(result.value, frozen);
  assert.notEqual(result.value.parsedProfile, frozen.parsedProfile);
  assert.equal(result.value.extractedText, activeResume.extractedText);
  assert.deepEqual(result.privacyTransformations, []);
  assertFailure(contract("skillmint:resume-analysis").reconstruct({ ...activeResume, analyzedAt: "2026-02-30T00:00:00Z" }), "invalid_export_timestamp");
  assertFailure(contract("skillmint:resume-analysis").reconstruct({ ...activeResume, extra: true }), "invalid_export_value");
  const sensitive = clone(activeResume); sensitive.userProfile.github["owner-id"] = "private";
  assertFailure(contract("skillmint:resume-analysis").reconstruct(sensitive), "unsupported_browser_data_contract");

  const historical = {
    ...clone(activeResume),
    databaseId: "remote-resume-row",
    accountId: "account-a",
    userId: "user-a",
    serverRecordId: "server-resume-row",
    remoteId: "remote-resume-id",
  };
  const historicalResult = assertSuccess(contract("skillmint:resume-analysis").reconstruct(historical));
  assert.deepEqual(historicalResult.value, activeResume);
  assert.deepEqual(historicalResult.privacyTransformations, [
    "database_reference_excluded",
    "ownership_reference_excluded",
  ]);
  const historicalJson = JSON.stringify(historicalResult.value);
  for (const privateValue of ["remote-resume-row", "account-a", "user-a", "server-resume-row", "remote-resume-id"]) {
    assert.equal(historicalJson.includes(privateValue), false);
  }
  assertFailure(contract("skillmint:resume-analysis").reconstruct({
    ...activeResume,
    accountId: { unexpected: true },
  }), "invalid_export_value");
});

test("23-27 sync status preserves all four persisted states and excludes operational references", () => {
  for (const key of ["skillmint:resume-sync-status", "skillmint:jd-match-sync-status"]) {
    for (const status of ["synced", "local-only", "pending", "failed"]) {
      const statusResult = assertSuccess(contract(key).reconstruct({ status, message: `raw ${status} message` }));
      assert.deepEqual(statusResult.value, { status });
      assert.deepEqual(statusResult.privacyTransformations, ["sync_status_message_excluded"]);
    }

    const withReferences = assertSuccess(contract(key).reconstruct({
      status: "synced",
      message: "raw operational message",
      syncedAt: "2026-07-11T00:00:00Z",
      databaseId: "row-1",
      accountId: "account-a",
      serverRecordId: "server-row-1",
    }));
    assert.deepEqual(withReferences.value, {
      status: "synced",
      syncedAt: "2026-07-11T00:00:00Z",
    });
    assert.deepEqual(withReferences.privacyTransformations, [
      "sync_status_message_excluded",
      "database_reference_excluded",
      "ownership_reference_excluded",
    ]);
    const serialized = JSON.stringify(withReferences.value);
    for (const privateValue of ["raw operational message", "row-1", "account-a", "server-row-1"]) {
      assert.equal(serialized.includes(privateValue), false);
    }
    assertFailure(contract(key).reconstruct({ status: "synced", message: "x", syncedAt: "yesterday" }), "invalid_export_timestamp");
    assertFailure(contract(key).reconstruct({ status: "synced", message: "x", databaseId: 123 }), "invalid_export_value");
    assertFailure(contract(key).reconstruct({ status: "synced", message: "x", accountId: 123 }), "invalid_export_value");
    assertFailure(contract(key).reconstruct({ status: "queued", message: "x" }), "invalid_export_value");
  }
});

test("28-35 current JD Match reuses nested contracts, preserves content, and excludes database reference", () => {
  const result = assertSuccess(contract("skillmint:jd-match").reconstruct(deepFreeze(clone(currentMatch))));
  assert.equal(result.value.databaseId, undefined);
  assert.equal(result.value.jobDescription, currentMatch.jobDescription);
  assert.deepEqual(result.value.result, matchResult);
  assert.deepEqual(result.value.roadmap, roadmap);
  assert.deepEqual(result.value.resumeContext, resumeContext);
  assert.deepEqual(result.privacyTransformations, ["database_reference_excluded"]);
  assertFailure(contract("skillmint:jd-match").reconstruct({ ...currentMatch, roadmap: { bad: true } }), "invalid_export_value");
  assertFailure(contract("skillmint:jd-match").reconstruct({ ...currentMatch, unknown: true }), "invalid_export_value");
  const nested = clone(currentMatch); nested.resumeContext.extra = true;
  assertFailure(contract("skillmint:jd-match").reconstruct(nested), "invalid_export_value");

  const plansAbsent = clone(currentMatch);
  delete plansAbsent.improvementPlan;
  delete plansAbsent.rewritePlan;
  const historicalPlans = assertSuccess(contract("skillmint:jd-match").reconstruct(plansAbsent));
  assert.equal(historicalPlans.value.improvementPlan, null);
  assert.equal(historicalPlans.value.rewritePlan, null);

  const onePlanAbsent = clone(currentMatch);
  delete onePlanAbsent.improvementPlan;
  onePlanAbsent.rewritePlan = rewritePlan;
  const mixedPlans = assertSuccess(contract("skillmint:jd-match").reconstruct(onePlanAbsent));
  assert.equal(mixedPlans.value.improvementPlan, null);
  assert.deepEqual(mixedPlans.value.rewritePlan, rewritePlan);

  const undefinedPlan = clone(currentMatch);
  undefinedPlan.improvementPlan = undefined;
  assertFailure(contract("skillmint:jd-match").reconstruct(undefinedPlan), "invalid_export_value");
  assertFailure(contract("skillmint:jd-match").reconstruct({ ...currentMatch, improvementPlan: { unknown: true } }), "invalid_export_value");

  const remoteIdentifier = "7bb7f43f-4a5d-4e5b-9001-123456789abc";
  const privateReferences = assertSuccess(contract("skillmint:jd-match").reconstruct({
    ...clone(currentMatch),
    id: remoteIdentifier,
    databaseId: remoteIdentifier,
    accountId: "account-a",
    ownerId: "owner-a",
    serverRecordId: "server-jd-row",
    remoteId: "remote-jd-row",
  }));
  assert.equal(privateReferences.value.id, undefined);
  assert.deepEqual(privateReferences.privacyTransformations, [
    "database_reference_excluded",
    "ownership_reference_excluded",
    "unsafe_job_match_identifier_excluded",
  ]);
  const privateJson = JSON.stringify(privateReferences.value);
  for (const privateValue of [remoteIdentifier, "account-a", "owner-a", "server-jd-row", "remote-jd-row"]) {
    assert.equal(privateJson.includes(privateValue), false);
  }
  const emptyJdResumeContext = clone(currentMatch);
  emptyJdResumeContext.resumeContext = {
    fingerprint: "",
    fileName: "",
    scoringVersion: "",
  };
  assert.deepEqual(
    assertSuccess(contract("skillmint:jd-match").reconstruct(emptyJdResumeContext)).value.resumeContext,
    emptyJdResumeContext.resumeContext,
  );
  assertFailure(contract("skillmint:jd-match").reconstruct({
    ...currentMatch,
    ownerId: { unexpected: true },
  }), "invalid_export_value");
});

test("36-40 JD history preserves order, historical plans, safe IDs, exclusions, and immutability", () => {
  const secondMatch = clone(currentMatch);
  delete secondMatch.databaseId;
  secondMatch.id = "second";
  const input = deepFreeze([{ ...clone(currentMatch), id: "first" }, secondMatch]);
  const result = assertSuccess(contract("skillmint:jd-match-history").reconstruct(input));
  assert.deepEqual(result.value.map((item) => item.id), ["first", "second"]);
  assert.deepEqual(result.privacyTransformations, ["database_reference_excluded"]);

  const missingPlans = clone(currentMatch);
  delete missingPlans.improvementPlan;
  delete missingPlans.rewritePlan;
  missingPlans.id = "historical-local-id";
  const historical = assertSuccess(contract("skillmint:jd-match-history").reconstruct([missingPlans]));
  assert.equal(historical.value[0].improvementPlan, null);
  assert.equal(historical.value[0].rewritePlan, null);

  const uuidId = "7bb7f43f-4a5d-4e5b-9001-123456789abc";
  const unsafeHistory = deepFreeze([
    { ...clone(currentMatch), id: uuidId, databaseId: "remote-a", accountId: "account-a" },
    { ...clone(currentMatch), id: "remote-b", databaseId: "remote-b", analyzedAt: "2026-07-12T00:00:00.000Z" },
    { ...clone(currentMatch), id: "safe-local-id", databaseId: undefined },
  ].map((item) => {
    if (item.databaseId === undefined) delete item.databaseId;
    return item;
  }));
  const firstUnsafe = assertSuccess(contract("skillmint:jd-match-history").reconstruct(unsafeHistory));
  const secondUnsafe = assertSuccess(contract("skillmint:jd-match-history").reconstruct(unsafeHistory));
  assert.deepEqual(firstUnsafe, secondUnsafe);
  assert.deepEqual(firstUnsafe.value.map((item) => item.id), [
    "browser-export-jd-1",
    "browser-export-jd-2",
    "safe-local-id",
  ]);
  assert.deepEqual(firstUnsafe.privacyTransformations, [
    "database_reference_excluded",
    "ownership_reference_excluded",
    "unsafe_job_match_identifier_replaced",
  ]);
  const unsafeJson = JSON.stringify(firstUnsafe.value);
  for (const privateValue of [uuidId, "remote-a", "remote-b", "account-a"]) {
    assert.equal(unsafeJson.includes(privateValue), false);
  }

  const generatedIdCollision = assertSuccess(contract("skillmint:jd-match-history").reconstruct([
    { ...clone(currentMatch), id: uuidId, databaseId: "browser-export-jd-1" },
    { ...clone(currentMatch), id: "browser-export-jd-1", databaseId: "remote-c" },
  ]));
  assert.equal(new Set(generatedIdCollision.value.map((item) => item.id)).size, 2);
  assert.equal(generatedIdCollision.value.some((item) => item.id === "browser-export-jd-1"), false);

  assertFailure(contract("skillmint:jd-match-history").reconstruct([{ ...currentMatch, id: "same" }, { ...currentMatch, id: "same" }]), "invalid_export_value");
  assertFailure(contract("skillmint:jd-match-history").reconstruct([{ ...currentMatch, result: null }]), "invalid_export_value");
  assertFailure(contract("skillmint:jd-match-history").reconstruct([{ ...currentMatch, improvementPlan: { unknown: true } }]), "invalid_export_value");
});

test("41-45 Active Target matches persisted compatibility without normalizing stored content", () => {
  const profile = { id: "profile", source: "profile_fit", status: "active", title: "  Exact title  ", roleTitle: "Role", targetRole: "Role", mainGap: "Gap", nextBestMove: "Move", createdAt: "2026-07-11T00:00:00.000Z", updatedAt: "2026-07-11T00:00:00.000Z" };
  const ultimate = { ...profile, id: "ultimate", source: "ultimate_goal" };
  const manual = { ...profile, id: "manual", source: "manual", manualIntent: "custom_goal" };
  const historicalManual = { ...profile, id: "manual-without-intent", source: "manual" };
  for (const value of [latestTarget, profile, ultimate, manual, historicalManual]) {
    const result = assertSuccess(contract("skillmint:active-target:v1").reconstruct(value));
    assert.equal(result.value.title, value.title);
  }
  assert.equal(assertSuccess(contract("skillmint:active-target:v1").reconstruct(historicalManual)).value.manualIntent, undefined);

  const nonJdWithDocumentedJdFields = {
    ...profile,
    location: "",
    careerField: "",
    jdText: "Stored historical JD text",
    jdHash: "",
    jdMatch: latestTarget.jdMatch,
  };
  const preserved = assertSuccess(contract("skillmint:active-target:v1").reconstruct(nonJdWithDocumentedJdFields));
  assert.equal(preserved.value.jdText, "Stored historical JD text");
  assert.equal(preserved.value.jdHash, "");
  assert.deepEqual(preserved.value.jdMatch, latestTarget.jdMatch);
  assert.equal(preserved.value.location, "");
  assert.equal(preserved.value.careerField, "");

  assertFailure(contract("skillmint:active-target:v1").reconstruct({ ...profile, companyName: "" }), "invalid_export_value");
  assertFailure(contract("skillmint:active-target:v1").reconstruct({ ...profile, manualIntent: "other" }), "invalid_export_value");
  const latestWithoutMatch = clone(latestTarget); delete latestWithoutMatch.jdMatch;
  assertFailure(contract("skillmint:active-target:v1").reconstruct(latestWithoutMatch), "invalid_export_value");
  const latestWithEmptyFingerprint = clone(latestTarget);
  latestWithEmptyFingerprint.jdMatch.resumeContext.fingerprint = "";
  assertFailure(contract("skillmint:active-target:v1").reconstruct(latestWithEmptyFingerprint), "invalid_export_value");
  const latestWithEmptyFileName = clone(latestTarget);
  latestWithEmptyFileName.jdMatch.resumeContext.fileName = "";
  assertFailure(contract("skillmint:active-target:v1").reconstruct(latestWithEmptyFileName), "invalid_export_value");
  assertFailure(contract("skillmint:active-target:v1").reconstruct({ version: 1, ownerUserId: "user-a", target: latestTarget }), "unsupported_browser_data_contract");
  assertFailure(contract("skillmint:active-target:v1").reconstruct({ ...latestTarget, createdAt: "2026-07-11" }), "invalid_export_timestamp");
});

test("46-49 Target Role Setup validates all enums, rejects drift, and preserves role text", () => {
  const result = assertSuccess(contract("skillmint:target-role-setup").reconstruct(targetRole));
  assert.deepEqual(result.value, targetRole);
  for (const field of ["careerField", "experienceLevel", "primaryGoal", "preferredJobType", "weeklyTimeCommitment"]) {
    assertFailure(contract("skillmint:target-role-setup").reconstruct({ ...targetRole, [field]: "invalid" }), "invalid_export_value");
  }
  assertFailure(contract("skillmint:target-role-setup").reconstruct({ ...targetRole, unknown: true }), "invalid_export_value");
  assert.equal(result.value.targetRole, "  Software Engineer  ");
});

test("50-53 mission map is deterministic and selected path preserves accepted input", () => {
  const result = assertSuccess(contract("skillmint:mission-status:v1").reconstruct({ zeta: "started", alpha: "done_by_user" }));
  assert.deepEqual(Object.keys(result.value), ["alpha", "zeta"]);
  const reserved = Object.create(null); reserved.constructor = "started";
  assertFailure(contract("skillmint:mission-status:v1").reconstruct(reserved), "unsupported_browser_data_contract");
  assertFailure(contract("skillmint:mission-status:v1").reconstruct({ mission: "complete" }), "invalid_export_value");
  assert.equal(assertSuccess(contract("skillmint:selected-career-path:v1").reconstruct("  path:role  ")).value, "  path:role  ");
});

test("54-65 feedback preserves records and text while applying exact pathname privacy", () => {
  const result = assertSuccess(contract("skillmint:beta-feedback").reconstruct([feedback]));
  assert.equal(result.value[0].message, feedback.message);
  assert.equal(result.value[0].pagePath, "/settings/data");
  assert.equal(result.value[0].syncError, undefined);
  assert.deepEqual(result.privacyTransformations, ["feedback_sync_error_excluded", "feedback_query_removed", "feedback_fragment_removed"]);
  assertFailure(contract("skillmint:beta-feedback").reconstruct([feedback, feedback]), "invalid_export_value");
  assertFailure(contract("skillmint:beta-feedback").reconstruct([{ ...feedback, pagePath: "//evil.test/path" }]), "invalid_export_value");
  const absoluteFeedback = { ...feedback, pagePath: "https://example.test:8443/private/path?q=1#part" };
  delete absoluteFeedback.syncError;
  const absolute = assertSuccess(contract("skillmint:beta-feedback").reconstruct([absoluteFeedback]));
  assert.equal(absolute.value[0].pagePath, "/private/path");
  assert.deepEqual(absolute.privacyTransformations, ["feedback_query_removed", "feedback_fragment_removed", "feedback_absolute_url_reduced_to_pathname"]);
  const fragmentOnly = { ...feedback, pagePath: "/settings/data#fragment?not-a-query" };
  delete fragmentOnly.syncError;
  const fragmentOnlyResult = assertSuccess(contract("skillmint:beta-feedback").reconstruct([fragmentOnly]));
  assert.equal(fragmentOnlyResult.value[0].pagePath, "/settings/data");
  assert.deepEqual(fragmentOnlyResult.privacyTransformations, ["feedback_fragment_removed"]);

  for (const pagePath of [
    "https://user:pass@example.test/path",
    "ftp://example.test/path",
    "settings/data",
    "https:example.test/path",
    "https:/example.test/path",
    " https://example.test/path",
    "https://example.test/path ",
    "/bad\u0000path",
  ]) {
    assertFailure(contract("skillmint:beta-feedback").reconstruct([{ ...feedback, pagePath }]), "invalid_export_value");
  }
  assertFailure(contract("skillmint:beta-feedback").reconstruct([{ ...feedback, createdAt: "2025-02-29T00:00:00Z" }]), "invalid_export_timestamp");
});

test("66-72 global preferences reconstruct exact values, enforce sources and IDs, and preserve order", () => {
  const onboarding = contract("skillmint:onboarding-dismissed");
  assert.equal(assertSuccess(onboarding.reconstruct(false)).value, false);
  assert.equal(onboarding.ownerScope, "global_preference");
  const upgradeContract = contract("skillmint:upgrade-interest");
  const result = assertSuccess(upgradeContract.reconstruct([upgrade, { ...upgrade, id: "upgrade-2", source: "roadmap" }]));
  assert.deepEqual(result.value.map((item) => item.id), ["upgrade-1", "upgrade-2"]);
  assert.equal(upgradeContract.ownerScope, "global_preference");
  assertFailure(upgradeContract.reconstruct([{ ...upgrade, source: "billing" }]), "invalid_export_value");
  assertFailure(upgradeContract.reconstruct([upgrade, upgrade]), "invalid_export_value");
});

test("73-82 general safety fails closed, returns fresh deterministic values, and never leaks envelope metadata or raw errors", () => {
  assertFailure(contract("skillmint:upgrade-interest").reconstruct([{ ...upgrade, ordinaryUnknown: true }]), "invalid_export_value");
  for (const key of ["access token", "refresh-token", "Raw_Provider_Error", "stack trace", "owner-id", "constructor"]) {
    const value = clone(activeResume);
    Object.defineProperty(value.userProfile.github, key, { value: "private", enumerable: true });
    assertFailure(contract("skillmint:resume-analysis").reconstruct(value), "unsupported_browser_data_contract");
  }
  const sparse = []; sparse.length = 1;
  assertFailure(contract("skillmint:upgrade-interest").reconstruct(sparse), "invalid_export_value");
  const extra = [upgrade]; extra.extra = true;
  assertFailure(contract("skillmint:upgrade-interest").reconstruct(extra), "invalid_export_value");
  const symbolExtra = [upgrade];
  Object.defineProperty(symbolExtra, Symbol("extra"), { value: true, enumerable: true });
  assertFailure(contract("skillmint:upgrade-interest").reconstruct(symbolExtra), "invalid_export_value");
  class RecordInstance { constructor() { Object.assign(this, upgrade); } }
  assertFailure(contract("skillmint:upgrade-interest").reconstruct([new RecordInstance()]), "invalid_export_value");
  const frozen = deepFreeze([clone(upgrade)]);
  const first = assertSuccess(contract("skillmint:upgrade-interest").reconstruct(frozen));
  const second = assertSuccess(contract("skillmint:upgrade-interest").reconstruct(frozen));
  assert.notEqual(first.value, frozen);
  assert.notEqual(first.value[0], frozen[0]);
  assert.deepEqual(first, second);
  const allSafeValues = [
    assertSuccess(contract("skillmint:resume-analysis").reconstruct(activeResume)).value,
    assertSuccess(contract("skillmint:jd-match").reconstruct(currentMatch)).value,
    assertSuccess(contract("skillmint:beta-feedback").reconstruct([feedback])).value,
  ];
  const serialized = JSON.stringify(allSafeValues);
  for (const key of [
    "ownerUserId",
    "userId",
    "accountId",
    "ownerId",
    "databaseId",
    "serverRecordId",
    "remoteId",
    "syncError",
    "raw provider detail",
  ]) assert.equal(serialized.includes(key), false, key);
  const failure = contract("skillmint:resume-analysis").reconstruct({ ...activeResume, "raw provider error": "private provider text" });
  assert.equal(JSON.stringify(failure).includes("private provider text"), false);
});

for (const { name, callback } of tests) {
  callback();
  console.log(`PASS ${name}`);
}

console.log(
  "Offline Block 5.2.3 browser-export contract fixture complete. It does not prove browser storage collection, owner classification, legacy visibility selection, cross-tab consistency, final storage verification, browser export serialization, download behavior, browser hydration, accessibility, live database behavior, live RLS, provider backups, legal compliance, or production readiness.",
);
