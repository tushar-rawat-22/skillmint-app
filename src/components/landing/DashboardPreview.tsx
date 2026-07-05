export default function DashboardPreview() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <div className="rounded-3xl border border-gray-800 bg-neutral-900 p-10 shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-green-400">
          Product Preview
        </p>

        <h2 className="mt-3 text-3xl font-bold text-white">
          Example career cockpit
        </h2>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
          This is a preview of the dashboard style. Your real scores appear
          after uploading and analyzing your resume.
        </p>

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
