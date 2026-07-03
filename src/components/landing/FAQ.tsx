const faqs = [
  {
    q: "What is Career IQ?",
    a: "Career IQ is SkillMint's career-readiness report built from your resume signals."
  },
  {
    q: "Why upload a resume first?",
    a: "Your resume gives SkillMint real evidence before it suggests ATS matches, gaps, or roadmap actions."
  },
  {
    q: "Do I need an account?",
    a: "No. SkillMint works locally first. Sign in later if you want to sync your analyses and roadmap."
  }
];

export default function FAQ() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <h2 className="text-center text-5xl font-black">
        Frequently Asked Questions
      </h2>

      <div className="mt-16 space-y-8">
        {faqs.map((faq) => (
          <div
            key={faq.q}
            className="rounded-2xl border border-gray-800 p-8"
          >
            <h3 className="text-xl font-bold">
              {faq.q}
            </h3>

            <p className="mt-4 text-gray-400">
              {faq.a}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
