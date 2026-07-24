"use client"

import { useState } from "react"
import { ArrowRight, Send, UserPlus, Check } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

import { sendClientInvite, completeOnboarding } from "@/app/onboarding/agent/actions"
import { useSupabaseUser } from "@/hooks/useSupabaseUser"

interface StepProps {
    onNext: () => void // In this case, 'Finish'
    onBack: () => void
}

export function FirstClientInviteStep({ onNext, onBack }: StepProps) {
    const { user } = useSupabaseUser()
    const { language } = useLanguage()
    const t = (el: string, en: string) => (language === "el" ? el : en)
    const [email, setEmail] = useState("")
    const [inviteSent, setInviteSent] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user?.id) return

        setIsLoading(true)
        await sendClientInvite(email)
        setIsLoading(false)
        setInviteSent(true)
    }

    const handleFinish = async () => {
        if (!user?.id) return

        setIsLoading(true)
        await completeOnboarding()
        setIsLoading(false)
        onNext()
    }


    return (
        <div className="space-y-6">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25 mb-6">
                <UserPlus className="w-8 h-8 text-white dark:text-[#1A2420]" />
            </div>

            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                    {t("Ενεργοποιήστε τον πρώτο σας πελάτη.", "Activate your first client.")}
                </h1>
                <p className="text-slate-600 dark:text-slate-500 text-lg">
                    {t(
                        "Στείλτε πρόσκληση σε έναν πελάτη για να τον εντάξετε άμεσα στο ψηφιακό σας γραφείο.",
                        "Send an invite to a client to onboard them to your digital office immediately."
                    )}
                </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
                {!inviteSent ? (
                    <form onSubmit={handleInvite} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                {t("Email Πελάτη", "Client Email")}
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={t("pelatis@example.com", "client@example.com")}
                                className="pw-input"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="pw-primary-button w-full"
                        >
                            <Send className="w-4 h-4" /> {isLoading ? t("Αποστολή...", "Sending...") : t("Αποστολή Πρόσκλησης", "Send Invite")}
                        </button>
                    </form>
                ) : (
                    <div className="text-center py-4">
                        <div className="w-12 h-12 bg-primary-soft dark:bg-primary/15 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Check className="w-6 h-6 text-primary dark:text-mint" />
                        </div>
                        <p className="font-bold text-slate-900 dark:text-white">
                            {t("Η πρόσκληση στάλθηκε!", "Invite Sent!")}
                        </p>
                        <p className="text-sm text-slate-500">
                            {t(`Στείλαμε email ενεργοποίησης στο ${email}.`, `We've sent an onboarding email to ${email}.`)}
                        </p>
                        <button
                            onClick={() => { setInviteSent(false); setEmail(""); }}
                            className="text-sm text-primary dark:text-mint font-bold mt-2 hover:underline"
                        >
                            {t("Αποστολή σε άλλον", "Send another")}
                        </button>
                    </div>
                )}

            </div>

            <div className="flex gap-3 pt-4">
                <button
                    onClick={onBack}
                    className="px-6 py-4 rounded-xl font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-600 dark:hover:bg-slate-800 transition-all"
                >
                    {t("Πίσω", "Back")}
                </button>
                <button
                    onClick={handleFinish}
                    disabled={isLoading}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:-translate-y-1 disabled:opacity-50"
                >
                    {isLoading ? t("Ολοκλήρωση...", "Finishing...") : t("Ολοκλήρωση Ρύθμισης", "Finish Setup")} <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    )
}
