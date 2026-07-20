// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN
    || "https://7f85e67c475b91e81dc9de9214b36cd4@o4510750648303616.ingest.de.sentry.io/4510750671634512",

  // Session Replay is attached EAGERLY (owner decision, 2026-07-20). #178 had
  // made it lazy to save ~125 KB raw / ~40 KB gzip of first-load JS on every
  // route, but that left the `replaysOnErrorSampleRate` buffer blind to
  // anything thrown before it attached — early-load and hydration errors lost
  // their replay. Full error-replay coverage is worth the bytes here.
  integrations: [Sentry.replayIntegration()],

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

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
