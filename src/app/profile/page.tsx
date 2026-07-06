import Link from "next/link";

import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";
import AuthStatusCard from "@/modules/auth/components/AuthStatusCard";
import CareerDirectionSummaryCard from "@/modules/profile/components/CareerDirectionSummaryCard";
import ProofLinksPlaceholderCard from "@/modules/profile/components/ProofLinksPlaceholderCard";
import ProfileIdentityCard from "@/modules/profile/components/ProfileIdentityCard";

export default function ProfilePage() {
  return (
    <DashboardLayout>
      <section className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.13),transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(2,6,23,0.94))] p-6 shadow-2xl shadow-black/25 md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-black">
                Profile
              </h1>

              <p className="mt-4 max-w-2xl text-gray-400">
                See your identity, saved direction, and account status in one
                calm place.
              </p>
            </div>

            <Link
              href="/setup"
              className="w-fit rounded-xl border border-green-500/30 px-5 py-3 text-sm font-semibold text-green-100 transition hover:border-green-300 hover:text-white"
            >
              Open career setup
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-6">
            <ProfileIdentityCard />

            <AuthStatusCard />
          </div>

          <div className="space-y-6">
            <CareerDirectionSummaryCard />

            <ProofLinksPlaceholderCard />
          </div>
        </div>

        <article className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <h2 className="text-xl font-bold">
            What gets saved
          </h2>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              "Your target role and career goal.",
              "Your resume and job matches when signed in.",
              "Your progress without changing any scores.",
            ].map((item) => (
              <p
                key={item}
                className="rounded-2xl border border-white/10 bg-black/28 p-4 text-sm leading-6 text-gray-300"
              >
                {item}
              </p>
            ))}
          </div>
        </article>
      </section>
    </DashboardLayout>
  );
}
