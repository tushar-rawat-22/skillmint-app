import Link from "next/link";

import { getPublicOAuthConfiguration } from "@/config/publicOAuth";
import { getPublicSignupConfiguration } from "@/config/publicSignup";
import AuthForm from "@/modules/auth/components/AuthForm";
import AuthPageShell from "@/modules/auth/components/AuthPageShell";

export default function LoginPage() {
  const { enabled } = getPublicSignupConfiguration();
  const oauth = getPublicOAuthConfiguration();
  const oauthProviders = [
    oauth.providers.google ? { id: "google", label: "Continue with Google" } : null,
    oauth.providers.github ? { id: "github", label: "Continue with GitHub" } : null,
  ].filter((provider): provider is { id: "google" | "github"; label: string } => Boolean(provider));

  return (
    <AuthPageShell
      eyebrow="Login"
      title="Welcome back"
      subtitle="Continue your career loop."
    >
      {oauthProviders.length > 0 ? (
        <div className="mb-6 space-y-3" aria-label="Social sign in">
          {oauthProviders.map((provider) => (
            <form key={provider.id} action="/auth/oauth" method="post">
              <input type="hidden" name="provider" value={provider.id} />
              <button
                type="submit"
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
              >
                {provider.label}
              </button>
            </form>
          ))}
          <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.14em] text-slate-400" aria-hidden="true">
            <span className="h-px flex-1 bg-slate-200" />
            <span>or use email</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>
        </div>
      ) : null}

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
