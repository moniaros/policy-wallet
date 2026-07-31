import type { Metadata, Viewport } from "next";
import { inter } from "@/lib/fonts"
import { Suspense } from "react";
import "./globals.css";

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
    default: "PolicyWallet — Το ψηφιακό ασφαλιστικό σας πορτοφόλι",
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
