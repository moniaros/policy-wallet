"use client"

/**
 * Generic inline conversion trigger — a calm, benefit-first card (or compact
 * inline row) whose CTA opens the context-aware UpgradeModal in place.
 * Fires `upgrade_trigger_viewed` once on mount and `upgrade_trigger_clicked`
 * on the CTA; an optional dismiss fires `paywall_dismissed` and hides it.
 */

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { Crown } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { trackJourneyEvent } from "@/lib/journey/funnel"
import { getUpgradeCopy, type FeatureKey } from "@/lib/monetization"
import { UpgradeModal } from "./UpgradeModal"
import { UsageMeter } from "./UsageMeter"

interface UpgradeTriggerCardProps {
    /** 2 at page level, 3 when nested inside a card that has its own heading. */
    headingLevel?: 2 | 3
    featureKey: FeatureKey
    triggerSource: string
    returnTo?: string
    /** "card" = full pw-card with headline+body; "inline" = compact row. */
    variant?: "card" | "inline"
    /** Show a usage meter above the copy (e.g. policies 2/3). */
    meter?: { label: string; used: number; limit: number | null; hint?: string }
    /** Allow the user to dismiss the card for this render. */
    dismissible?: boolean
    className?: string
}

export function UpgradeTriggerCard({
    featureKey,
    triggerSource,
    returnTo,
    variant = "card",
    meter,
    dismissible = false,
    className = "",
    headingLevel = 2,
}: UpgradeTriggerCardProps) {
    const { language } = useLanguage()
    const pathname = usePathname()
    const [modalOpen, setModalOpen] = useState(false)
    const [dismissed, setDismissed] = useState(false)
    const viewedRef = useRef(false)

    const Heading = headingLevel === 3 ? "h3" : "h2"
    const copy = getUpgradeCopy(featureKey, language)

    useEffect(() => {
        if (viewedRef.current) return
        viewedRef.current = true
        trackJourneyEvent("upgrade_trigger_viewed", {
            trigger_source: triggerSource,
            screen: pathname || undefined,
            feature_requested: featureKey,
            locale: language,
        })
    }, [])

    if (dismissed) return null

    const openModal = () => {
        trackJourneyEvent("upgrade_trigger_clicked", {
            trigger_source: triggerSource,
            feature_requested: featureKey,
        })
        setModalOpen(true)
    }

    const dismiss = () => {
        trackJourneyEvent("paywall_dismissed", {
            trigger_source: triggerSource,
            feature_requested: featureKey,
        })
        setDismissed(true)
    }

    const modal = (
        <UpgradeModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            featureKey={featureKey}
            triggerSource={triggerSource}
            returnTo={returnTo}
        />
    )

    if (variant === "inline") {
        return (
            <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-primary/20 bg-primary-soft/60 p-3 dark:border-mint/20 dark:bg-primary/10 ${className}`}>
                <Crown className="h-4 w-4 flex-shrink-0 text-primary dark:text-mint" />
                <p className="min-w-0 flex-1 text-xs leading-relaxed text-muted-foreground">
                    {copy.body}
                </p>
                <button
                    type="button"
                    onClick={openModal}
                    className="rounded text-xs font-bold text-primary hover:underline dark:text-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                    {copy.primaryCta}
                </button>
                {modal}
            </div>
        )
    }

    return (
        <div className={`pw-card relative overflow-hidden border-primary/25 p-5 ${className}`}>
            <div className="pointer-events-none absolute inset-0 bg-primary/5" />
            <div className="relative">
                {meter && (
                    <UsageMeter
                        label={meter.label}
                        used={meter.used}
                        limit={meter.limit}
                        hint={meter.hint}
                        className="mb-4"
                    />
                )}
                <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-primary-soft dark:bg-primary/15">
                        <Crown className="h-4 w-4 text-primary dark:text-mint" />
                    </span>
                    <div className="min-w-0 flex-1">
                        {/* Level is a prop because this card appears both at page
                            level and nested inside another card. Fixed at h3 it
                            rendered directly under the page h1 with no h2 between,
                            which makes the page unnavigable by heading — a screen
                            reader user jumps h1 → h3 and cannot tell what was
                            skipped. Only a rendered measurement catches this; a
                            source guard sees a perfectly ordinary heading tag. */}
                        <Heading className="text-sm font-bold text-foreground">{copy.headline}</Heading>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {copy.body}
                        </p>
                    </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={openModal}
                        // NOT `pw-primary-button`. The dashboard styles exactly
                        // one control as its primary action, and on a page about
                        // whether you are insured that action is not "buy the
                        // upgrade". Three of the four primaries measured at
                        // Goal 2 were upgrade buttons, so the page's strongest
                        // visual signal was used mostly to sell — the reader had
                        // to work out which of four equally-loud controls was the
                        // thing to do. The offer still renders, and still reads
                        // as a button.
                        className="pw-secondary-button min-h-9"
                    >
                        <Crown className="h-3.5 w-3.5" />
                        {copy.primaryCta}
                    </button>
                    {dismissible && (
                        <button
                            type="button"
                            onClick={dismiss}
                            className="rounded text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                            {copy.secondaryCta}
                        </button>
                    )}
                </div>
            </div>
            {modal}
        </div>
    )
}
