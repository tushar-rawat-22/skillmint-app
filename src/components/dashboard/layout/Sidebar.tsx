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
    <aside className="w-full border-b border-neutral-800 bg-black p-4 md:min-h-screen md:w-64 md:border-b-0 md:border-r md:p-6">
      <h1 className="mb-4 text-2xl font-bold text-green-500 md:mb-10">
        SkillMint
      </h1>

      <nav className="flex gap-2 overflow-x-auto pb-1 md:block md:space-y-2 md:overflow-visible md:pb-0">
        {navigationItems.map((item) => {
          const isActive = isActiveRoute(pathname, item.href);
          const className = isActive
            ? "border-green-500/40 bg-green-500/10 text-green-200"
            : "border-transparent text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900 hover:text-white";

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex shrink-0 items-center justify-between rounded-lg border px-3 py-2 text-sm font-semibold transition md:w-full ${className}`}
            >
              <span>{item.label}</span>

              {isActive && (
                <span className="ml-3 h-2 w-2 rounded-full bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.8)]" />
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
