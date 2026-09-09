"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

import {
  premiumInput,
  premiumPrimaryCta,
  premiumSecondaryCta,
} from "@/components/ui/premium";
import AuthPageShell from "@/modules/auth/components/AuthPageShell";
import { useInviteCredentialSetup } from "@/modules/auth/hooks/useInviteCredentialSetup";
import {
  getNewPasswordLengthMessage,
  isNewPasswordAllowed,
} from "@/modules/auth/services/passwordPolicy";

const INVALID_LINK_MESSAGE =
  "This invitation link is invalid or has expired.";
const UPDATE_FAILURE_MESSAGE =
  "We could not set your password. Please try again or ask for a new invitation.";
const INVITE_TRUST_ITEMS = [
  "Continue with your approved SkillMint account",
  "Open only the workspace assigned to your account",
  "Keep candidate and recruiter access separated",
] as const;

export default function InvitePage() {
  const router = useRouter();
  const {
    status,
    isSubmitting,
    updatePassword,
  } = useInviteCredentialSetup();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
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
      return;
    }

    setError("");
    const result = await updatePassword(newPassword);

    if (result === "success") {
      router.replace("/auth/persona");
      router.refresh();
      return;
    }

    if (result === "failure") {
      setError(UPDATE_FAILURE_MESSAGE);
    }
  }

  return (
    <AuthPageShell
      eyebrow="Invitation"
      title="Set your account password"
      subtitle="Secure your invited account, then choose the workspace that matches your role."
      trustItems={INVITE_TRUST_ITEMS}
    >
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.05)]"
      >
        {status === "checking" ? (
          <p
            role="status"
            className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700"
          >
            Verifying your invitation...
          </p>
        ) : null}

        {status === "invalid" ? (
          <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800">
            <p role="alert">{INVALID_LINK_MESSAGE}</p>
            <Link
              href="/login"
              className="mt-3 inline-flex font-semibold text-rose-800 underline decoration-rose-300 underline-offset-4 transition hover:text-rose-950"
            >
              Return to login
            </Link>
          </div>
        ) : null}

        <PasswordField
          id="new-password"
          label="New password"
          value={newPassword}
          onChange={setNewPassword}
          disabled={!isReady || isSubmitting}
        />

        <div className="mt-4">
          <PasswordField
            id="confirm-password"
            label="Confirm password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            disabled={!isReady || isSubmitting}
          />
        </div>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-800"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!isReady || isSubmitting}
          className={`${premiumPrimaryCta} mt-5 w-full`}
        >
          {isSubmitting ? "Setting password..." : "Set password and continue"}
        </button>
      </form>

      <div className="mt-6">
        <Link href="/login" className={premiumSecondaryCta}>
          Already set a password? Log in
        </Link>
      </div>
    </AuthPageShell>
  );
}

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
};

function PasswordField({
  id,
  label,
  value,
  onChange,
  disabled,
}: PasswordFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-slate-700">
        {label}
      </label>
      <input
        id={id}
        type="password"
        autoComplete="new-password"
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

  if (!isNewPasswordAllowed(newPassword)) {
    return getNewPasswordLengthMessage();
  }

  if (!confirmPassword) {
    return "Confirm your new password.";
  }

  if (newPassword !== confirmPassword) {
    return "Passwords do not match.";
  }

  return "";
}
