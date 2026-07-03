import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getSupabasePublicConfig } from "./config";

export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  const config = getSupabasePublicConfig();

  if (!config) {
    return null;
  }

  try {
    const cookieStore = await cookies();

    return createServerClient(config.url, config.publishableKey, {
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
            // Server Components cannot always write cookies; proxy handles refresh.
          }
        },
      },
    });
  } catch {
    return null;
  }
}
