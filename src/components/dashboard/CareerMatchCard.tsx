import { RoleMatchResult } from "@/intelligence/types/results";

type Props = {
  matches: RoleMatchResult[];
};

export default function CareerMatchCard({ matches }: Props) {
  const topMatches = matches.slice(0, 5);

  return (
    <section className="rounded-3xl bg-neutral-900 p-6 text-white">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-green-400">
            Career Fit Engine
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            Best Career Matches
          </h2>
        </div>

        <p className="text-sm text-neutral-400">
          Based on skills, projects, certifications and coding signals.
        </p>
      </div>

      <div className="mt-8 space-y-5">
        {topMatches.map((match) => (
          <div
            key={match.role}
            className="rounded-2xl border border-neutral-800 bg-black p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold">
                  {match.role}
                </h3>

                <p className="mt-1 text-sm text-neutral-400">
                  {match.category} • {match.salaryRange} • {match.difficulty}
                </p>
              </div>

              <div className="text-right">
                <p className="text-2xl font-black text-green-400">
                  {match.matchScore}%
                </p>

                <p className="text-xs text-neutral-500">
                  match
                </p>
              </div>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-800">
              <div
                className="h-full rounded-full bg-green-500"
                style={{ width: `${match.matchScore}%` }}
              />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Strengths
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  {match.why.length ? (
                    match.why.map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-400"
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
                  Gaps
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