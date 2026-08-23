import type { RoleEvidenceMap } from "@/intelligence/core/roleEvidenceMap";

export type AccountPersona = "CANDIDATE" | "RECRUITER";

export type RecruiterRoleMap = {
  readonly id: string;
  readonly userId: string;
  readonly roleTitle: string;
  readonly jobDescription: string;
  readonly evidenceMap: RoleEvidenceMap;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type EvidenceQuestionCategory =
  | "APPLIED_EXAMPLE"
  | "OWNERSHIP_CONTEXT"
  | "OUTCOME_CONTEXT"
  | "VALIDATION_CONTEXT"
  | "TEAM_REVIEW_CONTEXT";

export type StructuredFeedbackCategory =
  | "BRIEF_MADE_EVIDENCE_CLEARER"
  | "NEEDS_MORE_OWNERSHIP_CONTEXT"
  | "NEEDS_MORE_OUTCOME_CONTEXT"
  | "NEEDS_MORE_VALIDATION_CONTEXT"
  | "ROLE_RELEVANCE_REMAINS_UNCLEAR";

export type ReviewEase = "EASIER" | "ABOUT_THE_SAME" | "HARDER";
export type ReviewTimeSignal = "LESS_TIME" | "ABOUT_THE_SAME" | "MORE_TIME" | "NOT_SURE";

export type CandidateEvidenceReview = {
  readonly id: string;
  readonly roleTitle: string;
  readonly questionCategory: EvidenceQuestionCategory;
  readonly questionText: string;
  readonly feedbackCategory: StructuredFeedbackCategory;
  readonly reviewEase: ReviewEase;
  readonly reviewTimeSignal: ReviewTimeSignal;
  readonly note: string | null;
  readonly createdAt: string;
};
