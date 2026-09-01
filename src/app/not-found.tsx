import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#f7f8f4] px-6 py-12 text-slate-950">
      <section className="mx-auto flex min-h-[80vh] max-w-3xl items-center">
        <div className="w-full rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_18px_55px_rgba(15,23,42,0.08)] sm:p-10">
          <Link
            href="/"
            className="text-2xl font-black text-slate-950 transition hover:text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
          >
            SkillMint
          </Link>

          <p className="mt-10 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Page not found
          </p>
          <h1 className="mt-4 text-4xl font-black sm:text-5xl">
            This route does not exist.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Nothing was changed or submitted. Return to SkillMint or sign in to continue your saved career workspace.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white shadow-sm shadow-emerald-900/10 transition hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              Return to SkillMint
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              Go to login
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
