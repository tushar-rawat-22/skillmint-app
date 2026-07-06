import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";
import { AccountOverviewCard } from "@/modules/account";
import AuthStatusCard from "@/modules/auth/components/AuthStatusCard";
import SignOutButton from "@/modules/auth/components/SignOutButton";

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <section className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(2,6,23,0.94))] p-6 shadow-2xl shadow-black/25 md:p-8">
          <h1 className="text-4xl font-black">
            Settings
          </h1>

          <p className="mt-4 max-w-2xl text-gray-400">
            Manage account status, sign-out, and how SkillMint saves your
            progress.
          </p>
        </div>

        <SettingsStatusCards />

        <section className="mt-8 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-6">
            <AuthStatusCard />

            <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <h2 className="text-xl font-bold">
                Account session
              </h2>

              <p className="mt-3 text-sm leading-6 text-gray-400">
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

            <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <h2 className="text-xl font-bold">
                Works in this browser
              </h2>

              <p className="mt-3 text-sm leading-6 text-gray-400">
                If account sync is unavailable, SkillMint can still keep your
                resume analyses, job matches, roadmap, and feedback in this
                browser.
              </p>
            </article>
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
          className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            {card.label}
          </p>

          <h2 className="mt-2 text-lg font-bold text-white">
            {card.value}
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-400">
            {card.body}
          </p>
        </article>
      ))}
    </section>
  );
}
