export default function ProofLinksPlaceholderCard() {
  const proofSources = [
    "GitHub",
    "LeetCode",
    "LinkedIn",
    "Portfolio",
  ];

  return (
    <article className="rounded-3xl border border-white/10 bg-[linear-gradient(145deg,rgba(124,58,237,0.12),rgba(15,23,42,0.78))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-300/80">
        Proof Links
      </p>

      <h2 className="mt-3 text-xl font-black text-white">
        Add proof links soon
      </h2>

      <p className="mt-3 text-sm leading-6 text-gray-400">
        Future proof profiles will help SkillMint compare claimed skills
        against public evidence. For now, add important links directly inside
        your resume before upload.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {proofSources.map((source) => (
          <span
            key={source}
            className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-semibold text-gray-300"
          >
            {source}
          </span>
        ))}
      </div>
    </article>
  );
}
