import "./globals.css";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SkillMint | Career Operating System",
  description:
    "SkillMint is a proof-aware Career Operating System with deterministic resume evidence, role-fit, and next-step guidance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
