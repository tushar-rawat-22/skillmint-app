import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabasePublicConfig } from "./config";
import type { Database } from "./database.types";

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
