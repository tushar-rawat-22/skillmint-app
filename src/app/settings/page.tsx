import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";
import ClearWorkspaceCard from "@/components/settings/ClearWorkspaceCard";
import {
  premiumCompactSurface,
  premiumHeroSurface,
} from "@/components/ui/premium";
import { AccountOverviewCard } from "@/modules/account";
import AuthStatusCard from "@/modules/auth/components/AuthStatusCard";
import SignOutButton from "@/modules/auth/components/SignOutButton";

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <section className="mx-auto max-w-6xl">
        <div className={premiumHeroSurface}>
          <h1 className="text-4xl font-black">
            Settings
          </h1>

          <p className="mt-4 max-w-2xl text-slate-600">
            Manage account status, sign-out, and how SkillMint saves your
            progress.
          </p>
        </div>

        <SettingsStatusCards />

        <section className="mt-8 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-6">
            <AuthStatusCard />

            <article className={premiumCompactSurface}>
              <h2 className="text-xl font-bold text-slate-950">
                Account session
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                Sign out here when you are done. Resume, job match, and
                roadmap flows still work in this browser after sign-out.
              </p>

              <div className="mt-5">
                <SignOutButton />
              </div>
            </article>
          </div>

          <div className="space-y-6">
            <AccountOverviewCard />

            <article className={premiumCompactSurface}>
              <h2 className="text-xl font-bold text-slate-950">
                Works in this browser
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                If account sync is unavailable, SkillMint can still keep your
                resume analyses, job matches, roadmap, and feedback in this
                browser.
              </p>
            </article>

            <ClearWorkspaceCard />
          </div>
        </section>
      </section>
    </DashboardLayout>
  );
}

function SettingsStatusCards() {
  const cards = [
    {
      label: "Account",
      value: "Session aware",
      body: "Login and sign-out live here without blocking local progress.",
    },
    {
      label: "Browser save",
      value: "Still active",
      body: "Resume, job match, roadmap, and feedback can keep working here.",
    },
    {
      label: "Sync",
      value: "Best effort",
      body: "Signed-in users sync supported data when Supabase is available.",
    },
  ];

  return (
    <section className="mt-6 grid gap-3 md:grid-cols-3">
      {cards.map((card) => (
        <article
          key={card.label}
          className={premiumCompactSurface}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {card.label}
          </p>

          <h2 className="mt-2 text-lg font-bold text-slate-950">
            {card.value}
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            {card.body}
          </p>
        </article>
      ))}
    </section>
  );
}
