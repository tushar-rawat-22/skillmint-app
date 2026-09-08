export type CandidateJob = {
  source: string;
  sourceKey: string;
  title: string;
  companyName: string | null;
  location: string | null;
  originalApplyUrl: string;
  sourceUpdatedAt: string | null;
  fetchedAt: string | null;
  availability: "available" | "unavailable";
  stale: boolean;
};

export type CandidateJobRequirement = {
  id: string;
  text: string;
  evidenceTerms: string[];
  importance?: "required" | "preferred";
};

export type ResumeEvidence = {
  id: string;
  label: string;
  text: string;
};

export type CandidateJobResult = {
  targetRole: string | null;
  job: Omit<CandidateJob, "availability" | "stale">;
  explanation: {
    whyShown: string;
    supportedRequirements: Array<{
      requirementId: string;
      requirement: string;
      importance: "required" | "preferred";
      evidence: ResumeEvidence[];
    }>;
    evidenceGaps: Array<{
      requirementId: string;
      requirement: string;
      importance: "required" | "preferred";
      state: "not_evidenced_in_resume";
    }>;
    coverage: {
      supportedCount: number;
      notEvidencedCount: number;
      totalRequirements: number;
    };
  };
  primaryAction: {
    kind: "open_original_job";
    label: "View original job";
    href: string;
  };
  trust: {
    source: string;
    sourceKey: string;
    disclaimer: string;
  };
};

type ExplainInput = {
  job: CandidateJob;
  requirements: CandidateJobRequirement[];
  resumeEvidence?: ResumeEvidence[];
  targetRole?: string | null;
  whyShown?: string | null;
};

type ExplainResult =
  | { ok: true; result: CandidateJobResult }
  | {
      ok: false;
      error: {
        kind:
          | "job_unavailable"
          | "invalid_job_provenance"
          | "invalid_apply_url"
          | "requirements_required"
          | "invalid_requirement"
          | "duplicate_requirement";
        requirementId?: string | null;
      };
    };

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function tokenize(value: unknown): string[] {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function containsPhrase(haystack: string, phrase: string): boolean {
  const normalizedPhrase = tokenize(phrase).join(" ");
  if (!normalizedPhrase) return false;
  return ` ${tokenize(haystack).join(" ")} `.includes(` ${normalizedPhrase} `);
}

function validateJob(job: CandidateJob): ExplainResult["error"] | null {
  if (job.availability !== "available" || job.stale) {
    return { kind: "job_unavailable" };
  }

  if (!normalizeText(job.source) || !normalizeText(job.sourceKey) || !normalizeText(job.title)) {
    return { kind: "invalid_job_provenance" };
  }

  try {
    const url = new URL(job.originalApplyUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return { kind: "invalid_apply_url" };
    }
  } catch {
    return { kind: "invalid_apply_url" };
  }

  return null;
}

function validateRequirements(
  requirements: CandidateJobRequirement[],
): ExplainResult["error"] | null {
  if (!Array.isArray(requirements) || requirements.length === 0) {
    return { kind: "requirements_required" };
  }

  const seen = new Set<string>();
  for (const requirement of requirements) {
    const id = normalizeText(requirement?.id);
    const text = normalizeText(requirement?.text);
    const evidenceTerms = Array.isArray(requirement?.evidenceTerms)
      ? requirement.evidenceTerms.map(normalizeText).filter(Boolean)
      : [];

    if (!id || !text || evidenceTerms.length === 0) {
      return { kind: "invalid_requirement", requirementId: id || null };
    }
    if (seen.has(id)) {
      return { kind: "duplicate_requirement", requirementId: id };
    }
    seen.add(id);
  }

  return null;
}

export function buildCandidateJobResult(input: ExplainInput): ExplainResult {
  const jobError = validateJob(input.job);
  if (jobError) return { ok: false, error: jobError };

  const requirementsError = validateRequirements(input.requirements);
  if (requirementsError) return { ok: false, error: requirementsError };

  const evidence = (input.resumeEvidence ?? [])
    .map((entry, index) => ({
      id: normalizeText(entry?.id) || `evidence-${index + 1}`,
      label: normalizeText(entry?.label) || "Resume evidence",
      text: normalizeText(entry?.text),
    }))
    .filter((entry) => entry.text);

  const mappedRequirements = input.requirements.map((requirement) => {
    const evidenceTerms = requirement.evidenceTerms.map(normalizeText).filter(Boolean);
    const matches = evidence.filter((entry) =>
      evidenceTerms.some((term) => containsPhrase(entry.text, term)),
    );

    return {
      requirementId: normalizeText(requirement.id),
      requirement: normalizeText(requirement.text),
      importance: requirement.importance === "preferred" ? "preferred" as const : "required" as const,
      evidenceState: matches.length > 0
        ? "supported_by_resume" as const
        : "not_evidenced_in_resume" as const,
      evidence: matches,
    };
  });

  const supported = mappedRequirements.filter(
    (entry) => entry.evidenceState === "supported_by_resume",
  );
  const notEvidenced = mappedRequirements.filter(
    (entry) => entry.evidenceState === "not_evidenced_in_resume",
  );

  const { job } = input;
  return {
    ok: true,
    result: {
      targetRole: normalizeText(input.targetRole) || null,
      job: {
        source: job.source,
        sourceKey: job.sourceKey,
        title: job.title,
        companyName: job.companyName,
        location: job.location,
        originalApplyUrl: job.originalApplyUrl,
        sourceUpdatedAt: job.sourceUpdatedAt,
        fetchedAt: job.fetchedAt,
      },
      explanation: {
        whyShown: normalizeText(input.whyShown) || (
          supported.length > 0
            ? `${supported.length} explicit job requirement${supported.length === 1 ? "" : "s"} have resume evidence.`
            : "No extracted job requirement has resume evidence yet; review the gaps before applying."
        ),
        supportedRequirements: supported.map((entry) => ({
          requirementId: entry.requirementId,
          requirement: entry.requirement,
          importance: entry.importance,
          evidence: entry.evidence,
        })),
        evidenceGaps: notEvidenced.map((entry) => ({
          requirementId: entry.requirementId,
          requirement: entry.requirement,
          importance: entry.importance,
          state: "not_evidenced_in_resume" as const,
        })),
        coverage: {
          supportedCount: supported.length,
          notEvidencedCount: notEvidenced.length,
          totalRequirements: mappedRequirements.length,
        },
      },
      primaryAction: {
        kind: "open_original_job",
        label: "View original job",
        href: job.originalApplyUrl,
      },
      trust: {
        source: job.source,
        sourceKey: job.sourceKey,
        disclaimer: "This explains resume evidence coverage only. It does not predict hiring, shortlist, interview, or offer outcomes.",
      },
    },
  };
}
