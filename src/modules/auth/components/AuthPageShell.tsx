import Link from "next/link";

import {
  premiumHeroSurface,
} from "@/components/ui/premium";

type AuthPageShellProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

export default function AuthPageShell({
  eyebrow,
  title,
  subtitle,
  children,
}: AuthPageShellProps) {
  return (
    <main className="min-h-screen bg-[#f7f8f4] px-6 py-12 text-slate-950">
      <section className="mx-auto grid min-h-[80vh] max-w-6xl items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <Link
            href="/"
            className="text-2xl font-black text-slate-950 transition hover:text-emerald-800"
          >
            SkillMint
          </Link>

          <div className="mt-10">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              {eyebrow}
            </p>

            <h1 className="mt-4 text-4xl font-black md:text-5xl">
              {title}
            </h1>

            <p className="mt-4 text-base leading-7 text-slate-600">
              {subtitle}
            </p>
          </div>

          <AuthTrustPanel />
        </div>

        <div className={premiumHeroSurface}>
          {children}
        </div>
      </section>
    </main>
  );
}

function AuthTrustPanel() {
  return (
    <div className="mt-8 grid gap-3 text-sm leading-6 text-slate-700">
      {[
        "Save your career direction",
        "Keep resume proof and job matches",
        "Continue your 30-day roadmap",
      ].map((item) => (
        <p
          key={item}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
        >
          {item}
        </p>
      ))}
    </div>
  );
}
