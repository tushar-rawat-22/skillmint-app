import type { RoleEvidenceMap } from "@/intelligence/core/roleEvidenceMap";
import { normalizeRoleTitle } from "@/intelligence/core/roleEvidenceMap";
import type {
  AccountPersona,
  CandidateEvidenceReview,
  EvidenceQuestionCategory,
  RecruiterRoleMap,
  ReviewEase,
  ReviewTimeSignal,
  StructuredFeedbackCategory,
} from "./types";

export const QUESTION_CATEGORIES = [
  "APPLIED_EXAMPLE",
  "OWNERSHIP_CONTEXT",
  "OUTCOME_CONTEXT",
  "VALIDATION_CONTEXT",
  "TEAM_REVIEW_CONTEXT",
] as const satisfies readonly EvidenceQuestionCategory[];

export const FEEDBACK_CATEGORIES = [
  "BRIEF_MADE_EVIDENCE_CLEARER",
  "NEEDS_MORE_OWNERSHIP_CONTEXT",
  "NEEDS_MORE_OUTCOME_CONTEXT",
  "NEEDS_MORE_VALIDATION_CONTEXT",
  "ROLE_RELEVANCE_REMAINS_UNCLEAR",
] as const satisfies readonly StructuredFeedbackCategory[];

export const REVIEW_EASE_OPTIONS = ["EASIER", "ABOUT_THE_SAME", "HARDER"] as const;
export const REVIEW_TIME_OPTIONS = ["LESS_TIME", "ABOUT_THE_SAME", "MORE_TIME", "NOT_SURE"] as const;
export const MAX_REVIEW_NOTE_CHARACTERS = 1_000;

export function parsePersonaRow(value: unknown, expectedUserId: string): AccountPersona | null {
  if (!isExactRecord(value, ["user_id", "persona"]) || value.user_id !== expectedUserId) return null;
  return value.persona === "CANDIDATE" || value.persona === "RECRUITER" ? value.persona : null;
}

export function parseRoleEvidenceMap(value: unknown): RoleEvidenceMap | null {
  if (!isExactRecord(value, ["schemaVersion", "roleTitle", "summary", "categories"])) return null;
  if (value.schemaVersion !== 1 || !normalizeRoleTitle(value.roleTitle) || typeof value.summary !== "string" || value.summary.length > 300) return null;
  if (!Array.isArray(value.categories) || value.categories.length !== 4) return null;
  const keys = ["APPLIED_SKILLS", "DELIVERY", "OWNERSHIP", "COLLABORATION"] as const;
  const categories = value.categories.map((category, index) => {
    if (!isExactRecord(category, ["key", "title", "requirement", "signals"]) || category.key !== keys[index]) return null;
    if (typeof category.title !== "string" || category.title.length > 80 || typeof category.requirement !== "string" || category.requirement.length > 320) return null;
    if (!Array.isArray(category.signals) || category.signals.length > 8 || !category.signals.every((signal) => typeof signal === "string" && signal.length <= 80)) return null;
    return { key: category.key, title: category.title, requirement: category.requirement, signals: category.signals };
  });
  if (categories.some((category) => category === null)) return null;
  return { schemaVersion: 1, roleTitle: value.roleTitle as string, summary: value.summary, categories: categories as RoleEvidenceMap["categories"] };
}

export function parseRecruiterRoleMapRow(value: unknown, expectedUserId: string): RecruiterRoleMap | null {
  if (!isExactRecord(value, ["id", "user_id", "role_title", "job_description", "evidence_map", "created_at", "updated_at"])) return null;
  const map = parseRoleEvidenceMap(value.evidence_map);
  if (!isUuid(value.id) || value.user_id !== expectedUserId || !normalizeRoleTitle(value.role_title) || typeof value.job_description !== "string" || value.job_description.length > 12_000 || !map || !isTimestamp(value.created_at) || !isTimestamp(value.updated_at)) return null;
  if (map.roleTitle !== value.role_title) return null;
  return { id: value.id, userId: expectedUserId, roleTitle: value.role_title as string, jobDescription: value.job_description, evidenceMap: map, createdAt: value.created_at as string, updatedAt: value.updated_at as string };
}

export function parseCandidateEvidenceReviewRow(value: unknown): CandidateEvidenceReview | null {
  if (!isExactRecord(value, ["id", "role_title", "question_category", "question_text", "feedback_category", "review_ease", "review_time_signal", "note", "created_at"])) return null;
  if (!isUuid(value.id) || !normalizeRoleTitle(value.role_title) || !includes(QUESTION_CATEGORIES, value.question_category) || typeof value.question_text !== "string" || value.question_text.length < 10 || value.question_text.length > 320 || !includes(FEEDBACK_CATEGORIES, value.feedback_category) || !includes(REVIEW_EASE_OPTIONS, value.review_ease) || !includes(REVIEW_TIME_OPTIONS, value.review_time_signal) || (value.note !== null && (typeof value.note !== "string" || value.note.length > MAX_REVIEW_NOTE_CHARACTERS)) || !isTimestamp(value.created_at)) return null;
  return { id: value.id, roleTitle: value.role_title as string, questionCategory: value.question_category as EvidenceQuestionCategory, questionText: value.question_text, feedbackCategory: value.feedback_category as StructuredFeedbackCategory, reviewEase: value.review_ease as ReviewEase, reviewTimeSignal: value.review_time_signal as ReviewTimeSignal, note: value.note as string | null, createdAt: value.created_at as string };
}

export function buildEvidenceQuestion(category: EvidenceQuestionCategory, evidenceLabel: string | null): string | null {
  if (category === "APPLIED_EXAMPLE") return evidenceLabel ? `Can you show an applied example of ${evidenceLabel} and explain what you owned?` : null;
  if (evidenceLabel !== null) return null;
  const questions: Record<Exclude<EvidenceQuestionCategory, "APPLIED_EXAMPLE">, string> = {
    OWNERSHIP_CONTEXT: "What part of the strongest example did you own, and which decisions were yours?",
    OUTCOME_CONTEXT: "What changed because of this work, and how did you observe or measure the outcome?",
    VALIDATION_CONTEXT: "How was this work tested, reviewed, or checked against a real constraint?",
    TEAM_REVIEW_CONTEXT: "Who reviewed or used this work, and how did their feedback change it?",
  };
  return questions[category];
}

export function normalizeReviewNote(value: unknown): string | null | undefined {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const note = value.trim();
  return note.length > 0 && note.length <= MAX_REVIEW_NOTE_CHARACTERS ? note : undefined;
}

function includes<const T extends readonly string[]>(values: T, value: unknown): value is T[number] { return typeof value === "string" && values.includes(value); }
function isUuid(value: unknown): value is string { return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value); }
function isTimestamp(value: unknown): value is string { return typeof value === "string" && Number.isFinite(Date.parse(value)); }
function isExactRecord(value: unknown, keys: readonly string[]): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value) && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0"); }
