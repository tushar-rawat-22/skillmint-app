export default function Stats() {
  return (
    <section className="py-16 border-y border-gray-800 bg-black">
      <div className="mx-auto max-w-6xl px-6">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">

          <div>
            <h2 className="text-4xl font-bold text-white">Local</h2>
            <p className="mt-2 text-gray-400">
              First by default
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-bold text-white">6</h2>
            <p className="mt-2 text-gray-400">
              Connected career steps
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-bold text-white">90</h2>
            <p className="mt-2 text-gray-400">
              Day roadmap
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-bold text-white">Sync</h2>
            <p className="mt-2 text-gray-400">
              When signed in
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
