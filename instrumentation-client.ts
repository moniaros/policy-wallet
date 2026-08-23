// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
//
// This is the ONLY client-side Sentry init. Next 16 loads `instrumentation-client.ts`
// automatically; the old `sentry.client.config.ts` convention is not read at all,
// which is why the noise filter and the development drop that used to live there
// were silently inert — every local `npm run dev` error was reaching the
// production Sentry project, and the ignore-list nobody thought to question was
// never applied.

import * as Sentry from "@sentry/nextjs";
import { scrubEvent, resolveSentryDsn, resolveSentryEnvironment } from "./lib/observability/sentry-scrub";

Sentry.init({
  dsn: resolveSentryDsn(process.env.NEXT_PUBLIC_SENTRY_DSN)
    || "https://7f85e67c475b91e81dc9de9214b36cd4@o4510750648303616.ingest.de.sentry.io/4510750671634512",

  // Must match what the SERVER runtimes report for the same deployment, or a
  // filter on `environment` cannot answer "is this affecting customers?".
  // NODE_ENV is "production" on a preview build too — see resolveSentryEnvironment.
  environment: resolveSentryEnvironment({
    sentryEnvironment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
    vercelEnv: process.env.NEXT_PUBLIC_VERCEL_ENV,
    nodeEnv: process.env.NODE_ENV,
  }),

  // A developer's own broken branch is not a production incident. Reporting it
  // to the shared project buries the real ones.
  enabled: process.env.NODE_ENV === "production",

  // Session Replay is attached EAGERLY (owner decision, 2026-07-20). #178 had
  // made it lazy to save ~125 KB raw / ~40 KB gzip of first-load JS on every
  // route, but that left the `replaysOnErrorSampleRate` buffer blind to
  // anything thrown before it attached — early-load and hydration errors lost
  // their replay. Full error-replay coverage is worth the bytes here.
  //
  // Masking is explicit rather than inherited: a replay of an insurance wallet
  // shows policy numbers, premiums and names, and relying on a library default
  // for that is not a decision anyone made.
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
  ],

  // 10% traced in production; override with NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE.
  tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // 10% of sessions replayed, 100% when an error occurs.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // GDPR: no PII to Sentry by default.
  sendDefaultPii: false,

  // Noise that is never actionable: browser extensions injecting into the page,
  // and the network failures that are a user's train entering a tunnel rather
  // than a defect of ours.
  ignoreErrors: [
    // Browser extensions and injected scripts
    "top.GLOBALS",
    "originalCreateNotification",
    "canvas.contentDocument",
    "MyApp_RemoveAllHighlights",
    "fb_xd_fragment",
    // ISP "optimizing" proxies
    "bmi_SafeAddOnload",
    "EBCallBackMessageReceived",
    "Can't find variable: ZiteReader",
    "jigsaw is not defined",
    "ComboSearch is not defined",
    // Connectivity, not correctness
    "NetworkError",
    "Network request failed",
    "Failed to fetch",
    "AbortError",
    "The operation was aborted",
  ],

  // Same PII net as the server and edge runtimes.
  beforeSend: scrubEvent,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
