import type { ProofScoreResult } from "@/intelligence/proof";

type ProofConfidenceExplainerProps = {
  proof: ProofScoreResult;
  projectCount: number;
  hasMeasurableImpact?: boolean;
  className?: string;
};

export default function ProofConfidenceExplainer({
  proof,
  projectCount,
  hasMeasurableImpact = false,
  className = "",
}: ProofConfidenceExplainerProps) {
  const positiveSignals = [
    proof.evidenceBackedSkills.length > 0
      ? `${proof.evidenceBackedSkills.length} evidence-backed ${pluralize(
        "skill",
        proof.evidenceBackedSkills.length,
      )}`
      : null,
    proof.weaklySupportedSkills.length > 0
      ? `${proof.weaklySupportedSkills.length} weakly supported ${pluralize(
        "skill",
        proof.weaklySupportedSkills.length,
      )}`
      : null,
    proof.extractedProofLinks.length > 0
      ? `${proof.extractedProofLinks.length} proof link ${pluralize(
        "candidate",
        proof.extractedProofLinks.length,
      )}`
      : null,
    projectCount > 0
      ? `${projectCount} ${pluralize("project", projectCount)} detected`
      : null,
  ].filter((item): item is string => Boolean(item));
  const trustLimits = [
    proof.evidenceBackedSkills.length === 0
      ? "0 evidence-backed skills"
      : null,
    proof.unverifiedSkills.length > 0
      ? `${proof.unverifiedSkills.length} unverified claimed ${pluralize(
        "skill",
        proof.unverifiedSkills.length,
      )}`
      : null,
    hasMeasurableImpact ? null : "Weak measurable outcomes",
    "Evidence candidates are not externally verified yet",
  ].filter((item): item is string => Boolean(item));

  return (
    <section className={`rounded-3xl border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${className}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-300/80">
            Why this Proof Confidence?
          </p>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
            Proof Confidence checks how much your resume claims are supported
            by evidence candidates like projects, links, measurable outcomes,
            and public proof.
          </p>
        </div>

        <span className="w-fit rounded-full border border-violet-400/25 bg-violet-400/10 px-3 py-1 text-xs font-bold text-violet-100">
          Missing proof means unverified, not false
        </span>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <ExplanationBlock
          title="Positive signals"
          items={positiveSignals.length
            ? positiveSignals
            : ["No strong positive proof signals detected yet."]}
        />

        <ExplanationBlock
          title="Trust limits"
          items={trustLimits}
        />

        <article className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">
            Next move
          </p>

          <p className="mt-3 text-sm leading-6 text-gray-200">
            {proof.nextProofMove}
          </p>
        </article>
      </div>

      <p className="mt-4 text-xs leading-5 text-gray-500">
        SkillMint has not scanned GitHub, LinkedIn, LeetCode, or portfolio
        pages externally yet. Links are evidence candidates, not verified
        sources.
      </p>
    </section>
  );
}

function pluralize(label: string, count: number): string {
  return count === 1 ? label : `${label}s`;
}

type ExplanationBlockProps = {
  title: string;
  items: string[];
};

function ExplanationBlock({
  title,
  items,
}: ExplanationBlockProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">
        {title}
      </p>

      <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-200">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-2"
          >
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300/80" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
