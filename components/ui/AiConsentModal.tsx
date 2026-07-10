"use client"

import { useState } from "react"
import { ShieldCheck } from "lucide-react"
import { Modal } from "@/components/ui/Modal"
import { useLanguage } from "@/contexts/LanguageContext"
import { LEGAL_POLICY_VERSIONS } from "@/lib/compliance/consent"

interface AiConsentModalProps {
    isOpen: boolean
    onClose: () => void
    /** Called after the consent is durably recorded server-side. */
    onConsented: () => void
    /** Audit-trail label for where consent was captured. */
    source?: string
}

/**
 * GDPR Art. 9 capture point for AI-processing consent. Unlike the cookie
 * banner, this never proceeds optimistically: the server record is the
 * enforcement anchor (the analysis orchestrator checks it), so onConsented
 * fires only after POST /api/v1/consents succeeds.
 */
export function AiConsentModal({ isOpen, onClose, onConsented, source = "ai_consent_modal" }: AiConsentModalProps) {
    const { t, language } = useLanguage()
    const [saving, setSaving] = useState(false)
    const [failed, setFailed] = useState(false)

    const accept = async () => {
        setSaving(true)
        setFailed(false)
        try {
            const response = await fetch("/api/v1/consents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    consentType: "ai_processing",
                    locale: language,
                    source,
                    policyVersion: LEGAL_POLICY_VERSIONS.ai_processing,
                }),
            })
            if (!response.ok) throw new Error("Failed to persist consent")
            onConsented()
        } catch {
            setFailed(true)
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} showCloseButton={false}>
            <div className="p-6 md:p-8">
                <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-primary-soft p-3 text-primary dark:bg-primary/15 dark:text-mint">
                        <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white">{t.common.aiConsentTitle}</h2>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t.common.aiConsentBody}</p>
                    </div>
                </div>

                {failed && (
                    <p className="mt-4 text-sm font-semibold text-red-600 dark:text-red-400">{t.common.aiConsentSaveFailed}</p>
                )}

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        {t.common.aiConsentCancel}
                    </button>
                    <button
                        type="button"
                        onClick={accept}
                        disabled={saving}
                        className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-hover disabled:opacity-50 dark:text-[#1A2420]"
                    >
                        {t.common.aiConsentAccept}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
