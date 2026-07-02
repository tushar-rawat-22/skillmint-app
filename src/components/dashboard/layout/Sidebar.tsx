import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="w-64 border-r border-neutral-800 bg-black p-6">
      <h1 className="mb-10 text-2xl font-bold text-green-500">
        SkillMint
      </h1>

      <nav className="space-y-4">

        <Link
          href="/dashboard"
          className="block rounded-lg px-3 py-2 hover:bg-neutral-800"
        >
          Dashboard
        </Link>

        <Link
          href="/resume"
          className="block rounded-lg px-3 py-2 hover:bg-neutral-800"
        >
          Resume
        </Link>

        <Link
          href="/profile"
          className="block rounded-lg px-3 py-2 hover:bg-neutral-800"
        >
          Profile
        </Link>

        <Link
          href="/settings"
          className="block rounded-lg px-3 py-2 hover:bg-neutral-800"
        >
          Settings
        </Link>

      </nav>
    </aside>
  );
}