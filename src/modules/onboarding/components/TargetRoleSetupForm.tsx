"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";

import {
  premiumInput,
  premiumPrimaryCta,
} from "@/components/ui/premium";
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import {
  getTargetRoleSetup,
  saveTargetRoleSetup,
} from "@/modules/onboarding/storage/targetRoleSetupStorage";
import type { TargetRoleSetup } from "@/modules/onboarding/types";
import {
  getCurrentUserProfile,
  upsertCurrentUserProfile,
} from "@/modules/profile/services/profileRepository";
import {
  fireAndForgetAnalytics,
  getBrowserAnalyticsRuntime,
} from "@/platform/analytics";

type TargetRoleSetupFormState = Omit<TargetRoleSetup, "updatedAt"> & {
  careerField: NonNullable<TargetRoleSetup["careerField"]>;
};

type SyncStatus = {
  tone: "success" | "warning" | "muted";
  message: string;
};

const DEFAULT_FORM: TargetRoleSetupFormState = {
  targetRole: "",
  careerField: "tech_software",
  experienceLevel: "student",
  primaryGoal: "get_internship",
  preferredJobType: "not_sure",
  weeklyTimeCommitment: "medium",
};

const CAREER_FIELD_OPTIONS = [
  ["tech_software", "Tech / Software"],
  ["data_analytics", "Data / Analytics"],
  ["sales_business_development", "Sales / Business Development"],
  ["marketing_content", "Marketing / Content"],
  ["finance_operations", "Finance / Operations"],
  ["design_product", "Design / Product"],
  ["other", "Other"],
] satisfies Array<[
  NonNullable<TargetRoleSetup["careerField"]>,
  string,
]>;

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

const CAREER_FIELD_VALUES = [
  "tech_software",
  "data_analytics",
  "sales_business_development",
  "marketing_content",
  "finance_operations",
  "design_product",
  "other",
] as const;
const EXPERIENCE_LEVEL_VALUES = [
  "student",
  "fresher",
  "intern",
  "junior",
  "switcher",
] as const;
const PRIMARY_GOAL_VALUES = [
  "get_internship",
  "get_first_job",
  "switch_role",
  "improve_resume",
  "prepare_interviews",
] as const;
const PREFERRED_JOB_TYPE_VALUES = [
  "not_sure",
  "frontend",
  "backend",
  "full_stack",
  "ai_ml",
  "data",
  "devops",
  "product",
] as const;
const WEEKLY_TIME_VALUES = ["low", "medium", "high"] as const;

export default function TargetRoleSetupForm() {
  const { user, isConfigured, isLoading } = useAuthSession();
  const currentUserId = isLoading ? undefined : user?.id ?? null;
  const analytics = getBrowserAnalyticsRuntime({
    isAuthResolved: !isLoading,
    hasAccount: Boolean(user),
  });
  const [form, setForm] = useState<TargetRoleSetupFormState>(DEFAULT_FORM);
  const [savedSetup, setSavedSetup] = useState<TargetRoleSetup | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const setup = getTargetRoleSetup({
        currentUserId,
      });

      if (!setup) {
        return;
      }

      setForm(toFormState(setup));
      setSavedSetup(setup);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [currentUserId]);

  useEffect(() => {
    if (!isConfigured || isLoading || !user) {
      return;
    }

    const ownerId = user.id;
    if (getTargetRoleSetup({ currentUserId: ownerId })) {
      return;
    }

    let isActive = true;
    const timeoutId = window.setTimeout(() => {
      void restoreCareerDirectionFromAccount();
    }, 0);

    async function restoreCareerDirectionFromAccount() {
      try {
        const profileResult = await getCurrentUserProfile();

        if (!isActive || !profileResult.ok || !profileResult.data) {
          return;
        }

        const profile = profileResult.data;
        const targetRole = profile.targetRole;
        if (!targetRole) {
          return;
        }

        const restoredSetup = profile.updatedAt
          ? parseStoredCareerDirection({
              targetRole,
              careerGoal: profile.careerGoal,
              updatedAt: profile.updatedAt,
            })
          : null;

        if (restoredSetup) {
          saveTargetRoleSetup(restoredSetup, {
            currentUserId: ownerId,
          });
          setForm(toFormState(restoredSetup));
          setSavedSetup(restoredSetup);
          setSyncStatus({
            tone: "success",
            message: "Restored your saved career direction from this SkillMint account.",
          });
          return;
        }

        setForm((currentForm) => ({
          ...currentForm,
          targetRole,
        }));
        setSyncStatus({
          tone: "muted",
          message:
            "Restored your saved target role from this SkillMint account. Review the remaining direction settings before saving.",
        });
      } catch {
        // Account restore is additive. The browser-local workflow remains usable.
      }
    }

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [isConfigured, isLoading, user]);

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

    fireAndForgetAnalytics(() => analytics.careerSetupStarted({
      setup_mode: savedSetup ? "edit" : "create",
    }));
    setIsSaving(true);
    setError("");
    saveTargetRoleSetup(nextSetup, {
      currentUserId,
    });
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

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className="bg-white px-5 py-7 sm:px-8 sm:py-9"
      >
        <div>
          <TextField
            id="target-role"
            label="Target role"
            value={form.targetRole}
            placeholder="For example: Frontend developer"
            isPrimary
            onChange={(value) =>
              setForm({
                ...form,
                targetRole: value,
              })}
          />
          <p id="target-role-help" className="mt-2 text-sm leading-6 text-slate-500">
            Use a role you would realistically search or apply for next.
          </p>
        </div>

        {error && (
          <p role="alert" className="mt-5 border-l-2 border-rose-500 px-4 py-2 text-sm leading-6 text-rose-800">
            {error}
          </p>
        )}

        {syncStatus && (
          <p role="status" className={getSyncStatusClassName(syncStatus.tone)}>
            {syncStatus.message}
          </p>
        )}

        <button
          type="submit"
          disabled={isSaving || isLoading}
          className={`${premiumPrimaryCta} mt-6`}
        >
          {isSaving
            ? "Saving..."
            : isLoading
              ? "Checking account..."
              : "Save target role"}
        </button>

        <details className="mt-8 border-t border-slate-200 pt-6">
          <summary className="cursor-pointer font-semibold text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700">
            Add optional details for more tailored next steps
          </summary>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Add these when you want more specific guidance. Existing saved
            details are preserved even while this section is closed.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <SelectField
              id="career-field"
              label="Career field"
              value={form.careerField}
              options={CAREER_FIELD_OPTIONS}
              onChange={(value) => setForm({ ...form, careerField: value })}
            />
            <SelectField
              id="experience-level"
              label="Experience level"
              value={form.experienceLevel}
              options={EXPERIENCE_LEVEL_OPTIONS}
              onChange={(value) => setForm({ ...form, experienceLevel: value })}
            />
            <SelectField
              id="primary-goal"
              label="Current goal"
              value={form.primaryGoal}
              options={PRIMARY_GOAL_OPTIONS}
              onChange={(value) => setForm({ ...form, primaryGoal: value })}
            />
            <SelectField
              id="preferred-job-type"
              label="Role focus"
              value={form.preferredJobType}
              options={PREFERRED_JOB_TYPE_OPTIONS}
              onChange={(value) => setForm({ ...form, preferredJobType: value })}
            />
            <SelectField
              id="weekly-time"
              label="Weekly time available"
              value={form.weeklyTimeCommitment}
              options={WEEKLY_TIME_OPTIONS}
              onChange={(value) => setForm({ ...form, weeklyTimeCommitment: value })}
            />
          </div>

          <button
            type="submit"
            disabled={isSaving || isLoading}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-emerald-400 hover:text-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Save optional details
          </button>
        </details>
      </form>

      {savedSetup && (
        <section
          aria-labelledby="resume-handoff-title"
          className="mt-6 border-l-4 border-emerald-700 bg-emerald-50 px-5 py-6 sm:px-7"
        >
          <p className="text-sm font-semibold text-emerald-800">Target role saved</p>
          <h2 id="resume-handoff-title" className="mt-2 text-2xl font-black text-slate-950">
            Now show us what your resume says.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">
            We will compare what it shows with your target role and surface the
            clearest gap and next step. Your resume stays private by default.
          </p>
          <Link href="/upload" className={`${premiumPrimaryCta} mt-5`}>
            Continue to resume upload
          </Link>
        </section>
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
        className="text-sm font-semibold text-slate-700"
      >
        {label}
      </label>

      <input
        id={id}
        aria-describedby={isPrimary ? "target-role-help" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`mt-2 ${premiumInput} ${
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
        className="text-sm font-semibold text-slate-700"
      >
        {label}
      </label>

      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className={`mt-2 ${premiumInput}`}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option
            key={optionValue}
            value={optionValue}
            className="bg-white text-slate-950"
          >
            {optionLabel}
          </option>
        ))}
      </select>
    </div>
  );
}

function getSyncStatusClassName(tone: SyncStatus["tone"]): string {
  const baseClassName = "mt-5 border-l-2 px-4 py-2 text-sm leading-6";

  if (tone === "success") {
    return `${baseClassName} border-emerald-600 text-emerald-800`;
  }

  if (tone === "warning") {
    return `${baseClassName} border-amber-500 text-amber-800`;
  }

  return `${baseClassName} border-slate-300 text-slate-700`;
}

function toFormState(setup: TargetRoleSetup): TargetRoleSetupFormState {
  return {
    targetRole: setup.targetRole,
    careerField: setup.careerField ?? DEFAULT_FORM.careerField,
    experienceLevel: setup.experienceLevel,
    primaryGoal: setup.primaryGoal,
    preferredJobType: setup.preferredJobType,
    weeklyTimeCommitment: setup.weeklyTimeCommitment,
  };
}

function parseStoredCareerDirection(input: {
  targetRole: string;
  careerGoal: string | null;
  updatedAt: string;
}): TargetRoleSetup | null {
  const lines = input.careerGoal?.split("\n") ?? [];
  if (lines.length !== 6 || lines[0] !== `Target role: ${input.targetRole}`) {
    return null;
  }

  const careerField = parseStoredOption(
    lines[1],
    "Career field: ",
    CAREER_FIELD_VALUES,
  );
  const experienceLevel = parseStoredOption(
    lines[2],
    "Experience level: ",
    EXPERIENCE_LEVEL_VALUES,
  );
  const primaryGoal = parseStoredOption(
    lines[3],
    "Primary goal: ",
    PRIMARY_GOAL_VALUES,
  );
  const preferredJobType = parseStoredOption(
    lines[4],
    "Preferred job type: ",
    PREFERRED_JOB_TYPE_VALUES,
  );
  const weeklyTimeCommitment = parseStoredOption(
    lines[5],
    "Weekly time commitment: ",
    WEEKLY_TIME_VALUES,
  );

  if (
    !careerField ||
    !experienceLevel ||
    !primaryGoal ||
    !preferredJobType ||
    !weeklyTimeCommitment ||
    !Number.isFinite(Date.parse(input.updatedAt))
  ) {
    return null;
  }

  return {
    targetRole: input.targetRole,
    careerField,
    experienceLevel,
    primaryGoal,
    preferredJobType,
    weeklyTimeCommitment,
    updatedAt: input.updatedAt,
  };
}

function parseStoredOption<T extends string>(
  line: string,
  prefix: string,
  values: readonly T[],
): T | null {
  if (!line.startsWith(prefix)) {
    return null;
  }

  const label = line.slice(prefix.length);
  return values.find((value) => formatOptionLabel(value) === label) ?? null;
}

function getReadableCareerGoal(setup: TargetRoleSetup): string {
  return [
    `Target role: ${setup.targetRole}`,
    `Career field: ${formatOptionLabel(setup.careerField ?? "other")}`,
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
