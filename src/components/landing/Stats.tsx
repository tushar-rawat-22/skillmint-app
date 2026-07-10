export default function Stats() {
  return (
    <section className="border-y border-slate-200 bg-white py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
          <div>
            <h2 className="text-4xl font-bold text-slate-950">Local</h2>
            <p className="mt-2 text-slate-600">
              First by default
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-bold text-slate-950">6</h2>
            <p className="mt-2 text-slate-600">
              Connected career steps
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-bold text-slate-950">90</h2>
            <p className="mt-2 text-slate-600">
              Day roadmap
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-bold text-slate-950">Sync</h2>
            <p className="mt-2 text-slate-600">
              When signed in
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
