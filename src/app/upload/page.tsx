import Link from "next/link";

import AuthenticatedUploadWorkspace from "@/components/upload/AuthenticatedUploadWorkspace";
import {
  premiumHeroSurface,
  premiumPrimaryCta,
  premiumSecondaryCta,
} from "@/components/ui/premium";
import { getPublicDemoConfiguration } from "@/config/publicDemo";
import { ROUTES } from "@/constants/routes";
import { getServerAuthorization } from "@/lib/supabase/serverAuth";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const authorization = await getServerAuthorization();

  if (authorization.status === "authenticated") {
    return (
      <AuthenticatedUploadWorkspace
        authorizedUserId={authorization.userId}
      />
    );
  }

  const { enabled: publicDemoEnabled } = getPublicDemoConfiguration();
  const unavailable =
    authorization.status === "not_configured" ||
    authorization.status === "temporarily_unavailable";

  return (
    <main className="min-h-screen bg-[#f7f8f4] px-6 py-16 text-slate-950">
      <section className={`${premiumHeroSurface} mx-auto max-w-3xl text-center`}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
          Private pilot access
        </p>
        <h1 className="mt-5 text-4xl font-black md:text-5xl">
          Log in to analyze a real resume
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600">
          {unavailable
            ? "Authenticated resume analysis is unavailable until account configuration can be verified. No file can be uploaded from this page."
            : "Real-resume upload and analysis are limited to authenticated existing users. Public signup remains closed."}
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={ROUTES.LOGIN} className={premiumPrimaryCta}>
            Log in
          </Link>
          {publicDemoEnabled && (
            <Link href={ROUTES.DEMO} className={premiumSecondaryCta}>
              Explore synthetic demo
            </Link>
          )}
        </div>

        <p className="mt-6 text-sm leading-6 text-slate-500">
          The synthetic demo accepts no upload and contains no real candidate
          information.
        </p>
      </section>
    </main>
  );
}
