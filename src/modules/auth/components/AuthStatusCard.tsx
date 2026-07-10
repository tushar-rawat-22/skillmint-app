"use client";

import Link from "next/link";

import {
  premiumCompactSurface,
  premiumPrimaryCta,
  premiumSecondaryCta,
} from "@/components/ui/premium";
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";

export default function AuthStatusCard() {
  const { user, isConfigured, isLoading, error } = useAuthSession();

  if (!isConfigured) {
    return (
      <article className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">
          Account
        </p>

        <h2 className="mt-4 text-xl font-bold">
          Account sync is unavailable
        </h2>

        <p className="mt-3 text-sm leading-6">
          {error ?? "Supabase environment variables are missing."}
        </p>
      </article>
    );
  }

  if (isLoading) {
    return (
      <article className={premiumCompactSurface}>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          Account
        </p>

        <h2 className="mt-4 text-xl font-bold text-slate-950">
          Checking session...
        </h2>
      </article>
    );
  }

  if (user) {
    return (
      <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-800">
          Account
        </p>

        <h2 className="mt-4 text-xl font-bold">
          Signed in
        </h2>

        <p className="mt-3 break-words text-sm leading-6">
          {user.email ?? "No email available"}
        </p>
      </article>
    );
  }

  return (
    <article className={premiumCompactSurface}>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
        Account
      </p>

      <h2 className="mt-4 text-xl font-bold text-slate-950">
        Sign in to sync your account.
      </h2>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        SkillMint still works in this browser. Sign in when you want
        your profile, resume analyses, job matches, and roadmap to sync.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/login"
          className={premiumPrimaryCta}
        >
          Log in
        </Link>

        <Link
          href="/signup"
          className={premiumSecondaryCta}
        >
          Create account
        </Link>
      </div>
    </article>
  );
}
