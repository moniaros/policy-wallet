import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

// Derive the Supabase origin from env so the CSP always matches the project
// the deployment actually talks to (hardcoding a project ref breaks sign-in
// the moment the Supabase project changes).
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").origin;
  } catch {
    return "";
  }
})();
const supabaseCspSource = supabaseOrigin ? ` ${supabaseOrigin}` : "";

// @vercel/analytics and @vercel/speed-insights load their DEBUG bundles from
// va.vercel-scripts.com, but ONLY under `isDevelopment()`. In production both
// resolve to same-origin `/_vercel/insights/script.js` and
// `/_vercel/speed-insights/script.js`, which `'self'` already covers — so
// production analytics was never broken and this must NOT loosen the
// production policy. Locally it logged two CSP violations on every single page
// (146 of 146 routes in the 2026-08-21 sweep), which is enough noise to hide a
// real error.
const devScriptSrc =
  process.env.NODE_ENV === "development" ? " https://va.vercel-scripts.com" : "";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.picard.replit.dev", "*.replit.dev"],
  experimental: {
    serverActions: {
      // Policy PDFs are uploaded through Server Actions (agent scan/commit,
      // wallet, onboarding), NOT only through API routes. Next's default cap
      // is 1 MB, so every file between 1 MB and the 10-15 MB that
      // validateUploadFile allows was killed by the runtime BEFORE the action
      // ran — the app's own size-rejection message could never fire, and the
      // client saw an opaque "unexpected response" (Sentry POLICYWALLET-V).
      // Sized above MAX_UPLOAD_SIZE_BYTES (15 MB) to leave room for the
      // multipart envelope and the other form fields.
      bodySizeLimit: "16mb",
    },
  },
  // unpdf ships its own ~2 MB pdf.js build behind a dynamic import. Kept out
  // of the bundle graph and resolved from node_modules at runtime (Vercel's
  // file tracing follows it), which is how the document gate reads PDFs.
  serverExternalPackages: ["unpdf"],
  turbopack: {
    // Pin the app root to avoid workspace root inference from parent lockfiles.
    root: process.cwd(),
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            // `worker-src` must be explicit: without it browsers fall back to
            // `script-src`, which has no `blob:`, so Sentry Session Replay's
            // blob-URL compression worker was refused on EVERY page — a console
            // error for every visitor and a degraded replay feed. Scoped to
            // same-origin and same-origin blobs; `script-src` is NOT loosened.
            value: `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'${devScriptSrc} https://checkout.stripe.com https://static.cloudflareinsights.com https://browser.sentry-cdn.com https://www.googletagmanager.com; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' blob: data: https://storage.googleapis.com https://www.googletagmanager.com${supabaseCspSource}; font-src 'self' data: https://fonts.gstatic.com; frame-src 'self' https://checkout.stripe.com; connect-src 'self' https://api.stripe.com https://api.brevo.com https://static.cloudflareinsights.com https://*.policywallet.gr${supabaseCspSource} https://*.sentry.io https://*.google-analytics.com https://www.googletagmanager.com;`,
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

// `@ducanh2912/next-pwa` used to wrap the config here. It has been removed
// deliberately, for two reasons.
//
// 1. **It generated nothing.** It is a webpack plugin, and Next 16 builds with
//    Turbopack — no service worker and no workbox asset was emitted by any
//    build. Every option below it (`cacheOnFrontEndNav`, `reloadOnOnline`,
//    `aggressiveFrontEndNavCaching`) read like offline support the product had,
//    and none of it existed.
//
// 2. **It was aimed at the file push depends on.** `dest: "public"` means it
//    writes `public/sw.js` — the hand-written push service worker. The moment a
//    build went through webpack again (a flag, a downgrade, a plugin), it would
//    have overwritten that file and push notifications would have stopped with
//    no error, no failing test, and no diff to notice.
//
// The product does not want precaching in any case: `public/sw.js` says so in
// its own header — an offline cache for an app whose job is showing CURRENT
// policy data is a way to show someone stale cover. Installability comes from
// `public/manifest.json` plus that service worker, neither of which needed this.
let finalConfig: NextConfig = nextConfig;

if (process.env.SENTRY_ORG && process.env.SENTRY_PROJECT) {
  const { withSentryConfig } = require("@sentry/nextjs");
  finalConfig = withSentryConfig(finalConfig, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    silent: !process.env.CI,
    widenClientFileUpload: true,
    tunnelRoute: "/monitoring",
    hideSourceMaps: true,
  });
}

export default withSentryConfig(finalConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "policywallet",

  project: "policywallet",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
