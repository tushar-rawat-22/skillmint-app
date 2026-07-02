type Props = {
  recommendations: string[];
};

export default function QuickActions({
  recommendations,
}: Props) {
  return (
    <div className="rounded-3xl bg-neutral-900 p-6 text-white">

      <h2 className="mb-5 text-2xl font-bold">

        Recommendations

      </h2>

      <ul className="space-y-3">

        {recommendations.map((item) => (
          <li key={item}>
            • {item}
          </li>
        ))}

      </ul>

    </div>
  );
}