import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(repoRoot, "src");

const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveSkillMintAlias(
  request,
  parent,
  isMain,
  options,
) {
  if (request.startsWith("@/")) {
    return originalResolveFilename.call(
      this,
      path.join(srcRoot, request.slice(2)),
      parent,
      isMain,
      options,
    );
  }

  return originalResolveFilename.call(
    this,
    request,
    parent,
    isMain,
    options,
  );
};

require.extensions[".ts"] = function compileTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
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

const { calculateCareerIQ } = require("../src/intelligence/core/careerIQ.ts");
const {
  analyzeJobDescriptionMatch,
} = require("../src/intelligence/core/jobDescriptionMatch.ts");
const {
  calculateRoleMatches,
} = require("../src/intelligence/core/roleMatch.ts");
const {
  generateProofScore,
} = require("../src/intelligence/proof/proofScoring.ts");
const {
  generateStructuredMissions,
} = require("../src/intelligence/missions/missionGenerator.ts");
const {
  buildCareerPathEngineResult,
} = require("../src/intelligence/roadmap/careerPathEngine.ts");
const {
  buildActiveTargetCopyText,
} = require("../src/intelligence/target/activeTargetCopy.ts");
const {
  buildActiveTargetEngineResult,
} = require("../src/intelligence/target/activeTargetEngine.ts");
const {
  createActiveTargetResumeContext,
} = require("../src/intelligence/target/activeTargetResumeContext.ts");
const {
  createManualActiveTarget,
  createActiveTargetFromLatestJd,
  createActiveTargetFromProfileFitRole,
  createActiveTargetFromUltimateGoal,
} = require("../src/intelligence/target/activeTargetSelection.ts");
const {
  ACTIVE_TARGET_STORAGE_KEY,
  ACTIVE_TARGET_STORAGE_VERSION,
  clearActiveTarget,
  getActiveTarget,
  parseActiveTarget,
  readActiveTargetStorageSnapshot,
  setActiveTarget,
} = require("../src/intelligence/target/activeTargetStorage.ts");
const {
  clearSkillMintWorkspace,
} = require("../src/lib/storage/clearSkillMintWorkspace.ts");

global.window = {
  localStorage: createMemoryStorage(),
  dispatchEvent() {},
};

const fixture = {
  profile: profile({
    resumeScore: 18,
    skillsScore: 13,
    projectsScore: 13,
    experienceScore: 4,
    educationScore: 8,
    githubScore: 6,
    linkedinScore: 3,
    atsScore: 4,
    recruiterScore: 4,
    activityScore: 4,
    skills: [
      "React",
      "Next.js",
      "TypeScript",
      "Node.js",
      "SQL",
      "REST API",
      "Authentication",
      "Testing",
      "Git",
    ],
    projects: [
      "Built a Next.js dashboard with authentication, API routes, SQL filters, and analytics views.",
      "Created a Node.js REST API with tests and deployment notes.",
    ],
    experience: [
      "Frontend intern improved dashboard accessibility and reusable React components.",
    ],
    education: "B.Tech Computer Science",
    github: {
      url: "https://github.com/student",
      repositories: 8,
      stars: 18,
      followers: 7,
      openSourceContributions: 1,
    },
    analysisFlags: {
      hasMeasurableImpact: true,
      hasSectionClarity: true,
      hasProofLink: true,
      hasGenericProjects: false,
      isPlaceholderText: false,
    },
  }),
  resumeText:
    "Projects: Built a Next.js dashboard with authentication API routes SQL filters and analytics views. Created a Node.js REST API with tests and deployment notes. GitHub https://github.com/student\nSkills: React Next.js TypeScript Node.js SQL REST API Authentication Testing Git",
  targetRole: "Full Stack Engineer",
  careerField: "tech_software",
};

const evaluated = evaluateFixture(fixture);
const resumeAContext = createActiveTargetResumeContext({
  fileName: "resume-a.pdf",
  fileType: "application/pdf",
  fileSize: 1200,
  extractedText: fixture.resumeText,
  analyzedAt: "2026-07-11T00:00:00.000Z",
  scoringVersion: "fixture-v1",
  userProfile: fixture.profile,
});
const resumeBContext = createActiveTargetResumeContext({
  fileName: "resume-b.pdf",
  fileType: "application/pdf",
  fileSize: 1800,
  extractedText:
    `${fixture.resumeText}\nProjects: Built Kubernetes deployment workflows and Linux monitoring automation.`,
  analyzedAt: "2026-07-12T00:00:00.000Z",
  scoringVersion: "fixture-v1",
  userProfile: {
    ...fixture.profile,
    skills: [...fixture.profile.skills, "Kubernetes", "Linux"],
    projectsScore: fixture.profile.projectsScore + 2,
  },
});
const dockerJd = analyzeJobDescriptionMatch(
  fixture.profile,
  "We are hiring a Full Stack Intern to build React and Next.js interfaces, Node.js APIs, SQL data models, Dockerized services, CI/CD checks, testing workflows, and clear product documentation.",
);
const kubernetesJd = analyzeJobDescriptionMatch(
  fixture.profile,
  "We are hiring a Platform Intern to build Node.js APIs, Kubernetes deployment workflows, monitoring dashboards, Linux automation, testing checks, and clear runbooks.",
);
const dockerTarget = createActiveTargetFromLatestJd({
  title: "Full Stack Intern",
  companyName: "Acme",
  roleTitle: "Full Stack Intern",
  jdText:
    "React Next.js Node.js SQL Docker CI/CD testing product documentation.",
  result: dockerJd,
  resumeContext: resumeAContext,
  targetRole: fixture.targetRole,
  careerField: fixture.careerField,
  now: "2026-07-11T00:00:00.000Z",
});
const kubernetesTarget = createActiveTargetFromLatestJd({
  title: "Platform Intern",
  companyName: "Orbit",
  roleTitle: "Platform Intern",
  jdText:
    "Node.js Kubernetes monitoring Linux automation testing runbooks.",
  result: kubernetesJd,
  resumeContext: resumeAContext,
  targetRole: "Platform Engineer",
  careerField: fixture.careerField,
  now: "2026-07-11T00:00:00.000Z",
});
const profileTarget = createActiveTargetFromProfileFitRole({
  roleMatch: evaluated.roles[0],
  careerField: fixture.careerField,
  now: "2026-07-11T00:00:00.000Z",
});
const ultimateTarget = createActiveTargetFromUltimateGoal({
  targetRole: "AI Engineer",
  careerField: fixture.careerField,
  closestRole: evaluated.roles[0]?.role,
  now: "2026-07-11T00:00:00.000Z",
});
const manualTarget = createManualActiveTarget({
  title: "Data Analyst",
  careerField: fixture.careerField,
  now: "2026-07-11T00:00:00.000Z",
});

const noTargetNoResume = buildActiveTargetEngineResult({
  hasResumeAnalysis: false,
});
const resumeNoTarget = buildActiveTargetEngineResult({
  hasResumeAnalysis: true,
  resumeContext: resumeAContext,
  roleMatches: evaluated.roles,
  latestJobMatch: {
    title: "Full Stack Intern",
    companyName: "Acme",
    result: dockerJd,
  },
  targetRole: fixture.targetRole,
  careerField: fixture.careerField,
});
const jdTargetResult = buildActiveTargetEngineResult({
  activeTarget: dockerTarget,
  hasResumeAnalysis: true,
  resumeContext: resumeAContext,
  careerIQ: evaluated.careerIQ,
  proof: evaluated.proof,
  roleMatches: evaluated.roles,
  targetRole: fixture.targetRole,
  careerField: fixture.careerField,
});

assertNoResumeNoTarget();
assertResumeSuggestions();
assertJdTargetContract();
assertNonJdTargetsDoNotFakeJdScore();
assertStaleJdMatchHandling();
assertTargetDoesNotChangeCareerIq();
assertTargetAwareMission();
assertStorageBehavior();
assertStorageHardening();
assertAccountIsolation();
assertClearWorkspaceIntegration();
assertReplacingTargetChangesGap();
assertRoadmapUsesActiveTargetJd();
assertPathSelectionSemantics();
assertOldLatestJdCanConvert();
assertNoDuplicateMissionGeneration();
assertDeterministicRepeatedOutput();
assertNoUnsafeWording();
assertDashboardNextBestLimit();

console.log("Active target fixtures passed.");
console.log(`noTarget: suggestions ${resumeNoTarget.suggestions.length}`);
console.log(`jdTarget: JD Match ${dockerTarget.jdMatch?.score ?? 0}`);
console.log(`profileTarget: ${profileTarget.jdMatch ? "has JD score" : "no JD score"}`);
console.log(
  `targetMission: ${getTargetAwareMissions()[0]?.title ?? "none"}`,
);

function assertNoResumeNoTarget() {
  assert(
    noTargetNoResume.activeTarget === null &&
      noTargetNoResume.suggestions.length === 0,
    "No resume and no target should not create a fake Active Target.",
  );
}

function assertResumeSuggestions() {
  assert(
    resumeNoTarget.suggestions.length >= 2,
    "Resume with no target should produce target suggestions.",
  );
  assert(
    resumeNoTarget.primarySuggestion?.source === "latest_jd",
    "Latest JD should be the primary suggestion when present.",
  );
}

function assertJdTargetContract() {
  const firstMissingSignal = dockerTarget.jdMatch?.missingSkills[0] ??
    dockerTarget.jdMatch?.missingKeywords[0];

  assert(
    dockerTarget.source === "latest_jd",
    "JD match should create latest_jd target.",
  );
  assert(
    typeof dockerTarget.jdMatch?.score === "number",
    "JD Active Target should include jdMatch score.",
  );
  assert(
    firstMissingSignal &&
      `${dockerTarget.mainGap} ${dockerTarget.nextBestMove}`
        .includes(firstMissingSignal),
    "JD target should explain its first missing gap.",
  );
}

function assertNonJdTargetsDoNotFakeJdScore() {
  assert(ultimateTarget, "Ultimate goal target should be created.");
  assert(manualTarget, "Manual custom goal target should be created.");
  assert(!profileTarget.jdMatch, "Profile-fit target must not fake JD Match.");
  assert(!ultimateTarget.jdMatch, "Ultimate goal target must not fake JD Match.");
  assert(!manualTarget.jdMatch, "Manual target must not fake JD Match.");
}

function assertStaleJdMatchHandling() {
  const staleResult = buildActiveTargetEngineResult({
    activeTarget: dockerTarget,
    hasResumeAnalysis: true,
    resumeContext: resumeBContext,
    careerIQ: evaluated.careerIQ,
    proof: evaluated.proof,
    roleMatches: evaluated.roles,
  });
  const noContextTarget = createActiveTargetFromLatestJd({
    title: "Legacy JD",
    result: dockerJd,
    now: "2026-07-11T00:00:00.000Z",
  });
  const noContextResult = buildActiveTargetEngineResult({
    activeTarget: noContextTarget,
    hasResumeAnalysis: true,
    resumeContext: resumeAContext,
    careerIQ: evaluated.careerIQ,
    proof: evaluated.proof,
    roleMatches: evaluated.roles,
  });

  assert(
    staleResult.jdMatchStatus === "stale",
    "Resume A JD Match should become stale against Resume B.",
  );
  assert(
    !staleResult.activeTarget?.jdMatch,
    "Stale JD Match score must not be exposed as current.",
  );
  assert(
    /Re-run.*JD match/i.test(staleResult.mainGap),
    "Stale JD Match should ask the user to re-run for the current resume.",
  );
  assert(
    noContextResult.jdMatchStatus === "stale" &&
      !noContextResult.activeTarget?.jdMatch,
    "JD target without resume context should not expose a current score.",
  );
}

function assertTargetDoesNotChangeCareerIq() {
  const baselineScore = evaluated.careerIQ.score;

  buildActiveTargetEngineResult({
    activeTarget: dockerTarget,
    hasResumeAnalysis: true,
    careerIQ: evaluated.careerIQ,
    proof: evaluated.proof,
    roleMatches: evaluated.roles,
  });

  assert(
    evaluated.careerIQ.score === baselineScore,
    "Active Target selection must not change Career IQ.",
  );
}

function assertTargetAwareMission() {
  const [mission] = getTargetAwareMissions();

  assert(mission, "Active Target missing skill should produce a mission.");
  assert(
    /Active Target/i.test(mission.title),
    "Target-aware mission title should mention Active Target.",
  );
  assert(
    /Only add .* if you actually used it|build a small proof project/i
      .test(`${mission.evidenceNeeded} ${mission.steps.join(" ")}`),
    "Target-aware mission should use proof-first language.",
  );
  assert(
    !/add .* keyword|pass ATS/i.test(`${mission.title} ${mission.evidenceNeeded} ${mission.steps.join(" ")}`),
    "Target-aware mission should not encourage keyword stuffing.",
  );
}

function assertStorageBehavior() {
  assert(setActiveTarget(dockerTarget), "Active Target should save.");
  assert(
    getActiveTarget()?.id === dockerTarget.id,
    "Active Target should round-trip from storage.",
  );
  assert(
    readActiveTargetStorageSnapshot()?.includes("active-target:latest-jd"),
    "Storage snapshot should include Active Target id.",
  );
  assert(clearActiveTarget(), "Active Target should clear.");
  assert(getActiveTarget() === null, "Cleared Active Target should be null.");

  window.localStorage.setItem(ACTIVE_TARGET_STORAGE_KEY, "{bad json");
  assert(getActiveTarget() === null, "Invalid Active Target JSON should not crash.");
  assert(parseActiveTarget(null) === null, "Empty Active Target should parse as null.");
}

function assertStorageHardening() {
  const serializedTarget = JSON.stringify({
    version: ACTIVE_TARGET_STORAGE_VERSION,
    ownerUserId: null,
    target: dockerTarget,
  });
  const invalidCases = [
    "null",
    "42",
    JSON.stringify({
      version: 999,
      ownerUserId: null,
      target: dockerTarget,
    }),
    JSON.stringify({
      version: ACTIVE_TARGET_STORAGE_VERSION,
      ownerUserId: null,
      target: {
        ...dockerTarget,
        title: undefined,
      },
    }),
    JSON.stringify({
      version: ACTIVE_TARGET_STORAGE_VERSION,
      ownerUserId: null,
      target: {
        ...dockerTarget,
        title: "   ",
      },
    }),
    JSON.stringify({
      version: ACTIVE_TARGET_STORAGE_VERSION,
      ownerUserId: null,
      target: {
        ...dockerTarget,
        createdAt: "not-a-date",
      },
    }),
  ];

  assert(
    parseActiveTarget(serializedTarget)?.id === dockerTarget.id,
    "Versioned storage envelope should parse.",
  );

  for (const storedValue of invalidCases) {
    assert(
      parseActiveTarget(storedValue) === null,
      `Invalid stored target should be ignored: ${storedValue.slice(0, 24)}`,
    );
  }

  const longTarget = createManualActiveTarget({
    title: "A".repeat(500),
    now: "2026-07-11T00:00:00.000Z",
  });
  const scriptTarget = createManualActiveTarget({
    title: "<script>alert('x')</script> Product Analyst",
    now: "2026-07-11T00:00:00.000Z",
  });
  const nonJdWithMatch = parseActiveTarget(JSON.stringify({
    version: ACTIVE_TARGET_STORAGE_VERSION,
    ownerUserId: null,
    target: {
      ...profileTarget,
      jdMatch: dockerTarget.jdMatch,
      jdText: "Should be stripped",
      jdHash: "fake",
    },
  }));

  assert(longTarget?.title.length === 140, "Long manual target should be capped.");
  assert(
    scriptTarget?.title.includes("<script>"),
    "HTML-like input should remain inert plain text.",
  );
  assert(
    !nonJdWithMatch?.jdMatch && !nonJdWithMatch?.jdText,
    "Non-JD target carrying JD Match data should be normalized safely.",
  );
  assert(
    createManualActiveTarget({
      title: "   ",
      now: "2026-07-11T00:00:00.000Z",
    }) === null,
    "Whitespace-only manual target should be rejected.",
  );

  assertStorageUnavailableStates();
}

function assertStorageUnavailableStates() {
  const originalWindow = global.window;

  try {
    global.window = {};
    assert(getActiveTarget() === null, "Missing localStorage should read null.");
    assert(!setActiveTarget(dockerTarget), "Missing localStorage should not save.");
    assert(!clearActiveTarget(), "Missing localStorage should not clear.");

    global.window = {
      get localStorage() {
        throw new Error("blocked");
      },
      dispatchEvent() {},
    };
    assert(getActiveTarget() === null, "Throwing localStorage getter should read null.");
    assert(!setActiveTarget(dockerTarget), "Throwing localStorage getter should not save.");

    global.window = {
      localStorage: {
        getItem() {
          return null;
        },
        setItem() {
          throw new Error("quota");
        },
        removeItem() {
          throw new Error("blocked");
        },
      },
      dispatchEvent() {},
    };
    assert(!setActiveTarget(dockerTarget), "Storage write failure should return false.");
    assert(!clearActiveTarget(), "Storage remove failure should return false.");
  } finally {
    global.window = originalWindow;
  }
}

function assertAccountIsolation() {
  window.localStorage = createMemoryStorage();

  assert(
    setActiveTarget(dockerTarget, { ownerUserId: "user-a" }),
    "User-scoped Active Target should save.",
  );
  assert(
    getActiveTarget({ currentUserId: "user-a" })?.id === dockerTarget.id,
    "Owner should read their Active Target.",
  );
  assert(
    getActiveTarget({ currentUserId: "user-b" }) === null,
    "Different signed-in user must not see another user's Active Target.",
  );
  assert(
    getActiveTarget({ currentUserId: null }) === null,
    "Signed-out browser should not see a signed-in user's target.",
  );
  assert(
    getActiveTarget({ currentUserId: undefined }) === null,
    "Unknown auth state should not expose stored target.",
  );
  assert(
    setActiveTarget(profileTarget, { ownerUserId: null }),
    "Anonymous Active Target should save.",
  );
  assert(
    getActiveTarget({ currentUserId: null })?.id === profileTarget.id,
    "Anonymous browser target should remain available while signed out.",
  );
}

function assertClearWorkspaceIntegration() {
  setActiveTarget(dockerTarget);
  clearSkillMintWorkspace();
  assert(
    getActiveTarget() === null,
    "Clear workspace should remove browser-local Active Target.",
  );
}

function assertReplacingTargetChangesGap() {
  assert(dockerTarget.id !== kubernetesTarget.id, "Replacing target should change id.");
  assert(
    dockerTarget.mainGap !== kubernetesTarget.mainGap,
    "Replacing JD target should change target gap.",
  );
}

function assertRoadmapUsesActiveTargetJd() {
  const result = buildCareerPathEngineResult({
    profile: fixture.profile,
    careerIQ: evaluated.careerIQ,
    proof: evaluated.proof,
    roleMatches: evaluated.roles,
    activeTarget: dockerTarget,
    resumeContext: resumeAContext,
    latestJobMatch: {
      title: dockerTarget.title,
      companyName: dockerTarget.companyName,
      result: {
        matchScore: dockerTarget.jdMatch.score,
        verdict: dockerTarget.jdMatch.verdict,
        brutalReality: dockerTarget.jdMatch.brutalReality,
        matchedSkills: dockerTarget.jdMatch.matchedSkills,
        missingSkills: dockerTarget.jdMatch.missingSkills,
        missingKeywords: dockerTarget.jdMatch.missingKeywords,
        strengths: dockerTarget.jdMatch.strengths,
        weaknesses: dockerTarget.jdMatch.weaknesses,
        recommendations: dockerTarget.jdMatch.recommendations,
      },
    },
    targetRole: fixture.targetRole,
    careerField: fixture.careerField,
    resumeText: fixture.resumeText,
  });
  const latestJdTrack = result.tracks.find((track) =>
    track.id === "path:latest-jd"
  );

  assert(
    result.recommendedPathId === "path:latest-jd",
    "Active JD target should recommend Latest JD Path.",
  );
  assert(
    latestJdTrack?.summary.includes("Active Target JD"),
    "Latest JD Path should mention Active Target JD when present.",
  );
}

function assertOldLatestJdCanConvert() {
  const oldLatestJd = {
    title: "Legacy JD",
    result: dockerJd,
  };
  const result = buildActiveTargetEngineResult({
    hasResumeAnalysis: true,
    resumeContext: resumeAContext,
    latestJobMatch: oldLatestJd,
    roleMatches: evaluated.roles,
  });

  assert(
    result.suggestions.some((suggestion) => suggestion.source === "latest_jd"),
    "Old/latest JD data should offer conversion to Active Target.",
  );
}

function assertPathSelectionSemantics() {
  const latestJdPath = buildCareerPathEngineResult({
    profile: fixture.profile,
    careerIQ: evaluated.careerIQ,
    proof: evaluated.proof,
    roleMatches: evaluated.roles,
    activeTarget: dockerTarget,
    resumeContext: resumeAContext,
    latestJobMatch: {
      title: dockerTarget.title,
      companyName: dockerTarget.companyName,
      result: dockerJd,
    },
    targetRole: fixture.targetRole,
    careerField: fixture.careerField,
    resumeText: fixture.resumeText,
  });
  const staleTarget = buildActiveTargetEngineResult({
    activeTarget: dockerTarget,
    hasResumeAnalysis: true,
    resumeContext: resumeBContext,
    careerIQ: evaluated.careerIQ,
    proof: evaluated.proof,
    roleMatches: evaluated.roles,
  }).activeTarget;
  const staleLatestJdPath = buildCareerPathEngineResult({
    profile: fixture.profile,
    careerIQ: evaluated.careerIQ,
    proof: evaluated.proof,
    roleMatches: evaluated.roles,
    activeTarget: staleTarget,
    resumeContext: resumeBContext,
    latestJobMatch: null,
    targetRole: fixture.targetRole,
    careerField: fixture.careerField,
    resumeText: fixture.resumeText,
  });
  const profileFitPath = buildCareerPathEngineResult({
    profile: fixture.profile,
    careerIQ: evaluated.careerIQ,
    proof: evaluated.proof,
    roleMatches: evaluated.roles,
    activeTarget: profileTarget,
    resumeContext: resumeAContext,
    targetRole: fixture.targetRole,
    careerField: fixture.careerField,
    resumeText: fixture.resumeText,
  });
  const ultimateGoalPath = buildCareerPathEngineResult({
    profile: fixture.profile,
    careerIQ: evaluated.careerIQ,
    proof: evaluated.proof,
    roleMatches: evaluated.roles,
    activeTarget: ultimateTarget,
    resumeContext: resumeAContext,
    targetRole: ultimateTarget.targetRole,
    careerField: fixture.careerField,
    resumeText: fixture.resumeText,
  });
  const manualPath = buildCareerPathEngineResult({
    profile: fixture.profile,
    careerIQ: evaluated.careerIQ,
    proof: evaluated.proof,
    roleMatches: evaluated.roles,
    activeTarget: manualTarget,
    resumeContext: resumeAContext,
    targetRole: manualTarget.targetRole,
    careerField: fixture.careerField,
    resumeText: fixture.resumeText,
  });

  assert(
    latestJdPath.recommendedPathId === "path:latest-jd",
    "Latest JD target should recommend Latest JD Path.",
  );
  assert(
    staleLatestJdPath.recommendedPathId === "path:latest-jd",
    "Stale JD target should still point to Latest JD Path for rerun.",
  );
  assert(
    staleLatestJdPath.tracks.find((track) => track.id === "path:latest-jd")
      ?.status === "locked",
    "Stale JD path should be locked until rerun.",
  );
  assert(
    profileFitPath.recommendedPathId === "path:profile-fit",
    "Profile-fit target should recommend Closest Role Path.",
  );
  assert(
    ultimateGoalPath.recommendedPathId === "path:ultimate-goal",
    "Ultimate Goal target should recommend Ultimate Goal Path.",
  );
  assert(
    manualPath.recommendedPathId === "path:ultimate-goal",
    "Manual custom goal target should recommend Ultimate Goal Path.",
  );
}

function assertNoDuplicateMissionGeneration() {
  const missions = generateStructuredMissions({
    profile: fixture.profile,
    careerIQ: evaluated.careerIQ,
    proof: evaluated.proof,
    roleMatches: evaluated.roles,
    activeTarget: dockerTarget,
    resumeContext: resumeAContext,
    latestJobMatch: {
      title: dockerTarget.title,
      companyName: dockerTarget.companyName,
      result: dockerJd,
    },
    targetRole: fixture.targetRole,
    careerField: fixture.careerField,
    sourcePath: "latest_jd",
  });
  const missionIds = missions.map((mission) => mission.id);

  assert(
    new Set(missionIds).size === missionIds.length,
    "Mission generation should not produce duplicate mission IDs.",
  );
}

function assertDeterministicRepeatedOutput() {
  const firstRun = getTargetAwareMissions().map((mission) => ({
    id: mission.id,
    title: mission.title,
    priority: mission.priority,
  }));
  const secondRun = getTargetAwareMissions().map((mission) => ({
    id: mission.id,
    title: mission.title,
    priority: mission.priority,
  }));

  assert(
    JSON.stringify(firstRun) === JSON.stringify(secondRun),
    "Repeated Active Target mission output should be deterministic.",
  );
}

function assertNoUnsafeWording() {
  const combinedText = [
    buildActiveTargetCopyText(dockerTarget, jdTargetResult),
    dockerTarget.mainGap,
    dockerTarget.nextBestMove,
    profileTarget.mainGap,
    profileTarget.nextBestMove,
    ultimateTarget.mainGap,
    ultimateTarget.nextBestMove,
    ...getTargetAwareMissions().flatMap((mission) => [
      mission.title,
      mission.whyThisMatters,
      mission.evidenceNeeded,
      mission.expectedOutcome,
    ]),
  ].join(" ");

  assert(
    !/Best Match|verified proof|Proof verified|guaranteed job|guaranteed placement|job ready|hireable|placement chance|auto apply|applied automatically|Score boosted|boosted because target|boosted because mission/i
      .test(combinedText),
    "Active Target output should avoid unsafe wording.",
  );
}

function assertDashboardNextBestLimit() {
  const result = buildCareerPathEngineResult({
    profile: fixture.profile,
    careerIQ: evaluated.careerIQ,
    proof: evaluated.proof,
    roleMatches: evaluated.roles,
    activeTarget: dockerTarget,
    resumeContext: resumeAContext,
    latestJobMatch: {
      title: dockerTarget.title,
      companyName: dockerTarget.companyName,
      result: dockerJd,
    },
    targetRole: fixture.targetRole,
    careerField: fixture.careerField,
    resumeText: fixture.resumeText,
  });

  assert(
    result.nextBestMissions.length <= 3,
    "Dashboard next best missions should remain capped at three.",
  );
}

function getTargetAwareMissions() {
  return generateStructuredMissions({
    profile: fixture.profile,
    careerIQ: evaluated.careerIQ,
    proof: evaluated.proof,
    roleMatches: evaluated.roles,
    latestJobMatch: {
      title: dockerTarget.title,
      companyName: dockerTarget.companyName,
      result: dockerJd,
    },
    activeTarget: dockerTarget,
    resumeContext: resumeAContext,
    targetRole: fixture.targetRole,
    careerField: fixture.careerField,
    sourcePath: "latest_jd",
  }).filter((mission) => /Active Target/i.test(mission.title));
}

function evaluateFixture({
  profile: fixtureProfile,
  resumeText,
  targetRole,
  careerField,
}) {
  const proof = generateProofScore({
    profile: fixtureProfile,
    parsedProfile: parsedProfileFrom(fixtureProfile),
    resumeText,
    careerField,
  });
  const careerIQ = calculateCareerIQ(fixtureProfile, {
    proofScore: proof,
    targetRole,
    careerField,
  });
  const roles = calculateRoleMatches(fixtureProfile);

  return {
    careerIQ,
    proof,
    roles,
  };
}

function profile(overrides = {}) {
  return {
    resumeScore: 0,
    skillsScore: 0,
    projectsScore: 0,
    experienceScore: 0,
    educationScore: 0,
    githubScore: 0,
    linkedinScore: 0,
    atsScore: 0,
    recruiterScore: 0,
    activityScore: 0,
    skills: [],
    projects: [],
    experience: [],
    education: "",
    certifications: [],
    codingProfiles: [],
    hackathons: 0,
    openSourceScore: 0,
    leadershipScore: 0,
    achievementScore: 0,
    researchScore: 0,
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

function parsedProfileFrom(fixtureProfile) {
  return {
    skills: fixtureProfile.skills,
    projects: fixtureProfile.projects,
    experience: fixtureProfile.experience,
    education: fixtureProfile.education ? [fixtureProfile.education] : [],
    certifications: fixtureProfile.certifications.map(
      (certification) => certification.name,
    ),
    links: {
      github: fixtureProfile.github?.url,
      portfolio: fixtureProfile.analysisFlags?.hasProofLink
        ? "https://student.dev"
        : undefined,
    },
    rawSections: {
      skills: fixtureProfile.skills.join(", "),
      projects: fixtureProfile.projects.join("\n"),
      experience: fixtureProfile.experience.join("\n"),
      education: fixtureProfile.education,
      certifications: fixtureProfile.certifications
        .map((certification) => certification.name)
        .join("\n"),
    },
  };
}

function createMemoryStorage() {
  const store = new Map();

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
