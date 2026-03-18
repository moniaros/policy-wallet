import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Toaster } from "sonner";
import NextTopLoader from 'nextjs-toploader';
import { OfflineProvider } from "@/components/providers/OfflineProvider";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { GoogleAnalyticsWebVitals } from "@/components/analytics/GoogleAnalyticsWebVitals";
import { CookieConsentBanner } from "@/components/compliance/CookieConsentBanner";

import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "PolicyWallet",
  description: "Your neutral insurance wallet.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0d9488",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="el" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-background text-foreground">
        <NextTopLoader
          color="#0d9488"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
        />
        <LanguageProvider>
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
        </LanguageProvider>
        <Toaster richColors position="top-right" />
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
        <GoogleAnalyticsWebVitals />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
