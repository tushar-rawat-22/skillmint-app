type Props = {
  missions: string[];
};

export default function MissionCard({
  missions,
}: Props) {
  return (
    <div className="rounded-3xl bg-neutral-900 p-6 text-white">

      <h2 className="mb-5 text-2xl font-bold">

        AI Missions

      </h2>

      <ul className="space-y-3">

        {missions.map((mission) => (
          <li key={mission}>
            • {mission}
          </li>
        ))}

      </ul>

    </div>
  );
}