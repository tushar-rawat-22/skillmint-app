import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-6 py-10 text-sm text-slate-500">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-semibold text-slate-700">SkillMint</p>
        <div className="flex flex-wrap gap-4">
          <p>No job guarantees. Just clearer proof, gaps, and next actions.</p>

          <Link
            href="/privacy"
            className="font-semibold text-slate-700 transition hover:text-emerald-800"
          >
            Data & privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}
