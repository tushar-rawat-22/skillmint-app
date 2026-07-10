"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";

import {
  premiumInput,
  premiumPrimaryCta,
  premiumSecondaryCta,
} from "@/components/ui/premium";
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
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.05)]"
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
          <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-800">
            {error}
          </p>
        )}

        {message && (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">
            {message}
          </p>
        )}

        {!configStatus.isConfigured && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800">
            {configStatus.message}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={`${premiumPrimaryCta} mt-5 w-full`}
        >
          {isSubmitting ? "Updating..." : "Update password"}
        </button>
      </form>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/login"
          className={premiumSecondaryCta}
        >
          Log in
        </Link>

        <Link
          href="/dashboard"
          className={premiumSecondaryCta}
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
        className="text-sm font-semibold text-slate-700"
      >
        {label}
      </label>

      <input
        id={id}
        type="password"
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-2 ${premiumInput}`}
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
