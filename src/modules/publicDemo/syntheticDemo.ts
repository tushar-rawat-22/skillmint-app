import "server-only";

import {
  compareResumeEvidence,
  validateResumeComparisonEvidence,
  type ResumeComparisonEvidenceInput,
} from "@/modules/resume/domain/resumeComparison";

export type SyntheticEvidenceSource = {
  readonly label: string;
  readonly detail: string;
  readonly support: "Strong support" | "Partial support";
};

export const SYNTHETIC_DEMO = {
  candidateLabel: "Synthetic early-career candidate",
  supportedDirection:
    "This synthetic resume supports exploring junior frontend roles where accessible interfaces, typed application code, and component testing matter.",
  strongestSupport:
    "A project entry connects TypeScript and component testing to a shipped, accessible interface with a measured performance improvement.",
  mainEvidenceGap:
    "The resume names collaboration and API work, but does not show enough specific ownership, trade-offs, or inspectable project context.",
  bestNextMove:
    "Rewrite one project bullet to name the problem, personal contribution, measured result, and the evidence a reviewer could inspect.",
  evidenceSources: [
    {
      label: "Synthetic project entry",
      detail:
        "Built a typed interface, added component tests, and improved a stated performance measure.",
      support: "Strong support",
    },
    {
      label: "Synthetic experience bullet",
      detail:
        "Contributed to reusable interface components and documented accessibility checks.",
      support: "Partial support",
    },
    {
      label: "Synthetic skills section",
      detail:
        "TypeScript, React, accessibility, testing, and API integration are claimed.",
      support: "Partial support",
    },
  ] satisfies readonly SyntheticEvidenceSource[],
  jobDescription: {
    label: "Synthetic junior frontend job description",
    relevanceScore: 74,
    matched: [
      "Typed component development",
      "Accessibility awareness",
      "Frontend testing",
    ],
    gaps: [
      "API ownership is not specific enough",
      "No clear team-delivery example",
    ],
  },
  proofBrief: {
    direction: "Junior frontend product work",
    evidence:
      "One project bullet supports typed UI delivery, testing, accessibility, and a measured outcome.",
    limitation:
      "Sources are resume-internal synthetic evidence candidates and have not been externally verified.",
    action:
      "Add one concrete ownership story and make the strongest project evidence easier to inspect.",
  },
  calculations: {
    careerIQ: 68,
    proofConfidence: 63,
    atsReadiness: 71,
    jdRelevance: 74,
  },
} as const;

const syntheticResumeBefore: ResumeComparisonEvidenceInput = {
  id: "synthetic-resume-before",
  fileName: "synthetic-resume-before.txt",
  savedAt: "2026-08-01T09:00:00.000Z",
  skills: ["Accessibility", "React", "TypeScript"],
  projects: [
    "Built a typed interface and documented accessibility checks.",
  ],
  experience: [
    "Contributed reusable interface components in a synthetic project team.",
  ],
  certifications: [],
  links: {
    github: null,
    linkedin: null,
    portfolio: null,
    leetcode: null,
    codeforces: null,
  },
  flags: {
    hasMeasurableImpact: false,
    hasSectionClarity: true,
    hasProofLink: false,
    hasGenericProjects: false,
  },
  placeholderText: false,
};

const syntheticResumeAfter: ResumeComparisonEvidenceInput = {
  ...syntheticResumeBefore,
  id: "synthetic-resume-after",
  fileName: "synthetic-resume-after.txt",
  savedAt: "2026-08-15T09:00:00.000Z",
  skills: [
    "Accessibility",
    "API integration",
    "Component testing",
    "React",
    "TypeScript",
  ],
  projects: [
    "Built a typed interface and documented accessibility checks.",
    "Added component tests, described API ownership, and recorded a synthetic performance result.",
  ],
  links: {
    ...syntheticResumeBefore.links,
    portfolio: "https://synthetic-proof.invalid/project",
  },
  flags: {
    ...syntheticResumeBefore.flags,
    hasMeasurableImpact: true,
    hasProofLink: true,
  },
};

const syntheticProgressComparison = compareResumeEvidence(
  validateResumeComparisonEvidence(syntheticResumeBefore),
  validateResumeComparisonEvidence(syntheticResumeAfter),
);

if (syntheticProgressComparison.status !== "comparable") {
  throw new Error("The fixed synthetic comparison must remain comparable.");
}

export const SYNTHETIC_PROGRESS_COMPARISON = syntheticProgressComparison;
