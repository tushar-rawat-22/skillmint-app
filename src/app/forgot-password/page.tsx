"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";

import AuthPageShell from "@/modules/auth/components/AuthPageShell";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";

export default function ForgotPasswordPage() {
  const configStatus = useMemo(() => getSupabaseConfigStatus(), []);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Email is required.");
      setMessage("");
      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (!configStatus.isConfigured || !supabase) {
      setError(configStatus.message);
      setMessage("");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setMessage("");

    const { error: resetError } =
      await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

    setIsSubmitting(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage("Password reset link sent. Check your email.");
  }

  return (
    <AuthPageShell
      eyebrow="Password Recovery"
      title="Reset your password"
      subtitle="Enter your email and SkillMint will send a secure reset link."
    >
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-white/10 bg-black/28 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      >
        <label
          htmlFor="email"
          className="text-sm font-semibold text-gray-200"
        >
          Email
        </label>

        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/45 px-4 py-3 text-sm text-gray-100 outline-none transition placeholder:text-gray-600 focus:border-emerald-400"
          placeholder="you@example.com"
        />

        {error && (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm leading-6 text-red-100">
            {error}
          </p>
        )}

        {message && (
          <p className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm leading-6 text-green-100">
            {message}
          </p>
        )}

        {!configStatus.isConfigured && (
          <p className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm leading-6 text-yellow-100">
            {configStatus.message}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-5 w-full rounded-xl bg-emerald-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-emerald-900 disabled:text-gray-300"
        >
          {isSubmitting ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <p className="mt-6 text-sm text-gray-400">
        Remember your password?{" "}
        <Link
          href="/login"
          className="font-semibold text-green-300 transition hover:text-green-200"
        >
          Log in
        </Link>
      </p>
    </AuthPageShell>
  );
}
