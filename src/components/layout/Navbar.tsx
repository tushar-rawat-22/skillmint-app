import Link from "next/link";

import { ROUTES } from "@/constants/routes";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">

        <Link
          href="/"
          className="text-2xl font-black tracking-tight text-white"
        >
          SkillMint
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium md:flex">

          <Link
            href={ROUTES.DASHBOARD}
            className="text-gray-300 transition hover:text-green-400"
          >
            Dashboard Preview
          </Link>

          <Link
            href={ROUTES.SETUP}
            className="text-gray-300 transition hover:text-green-400"
          >
            Setup
          </Link>

          <Link
            href={ROUTES.UPLOAD}
            className="text-gray-300 transition hover:text-green-400"
          >
            Upload Resume
          </Link>

          <a
            href="#career-os"
            className="text-gray-300 transition hover:text-green-400"
          >
            Career OS
          </a>

          <Link
            href={ROUTES.LOGIN}
            className="text-gray-300 transition hover:text-green-400"
          >
            Log in
          </Link>

        </nav>

        <Link
          href={ROUTES.SETUP}
          className="hidden rounded-xl bg-green-600 px-5 py-2 font-semibold text-white transition hover:bg-green-500 md:block"
        >
          Start Setup
        </Link>

      </div>
    </header>
  );
}
