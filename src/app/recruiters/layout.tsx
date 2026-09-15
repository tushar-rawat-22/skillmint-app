import type { Metadata } from "next";

import { publicPageMetadata } from "@/config/site";

export const metadata: Metadata = publicPageMetadata({
  title: "SkillMint for Recruiters | Candidate-authorized evidence",
  description:
    "Review candidate-authorized evidence against a role, see what is supported or still unclear, and turn gaps into better human interview questions.",
  path: "/recruiters",
});

export default function RecruitersLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
