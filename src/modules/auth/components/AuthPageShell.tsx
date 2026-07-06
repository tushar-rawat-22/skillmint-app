import Link from "next/link";

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_30%),#020617] px-6 py-12 text-white">
      <section className="mx-auto grid min-h-[80vh] max-w-6xl items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <Link
            href="/"
            className="text-2xl font-black text-emerald-300 transition hover:text-emerald-100"
          >
            SkillMint
          </Link>

          <div className="mt-10">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-green-400">
              {eyebrow}
            </p>

            <h1 className="mt-4 text-4xl font-black md:text-5xl">
              {title}
            </h1>

            <p className="mt-4 text-base leading-7 text-gray-400">
              {subtitle}
            </p>
          </div>

          <AuthTrustPanel />
        </div>

        <div className="rounded-3xl border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-6 shadow-2xl shadow-black/30">
          {children}
        </div>
      </section>
    </main>
  );
}

function AuthTrustPanel() {
  return (
    <div className="mt-8 grid gap-3 text-sm leading-6 text-gray-300">
      {[
        "Save your career direction",
        "Keep resume proof and job matches",
        "Continue your 30-day roadmap",
      ].map((item) => (
        <p
          key={item}
          className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
        >
          {item}
        </p>
      ))}
    </div>
  );
}
