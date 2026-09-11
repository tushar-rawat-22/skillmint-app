import "server-only";

import { redirect } from "next/navigation";

import { getServerAuthorization } from "@/lib/supabase/serverAuth";
import {
  accountPersonaDestination,
  getAccountPersona,
  type AccountPersona,
} from "@/modules/accountPersona";

/**
 * Keeps private workspace shells aligned with the immutable server-owned persona.
 * API/RLS checks remain authoritative for data access; this prevents a signed-in
 * user from rendering the other persona's workspace by direct navigation.
 */
export async function requireAccountPersona(expectedPersona: AccountPersona) {
  const authorization = await getServerAuthorization();
  if (authorization.status !== "authenticated") {
    redirect("/login");
  }

  const resolution = await getAccountPersona(authorization.userId);
  if (resolution.status === "missing") {
    redirect("/auth/persona");
  }
  if (resolution.status === "unavailable") {
    redirect("/auth/persona?error=unavailable");
  }
  if (resolution.persona !== expectedPersona) {
    redirect(accountPersonaDestination(resolution.persona));
  }
}
