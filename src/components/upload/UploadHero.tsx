import {
  premiumEyebrow,
  premiumHeroSurface,
} from "@/components/ui/premium";

export default function UploadHero() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 text-center">
      <div className={`${premiumHeroSurface} mx-auto max-w-4xl px-6 py-12`}>
        <p className={premiumEyebrow}>
          Resume Intelligence
        </p>

        <h1 className="mt-6 text-5xl font-black md:text-6xl">
          Upload your resume
        </h1>

        <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-slate-600 md:text-xl">
          SkillMint reads your resume proof, builds your Career IQ, and shows
          the next fix before you match a job.
        </p>
      </div>
    </section>
  );
}
