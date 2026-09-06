import "server-only";

import { randomUUID } from "node:crypto";

import {
  createSupabaseAdminClient,
  SupabaseAdminConfigurationError,
} from "@/lib/supabase/admin";

export const ACCOUNT_PERSONAS = ["CANDIDATE", "RECRUITER"] as const;
export type AccountPersona = (typeof ACCOUNT_PERSONAS)[number];

type PersonaFailureClass =
  | "admin_configuration"
  | "query_error"
  | "invalid_response"
  | "unexpected_error";

type PersonaLookup =
  | { readonly status: "resolved"; readonly persona: AccountPersona }
  | { readonly status: "missing" }
  | { readonly status: "unavailable"; readonly failureClass: PersonaFailureClass };

export async function getAccountPersona(userId: string): Promise<PersonaLookup> {
  try {
    const admin = createSupabaseAdminClient();
    return await readPersona(admin, userId, "lookup");
  } catch (caught) {
    const failureClass: PersonaFailureClass =
      caught instanceof SupabaseAdminConfigurationError
        ? "admin_configuration"
        : "unexpected_error";
    logPersonaDependencyFailure("lookup", failureClass);
    return { status: "unavailable", failureClass };
  }
}

export async function ensureAccountPersona(
  userId: string,
  requestedPersona: AccountPersona,
): Promise<PersonaLookup> {
  try {
    const admin = createSupabaseAdminClient();
    const existing = await readPersona(admin, userId, "ensure_read");
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
    return await readPersona(admin, userId, "ensure_reread");
  } catch (caught) {
    const failureClass: PersonaFailureClass =
      caught instanceof SupabaseAdminConfigurationError
        ? "admin_configuration"
        : "unexpected_error";
    logPersonaDependencyFailure("ensure", failureClass);
    return { status: "unavailable", failureClass };
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
  operation: "lookup" | "ensure_read" | "ensure_reread",
): Promise<PersonaLookup> {
  const response = await admin
    .from("account_personas")
    .select("user_id,persona")
    .eq("user_id", userId)
    .limit(2);

  if (response.error) {
    logPersonaDependencyFailure(operation, "query_error");
    return { status: "unavailable", failureClass: "query_error" };
  }
  if (!Array.isArray(response.data) || response.data.length > 1) {
    logPersonaDependencyFailure(operation, "invalid_response");
    return { status: "unavailable", failureClass: "invalid_response" };
  }
  if (response.data.length === 0) {
    return { status: "missing" };
  }

  const persona = parsePersona(response.data[0], userId);
  if (!persona) {
    logPersonaDependencyFailure(operation, "invalid_response");
    return { status: "unavailable", failureClass: "invalid_response" };
  }
  return { status: "resolved", persona };
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

function logPersonaDependencyFailure(
  operation: "lookup" | "ensure" | "ensure_read" | "ensure_reread",
  failureClass: PersonaFailureClass,
) {
  console.error(JSON.stringify({
    event: "account_persona_dependency_failure",
    correlationId: randomUUID(),
    operation,
    failureClass,
  }));
}
