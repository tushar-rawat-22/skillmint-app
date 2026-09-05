import Link from "next/link";

import { ROUTES } from "@/constants/routes";

type NavbarProps = {
  publicSignupEnabled: boolean;
  publicDemoEnabled: boolean;
};

export default function Navbar({
  publicSignupEnabled,
  publicDemoEnabled,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#fbfaf7]/95 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-6 py-4">
        <Link
          href="/"
          className="group inline-flex items-center gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-xs font-black tracking-[-0.04em] text-white shadow-sm transition group-hover:bg-emerald-900">
            SM
          </span>
          <span>
            <span className="block text-lg font-black tracking-[-0.03em] text-slate-950">
              SkillMint
            </span>
            <span className="hidden text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 sm:block">
              Career evidence
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex">
          <Link className="min-h-8 py-1 transition hover:text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700" href={ROUTES.CANDIDATES}>
            Candidates
          </Link>
          <Link className="min-h-8 py-1 transition hover:text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700" href="/#preview">
            Example
          </Link>
          <Link className="min-h-8 py-1 transition hover:text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700" href="/#how-it-works">
            How it works
          </Link>
          <Link className="min-h-8 py-1 transition hover:text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700" href={ROUTES.RECRUITERS}>
            For recruiters
          </Link>
        </div>

        <Link
          href={publicDemoEnabled
            ? ROUTES.DEMO
            : publicSignupEnabled
              ? ROUTES.SIGNUP
              : ROUTES.LOGIN}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700 sm:px-5"
        >
          {publicDemoEnabled
            ? "Explore live demo"
            : publicSignupEnabled
              ? "Create account"
              : "Candidate login"}
        </Link>
      </nav>
    </header>
  );
}
