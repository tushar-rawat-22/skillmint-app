import "./globals.css";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SkillMint | Career Operating System",
  description:
    "SkillMint is an AI-powered Career Operating System helping students and professionals continuously improve their careers.",
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