"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useMemo, useRef, useState } from "react";

import {
  premiumInput,
  premiumPrimaryCta,
} from "@/components/ui/premium";
import AuthPageShell from "@/modules/auth/components/AuthPageShell";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import { requestPasswordReset } from "@/modules/auth/services/passwordResetRequest";

const RESET_REQUEST_FAILURE_MESSAGE =
  "We could not send a reset link. Please try again.";
const RESET_REQUEST_SUCCESS_MESSAGE =
  "If an account exists for that email, a password reset link will be sent.";
const RESET_SERVICE_UNAVAILABLE_MESSAGE =
  "Password recovery is temporarily unavailable. Please try again later.";

export default function ForgotPasswordPage() {
  const configStatus = useMemo(() => getSupabaseConfigStatus(), []);
  const submissionInFlight = useRef(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submissionInFlight.current) {
      return;
    }

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Email is required.");
      setMessage("");
      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (!configStatus.isConfigured || !supabase) {
      setError(RESET_SERVICE_UNAVAILABLE_MESSAGE);
      setMessage("");
      return;
    }

    submissionInFlight.current = true;
    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const result = await requestPasswordReset(supabase, {
        email: trimmedEmail,
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (!result.ok) {
        setError(RESET_REQUEST_FAILURE_MESSAGE);
        return;
      }

      setMessage(RESET_REQUEST_SUCCESS_MESSAGE);
    } catch {
      setError(RESET_REQUEST_FAILURE_MESSAGE);
    } finally {
      submissionInFlight.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <AuthPageShell
      eyebrow="Password Recovery"
      title="Reset your password"
      subtitle="Enter your email and SkillMint will send a secure reset link."
    >
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.05)]"
      >
        <label
          htmlFor="email"
          className="text-sm font-semibold text-slate-700"
        >
          Email
        </label>

        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={`mt-2 ${premiumInput}`}
          placeholder="you@example.com"
        />

        {error && (
          <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-800">
            {error}
          </p>
        )}

        {message && (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={`${premiumPrimaryCta} mt-5 w-full`}
        >
          {isSubmitting ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-600">
        Remember your password?{" "}
        <Link
          href="/login"
          className="font-semibold text-emerald-700 transition hover:text-emerald-900"
        >
          Log in
        </Link>
      </p>
    </AuthPageShell>
  );
}
