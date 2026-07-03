import type { SupabaseConfigStatus } from "./types";

const SUPABASE_URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
const SUPABASE_PUBLISHABLE_KEY_ENV =
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";

type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

export function getSupabaseConfigStatus(): SupabaseConfigStatus {
  const missingEnvVars = getMissingSupabaseEnvVars();

  if (!missingEnvVars.length) {
    return {
      isConfigured: true,
      missingEnvVars: [],
      message: "Supabase is configured.",
    };
  }

  return {
    isConfigured: false,
    missingEnvVars,
    message:
      "Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local to enable auth.",
  };
}

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = getEnvValue(SUPABASE_URL_ENV);
  const publishableKey = getEnvValue(SUPABASE_PUBLISHABLE_KEY_ENV);

  if (!url || !publishableKey) {
    return null;
  }

  return {
    url,
    publishableKey,
  };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfigStatus().isConfigured;
}

function getMissingSupabaseEnvVars(): string[] {
  return [
    [SUPABASE_URL_ENV, getEnvValue(SUPABASE_URL_ENV)],
    [
      SUPABASE_PUBLISHABLE_KEY_ENV,
      getEnvValue(SUPABASE_PUBLISHABLE_KEY_ENV),
    ],
  ].flatMap(([envVarName, value]) => value ? [] : [envVarName]);
}

function getEnvValue(envVarName: string): string {
  return (process.env[envVarName] ?? "").trim();
}
