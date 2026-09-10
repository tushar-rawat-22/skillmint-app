import type { Metadata } from "next";

import { publicPageMetadata } from "@/config/site";

export const metadata: Metadata = publicPageMetadata({
  title: "SkillMint Privacy | Data and trust boundaries",
  description:
    "Understand how SkillMint handles resume evidence, account-synced data, browser-local state, exports, deletion, and candidate-authorized sharing.",
  path: "/privacy",
});

export default function PrivacyLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
