const faqs = [
  {
    q: "What is Career IQ?",
    a: "Career IQ measures your employability using explainable AI."
  },
  {
    q: "Is SkillMint free?",
    a: "Yes. A generous free tier will always be available."
  },
  {
    q: "Does SkillMint replace LinkedIn?",
    a: "No. SkillMint improves your profile before you apply anywhere."
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