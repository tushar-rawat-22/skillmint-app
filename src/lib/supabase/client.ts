import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabasePublicConfig } from "./config";

export function createSupabaseBrowserClient(): SupabaseClient | null {
  const config = getSupabasePublicConfig();

  if (!config) {
    return null;
  }

  try {
    return createBrowserClient(config.url, config.publishableKey);
  } catch {
    return null;
  }
}
