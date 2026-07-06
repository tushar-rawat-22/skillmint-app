"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";

import AuthPageShell from "@/modules/auth/components/AuthPageShell";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";

const MIN_PASSWORD_LENGTH = 6;

export default function ResetPasswordPage() {
  const configStatus = useMemo(() => getSupabaseConfigStatus(), []);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = getPasswordValidationError(
      newPassword,
      confirmPassword,
    );

    if (validationError) {
      setError(validationError);
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

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setIsSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setMessage("Password updated. You can continue to SkillMint.");
  }

  return (
    <AuthPageShell
      eyebrow="Password Reset"
      title="Create a new password"
      subtitle="Set a new password, then continue your career loop."
    >
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-white/10 bg-black/28 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      >
        <PasswordField
          id="new-password"
          label="New password"
          value={newPassword}
          autoComplete="new-password"
          onChange={setNewPassword}
        />

        <div className="mt-4">
          <PasswordField
            id="confirm-password"
            label="Confirm password"
            value={confirmPassword}
            autoComplete="new-password"
            onChange={setConfirmPassword}
          />
        </div>

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
          {isSubmitting ? "Updating..." : "Update password"}
        </button>
      </form>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/login"
          className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-gray-100 transition hover:border-green-500 hover:text-green-300"
        >
          Log in
        </Link>

        <Link
          href="/dashboard"
          className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-100 transition hover:border-green-300 hover:text-white"
        >
          Continue to SkillMint
        </Link>
      </div>
    </AuthPageShell>
  );
}

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  autoComplete: string;
  onChange: (value: string) => void;
};

function PasswordField({
  id,
  label,
  value,
  autoComplete,
  onChange,
}: PasswordFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="text-sm font-semibold text-gray-200"
      >
        {label}
      </label>

      <input
        id={id}
        type="password"
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-white/10 bg-black/45 px-4 py-3 text-sm text-gray-100 outline-none transition placeholder:text-gray-600 focus:border-emerald-400"
        placeholder="Enter your new password"
      />
    </div>
  );
}

function getPasswordValidationError(
  newPassword: string,
  confirmPassword: string,
): string {
  if (!newPassword) {
    return "New password is required.";
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  if (!confirmPassword) {
    return "Confirm your new password.";
  }

  if (newPassword !== confirmPassword) {
    return "Passwords do not match.";
  }

  return "";
}
