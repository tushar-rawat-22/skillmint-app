export type RepositoryResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: string;
    };

export type AccountDataCounts = {
  profile: number;
  resumeAnalyses: number;
  jobMatches: number;
  careerSnapshots: number;
  betaFeedback: number;
};

export type AccountExportRecord = Record<string, unknown>;

export type AccountDataExport = {
  exportVersion: "skillmint-account-export-v1";
  source: "account";
  exportedAt: string;
  data: {
    profile: AccountExportRecord[];
    resumeAnalyses: AccountExportRecord[];
    jobMatches: AccountExportRecord[];
    careerSnapshots: AccountExportRecord[];
    betaFeedback: AccountExportRecord[];
  };
};

export type SavedReportsDeletionCounts = {
  resumeAnalysesDeleted: number;
  jobMatchesDeleted: number;
  careerSnapshotsDeleted: number;
};
