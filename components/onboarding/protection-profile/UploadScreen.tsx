"use client"

import { forwardRef, useRef, useState } from "react"
import { FileText, Loader2, Upload } from "lucide-react"
import { UploadDropzone } from "@/components/ui/UploadDropzone"
import { AiConsentModal } from "@/components/ui/AiConsentModal"
import { acceptAttribute } from "@/lib/security/file-upload"
import { triggerOnboardingAnalysis, uploadOnboardingPolicy } from "@/app/onboarding/actions"
import type { TranslationKeys } from "@/lib/i18n/translations/el"

export type UploadLabels = TranslationKeys["onboarding"]["protectionProfile"]["upload"]
export type UploadPhase = "idle" | "uploading" | "reading" | "queued" | "completed" | "needs_review" | "failed"
/**
 * What the reading came to, as the flow receives it. `needs_review`: the
 * document was read and carries no policy — kept in the wallet, credited
 * with nothing on the map.
 */
export type UploadOutcome = "completed" | "queued" | "needs_review"

/**
 * The reframed first upload: not «upload a policy» but «now let's see what
 * you already have» — the comparison against the map the person just saw.
 * A slim in-flow uploader on the existing onboarding actions and the
 * existing AI-consent gate; the status it reports is the real one, and it
 * never says «ready» unless the reading completed — and never «Το διαβάσαμε»
 * over a document that turned out not to be a policy.
 */
export const UploadScreen = forwardRef<HTMLHeadingElement, {
    labels: UploadLabels
    startingFrom: string[]
    hasAiConsent: boolean
    /**
     * False when the server-resolved plan does not include the deep reading:
     * the hint then says presence is what this upload establishes, not the
     * limits. Decided by the server state, never guessed on the client.
     */
    deepAnalysisAvailable: boolean
    onUploaded: (policyId: string, outcome: UploadOutcome) => void
    onLater: () => void
    onPhase?: (phase: UploadPhase, errorCode?: string) => void
    busy: boolean
}>(function UploadScreen({ labels, startingFrom, hasAiConsent, deepAnalysisAvailable, onUploaded, onLater, onPhase, busy }, headingRef) {
    const [file, setFile] = useState<File | null>(null)
    const [phase, setPhase] = useState<UploadPhase>("idle")
    const [aiConsent, setAiConsent] = useState(hasAiConsent)
    const [consentOpen, setConsentOpen] = useState(false)
    const [policyId, setPolicyId] = useState<string | null>(null)
    const pendingRef = useRef<File | null>(null)

    const move = (next: UploadPhase, errorCode?: string) => {
        setPhase(next)
        onPhase?.(next, errorCode)
    }

    const submit = async (chosen: File) => {
        // A retry after a failed READING must not upload the same document
        // again: the policy already exists, and a second tap produced a second
        // «AI Analyzing…» row in the wallet. Re-run the reading on the row we have.
        //
        // After «needs_review» the opposite holds: the row we have holds a
        // document that is not a policy, so the next file is a NEW upload —
        // re-reading the empty one would only find nothing again.
        let id = phase === "needs_review" ? null : policyId
        if (!id) {
            move("uploading")
            try {
                const formData = new FormData()
                formData.append("file", chosen)
                const result = await uploadOnboardingPolicy(formData)
                if (!result.success || !result.policyId) {
                    move("failed", "upload_failed")
                    return
                }
                id = result.policyId
                setPolicyId(id)
            } catch {
                move("failed", "upload_failed")
                return
            }
        }
        try {
            move("reading")
            const analysis = await triggerOnboardingAnalysis(id).catch(() => ({ status: "queued" as const }))
            if (analysis.status === "needs_review") {
                // The chosen file is spent: the CTA waits for another one.
                setFile(null)
                move("needs_review", "extraction_empty")
                return
            }
            move(analysis.status === "completed" ? "completed" : analysis.status === "failed" ? "failed" : "queued", analysis.status === "failed" ? "analysis_failed" : undefined)
        } catch {
            move("failed", "upload_failed")
        }
    }

    const start = () => {
        if (!file) return
        if (!aiConsent) {
            pendingRef.current = file
            setConsentOpen(true)
            return
        }
        void submit(file)
    }

    const statusText: Partial<Record<UploadPhase, string>> = {
        uploading: labels.status.uploading,
        reading: labels.status.reading,
        queued: labels.status.queued,
        completed: labels.status.completed,
        needs_review: labels.status.needsReview,
        failed: phase === "failed" && !policyId ? labels.uploadFailed : labels.status.failed,
    }
    const inFlight = phase === "uploading" || phase === "reading"
    const done = phase === "queued" || phase === "completed"
    const needsReview = phase === "needs_review"

    return (
        <section aria-labelledby="protection-upload-heading">
            <AiConsentModal
                isOpen={consentOpen}
                onClose={() => setConsentOpen(false)}
                onConsented={() => {
                    setAiConsent(true)
                    setConsentOpen(false)
                    const pending = pendingRef.current
                    pendingRef.current = null
                    if (pending) void submit(pending)
                }}
                source="onboarding_upload"
            />
            <h1 id="protection-upload-heading" ref={headingRef} tabIndex={-1} className="text-h3 font-semibold tracking-tight text-foreground outline-none">
                {labels.title}
            </h1>
            <p className="mt-2 text-body leading-relaxed text-foreground">{labels.body}</p>
            {startingFrom.length > 0 ? (
                <p className="mt-3 flex flex-wrap items-center gap-1.5 text-caption text-muted-foreground">
                    <span>{labels.startingFrom}:</span>
                    {startingFrom.map((d) => (
                        <span key={d} className="rounded-full bg-muted px-2 py-0.5 font-medium text-foreground">
                            {d}
                        </span>
                    ))}
                </p>
            ) : null}
            {/* The hint («Όποιο έχεις πρόχειρο…») is the dropzone's own line —
                rendered ONCE, inside it. A second copy above the box read as
                the same sentence twice on the screen. */}
            {!deepAnalysisAvailable ? (
                <p className="mt-3 text-caption leading-relaxed text-muted-foreground" data-tier-hint="limits_need_full_analysis">
                    {labels.limitsNeedFullAnalysis}
                </p>
            ) : null}

            <div className="mt-5">
                {/* The outcome line comes BEFORE the dropzone after a review
                    verdict, so the person reads why before choosing again. */}
                {needsReview ? (
                    <p role="status" aria-live="polite" data-upload-outcome="needs_review" className="pw-subcard mb-3 p-3 text-sm leading-relaxed text-foreground">
                        {statusText.needs_review}
                    </p>
                ) : null}
                {done ? null : (
                    <UploadDropzone
                        onFiles={(files) => setFile(files[0] ?? null)}
                        accept={acceptAttribute("policy")}
                        multiple={false}
                        inputId="protection-upload-file"
                        title={labels.choose}
                        hint={labels.hint}
                    />
                )}
                {file && !done ? (
                    <p className="pw-subcard mt-3 flex items-center gap-2 p-3 text-sm text-foreground">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="sr-only">{labels.chosen}: </span>
                        <span className="min-w-0 truncate">{file.name}</span>
                    </p>
                ) : null}
                {phase !== "idle" && !needsReview ? (
                    <p role="status" aria-live="polite" className="mt-3 flex items-start gap-2 text-sm text-foreground">
                        {inFlight ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden="true" /> : null}
                        <span>{statusText[phase]}</span>
                    </p>
                ) : null}
            </div>

            <div className="sticky bottom-0 -mx-4 mt-6 flex flex-col gap-2 border-t border-border bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+var(--pw-bottom-obstruction,0px))] pt-3 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:items-center sm:border-0 sm:bg-transparent sm:p-0 sm:pt-6">
                {done ? (
                    <button type="button" onClick={() => policyId && onUploaded(policyId, phase === "completed" ? "completed" : "queued")} disabled={busy} className="pw-primary-button w-full sm:w-auto">
                        {labels.seePicture}
                    </button>
                ) : (
                    <button type="button" onClick={start} disabled={!file || inFlight || busy} aria-busy={inFlight} className="pw-primary-button w-full sm:w-auto">
                        {inFlight ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
                        {labels.cta}
                    </button>
                )}
                {needsReview ? (
                    // The picture is still there to see — with the honest strip,
                    // never credited with a document that carries no policy.
                    <button type="button" onClick={() => policyId && onUploaded(policyId, "needs_review")} disabled={busy} className="pw-soft-button w-full sm:w-auto">
                        {labels.seePicture}
                    </button>
                ) : null}
                {!done ? (
                    <button type="button" onClick={onLater} disabled={inFlight || busy} className="pw-soft-button w-full sm:w-auto">
                        {labels.later}
                    </button>
                ) : null}
            </div>
        </section>
    )
})
