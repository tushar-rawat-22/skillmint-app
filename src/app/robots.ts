import type { MetadataRoute } from "next";

import { PUBLIC_SITE_ORIGIN } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/candidates", "/recruiters", "/privacy"],
      disallow: [
        "/api/",
        "/ats",
        "/brief",
        "/dashboard",
        "/forgot-password",
        "/jobs",
        "/login",
        "/onboarding",
        "/profile",
        "/reset-password",
        "/resume",
        "/roadmap",
        "/settings",
        "/setup",
        "/signup",
        "/upload",
        "/recruiters/workspace",
      ],
    },
    sitemap: `${PUBLIC_SITE_ORIGIN}/sitemap.xml`,
    host: PUBLIC_SITE_ORIGIN,
  };
}
