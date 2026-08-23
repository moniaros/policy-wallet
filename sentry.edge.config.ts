// Sentry initialization for the edge runtime (middleware, edge routes).
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from "@sentry/nextjs";
import { scrubEvent, resolveSentryDsn, resolveSentryEnvironment } from "./lib/observability/sentry-scrub";

Sentry.init({
  dsn: resolveSentryDsn(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)
    || "https://7f85e67c475b91e81dc9de9214b36cd4@o4510750648303616.ingest.de.sentry.io/4510750671634512",

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


  // GDPR: no PII to Sentry by default.
  sendDefaultPii: false,
  beforeSend: scrubEvent,
});
