import Link from "next/link";

import { premiumPrimaryCta } from "@/components/ui/premium";
import { getPublicSignupConfiguration } from "@/config/publicSignup";
import { getTrustedAppOrigin } from "@/lib/supabase/config";
import AuthForm from "@/modules/auth/components/AuthForm";
import AuthPageShell from "@/modules/auth/components/AuthPageShell";

export default function SignupPage() {
  const { enabled } = getPublicSignupConfiguration();
  const appOrigin = getTrustedAppOrigin();
  const emailRedirectTo = appOrigin
    ? new URL("/auth/callback", appOrigin).toString()
    : null;

  if (!enabled) {
    return (
      <AuthPageShell
        eyebrow="Access"
        title="Account access is currently controlled"
        subtitle="SkillMint is live. New-account admission is deliberately paced while existing users can continue to log in."
      >
        <section
          aria-labelledby="signup-closed-title"
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950"
        >
          <h2
            id="signup-closed-title"
            className="text-2xl font-bold"
          >
            Existing user?
          </h2>

          <p className="mt-3 text-sm leading-6">
            Log in with your existing SkillMint account to continue.
          </p>

          <Link
            href="/login"
            className={`${premiumPrimaryCta} mt-6 inline-flex`}
          >
            Existing user login
          </Link>
        </section>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      eyebrow="Access"
      title="Create your SkillMint account"
      subtitle="Registration is open. Save your career direction, resume proof, job matches, and roadmap."
    >
      <AuthForm
        mode="signup"
        publicSignupEnabled={enabled}
        emailRedirectTo={emailRedirectTo}
      />

      <p className="mt-6 text-sm text-slate-600">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-emerald-700 transition hover:text-emerald-900"
        >
          Existing user login
        </Link>
      </p>
    </AuthPageShell>
  );
}
