export interface AccountOverview {
  isConfigured: boolean;
  isSignedIn: boolean;
  email: string | null;
  profileStatus: "missing" | "saved" | "unavailable";
  latestResumeFileName: string | null;
  resumeAnalysisCount: number;
  latestJobTitle: string | null;
  latestCompanyName: string | null;
  jobMatchCount: number;
  message: string;
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
