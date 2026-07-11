"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import {
  premiumEyebrow,
  premiumSecondaryCta,
  premiumSurface,
} from "@/components/ui/premium";
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import { subscribeToSkillMintWorkspaceUpdates } from "@/lib/storage/skillMintStorageEvents";
import {
  getOnboardingDismissed,
  setOnboardingDismissed,
} from "@/modules/onboarding/storage/onboardingStorage";
import {
  readCurrentJobMatchSnapshot,
} from "@/lib/storage/jdMatchCurrentStorage";
import { readVisibleStorageValue } from "@/lib/storage/ownedSkillMintStorage";
import {
  TARGET_ROLE_SETUP_STORAGE_DESCRIPTOR,
} from "@/modules/onboarding/storage/targetRoleSetupStorage";
import {
  readActiveResumeReportSnapshot,
} from "@/modules/resume/services/activeResumeReportStorage";
import { buildOnboardingSteps } from "@/modules/onboarding/utils/onboardingProgress";
import type {
  OnboardingProgress,
  OnboardingStep,
} from "@/modules/onboarding/types";

export default function OnboardingChecklist() {
  const {
    user,
    isConfigured,
    isLoading: isAuthLoading,
  } = useAuthSession();
  const currentUserId = isAuthLoading ? undefined : user?.id ?? null;
  const storedResumeAnalysis = useSyncExternalStore(
    subscribeToStoredData,
    () => readStoredResumeAnalysis(currentUserId),
    getServerSnapshot,
  );
  const storedJobMatch = useSyncExternalStore(
    subscribeToStoredData,
    () => readStoredJobMatch(currentUserId),
    getServerSnapshot,
  );
  const storedTargetRoleSetup = useSyncExternalStore(
    subscribeToStoredData,
    () => readStoredTargetRoleSetup(currentUserId),
    getServerSnapshot,
  );
  const [isDismissed, setIsDismissed] = useState(false);
  const [hasOpenedCompletedChecklist, setHasOpenedCompletedChecklist] =
    useState(false);

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
  const isCoreLoopComplete =
    progress.hasTargetRoleSetup &&
    progress.hasResumeAnalysis &&
    progress.hasJobMatch &&
    progress.hasRoadmap;
  const shouldAutoHideCompletedChecklist =
    isCoreLoopComplete && !hasOpenedCompletedChecklist;

  function updateDismissed(value: boolean) {
    setOnboardingDismissed(value);
    setIsDismissed(value);
  }

  if (isDismissed || shouldAutoHideCompletedChecklist) {
    return (
      <button
        type="button"
        onClick={() => {
          setHasOpenedCompletedChecklist(true);
          updateDismissed(false);
        }}
        className={premiumSecondaryCta}
      >
        Show setup checklist
      </button>
    );
  }

  return (
    <section className={premiumSurface}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className={premiumEyebrow}>
            Your SkillMint setup
          </p>

          <h2 className="mt-4 text-2xl font-bold text-slate-950">
            Start with the next useful step
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
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
          onClick={() => {
            setHasOpenedCompletedChecklist(false);
            updateDismissed(true);
          }}
          className={premiumSecondaryCta}
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
        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">
          {index}
        </span>

        <span className={getStatusBadgeClassName(step.status)}>
          {formatStatus(step.status)}
        </span>
      </div>

      <h3 className="mt-4 text-base font-bold text-slate-950">
        {step.title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        {step.description}
      </p>

      {isLocked ? (
        <span className="mt-4 inline-flex rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-400">
          {step.cta}
        </span>
      ) : (
        <Link
          href={step.href}
          className="mt-4 inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900"
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
  const baseClassName = "min-w-0 rounded-2xl border p-4";

  if (status === "complete") {
    return `${baseClassName} border-emerald-200 bg-emerald-50`;
  }

  if (status === "active") {
    return `${baseClassName} border-sky-200 bg-sky-50`;
  }

  return `${baseClassName} border-slate-200 bg-slate-50`;
}

function getStatusBadgeClassName(status: OnboardingStep["status"]): string {
  const baseClassName =
    "rounded-full border px-2.5 py-1 text-xs font-semibold";

  if (status === "complete") {
    return `${baseClassName} border-emerald-200 bg-white text-emerald-800`;
  }

  if (status === "active") {
    return `${baseClassName} border-sky-200 bg-white text-sky-800`;
  }

  return `${baseClassName} border-slate-200 bg-white text-slate-500`;
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
  return subscribeToSkillMintWorkspaceUpdates(onStoreChange);
}

function readStoredResumeAnalysis(
  currentUserId: string | null | undefined,
): string | null {
  return readActiveResumeReportSnapshot({
    currentUserId,
  });
}

function readStoredJobMatch(
  currentUserId: string | null | undefined,
): string | null {
  return readCurrentJobMatchSnapshot({
    currentUserId,
  });
}

function readStoredTargetRoleSetup(
  currentUserId: string | null | undefined,
): string | null {
  return readVisibleStorageValue(TARGET_ROLE_SETUP_STORAGE_DESCRIPTOR, {
    currentUserId,
  });
}

function getServerSnapshot(): null {
  return null;
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
