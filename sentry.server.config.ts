// Sentry initialization for the server runtime (see instrumentation.ts).
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // Environment only. A hardcoded fallback DSN meant every developer machine,
  // preview and fork silently reported into the production project, mixing
  // noise into the signal the on-call rotation watches. With no DSN configured
  // the SDK simply stays inert, which is the correct behaviour for an
  // environment nobody has set up for error reporting.
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 10% of transactions traced in production — 100% would be cost-prohibitive
  // at scale. Override with SENTRY_TRACES_SAMPLE_RATE (e.g. 1.0 in staging).
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),

  enableLogs: true,

  // GDPR: do NOT ship IPs/headers/cookies to Sentry by default.
  sendDefaultPii: false,
});
