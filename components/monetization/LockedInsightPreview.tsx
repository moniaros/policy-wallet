"use client"

/**
 * Soft paywall for insight content: shows a blurred, non-interactive preview
 * of REAL data (never fabricated) with an unlock CTA that opens the
 * UpgradeModal in place. Fires the gate's locked-viewed funnel event once.
 */

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { Lock } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { trackJourneyEvent } from "@/lib/journey/funnel"
import { FEATURE_GATES, getUpgradeCopy, type FeatureKey } from "@/lib/monetization"
import { UpgradeModal } from "./UpgradeModal"

interface LockedInsightPreviewProps {
    featureKey: FeatureKey
    triggerSource: string
    /** The real content, rendered blurred and inert. */
    children: React.ReactNode
    returnTo?: string
    className?: string
}

export function LockedInsightPreview({
    featureKey,
    triggerSource,
    children,
    returnTo,
    className = "",
}: LockedInsightPreviewProps) {
    const { language } = useLanguage()
    const pathname = usePathname()
    const [modalOpen, setModalOpen] = useState(false)
    const viewedRef = useRef(false)

    const gate = FEATURE_GATES[featureKey]
    const copy = getUpgradeCopy(featureKey, language)

    useEffect(() => {
        if (viewedRef.current) return
        viewedRef.current = true
        trackJourneyEvent(gate.lockedViewedEvent, {
            trigger_source: triggerSource,
            screen: pathname || undefined,
            feature_requested: featureKey,
            locale: language,
        })
    }, [])

    const openModal = () => {
        trackJourneyEvent("upgrade_trigger_clicked", {
            trigger_source: triggerSource,
            feature_requested: featureKey,
        })
        setModalOpen(true)
    }

    return (
        <div className={`relative overflow-hidden rounded-g-card ${className}`}>
            <div className="pointer-events-none select-none blur-[6px] opacity-70" aria-hidden>
                {children}
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/40 p-4 text-center backdrop-blur-[2px] dark:bg-black/40">
                <span className="grid h-10 w-10 place-items-center rounded-g-control bg-surface-wash">
                    <Lock className="h-5 w-5 text-fg-brand" />
                </span>
                <p className="max-w-xs text-sm font-semibold text-black/80 dark:text-white/85">
                    {copy.body}
                </p>
                <button
                    type="button"
                    onClick={openModal}
                    className="pw-primary-button"
                >
                    {copy.primaryCta}
                </button>
            </div>

            <UpgradeModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                featureKey={featureKey}
                triggerSource={triggerSource}
                returnTo={returnTo}
            />
        </div>
    )
}
