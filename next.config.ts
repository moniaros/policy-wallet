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
            value: `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://checkout.stripe.com https://static.cloudflareinsights.com https://browser.sentry-cdn.com https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' blob: data: https://storage.googleapis.com https://www.googletagmanager.com${supabaseCspSource}; font-src 'self' data: https://fonts.gstatic.com; frame-src 'self' https://checkout.stripe.com; connect-src 'self' https://api.stripe.com https://api.brevo.com https://static.cloudflareinsights.com https://*.policywallet.gr${supabaseCspSource} https://*.sentry.io https://*.google-analytics.com https://www.googletagmanager.com;`,
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

import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
  },
});

let finalConfig: NextConfig = withPWA(nextConfig);

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
