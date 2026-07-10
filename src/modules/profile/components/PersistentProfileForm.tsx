"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import {
  premiumPrimaryCta,
  premiumSecondaryCta,
} from "@/components/ui/premium";
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import {
  getCurrentUserProfile,
  upsertCurrentUserProfile,
} from "@/modules/profile/services/profileRepository";
import type { ProfileInput } from "@/modules/profile/types";

const EMPTY_PROFILE_FORM: ProfileInput = {
  fullName: "",
  careerGoal: "",
  targetRole: "",
};

export default function PersistentProfileForm() {
  const { user, isConfigured, isLoading } = useAuthSession();
  const userId = user?.id ?? null;
  const [form, setForm] = useState<ProfileInput>(EMPTY_PROFILE_FORM);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isConfigured || !userId) {
      return;
    }

    let isActive = true;
    const timeoutId = window.setTimeout(() => {
      async function loadProfile() {
        setIsLoadingProfile(true);
        setError("");
        setMessage("");

        const result = await getCurrentUserProfile();

        if (!isActive) {
          return;
        }

        if (!result.ok) {
          setError(result.error);
          setIsLoadingProfile(false);
          return;
        }

        setForm(
          result.data
            ? {
                fullName: result.data.fullName ?? "",
                careerGoal: result.data.careerGoal ?? "",
                targetRole: result.data.targetRole ?? "",
              }
            : EMPTY_PROFILE_FORM,
        );
        setIsLoadingProfile(false);
      }

      void loadProfile();
    }, 0);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [isConfigured, userId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSaving(true);
    setError("");
    setMessage("");

    const result = await upsertCurrentUserProfile(form);

    setIsSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setForm({
      fullName: result.data.fullName ?? "",
      careerGoal: result.data.careerGoal ?? "",
      targetRole: result.data.targetRole ?? "",
    });
    setMessage("Profile saved.");
  }

  if (!isConfigured) {
    return (
      <ProfileInfoCard
        title="Account sync is unavailable"
        body="Account saving is not available right now. Resume, job match, and roadmap flows still work in this browser."
      />
    );
  }

  if (isLoading) {
    return (
      <ProfileInfoCard
        title="Checking account"
        body="SkillMint is checking whether your progress can be saved to your account."
      />
    );
  }

  if (!user) {
    return (
      <article className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-950 shadow-[0_14px_42px_rgba(15,23,42,0.06)]">
        <h2 className="text-xl font-bold">
          Sign in to sync your account.
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          SkillMint works in this browser without an account. Sign in to sync your
          saved profile direction, resume analyses, job matches, and roadmap.
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

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-950 shadow-[0_14px_42px_rgba(15,23,42,0.06)]"
    >
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
          Saved Career Profile
        </p>

        <h2 className="mt-4 text-xl font-bold">
          Save your direction
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          Keep your target role and career goal attached to your account.
          Career setup can update these without changing resume intelligence.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <ProfileField
          id="full-name"
          label="Full name"
          value={form.fullName}
          placeholder="Your name"
          onChange={(value) => setForm({ ...form, fullName: value })}
        />

        <ProfileField
          id="target-role"
          label="Target role"
          value={form.targetRole}
          placeholder="Frontend Intern"
          onChange={(value) => setForm({ ...form, targetRole: value })}
        />
      </div>

      <div className="mt-4">
        <label
          htmlFor="career-goal"
          className="text-sm font-semibold text-slate-700"
        >
          Career goal
        </label>

        <textarea
          id="career-goal"
          value={form.careerGoal}
          onChange={(event) =>
            setForm({ ...form, careerGoal: event.target.value })}
          rows={4}
          placeholder="What are you trying to become more hire-ready for?"
          className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
        />
      </div>

      {isLoadingProfile && (
        <p className="mt-4 text-sm text-slate-600">
          Loading saved profile...
        </p>
      )}

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
        disabled={isSaving || isLoadingProfile}
        className={`${premiumPrimaryCta} mt-5`}
      >
        {isSaving ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}

type ProfileFieldProps = {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
};

function ProfileField({
  id,
  label,
  value,
  placeholder,
  onChange,
}: ProfileFieldProps) {
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
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
      />
    </div>
  );
}

type ProfileInfoCardProps = {
  title: string;
  body: string;
};

function ProfileInfoCard({
  title,
  body,
}: ProfileInfoCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-950 shadow-[0_14px_42px_rgba(15,23,42,0.06)]">
      <h2 className="text-xl font-bold">
        {title}
      </h2>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        {body}
      </p>
    </article>
  );
}
