import type { Metadata } from "next";

export const PUBLIC_SITE_ORIGIN = "https://skillmint-app-three.vercel.app";
export const PUBLIC_SITE_NAME = "SkillMint";

export function publicPageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const url = new URL(path, PUBLIC_SITE_ORIGIN).toString();

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      type: "website",
      siteName: PUBLIC_SITE_NAME,
      title,
      description,
      url,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}
