import type { SupabaseConfigStatus } from "./types";

type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

const SUPABASE_URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
const SUPABASE_PUBLISHABLE_KEY_ENV =
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";

function getSupabaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
}

function getSupabasePublishableKey(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "").trim();
}

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
    message: "Supabase environment variables are missing.",
  };
}

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();

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
    [SUPABASE_URL_ENV, getSupabaseUrl()],
    [SUPABASE_PUBLISHABLE_KEY_ENV, getSupabasePublishableKey()],
  ].flatMap(([envVarName, value]) => value ? [] : [envVarName]);
}
