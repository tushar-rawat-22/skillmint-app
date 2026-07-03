"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";
import type { ResumeAnalysisResult } from "@/lib/resume/analyzeResume";
import type { UserProfile } from "@/intelligence/types/profile";

const RESUME_ANALYSIS_STORAGE_KEY = "skillmint:resume-analysis";

type ResumeAnalysisView = Omit<
  ResumeAnalysisResult,
  "parsedProfile" | "userProfile"
> & {
  parsedProfile: ResumeAnalysisResult["parsedProfile"];
  userProfile?: UserProfile;
};

const EMPTY_PARSED_PROFILE: ResumeAnalysisResult["parsedProfile"] = {
  skills: [],
  projects: [],
  education: [],
  experience: [],
  certifications: [],
  links: {},
  rawSections: {},
};

const LINK_LABELS = {
  github: "GitHub",
  linkedin: "LinkedIn",
  portfolio: "Portfolio",
  leetcode: "LeetCode",
  codeforces: "Codeforces",
  email: "Email",
  phone: "Phone",
} satisfies Record<
  keyof ResumeAnalysisResult["parsedProfile"]["links"],
  string
>;

export default function ResumePage() {
  const storedAnalysis = useSyncExternalStore(
    subscribeToStoredAnalysis,
    readStoredAnalysis,
    getServerSnapshot,
  );
  const analysis = useMemo(
    () => parseStoredAnalysis(storedAnalysis),
    [storedAnalysis],
  );

  if (!analysis) {
    return (
      <DashboardLayout>
        <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-green-400">
            Resume Intelligence
          </p>

          <h1 className="mt-5 text-4xl font-black md:text-5xl">
            No resume analysis yet
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-400">
            Upload a resume to create your latest SkillMint extraction
            snapshot.
          </p>

          <Link
            href="/upload"
            className="mt-8 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-500"
          >
            Upload Resume
          </Link>
        </section>
      </DashboardLayout>
    );
  }

  const extractedTextPreview = getExtractedTextPreview(
    analysis.extractedText,
  );

  return (
    <DashboardLayout>
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-green-400">
              Resume Intelligence
            </p>

            <h1 className="mt-4 text-4xl font-black md:text-5xl">
              Latest Resume Analysis
            </h1>

            <p className="mt-4 max-w-2xl text-gray-400">
              A safe extraction snapshot from your most recent upload.
            </p>
          </div>

          <Link
            href="/upload"
            className="rounded-xl border border-gray-700 px-5 py-3 text-sm font-semibold text-gray-100 transition hover:border-green-500 hover:text-green-300"
          >
            Upload Another
          </Link>
        </div>

        <section className="mt-10 grid gap-4 md:grid-cols-4">
          <SummaryItem
            label="File"
            value={analysis.fileName}
          />

          <SummaryItem
            label="Size"
            value={formatFileSize(analysis.fileSize)}
          />

          <SummaryItem
            label="Analyzed"
            value={formatAnalyzedDate(analysis.analyzedAt)}
          />

          <SummaryItem
            label="Status"
            value={formatStatus(analysis.status)}
          />
        </section>

        <ParsedResumeSections profile={analysis.parsedProfile} />

        {analysis.userProfile && (
          <CareerIntelligenceReady
            profile={analysis.userProfile}
          />
        )}

        <section className="mt-6 rounded-lg border border-gray-800 bg-neutral-900 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">
                Extracted Text Preview
              </h2>

              <p className="mt-1 text-sm text-gray-400">
                {analysis.fileType}
              </p>
            </div>

            <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-300">
              {formatStatus(analysis.status)}
            </span>
          </div>

          <pre className="mt-6 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/40 p-5 text-sm leading-7 text-gray-200">
            {extractedTextPreview}
          </pre>
        </section>
      </section>
    </DashboardLayout>
  );
}

type CareerIntelligenceReadyProps = {
  profile: UserProfile;
};

function CareerIntelligenceReady({
  profile,
}: CareerIntelligenceReadyProps) {
  const scores = [
    {
      label: "Resume Score",
      value: `${profile.resumeScore}/20`,
    },
    {
      label: "Skills Score",
      value: `${profile.skillsScore}/15`,
    },
    {
      label: "Projects Score",
      value: `${profile.projectsScore}/15`,
    },
    {
      label: "Experience Score",
      value: `${profile.experienceScore}/12`,
    },
    {
      label: "Education Score",
      value: `${profile.educationScore}/10`,
    },
    {
      label: "ATS Base Score",
      value: `${profile.atsScore}/5`,
    },
    {
      label: "Recruiter Base Score",
      value: `${profile.recruiterScore}/5`,
    },
  ];

  return (
    <section className="mt-6 rounded-lg border border-green-500/30 bg-green-500/10 p-6">
      <div>
        <h2 className="text-xl font-bold">
          Career Intelligence Ready
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-green-100/80">
          This is a rule-based first pass. Full AI explanation and
          job-description ATS matching will come later.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {scores.map((score) => (
          <article
            key={score.label}
            className="rounded-lg border border-green-500/20 bg-black/25 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-200/60">
              {score.label}
            </p>

            <p className="mt-2 text-2xl font-bold text-white">
              {score.value}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

type ParsedResumeSectionsProps = {
  profile: ResumeAnalysisResult["parsedProfile"];
};

function ParsedResumeSections({
  profile,
}: ParsedResumeSectionsProps) {
  const links = getVisibleLinks(profile.links);

  return (
    <section className="mt-6 rounded-lg border border-gray-800 bg-neutral-900 p-6">
      <div>
        <h2 className="text-xl font-bold">
          Parsed Resume Sections
        </h2>

        <p className="mt-1 text-sm text-gray-400">
          Rule-based signals detected from your extracted resume text.
        </p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <SectionPanel title="Skills">
          {profile.skills.length ? (
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-sm font-semibold text-green-200"
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <EmptyDetection />
          )}
        </SectionPanel>

        <SectionPanel title="Links">
          {links.length ? (
            <div className="flex flex-wrap gap-2">
              {links.map((link) => (
                <a
                  key={`${link.label}-${link.value}`}
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noreferrer" : undefined}
                  className="rounded-full border border-gray-700 px-3 py-1 text-sm font-semibold text-gray-200 transition hover:border-green-500 hover:text-green-300"
                >
                  {link.label}
                </a>
              ))}
            </div>
          ) : (
            <EmptyDetection />
          )}
        </SectionPanel>

        <SectionPanel title="Projects">
          <ParsedList items={profile.projects} />
        </SectionPanel>

        <SectionPanel title="Experience">
          <ParsedList items={profile.experience} />
        </SectionPanel>

        <SectionPanel title="Education">
          <ParsedList items={profile.education} />
        </SectionPanel>

        <SectionPanel title="Certifications">
          <ParsedList items={profile.certifications} />
        </SectionPanel>
      </div>
    </section>
  );
}

type SectionPanelProps = {
  title: string;
  children: React.ReactNode;
};

function SectionPanel({
  title,
  children,
}: SectionPanelProps) {
  return (
    <article className="min-w-0 rounded-lg border border-gray-800 bg-black/30 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
        {title}
      </h3>

      <div className="mt-4">
        {children}
      </div>
    </article>
  );
}

type ParsedListProps = {
  items: string[];
};

function ParsedList({ items }: ParsedListProps) {
  if (!items.length) {
    return <EmptyDetection />;
  }

  return (
    <ul className="space-y-3 text-sm leading-6 text-gray-200">
      {items.map((item) => (
        <li
          key={item}
          className="break-words border-l border-green-500/40 pl-3"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function EmptyDetection() {
  return (
    <p className="text-sm text-gray-500">
      Not detected yet
    </p>
  );
}

type SummaryItemProps = {
  label: string;
  value: string;
};

function SummaryItem({
  label,
  value,
}: SummaryItemProps) {
  return (
    <article className="min-w-0 rounded-lg border border-gray-800 bg-neutral-900 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
        {label}
      </p>

      <p className="mt-3 break-words text-lg font-bold text-white">
        {value}
      </p>
    </article>
  );
}

function getExtractedTextPreview(extractedText: string): string {
  const normalizedText = extractedText.trim();

  if (!normalizedText) {
    return "No extracted text was returned for this resume.";
  }

  if (normalizedText.length <= 900) {
    return normalizedText;
  }

  return `${normalizedText.slice(0, 900)}...`;
}

function formatFileSize(fileSize: number): string {
  return `${(fileSize / 1024 / 1024).toFixed(2)} MB`;
}

function formatAnalyzedDate(analyzedAt: string): string {
  const date = new Date(analyzedAt);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatStatus(status: string): string {
  return status
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function isResumeAnalysisResult(
  value: unknown,
): value is ResumeAnalysisView {
  if (!value || typeof value !== "object") {
    return false;
  }

  const analysis = value as Record<string, unknown>;

  return (
    typeof analysis.fileName === "string" &&
    typeof analysis.fileType === "string" &&
    typeof analysis.fileSize === "number" &&
    typeof analysis.extractedText === "string" &&
    isParsedResumeProfile(analysis.parsedProfile) &&
    isUserProfile(analysis.userProfile) &&
    typeof analysis.analyzedAt === "string" &&
    typeof analysis.status === "string"
  );
}

function isLegacyResumeAnalysisResult(
  value: unknown,
): value is Omit<
  ResumeAnalysisView,
  "parsedProfile" | "userProfile"
> & {
  parsedProfile?: ResumeAnalysisResult["parsedProfile"];
} {
  if (!value || typeof value !== "object") {
    return false;
  }

  const analysis = value as Record<string, unknown>;

  return (
    typeof analysis.fileName === "string" &&
    typeof analysis.fileType === "string" &&
    typeof analysis.fileSize === "number" &&
    typeof analysis.extractedText === "string" &&
    typeof analysis.analyzedAt === "string" &&
    typeof analysis.status === "string"
  );
}

function isParsedResumeProfile(
  value: unknown,
): value is ResumeAnalysisResult["parsedProfile"] {
  if (!value || typeof value !== "object") {
    return false;
  }

  const profile = value as Record<string, unknown>;

  return (
    isStringArray(profile.skills) &&
    isStringArray(profile.projects) &&
    isStringArray(profile.education) &&
    isStringArray(profile.experience) &&
    isStringArray(profile.certifications) &&
    isRecord(profile.links) &&
    isRecord(profile.rawSections)
  );
}

function isUserProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const profile = value as Record<string, unknown>;

  return (
    isNumber(profile.resumeScore) &&
    isNumber(profile.skillsScore) &&
    isNumber(profile.projectsScore) &&
    isNumber(profile.experienceScore) &&
    isNumber(profile.educationScore) &&
    isNumber(profile.githubScore) &&
    isNumber(profile.linkedinScore) &&
    isNumber(profile.atsScore) &&
    isNumber(profile.recruiterScore) &&
    isNumber(profile.activityScore) &&
    isStringArray(profile.skills) &&
    isStringArray(profile.projects) &&
    isStringArray(profile.experience) &&
    typeof profile.education === "string" &&
    Array.isArray(profile.certifications) &&
    Array.isArray(profile.codingProfiles)
  );
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) &&
    value.every((item) => typeof item === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" &&
    !Array.isArray(value);
}

function subscribeToStoredAnalysis(
  onStoreChange: () => void,
): () => void {
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
  };
}

function readStoredAnalysis(): string | null {
  return localStorage.getItem(RESUME_ANALYSIS_STORAGE_KEY);
}

function getServerSnapshot(): null {
  return null;
}

function parseStoredAnalysis(
  storedAnalysis: string | null,
): ResumeAnalysisView | null {
  if (!storedAnalysis) {
    return null;
  }

  try {
    const parsedAnalysis = JSON.parse(storedAnalysis);

    if (isResumeAnalysisResult(parsedAnalysis)) {
      return parsedAnalysis;
    }

    if (isLegacyResumeAnalysisResult(parsedAnalysis)) {
      return {
        ...parsedAnalysis,
        parsedProfile: isParsedResumeProfile(
          parsedAnalysis.parsedProfile,
        )
          ? parsedAnalysis.parsedProfile
          : EMPTY_PARSED_PROFILE,
      };
    }

    return null;
  } catch {
    return null;
  }
}

type VisibleLink = {
  label: string;
  value: string;
  href: string;
  external: boolean;
};

function getVisibleLinks(
  links: ResumeAnalysisResult["parsedProfile"]["links"],
): VisibleLink[] {
  return Object.entries(LINK_LABELS).flatMap(([key, label]) => {
    const linkKey =
      key as keyof ResumeAnalysisResult["parsedProfile"]["links"];
    const value = links[linkKey];

    if (!value) {
      return [];
    }

    return [
      {
        label,
        value,
        href: getLinkHref(linkKey, value),
        external: linkKey !== "email" && linkKey !== "phone",
      },
    ];
  });
}

function getLinkHref(
  key: keyof ResumeAnalysisResult["parsedProfile"]["links"],
  value: string,
): string {
  if (key === "email") {
    return `mailto:${value}`;
  }

  if (key === "phone") {
    return `tel:${value.replace(/[^\d+]/g, "")}`;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://${value}`;
}
