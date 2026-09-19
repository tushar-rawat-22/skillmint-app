import Link from "next/link";

import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import { premiumHeroSurface, premiumPageStack, premiumSurface } from "@/components/ui/premium";
import { getPrivacyContact } from "@/config/privacyContact";
import { getPublicDemoConfiguration } from "@/config/publicDemo";
import { getPublicSignupConfiguration } from "@/config/publicSignup";

export default function SupportPage() {
  const contact = getPrivacyContact();
  const { enabled } = getPublicSignupConfiguration();
  const { enabled: publicDemoEnabled } = getPublicDemoConfiguration();

  return (
    <>
      <Navbar publicSignupEnabled={enabled} publicDemoEnabled={publicDemoEnabled} />

      <main className="bg-[#f7f5ef] px-4 py-10 text-slate-950 md:px-8">
        <div className={premiumPageStack}>
          <section className={premiumHeroSurface}>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-800">Support</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black md:text-5xl">Get help without sharing private career data publicly.</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              Use the right channel for account access, privacy, product problems, or security reports. SkillMint does not currently promise a support-response time.
            </p>
          </section>

          <section className={`${premiumSurface} grid gap-8 md:grid-cols-2`}>
            <div>
              <h2 className="text-2xl font-black">Account, privacy or personal data</h2>
              {contact.status === "configured" ? (
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Contact the monitored SkillMint operations mailbox at{" "}
                  <a className="font-bold text-emerald-800 underline underline-offset-4" href={contact.href ?? undefined}>{contact.email}</a>.
                  Do not send passwords or authentication secrets.
                </p>
              ) : (
                <p className="mt-3 text-sm leading-6 text-amber-900">
                  A verified private support contact is not currently published. For non-sensitive product problems, use the public issue tracker. Do not post personal data there.
                </p>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-black">Product problem or accessibility issue</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Reproducible, non-sensitive bugs and accessibility problems can be reported in the public GitHub issue tracker. Use synthetic examples only; never post names, email addresses, resume text, job-description text, passwords, auth details, or private screenshots.
              </p>
              <a
                className="mt-4 inline-flex min-h-11 items-center font-bold text-emerald-800 underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
                href="https://github.com/tushar-rawat-22/skillmint-app/issues/new/choose"
              >
                Report a public product issue
              </a>
            </div>
          </section>

          <section className={premiumSurface}>
            <h2 className="text-2xl font-black">Security</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Do not disclose a vulnerability in a public issue. Follow the repository security policy for the current reporting path.
            </p>
            <a
              className="mt-4 inline-flex min-h-11 items-center font-bold text-emerald-800 underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
              href="https://github.com/tushar-rawat-22/skillmint-app/security/policy"
            >
              Read the security policy
            </a>
          </section>

          <section className={premiumSurface}>
            <h2 className="text-2xl font-black">Before you contact support</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Public account creation is not available until recovery, abuse protection and persona-boundary checks are complete. If signup is unavailable, that is intentional rather than an account fault.
            </p>
            <Link className="mt-4 inline-flex min-h-11 items-center font-bold text-emerald-800 underline underline-offset-4" href="/login">
              Go to sign in
            </Link>
          </section>
        </div>
      </main>

      <Footer publicDemoEnabled={publicDemoEnabled} />
    </>
  );
}
