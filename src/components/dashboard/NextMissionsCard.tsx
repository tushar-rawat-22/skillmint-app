type Props = {
  missions: string[];
  recommendations: string[];
};

export default function NextMissionsCard({
  missions,
  recommendations,
}: Props) {
  const actions = getActions(missions, recommendations);

  return (
    <section>
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">
        Next Missions
      </p>

      <h2 className="mt-2 text-2xl font-black text-white">
        What to fix next
      </h2>

      <div className="mt-5 space-y-3">
        {actions.map((action, index) => (
          <article
            key={action}
            className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-white"
          >
            <div className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-black">
                {index + 1}
              </span>

              <div className="min-w-0">
                <p className="font-bold">
                  {action}
                </p>

                <p className="mt-1 text-sm leading-6 text-neutral-400">
                  Treat this as the next visible proof upgrade, not a vague task.
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function getActions(
  missions: string[],
  recommendations: string[],
): string[] {
  const uniqueActions = new Set([...missions, ...recommendations]);
  const actions = Array.from(uniqueActions).slice(0, 3);

  return actions.length ? actions : ["Upload a resume to generate missions"];
}
