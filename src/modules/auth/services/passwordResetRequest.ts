import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

export type PasswordResetRequestResult =
  | { ok: true }
  | { ok: false };

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

  return error ? { ok: false } : { ok: true };
}
