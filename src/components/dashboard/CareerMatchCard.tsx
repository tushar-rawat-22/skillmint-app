import { RoleMatchResult } from "@/intelligence/types/results";

type Props = {
  matches: RoleMatchResult[];
};

export default function CareerMatchCard({ matches }: Props) {
  const topMatches = matches.slice(0, 3);

  return (
    <section className="text-white">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">
            Career Fit Engine
          </p>

          <h2 className="mt-2 text-2xl font-black">
            Top career matches
          </h2>
        </div>

        <p className="max-w-xl text-sm leading-6 text-neutral-400">
          Role fit is capped when proof is thin, even if skills match.
        </p>
      </div>

      <div className="mt-5 space-y-4">
        {topMatches.map((match) => (
          <div
            key={match.role}
            className="rounded-3xl border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-lg font-bold">
                  {match.role}
                </h3>

                <p className="mt-1 truncate text-sm text-neutral-400">
                  {match.category} | {match.salaryRange} | {match.difficulty}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-2xl font-black tabular-nums text-emerald-300">
                  {Math.round(match.matchScore)}%
                </p>

                <p className="text-xs text-neutral-500">
                  match
                </p>
              </div>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-400"
                style={{ width: `${match.matchScore}%` }}
              />
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Strongest signals
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  {match.why.length ? (
                    match.why.map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300"
                      >
                        {item}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-neutral-500">
                      Not enough matching signals yet.
                    </span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Biggest gaps
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  {match.gaps.length ? (
                    match.gaps.map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-red-500/10 px-3 py-1 text-xs text-red-300"
                      >
                        {item}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-neutral-500">
                      No major gaps detected.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
