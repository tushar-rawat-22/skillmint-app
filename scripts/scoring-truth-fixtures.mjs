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
const { calculateATS } = require("../src/intelligence/core/ats.ts");
const {
  analyzeJobDescriptionMatch,
} = require("../src/intelligence/core/jobDescriptionMatch.ts");
const {
  calculateRoleMatches,
} = require("../src/intelligence/core/roleMatch.ts");
const {
  calculateRecruiterConfidence,
} = require("../src/intelligence/core/recruiter.ts");
const {
  generateProofScore,
} = require("../src/intelligence/proof/proofScoring.ts");

const fixtures = {
  empty: {
    profile: profile({
      analysisFlags: {
        hasMeasurableImpact: false,
        hasSectionClarity: false,
        hasProofLink: false,
        hasGenericProjects: false,
        isPlaceholderText: true,
      },
    }),
    resumeText: "",
  },
  keywordStuffed: {
    profile: profile({
      resumeScore: 14,
      skillsScore: 15,
      educationScore: 8,
      atsScore: 4,
      recruiterScore: 2,
      activityScore: 1,
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
        "Azure",
        "GCP",
        "Python",
        "Machine Learning",
        "TensorFlow",
        "PyTorch",
        "RAG",
        "LLM",
        "Cybersecurity",
        "Linux",
        "Redis",
        "GraphQL",
        "Java",
        "C++",
        "TypeScript",
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
      "Skills: React Next.js Node.js Express MongoDB PostgreSQL Docker Kubernetes AWS Azure GCP Python Machine Learning TensorFlow PyTorch RAG LLM Cybersecurity Linux Redis GraphQL Java C++ TypeScript\nEducation: B.Tech Computer Science",
    targetRole: "Full Stack Engineer",
    careerField: "tech_software",
  },
  goodProject: {
    profile: profile({
      resumeScore: 17,
      skillsScore: 11,
      projectsScore: 12,
      educationScore: 8,
      githubScore: 6,
      linkedinScore: 3,
      atsScore: 4,
      recruiterScore: 4,
      activityScore: 4,
      skills: ["React", "TypeScript", "Node.js", "SQL", "REST API", "Git"],
      projects: [
        "Built and deployed a React TypeScript dashboard with auth, filters, REST API integration, SQL storage, and reusable components.",
        "Created a Node.js API project with database models, authentication, tests, and GitHub README.",
      ],
      education: "B.Tech Computer Science",
      github: {
        url: "https://github.com/student/project",
        repositories: 6,
        stars: 12,
        followers: 4,
        openSourceContributions: 1,
      },
      linkedin: {
        url: "https://linkedin.com/in/student",
        hasHeadline: true,
        hasAbout: true,
        hasFeatured: true,
      },
      openSourceScore: 4,
      analysisFlags: {
        hasMeasurableImpact: true,
        hasSectionClarity: true,
        hasProofLink: true,
        hasGenericProjects: false,
        isPlaceholderText: false,
      },
    }),
    resumeText:
      "Projects: Built and deployed a React TypeScript dashboard with auth, filters, REST API integration, SQL storage, and reusable components. Improved page load by 28% for 500 users. GitHub: https://github.com/student/project Live: https://student.dev\nSkills: React TypeScript Node.js SQL REST API Git\nEducation: B.Tech Computer Science",
    targetRole: "Frontend Engineer",
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
        "Built a performance monitoring dashboard that reduced manual reporting time by 40%.",
      ],
      experience: [
        "Frontend intern: built reusable React components, fixed accessibility issues, and improved dashboard load time by 32%.",
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
      "Experience: Frontend intern built reusable React components and improved dashboard load time by 32%.\nProjects: Built and deployed a Next.js SaaS dashboard with authentication, API routes, SQL schema, filters, analytics, and 900 demo users. Created a full-stack issue tracker with React Node.js PostgreSQL auth tests and CI deployment. GitHub https://github.com/student Live https://student.dev\nSkills: React Next.js TypeScript Node.js SQL REST API Authentication Testing Tailwind CSS Git\nCertification: AWS Certified Cloud Practitioner",
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
  manyClaimsNoProof: {
    profile: profile({
      resumeScore: 15,
      skillsScore: 15,
      educationScore: 8,
      atsScore: 4,
      recruiterScore: 2,
      activityScore: 1,
      skills: [
        "React",
        "Node.js",
        "Python",
        "SQL",
        "AWS",
        "Docker",
        "Kubernetes",
        "Machine Learning",
        "TensorFlow",
        "PyTorch",
        "RAG",
        "LLM",
        "Cybersecurity",
        "Linux",
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
      "Skills: React Node.js Python SQL AWS Docker Kubernetes Machine Learning TensorFlow PyTorch RAG LLM Cybersecurity Linux\nEducation: B.Tech Computer Science",
    targetRole: "Cloud / DevOps Engineer",
    careerField: "tech_software",
  },
  poorFormattingStrongProof: {
    profile: profile({
      resumeScore: 7,
      skillsScore: 12,
      projectsScore: 15,
      experienceScore: 8,
      educationScore: 6,
      githubScore: 8,
      linkedinScore: 3,
      atsScore: 2,
      recruiterScore: 4,
      activityScore: 5,
      skills: ["Python", "SQL", "Pandas", "Dashboard", "Analytics", "Git"],
      projects: [
        "Automated reporting pipeline using Python SQL Pandas and dashboards; reduced manual reporting by 55%.",
        "Built analytics dashboard for 1200 records with filters, KPI cards, and stakeholder reports.",
      ],
      experience: [
        "Data analyst intern used SQL and Python to clean data and publish weekly dashboards.",
      ],
      education: "B.Sc Data Analytics",
      github: {
        url: "https://github.com/data-analyst",
        repositories: 8,
        stars: 18,
        followers: 6,
        openSourceContributions: 2,
      },
      analysisFlags: {
        hasMeasurableImpact: true,
        hasSectionClarity: false,
        hasProofLink: true,
        hasGenericProjects: false,
        isPlaceholderText: false,
      },
    }),
    resumeText:
      "Python SQL Pandas dashboard analytics Git automated reporting pipeline reduced manual reporting by 55% github.com/data-analyst data analyst intern weekly dashboards",
    targetRole: "Data Engineer",
    careerField: "data_analytics",
  },
};

const jdFixtures = {
  weakForStrongProfile:
    "We need a Cybersecurity intern with SIEM monitoring, vulnerability assessment, network security, incident response, Linux hardening, threat modeling, and audit report experience.",
  keywordMatchingWeakProfile:
    "We are hiring a Cloud DevOps intern. Required skills include AWS, Docker, Kubernetes, Linux, Terraform, CI/CD, cloud deployments, monitoring, automation, and infrastructure troubleshooting.",
};

const results = Object.fromEntries(
  Object.entries(fixtures).map(([name, fixture]) => [
    name,
    evaluateFixture(fixture),
  ]),
);

const strongProfileWeakJd = analyzeJobDescriptionMatch(
  fixtures.strongFresher.profile,
  jdFixtures.weakForStrongProfile,
);
const weakProfileKeywordJd = analyzeJobDescriptionMatch(
  fixtures.manyClaimsNoProof.profile,
  jdFixtures.keywordMatchingWeakProfile,
);

assertScoreContract(results.empty, "empty");
assertScoreContract(results.keywordStuffed, "keywordStuffed");
assertScoreContract(results.goodProject, "goodProject");
assertScoreContract(results.strongFresher, "strongFresher");
assertScoreContract(results.roleMismatched, "roleMismatched");
assertScoreContract(results.manyClaimsNoProof, "manyClaimsNoProof");
assertScoreContract(results.poorFormattingStrongProof, "poorFormattingStrongProof");
assertScoreValue(strongProfileWeakJd.matchScore, "strongProfileWeakJd.matchScore");
assertScoreValue(weakProfileKeywordJd.matchScore, "weakProfileKeywordJd.matchScore");

assert(
  results.empty.careerIQ.score <= 25,
  "Empty resume should cap Career IQ at 25 or lower.",
);
assert(
  [
    "Not enough usable information",
    "Very weak proof",
  ].includes(results.empty.careerIQ.label),
  "Empty resume should have a very low score label.",
);
assert(
  results.empty.careerIQ.capsApplied.some((cap) =>
    cap.id === "no-usable-resume-text"
  ),
  "Empty resume should apply no-usable-resume-text cap.",
);

assert(
  results.keywordStuffed.ats.score >= 20,
  "Keyword-stuffed resume may receive some limited ATS readiness.",
);
assert(
  results.keywordStuffed.careerIQ.categoryScores.skillTruth.score < 45,
  "Keyword-stuffed resume should have low Skill Truth.",
);
assert(
  results.keywordStuffed.proof.proofConfidenceScore < 45,
  "Keyword-stuffed resume should have low Proof Confidence.",
);
assert(
  results.keywordStuffed.careerIQ.score <= 62,
  "Keyword-stuffed resume should be capped or clearly limited.",
);

assert(
  results.goodProject.careerIQ.score >
    results.keywordStuffed.careerIQ.score + 10,
  "Good student project resume should beat keyword-stuffed resume.",
);
assert(
  results.goodProject.proof.nextProofMove.length > 8,
  "Good student project resume should still produce a next proof move.",
);

assert(
  results.strongFresher.careerIQ.score >= 72,
  "Strong fresher resume should produce strong Career IQ.",
);
assert(
  results.strongFresher.careerIQ.categoryScores.projectExperience.score >= 70,
  "Strong fresher should have strong project/experience evidence.",
);
assert(
  results.strongFresher.roles[0].matchScore >= 65,
  "Strong fresher should have a strong profile-fit role score.",
);
assertNoUnsafeGuarantee(results.strongFresher.careerIQ.summary);

assert(
  results.roleMismatched.careerIQ.blockers.some((blocker) =>
    /target role|target direction/i.test(blocker)
  ),
  "Role-mismatched resume should explain target mismatch.",
);

assert(
  results.manyClaimsNoProof.careerIQ.skillTruth.unsupportedSkillRatio > 0.65,
  "Many-claims fixture should detect unsupported skill ratio.",
);
assert(
  results.manyClaimsNoProof.careerIQ.capsApplied.some((cap) =>
    cap.id === "unsupported-claimed-skills-over-65"
  ),
  "Many-claims fixture should apply unsupported-skills cap.",
);

assert(
  results.strongFresher.careerIQ.score >= 70,
  "Strong profile Career IQ should remain reasonably strong.",
);
assert(
  strongProfileWeakJd.matchScore < results.strongFresher.roles[0].matchScore,
  "Weak pasted JD match should remain separate from profile-fit role score.",
);

assert(
  weakProfileKeywordJd.matchScore >= 20,
  "Weak profile can receive some JD keyword credit.",
);
assert(
  results.manyClaimsNoProof.careerIQ.score <= 62,
  "Weak profile Career IQ should not inflate from keyword-matching JD.",
);

assert(
  results.manyClaimsNoProof.careerIQ.capsApplied.some((cap) =>
    cap.id === "good-formatting-weak-proof" ||
    cap.id === "unsupported-claimed-skills-over-65"
  ),
  "Good formatting with weak proof should be capped by proof weakness.",
);

assert(
  results.poorFormattingStrongProof.careerIQ.score >= 65,
  "Poor formatting should not destroy strong proof.",
);
assert(
  !results.poorFormattingStrongProof.careerIQ.capsApplied.some((cap) =>
    cap.id === "good-formatting-weak-proof"
  ),
  "Poor-format strong-proof fixture should not receive the good-format weak-proof cap.",
);

const legacyProfileOnlyResult = calculateCareerIQ(fixtures.goodProject.profile);
assertScoreValue(legacyProfileOnlyResult.score, "legacyProfileOnlyResult.score");
assert(
  legacyProfileOnlyResult.scoringVersion === "career-iq-v2-beta",
  "Career IQ result should carry optional scoringVersion metadata.",
);

console.log("Scoring truth fixtures passed.");
for (const [name, result] of Object.entries(results)) {
  console.log(
    `${name}: Career IQ ${result.careerIQ.score} (${result.careerIQ.label}), Proof ${result.proof.proofConfidenceScore}, ATS ${result.ats.score}, top role ${result.roles[0]?.role ?? "none"} ${result.roles[0]?.matchScore ?? 0}`,
  );
}
console.log(
  `strongProfileWeakJd: Latest JD Match ${strongProfileWeakJd.matchScore}`,
);
console.log(
  `weakProfileKeywordJd: Latest JD Match ${weakProfileKeywordJd.matchScore}`,
);

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
  const ats = calculateATS(fixtureProfile);
  const recruiter = calculateRecruiterConfidence(fixtureProfile);
  const roles = calculateRoleMatches(fixtureProfile);

  return {
    careerIQ,
    proof,
    ats,
    recruiter,
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

function assertScoreContract(result, label) {
  assertScoreValue(result.careerIQ.score, `${label}.careerIQ.score`);
  assertScoreValue(
    result.proof.proofConfidenceScore,
    `${label}.proof.proofConfidenceScore`,
  );
  assertScoreValue(result.ats.score, `${label}.ats.score`);
  assertScoreValue(result.recruiter.score, `${label}.recruiter.score`);
  result.roles.forEach((role, index) => {
    assertScoreValue(role.matchScore, `${label}.roles[${index}].matchScore`);
  });
  Object.entries(result.careerIQ.categoryScores).forEach(([key, breakdown]) => {
    assertScoreValue(breakdown.score, `${label}.categoryScores.${key}`);
  });
}

function assertScoreValue(value, label) {
  assert(Number.isFinite(value), `${label} must be finite.`);
  assert(value >= 0 && value <= 100, `${label} must be 0-100.`);
}

function assertNoUnsafeGuarantee(text) {
  assert(
    !/(guaranteed|placement chance|hireable|job ready)/i.test(text),
    `Unsafe guarantee wording found: ${text}`,
  );
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
