"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useSyncExternalStore } from "react";

import {
  premiumPrimaryCta,
  premiumSecondaryCta,
} from "@/components/ui/premium";
import { ROUTES } from "@/constants/routes";
import {
  readCurrentJobMatchSnapshot,
} from "@/lib/storage/jdMatchCurrentStorage";
import { readVisibleStorageValue } from "@/lib/storage/ownedSkillMintStorage";
import { subscribeToSkillMintWorkspaceUpdates } from "@/lib/storage/skillMintStorageEvents";
import type { CareerLoopStage } from "@/modules/activation/types";
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import {
  TARGET_ROLE_SETUP_STORAGE_DESCRIPTOR,
} from "@/modules/onboarding/storage/targetRoleSetupStorage";
import {
  readActiveResumeReportSnapshot,
} from "@/modules/resume/services/activeResumeReportStorage";

type CareerLoopProgress = {
  hasSetup: boolean;
  hasResumeAnalysis: boolean;
  hasJobMatch: boolean;
  hasRoadmap: boolean;
};

type NextAction = {
  stage: CareerLoopStage;
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  cta: string;
};

type NextBestActionPanelProps = {
  className?: string;
};

export default function NextBestActionPanel({
  className = "",
}: NextBestActionPanelProps) {
  const pathname = usePathname();
  const {
    user,
    isLoading: isAuthLoading,
  } = useAuthSession();
  const currentUserId = isAuthLoading ? undefined : user?.id ?? null;
  const storedSetup = useSyncExternalStore(
    subscribeToStoredData,
    () => readStoredSetup(currentUserId),
    getServerSnapshot,
  );
  const storedResume = useSyncExternalStore(
    subscribeToStoredData,
    () => readStoredResume(currentUserId),
    getServerSnapshot,
  );
  const storedJobMatch = useSyncExternalStore(
    subscribeToStoredData,
    () => readStoredJobMatch(currentUserId),
    getServerSnapshot,
  );
  const progress = useMemo<CareerLoopProgress>(() => ({
    hasSetup: hasValidSetup(storedSetup),
    hasResumeAnalysis: hasValidResume(storedResume),
    hasJobMatch: hasValidJobMatch(storedJobMatch),
    hasRoadmap: hasValidRoadmap(storedJobMatch),
  }), [storedJobMatch, storedResume, storedSetup]);
  const action = getNextAction(progress);
  const isCurrentPage = pathname === action.href;

  return (
    <article className={`rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-slate-950 shadow-[0_10px_30px_rgba(15,23,42,0.05)] ${className}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
            {action.eyebrow}
          </p>

          <h2 className="mt-2 text-lg font-bold text-slate-950">
            {action.title}
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
            {action.body}
          </p>
        </div>

        {isCurrentPage ? (
          <span className={`${premiumSecondaryCta} w-fit`}>
            You are here
          </span>
        ) : (
          <Link
            href={action.href}
            className={`${premiumPrimaryCta} w-fit`}
          >
            {action.cta}
          </Link>
        )}
      </div>
    </article>
  );
}

function getNextAction(progress: CareerLoopProgress): NextAction {
  if (!progress.hasSetup) {
    return {
      stage: "setup",
      eyebrow: "Start here",
      title: "Choose your career direction.",
      body:
        "Pick your field, role, level, goal, and weekly pace before SkillMint reads your resume proof.",
      href: ROUTES.SETUP,
      cta: "Choose direction",
    };
  }

  if (!progress.hasResumeAnalysis) {
    return {
      stage: "resume",
      eyebrow: "Next best action",
      title: "Upload your resume proof.",
      body:
        "SkillMint needs your resume before it can show proof gaps, readiness, or job-specific matches.",
      href: ROUTES.UPLOAD,
      cta: "Upload resume",
    };
  }

  if (!progress.hasJobMatch) {
    return {
      stage: "job_match",
      eyebrow: "Continue your career loop",
      title: "Match one real job.",
      body:
        "Paste one job description to see where your resume is competitive and what proof is missing.",
      href: ROUTES.ATS,
      cta: "Match one job",
    };
  }

  if (!progress.hasRoadmap) {
    return {
      stage: "roadmap",
      eyebrow: "Next best action",
      title: "Build your next 30 days.",
      body:
        "Turn your resume proof and latest job match into a practical 30/60/90-day roadmap.",
      href: ROUTES.ROADMAP,
      cta: "Open roadmap",
    };
  }

  return {
    stage: "improve",
    eyebrow: "Keep improving",
    title: "Improve proof, then match another job.",
    body:
      "Use the roadmap to strengthen project proof, update your resume, and compare the next real role.",
    href: ROUTES.RESUME,
    cta: "Review proof",
  };
}

function subscribeToStoredData(onStoreChange: () => void): () => void {
  return subscribeToSkillMintWorkspaceUpdates(onStoreChange);
}

function readStoredSetup(
  currentUserId: string | null | undefined,
): string | null {
  return readVisibleStorageValue(TARGET_ROLE_SETUP_STORAGE_DESCRIPTOR, {
    currentUserId,
  });
}

function readStoredResume(
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

function getServerSnapshot(): null {
  return null;
}
function hasValidSetup(storedValue: string | null): boolean {
  const parsedValue = parseRecord(storedValue);

  return Boolean(
    parsedValue &&
      typeof parsedValue.targetRole === "string" &&
      parsedValue.targetRole.trim().length > 0,
  );
}

function hasValidResume(storedValue: string | null): boolean {
  const parsedValue = parseRecord(storedValue);

  return Boolean(
    parsedValue &&
      (
        typeof parsedValue.extractedText === "string" ||
        isRecord(parsedValue.userProfile) ||
        isRecord(parsedValue.parsedProfile)
      ),
  );
}

function hasValidJobMatch(storedValue: string | null): boolean {
  const parsedValue = parseRecord(storedValue);

  return Boolean(
    parsedValue &&
      isRecord(parsedValue.result) &&
      typeof parsedValue.result.matchScore === "number",
  );
}

function hasValidRoadmap(storedValue: string | null): boolean {
  const parsedValue = parseRecord(storedValue);

  return Boolean(parsedValue && isRecord(parsedValue.roadmap));
}

function parseRecord(storedValue: string | null): Record<string, unknown> | null {
  if (!storedValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(storedValue);

    return isRecord(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" &&
    !Array.isArray(value);
}
