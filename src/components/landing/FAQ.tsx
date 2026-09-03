const boundaries = [
  {
    q: "What does SkillMint verify?",
    a: "SkillMint analyzes resume-internal text and evidence candidates. It does not visit repositories or independently verify links, identity, education, employment, or candidate truthfulness.",
  },
  {
    q: "Does it predict hiring outcomes?",
    a: "No. Career IQ, Proof Confidence, ATS readiness, and one-job relevance are deterministic product signals—not employment, recruiter, shortlist, interview, or salary probabilities.",
  },
  {
    q: "How is the public demo different from real analysis?",
    a: "The public demo is fixed, synthetic, read-only, and isolated from Supabase and analytics. Real-resume analysis requires an authenticated existing pilot account.",
  },
  {
    q: "Who is responsible for the final resume?",
    a: "The candidate is. SkillMint can identify support and gaps, but candidates must review every claim and decide what is accurate before using a resume.",
  },
];

export default function FAQ() {
  return (
    <section className="border-y border-slate-200 bg-[#f7f5ef] px-6 py-20">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.7fr_1.3fr]">
        <div>
          <p className="text-sm font-semibold text-emerald-800">
            Trust boundary
          </p>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.03em] text-slate-950 md:text-5xl">
            The limits are part of the product.
          </h2>
          <p className="mt-5 text-base leading-7 text-slate-600">
            Clear boundaries make the analysis more useful. SkillMint shows
            what it detected, what it did not, and what remains the candidate’s
            responsibility.
          </p>
        </div>

        <div className="border-t border-slate-300">
          {boundaries.map((boundary) => (
            <details
              key={boundary.q}
              className="group border-b border-slate-300 py-5"
            >
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-bold text-slate-950 marker:content-none">
                {boundary.q}
                <span aria-hidden="true" className="text-xl text-emerald-800 group-open:rotate-45 motion-safe:transition-transform">
                  +
                </span>
              </summary>
              <p className="max-w-3xl pb-2 pt-3 text-sm leading-6 text-slate-600">
                {boundary.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
