import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

const STORAGE_KEY = "skillmint-oauth-deletion-reauth";
const CODE_VERIFIER_KEY = `${STORAGE_KEY}-code-verifier`;

type StorageAdapter = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export function createOAuthDeletionPkceClient({
  supabaseUrl,
  publishableKey,
  initialCodeVerifier = null,
}: {
  supabaseUrl: string;
  publishableKey: string;
  initialCodeVerifier?: string | null;
}) {
  let codeVerifier = initialCodeVerifier;

  const storage: StorageAdapter = {
    getItem(key) {
      return key === CODE_VERIFIER_KEY ? codeVerifier : null;
    },
    setItem(key, value) {
      if (key === CODE_VERIFIER_KEY && typeof value === "string") {
        codeVerifier = value;
      }
    },
    removeItem(key) {
      if (key === CODE_VERIFIER_KEY) codeVerifier = null;
    },
  };

  const client = createClient<Database>(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: "pkce",
      persistSession: false,
      storage,
      storageKey: STORAGE_KEY,
    },
  });

  return {
    client,
    getCodeVerifier: () => codeVerifier,
  };
}
