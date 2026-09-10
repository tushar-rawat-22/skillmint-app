import type { Metadata } from "next";

import { publicPageMetadata } from "@/config/site";

export const metadata: Metadata = publicPageMetadata({
  title: "SkillMint for Candidates | Evidence-backed career decisions",
  description:
    "Turn your resume into an evidence map for the role you want, understand what is supported or missing, and decide what to do next without hiring-probability claims.",
  path: "/candidates",
});

export default function CandidatesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
