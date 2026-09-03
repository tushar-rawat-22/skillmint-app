import "./globals.css";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SkillMint | Know What Your Resume Proves",
  description:
    "See what your resume supports for the role you want, what evidence is missing, and what to improve next.",
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
