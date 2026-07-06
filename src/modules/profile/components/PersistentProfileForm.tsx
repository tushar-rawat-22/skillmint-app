"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

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
      <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <h2 className="text-xl font-bold">
          Sign in to sync your account.
        </h2>

        <p className="mt-3 text-sm leading-6 text-gray-400">
          SkillMint works in this browser without an account. Sign in to sync your
          saved profile direction, resume analyses, job matches, and roadmap.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-300"
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

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
    >
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-400">
          Saved Career Profile
        </p>

        <h2 className="mt-4 text-xl font-bold">
          Save your direction
        </h2>

        <p className="mt-3 text-sm leading-6 text-gray-400">
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
          className="text-sm font-semibold text-gray-200"
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
          className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm leading-6 text-gray-100 outline-none transition placeholder:text-gray-600 focus:border-emerald-400 focus:bg-black/45"
        />
      </div>

      {isLoadingProfile && (
        <p className="mt-4 text-sm text-gray-400">
          Loading saved profile...
        </p>
      )}

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

      <button
        type="submit"
        disabled={isSaving || isLoadingProfile}
        className="mt-5 rounded-xl bg-emerald-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-emerald-900 disabled:text-gray-300"
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
        className="text-sm font-semibold text-gray-200"
      >
        {label}
      </label>

      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-gray-100 outline-none transition placeholder:text-gray-600 focus:border-emerald-400 focus:bg-black/45"
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
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <h2 className="text-xl font-bold">
        {title}
      </h2>

      <p className="mt-3 text-sm leading-6 text-gray-400">
        {body}
      </p>
    </article>
  );
}
