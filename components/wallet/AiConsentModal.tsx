"use client"

import { Modal } from "@/components/ui/Modal"
import { AiDisclaimer } from "@/components/ui/AiDisclaimer"
import { useLanguage } from "@/contexts/LanguageContext"
import { ShieldCheck, Loader2 } from "lucide-react"

interface AiConsentModalProps {
    isOpen: boolean
    /** Called when the user accepts. Should record consent and (on success) proceed. */
    onAgree: () => void
    /** Called when the user dismisses without consenting. */
    onCancel: () => void
    /** True while consent is being recorded (disables the buttons). */
    isSubmitting?: boolean
}

/**
 * Inline consent prompt shown when AI analysis is blocked by
 * AI_PROCESSING_CONSENT_REQUIRED. On agreement the caller records consent
 * (GDPR Art. 9) and re-triggers the analysis.
 */
export function AiConsentModal({ isOpen, onAgree, onCancel, isSubmitting = false }: AiConsentModalProps) {
    const { t } = useLanguage()
    const copy = t.common.aiProcessingConsent

    return (
        <Modal isOpen={isOpen} onClose={onCancel} showCloseButton={!isSubmitting}>
            <div className="p-6 sm:p-8">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                        <ShieldCheck className="h-6 w-6" />
                    </div>
                    <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                        {copy.title}
                    </h2>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                    {copy.body}
                </p>

                <div className="mt-4">
                    <AiDisclaimer />
                </div>

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="rounded-full px-5 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 disabled:opacity-50 dark:text-stone-300 dark:hover:bg-stone-800"
                    >
                        {copy.cancel}
                    </button>
                    <button
                        type="button"
                        onClick={onAgree}
                        disabled={isSubmitting}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
                    >
                        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isSubmitting ? copy.recording : copy.agree}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
