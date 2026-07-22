import { handleAnalyticsPost } from "./handler";
import {
  persistAnalyticsEvent,
} from "@/modules/analytics/services/analyticsEventRepository";

export async function POST(request: Request) {
  return handleAnalyticsPost(request, {
    enabled: process.env.ANALYTICS_COLLECTION_ENABLED === "true",
    persist: persistAnalyticsEvent,
  });
}
