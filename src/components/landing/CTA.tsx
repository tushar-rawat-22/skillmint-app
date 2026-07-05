import Link from "next/link";

import { ROUTES } from "@/constants/routes";

export default function CTA() {
  return (
    <section
      id="cta"
      className="mx-auto max-w-5xl px-6 py-28 text-center"
    >
      <h2 className="text-5xl font-black">
        Start your beta career cockpit.
        <br />
        Direction first, resume next.
      </h2>

      <p className="mt-6 text-lg text-gray-400">
        SkillMint works locally first. Sign in later to sync your resume
        analyses, job matches, and roadmap.
      </p>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link
          href={ROUTES.SETUP}
          className="rounded-xl bg-green-600 px-8 py-4 font-semibold text-white transition hover:bg-green-700"
        >
          Start Career Setup
        </Link>

        <Link
          href={ROUTES.UPLOAD}
          className="rounded-xl border border-gray-700 px-8 py-4 font-semibold text-gray-100 transition hover:border-green-500 hover:text-green-300"
        >
          Upload Resume
        </Link>
      </div>
    </section>
  );
}
