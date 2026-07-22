import type { Metadata } from "next";

import FounderAnalyticsDashboard from "@/modules/analytics/components/FounderAnalyticsDashboard";

export const metadata: Metadata = {
  title: "Product Event Health | SkillMint",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function FounderAnalyticsPage() {
  return <FounderAnalyticsDashboard />;
}
