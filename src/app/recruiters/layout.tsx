import type { Metadata } from "next";

import { publicPageMetadata } from "@/config/site";

export const metadata: Metadata = publicPageMetadata({
  title: "SkillMint for Recruiters | Candidate-authorized evidence",
  description:
    "Review candidate-authorized evidence against a role, separate supported from unclear requirements, and give structured feedback without hidden ranking or raw-resume access.",
  path: "/recruiters",
});

export default function RecruitersLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
