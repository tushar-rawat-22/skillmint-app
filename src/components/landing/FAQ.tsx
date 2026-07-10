const faqs = [
  {
    q: "What is Career IQ?",
    a: "Career IQ is a trust-adjusted readiness signal built from resume signals and Proof Confidence. It is not a job guarantee.",
  },
  {
    q: "Why upload a resume first?",
    a: "Your resume gives SkillMint real evidence candidates before it suggests profile-fit roles, proof gaps, JD matches, or roadmap actions.",
  },
  {
    q: "Do I need an account?",
    a: "No. SkillMint works in this browser first. Sign in when you want supported analyses and roadmap progress saved to your account.",
  },
  {
    q: "Is SkillMint paid?",
    a: "SkillMint is free during beta. Paid beta interest is only a signal for future deeper guidance, not a payment or paywall.",
  },
];

export default function FAQ() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
          FAQ
        </p>

        <h2 className="mt-4 text-4xl font-black text-slate-950 md:text-5xl">
          Questions before you trust a score.
        </h2>

        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600">
          SkillMint is direct by design, so the limits matter as much as the
          scores.
        </p>
      </div>

      <div className="mt-10 grid gap-4">
        {faqs.map((faq) => (
          <div
            key={faq.q}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]"
          >
            <h3 className="text-lg font-bold text-slate-950">
              {faq.q}
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              {faq.a}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
