import "server-only";

import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

import { getSupabasePublicConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import {
  isValidProofBriefShareToken,
  parseSharedProofBrief,
} from "@/modules/proofBrief/proofBriefContract";
import type { SharedProofBrief } from "@/modules/proofBrief/types";

export type SharedProofBriefResult =
  | { readonly status: "available"; readonly brief: SharedProofBrief }
  | { readonly status: "not_found" }
  | { readonly status: "not_configured" }
  | { readonly status: "temporarily_unavailable" };

export async function getSharedProofBrief(
  shareToken: string,
): Promise<SharedProofBriefResult> {
  if (!isValidProofBriefShareToken(shareToken)) return { status: "not_found" };
  const config = getSupabasePublicConfig();
  if (!config) return { status: "not_configured" };

  try {
    const client = createClient<Database>(config.url, config.publishableKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
    const tokenHash = createHash("sha256").update(shareToken, "utf8").digest("hex");
    const response = await client.rpc("get_shared_proof_brief", {
      requested_token_hash: tokenHash,
    });
    if (response.error) return { status: "temporarily_unavailable" };
    if (response.data === null) return { status: "not_found" };
    const brief = parseSharedProofBrief(response.data);
    return brief
      ? { status: "available", brief }
      : { status: "temporarily_unavailable" };
  } catch {
    return { status: "temporarily_unavailable" };
  }
}
