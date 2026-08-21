// Sentry initialization for the edge runtime (middleware, edge routes).
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from "@sentry/nextjs";
import { scrubEvent, resolveSentryDsn } from "./lib/observability/sentry-scrub";

Sentry.init({
  dsn: resolveSentryDsn(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)
    || "https://7f85e67c475b91e81dc9de9214b36cd4@o4510750648303616.ingest.de.sentry.io/4510750671634512",

  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),

  enableLogs: true,

  // GDPR: no PII to Sentry by default.
  sendDefaultPii: false,
  beforeSend: scrubEvent,
});
