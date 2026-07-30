import Link from "next/link";

import { getPublicSignupConfiguration } from "@/config/publicSignup";
import AuthForm from "@/modules/auth/components/AuthForm";
import AuthPageShell from "@/modules/auth/components/AuthPageShell";

export default function LoginPage() {
  const { enabled } = getPublicSignupConfiguration();

  return (
    <AuthPageShell
      eyebrow="Login"
      title="Welcome back"
      subtitle="Continue your career loop."
    >
      <AuthForm mode="login" />

      <div className="mt-6 flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <p>
          {enabled ? "New to SkillMint?" : "Looking for account access?"}{" "}
          <Link
            href="/signup"
            className="font-semibold text-emerald-700 transition hover:text-emerald-900"
          >
            {enabled ? "Create an account" : "View early access"}
          </Link>
        </p>

        <Link
          href="/forgot-password"
          className="font-semibold text-emerald-700 transition hover:text-emerald-900"
        >
          Forgot password?
        </Link>
      </div>
    </AuthPageShell>
  );
}
