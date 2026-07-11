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
  MISSION_STATUS_VALUES,
  isMissionStatus,
} = require("../src/intelligence/missions/missionContract.ts");
const {
  applyDetectedMissionEvidence,
  isMissionEvidenceDetected,
} = require("../src/intelligence/missions/missionEvidence.ts");
const {
  generateStructuredMissions,
} = require("../src/intelligence/missions/missionGenerator.ts");
const {
  getMissionStatus,
  getMissionStatusMap,
  getSelectedCareerPathId,
  MISSION_STATUS_STORAGE_KEY,
  SELECTED_CAREER_PATH_STORAGE_KEY,
  setMissionStatus,
  setSelectedCareerPathId,
} = require("../src/intelligence/missions/missionStorage.ts");
const {
  buildCareerPathEngineResult,
} = require("../src/intelligence/roadmap/careerPathEngine.ts");

const fixtures = {
  weakResume: {
    profile: profile({
      resumeScore: 12,
      skillsScore: 13,
      educationScore: 8,
      atsScore: 3,
      recruiterScore: 2,
      skills: [
        "React",
        "Node.js",
        "SQL",
        "AWS",
        "Docker",
        "Machine Learning",
      ],
      education: "B.Tech Computer Science",
      analysisFlags: {
        hasMeasurableImpact: false,
        hasSectionClarity: true,
        hasProofLink: false,
        hasGenericProjects: false,
        isPlaceholderText: false,
      },
    }),
    resumeText:
      "Skills: React Node.js SQL AWS Docker Machine Learning\nEducation: B.Tech Computer Science",
    targetRole: "Full Stack Engineer",
    careerField: "tech_software",
  },
  keywordStuffed: {
    profile: profile({
      resumeScore: 14,
      skillsScore: 15,
      educationScore: 8,
      atsScore: 4,
      recruiterScore: 2,
      skills: [
        "React",
        "Next.js",
        "Node.js",
        "Express",
        "MongoDB",
        "PostgreSQL",
        "Docker",
        "Kubernetes",
        "AWS",
        "Python",
        "Machine Learning",
        "TensorFlow",
        "RAG",
        "LLM",
      ],
      education: "B.Tech Computer Science",
      analysisFlags: {
        hasMeasurableImpact: false,
        hasSectionClarity: true,
        hasProofLink: false,
        hasGenericProjects: false,
        isPlaceholderText: false,
      },
    }),
    resumeText:
      "Skills: React Next.js Node.js Express MongoDB PostgreSQL Docker Kubernetes AWS Python Machine Learning TensorFlow RAG LLM",
    targetRole: "Cloud / DevOps Engineer",
    careerField: "tech_software",
  },
  strongFresher: {
    profile: profile({
      resumeScore: 19,
      skillsScore: 14,
      projectsScore: 15,
      experienceScore: 5,
      educationScore: 9,
      githubScore: 8,
      linkedinScore: 5,
      atsScore: 5,
      recruiterScore: 5,
      activityScore: 5,
      skills: [
        "React",
        "Next.js",
        "TypeScript",
        "Node.js",
        "SQL",
        "REST API",
        "Authentication",
        "Testing",
        "Tailwind CSS",
        "Git",
      ],
      projects: [
        "Built and deployed a Next.js SaaS dashboard with authentication, API routes, SQL schema, filters, analytics, and 900 demo users.",
        "Created a full-stack issue tracker with React, Node.js, PostgreSQL, role-based auth, tests, and CI deployment.",
      ],
      experience: [
        "Frontend intern built reusable React components and improved dashboard load time by 32%.",
      ],
      education: "B.Tech Computer Science, CGPA 8.7",
      certifications: [
        {
          name: "AWS Certified Cloud Practitioner",
          issuer: "AWS",
          tier: "A",
        },
      ],
      codingProfiles: [
        {
          platform: "leetcode",
          solved: 260,
          url: "https://leetcode.com/student",
        },
      ],
      github: {
        url: "https://github.com/student",
        repositories: 12,
        stars: 35,
        followers: 14,
        openSourceContributions: 4,
      },
      linkedin: {
        url: "https://linkedin.com/in/student",
        hasHeadline: true,
        hasAbout: true,
        hasFeatured: true,
      },
      achievementScore: 7,
      leadershipScore: 5,
      openSourceScore: 8,
      analysisFlags: {
        hasMeasurableImpact: true,
        hasSectionClarity: true,
        hasProofLink: true,
        hasGenericProjects: false,
        isPlaceholderText: false,
      },
    }),
    resumeText:
      "Experience: Frontend intern built reusable React components and improved dashboard load time by 32%.\nProjects: Built and deployed a Next.js SaaS dashboard with authentication, API routes, SQL schema, filters, analytics, and 900 demo users. Created a full-stack issue tracker with React Node.js PostgreSQL auth tests and CI deployment. GitHub https://github.com/student Live https://student.dev",
    targetRole: "Full Stack Engineer",
    careerField: "tech_software",
  },
  roleMismatched: {
    profile: profile({
      resumeScore: 16,
      skillsScore: 10,
      projectsScore: 10,
      educationScore: 8,
      githubScore: 5,
      atsScore: 4,
      recruiterScore: 3,
      activityScore: 3,
      skills: ["React", "CSS", "HTML", "Figma", "Tailwind CSS", "Git"],
      projects: [
        "Built a responsive React portfolio and landing page system with reusable UI components and deployed live.",
      ],
      education: "B.Tech Computer Science",
      github: {
        url: "https://github.com/frontend",
        repositories: 4,
        stars: 4,
        followers: 2,
        openSourceContributions: 0,
      },
      analysisFlags: {
        hasMeasurableImpact: false,
        hasSectionClarity: true,
        hasProofLink: true,
        hasGenericProjects: false,
        isPlaceholderText: false,
      },
    }),
    resumeText:
      "Projects: Built a responsive React portfolio and landing page system with reusable UI components and deployed live. GitHub https://github.com/frontend\nSkills: React CSS HTML Figma Tailwind CSS Git",
    targetRole: "AI Engineer",
    careerField: "tech_software",
  },
};

const latestJd = analyzeJobDescriptionMatch(
  fixtures.strongFresher.profile,
  "We need a Full Stack Engineer intern who can build React and Next.js interfaces, Node.js APIs, authentication flows, SQL data models, tests, CI deployment, analytics dashboards, and clear product documentation.",
);

const weak = evaluateFixture(fixtures.weakResume);
const keywordStuffed = evaluateFixture(fixtures.keywordStuffed);
const strongFresher = evaluateFixture(fixtures.strongFresher);
const roleMismatched = evaluateFixture(fixtures.roleMismatched);

assertStorageAdapter();
assertLockedPaths();
assertLatestJdPathAvailable();
assertUltimateGoalHonesty();
assertMissionGeneration();
assertDoneStatusDoesNotChangeScores();
assertAppliedContextEvidenceDetection();
assertEvidenceCanBeDetectedAfterReanalysis();
assertNoBannedWording();

console.log("Mission path fixtures passed.");
console.log(
  `weakResume: Career IQ ${weak.careerIQ.score}, missions ${generateStructuredMissions(baseMissionInput(weak, fixtures.weakResume)).length}`,
);
console.log(
  `keywordStuffed: Career IQ ${keywordStuffed.careerIQ.score}, Skill Truth ${keywordStuffed.careerIQ.categoryScores.skillTruth.score}`,
);
console.log(
  `strongFresher: Career IQ ${strongFresher.careerIQ.score}, next best ${buildResult(strongFresher, fixtures.strongFresher, { latestJobMatch: latestJd }).nextBestMissions.length}`,
);
console.log(
  `roleMismatched: Ultimate Goal Path ${buildResult(roleMismatched, fixtures.roleMismatched).tracks.find((track) => track.id === "path:ultimate-goal")?.status}`,
);

function assertStorageAdapter() {
  global.window = {
    localStorage: createMemoryStorage(),
  };

  assert(
    setMissionStatus("fixture:mission", "started"),
    "Mission status should save to local storage.",
  );
  assert(
    getMissionStatus("fixture:mission") === "started",
    "Saved mission status should round-trip.",
  );
  assert(
    getMissionStatusMap()["fixture:mission"] === "started",
    "Mission status map should include saved status.",
  );
  assert(
    setSelectedCareerPathId("path:latest-jd"),
    "Selected path should save to local storage.",
  );
  assert(
    getSelectedCareerPathId() === "path:latest-jd",
    "Selected path should round-trip.",
  );
  assert(
    window.localStorage.getItem(MISSION_STATUS_STORAGE_KEY)?.includes(
      "fixture:mission",
    ),
    "Mission storage key should contain mission progress.",
  );
  assert(
    getSelectedCareerPathId({ currentUserId: "account-a" }) === null,
    "Anonymous selected path should not become Account A state.",
  );

  const anonymousSelectedPathEnvelope = JSON.parse(
    window.localStorage.getItem(SELECTED_CAREER_PATH_STORAGE_KEY),
  );

  assert(
    anonymousSelectedPathEnvelope.owner.kind === "anonymous" &&
      anonymousSelectedPathEnvelope.value === "path:latest-jd",
    "Selected path storage key should contain an anonymous owner envelope.",
  );

  assert(
    setSelectedCareerPathId("path:account-a", {
      currentUserId: "account-a",
    }),
    "Account-owned selected path should save.",
  );
  assert(
    getSelectedCareerPathId({ currentUserId: "account-a" }) ===
      "path:account-a",
    "Account A selected path should round-trip.",
  );
  assert(
    getSelectedCareerPathId({ currentUserId: "account-b" }) === null,
    "Account B should not read Account A selected path.",
  );
  assert(
    getSelectedCareerPathId({ currentUserId: null }) === null,
    "Signed-out state should not expose account-owned selected path.",
  );

  window.localStorage.setItem(
    SELECTED_CAREER_PATH_STORAGE_KEY,
    "path:legacy",
  );

  assert(
    getSelectedCareerPathId({ currentUserId: null }) === "path:legacy",
    "Legacy selected path should remain anonymous.",
  );
  assert(
    getSelectedCareerPathId({ currentUserId: "account-a" }) === null,
    "Legacy selected path should not be claimed by Account A.",
  );
}

function assertLockedPaths() {
  const result = buildResult(weak, fixtures.weakResume, {
    latestJobMatch: null,
    targetRole: null,
  });
  const latestJdTrack = getTrack(result, "path:latest-jd");
  const ultimateGoalTrack = getTrack(result, "path:ultimate-goal");

  assert(
    latestJdTrack.status === "locked",
    "Latest JD Path should lock when no JD match exists.",
  );
  assert(
    ultimateGoalTrack.status === "locked",
    "Ultimate Goal Path should lock when setup target is missing.",
  );
  assert(
    result.nextBestMissions.length <= 3,
    "Dashboard summary should never exceed three next best things.",
  );
}

function assertLatestJdPathAvailable() {
  const result = buildResult(strongFresher, fixtures.strongFresher, {
    latestJobMatch: latestJd,
    selectedPathId: "path:latest-jd",
  });
  const latestJdTrack = getTrack(result, "path:latest-jd");

  assert(
    latestJdTrack.status === "available",
    "Latest JD Path should unlock when a pasted JD match exists.",
  );
  assert(
    /one pasted job description/i.test(latestJdTrack.summary),
    "Latest JD Path should explain that it is for one pasted JD.",
  );
  assertTrackMissionCounts(result);
  assertStatusesAreValid(result);
}

function assertUltimateGoalHonesty() {
  const result = buildResult(roleMismatched, fixtures.roleMismatched);
  const ultimateGoalTrack = getTrack(result, "path:ultimate-goal");

  assert(
    ultimateGoalTrack.status === "available",
    "Ultimate Goal Path should unlock when setup target exists.",
  );
  assert(
    /current resume is closer/i.test(ultimateGoalTrack.currentReality),
    "Ultimate Goal Path should call out current profile-fit mismatch.",
  );
}

function assertMissionGeneration() {
  const input = baseMissionInput(keywordStuffed, fixtures.keywordStuffed);
  const firstRun = generateStructuredMissions(input);
  const secondRun = generateStructuredMissions(input);
  const firstIds = firstRun.map((mission) => mission.id);
  const secondIds = secondRun.map((mission) => mission.id);

  assert(firstRun.length > 0, "Weak resumes should generate missions.");
  assert(
    firstIds.join("|") === secondIds.join("|"),
    "Mission IDs should be deterministic for the same input.",
  );
  assert(
    firstRun.some((mission) => mission.createdFrom === "skill_truth_gap"),
    "Keyword-heavy resumes should produce skill backing missions.",
  );
  assert(
    firstRun.some((mission) => mission.linkedScore === "Proof Confidence"),
    "Mission set should include Proof Confidence work.",
  );
}

function assertDoneStatusDoesNotChangeScores() {
  const baselineScore = weak.careerIQ.score;
  const baselineResult = buildResult(weak, fixtures.weakResume);
  const targetMission = baselineResult.tracks
    .flatMap((track) => track.phases)
    .flatMap((phase) => phase.missions)
    .find((mission) => mission.status === "suggested");

  assert(targetMission, "Weak result should expose a suggested mission.");

  const result = buildResult(weak, fixtures.weakResume, {
    missionStatusMap: {
      [targetMission.id]: "done_by_user",
    },
  });

  assert(
    weak.careerIQ.score === baselineScore,
    "Mission status should not mutate Career IQ.",
  );
  assert(
    result.tracks.some((track) =>
      track.phases.some((phase) =>
        phase.missions.some((mission) =>
          mission.id === targetMission.id &&
            mission.status === "done_by_user"
        )
      )
    ),
    "done_by_user should appear as local mission progress.",
  );
}

function assertAppliedContextEvidenceDetection() {
  const kubernetesMission = missionFixture({
    id: "fixture:skill:kubernetes",
    title: "Back your Kubernetes claim",
    evidenceTarget: "Kubernetes",
  });
  const skillsOnlyContext = {
    profile: profile({
      skills: ["Kubernetes"],
      projects: [
        "Built a React dashboard with filters and deployed the frontend.",
      ],
      analysisFlags: {
        hasMeasurableImpact: false,
        hasSectionClarity: true,
        hasProofLink: false,
        hasGenericProjects: false,
        isPlaceholderText: false,
      },
    }),
    proof: proofFixture([
      {
        skill: "Kubernetes",
        status: "Claimed but unverified",
        supportLevel: "claimed_only",
      },
    ]),
    resumeText:
      "Skills: Kubernetes\nProjects: Built a React dashboard with filters and deployed the frontend.",
  };
  const projectContext = {
    ...skillsOnlyContext,
    profile: {
      ...skillsOnlyContext.profile,
      projects: [
        "Built a Kubernetes deployment workflow for a Node.js API.",
      ],
    },
  };
  const experienceContext = {
    ...skillsOnlyContext,
    profile: {
      ...skillsOnlyContext.profile,
      projects: [],
      experience: [
        "DevOps intern used Kubernetes to configure deployment checks.",
      ],
    },
  };
  const certificationContext = {
    ...skillsOnlyContext,
    profile: {
      ...skillsOnlyContext.profile,
      projects: [],
      certifications: [
        {
          name: "Kubernetes Application Developer",
          issuer: "CNCF",
          tier: "A",
        },
      ],
    },
  };
  const proofFallbackContext = {
    ...skillsOnlyContext,
    profile: {
      ...skillsOnlyContext.profile,
      projects: [],
    },
    resumeText: "Skills: Kubernetes",
    proof: proofFixture([
      {
        skill: "Kubernetes",
        status: "Evidence-backed",
        supportLevel: "moderately_supported",
      },
    ]),
  };

  assert(
    !isMissionEvidenceDetected(kubernetesMission, skillsOnlyContext),
    "Skill listed only in skills section plus unrelated project action words should not be evidence_detected.",
  );
  assert(
    isMissionEvidenceDetected(kubernetesMission, projectContext),
    "Skill inside a project context should become evidence_detected.",
  );
  assert(
    isMissionEvidenceDetected(kubernetesMission, experienceContext),
    "Skill inside an experience context should become evidence_detected.",
  );
  assert(
    isMissionEvidenceDetected(kubernetesMission, certificationContext),
    "Skill inside a certification context should become evidence_detected.",
  );
  assert(
    isMissionEvidenceDetected(kubernetesMission, proofFallbackContext),
    "Moderately supported proof classification should remain an evidence fallback.",
  );
}

function assertEvidenceCanBeDetectedAfterReanalysis() {
  const proofMission = generateStructuredMissions(
    baseMissionInput(weak, fixtures.weakResume),
  ).find((mission) => mission.id === "proof:add-project-link");
  const improvedFixture = {
    ...fixtures.weakResume,
    profile: {
      ...fixtures.weakResume.profile,
      projectsScore: 12,
      githubScore: 5,
      projects: [
        "Built a React Node.js SQL project with authentication, dashboard filters, and GitHub proof link.",
      ],
      github: {
        url: "https://github.com/student/proof",
        repositories: 3,
        stars: 2,
        followers: 1,
        openSourceContributions: 0,
      },
      analysisFlags: {
        ...fixtures.weakResume.profile.analysisFlags,
        hasProofLink: true,
      },
    },
    resumeText:
      "Projects: Built a React Node.js SQL project with authentication dashboard filters and GitHub proof link https://github.com/student/proof",
  };
  const improved = evaluateFixture(improvedFixture);

  assert(proofMission, "Weak resume should include proof link mission.");

  const [detectedMission] = applyDetectedMissionEvidence(
    [
      {
        ...proofMission,
        status: "done_by_user",
      },
    ],
    {
      profile: improved.profile,
      proof: improved.proof,
      resumeText: improvedFixture.resumeText,
    },
  );

  assert(
    detectedMission.status === "evidence_detected",
    "Re-analysis with visible proof should move mission to evidence_detected.",
  );
}

function assertNoBannedWording() {
  const results = [
    buildResult(weak, fixtures.weakResume),
    buildResult(strongFresher, fixtures.strongFresher, {
      latestJobMatch: latestJd,
    }),
    buildResult(roleMismatched, fixtures.roleMismatched),
  ];
  const combinedText = results.map((result) =>
    result.tracks.map((track) => [
      track.title,
      track.summary,
      track.currentReality,
      track.mainGap,
      track.copyText ?? "",
      ...track.phases.flatMap((phase) =>
        phase.missions.flatMap((mission) => [
          mission.title,
          mission.whyThisMatters,
          mission.evidenceNeeded,
          mission.completionCheck,
          mission.expectedOutcome,
          mission.copyText ?? "",
        ])
      ),
    ].join(" ")).join(" ")
  ).join(" ");

  assert(
    !/Best Match|verified proof|Proof verified|guaranteed job|guaranteed placement|job ready|hireable|placement chance|Score boosted|boosted because mission/i
      .test(combinedText),
    "Mission/path output should avoid banned overclaiming language.",
  );
}

function buildResult(
  evaluated,
  fixture,
  overrides = {},
) {
  return buildCareerPathEngineResult({
    profile: evaluated.profile,
    careerIQ: evaluated.careerIQ,
    proof: evaluated.proof,
    roleMatches: evaluated.roles,
    latestJobMatch: overrides.latestJobMatch === undefined
      ? null
      : overrides.latestJobMatch
        ? {
            title: "Latest pasted JD",
            result: overrides.latestJobMatch,
          }
        : null,
    targetRole: overrides.targetRole === undefined
      ? fixture.targetRole
      : overrides.targetRole,
    careerField: fixture.careerField,
    missionStatusMap: overrides.missionStatusMap,
    selectedPathId: overrides.selectedPathId,
    resumeText: fixture.resumeText,
  });
}

function baseMissionInput(evaluated, fixture) {
  return {
    profile: evaluated.profile,
    careerIQ: evaluated.careerIQ,
    proof: evaluated.proof,
    roleMatches: evaluated.roles,
    latestJobMatch: null,
    targetRole: fixture.targetRole,
    careerField: fixture.careerField,
  };
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
    profile: fixtureProfile,
    careerIQ,
    proof,
    roles,
  };
}

function getTrack(result, trackId) {
  const track = result.tracks.find((candidate) => candidate.id === trackId);

  assert(track, `${trackId} should exist.`);

  return track;
}

function assertTrackMissionCounts(result) {
  result.tracks
    .filter((track) => track.status === "available")
    .forEach((track) => {
      const missionCount = track.phases.flatMap((phase) => phase.missions)
        .length;

      assert(
        missionCount <= 9,
        `${track.id} should not contain more than nine missions.`,
      );
    });
}

function assertStatusesAreValid(result) {
  result.tracks.forEach((track) => {
    track.phases.forEach((phase) => {
      phase.missions.forEach((mission) => {
        assert(
          isMissionStatus(mission.status) &&
            MISSION_STATUS_VALUES.includes(mission.status),
          `${mission.id} should have a valid mission status.`,
        );
      });
    });
  });
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
      linkedin: fixtureProfile.linkedin?.url,
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

function missionFixture(overrides = {}) {
  return {
    id: "fixture:mission",
    title: "Fixture mission",
    category: "skill_backing",
    status: "suggested",
    priority: 100,
    impact: "high",
    difficulty: "medium",
    linkedScore: "Skill Truth",
    sourcePath: "profile_fit",
    whyThisMatters: "Fixture mission for evidence detection.",
    evidenceNeeded: "A same-context evidence snippet.",
    steps: ["Add truthful applied evidence."],
    completionCheck: "Re-upload the resume.",
    expectedOutcome: "SkillMint can detect resume-internal evidence.",
    createdFrom: "skill_truth_gap",
    ...overrides,
  };
}

function proofFixture(skillClassifications) {
  return {
    proofConfidenceScore: 0,
    proofCoverageLabel: "Missing",
    proofSummary: "",
    extractedProofLinks: [],
    linkTypeCounts: {},
    evidenceBackedSkills: [],
    weaklySupportedSkills: [],
    unverifiedSkills: [],
    skillClassifications,
    strongestEvidence: "",
    weakestEvidence: "",
    nextProofMove: "",
    scoringReasons: [],
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
