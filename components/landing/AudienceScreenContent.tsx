"use client"

import { AppScreen, WalletScreen, AdvisorScreen } from "./real-screens/RealScreens"
import type { LandingLocale } from "@/types/landing-content"

/** Existing application components, on their existing labelled fixture data. */
export default function AudienceScreenContent({ locale, kind }: { locale: LandingLocale; kind: "wallet" | "agent" }) {
    return <AppScreen locale={locale} fixed animateEntrance={false} chrome="none" defaultScale={0.8}>
        {kind === "wallet" ? <WalletScreen locale={locale} showSummary={false} /> : <AdvisorScreen locale={locale} />}
    </AppScreen>
}
