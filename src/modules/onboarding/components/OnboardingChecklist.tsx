"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import {
  getOnboardingDismissed,
  setOnboardingDismissed,
} from "@/modules/onboarding/storage/onboardingStorage";
import {
  TARGET_ROLE_SETUP_STORAGE_KEY,
} from "@/modules/onboarding/storage/targetRoleSetupStorage";
import { buildOnboardingSteps } from "@/modules/onboarding/utils/onboardingProgress";
import type {
  OnboardingProgress,
  OnboardingStep,
} from "@/modules/onboarding/types";

const RESUME_ANALYSIS_STORAGE_KEY = "skillmint:resume-analysis";
const JD_MATCH_STORAGE_KEY = "skillmint:jd-match";

export default function OnboardingChecklist() {
  const storedResumeAnalysis = useSyncExternalStore(
    subscribeToStoredData,
    readStoredResumeAnalysis,
    getServerSnapshot,
  );
  const storedJobMatch = useSyncExternalStore(
    subscribeToStoredData,
    readStoredJobMatch,
    getServerSnapshot,
  );
  const storedTargetRoleSetup = useSyncExternalStore(
    subscribeToStoredData,
    readStoredTargetRoleSetup,
    getServerSnapshot,
  );
  const {
    user,
    isConfigured,
    isLoading: isAuthLoading,
  } = useAuthSession();
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsDismissed(getOnboardingDismissed());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const progress = useMemo<OnboardingProgress>(() => {
    const hasResumeAnalysis = hasValidResumeAnalysis(
      storedResumeAnalysis,
    );
    const parsedJobMatch = parseStoredJobMatch(storedJobMatch);

    return {
      hasTargetRoleSetup: hasValidTargetRoleSetup(storedTargetRoleSetup),
      hasResumeAnalysis,
      hasJobMatch: Boolean(parsedJobMatch),
      hasRoadmap: hasStoredRoadmap(parsedJobMatch),
      isSignedIn: Boolean(user),
      isSupabaseConfigured: isConfigured,
    };
  }, [
    isConfigured,
    storedJobMatch,
    storedResumeAnalysis,
    storedTargetRoleSetup,
    user,
  ]);
  const steps = useMemo(() => buildOnboardingSteps(progress), [progress]);
  const activeStep = steps.find((step) => step.status === "active");
  const completedCount = steps.filter((step) => step.status === "complete")
    .length;

  function updateDismissed(value: boolean) {
    setOnboardingDismissed(value);
    setIsDismissed(value);
  }

  if (isDismissed) {
    return (
      <button
        type="button"
        onClick={() => updateDismissed(false)}
        className="w-fit rounded-lg border border-gray-800 bg-neutral-900 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:border-green-500 hover:text-green-300"
      >
        Show setup checklist
      </button>
    );
  }

  return (
    <section className="rounded-lg border border-gray-800 bg-neutral-900 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-400">
            Your SkillMint setup
          </p>

          <h2 className="mt-4 text-2xl font-bold text-white">
            Start with the next useful step
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
            {getSetupMessage(
              activeStep,
              completedCount,
              steps.length,
              isAuthLoading,
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => updateDismissed(true)}
          className="w-fit rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:border-gray-500 hover:text-white"
        >
          Hide for now
        </button>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {steps.map((step, index) => (
          <OnboardingStepCard
            key={step.id}
            step={step}
            index={index + 1}
          />
        ))}
      </div>
    </section>
  );
}

type OnboardingStepCardProps = {
  step: OnboardingStep;
  index: number;
};

function OnboardingStepCard({
  step,
  index,
}: OnboardingStepCardProps) {
  const isLocked = step.status === "locked";

  return (
    <article className={getStepCardClassName(step.status)}>
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full border border-gray-700 px-2.5 py-1 text-xs font-semibold text-gray-400">
          {index}
        </span>

        <span className={getStatusBadgeClassName(step.status)}>
          {formatStatus(step.status)}
        </span>
      </div>

      <h3 className="mt-4 text-base font-bold text-white">
        {step.title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-gray-400">
        {step.description}
      </p>

      {isLocked ? (
        <span className="mt-4 inline-flex rounded-lg border border-gray-800 px-3 py-2 text-sm font-semibold text-gray-600">
          {step.cta}
        </span>
      ) : (
        <Link
          href={step.href}
          className="mt-4 inline-flex rounded-lg border border-gray-700 px-3 py-2 text-sm font-semibold text-gray-100 transition hover:border-green-500 hover:text-green-300"
        >
          {step.cta}
        </Link>
      )}
    </article>
  );
}

function getSetupMessage(
  activeStep: OnboardingStep | undefined,
  completedCount: number,
  totalCount: number,
  isAuthLoading: boolean,
): string {
  if (completedCount === totalCount) {
    return "You have the core SkillMint loop running. Keep using job matches and roadmaps as your career targets change.";
  }

  if (isAuthLoading) {
    return "Checking your account status while keeping local progress available.";
  }

  if (activeStep) {
    return `Next best action: ${activeStep.title.toLowerCase()}.`;
  }

  return "Follow the setup path to turn one resume into a useful career operating system.";
}

function getStepCardClassName(status: OnboardingStep["status"]): string {
  const baseClassName = "min-w-0 rounded-lg border p-4";

  if (status === "complete") {
    return `${baseClassName} border-green-500/30 bg-green-500/10`;
  }

  if (status === "active") {
    return `${baseClassName} border-blue-500/30 bg-blue-500/10`;
  }

  return `${baseClassName} border-gray-800 bg-black/30`;
}

function getStatusBadgeClassName(status: OnboardingStep["status"]): string {
  const baseClassName =
    "rounded-full border px-2.5 py-1 text-xs font-semibold";

  if (status === "complete") {
    return `${baseClassName} border-green-500/30 text-green-200`;
  }

  if (status === "active") {
    return `${baseClassName} border-blue-500/30 text-blue-100`;
  }

  return `${baseClassName} border-gray-700 text-gray-500`;
}

function formatStatus(status: OnboardingStep["status"]): string {
  if (status === "complete") {
    return "Done";
  }

  if (status === "active") {
    return "Next";
  }

  return "Locked";
}

function subscribeToStoredData(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
  };
}

function readStoredResumeAnalysis(): string | null {
  return getBrowserStorage()?.getItem(RESUME_ANALYSIS_STORAGE_KEY) ?? null;
}

function readStoredJobMatch(): string | null {
  return getBrowserStorage()?.getItem(JD_MATCH_STORAGE_KEY) ?? null;
}

function readStoredTargetRoleSetup(): string | null {
  return getBrowserStorage()?.getItem(TARGET_ROLE_SETUP_STORAGE_KEY) ??
    null;
}

function getServerSnapshot(): null {
  return null;
}

function getBrowserStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function hasValidResumeAnalysis(storedValue: string | null): boolean {
  if (!storedValue) {
    return false;
  }

  try {
    const parsedValue = JSON.parse(storedValue);

    if (!isRecord(parsedValue)) {
      return false;
    }

    return isRecord(parsedValue.userProfile) ||
      isRecord(parsedValue.parsedProfile) ||
      typeof parsedValue.extractedText === "string";
  } catch {
    return false;
  }
}

function hasValidTargetRoleSetup(storedValue: string | null): boolean {
  if (!storedValue) {
    return false;
  }

  try {
    const parsedValue = JSON.parse(storedValue);

    if (!isRecord(parsedValue)) {
      return false;
    }

    return typeof parsedValue.targetRole === "string" &&
      parsedValue.targetRole.trim().length > 0 &&
      typeof parsedValue.experienceLevel === "string" &&
      typeof parsedValue.primaryGoal === "string" &&
      typeof parsedValue.preferredJobType === "string" &&
      typeof parsedValue.weeklyTimeCommitment === "string";
  } catch {
    return false;
  }
}

function parseStoredJobMatch(
  storedValue: string | null,
): Record<string, unknown> | null {
  if (!storedValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(storedValue);

    if (!isRecord(parsedValue) || !isRecord(parsedValue.result)) {
      return null;
    }

    return typeof parsedValue.result.matchScore === "number"
      ? parsedValue
      : null;
  } catch {
    return null;
  }
}

function hasStoredRoadmap(
  jobMatch: Record<string, unknown> | null,
): boolean {
  if (!jobMatch || !isRecord(jobMatch.roadmap)) {
    return false;
  }

  return typeof jobMatch.roadmap.targetRole === "string" ||
    typeof jobMatch.roadmap.readiness === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" &&
    !Array.isArray(value);
}
