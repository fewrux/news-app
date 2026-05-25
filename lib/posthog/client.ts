import posthog, { type PostHog } from "posthog-js";

// Re-exported singleton for client-side capture. `null` when env is missing
// (e.g. local dev without keys) so calling code can `posthog?.capture(...)`.
let initialized: PostHog | null = null;

export function getPostHog(): PostHog | null {
  if (typeof window === "undefined") return null;
  return initialized;
}

export function initPostHog(): PostHog | null {
  if (typeof window === "undefined") return null;
  if (initialized) return initialized;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host =
    process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

  if (!key) return null;

  posthog.init(key, {
    api_host: host,
    capture_pageview: true,
    autocapture: true,
    persistence: "localStorage+cookie",
    session_recording: {
      maskAllInputs: true,
    },
    loaded: (ph) => {
      // Stay within the 5k replays/month free quota by sampling at 10%.
      if (Math.random() > 0.1) ph.stopSessionRecording();
    },
  });

  initialized = posthog;
  return initialized;
}

export { posthog };
