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
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-5">
        <Link
          href="/"
          className="text-2xl font-black tracking-tight text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
        >
          SkillMint
        </Link>

        <div className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
          <a className="min-h-8 py-1 transition hover:text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700" href="#preview">
            Product Preview
          </a>
          <a className="min-h-8 py-1 transition hover:text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700" href="#how-it-works">
            How it works
          </a>
          <a className="min-h-8 py-1 transition hover:text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700" href="#difference">
            Why different
          </a>
          <Link className="min-h-8 py-1 transition hover:text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700" href={ROUTES.LOGIN}>
            Log in
          </Link>
        </div>

        <Link
          href={publicDemoEnabled ? ROUTES.DEMO : ROUTES.SIGNUP}
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
        >
          {publicDemoEnabled
            ? "Explore live demo"
            : publicSignupEnabled
              ? "Create account"
              : "View early access"}
        </Link>
      </nav>
    </header>
  );
}
