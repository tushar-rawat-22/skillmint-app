export interface SkillMintUser {
  id: string;
  email: string | null;
  fullName: string | null;
}

export interface AuthState {
  user: SkillMintUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface SupabaseConfigStatus {
  isConfigured: boolean;
  missingEnvVars: string[];
  message: string;
}
