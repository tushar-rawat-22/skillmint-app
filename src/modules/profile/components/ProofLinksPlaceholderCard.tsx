export default function ProofLinksPlaceholderCard() {
  const proofSources = [
    "GitHub",
    "LeetCode",
    "LinkedIn",
    "Portfolio",
  ];

  return (
    <article className="rounded-3xl border border-violet-200 bg-violet-50 p-6 text-slate-950 shadow-[0_14px_42px_rgba(15,23,42,0.06)]">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-700">
        Proof Links
      </p>

      <h2 className="mt-3 text-xl font-black text-slate-950">
        Add proof links soon
      </h2>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        Future proof profiles will help SkillMint compare claimed skills
        against public evidence. For now, add important links directly inside
        your resume before upload.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {proofSources.map((source) => (
          <span
            key={source}
            className="rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-semibold text-violet-800"
          >
            {source}
          </span>
        ))}
      </div>
    </article>
  );
}
