"use client"

import { useState } from "react"
import { FileText, ArrowRight } from "lucide-react"
import { PRODUCT_STEPS } from "@/app/(public)/product/marketing-content"
import { READING_DEMO_TABS } from "@/lib/marketing/reading-demo"
import { interactiveCopy as C } from "@/lib/marketing/interactive-copy"
import type { MarketingLocale } from "@/lib/marketing/positioning"
import { trackGoogleEvent } from "@/lib/analytics/google-analytics"
import { DepthSurface } from "./DepthSurface"

/** One existing, labeled sample stays consistent from source to findings. */
export function ProductWalkthrough({ locale }: { locale: MarketingLocale }) {
    const [active, setActive] = useState(0)
    const sample = READING_DEMO_TABS[0]
    const titles = [C.document, C.information, C.findings]
    return <div className="pw-walkthrough">
        <div className="pw-walkthrough-steps">
            {PRODUCT_STEPS.map((step, index) => <div className="pw-walkthrough-step" data-active={active === index} key={step.n}>
                <h3><button type="button" aria-pressed={active === index} aria-controls="product-walkthrough-preview" onClick={() => {
                    setActive(index)
                    trackGoogleEvent("marketing_preview_select", { route: locale === "el" ? "/product" : "/en/product", locale, control: `step_${index + 1}` })
                }}><span>{step.n}</span><span>{locale === "el" ? step.titleEl : step.titleEn}</span><ArrowRight className="ml-auto shrink-0" size={18} aria-hidden /></button></h3>
                <p>{locale === "el" ? step.descEl : step.descEn}</p>
            </div>)}
        </div>
        <div className="pw-walkthrough-preview" id="product-walkthrough-preview">
            <DepthSurface><div className="pw-demo-document">
                <FileText className="mb-5 text-fg-brand" size={32} aria-hidden />
                <p className="mb-3 text-sm text-fg-secondary">{C.sample[locale]} · {sample.label[locale]}</p>
                <h3 className="text-2xl font-semibold" aria-live="polite">{titles[active][locale]}</h3>
                <ul>{(active === 0 ? sample.docLines : active === 1 ? sample.results.map(r => r.text) : sample.results.filter(r => r.state !== "covered").map(r => r.text)).map((line, i) => <li key={`${active}-${i}`}>{line[locale]}</li>)}</ul>
            </div></DepthSurface>
            <p className="mt-6 text-sm leading-relaxed text-fg-secondary">{C.sampleNote[locale]}</p>
        </div>
    </div>
}
