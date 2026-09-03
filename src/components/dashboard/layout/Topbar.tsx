"use client";

import { usePathname } from "next/navigation";

const routeLabels: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/setup": "Target role",
  "/resume": "Resume report",
  "/resume/compare": "Resume Comparison",
  "/ats": "Job match",
  "/roadmap": "Career Roadmap",
  "/profile": "Profile",
  "/settings": "Settings",
  "/settings/data": "Data & Privacy",
};

export default function Topbar() {
  const pathname = usePathname();
  const label = routeLabels[pathname] ?? "SkillMint";

  return (
    <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold text-slate-500">
        SkillMint workspace
      </p>

      <h2 className="mt-1 text-2xl font-black text-slate-950">
        {label}
      </h2>
    </header>
  );
}
