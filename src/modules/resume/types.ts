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
