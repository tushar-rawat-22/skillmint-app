import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";
import { AccountOverviewCard } from "@/modules/account";
import AuthStatusCard from "@/modules/auth/components/AuthStatusCard";
import SignOutButton from "@/modules/auth/components/SignOutButton";

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <section className="mx-auto max-w-6xl">
        <div>
          <h1 className="text-4xl font-black">
            Settings
          </h1>

          <p className="mt-4 max-w-2xl text-gray-400">
            Check account sync, local fallback, and session status before beta
            testing.
          </p>
        </div>

        <section className="mt-8 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-6">
            <AuthStatusCard />

            <article className="rounded-lg border border-gray-800 bg-neutral-900 p-6">
              <h2 className="text-xl font-bold">
                Account session
              </h2>

              <p className="mt-3 text-sm leading-6 text-gray-400">
                Sign out here when testing account flows. Local resume and JD
                workflows remain available after sign-out.
              </p>

              <div className="mt-5">
                <SignOutButton />
              </div>
            </article>
          </div>

          <div className="space-y-6">
            <AccountOverviewCard />

            <article className="rounded-lg border border-gray-800 bg-neutral-900 p-6">
              <h2 className="text-xl font-bold">
                Local-first safety
              </h2>

              <p className="mt-3 text-sm leading-6 text-gray-400">
                If account sync is unavailable, SkillMint keeps resume
                analyses, job matches, roadmap data, and feedback in this
                browser where supported.
              </p>
            </article>
          </div>
        </section>
      </section>
    </DashboardLayout>
  );
}
