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
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-950 shadow-[0_18px_55px_rgba(15,23,42,0.07)] md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-black text-slate-950">
                Profile
              </h1>

              <p className="mt-4 max-w-2xl text-slate-600">
                See your identity, saved direction, and account status in one
                calm place.
              </p>
            </div>

            <Link
              href="/setup"
              className="w-fit rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100"
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

        <article className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 text-slate-950 shadow-[0_14px_42px_rgba(15,23,42,0.06)]">
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
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700"
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
