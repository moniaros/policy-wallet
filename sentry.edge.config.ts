// Sentry initialization for the edge runtime (middleware, edge routes).
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // Environment only. A hardcoded fallback DSN meant every developer machine,
  // preview and fork silently reported into the production project, mixing
  // noise into the signal the on-call rotation watches. With no DSN configured
  // the SDK simply stays inert, which is the correct behaviour for an
  // environment nobody has set up for error reporting.
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),

  enableLogs: true,

  // GDPR: no PII to Sentry by default.
  sendDefaultPii: false,
});
