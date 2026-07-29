import type {
  ResumeComparisonCountDifference,
  ResumeComparisonEvidenceState,
  ResumeComparisonFlagType,
  ResumeComparisonLinkType,
  ResumeComparisonSignalDifference,
  ResumeEvidenceComparison,
} from "@/modules/resume";
import {
  premiumInsetSurface,
  premiumSecondaryCta,
  premiumSurface,
} from "@/components/ui/premium";

const LINK_LABELS: Record<ResumeComparisonLinkType, string> = {
  github: "GitHub",
  linkedin: "LinkedIn",
  portfolio: "Portfolio",
  leetcode: "LeetCode",
  codeforces: "Codeforces",
};

const FLAG_LABELS: Record<ResumeComparisonFlagType, string> = {
  hasMeasurableImpact: "Measurable impact evidence",
  hasSectionClarity: "Section clarity",
  hasProofLink: "Proof-link evidence",
  hasGenericProjects: "Generic project wording",
};

type ResumeComparisonViewProps = {
  comparison: ResumeEvidenceComparison;
  isRefreshing: boolean;
  onRefresh: () => void;
};

export default function ResumeComparisonView({
  comparison,
  isRefreshing,
  onRefresh,
}: ResumeComparisonViewProps) {
  if (comparison.status === "unusable_evidence") {
    return (
      <section
        aria-labelledby="comparison-unusable-heading"
        className={premiumSurface}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
          Unusable evidence
        </p>
        <h2
          id="comparison-unusable-heading"
          className="mt-2 text-2xl font-black text-slate-950"
        >
          This comparison cannot be shown
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          One or both saved reports contain placeholder evidence. The selected
          sources remain available so you can replace either one.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="comparison-results-heading"
      className="space-y-6"
    >
      <div className={premiumSurface}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Evidence comparison
            </p>
            <h2
              id="comparison-results-heading"
              className="mt-2 text-2xl font-black text-slate-950"
            >
              Saved report evidence
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              A difference means the saved reports detected different resume
              evidence. It does not prove that a person gained or lost a
              skill.
            </p>
          </div>

          <button
            type="button"
            className={premiumSecondaryCta}
            disabled={isRefreshing}
            onClick={onRefresh}
          >
            {isRefreshing ? "Refreshing comparison" : "Refresh comparison"}
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <SourceContextCard label="Source A" source={comparison.sourceA} />
          <SourceContextCard label="Source B" source={comparison.sourceB} />
        </div>
      </div>

      <section aria-labelledby="skills-heading" className={premiumSurface}>
        <h3 id="skills-heading" className="text-xl font-black text-slate-950">
          Skills
        </h3>

        {comparison.skills.status === "unavailable" ? (
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Skill evidence is unavailable for one or both sources.
          </p>
        ) : (
          <>
            {comparison.skills.truncated && (
              <p
                role="status"
                className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
              >
                Showing up to 100 items per skill group. Additional detected
                differences are not displayed.
              </p>
            )}
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <EvidenceList
                heading="Detected in both"
                items={comparison.skills.retained}
              />
              <EvidenceList
                heading="Detected only in Source A"
                items={comparison.skills.onlyInSourceA}
              />
              <EvidenceList
                heading="Detected only in Source B"
                items={comparison.skills.onlyInSourceB}
              />
            </div>
          </>
        )}
      </section>

      <section aria-labelledby="counts-heading" className={premiumSurface}>
        <h3 id="counts-heading" className="text-xl font-black text-slate-950">
          Detected entry counts
        </h3>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <CountCard
            comparison={comparison.counts.projects}
            label="Projects"
            singularLabel="project entry"
          />
          <CountCard
            comparison={comparison.counts.experience}
            label="Experience"
            singularLabel="experience entry"
          />
          <CountCard
            comparison={comparison.counts.certifications}
            label="Certifications"
            singularLabel="certification entry"
          />
        </div>
      </section>

      <section aria-labelledby="links-heading" className={premiumSurface}>
        <h3 id="links-heading" className="text-xl font-black text-slate-950">
          Link-category signals
        </h3>
        <SignalGrid
          entries={Object.entries(comparison.links) as Array<
            [ResumeComparisonLinkType, ResumeComparisonSignalDifference]
          >}
          getLabel={(key) => LINK_LABELS[key]}
        />
      </section>

      <section aria-labelledby="flags-heading" className={premiumSurface}>
        <h3 id="flags-heading" className="text-xl font-black text-slate-950">
          Evidence signals
        </h3>
        <SignalGrid
          entries={Object.entries(comparison.flags) as Array<
            [ResumeComparisonFlagType, ResumeComparisonSignalDifference]
          >}
          getLabel={(key) => FLAG_LABELS[key]}
        />
      </section>
    </section>
  );
}

function SourceContextCard({
  label,
  source,
}: {
  label: "Source A" | "Source B";
  source: ResumeEvidenceComparison["sourceA"];
}) {
  return (
    <article className={premiumInsetSurface}>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
        {label}
      </p>
      <p className="mt-2 break-words text-base font-bold text-slate-950">
        {source.fileName}
      </p>
      <p className="mt-2 text-sm text-slate-600">
        Saved date:{" "}
        <time dateTime={source.savedAt}>
          {formatSavedDate(source.savedAt)}
        </time>
      </p>
      <p className="mt-1 text-sm text-slate-600">
        Analysis version was not recorded.
      </p>
    </article>
  );
}

function EvidenceList({
  heading,
  items,
}: {
  heading: string;
  items: string[];
}) {
  return (
    <article className={premiumInsetSurface}>
      <h4 className="font-bold text-slate-950">{heading}</h4>
      {items.length ? (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li
              key={item}
              className="break-words rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-500">None detected.</p>
      )}
    </article>
  );
}

function CountCard({
  comparison,
  label,
  singularLabel,
}: {
  comparison: ResumeComparisonCountDifference;
  label: string;
  singularLabel: string;
}) {
  if (comparison.status === "unavailable") {
    return (
      <article className={premiumInsetSurface}>
        <h4 className="font-bold text-slate-950">{label}</h4>
        <p className="mt-3 text-sm text-slate-600">Unavailable.</p>
      </article>
    );
  }

  return (
    <article className={premiumInsetSurface}>
      <h4 className="font-bold text-slate-950">{label}</h4>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-slate-500">Source A</dt>
          <dd className="mt-1 text-lg font-black text-slate-950">
            {comparison.sourceA}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Source B</dt>
          <dd className="mt-1 text-lg font-black text-slate-950">
            {comparison.sourceB}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        {formatCountDifference(comparison.delta, singularLabel)}
      </p>
    </article>
  );
}

function SignalGrid<T extends string>({
  entries,
  getLabel,
}: {
  entries: Array<[T, ResumeComparisonSignalDifference]>;
  getLabel: (key: T) => string;
}) {
  return (
    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {entries.map(([key, signal]) => (
        <article key={key} className={premiumInsetSurface}>
          <h4 className="font-bold text-slate-950">{getLabel(key)}</h4>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-slate-500">Source A</dt>
              <dd className="mt-1 font-semibold text-slate-800">
                {formatEvidenceState(signal.sourceA)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Source B</dt>
              <dd className="mt-1 font-semibold text-slate-800">
                {formatEvidenceState(signal.sourceB)}
              </dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}

function formatCountDifference(delta: number, singularLabel: string): string {
  if (delta === 0) {
    return "Both sources contain the same detected entry count.";
  }

  const amount = Math.abs(delta);
  const label = amount === 1 ? singularLabel : `${singularLabel}s`;
  return delta > 0
    ? `Source B contains ${amount} more detected ${label}.`
    : `Source A contains ${amount} more detected ${label}.`;
}

function formatEvidenceState(state: ResumeComparisonEvidenceState): string {
  if (state === "detected") {
    return "Detected";
  }
  if (state === "not_detected") {
    return "Not detected";
  }
  return "Unavailable";
}

function formatSavedDate(value: string): string {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return "Unavailable";
  }
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}
