import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

export type PasswordResetRequestResult =
  | { ok: true }
  | {
      ok: false;
      reason: "email-rate-limited" | "provider-failure";
    };

function readAuthErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return null;
  }

  return typeof error.code === "string" ? error.code : null;
}

export async function requestPasswordReset(
  supabase: SupabaseClient<Database>,
  input: {
    email: string;
    redirectTo: string;
    captchaToken?: string;
  },
): Promise<PasswordResetRequestResult> {
  const { error } = await supabase.auth.resetPasswordForEmail(
    input.email,
    {
      redirectTo: input.redirectTo,
      ...(input.captchaToken
        ? { captchaToken: input.captchaToken }
        : {}),
    },
  );

  if (!error) {
    return { ok: true };
  }

  return {
    ok: false,
    reason:
      readAuthErrorCode(error) === "over_email_send_rate_limit"
        ? "email-rate-limited"
        : "provider-failure",
  };
}
