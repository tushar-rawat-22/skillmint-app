import type { ParsedResumeProfile } from "@/lib/parser/profileBuilder";
import type { CareerRoadmap } from "@/intelligence/core/careerRoadmap";
import type { JobDescriptionMatchResult } from "@/intelligence/core/jobDescriptionMatch";
import type { ResumeImprovementPlan } from "@/intelligence/core/resumeImprovement";
import type { ResumeRewritePlan } from "@/intelligence/core/resumeRewrite";
import type { UserProfile } from "@/intelligence/types/profile";
import type {
  FeedbackSentiment,
  FeedbackType,
} from "@/modules/feedback/types";

export type AccountDataErrorCode =
  | "not_authenticated"
  | "not_configured"
  | "network_failure"
  | "permission_denied"
  | "schema_unavailable"
  | "invalid_response"
  | "cardinality_violation"
  | "count_mismatch"
  | "duplicate_rows"
  | "pagination_stalled"
  | "export_too_large"
  | "serialization_failed"
  | "account_changed"
  | "unsupported_data_contract"
  | "unknown";

export type AccountDataRepositoryError = {
  code: AccountDataErrorCode;
  message: string;
  retryable: boolean;
};

export type RepositoryResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: AccountDataRepositoryError;
    };

export type AccountDataCounts = {
  profile: number;
  resumeAnalyses: number;
  jobMatches: number;
  careerSnapshots: number;
  betaFeedback: number;
};

export type ProfileExportRow = {
  full_name: string | null;
  email: string | null;
  career_goal: string | null;
  target_role: string | null;
  created_at: string;
  updated_at: string;
};

export type ResumeAnalysisExportRow = {
  id: string;
  file_name: string;
  file_type: string;
  extracted_text: string | null;
  parsed_profile: ParsedResumeProfile | null;
  user_profile: UserProfile | null;
  created_at: string;
};

export type JobMatchExportRow = {
  id: string;
  job_title: string | null;
  company_name: string | null;
  job_description: string;
  match_result: JobDescriptionMatchResult | null;
  improvement_plan: ResumeImprovementPlan | null;
  rewrite_plan: ResumeRewritePlan | null;
  roadmap: CareerRoadmap | null;
  created_at: string;
};

export type BetaFeedbackExportRow = {
  id: string;
  feedback_type: FeedbackType;
  sentiment: FeedbackSentiment;
  message: string;
  page_path: string | null;
  created_at: string;
};

export type AccountExportTableName =
  | "profiles"
  | "resume_analyses"
  | "job_matches"
  | "career_snapshots"
  | "beta_feedback";

export type AccountExportSharedIntegrity = {
  preCount: number;
  exportedCount: number;
  postCount: number;
  countStable: true;
  responseShapeValidated: true;
};

export type AccountExportNoPaginationIntegrity =
  AccountExportSharedIntegrity & {
    pagination: {
      strategy: "none";
      queryCompleted: true;
      pagesFetched: 1;
    };
  };

export type AccountExportKeysetPaginationIntegrity =
  AccountExportSharedIntegrity & {
    pagination: {
      strategy: "id_keyset";
      pagesFetched: number;
      everyPageValidated: true;
      terminatedNormally: true;
      duplicatePrimaryKeysObserved: false;
      monotonicCursorObserved: true;
    };
  };

export type AccountExportCountOnlyIntegrity =
  AccountExportSharedIntegrity & {
    pagination: {
      strategy: "count_only";
      pagesFetched: 0;
    };
  };

export type AccountExportTableIntegrity =
  | AccountExportNoPaginationIntegrity
  | AccountExportKeysetPaginationIntegrity
  | AccountExportCountOnlyIntegrity;

export type AccountExportManifestTables = {
  profiles: AccountExportNoPaginationIntegrity;
  resume_analyses: AccountExportKeysetPaginationIntegrity;
  job_matches: AccountExportKeysetPaginationIntegrity;
  career_snapshots: AccountExportCountOnlyIntegrity;
  beta_feedback: AccountExportKeysetPaginationIntegrity;
};

export type AccountDataExport = {
  exportVersion: "skillmint-account-export-v2";
  schemaContractVersion: "skillmint-account-contract-v1";
  source: "account";
  exportedAt: string;
  accountScope: "current_authenticated_account";
  accountIdentity: {
    included: false;
    checkpointChecksPassed: true;
    continuousIdentityStabilityProven: false;
  };
  manifest: {
    tables: AccountExportManifestTables;
    allCollectorsSucceeded: true;
    serializationSucceeded: true;
    consistency: {
      pointInTimeSnapshot: false;
      statement: "Rows were collected through separate authenticated browser requests. The export is not a point-in-time transactional database snapshot, and concurrent changes may remain undetected even when observed counts are stable.";
    };
  };
  data: {
    profiles: ProfileExportRow[];
    resume_analyses: ResumeAnalysisExportRow[];
    job_matches: JobMatchExportRow[];
    career_snapshots: [];
    beta_feedback: BetaFeedbackExportRow[];
  };
};

export type AccountDataExportFile = {
  fileName: string;
  json: string;
};

export type SavedReportsDeletionCounts = {
  resumeAnalysesDeleted: number;
  jobMatchesDeleted: number;
  careerSnapshotsDeleted: number;
};
