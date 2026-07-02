export default function DashboardHeader() {
  return (
    <header className="flex items-center justify-between">

      <div>

        <h1 className="text-4xl font-black">
          Dashboard
        </h1>

        <p className="mt-2 text-gray-500">
          Welcome back, Tushar 👋
        </p>

      </div>

      <button className="rounded-xl bg-black px-6 py-3 text-white transition hover:bg-gray-800">
        Upload Resume
      </button>

    </header>
  );
}