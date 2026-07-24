"use client"

import { useRef, useId, useState, useEffect, useCallback } from "react"
import { getQuestionnaireTemplates, sendQuestionnaire } from "@/app/(protected)/agent/actions"
import { useLanguage } from "@/contexts/LanguageContext"
import { Car, Home, HeartPulse, Shield, PawPrint, FileQuestion } from "lucide-react"
import { useDialog } from "@/hooks/useDialog"

import { Alert } from "@/components/ui/Alert"
interface QuestionnaireSenderProps {
    relationshipId: string
    customerName: string
    /** Controlled open state — omit to keep the component self-triggered. */
    open?: boolean
    onOpenChange?: (open: boolean) => void
    /** Hide the built-in trigger button (e.g. when opened from an external FAB). */
    hideTrigger?: boolean
}

const LOB_ICONS: Record<string, typeof Car> = {
    motor: Car,
    home: Home,
    health: HeartPulse,
    life: Shield,
    pet: PawPrint,
}

const copy = {
    en: {
        sendRequest: "Questionnaire",
        gatherInsights: "Gather Insights",
        requestInfo: "Request structured information from",
        identifyGaps: "to identify potential coverage gaps.",
        selectTemplate: "Select Questionnaire Template",
        requestSent: "Request sent successfully!",
        followUpWhatsApp: "Follow up via WhatsApp",
        sendFailed: "Failed to send. Please try again.",
        cancel: "Cancel",
        sendInsightsRequest: "Send questionnaire",
        sending: "Sending...",
        questions: "questions",
        whatsappMessage: 'Hi {name}, I\'ve sent you a questionnaire on PolicyWallet so we can check for any gaps in your coverage. You\'ll find it under "Tasks". Thank you!',
    },
    el: {
        sendRequest: "Ερωτηματολόγιο",
        gatherInsights: "Συλλογή Πληροφοριών",
        requestInfo: "Ζητήστε δομημένες πληροφορίες από",
        identifyGaps: "για τον εντοπισμό κενών κάλυψης.",
        selectTemplate: "Επιλέξτε Πρότυπο Ερωτηματολογίου",
        requestSent: "Το αίτημα στάλθηκε επιτυχώς!",
        followUpWhatsApp: "Παρακολούθηση μέσω WhatsApp",
        sendFailed: "Αποτυχία αποστολής. Δοκιμάστε ξανά.",
        cancel: "Ακύρωση",
        sendInsightsRequest: "Αποστολή ερωτηματολογίου",
        sending: "Αποστολή...",
        questions: "ερωτήσεις",
        whatsappMessage: 'Γεια σας {name}, σας έστειλα ένα ερωτηματολόγιο στο PolicyWallet για να δούμε αν υπάρχουν κενά στην κάλυψή σας. Θα το βρείτε στην ενότητα «Εκκρεμότητες». Ευχαριστώ!',
    },
} as const

export function QuestionnaireSender({ relationshipId, customerName, open, onOpenChange, hideTrigger }: QuestionnaireSenderProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const isControlled = open !== undefined
    const isOpen = isControlled ? open : internalOpen
    const setIsOpen = useCallback((next: boolean) => {
        if (!isControlled) setInternalOpen(next)
        onOpenChange?.(next)
    }, [isControlled, onOpenChange])
    // Ad-hoc overlay with no trap/Escape/dialog role until now. Sending guards the
    // close, matching the backdrop's existing `!isSending` behaviour.
    const qsDialogRef = useDialog<HTMLDivElement>(() => { if (!isSendingRef.current) setIsOpen(false) }, isOpen)
    const qsTitleId = useId()
    const [templates, setTemplates] = useState<any[]>([])
    const [selectedTemplate, setSelectedTemplate] = useState("")
    const [isSending, setIsSending] = useState(false)
    const isSendingRef = useRef(false)
    useEffect(() => { isSendingRef.current = isSending }, [isSending])
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const { language } = useLanguage()
    const t = copy[language === "el" ? "el" : "en"]
    const questionsLabel = t.questions // captured here because `t` is shadowed by the template map var below

    useEffect(() => {
        if (isOpen) {
            getQuestionnaireTemplates().then(setTemplates)
        }
    }, [isOpen])

    // Close on Escape (the modal previously only closed via the backdrop, which
    // was off-screen when the card overflowed the viewport).
    useEffect(() => {
        if (!isOpen) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !isSending) setIsOpen(false)
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [isOpen, isSending])

    const handleSend = async () => {
        if (!selectedTemplate) return
        setIsSending(true)
        try {
            await sendQuestionnaire(relationshipId, selectedTemplate)
            setStatus('success')
            setTimeout(() => {
                setIsOpen(false)
                setStatus('idle')
                setSelectedTemplate("")
            }, 2000)
        } catch (error) {
            console.error(error)
            setStatus('error')
        } finally {
            setIsSending(false)
        }
    }

    return (
        <>
            {!hideTrigger && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="group flex items-center gap-2 px-3 py-1.5 bg-primary-soft dark:bg-primary/15 text-primary dark:text-mint rounded-lg text-xs font-black uppercase tracking-widest hover:bg-primary hover:text-white dark:hover:text-[#1A2420] transition-all"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    {t.sendRequest}
                </button>
            )}

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-md animate-in fade-in duration-300"
                        onClick={() => !isSending && setIsOpen(false)}
                    />

                    <div ref={qsDialogRef} role="dialog" aria-modal="true" aria-labelledby={qsTitleId} tabIndex={-1} className="relative bg-white dark:bg-neutral-800 rounded-[32px] w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-neutral-200 dark:border-neutral-700 animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
                        <div className="p-10 overflow-y-auto flex-1 min-h-0">
                            <div className="w-12 h-12 bg-primary-soft dark:bg-primary/15 rounded-2xl flex items-center justify-center text-primary dark:text-mint mb-6">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                            </div>

                            <h3 id={qsTitleId} className="text-3xl font-black text-foreground tracking-tight mb-3">
                                {t.gatherInsights}
                            </h3>
                            <p className="text-muted-foreground text-sm mb-10 leading-relaxed">
                                {t.requestInfo} <span className="font-bold text-foreground">{customerName}</span> {t.identifyGaps}
                            </p>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-kicker font-black text-neutral-500 uppercase tracking-widest mb-3">
                                        {t.selectTemplate}
                                    </label>
                                    <div className="grid grid-cols-1 gap-3">
                                        {templates.map(t => {
                                            const Icon = LOB_ICONS[t.lineOfBusiness] || FileQuestion
                                            const questionCount = Array.isArray(t.questions) ? t.questions.length : 0
                                            return (
                                                <button
                                                    key={t.id}
                                                    onClick={() => setSelectedTemplate(t.id)}
                                                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${selectedTemplate === t.id
                                                        ? 'border-primary dark:border-mint bg-primary-tint dark:bg-primary/15'
                                                        : 'border-neutral-100 dark:border-neutral-700 hover:border-neutral-200 bg-neutral-50 dark:bg-neutral-900/50'
                                                        }`}
                                                >
                                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${selectedTemplate === t.id
                                                        ? 'bg-primary text-white dark:text-[#1A2420]'
                                                        : 'bg-neutral-100 dark:bg-neutral-700 text-muted-foreground'
                                                        }`}>
                                                        <Icon className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`font-bold text-sm ${selectedTemplate === t.id ? 'text-primary dark:text-mint' : 'text-foreground'}`}>
                                                            {t.name}
                                                        </p>
                                                        <p className="text-kicker text-neutral-500 uppercase tracking-widest mt-0.5">
                                                            {t.lineOfBusiness} · {questionCount} {questionsLabel}
                                                        </p>
                                                    </div>
                                                    {selectedTemplate === t.id && (
                                                        <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-white dark:text-[#1A2420] flex-shrink-0">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3" /></svg>
                                                        </div>
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>

                            {status === 'success' && (
                                <div className="mt-6 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="p-4 bg-primary-soft dark:bg-primary/15 text-[#166534] dark:text-mint rounded-2xl text-sm font-bold flex items-center gap-3">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="2" /></svg>
                                        {t.requestSent}
                                    </div>
                                    <a
                                        href={`https://wa.me/?text=${encodeURIComponent(t.whatsappMessage.replace('{name}', customerName))}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-green-500/20"
                                    >
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                        {t.followUpWhatsApp}
                                    </a>
                                </div>
                            )}
                            {status === 'error' && (
                                <Alert variant="error" className="mt-6 animate-in fade-in slide-in-from-top-2">{t.sendFailed}</Alert>
                            )}
                        </div>

                        <div className="p-8 bg-neutral-50 dark:bg-neutral-900/50 flex gap-4 border-t border-neutral-100 dark:border-neutral-700 flex-shrink-0">
                            <button
                                onClick={() => setIsOpen(false)}
                                disabled={isSending}
                                className="flex-1 px-6 py-4 text-sm font-bold text-neutral-500 hover:text-neutral-700 transition-colors disabled:opacity-50"
                            >
                                {t.cancel}
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={isSending || !selectedTemplate || status === 'success'}
                                className="flex-[2] bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-8 py-4 rounded-2xl text-sm font-black hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-neutral-900/10 disabled:opacity-50 disabled:scale-100"
                            >
                                {isSending ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-4 w-4 text-white dark:text-neutral-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        {t.sending}
                                    </div>
                                ) : t.sendInsightsRequest}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
