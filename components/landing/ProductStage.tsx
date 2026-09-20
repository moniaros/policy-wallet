"use client"

import { useState } from "react"
import { FileText } from "lucide-react"
import { DeviceFrame } from "@/src/design-system"
import { AppScreen, DashboardScreen, WalletScreen, CoverageMapScreen, SampleStamp } from "./real-screens/RealScreens"
import { DepthSurface } from "./DepthSurface"
import { interactiveCopy as C } from "@/lib/marketing/interactive-copy"
import type { MarketingLocale } from "@/lib/marketing/positioning"
import { trackGoogleEvent } from "@/lib/analytics/google-analytics"

export function ProductStage({ locale }: { locale: MarketingLocale }) {
    const [active, setActive] = useState(0)
    const screens = [
        { id: "overview", label: C.overview[locale], content: <AppScreen locale={locale} fixed animateEntrance={false} active={active === 0} tab="home" defaultScale={264 / 390}><DashboardScreen locale={locale} /></AppScreen> },
        { id: "wallet", label: C.wallet[locale], content: <AppScreen locale={locale} fixed animateEntrance={false} active={active === 1} tab="wallet" defaultScale={264 / 390}><WalletScreen locale={locale} /></AppScreen> },
        { id: "coverage", label: C.coverage[locale], content: <AppScreen locale={locale} fixed animateEntrance={false} active={active === 2} tab="protection" defaultScale={264 / 390}><CoverageMapScreen locale={locale} /></AppScreen> },
    ]
    return <div className="pw-product-stage">
        <DepthSurface>
            <div className="pw-product-paper" aria-hidden="true" data-active={active === 1}>
                <FileText size={28} />
                <p>{C.sample[locale]}</p>
                <hr className="my-3" /><p>{C.information[locale]}</p>
            </div>
            <div className="pw-product-device">
                <DeviceFrame screens={screens} width={280} padded={false} autoplay={false} selectedIndex={active} showControls={false} />
            </div>
        </DepthSurface>
        <div className="pw-stage-controls" role="group" aria-label={C.views[locale]}>
            {screens.map((screen, index) => <button key={screen.id} type="button" aria-pressed={active === index} onClick={() => {
                setActive(index)
                trackGoogleEvent("marketing_preview_select", { route: locale === "el" ? "/" : "/en", locale, control: screen.id })
            }}>{screen.label}</button>)}
        </div>
        <SampleStamp locale={locale} className="mt-4 text-center" />
    </div>
}
