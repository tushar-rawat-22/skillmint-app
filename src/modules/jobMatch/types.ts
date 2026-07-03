export interface PersistentJobMatch {
  id: string;
  userId: string;
  jobTitle: string | null;
  companyName: string | null;
  jobDescription: string;
  matchResult: unknown;
  improvementPlan: unknown;
  rewritePlan: unknown;
  roadmap: unknown;
  createdAt: string;
}

export interface SaveJobMatchInput {
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  matchResult: unknown;
  improvementPlan: unknown;
  rewritePlan: unknown;
  roadmap?: unknown;
}

export interface UpdateJobMatchRoadmapInput {
  id: string;
  roadmap: unknown;
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
