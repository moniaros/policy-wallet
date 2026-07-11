"use client"

import {
    Award,
    BadgePercent,
    Gift,
    HeartPulse,
    LifeBuoy,
    Phone,
    Scale,
    Smartphone,
    Sparkles,
    SquareArrowOutUpRight,
} from "lucide-react"

import { pickLang, type PolicyPerk } from "@/lib/wallet/policy-detail"

interface PerksCardProps {
    perks: PolicyPerk[]
    lang: "el" | "en"
    copy: {
        perksTitle: string
        perksSubtitle: string
        usageLimitLabel: string
        callServiceCta: string
        visitSiteCta: string
        dontForgetChip: string
        noPerksDetected: string
        exclusionsReanalyzeHint: string
        perkTypes: Record<string, string>
    }
}

const PERK_ICON: Record<string, typeof Gift> = {
    free_service: Sparkles,
    assistance: LifeBuoy,
    discount: BadgePercent,
    prevention: HeartPulse,
    loyalty_bonus: Award,
    digital_tool: Smartphone,
    gift: Gift,
    legal_aid: Scale,
}

/**
 * Perks & benefits bundled with the policy — free services, assistance
 * hotlines, prevention programs — that policyholders routinely forget exist.
 */
export function PerksCard({ perks, lang, copy }: PerksCardProps) {
    return (
        <div className="pw-card p-6 sm:p-7">
            <div className="mb-1 flex items-center gap-2">
                <Gift className="h-4 w-4 text-primary dark:text-mint" />
                <h2 className="text-sm font-black uppercase tracking-widest text-black/60 dark:text-white/70">{copy.perksTitle}</h2>
            </div>
            <p className="mb-5 text-xs text-black/55 dark:text-white/60">{copy.perksSubtitle}</p>

            {perks.length === 0 ? (
                <div className="rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-4 dark:border-white/15 dark:bg-white/5">
                    <p className="text-sm text-black/65 dark:text-white/70">{copy.noPerksDetected}</p>
                    <p className="mt-1 text-xs text-black/50 dark:text-white/55">{copy.exclusionsReanalyzeHint}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {perks.map((perk, i) => {
                        const PerkIcon = PERK_ICON[perk.perkType] || Gift
                        const typeLabel = copy.perkTypes[perk.perkType] || perk.perkType
                        return (
                            <div
                                key={i}
                                className="flex flex-col rounded-2xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/15 dark:bg-white/5"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary-soft dark:bg-primary/15">
                                        <PerkIcon className="h-4.5 w-4.5 text-primary dark:text-mint" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-black dark:text-white">{pickLang(perk.name, lang)}</p>
                                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                            <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black/55 dark:bg-white/10 dark:text-white/60">
                                                {typeLabel}
                                            </span>
                                            {perk.usageLimit && (
                                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary dark:bg-primary/15 dark:text-mint">
                                                    {copy.usageLimitLabel}: {perk.usageLimit}
                                                </span>
                                            )}
                                            {perk.reminderRecommended && (
                                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#B45309] dark:bg-amber-900/30 dark:text-amber-300">
                                                    {copy.dontForgetChip}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <p className="mt-2.5 flex-1 text-xs leading-relaxed text-black/65 dark:text-white/70">
                                    {pickLang(perk.description, lang)}
                                </p>

                                {(perk.contactPhone || perk.contactUrl) && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {perk.contactPhone && (
                                            <a
                                                href={`tel:${perk.contactPhone}`}
                                                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-primary-hover dark:text-[#1A2420]"
                                            >
                                                <Phone className="h-3 w-3" />
                                                {copy.callServiceCta}
                                            </a>
                                        )}
                                        {perk.contactUrl && (
                                            <a
                                                href={perk.contactUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3 py-1.5 text-[11px] font-semibold text-black transition-colors hover:bg-black/5 dark:border-white/20 dark:bg-black dark:text-white dark:hover:bg-white/10"
                                            >
                                                <SquareArrowOutUpRight className="h-3 w-3" />
                                                {copy.visitSiteCta}
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
