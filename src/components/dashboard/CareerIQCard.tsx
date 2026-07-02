type Props = {
  score: number;
};

export default function CareerIQCard({ score }: Props) {
  return (
    <div className="rounded-3xl bg-neutral-900 p-6 text-white">

      <p className="text-neutral-400">

        Career IQ

      </p>

      <h2 className="mt-3 text-5xl font-bold">

        {score}

      </h2>

    </div>
  );
}