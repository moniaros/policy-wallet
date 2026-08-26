import { Lock, MapPin, ShieldCheck, UserCheck } from "lucide-react"
import { TRUST_FACTS, pick, type MarketingLocale } from "@/lib/marketing/positioning"

/**
 * The "why you can trust us" row, rendered directly under the hero CTAs so the
 * third question a visitor asks is answered without scrolling.
 *
 * Two layouts, because "without scrolling" means something different on a
 * 320px phone. Measured at 320×720, the four-item grid with its explanatory
 * sentences started 883px down the page — 163px below the fold, so the trust
 * answer was only ever seen by someone who had already decided to scroll. On
 * small screens it collapses to four short chips (the claim, no explanation);
 * from `sm` up, where there is room, the full sentences come back.
 *
 * Server component: static markup, no JS shipped.
 */

const ICONS = [Lock, MapPin, ShieldCheck, UserCheck] as const

export function TrustRow({ locale }: { locale: MarketingLocale }) {
    return (
        <>
            {/* Small screens: claims only, wrapped. */}
            <ul className="flex flex-wrap gap-x-3 gap-y-2 sm:hidden">
                {TRUST_FACTS.map((fact, index) => {
                    const Icon = ICONS[index] ?? ShieldCheck
                    return (
                        <li
                            key={fact.label.en}
                            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-2.5 py-1 dark:border-slate-700"
                        >
                            <Icon
                                aria-hidden
                                className="h-3.5 w-3.5 flex-shrink-0 text-primary dark:text-[#A7F3D0]"
                            />
                            <span className="text-body-sm font-semibold text-neutral-700 dark:text-slate-200">
                                {pick(fact.label, locale)}
                            </span>
                        </li>
                    )
                })}
            </ul>

            {/* From sm up: the claim and what it means for you. */}
            <ul className="hidden gap-x-6 gap-y-3 sm:grid sm:grid-cols-2">
                {TRUST_FACTS.map((fact, index) => {
                    const Icon = ICONS[index] ?? ShieldCheck
                    return (
                        <li key={fact.label.en} className="flex items-start gap-2.5">
                            <Icon
                                aria-hidden
                                className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary dark:text-[#A7F3D0]"
                            />
                            <span className="text-body-sm leading-snug text-neutral-600 dark:text-slate-300">
                                <span className="font-semibold text-neutral-900 dark:text-white">
                                    {pick(fact.label, locale)}
                                </span>{" "}
                                — {pick(fact.detail, locale)}
                            </span>
                        </li>
                    )
                })}
            </ul>
        </>
    )
}
