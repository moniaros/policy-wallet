import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "greek"],
  variable: "--font-inter",
  display: "swap",
});
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Toaster } from "sonner";
import NextTopLoader from 'nextjs-toploader';
import { OfflineProvider } from "@/components/providers/OfflineProvider";
import { MotionProvider } from "@/components/providers/MotionProvider";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { GoogleAnalyticsWebVitals } from "@/components/analytics/GoogleAnalyticsWebVitals";
import { CookieConsentBanner } from "@/components/compliance/CookieConsentBanner";
import { HtmlLang } from "@/components/HtmlLang";
import { getSiteUrl, isIndexableDeployment, OG_IMAGES, siteConfig, TWITTER_IMAGES } from "@/lib/seo/site";

import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    // The fallback a page inherits when it sets no title of its own — it must
    // carry the CURRENT positioning, not the retired "digital wallet" frame.
    default: "PolicyWallet — Δείτε αν είστε καλυμμένοι",
    template: "%s | PolicyWallet",
  },
  description: siteConfig.description.el,
  applicationName: "PolicyWallet",
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "el_GR",
    siteName: "PolicyWallet",
    images: OG_IMAGES,
  },
  twitter: {
    card: "summary_large_image",
    images: TWITTER_IMAGES,
  },
  // Preview/branch deploys must never compete with production in search.
  ...(isIndexableDeployment()
    ? {}
    : { robots: { index: false, follow: false } }),
};

export const viewport: Viewport = {
  themeColor: "#29685B",
  /**
   * REQUIRED for env(safe-area-inset-*) to return anything but 0.
   *
   * The mobile bottom nav has carried `safe-area-inset-bottom` padding since
   * the NEW-UI refactor (app/globals.css:332, AppShell.tsx:376) — but without
   * `viewport-fit=cover` iOS never reports an inset, so that padding resolved
   * to 0px and the nav sat under the home indicator on every notched iPhone.
   * The CSS was right and inert.
   */
  viewportFit: "cover",
  /**
   * Not `maximumScale: 1`. Locking zoom is the usual companion to this change
   * and it breaks pinch-zoom for low-vision users (WCAG 1.4.4). The
   * zoom-on-focus problem is solved properly instead — every input is ≥16px,
   * asserted by the mobile matrix.
   */
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="el" suppressHydrationWarning className={inter.variable}>
      <head>
        {/*
         * Stamp <html lang="en"> for /en/* BEFORE first paint.
         *
         * The root layout serves one shared shell for every route and cannot
         * read the pathname without headers(), which would force the whole
         * tree dynamic and kill static generation of the marketing pages. So
         * SSR emits the Greek default and this blocking script corrects it
         * from location.pathname on the very first parse.
         *
         * HtmlLang (client leaf) still handles client-side NAVIGATION between
         * the /en and Greek trees; this only fixes the initial document, which
         * is what a screen reader announces on load (WCAG 3.1.1) — previously
         * English pages were voiced with Greek phonology until hydration.
         *
         * NOTE: this does not help crawlers that never execute JS; those still
         * read lang="el" on /en/*. The complete fix is per-locale root layouts
         * (Next.js multiple root layouts), which is a structural change to the
         * whole app/ tree — tracked separately, deliberately not done here.
         */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=location.pathname;if(p==="/en"||p.indexOf("/en/")===0){var e=document.documentElement;e.setAttribute("lang","en");e.setAttribute("data-locale","en-GB");e.dataset.htmlLangEnRoute="true";}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased min-h-screen bg-background text-foreground">
        <NextTopLoader
          color="#29685B"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
        />
        <LanguageProvider>
          <MotionProvider>
          <OfflineProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <CookieConsentBanner />
            </ThemeProvider>
          </OfflineProvider>
          </MotionProvider>
        </LanguageProvider>
        <Toaster richColors position="top-right" />
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
        <GoogleAnalyticsWebVitals />
        <Analytics />
        <SpeedInsights />
        {/* Must stay the last child of <body>: see components/HtmlLang.tsx. */}
        <Suspense fallback={null}>
          <HtmlLang />
        </Suspense>
      </body>
    </html>
  );
}
