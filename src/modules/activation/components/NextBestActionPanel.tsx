"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useSyncExternalStore } from "react";

import { ROUTES } from "@/constants/routes";
import { subscribeToSkillMintWorkspaceUpdates } from "@/lib/storage/skillMintStorageEvents";
import type { CareerLoopStage } from "@/modules/activation/types";

const TARGET_ROLE_SETUP_STORAGE_KEY = "skillmint:target-role-setup";
const RESUME_ANALYSIS_STORAGE_KEY = "skillmint:resume-analysis";
const JD_MATCH_STORAGE_KEY = "skillmint:jd-match";

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
  const storedSetup = useSyncExternalStore(
    subscribeToStoredData,
    readStoredSetup,
    getServerSnapshot,
  );
  const storedResume = useSyncExternalStore(
    subscribeToStoredData,
    readStoredResume,
    getServerSnapshot,
  );
  const storedJobMatch = useSyncExternalStore(
    subscribeToStoredData,
    readStoredJobMatch,
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
    <article className={`rounded-2xl border border-emerald-400/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.11),rgba(15,23,42,0.74))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${className}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-400">
            {action.eyebrow}
          </p>

          <h2 className="mt-2 text-lg font-bold text-white">
            {action.title}
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
            {action.body}
          </p>
        </div>

        {isCurrentPage ? (
          <span className="w-fit rounded-xl border border-green-500/30 bg-green-500/10 px-5 py-3 text-sm font-semibold text-green-200">
            You are here
          </span>
        ) : (
          <Link
            href={action.href}
            className="w-fit rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300"
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

function readStoredSetup(): string | null {
  return getBrowserStorage()?.getItem(TARGET_ROLE_SETUP_STORAGE_KEY) ?? null;
}

function readStoredResume(): string | null {
  return getBrowserStorage()?.getItem(RESUME_ANALYSIS_STORAGE_KEY) ?? null;
}

function readStoredJobMatch(): string | null {
  return getBrowserStorage()?.getItem(JD_MATCH_STORAGE_KEY) ?? null;
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
