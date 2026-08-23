import type { ProofScoreResult } from "@/intelligence/proof";
import type { UserProfile } from "@/intelligence/types/profile";
import type { ParsedResumeProfile } from "@/lib/parser/profileBuilder";
import { getCanonicalSkillLabel } from "@/lib/parser/skillExtractor";
import { RESUME_UPLOAD_LIMITS } from "@/lib/resume/resumeUploadContract";
import type {
  CandidateProofBrief,
  ProofBriefEvidenceSignal,
  ProofBriefPayload,
  SharedProofBrief,
} from "@/modules/proofBrief/types";

export const PROOF_BRIEF_PUBLIC_COLUMNS =
  "id,user_id,source_resume_analysis_id,brief_payload,visibility,share_created_at,revoked_at,created_at,updated_at";

const MAX_SIGNALS = 8;
const MAX_SOURCE_LIST_ITEMS = 500;
const MAX_SOURCE_LIST_ITEM_CHARACTERS = 2_000;
const SAFE_DIRECTION = /^[\p{L}\p{N} .+#/&()_-]{1,80}$/u;
const SHARE_TOKEN = /^[A-Za-z0-9_-]{43}$/u;

export type ProofBriefSourceAnalysis = {
  readonly id: string;
  readonly userId: string;
  readonly extractedText: string;
  readonly parsedProfile: ParsedResumeProfile;
  readonly userProfile: UserProfile;
};

export function deriveProofBriefPayload(input: {
  readonly profile: UserProfile;
  readonly proof: ProofScoreResult;
  readonly direction: string | null;
}): ProofBriefPayload {
  const direction = normalizeDirection(input.direction);
  const signals = deriveEvidenceSignals(input.proof);
  const strongCount = signals.filter((signal) => signal.state === "STRONG").length;
  const weakCount = signals.filter((signal) => signal.state === "WEAK").length;
  const unclearCount = signals.filter((signal) => signal.state === "UNCLEAR").length;

  return {
    schemaVersion: 1,
    direction,
    currentSupport: direction === "Direction still being clarified"
      ? "The current resume contains evidence candidates, but it does not yet support a clear profile-fit direction."
      : `The current resume supports exploring ${direction} as a profile-fit direction.`,
    strongestSupport: strongCount > 0
      ? `${strongCount} selected skill signal${strongCount === 1 ? " is" : "s are"} connected to project, experience, certification, or evidence-link context.`
      : getSafeStrongestSummary(input.profile),
    mainEvidenceGap: unclearCount > 0
      ? `${unclearCount} selected skill claim${unclearCount === 1 ? " needs" : "s need"} a clearer applied example or evidence connection.`
      : weakCount > 0
        ? `${weakCount} selected skill signal${weakCount === 1 ? " has" : "s have"} only partial resume support.`
        : "The brief still needs deeper ownership, outcome, and review context.",
    bestNextMove: getSafeNextMove(input.profile, unclearCount),
    evidenceSignals: signals,
    sourceSummary: {
      projectEntries: clampCount(input.profile.projects.length),
      experienceEntries: clampCount(input.profile.experience.length),
      evidenceCandidateLinks: clampCount(input.proof.extractedProofLinks.length),
    },
  };
}

export function parseProofBriefPayload(value: unknown): ProofBriefPayload | null {
  if (!isExactRecord(value, [
    "schemaVersion",
    "direction",
    "currentSupport",
    "strongestSupport",
    "mainEvidenceGap",
    "bestNextMove",
    "evidenceSignals",
    "sourceSummary",
  ])) return null;
  if (value.schemaVersion !== 1) return null;
  if (!isBoundedText(value.direction, 160)) return null;
  const currentSupport = value.currentSupport;
  const strongestSupport = value.strongestSupport;
  const mainEvidenceGap = value.mainEvidenceGap;
  const bestNextMove = value.bestNextMove;
  if (
    !isBoundedText(currentSupport, 500) ||
    !isBoundedText(strongestSupport, 500) ||
    !isBoundedText(mainEvidenceGap, 500) ||
    !isBoundedText(bestNextMove, 500)
  ) return null;
  if (!Array.isArray(value.evidenceSignals) || value.evidenceSignals.length > MAX_SIGNALS) {
    return null;
  }
  const evidenceSignals: ProofBriefEvidenceSignal[] = [];
  for (const signal of value.evidenceSignals) {
    if (!isExactRecord(signal, ["state", "label", "detail"])) return null;
    if (!["STRONG", "WEAK", "UNCLEAR"].includes(String(signal.state))) return null;
    if (!isSafeEvidenceLabel(signal.label) || !isBoundedText(signal.detail, 320)) return null;
    evidenceSignals.push({
      state: signal.state as ProofBriefEvidenceSignal["state"],
      label: signal.label,
      detail: signal.detail,
    });
  }
  if (!isExactRecord(value.sourceSummary, [
    "projectEntries",
    "experienceEntries",
    "evidenceCandidateLinks",
  ])) return null;
  const sourceSummary = value.sourceSummary;
  if (![sourceSummary.projectEntries, sourceSummary.experienceEntries, sourceSummary.evidenceCandidateLinks]
    .every((count) => Number.isInteger(count) && Number(count) >= 0 && Number(count) <= 100)) {
    return null;
  }

  return {
    schemaVersion: 1,
    direction: value.direction,
    currentSupport,
    strongestSupport,
    mainEvidenceGap,
    bestNextMove,
    evidenceSignals,
    sourceSummary: {
      projectEntries: Number(sourceSummary.projectEntries),
      experienceEntries: Number(sourceSummary.experienceEntries),
      evidenceCandidateLinks: Number(sourceSummary.evidenceCandidateLinks),
    },
  };
}

export function parseSharedProofBrief(value: unknown): SharedProofBrief | null {
  if (!isExactRecord(value, ["payload", "shared_at"])) return null;
  const payload = parseProofBriefPayload(value.payload);
  if (!payload || !isIsoTimestamp(value.shared_at)) return null;
  return { payload, sharedAt: value.shared_at };
}

export function parseCandidateProofBriefRow(
  value: unknown,
  expected: {
    readonly userId: string;
    readonly sourceResumeAnalysisId?: string;
    readonly briefId?: string;
  },
): CandidateProofBrief | null {
  if (!isExactRecord(value, [
    "id",
    "user_id",
    "source_resume_analysis_id",
    "brief_payload",
    "visibility",
    "share_created_at",
    "revoked_at",
    "created_at",
    "updated_at",
  ])) return null;
  if (
    value.user_id !== expected.userId ||
    !isUuid(value.id) ||
    !isUuid(value.source_resume_analysis_id) ||
    (expected.sourceResumeAnalysisId !== undefined &&
      value.source_resume_analysis_id !== expected.sourceResumeAnalysisId) ||
    (expected.briefId !== undefined && value.id !== expected.briefId)
  ) return null;
  const payload = parseProofBriefPayload(value.brief_payload);
  if (!payload || !["PRIVATE", "LINK_ONLY"].includes(String(value.visibility))) return null;
  if (!isIsoTimestamp(value.created_at) || !isIsoTimestamp(value.updated_at)) return null;
  if (value.share_created_at !== null && !isIsoTimestamp(value.share_created_at)) return null;
  if (value.revoked_at !== null && !isIsoTimestamp(value.revoked_at)) return null;
  if (
    (value.visibility === "PRIVATE" && value.share_created_at !== null) ||
    (value.visibility === "LINK_ONLY" &&
      (!isIsoTimestamp(value.share_created_at) || value.revoked_at !== null))
  ) return null;
  return {
    id: value.id,
    userId: expected.userId,
    sourceResumeAnalysisId: value.source_resume_analysis_id,
    payload,
    visibility: value.visibility as CandidateProofBrief["visibility"],
    sharedAt: value.share_created_at,
    revokedAt: value.revoked_at,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  };
}

export function parseProofBriefSourceAnalysis(
  value: unknown,
  expected: {
    readonly userId: string;
    readonly sourceResumeAnalysisId: string;
  },
): ProofBriefSourceAnalysis | null {
  if (!isExactRecord(value, [
    "id",
    "user_id",
    "file_name",
    "file_type",
    "extracted_text",
    "parsed_profile",
    "user_profile",
    "created_at",
  ])) return null;
  if (
    value.id !== expected.sourceResumeAnalysisId ||
    value.user_id !== expected.userId ||
    typeof value.file_name !== "string" ||
    value.file_name.length > RESUME_UPLOAD_LIMITS.maxFilenameCharacters ||
    typeof value.file_type !== "string" ||
    value.file_type.length > 200 ||
    (value.extracted_text !== null && typeof value.extracted_text !== "string") ||
    (typeof value.extracted_text === "string" &&
      value.extracted_text.length > RESUME_UPLOAD_LIMITS.maxExtractedTextCharacters) ||
    !isIsoTimestamp(value.created_at) ||
    !isParsedResumeProfile(value.parsed_profile) ||
    !isUserProfile(value.user_profile)
  ) return null;

  return {
    id: value.id,
    userId: value.user_id,
    extractedText: value.extracted_text ?? "",
    parsedProfile: value.parsed_profile,
    userProfile: value.user_profile,
  };
}

export function isValidProofBriefShareToken(value: string): boolean {
  return SHARE_TOKEN.test(value);
}

function deriveEvidenceSignals(proof: ProofScoreResult): ProofBriefEvidenceSignal[] {
  const output: ProofBriefEvidenceSignal[] = [];
  for (const classification of proof.skillClassifications) {
    const label = sanitizeEvidenceLabel(classification.skill);
    if (!label) continue;
    const state = classification.status === "Evidence-backed"
      ? "STRONG"
      : classification.status === "Weakly supported"
        ? "WEAK"
        : "UNCLEAR";
    output.push({
      state,
      label,
      detail: state === "STRONG"
        ? "Connected to applied resume context; the underlying source has not been independently verified."
        : state === "WEAK"
          ? "Appears in relevant resume context, but ownership or evidence depth is still limited."
          : "Listed in the resume without a clear applied project, experience, certification, or evidence-link connection.",
    });
    if (output.length === MAX_SIGNALS) break;
  }
  return output;
}

function sanitizeEvidenceLabel(value: string): string | null {
  return getCanonicalSkillLabel(value);
}

function normalizeDirection(value: string | null): string {
  const normalized = value?.trim().replace(/\s+/gu, " ") ?? "";
  return SAFE_DIRECTION.test(normalized) && normalized.length <= 120
    ? normalized
    : "Direction still being clarified";
}

function getSafeStrongestSummary(profile: UserProfile): string {
  if (profile.projects.length && profile.analysisFlags?.hasMeasurableImpact) {
    return "Project entries include measurable outcome or impact language.";
  }
  if (profile.projects.length) {
    return "Project entries provide a starting point for evidence review.";
  }
  if (profile.experience.length) {
    return "Experience entries provide a starting point for evidence review.";
  }
  return "No standout applied evidence signal was detected yet.";
}

function getSafeNextMove(profile: UserProfile, unclearCount: number): string {
  if (!profile.projects.length) {
    return "Add one role-aligned project example with a clear contribution and outcome.";
  }
  if (unclearCount > 0) {
    return "Connect one currently unsupported skill claim to a concrete project or experience example.";
  }
  if (!profile.analysisFlags?.hasMeasurableImpact) {
    return "Add a concrete outcome, user impact, or performance result to the strongest project example.";
  }
  return "Add clearer ownership and review context to the strongest applied example.";
}

function isSafeEvidenceLabel(value: unknown): value is string {
  return typeof value === "string" && sanitizeEvidenceLabel(value) === value;
}

function isParsedResumeProfile(value: unknown): value is ParsedResumeProfile {
  if (!isRecord(value)) return false;
  return isBoundedStringArray(value.skills) &&
    isBoundedStringArray(value.projects) &&
    isBoundedStringArray(value.education) &&
    isBoundedStringArray(value.experience) &&
    isBoundedStringArray(value.certifications) &&
    isBoundedStringRecord(value.links, 7, 2_048) &&
    isBoundedStringRecord(
      value.rawSections,
      5,
      RESUME_UPLOAD_LIMITS.maxExtractedTextCharacters,
    );
}

function isUserProfile(value: unknown): value is UserProfile {
  if (!isRecord(value)) return false;
  return [
    value.resumeScore,
    value.skillsScore,
    value.projectsScore,
    value.experienceScore,
    value.educationScore,
    value.githubScore,
    value.linkedinScore,
    value.atsScore,
    value.recruiterScore,
    value.activityScore,
  ].every(isFiniteNumber) &&
    isBoundedStringArray(value.skills) &&
    isBoundedStringArray(value.projects) &&
    isBoundedStringArray(value.experience) &&
    typeof value.education === "string" &&
    value.education.length <= MAX_SOURCE_LIST_ITEM_CHARACTERS &&
    Array.isArray(value.certifications) &&
    value.certifications.length <= MAX_SOURCE_LIST_ITEMS &&
    Array.isArray(value.codingProfiles) &&
    value.codingProfiles.length <= MAX_SOURCE_LIST_ITEMS;
}

function isBoundedStringArray(value: unknown): value is string[] {
  return Array.isArray(value) &&
    value.length <= MAX_SOURCE_LIST_ITEMS &&
    value.every((item) =>
      typeof item === "string" && item.length <= MAX_SOURCE_LIST_ITEM_CHARACTERS
    );
}

function isBoundedStringRecord(
  value: unknown,
  maxKeys: number,
  maxValueCharacters: number,
): value is Record<string, string | undefined> {
  if (!isRecord(value) || Object.keys(value).length > maxKeys) return false;
  return Object.values(value).every((item) =>
    item === undefined ||
    (typeof item === "string" && item.length <= maxValueCharacters)
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isBoundedText(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

function clampCount(value: number): number {
  return Math.min(Math.max(Math.floor(value), 0), 100);
}

function isExactRecord(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).sort().join("\0") === [...keys].sort().join("\0");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
