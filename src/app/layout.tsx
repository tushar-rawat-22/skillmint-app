import "./globals.css";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SkillMint | Career Operating System",
  description:
    "SkillMint is a proof-aware Career Operating System with deterministic resume evidence, role-fit, and next-step guidance.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
