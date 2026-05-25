// Client-side instrumentation. Runs before frontend code executes.
// See node_modules/next/dist/docs/01-app/02-guides/analytics.md
// and node_modules/next/dist/docs/01-app/02-guides/instrumentation.md

import { initPostHog } from "./lib/posthog/client";

initPostHog();
