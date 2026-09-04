"use client"

import type { ReactNode } from "react"
import NextTopLoader from "nextjs-toploader"
import { MotionProvider } from "./MotionProvider"
import { OfflineProvider } from "./OfflineProvider"

/**
 * The providers only the signed-in app needs.
 *
 * These used to sit in the root layout, so every marketing page shipped
 * framer-motion (MotionConfig), the offline banner and the route-progress
 * bar to visitors who would never trigger any of them — on the routes where
 * mobile LCP decides whether anyone signs up. The root keeps what the whole
 * site shares (language, theme, consent, the toaster the public pricing page
 * also raises, analytics); the app layouts — `(protected)`, `auth`,
 * `onboarding` — mount this on top of it.
 *
 * `tests/unit/reduced-motion.test.ts` pins that every layout with framer-motion
 * consumers mounts this, because MotionConfig is what makes those animations
 * honour the OS "reduce motion" setting.
 */
export function AppProviders({ children }: { children: ReactNode }) {
    return (
        <>
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
            <MotionProvider>
                <OfflineProvider>{children}</OfflineProvider>
            </MotionProvider>
        </>
    )
}
