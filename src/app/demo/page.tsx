import { notFound } from "next/navigation";

import { getPublicDemoConfiguration } from "@/config/publicDemo";
import SyntheticDemoReport from "@/modules/publicDemo/SyntheticDemoReport";

export default function DemoPage() {
  const { enabled } = getPublicDemoConfiguration();

  if (!enabled) {
    notFound();
  }

  return <SyntheticDemoReport />;
}
