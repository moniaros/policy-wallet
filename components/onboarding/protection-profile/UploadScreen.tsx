"use client"

import { forwardRef, useRef, useState } from "react"
import { FileText, Loader2, Upload } from "lucide-react"
import { UploadDropzone } from "@/components/ui/UploadDropzone"
import { AiConsentModal } from "@/components/ui/AiConsentModal"
import { acceptAttribute } from "@/lib/security/file-upload"
import { triggerOnboardingAnalysis, uploadOnboardingPolicy } from "@/app/onboarding/actions"
import type { TranslationKeys } from "@/lib/i18n/translations/el"

export type UploadLabels = TranslationKeys["onboarding"]["protectionProfile"]["upload"]
export type UploadPhase = "idle" | "uploading" | "reading" | "queued" | "completed" | "failed"

/**
 * The reframed first upload: not «upload a policy» but «now let's see what
 * you already have» — the comparison against the map the person just saw.
 * A slim in-flow uploader on the existing onboarding actions and the
 * existing AI-consent gate; the status it reports is the real one, and it
 * never says «ready» unless the reading completed.
 */
export const UploadScreen = forwardRef<HTMLHeadingElement, {
    labels: UploadLabels
    startingFrom: string[]
    hasAiConsent: boolean
    onUploaded: (policyId: string) => void
    onLater: () => void
    onPhase?: (phase: UploadPhase, errorCode?: string) => void
    busy: boolean
}>(function UploadScreen({ labels, startingFrom, hasAiConsent, onUploaded, onLater, onPhase, busy }, headingRef) {
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
        move("uploading")
        try {
            const formData = new FormData()
            formData.append("file", chosen)
            const result = await uploadOnboardingPolicy(formData)
            if (!result.success || !result.policyId) {
                move("failed", "upload_failed")
                return
            }
            setPolicyId(result.policyId)
            move("reading")
            const analysis = await triggerOnboardingAnalysis(result.policyId).catch(() => ({ status: "queued" as const }))
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
        failed: phase === "failed" && !policyId ? labels.uploadFailed : labels.status.failed,
    }
    const inFlight = phase === "uploading" || phase === "reading"
    const done = phase === "queued" || phase === "completed"

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
            <p className="mt-3 text-caption leading-relaxed text-muted-foreground">{labels.hint}</p>

            <div className="mt-5">
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
                {phase !== "idle" ? (
                    <p role="status" aria-live="polite" className="mt-3 flex items-start gap-2 text-sm text-foreground">
                        {inFlight ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden="true" /> : null}
                        <span>{statusText[phase]}</span>
                    </p>
                ) : null}
            </div>

            <div className="sticky bottom-0 -mx-4 mt-6 flex flex-col gap-2 border-t border-border bg-background/95 px-4 pb-[env(safe-area-inset-bottom)] pt-3 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:items-center sm:border-0 sm:bg-transparent sm:p-0 sm:pt-6">
                {done ? (
                    <button type="button" onClick={() => policyId && onUploaded(policyId)} disabled={busy} className="pw-primary-button w-full sm:w-auto">
                        {labels.seePicture}
                    </button>
                ) : (
                    <button type="button" onClick={start} disabled={!file || inFlight || busy} aria-busy={inFlight} className="pw-primary-button w-full sm:w-auto">
                        {inFlight ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
                        {labels.cta}
                    </button>
                )}
                {!done ? (
                    <button type="button" onClick={onLater} disabled={inFlight || busy} className="pw-soft-button w-full sm:w-auto">
                        {labels.later}
                    </button>
                ) : null}
            </div>
        </section>
    )
})
