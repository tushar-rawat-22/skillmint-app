import { redirect } from "next/navigation";

import PublicBetaHeader from "@/components/layout/PublicBetaHeader";
import {
  premiumEyebrow,
  premiumHeroSurface,
  premiumPrimaryCta,
  premiumSecondaryCta,
} from "@/components/ui/premium";
import { getServerAuthorization } from "@/lib/supabase/serverAuth";
import {
  accountPersonaDestination,
  getAccountPersona,
} from "@/modules/accountPersona";

type PersonaPageProps = {
  readonly searchParams: Promise<{ readonly error?: string }>;
};

export default async function PersonaPage({ searchParams }: PersonaPageProps) {
  const authorization = await getServerAuthorization();
  if (authorization.status !== "authenticated") {
    redirect("/login");
  }

  const existing = await getAccountPersona(authorization.userId);
  if (existing.status === "resolved") {
    redirect(accountPersonaDestination(existing.persona));
  }

  const { error } = await searchParams;
  const unavailable = existing.status === "unavailable" || error === "unavailable";

  return (
    <>
      <PublicBetaHeader />
      <main className="min-h-screen bg-[#f7f5ef] px-6 py-12 text-slate-950 md:py-16">
        <section className={`${premiumHeroSurface} mx-auto max-w-4xl`}>
          <p className={premiumEyebrow}>Account setup</p>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] md:text-5xl">
            How will you use SkillMint?
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
            Choose the workspace that matches what you are here to do. This is
            product context, not employer verification or a hiring credential.
            Your account persona is locked after setup so browser state cannot
            silently change authorization context later.
          </p>

          {unavailable ? (
            <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950" role="status">
              Account setup is temporarily unavailable. Your sign-in session has
              not been converted into a persona yet; try again after the service
              is available.
            </div>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <form action="/auth/persona" method="post">
                <input type="hidden" name="persona" value="CANDIDATE" />
                <button type="submit" className={`${premiumPrimaryCta} w-full justify-center`}>
                  I am a candidate
                </button>
              </form>
              <form action="/auth/persona" method="post">
                <input type="hidden" name="persona" value="RECRUITER" />
                <button type="submit" className={`${premiumSecondaryCta} w-full justify-center`}>
                  I am reviewing candidate evidence
                </button>
              </form>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
