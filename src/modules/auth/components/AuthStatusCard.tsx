"use client";

import Link from "next/link";

import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";

export default function AuthStatusCard() {
  const { user, isConfigured, isLoading, error } = useAuthSession();

  if (!isConfigured) {
    return (
      <article className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-yellow-200/80">
          Account
        </p>

        <h2 className="mt-4 text-xl font-bold text-yellow-50">
          Account sync is unavailable
        </h2>

        <p className="mt-3 text-sm leading-6 text-yellow-50/80">
          {error ?? "Supabase environment variables are missing."}
        </p>
      </article>
    );
  }

  if (isLoading) {
    return (
      <article className="rounded-lg border border-gray-800 bg-neutral-900 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
          Account
        </p>

        <h2 className="mt-4 text-xl font-bold text-white">
          Checking session...
        </h2>
      </article>
    );
  }

  if (user) {
    return (
      <article className="rounded-lg border border-green-500/30 bg-green-500/10 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-300/80">
          Account
        </p>

        <h2 className="mt-4 text-xl font-bold text-white">
          Signed in
        </h2>

        <p className="mt-3 break-words text-sm leading-6 text-green-50/80">
          {user.email ?? "No email available"}
        </p>
      </article>
    );
  }

  return (
    <article className="rounded-lg border border-gray-800 bg-neutral-900 p-6">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
        Account
      </p>

      <h2 className="mt-4 text-xl font-bold text-white">
        Sign in to sync your account.
      </h2>

      <p className="mt-3 text-sm leading-6 text-gray-400">
        SkillMint still works locally in this browser. Sign in when you want
        your profile, resume analyses, job matches, and roadmap to sync.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/login"
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-500"
        >
          Log in
        </Link>

        <Link
          href="/signup"
          className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-100 transition hover:border-green-500 hover:text-green-300"
        >
          Create account
        </Link>
      </div>
    </article>
  );
}
