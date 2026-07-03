export interface PersistentProfile {
  id: string;
  fullName: string | null;
  email: string | null;
  careerGoal: string | null;
  targetRole: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export type ProfileInput = {
  fullName: string;
  careerGoal: string;
  targetRole: string;
};

export type RepositoryResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: string;
    };
