import posthog from "posthog-js";

export const initPostHog = () => {
  if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: false, // We'll capture manually for more control
      capture_pageleave: true,
    });
  }
};

export const captureError = (
  error: Error,
  context?: Record<string, unknown>
) => {
  if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.capture("error", {
      error_message: error.message,
      error_stack: error.stack,
      ...context,
    });
  }
};

export const capturePageView = (path: string) => {
  if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.capture("$pageview", {
      $current_url: window.location.href,
      path,
    });
  }
};

export const identifyUser = (userId: string, properties?: Record<string, unknown>) => {
  if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.identify(userId, properties);
  }
};

export const resetUser = () => {
  if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.reset();
  }
};

export default posthog;
