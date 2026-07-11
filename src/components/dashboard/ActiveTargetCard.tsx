import Link from "next/link";

import {
  premiumBadge,
  premiumCompactSurface,
  premiumEyebrow,
  premiumSecondaryCta,
} from "@/components/ui/premium";
import type { ActiveTargetEngineResult } from "@/intelligence/target";
import { getActiveTargetSourceLabel } from "@/intelligence/target";

type ActiveTargetCardProps = {
  result: ActiveTargetEngineResult;
};

export default function ActiveTargetCard({ result }: ActiveTargetCardProps) {
  const target = result.activeTarget;

  if (!target) {
    return (
      <section className={premiumCompactSurface}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className={premiumEyebrow}>
              Active Target
            </p>

            <h2 className="mt-2 text-xl font-black text-slate-950">
              No Active Target yet
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Set one target so SkillMint can focus your missions and roadmap.
              Active Target focuses next actions. It does not change your core
              scores.
            </p>
          </div>

          <Link
            href="/ats"
            className={premiumSecondaryCta}
          >
            Set Active Target
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className={premiumCompactSurface}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <span className={premiumBadge}>
              Active Target
            </span>

            <span className={premiumBadge}>
              {getActiveTargetSourceLabel(target.source)}
            </span>

            {target.jdMatch ? (
              <span className={premiumBadge}>
                JD Match: {Math.round(target.jdMatch.score)}/100
              </span>
            ) : (
              <span className={premiumBadge}>
                No JD Match yet
              </span>
            )}
          </div>

          <h2 className="mt-3 break-words text-xl font-black text-slate-950">
            {formatTargetTitle(target)}
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
            {result.mainGap}
          </p>

          {!target.jdMatch && (
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Paste a JD for target-specific matching.
            </p>
          )}
        </div>

        <Link
          href="/ats"
          className={premiumSecondaryCta}
        >
          Open target workflow
        </Link>
      </div>
    </section>
  );
}

function formatTargetTitle(
  target: NonNullable<ActiveTargetEngineResult["activeTarget"]>,
): string {
  if (target.companyName && target.roleTitle) {
    return `${target.roleTitle} at ${target.companyName}`;
  }

  return target.title;
}
