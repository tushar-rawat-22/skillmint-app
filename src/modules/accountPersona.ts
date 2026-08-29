import "server-only";

import {
  createSupabaseAdminClient,
  SupabaseAdminConfigurationError,
} from "@/lib/supabase/admin";

export const ACCOUNT_PERSONAS = ["CANDIDATE", "RECRUITER"] as const;
export type AccountPersona = (typeof ACCOUNT_PERSONAS)[number];

type PersonaLookup =
  | { readonly status: "resolved"; readonly persona: AccountPersona }
  | { readonly status: "missing" }
  | { readonly status: "unavailable" };

export async function getAccountPersona(userId: string): Promise<PersonaLookup> {
  try {
    const admin = createSupabaseAdminClient();
    return await readPersona(admin, userId);
  } catch (caught) {
    if (caught instanceof SupabaseAdminConfigurationError) {
      return { status: "unavailable" };
    }
    return { status: "unavailable" };
  }
}

export async function ensureAccountPersona(
  userId: string,
  requestedPersona: AccountPersona,
): Promise<PersonaLookup> {
  try {
    const admin = createSupabaseAdminClient();
    const existing = await readPersona(admin, userId);
    if (existing.status !== "missing") {
      return existing;
    }

    const response = await admin
      .from("account_personas")
      .insert({ user_id: userId, persona: requestedPersona })
      .select("user_id,persona");

    if (!response.error && Array.isArray(response.data) && response.data.length === 1) {
      const persona = parsePersona(response.data[0], userId);
      if (persona) {
        return { status: "resolved", persona };
      }
    }

    // Two first-login requests can race. The primary key and immutable V12
    // persona identity decide the winner; re-read rather than overwriting it.
    return await readPersona(admin, userId);
  } catch (caught) {
    if (caught instanceof SupabaseAdminConfigurationError) {
      return { status: "unavailable" };
    }
    return { status: "unavailable" };
  }
}

export function isAccountPersona(value: unknown): value is AccountPersona {
  return value === "CANDIDATE" || value === "RECRUITER";
}

export function accountPersonaDestination(persona: AccountPersona): string {
  return persona === "RECRUITER" ? "/recruiters/workspace" : "/dashboard";
}

async function readPersona(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
): Promise<PersonaLookup> {
  const response = await admin
    .from("account_personas")
    .select("user_id,persona")
    .eq("user_id", userId)
    .limit(2);

  if (response.error || !Array.isArray(response.data) || response.data.length > 1) {
    return { status: "unavailable" };
  }
  if (response.data.length === 0) {
    return { status: "missing" };
  }

  const persona = parsePersona(response.data[0], userId);
  return persona
    ? { status: "resolved", persona }
    : { status: "unavailable" };
}

function parsePersona(value: unknown, userId: string): AccountPersona | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const row = value as Record<string, unknown>;
  if (row.user_id !== userId || !isAccountPersona(row.persona)) {
    return null;
  }
  return row.persona;
}
