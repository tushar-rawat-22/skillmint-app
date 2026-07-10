type Props = {
  recommendations: string[];
};

export default function QuickActions({
  recommendations,
}: Props) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-950 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <h2 className="mb-5 text-2xl font-bold">
        Recommendations
      </h2>

      <ul className="space-y-3 text-sm leading-6 text-slate-700">
        {recommendations.map((item) => (
          <li key={item}>
            • {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
