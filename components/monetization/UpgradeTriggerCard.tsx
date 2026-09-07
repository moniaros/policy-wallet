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
    meter?: {
        label: string
        used: number
        limit: number | null
        hint?: string
        /** Registered data-count keys for the two numbers (see UsageMeter). */
        usedCountKey?: string
        limitCountKey?: string
    }
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
            <div className={`pw-subcard flex flex-wrap items-center gap-x-3 gap-y-2 p-3 ${className}`}>
                <Crown className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
                {/* basis-40, not basis-0: `flex-1` alone gives the body a 0
                    basis, so on a phone the CTA's max-content width claimed
                    the line and the body got only the leftover ~40px — Greek
                    copy rendered one syllable per line inside the renewals
                    card (found on /dashboard@390, PW-MOBILE-TRANSFORM-02
                    Phase 5; pre-existing, identical in the before run). With
                    a real minimum the flex-wrap does its job: the CTA wraps
                    UNDER the copy when the two cannot share a line. */}
                <p className="min-w-0 flex-1 basis-40 text-caption leading-relaxed text-foreground/80">
                    {copy.body}
                </p>
                <button
                    type="button"
                    onClick={openModal}
                    className="inline-flex min-h-11 items-center rounded text-caption font-semibold text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:text-mint"
                >
                    {copy.primaryCta}
                </button>
                {modal}
            </div>
        )
    }

    return (
        <div className={`pw-card pw-pad ${className}`}>
            <div>
                {meter && (
                    <UsageMeter
                        label={meter.label}
                        used={meter.used}
                        limit={meter.limit}
                        usedCountKey={meter.usedCountKey}
                        limitCountKey={meter.limitCountKey}
                        hint={meter.hint}
                        className="mb-4"
                    />
                )}
                <div className="flex items-start gap-3">
                    <span className="pw-card-chip" aria-hidden="true">
                        <Crown className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                        {/* Level is a prop because this card appears both at page
                            level and nested inside another card. Fixed at h3 it
                            rendered directly under the page h1 with no h2 between,
                            which makes the page unnavigable by heading — a screen
                            reader user jumps h1 → h3 and cannot tell what was
                            skipped. Only a rendered measurement catches this; a
                            source guard sees a perfectly ordinary heading tag. */}
                        <Heading className="text-sm font-semibold text-foreground">{copy.headline}</Heading>
                        <p className="mt-1 text-caption leading-relaxed text-muted-foreground">
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
                        className="pw-soft-button max-w-full whitespace-normal text-center"
                    >
                        <Crown className="h-4 w-4" aria-hidden="true" />
                        {copy.primaryCta}
                    </button>
                    {dismissible && (
                        <button
                            type="button"
                            onClick={dismiss}
                            className="inline-flex min-h-11 items-center rounded px-2 text-caption font-semibold text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
