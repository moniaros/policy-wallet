import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { BROKER_BAND } from "@/lib/marketing/broker-band"
import { pick, type MarketingLocale } from "@/lib/marketing/positioning"
import { localizeHref } from "@/lib/seo/locale-links"
import { BrokerScanPanel } from "@/src/design-system/broker-scan"

/**
 * The broker band (§6): the agent-facing promise beside its sample evidence.
 * Copy comes from lib/marketing/broker-band.ts, which mirrors — never
 * exceeds — what /solutions/agents claims. Server component.
 */
export function BrokerBand({ locale }: { locale: MarketingLocale }) {
    return (
        <section
            aria-labelledby="broker-band-heading"
            className="[padding-block:var(--space-section)]"
        >
            <div className="mx-auto grid max-w-[1180px] items-start gap-g-10 px-g-6 md:px-g-8 lg:grid-cols-[1fr_1.1fr]">
                <div>
                    <p className="text-g-label font-semibold uppercase tracking-[0.1em] text-fg-brand">
                        {pick(BROKER_BAND.kicker, locale)}
                    </p>
                    <h2
                        id="broker-band-heading"
                        className="mt-g-3 max-w-[20ch] text-g-display-lg font-bold tracking-[-0.01em] text-fg-primary"
                    >
                        {pick(BROKER_BAND.heading, locale)}
                    </h2>
                    <p className="mt-g-4 max-w-[56ch] text-g-body-lg text-fg-secondary">
                        {pick(BROKER_BAND.lead, locale)}
                    </p>
                    <ul className="mt-g-6 space-y-g-3">
                        {BROKER_BAND.capabilities.map((cap, i) => (
                            <li key={i} className="flex items-center gap-g-3 text-g-body-sm text-fg-primary">
                                <span aria-hidden className="h-1.5 w-1.5 flex-none rounded-g-pill bg-fg-brand" />
                                {pick(cap, locale)}
                            </li>
                        ))}
                    </ul>
                    <Link
                        href={localizeHref("/solutions/agents", locale)}
                        className="mt-g-8 inline-flex min-h-11 items-center gap-g-2 rounded-g-pill bg-action-primary-bg px-g-6 text-g-body-sm font-semibold text-fg-on-brand transition-colors hover:bg-action-primary-hover focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-border-focus"
                    >
                        {pick(BROKER_BAND.cta, locale)}
                        <ArrowRight aria-hidden className="h-4 w-4" />
                    </Link>
                </div>
                <BrokerScanPanel locale={locale} />
            </div>
        </section>
    )
}
