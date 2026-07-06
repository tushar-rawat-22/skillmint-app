"use client";

import { usePathname } from "next/navigation";

const routeLabels: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/setup": "Career Setup",
  "/resume": "Resume Intelligence",
  "/ats": "ATS Match",
  "/roadmap": "Career Roadmap",
  "/profile": "Profile",
  "/settings": "Settings",
};

export default function Topbar() {
  const pathname = usePathname();
  const label = routeLabels[pathname] ?? "SkillMint";

  return (
    <header className="border-b border-white/10 bg-slate-950/58 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        Current Section
      </p>

      <h2 className="mt-1 text-2xl font-black text-slate-50">
        {label}
      </h2>
    </header>
  );
}
