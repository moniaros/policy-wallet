"use client"

import { forwardRef } from "react"
import { Loader2 } from "lucide-react"
import { ProtectionMapCard, type ProtectionMapLabels } from "./ProtectionMapCard"
import type { ProtectionProfileCompletion } from "@/app/onboarding/protection-profile-actions"

export const SummaryScreen = forwardRef<HTMLHeadingElement, {
    labels: ProtectionMapLabels
    language: "el" | "en"
    completion: ProtectionProfileCompletion | null
    onContinue: () => void
    onLater: () => void
    busy: boolean
}>(function SummaryScreen({ labels, language, completion, onContinue, onLater, busy }, headingRef) {
    if (!completion) {
        return (
            <div className="pw-card pw-pad flex items-center gap-3 text-sm text-muted-foreground" role="status" aria-busy="true">
                <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
                {labels.title}
            </div>
        )
    }
    return (
        <>
            {/* The card's own heading is the page's h1 here: the map IS the page. */}
            <h1 ref={headingRef} tabIndex={-1} className="sr-only">
                {labels.title}
            </h1>
            <ProtectionMapCard
                labels={labels}
                language={language}
                priorities={completion.priorities}
                insight={completion.insight}
                confidence={completion.confidence}
                unsureCount={completion.unsureCount}
                countedTotal={completion.countedTotal}
                headingId="protection-map-heading"
                actions={
                    <>
                        <button type="button" onClick={onContinue} disabled={busy} className="pw-primary-button w-full sm:w-auto">
                            {labels.cta}
                        </button>
                        <button type="button" onClick={onLater} disabled={busy} className="pw-soft-button w-full sm:w-auto">
                            {labels.later}
                        </button>
                    </>
                }
            />
        </>
    )
})
