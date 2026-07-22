"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useState } from "react";

import {
  premiumInput,
  premiumPrimaryCta,
  premiumSecondaryCta,
} from "@/components/ui/premium";
import AuthPageShell from "@/modules/auth/components/AuthPageShell";
import { usePasswordRecovery } from "@/modules/auth/hooks/usePasswordRecovery";

const MIN_PASSWORD_LENGTH = 6;
const INVALID_LINK_MESSAGE =
  "This password reset link is invalid or has expired.";
const UPDATE_FAILURE_MESSAGE =
  "We could not update your password. Please try again or request a new reset link.";
const UPDATE_SUCCESS_MESSAGE =
  "Password updated. You can continue to SkillMint.";

export default function ResetPasswordPage() {
  const {
    status,
    isSubmitting,
    updatePassword,
  } = usePasswordRecovery();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const isReady = status === "ready";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isReady || isSubmitting) {
      return;
    }

    const validationError = getPasswordValidationError(
      newPassword,
      confirmPassword,
    );

    if (validationError) {
      setError(validationError);
      setMessage("");
      return;
    }

    setError("");
    setMessage("");

    const result = await updatePassword(newPassword);

    if (result === "ignored") {
      return;
    }

    if (result === "failure") {
      setError(UPDATE_FAILURE_MESSAGE);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setMessage(UPDATE_SUCCESS_MESSAGE);
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
        {status === "checking" && (
          <p
            role="status"
            className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700"
          >
            Verifying your reset link...
          </p>
        )}

        {status === "invalid" && (
          <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800">
            <p role="alert">
              {INVALID_LINK_MESSAGE}
            </p>

            <Link
              href="/forgot-password"
              className="mt-3 inline-flex font-semibold text-rose-800 underline decoration-rose-300 underline-offset-4 transition hover:text-rose-950"
            >
              Request a new reset link
            </Link>
          </div>
        )}

        <PasswordField
          id="new-password"
          label="New password"
          value={newPassword}
          autoComplete="new-password"
          onChange={setNewPassword}
          disabled={!isReady || isSubmitting}
        />

        <div className="mt-4">
          <PasswordField
            id="confirm-password"
            label="Confirm password"
            value={confirmPassword}
            autoComplete="new-password"
            onChange={setConfirmPassword}
            disabled={!isReady || isSubmitting}
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

        <button
          type="submit"
          disabled={!isReady || isSubmitting}
          className={`${premiumPrimaryCta} mt-5 w-full`}
        >
          {isSubmitting ? "Updating..." : "Update password"}
        </button>
      </form>

      {isReady && (
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
      )}
    </AuthPageShell>
  );
}

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  autoComplete: string;
  onChange: (value: string) => void;
  disabled: boolean;
};

function PasswordField({
  id,
  label,
  value,
  autoComplete,
  onChange,
  disabled,
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
        disabled={disabled}
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
