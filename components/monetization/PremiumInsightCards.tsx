"use client"

/**
 * The post-parse "here's what Family unlocks" grid. After a free/Plus user's
 * first policy is parsed, we show the basic summary plus these six locked
 * premium-insight cards. Each card is an honest teaser (clear title + the
 * feature's own value line) — no fake data, no fear — and opens the dual-CTA
 * UpgradeModal for that feature. Plus is the tier that unlocks them.
 */

import { useEffect, useState } from "react"
import { BellRing, Building2, FileText, Lock, MessageCircleQuestion, ShieldAlert, Sparkles } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { trackJourneyEvent } from "@/lib/journey/funnel"
import { getUpgradeCopy, type FeatureKey } from "@/lib/monetization"
import { UpgradeModal } from "./UpgradeModal"

const pick = (pair: { el: string; en: string }, language: string) =>
    language === "el" ? pair.el : pair.en

const SECTION = {
    heading: { el: "Διαθέσιμα με το Plus", en: "Available with Plus" },
    sub: {
        el: "Το βασικό σας summary είναι έτοιμο. Δείτε τι προσθέτει η πλήρης AI εμπειρία.",
        en: "Your basic summary is ready. Here's what the full AI experience adds.",
    },
}

const CARDS: { featureKey: FeatureKey; title: { el: string; en: string }; Icon: typeof Sparkles }[] = [
    { featureKey: "full_ai_policy_analysis", title: { el: "Πλήρης AI ανάλυση", en: "Full AI analysis" }, Icon: Sparkles },
    { featureKey: "advanced_gap_detection", title: { el: "Πιθανά κενά κάλυψης", en: "Possible coverage gaps" }, Icon: ShieldAlert },
    { featureKey: "unlimited_ai_questions", title: { el: "Ερωτήσεις στο AI", en: "Ask the AI" }, Icon: MessageCircleQuestion },
    { featureKey: "advanced_renewal_reminders", title: { el: "Έξυπνες ενέργειες πριν την ανανέωση", en: "Smart pre-renewal actions" }, Icon: BellRing },
    { featureKey: "claims_preparation_assistant", title: { el: "Οδηγός προετοιμασίας ζημιάς", en: "Claim preparation guide" }, Icon: FileText },
    { featureKey: "multi_insurer_insights", title: { el: "Ανάλυση ασφαλιστηρίων από διαφορετικές ασφαλιστικές", en: "Multi-insurer analysis" }, Icon: Building2 },
]

interface PremiumInsightCardsProps {
    /** Deep-link target after checkout (usually the policy the user just added). */
    returnTo?: string
    triggerSource?: string
    className?: string
}

export function PremiumInsightCards({
    returnTo,
    triggerSource = "post_parse_locked_cards",
    className = "",
}: PremiumInsightCardsProps) {
    const { language } = useLanguage()
    const [openFeature, setOpenFeature] = useState<FeatureKey | null>(null)

    useEffect(() => {
        trackJourneyEvent("post_parse_upgrade_prompt_viewed", {
            trigger_source: triggerSource,
            locale: language,
        })
        for (const card of CARDS) {
            trackJourneyEvent("feature_locked_viewed", {
                feature_requested: card.featureKey,
                trigger_source: triggerSource,
                locale: language,
            })
        }
    }, [])

    const openCard = (featureKey: FeatureKey) => {
        trackJourneyEvent("locked_feature_clicked", {
            feature_requested: featureKey,
            trigger_source: triggerSource,
            locale: language,
        })
        setOpenFeature(featureKey)
    }

    return (
        /* `id` is the money path's only stable hook.
         *
         * This grid IS the free→paid conversion surface — the page's one
         * advertising slot. `money-path.spec.ts` locates it by `#premium-insights`,
         * and when the GOAL 2 restructure moved the cards into the plan slot the id
         * was dropped with the old wrapper. The spec went red on 2026-08-23 and
         * nobody noticed for five days, because Playwright is not in CI: the gate
         * checks code, journeys check the product, and the journey check was down
         * on the path that takes money.
         *
         * So the hook lives on the COMPONENT now, not on whatever container
         * happens to hold it this week. Move the cards again and the test follows
         * them. */
        <div id="premium-insights" className={className}>
            <div className="mb-3">
                <h3 className="flex items-center gap-2 text-base font-black text-black dark:text-white">
                    <Lock className="h-4 w-4 text-primary dark:text-mint" />
                    {pick(SECTION.heading, language)}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{pick(SECTION.sub, language)}</p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {CARDS.map((card) => {
                    const copy = getUpgradeCopy(card.featureKey, language)
                    const { Icon } = card
                    return (
                        <button
                            key={card.featureKey}
                            type="button"
                            onClick={() => openCard(card.featureKey)}
                            className="group relative flex flex-col items-start rounded-2xl border border-black/10 bg-white/60 p-4 text-left transition-all hover:border-primary/40 hover:bg-primary-soft/40 dark:border-white/10 dark:bg-white/5 dark:hover:border-mint/30"
                        >
                            <div className="flex w-full items-start justify-between gap-2">
                                <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-primary-soft dark:bg-primary/15">
                                    <Icon className="h-4.5 w-4.5 text-primary dark:text-mint" />
                                </div>
                                <Lock className="h-3.5 w-3.5 flex-shrink-0 text-black/30 dark:text-white/35" />
                            </div>
                            <h4 className="mt-3 text-sm font-bold text-black dark:text-white">{pick(card.title, language)}</h4>
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{copy.body}</p>
                            <span className="mt-3 text-xs font-bold text-primary dark:text-mint">{copy.primaryCta} →</span>
                        </button>
                    )
                })}
            </div>

            {openFeature && (
                <UpgradeModal
                    isOpen={openFeature !== null}
                    onClose={() => setOpenFeature(null)}
                    featureKey={openFeature}
                    returnTo={returnTo}
                    triggerSource={triggerSource}
                />
            )}
        </div>
    )
}
