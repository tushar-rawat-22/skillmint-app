export default function DashboardPreview() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <div className="rounded-3xl border border-gray-800 bg-neutral-900 p-10 shadow-xl">
        <h2 className="text-3xl font-bold text-white">
          SkillMint Dashboard
        </h2>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-black p-6">
            <p className="text-gray-400">Career IQ</p>
            <h3 className="mt-3 text-5xl font-bold text-green-500">78</h3>
          </div>

          <div className="rounded-2xl bg-black p-6">
            <p className="text-gray-400">ATS Score</p>
            <h3 className="mt-3 text-5xl font-bold text-white">92%</h3>
          </div>
        </div>
      </div>
    </section>
  );
}