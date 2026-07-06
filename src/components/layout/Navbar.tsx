import Link from "next/link";

import { ROUTES } from "@/constants/routes";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/82 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">

        <Link
          href="/"
          className="text-2xl font-black tracking-tight text-white transition hover:text-emerald-200"
        >
          SkillMint
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium md:flex">

          <a
            href="#preview"
            className="text-gray-300 transition hover:text-green-400"
          >
            Product Preview
          </a>

          <a
            href="#how-it-works"
            className="text-gray-300 transition hover:text-green-400"
          >
            How it works
          </a>

          <a
            href="#features"
            className="text-gray-300 transition hover:text-green-400"
          >
            What you get
          </a>

          <Link
            href={ROUTES.LOGIN}
            className="text-gray-300 transition hover:text-green-400"
          >
            Log in
          </Link>

        </nav>

        <Link
          href={ROUTES.SIGNUP}
          className="hidden rounded-xl bg-emerald-500 px-5 py-2 font-semibold text-slate-950 shadow-lg shadow-emerald-950/40 transition hover:bg-emerald-300 md:block"
        >
          Start Free
        </Link>

      </div>
    </header>
  );
}
