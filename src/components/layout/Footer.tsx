import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-slate-950 py-8">
      <div className="mx-auto max-w-7xl px-6 text-center text-sm text-slate-500">
        © {new Date().getFullYear()}{" "}
        <Link
          href="/"
          className="font-semibold text-slate-400 transition hover:text-emerald-200"
        >
          SkillMint
        </Link>
        .
        Built to help every student build a better career.
      </div>
    </footer>
  );
}
