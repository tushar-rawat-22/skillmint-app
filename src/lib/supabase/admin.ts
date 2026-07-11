import { createClient } from "@supabase/supabase-js";

import { getSupabaseAdminConfig } from "./config";
import type { Database } from "./database.types";

export function createSupabaseAdminClient() {
  if (typeof window !== "undefined") {
    return null;
  }

  const config = getSupabaseAdminConfig();

  if (!config) {
    return null;
  }

  return createClient<Database>(
    config.url,
    config.secretKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
