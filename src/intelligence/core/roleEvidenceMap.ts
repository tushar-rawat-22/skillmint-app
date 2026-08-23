import { extractSkills } from "@/lib/parser/skillExtractor";

export const ROLE_EVIDENCE_LIMITS = {
  minJobDescriptionCharacters: 80,
  maxJobDescriptionCharacters: 12_000,
  maxRoleTitleCharacters: 120,
} as const;

export type RoleEvidenceCategory = {
  readonly key: "APPLIED_SKILLS" | "DELIVERY" | "OWNERSHIP" | "COLLABORATION";
  readonly title: string;
  readonly requirement: string;
  readonly signals: readonly string[];
};

export type RoleEvidenceMap = {
  readonly schemaVersion: 1;
  readonly roleTitle: string;
  readonly summary: string;
  readonly categories: readonly RoleEvidenceCategory[];
};

const SAFE_ROLE_TITLE = /^[\p{L}\p{N} .+#/&()_'’-]{2,120}$/u;
const DELIVERY_SIGNALS = [
  ["Testing", /\b(?:test|testing|quality assurance|qa)\b/iu],
  ["Accessibility", /\b(?:accessibility|accessible|a11y|wcag)\b/iu],
  ["Deployment", /\b(?:deploy|deployment|production|release)\b/iu],
  ["Security", /\b(?:security|secure|authentication|authorization)\b/iu],
  ["Performance", /\b(?:performance|latency|optimization|optimisation)\b/iu],
] as const;

export function deriveRoleEvidenceMap(input: {
  readonly roleTitle: unknown;
  readonly jobDescription: unknown;
}): { readonly ok: true; readonly map: RoleEvidenceMap; readonly jobDescription: string } |
  { readonly ok: false; readonly code: "invalid_role_title" | "invalid_job_description" } {
  const roleTitle = normalizeRoleTitle(input.roleTitle);
  if (!roleTitle) return { ok: false, code: "invalid_role_title" };
  if (typeof input.jobDescription !== "string") {
    return { ok: false, code: "invalid_job_description" };
  }
  const jobDescription = input.jobDescription.trim();
  if (
    jobDescription.length < ROLE_EVIDENCE_LIMITS.minJobDescriptionCharacters ||
    jobDescription.length > ROLE_EVIDENCE_LIMITS.maxJobDescriptionCharacters
  ) return { ok: false, code: "invalid_job_description" };

  const skills = extractSkills(jobDescription).slice(0, 8);
  const delivery = DELIVERY_SIGNALS
    .filter(([, pattern]) => pattern.test(jobDescription))
    .map(([label]) => label);
  const categories: RoleEvidenceCategory[] = [
    {
      key: "APPLIED_SKILLS",
      title: "Applied role skills",
      requirement: skills.length
        ? "Look for a concrete example showing how the named role skills were used, not only listed."
        : "The description does not name a recognized technical skill clearly enough; ask for the applied capabilities that matter most.",
      signals: skills,
    },
    {
      key: "DELIVERY",
      title: "Delivery and validation",
      requirement: "Look for how work was tested, reviewed, released, or checked against a real constraint.",
      signals: delivery,
    },
    {
      key: "OWNERSHIP",
      title: "Ownership and outcomes",
      requirement: "Look for the candidate's specific contribution, decisions, constraints, and observable outcome.",
      signals: [],
    },
    {
      key: "COLLABORATION",
      title: "Collaboration context",
      requirement: "Look for who was involved, how feedback changed the work, and how trade-offs were communicated.",
      signals: [],
    },
  ];

  return {
    ok: true,
    jobDescription,
    map: {
      schemaVersion: 1,
      roleTitle,
      summary: `Evidence requirements for ${roleTitle}, derived deterministically from the supplied role description.`,
      categories,
    },
  };
}

export function normalizeRoleTitle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/gu, " ");
  return SAFE_ROLE_TITLE.test(normalized) ? normalized : null;
}
