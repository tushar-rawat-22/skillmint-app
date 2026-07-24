import { createBrowserClient } from "@supabase/ssr";
import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import { getSupabasePublicConfig } from "./config";
import type { Database } from "./database.types";

let accountReauthenticationClientSequence = 0;

export function createSupabaseBrowserClient(): SupabaseClient<Database> | null {
  const config = getSupabasePublicConfig();

  if (!config) {
    return null;
  }

  try {
    return createBrowserClient<Database>(
      config.url,
      config.publishableKey,
    );
  } catch {
    return null;
  }
}

export function createSupabaseAccountReauthenticationClient():
  SupabaseClient<Database> | null {
  const config = getSupabasePublicConfig();

  if (!config) {
    return null;
  }

  try {
    accountReauthenticationClientSequence += 1;

    return createClient<Database>(
      config.url,
      config.publishableKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
          storageKey:
            `skillmint-account-reauthentication-${accountReauthenticationClientSequence}`,
        },
      },
    );
  } catch {
    return null;
  }
}
