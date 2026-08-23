import { notFound } from "next/navigation";

import { getPublicDemoConfiguration } from "@/config/publicDemo";
import SyntheticRecruiterDemo from "@/modules/recruiterDemo/SyntheticRecruiterDemo";

export default function RecruiterDemoPage() {
  const { enabled } = getPublicDemoConfiguration();

  if (!enabled) {
    notFound();
  }

  return <SyntheticRecruiterDemo />;
}
