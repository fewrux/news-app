"use client";

import { useReportWebVitals } from "next/web-vitals";
import { getPostHog } from "../../lib/posthog/client";

// Pipes Core Web Vitals to PostHog. Doc consulted:
// node_modules/next/dist/docs/01-app/02-guides/analytics.md
export function WebVitals() {
  useReportWebVitals((metric) => {
    const ph = getPostHog();
    if (!ph) return;

    ph.capture("$web_vitals", {
      metric_name: metric.name,
      metric_id: metric.id,
      metric_value: metric.value,
      metric_rating: metric.rating,
      navigation_type: metric.navigationType,
    });
  });

  return null;
}
