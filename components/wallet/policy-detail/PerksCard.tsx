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
    /**
     * P-08: where these perks came from.
     *
     * A perk is a claim — "you have free roadside assistance" — extracted by a
     * model from the policy document, and this card rendered it with no way for
     * the reader to check. The only links it carried were the perk's OWN `tel:`
     * and website. `PolicyPerk` has no clause reference in the ACORD schema, so
     * document-level provenance is the honest granularity available: the same
     * answer `lib/wallet/unreadable-value.ts` gives when it cannot read a field
     * — it points at the document, which is the only place the truth is.
     *
     * Null when the policy has no stored document, in which case the line says
     * so rather than linking nowhere.
     */
    sourceDocumentHref: string | null
    copy: {
        perksTitle: string
        perksSubtitle: string
        usageLimitLabel: string
        callServiceCta: string
        visitSiteCta: string
        dontForgetChip: string
        noPerksDetected: string
        exclusionsReanalyzeHint: string
        perksSourceLink: string
        perksSourceMissing: string
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
export function PerksCard({ perks, lang, copy, sourceDocumentHref }: PerksCardProps) {
    return (
        <div>
            <div className="mb-1 flex items-center gap-2">
                <Gift className="h-4 w-4 text-primary dark:text-mint" />
                <h2 className="text-body font-semibold text-foreground">{copy.perksTitle}</h2>
            </div>
            <p className="mb-5 text-xs text-muted-foreground">{copy.perksSubtitle}</p>

            {perks.length === 0 ? (
                <div className="pw-subcard px-4 py-4">
                    <p className="text-sm text-black/65 dark:text-white/70">{copy.noPerksDetected}</p>
                    <p className="mt-1 text-xs text-black/60 dark:text-white/55">{copy.exclusionsReanalyzeHint}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {perks.map((perk, i) => {
                        const PerkIcon = PERK_ICON[perk.perkType] || Gift
                        const typeLabel = copy.perkTypes[perk.perkType] || perk.perkType
                        return (
                            <div
                                key={i}
                                className="pw-subcard flex flex-col p-4"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary-soft dark:bg-primary/15">
                                        <PerkIcon className="h-4.5 w-4.5 text-primary dark:text-mint" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-black dark:text-white">{pickLang(perk.name, lang)}</p>
                                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                            <span className="rounded-full bg-black/5 px-2 py-0.5 text-caption font-semibold text-black/55 dark:bg-white/10 dark:text-white/60">
                                                {typeLabel}
                                            </span>
                                            {perk.usageLimit && (
                                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-kicker font-bold text-primary dark:bg-primary/15 dark:text-mint">
                                                    {copy.usageLimitLabel}: {perk.usageLimit}
                                                </span>
                                            )}
                                            {perk.reminderRecommended && (
                                                <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-caption font-semibold text-status-warning">
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
                                                className="min-h-[44px] inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-micro font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
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
                                                className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3 py-1.5 text-micro font-semibold text-black transition-colors hover:bg-black/5 dark:border-white/20 dark:bg-black dark:text-white dark:hover:bg-white/10"
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
            {/* P-08: the claim's provenance. A perk is something the product
                asserts you have; until now the reader had no way to check it
                against the contract. Document-level is the honest granularity —
                PolicyPerk carries no clause reference — and when there is no
                document the line says that rather than linking nowhere. */}
            {perks.length > 0 && (
                <p className="mt-4 border-t border-black/10 pt-3 text-caption text-black/60 dark:border-white/10 dark:text-white/60">
                    {sourceDocumentHref ? (
                        <a
                            href={sourceDocumentHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-2 hover:underline dark:text-mint"
                        >
                            {copy.perksSourceLink}
                        </a>
                    ) : (
                        copy.perksSourceMissing
                    )}
                </p>
            )}
        </div>
    )
}
