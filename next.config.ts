import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.picard.replit.dev", "*.replit.dev"],
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
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://checkout.stripe.com https://static.cloudflareinsights.com https://browser.sentry-cdn.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' blob: data: https://storage.googleapis.com https://lzqvtvjggylcujenlelh.supabase.co; font-src 'self' data: https://fonts.gstatic.com; frame-src 'self' https://checkout.stripe.com; connect-src 'self' https://api.stripe.com https://api.brevo.com https://static.cloudflareinsights.com https://*.policywallet.gr https://lzqvtvjggylcujenlelh.supabase.co https://*.sentry.io;",
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

export default finalConfig;
