export interface PersistentResumeAnalysis {
  id: string;
  userId: string;
  fileName: string;
  fileType: string;
  extractedText: string | null;
  parsedProfile: unknown;
  userProfile: unknown;
  createdAt: string;
}

export interface SaveResumeAnalysisInput {
  fileName: string;
  fileType: string;
  extractedText: string;
  parsedProfile: unknown;
  userProfile: unknown;
}

export type RepositoryResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: string;
    };

export type ResumeAnalysisRepositoryErrorReason =
  | "account_changed"
  | "invalid_input"
  | "invalid_response"
  | "not_authenticated"
  | "not_configured"
  | "not_found"
  | "provider_error";

export type ResumeAnalysisRepositoryResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: string;
      reason: ResumeAnalysisRepositoryErrorReason;
    };

export type ResumeAnalysisRepositoryOptions = {
  expectedUserId?: string | null;
};

export interface WorkspaceResumeSelection {
  userId: string;
  resumeAnalysisId: string;
  selectedAt: string;
}

export interface ResolvedWorkspaceResumeSelection {
  selection: WorkspaceResumeSelection;
  analysis: PersistentResumeAnalysis;
}

export type WorkspaceResumeResolution =
  | {
      status: "none";
      selection: null;
      analysis: null;
    }
  | {
      status: "selected";
      selection: WorkspaceResumeSelection;
      analysis: PersistentResumeAnalysis;
    }
  | {
      status: "source_deleted";
      selection: WorkspaceResumeSelection;
      analysis: null;
    };

export interface ClearWorkspaceResumeSelectionResult {
  cleared: boolean;
  previousSelection: WorkspaceResumeSelection | null;
}

export type WorkspaceResumeRepositoryErrorReason =
  | "account_changed"
  | "invalid_input"
  | "invalid_response"
  | "not_authenticated"
  | "not_configured"
  | "provider_error"
  | "selection_conflict"
  | "source_missing";

export type WorkspaceResumeRepositoryResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: string;
      reason: WorkspaceResumeRepositoryErrorReason;
    };
