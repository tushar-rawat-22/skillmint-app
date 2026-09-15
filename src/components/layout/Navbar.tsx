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
      <nav
        className="mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 px-5 py-3.5 md:grid-cols-[auto_1fr_auto] md:px-6 md:py-4"
        aria-label="Public navigation"
      >
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
            <span className="hidden text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600 sm:block">
              Career evidence
            </span>
          </span>
        </Link>

        <div className="order-3 col-span-2 flex items-center gap-5 border-t border-slate-200 pt-3 text-sm font-semibold text-slate-600 md:order-none md:col-span-1 md:justify-center md:gap-7 md:border-t-0 md:pt-0">
          <Link className="inline-flex min-h-10 items-center transition hover:text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700" href={ROUTES.CANDIDATES}>
            Candidates
          </Link>
          <Link className="hidden min-h-10 items-center transition hover:text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700 md:inline-flex" href="/#preview">
            Example
          </Link>
          <Link className="hidden min-h-10 items-center transition hover:text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700 md:inline-flex" href="/#how-it-works">
            How it works
          </Link>
          <Link className="inline-flex min-h-10 items-center transition hover:text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700" href={ROUTES.RECRUITERS}>
            Recruiters
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
              : "Log in"}
        </Link>
      </nav>
    </header>
  );
}
