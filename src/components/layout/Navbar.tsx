import Link from "next/link";

import { ROUTES } from "@/constants/routes";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-5">
        <Link href="/" className="text-2xl font-black tracking-tight text-slate-950">
          SkillMint
        </Link>

        <div className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
          <a className="transition hover:text-emerald-700" href="#preview">
            Product Preview
          </a>
          <a className="transition hover:text-emerald-700" href="#how-it-works">
            How it works
          </a>
          <a className="transition hover:text-emerald-700" href="#features">
            What you get
          </a>
          <Link className="transition hover:text-emerald-700" href={ROUTES.LOGIN}>
            Log in
          </Link>
        </div>

        <Link
          href={ROUTES.SIGNUP}
          className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(5,150,105,0.18)] transition hover:bg-emerald-700"
        >
          Start Free
        </Link>
      </nav>
    </header>
  );
}
