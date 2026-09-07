function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function tokenize(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function containsPhrase(haystack, phrase) {
  const normalizedPhrase = tokenize(phrase).join(" ");
  if (!normalizedPhrase) return false;
  return ` ${tokenize(haystack).join(" ")} `.includes(` ${normalizedPhrase} `);
}

function validateJob(job) {
  if (!job || job.availability !== "available" || job.stale === true) {
    return { ok: false, error: { kind: "job_unavailable" } };
  }

  if (!normalizeText(job.source) || !normalizeText(job.sourceKey) || !normalizeText(job.title)) {
    return { ok: false, error: { kind: "invalid_job_provenance" } };
  }

  try {
    const url = new URL(job.originalApplyUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return { ok: false, error: { kind: "invalid_apply_url" } };
    }
  } catch {
    return { ok: false, error: { kind: "invalid_apply_url" } };
  }

  return { ok: true };
}

function validateRequirements(requirements) {
  if (!Array.isArray(requirements) || requirements.length === 0) {
    return { ok: false, error: { kind: "requirements_required" } };
  }

  const seen = new Set();
  for (const requirement of requirements) {
    const id = normalizeText(requirement?.id);
    const text = normalizeText(requirement?.text);
    const evidenceTerms = Array.isArray(requirement?.evidenceTerms)
      ? requirement.evidenceTerms.map(normalizeText).filter(Boolean)
      : [];

    if (!id || !text || evidenceTerms.length === 0) {
      return { ok: false, error: { kind: "invalid_requirement", requirementId: id || null } };
    }
    if (seen.has(id)) {
      return { ok: false, error: { kind: "duplicate_requirement", requirementId: id } };
    }
    seen.add(id);
  }

  return { ok: true };
}

function normalizeEvidence(resumeEvidence) {
  if (!Array.isArray(resumeEvidence)) return [];
  return resumeEvidence
    .map((entry, index) => ({
      id: normalizeText(entry?.id) || `evidence-${index + 1}`,
      label: normalizeText(entry?.label) || "Resume evidence",
      text: normalizeText(entry?.text),
    }))
    .filter((entry) => entry.text);
}

export function explainJobFit({ job, requirements, resumeEvidence = [], targetRole = null }) {
  const jobValidation = validateJob(job);
  if (!jobValidation.ok) return jobValidation;

  const requirementsValidation = validateRequirements(requirements);
  if (!requirementsValidation.ok) return requirementsValidation;

  const evidence = normalizeEvidence(resumeEvidence);
  const mappedRequirements = requirements.map((requirement) => {
    const evidenceTerms = requirement.evidenceTerms.map(normalizeText).filter(Boolean);
    const matches = evidence.filter((entry) =>
      evidenceTerms.some((term) => containsPhrase(entry.text, term)),
    );

    return {
      requirementId: normalizeText(requirement.id),
      requirement: normalizeText(requirement.text),
      importance: requirement.importance === "preferred" ? "preferred" : "required",
      evidenceState: matches.length > 0 ? "supported_by_resume" : "not_evidenced_in_resume",
      evidence: matches.map((entry) => ({ id: entry.id, label: entry.label, text: entry.text })),
    };
  });

  const supported = mappedRequirements.filter((entry) => entry.evidenceState === "supported_by_resume");
  const notEvidenced = mappedRequirements.filter((entry) => entry.evidenceState === "not_evidenced_in_resume");

  return {
    ok: true,
    result: {
      job: {
        source: job.source,
        sourceKey: job.sourceKey,
        title: job.title,
        companyName: job.companyName ?? null,
        location: job.location ?? null,
        originalApplyUrl: job.originalApplyUrl,
        sourceUpdatedAt: job.sourceUpdatedAt ?? null,
        fetchedAt: job.fetchedAt ?? null,
      },
      targetRole: normalizeText(targetRole) || null,
      requirements: mappedRequirements,
      summary: {
        supportedCount: supported.length,
        notEvidencedCount: notEvidenced.length,
        totalRequirements: mappedRequirements.length,
      },
      whyShown: supported.length > 0
        ? `${supported.length} requirement${supported.length === 1 ? "" : "s"} have resume evidence.`
        : "No listed requirement has resume evidence yet; review the gaps before applying.",
      disclaimer: "This explains resume evidence coverage only. It does not predict hiring, shortlist, interview, or offer outcomes.",
    },
  };
}
