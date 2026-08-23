import "server-only";

export type SyntheticSupportGroup = {
  readonly status: "Strong support" | "Weak support" | "Unclear / missing support";
  readonly summary: string;
  readonly evidence: readonly string[];
};

export const SYNTHETIC_RECRUITER_DEMO = {
  role: {
    title: "Synthetic junior frontend contributor role",
    purpose:
      "Build and maintain accessible interface components in a small product team.",
    evidenceRequirements: [
      "Applied typed component development",
      "Accessibility checks in delivered work",
      "Testing used to protect a real interface change",
      "Clear ownership of an API integration",
      "Specific collaboration and delivery context",
    ],
  },
  candidate: {
    label: "Synthetic candidate A",
    direction: "Junior frontend product work",
    scopeNotice:
      "This read-only brief contains invented derived evidence only. It contains no raw resume, contact details, account identifier, employer, institution, or real repository.",
    supportGroups: [
      {
        status: "Strong support",
        summary: "Typed interface delivery, accessibility, and component testing",
        evidence: [
          "A synthetic project entry connects typed components to an accessible interface.",
          "The same entry names component testing and a measured synthetic performance result.",
        ],
      },
      {
        status: "Weak support",
        summary: "API integration ownership",
        evidence: [
          "API integration appears in the synthetic skills section, but the project entry does not explain the candidate's contribution or trade-offs.",
        ],
      },
      {
        status: "Unclear / missing support",
        summary: "Team delivery and review context",
        evidence: [
          "The synthetic brief does not show who reviewed the work, how feedback changed it, or what the candidate owned within the team.",
        ],
      },
    ] satisfies readonly SyntheticSupportGroup[],
  },
  questions: [
    "Can you show an applied example of the API integration and explain what you owned?",
    "What accessibility issue did you find, and how did you test the change?",
    "What feedback changed the final implementation?",
  ],
  feedback: {
    selectedCategory: "Ownership needs more context",
    note:
      "A real recruiter could optionally add a private message after choosing a structured category. This synthetic demo stores and sends nothing.",
  },
} as const;
