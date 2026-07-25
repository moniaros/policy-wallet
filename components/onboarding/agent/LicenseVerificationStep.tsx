"use client"

import { useState } from "react"
import { ArrowRight, ShieldCheck, FileText, CheckCircle2 } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { useSupabaseUser } from "@/hooks/useSupabaseUser"
import { uploadAgentAsset } from "@/app/onboarding/agent/actions"
import { acceptAttribute } from "@/lib/security/file-upload"

interface StepProps {
    onNext: () => void
    onBack: () => void
}

export function LicenseVerificationStep({ onNext, onBack }: StepProps) {
    const { user } = useSupabaseUser()
    const { language } = useLanguage()
    const t = (el: string, en: string) => (language === "el" ? el : en)
    const [file, setFile] = useState<File | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setFile(e.target.files[0])
            setError(null)
        }
    }

    const handleContinue = async () => {
        if (!user?.id) return
        setError(null)

        if (file) {
            setIsLoading(true)
            try {
                const formData = new FormData()
                formData.append("file", file)
                formData.append("type", "license")
                const result = await uploadAgentAsset(formData)
                // A compliance document must NOT be silently dropped. The action
                // returns { success: false } on a rejected file or storage error
                // rather than throwing, so ignoring its result would advance the
                // agent as though their licence had been submitted when it had not.
                if (!result?.success) {
                    setError(
                        result?.error ||
                        t(
                            "Το έγγραφο δεν υποβλήθηκε. Δοκιμάστε ξανά ή επιλέξτε «Παράλειψη προς το παρόν».",
                            "Your document was not submitted. Try again, or choose “Skip for now”."
                        )
                    )
                    return
                }
            } catch {
                setError(
                    t(
                        "Το έγγραφο δεν υποβλήθηκε. Δοκιμάστε ξανά ή επιλέξτε «Παράλειψη προς το παρόν».",
                        "Your document was not submitted. Try again, or choose “Skip for now”."
                    )
                )
                return
            } finally {
                setIsLoading(false)
            }
        }

        onNext()
    }

    return (
        <div className="space-y-6">
            <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 mb-6">
                <ShieldCheck className="w-8 h-8 text-white" />
            </div>

            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                    {t("Υποβάλετε την άδειά σας για έλεγχο.", "Submit your licence for review.")}
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-lg">
                    {/* Honest about the actual flow: the upload is SUBMITTED for review;
                        the admin approves it (verificationStatus → approved) before the
                        Verified badge appears. The prior copy claimed uploading itself
                        "unlocked Verified Agent status and premium features" — neither is
                        true, and awarding a checked-credentials badge for an unverified
                        upload is exactly the trust signal a compliance officer flags. */}
                    {t(
                        "Ανεβάστε την επαγγελματική σας άδεια. Η ομάδα μας την ελέγχει και, μόλις εγκριθεί, εμφανίζεται η ένδειξη Πιστοποιημένου Συμβούλου στο προφίλ σας. Μέχρι τότε η κατάστασή σας παραμένει σε εκκρεμότητα.",
                        "Upload your professional licence. Our team reviews it and, once approved, the Verified Advisor badge appears on your profile. Until then your status stays pending."
                    )}
                </p>
            </div>

            <label className="block bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center transition-all hover:border-primary hover:bg-primary/5 group cursor-pointer">
                {file ? (
                    <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-primary-soft dark:bg-primary/15 rounded-full flex items-center justify-center mb-3">
                            <CheckCircle2 className="w-6 h-6 text-primary dark:text-mint" />
                        </div>
                        <p className="font-bold text-slate-900 dark:text-white">{file.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); setFile(null) }}
                            className="text-xs text-red-500 font-bold mt-2 hover:underline"
                        >
                            {t("Αφαίρεση", "Remove")}
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-primary-soft dark:group-hover:bg-primary/15 transition-colors">
                            <FileText className="w-6 h-6 text-slate-500 dark:text-slate-400 group-hover:text-primary dark:group-hover:text-mint" />
                        </div>
                        <p className="font-bold text-slate-700 dark:text-slate-200">
                            {t("Κάντε κλικ για να ανεβάσετε το έγγραφο άδειας", "Click to upload license document")}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {t("PDF, JPG ή PNG (Μέγ. 5MB)", "PDF, JPG, or PNG (Max 5MB)")}
                        </p>
                    </>
                )}
                {/* "policy", not "document": app/onboarding/agent/actions validates
                    the licence with category 'policy', so offering .doc/.docx here
                    would recreate the very mismatch this replaces. */}
                <input
                    type="file"
                    accept={acceptAttribute("policy")}
                    onChange={handleFileUpload}
                    className="hidden"
                />
            </label>

            {error && (
                <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
                    {error}
                </p>
            )}

            <div className="flex gap-3 pt-4">
                <button
                    type="button"
                    onClick={onBack}
                    className="px-6 py-4 rounded-xl font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-all"
                >
                    {t("Πίσω", "Back")}
                </button>
                <button
                    type="button"
                    onClick={handleContinue}
                    disabled={isLoading}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? t("Ανέβασμα...", "Uploading...") : <>{t("Συνέχεια", "Continue")} <ArrowRight className="w-5 h-5" /></>}
                </button>
            </div>
            <button
                type="button"
                onClick={onNext}
                className="w-full text-center text-sm text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
                {t("Παράλειψη προς το παρόν", "Skip for now")}
            </button>
        </div>
    )
}
