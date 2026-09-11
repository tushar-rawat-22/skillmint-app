import type { Metadata } from "next";
import type { ReactNode } from "react";

import { requireAccountPersona } from "@/modules/accountPersonaRoute";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function RecruiterWorkspaceLayout({ children }: { children: ReactNode }) {
  await requireAccountPersona("RECRUITER");
  return children;
}
