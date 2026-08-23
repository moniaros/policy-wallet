// Sentry initialization for the server runtime (see instrumentation.ts).
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from "@sentry/nextjs";
import { scrubEvent, resolveSentryDsn, resolveSentryEnvironment } from "./lib/observability/sentry-scrub";

Sentry.init({
  dsn: resolveSentryDsn(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)
    || "https://7f85e67c475b91e81dc9de9214b36cd4@o4510750648303616.ingest.de.sentry.io/4510750671634512",

  // 10% of transactions traced in production — 100% would be cost-prohibitive
  // at scale. Override with SENTRY_TRACES_SAMPLE_RATE (e.g. 1.0 in staging).
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),

  enableLogs: true,

  environment: resolveSentryEnvironment({
    sentryEnvironment: process.env.SENTRY_ENVIRONMENT,
    vercelEnv: process.env.VERCEL_ENV,
    nodeEnv: process.env.NODE_ENV,
  }),

  // A developer's own broken branch is not a production incident — the same
  // rule the client has always had, which the server runtimes never got. Every
  // local `npm run dev` error was reaching the shared project: on 2026-08-23 a
  // few hours of local work put 30+ events into the stream, including a
  // `ReferenceError` from a half-finished edit that had to be manually proven
  // NOT to be a production regression. Noise is how the real ones get missed.
  enabled: process.env.NODE_ENV === "production",


  // GDPR: do NOT ship IPs/headers/cookies to Sentry by default.
  sendDefaultPii: false,

  // ...and scrub the fields we pass DELIBERATELY. `sendDefaultPii` only covers
  // what the SDK collects on its own; an address a call site puts in a tag or
  // an upstream provider quotes back in an error message sails straight past
  // it into a searchable third-party index.
  beforeSend: scrubEvent,
});
