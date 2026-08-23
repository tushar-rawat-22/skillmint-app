import Link from "next/link";

import { ROUTES } from "@/constants/routes";

export default function AudiencePaths({
  publicDemoEnabled,
}: {
  publicDemoEnabled: boolean;
}) {
  return (
    <section className="border-b border-slate-200 bg-[#f7f5ef] px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
          One evidence layer · two perspectives
        </p>
        <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-[-0.03em] text-slate-950 md:text-5xl">
          Start with the question you need to answer.
        </h2>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <AudienceCard
            eyebrow="Candidate"
            title="What does my resume support?"
            description="Map your current evidence, find the clearest gap for a target role, choose one useful next action, and re-analyse after the evidence changes."
            href={ROUTES.CANDIDATES}
            cta="I'm a Candidate"
            demoHref={publicDemoEnabled ? ROUTES.DEMO : undefined}
          />
          <AudienceCard
            eyebrow="Recruiter"
            title="What evidence supports this candidate?"
            description="Turn a role into evidence requirements, review a candidate-authorized brief, and ask focused questions where support is weak or unclear."
            href={ROUTES.RECRUITERS}
            cta="I'm Hiring"
            demoHref={publicDemoEnabled ? ROUTES.RECRUITER_DEMO : undefined}
          />
        </div>

        <p className="mt-6 max-w-4xl text-sm leading-6 text-slate-600">
          The product does not rank candidates or make hiring decisions. It
          helps people inspect evidence and keep human judgment explicit.
        </p>
      </div>
    </section>
  );
}

function AudienceCard({
  eyebrow,
  title,
  description,
  href,
  cta,
  demoHref,
}: {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  demoHref?: string;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.06)] md:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
        {eyebrow}
      </p>
      <h3 className="mt-3 text-2xl font-black text-slate-950">{title}</h3>
      <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600">
        {description}
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link
          href={href}
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-emerald-700"
        >
          {cta}
        </Link>
        {demoHref ? (
          <Link
            href={demoHref}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-emerald-400 hover:text-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-emerald-700"
          >
            View synthetic demo
          </Link>
        ) : null}
      </div>
    </article>
  );
}
