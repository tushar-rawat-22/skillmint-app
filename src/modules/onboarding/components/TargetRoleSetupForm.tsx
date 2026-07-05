"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import {
  getTargetRoleSetup,
  saveTargetRoleSetup,
} from "@/modules/onboarding/storage/targetRoleSetupStorage";
import { getTargetRoleRecommendation } from "@/modules/onboarding/utils/targetRoleRecommendations";
import type { TargetRoleSetup } from "@/modules/onboarding/types";
import {
  getCurrentUserProfile,
  upsertCurrentUserProfile,
} from "@/modules/profile/services/profileRepository";

type TargetRoleSetupFormState = Omit<TargetRoleSetup, "updatedAt">;

type SyncStatus = {
  tone: "success" | "warning" | "muted";
  message: string;
};

const DEFAULT_FORM: TargetRoleSetupFormState = {
  targetRole: "",
  experienceLevel: "student",
  primaryGoal: "get_internship",
  preferredJobType: "not_sure",
  weeklyTimeCommitment: "medium",
};

const EXPERIENCE_LEVEL_OPTIONS = [
  ["student", "Student"],
  ["fresher", "Fresher"],
  ["intern", "Intern"],
  ["junior", "Junior"],
  ["switcher", "Career switcher"],
] satisfies Array<[TargetRoleSetup["experienceLevel"], string]>;

const PRIMARY_GOAL_OPTIONS = [
  ["get_internship", "Get an internship"],
  ["get_first_job", "Get first job"],
  ["switch_role", "Switch role"],
  ["improve_resume", "Improve resume"],
  ["prepare_interviews", "Prepare interviews"],
] satisfies Array<[TargetRoleSetup["primaryGoal"], string]>;

const PREFERRED_JOB_TYPE_OPTIONS = [
  ["not_sure", "Not sure yet"],
  ["frontend", "Frontend"],
  ["backend", "Backend"],
  ["full_stack", "Full stack"],
  ["ai_ml", "AI / ML"],
  ["data", "Data"],
  ["devops", "DevOps"],
  ["product", "Product"],
] satisfies Array<[TargetRoleSetup["preferredJobType"], string]>;

const WEEKLY_TIME_OPTIONS = [
  ["low", "Low: 2-4 hrs/week"],
  ["medium", "Medium: 5-8 hrs/week"],
  ["high", "High: 10+ hrs/week"],
] satisfies Array<[TargetRoleSetup["weeklyTimeCommitment"], string]>;

export default function TargetRoleSetupForm() {
  const { user, isConfigured, isLoading } = useAuthSession();
  const [form, setForm] = useState<TargetRoleSetupFormState>(DEFAULT_FORM);
  const [savedSetup, setSavedSetup] = useState<TargetRoleSetup | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const setup = getTargetRoleSetup();

      if (!setup) {
        return;
      }

      setForm({
        targetRole: setup.targetRole,
        experienceLevel: setup.experienceLevel,
        primaryGoal: setup.primaryGoal,
        preferredJobType: setup.preferredJobType,
        weeklyTimeCommitment: setup.weeklyTimeCommitment,
      });
      setSavedSetup(setup);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTargetRole = form.targetRole.trim();

    if (!trimmedTargetRole) {
      setError("Add a target role so SkillMint knows what direction to guide.");
      setSyncStatus(null);
      return;
    }

    const nextSetup: TargetRoleSetup = {
      ...form,
      targetRole: trimmedTargetRole,
      updatedAt: new Date().toISOString(),
    };

    setIsSaving(true);
    setError("");
    saveTargetRoleSetup(nextSetup);
    setSavedSetup(nextSetup);

    const syncMessage = await syncSetupToProfile(nextSetup);

    setSyncStatus(syncMessage);
    setIsSaving(false);
  }

  async function syncSetupToProfile(
    setup: TargetRoleSetup,
  ): Promise<SyncStatus> {
    if (!isConfigured) {
      return {
        tone: "muted",
        message: "Saved in this browser. Sign in later after account sync is available.",
      };
    }

    if (isLoading) {
      return {
        tone: "muted",
        message: "Saved in this browser. Account check is still loading.",
      };
    }

    if (!user) {
      return {
        tone: "muted",
        message: "Saved in this browser. Sign in to save your progress.",
      };
    }

    try {
      const profileResult = await getCurrentUserProfile();

      if (!profileResult.ok) {
        return {
          tone: "warning",
          message: `Saved in this browser. Profile sync did not finish: ${profileResult.error}`,
        };
      }

      const syncResult = await upsertCurrentUserProfile({
        fullName: profileResult.data?.fullName ?? "",
        targetRole: setup.targetRole,
        careerGoal: getReadableCareerGoal(setup),
      });

      if (!syncResult.ok) {
        return {
          tone: "warning",
          message: `Saved in this browser. Profile sync did not finish: ${syncResult.error}`,
        };
      }

      return {
        tone: "success",
        message: "Saved to your career profile.",
      };
    } catch {
      return {
        tone: "warning",
        message: "Saved in this browser. Profile sync did not finish right now.",
      };
    }
  }

  const recommendation = savedSetup
    ? getTargetRoleRecommendation(savedSetup)
    : null;

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-gray-800 bg-neutral-900 p-6"
      >
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-400">
            Your Career Direction
          </p>

          <h2 className="mt-4 text-2xl font-bold text-white">
            Tell SkillMint where you are aiming.
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
            Start with the role you want. The rest helps SkillMint pace your
            next steps without changing your resume score.
          </p>
        </div>

        <div className="mt-6">
          <TextField
            id="target-role"
            label="Your career direction"
            value={form.targetRole}
            placeholder="Frontend Intern, Data Analyst, Backend Developer"
            isPrimary
            onChange={(value) =>
              setForm({
                ...form,
                targetRole: value,
              })}
          />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <SelectField
            id="experience-level"
            label="Your level"
            value={form.experienceLevel}
            options={EXPERIENCE_LEVEL_OPTIONS}
            onChange={(value) =>
              setForm({
                ...form,
                experienceLevel: value,
              })}
          />

          <SelectField
            id="primary-goal"
            label="Your goal"
            value={form.primaryGoal}
            options={PRIMARY_GOAL_OPTIONS}
            onChange={(value) =>
              setForm({
                ...form,
                primaryGoal: value,
              })}
          />

          <SelectField
            id="preferred-job-type"
            label="Role type"
            value={form.preferredJobType}
            options={PREFERRED_JOB_TYPE_OPTIONS}
            onChange={(value) =>
              setForm({
                ...form,
                preferredJobType: value,
              })}
          />

          <SelectField
            id="weekly-time"
            label="Your weekly pace"
            value={form.weeklyTimeCommitment}
            options={WEEKLY_TIME_OPTIONS}
            onChange={(value) =>
              setForm({
                ...form,
                weeklyTimeCommitment: value,
              })}
          />
        </div>

        {error && (
          <p className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm leading-6 text-red-100">
            {error}
          </p>
        )}

        {syncStatus && (
          <p className={getSyncStatusClassName(syncStatus.tone)}>
            {syncStatus.message}
          </p>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="mt-6 rounded-xl bg-green-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:bg-green-900 disabled:text-gray-300"
        >
          {isSaving ? "Saving..." : "Save direction"}
        </button>
      </form>

      {recommendation && (
        <RecommendationCard
          headline={recommendation.headline}
          message={recommendation.message}
          nextActions={recommendation.nextActions}
        />
      )}
    </div>
  );
}

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  isPrimary?: boolean;
  onChange: (value: string) => void;
};

function TextField({
  id,
  label,
  value,
  placeholder,
  isPrimary = false,
  onChange,
}: TextFieldProps) {
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
        className={`mt-2 w-full rounded-lg border border-gray-800 bg-black/40 text-gray-100 outline-none transition placeholder:text-gray-600 focus:border-green-500 ${
          isPrimary ? "px-5 py-4 text-base" : "px-4 py-3 text-sm"
        }`}
      />
    </div>
  );
}

type SelectFieldProps<T extends string> = {
  id: string;
  label: string;
  value: T;
  options: ReadonlyArray<readonly [T, string]>;
  onChange: (value: T) => void;
};

function SelectField<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: SelectFieldProps<T>) {
  return (
    <div>
      <label
        htmlFor={id}
        className="text-sm font-semibold text-gray-200"
      >
        {label}
      </label>

      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="mt-2 w-full rounded-lg border border-gray-800 bg-black/40 px-4 py-3 text-sm text-gray-100 outline-none transition focus:border-green-500"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option
            key={optionValue}
            value={optionValue}
            className="bg-neutral-950 text-gray-100"
          >
            {optionLabel}
          </option>
        ))}
      </select>
    </div>
  );
}

type RecommendationCardProps = {
  headline: string;
  message: string;
  nextActions: string[];
};

function RecommendationCard({
  headline,
  message,
  nextActions,
}: RecommendationCardProps) {
  return (
    <section className="rounded-lg border border-green-500/30 bg-green-500/10 p-6">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-300/80">
        Recommended Focus
      </p>

      <h2 className="mt-4 text-xl font-bold text-white">
        {headline}
      </h2>

      <p className="mt-3 max-w-3xl text-sm leading-6 text-green-50/80">
        {message}
      </p>

      <ul className="mt-5 grid gap-3 text-sm leading-6 text-green-50/85 md:grid-cols-3">
        {nextActions.map((action) => (
          <li
            key={action}
            className="rounded-lg border border-green-500/20 bg-black/20 p-4"
          >
            {action}
          </li>
        ))}
      </ul>
    </section>
  );
}

function getSyncStatusClassName(tone: SyncStatus["tone"]): string {
  const baseClassName = "mt-5 rounded-lg border p-3 text-sm leading-6";

  if (tone === "success") {
    return `${baseClassName} border-green-500/30 bg-green-500/10 text-green-100`;
  }

  if (tone === "warning") {
    return `${baseClassName} border-yellow-500/30 bg-yellow-500/10 text-yellow-100`;
  }

  return `${baseClassName} border-gray-800 bg-black/30 text-gray-300`;
}

function getReadableCareerGoal(setup: TargetRoleSetup): string {
  return [
    `Target role: ${setup.targetRole}`,
    `Experience level: ${formatOptionLabel(setup.experienceLevel)}`,
    `Primary goal: ${formatOptionLabel(setup.primaryGoal)}`,
    `Preferred job type: ${formatOptionLabel(setup.preferredJobType)}`,
    `Weekly time commitment: ${formatOptionLabel(
      setup.weeklyTimeCommitment,
    )}`,
  ].join("\n");
}

function formatOptionLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
