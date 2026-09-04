"use client"

import { forwardRef } from "react"
import { Loader2 } from "lucide-react"
import { ProtectionMapCard, type AfterUploadView, type ProtectionMapLabels, type ProtectionMapRowLabels } from "./ProtectionMapCard"
import type { ProtectionProfileCompletion } from "@/app/onboarding/protection-profile-actions"

/**
 * The map screen — twice. First as the end of the questions, with the
 * upload as the way forward; then again straight after the first upload,
 * with what the document moved and the (optional) advisor screen as the one
 * way on. The picture is the destination, not a status line.
 */
export const SummaryScreen = forwardRef<HTMLHeadingElement, {
    labels: ProtectionMapLabels
    mapLabels: ProtectionMapRowLabels
    language: "el" | "en"
    completion: ProtectionProfileCompletion | null
    /** Present on the second visit: the map was re-read after the upload. */
    afterUpload?: AfterUploadView | null
    onContinue: () => void
    onLater: () => void
    busy: boolean
}>(function SummaryScreen({ labels, mapLabels, language, completion, afterUpload = null, onContinue, onLater, busy }, headingRef) {
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
                mapLabels={mapLabels}
                language={language}
                areas={completion.areas}
                priorities={completion.priorities}
                insight={completion.insight}
                confidence={completion.confidence}
                unsureCount={completion.unsureCount}
                countedTotal={completion.countedTotal}
                afterUpload={afterUpload}
                headingId="protection-map-heading"
                actions={
                    afterUpload ? (
                        <button type="button" onClick={onContinue} disabled={busy} className="pw-primary-button w-full sm:w-auto">
                            {labels.afterUpload.cta}
                        </button>
                    ) : (
                        <>
                            <button type="button" onClick={onContinue} disabled={busy} className="pw-primary-button w-full sm:w-auto">
                                {labels.cta}
                            </button>
                            <button type="button" onClick={onLater} disabled={busy} className="pw-soft-button w-full sm:w-auto">
                                {labels.later}
                            </button>
                        </>
                    )
                }
            />
        </>
    )
})
