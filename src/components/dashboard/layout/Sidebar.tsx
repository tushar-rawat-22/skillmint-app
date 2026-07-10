"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ROUTES } from "@/constants/routes";

const navigationItems = [
  {
    label: "Dashboard",
    href: ROUTES.DASHBOARD,
  },
  {
    label: "Setup",
    href: ROUTES.SETUP,
  },
  {
    label: "Resume",
    href: ROUTES.RESUME,
  },
  {
    label: "ATS Match",
    href: ROUTES.ATS,
  },
  {
    label: "Roadmap",
    href: ROUTES.ROADMAP,
  },
  {
    label: "Profile",
    href: ROUTES.PROFILE,
  },
  {
    label: "Settings",
    href: ROUTES.SETTINGS,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full border-b border-slate-200 bg-white/92 p-4 backdrop-blur-xl md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:self-start md:overflow-y-auto md:border-b-0 md:border-r md:p-6">
      <Link
        href="/"
        className="mb-4 block text-2xl font-black tracking-tight text-slate-950 transition hover:text-emerald-800 md:mb-10"
      >
        SkillMint
      </Link>

      <nav className="flex gap-2 overflow-x-auto pb-1 md:block md:space-y-2 md:overflow-visible md:pb-0">
        {navigationItems.map((item) => {
          const isActive = isActiveRoute(pathname, item.href);
          const className = isActive
            ? "border-emerald-200 bg-emerald-50 text-emerald-950"
            : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950";

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex shrink-0 items-center justify-between rounded-xl border px-3 py-2 text-sm font-semibold transition duration-200 md:w-full ${className}`}
            >
              <span>{item.label}</span>

              {isActive && (
                <span className="ml-3 h-2 w-2 rounded-full bg-emerald-600" />
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function isActiveRoute(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
