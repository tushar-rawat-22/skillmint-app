import "server-only";

import type { Metadata } from "next";
import type { ReactNode } from "react";

import { requireAccountPersona } from "@/modules/accountPersonaRoute";

export const candidateWorkspaceMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CandidateWorkspaceRoute({
  children,
}: {
  children: ReactNode;
}) {
  await requireAccountPersona("CANDIDATE");
  return children;
}
