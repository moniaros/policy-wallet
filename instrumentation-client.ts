// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN
    || "https://7f85e67c475b91e81dc9de9214b36cd4@o4510750648303616.ingest.de.sentry.io/4510750671634512",

  // Session Replay is NOT listed here on purpose — it is attached lazily below.
  // Bundling it statically costs ~125 KB raw / ~40 KB gzip of first-load JS on
  // *every* route, marketing pages included.
  integrations: [],

  // 10% traced in production; override with NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE.
  tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // 10% of sessions replayed, 100% when an error occurs.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // GDPR: no PII to Sentry by default.
  sendDefaultPii: false,
});

// Attach Session Replay after the page has gone idle. It is fetched from the
// Sentry CDN (already allowed by the script-src CSP in next.config.ts) instead
// of riding in the app bundle, so it no longer counts as first-load JS.
// Trade-off: replay starts a beat after load rather than at init, so the
// buffer for `replaysOnErrorSampleRate` misses errors thrown before it attaches.
// To revert, drop this block and put `Sentry.replayIntegration()` back above.
if (typeof window !== "undefined") {
  const attachReplay = () => {
    Sentry.lazyLoadIntegration("replayIntegration")
      .then((replayIntegration) => {
        Sentry.addIntegration(replayIntegration());
      })
      .catch(() => {
        // Replay is best-effort telemetry — never let it break the page.
      });
  };

  const idle = (window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void;
  }).requestIdleCallback;

  if (typeof idle === "function") {
    idle(attachReplay, { timeout: 5000 });
  } else {
    window.setTimeout(attachReplay, 2000);
  }
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
