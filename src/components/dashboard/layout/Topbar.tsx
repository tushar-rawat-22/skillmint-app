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
    <header className="border-b border-neutral-800/80 bg-neutral-950/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
        Current Section
      </p>

      <h2 className="mt-1 text-2xl font-bold text-neutral-50">
        {label}
      </h2>
    </header>
  );
}
