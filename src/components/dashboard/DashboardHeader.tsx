export default function DashboardHeader() {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-4xl font-black">
          Dashboard
        </h1>

        <p className="mt-2 text-slate-500">
          Welcome back.
        </p>
      </div>

      <button className="w-fit rounded-xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-800">
        Upload Resume
      </button>
    </header>
  );
}
