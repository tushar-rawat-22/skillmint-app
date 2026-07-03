type Props = {
  score: number;
};

export default function CareerIQCard({ score }: Props) {
  const roundedScore = Math.round(score);

  return (
    <div className="min-w-0 rounded-3xl bg-neutral-900 p-6 text-white">

      <p className="text-neutral-400">

        Career IQ

      </p>

      <h2 className="mt-3 max-w-full truncate text-4xl font-bold leading-none tabular-nums md:text-5xl">

        {roundedScore}

      </h2>

    </div>
  );
}
