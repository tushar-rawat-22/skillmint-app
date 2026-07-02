export default function Stats() {
  return (
    <section className="py-16 border-y border-gray-800 bg-black">
      <div className="mx-auto max-w-6xl px-6">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">

          <div>
            <h2 className="text-4xl font-bold text-white">92%</h2>
            <p className="mt-2 text-gray-400">
              ATS Compatibility
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-bold text-white">78</h2>
            <p className="mt-2 text-gray-400">
              Career IQ Score
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-bold text-white">14</h2>
            <p className="mt-2 text-gray-400">
              AI Missions
            </p>
          </div>

          <div>
            <h2 className="text-4xl font-bold text-white">3x</h2>
            <p className="mt-2 text-gray-400">
              Recruiter Confidence
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}