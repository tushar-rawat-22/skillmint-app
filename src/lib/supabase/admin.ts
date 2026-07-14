import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabasePublicConfig } from "./config";
import type { Database } from "./database.types";

const SUPABASE_SECRET_KEY_ENV = "SUPABASE_SECRET_KEY";

export class SupabaseAdminConfigurationError extends Error {
  constructor() {
    super("Supabase account deletion is not configured on this server.");
    this.name = "SupabaseAdminConfigurationError";
  }
}

export function createSupabaseAdminClient() {
  const publicConfig = getSupabasePublicConfig();
  const secretKey = (process.env[SUPABASE_SECRET_KEY_ENV] ?? "").trim();

  if (!publicConfig || !secretKey) {
    throw new SupabaseAdminConfigurationError();
  }

  try {
    return createClient<Database>(
      publicConfig.url,
      secretKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  } catch {
    throw new SupabaseAdminConfigurationError();
  }
}
