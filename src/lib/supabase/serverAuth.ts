import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getSupabasePublicConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

export type ServerAuthorizationResult =
  | { readonly status: "authenticated"; readonly userId: string }
  | { readonly status: "not_authenticated" }
  | { readonly status: "not_configured" }
  | { readonly status: "temporarily_unavailable" };

export async function getServerAuthorization(): Promise<ServerAuthorizationResult> {
  const config = getSupabasePublicConfig();
  if (!config) {
    return { status: "not_configured" };
  }

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      config.url,
      config.publishableKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // Server Components cannot always write refreshed cookies. The
              // root proxy remains responsible for ordinary session refresh.
            }
          },
        },
      },
    );
    const { data, error } = await supabase.auth.getUser();
    const userId = data.user?.id?.trim();

    if (error || !userId) {
      return { status: "not_authenticated" };
    }

    return { status: "authenticated", userId };
  } catch {
    return { status: "temporarily_unavailable" };
  }
}

export async function verifyBearerAuthorization(
  authorization: string | null,
): Promise<ServerAuthorizationResult> {
  const config = getSupabasePublicConfig();
  if (!config) {
    return { status: "not_configured" };
  }

  const accessToken = getExactBearerToken(authorization);
  if (!accessToken) {
    return { status: "not_authenticated" };
  }

  try {
    const supabase = createClient<Database>(
      config.url,
      config.publishableKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      },
    );
    const { data, error } = await supabase.auth.getUser(accessToken);
    const userId = data.user?.id?.trim();

    if (error || !userId) {
      return { status: "not_authenticated" };
    }

    return { status: "authenticated", userId };
  } catch {
    return { status: "temporarily_unavailable" };
  }
}

function getExactBearerToken(value: string | null): string | null {
  if (!value || value.length > 8_192) {
    return null;
  }

  const match = /^Bearer ([^\s]+)$/u.exec(value);
  return match?.[1] ?? null;
}
