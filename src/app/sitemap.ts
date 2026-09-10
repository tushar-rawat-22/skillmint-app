import type { MetadataRoute } from "next";

import { PUBLIC_SITE_ORIGIN } from "@/config/site";

const PUBLIC_PATHS = ["/", "/candidates", "/recruiters", "/privacy"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map((path) => ({
    url: new URL(path, PUBLIC_SITE_ORIGIN).toString(),
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.8,
  }));
}
