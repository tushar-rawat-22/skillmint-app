import { getFounderAnalyticsConfiguration } from "@/config/founderAnalytics";
import { getServerAnalyticsContext } from "@/app/api/analytics/events/normalization";
import { handleFounderAnalyticsSummaryGet } from "./handler";
import {
  createProcessLocalFounderDashboardLimiter,
  createProcessLocalPreAuthLimiter,
} from "@/modules/analytics/founderDashboardRateLimit";
import {
  authenticateFounderAnalyticsToken,
  loadFounderAnalyticsAggregate,
} from "@/modules/analytics/services/founderAnalyticsServer";

// Defense in depth only: serverless instances do not share this state. A
// separately configured Vercel WAF rule remains required before rollout.
const preAuthLimiter = createProcessLocalPreAuthLimiter();
const founderLimiter = createProcessLocalFounderDashboardLimiter();

export async function GET(request: Request) {
  const founderConfiguration = getFounderAnalyticsConfiguration();
  return handleFounderAnalyticsSummaryGet(request, {
    founderUserId: founderConfiguration.enabled
      ? founderConfiguration.founderUserId
      : null,
    canonicalEnvironment: getServerAnalyticsContext().environment,
    authenticate: authenticateFounderAnalyticsToken,
    loadAggregate: loadFounderAnalyticsAggregate,
    preAuthLimiter,
    founderLimiter,
  });
}
