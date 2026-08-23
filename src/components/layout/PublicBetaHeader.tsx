import Link from "next/link";

import { ROUTES } from "@/constants/routes";

export default function PublicBetaHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5" aria-label="Public beta">
        <Link
          href={ROUTES.HOME}
          className="text-2xl font-black tracking-tight text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
        >
          SkillMint
        </Link>
        <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-700">
          <Link className="hover:text-emerald-800" href={ROUTES.CANDIDATES}>
            Candidates
          </Link>
          <Link className="hover:text-emerald-800" href={ROUTES.RECRUITERS}>
            Recruiters
          </Link>
          <Link className="hover:text-emerald-800" href={ROUTES.LOGIN}>
            Log in
          </Link>
        </div>
      </nav>
    </header>
  );
}
