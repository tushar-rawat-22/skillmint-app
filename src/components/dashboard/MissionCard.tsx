type Props = {
  missions: string[];
};

export default function MissionCard({
  missions,
}: Props) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-950 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <h2 className="mb-5 text-2xl font-bold">
        Missions
      </h2>

      <ul className="space-y-3 text-sm leading-6 text-slate-700">
        {missions.map((mission) => (
          <li key={mission}>
            • {mission}
          </li>
        ))}
      </ul>
    </div>
  );
}
