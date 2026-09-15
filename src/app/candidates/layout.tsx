import type { Metadata } from "next";

import { publicPageMetadata } from "@/config/site";

export const metadata: Metadata = publicPageMetadata({
  title: "SkillMint for Candidates | Evidence-backed career decisions",
  description:
    "Turn your resume into a clear evidence map for the role you want, see the most useful gap, and choose the next step to strengthen your profile.",
  path: "/candidates",
});

export default function CandidatesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
