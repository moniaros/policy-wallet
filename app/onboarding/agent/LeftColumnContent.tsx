"use client"

import { useLanguage } from "@/contexts/LanguageContext"

export function LeftColumnContent() {
    const { language } = useLanguage()
    const t = (el: string, en: string) => (language === "el" ? el : en)

    return (
        <>
            <h2 className="text-4xl font-bold mb-6">
                {t("Το ψηφιακό σας ασφαλιστικό γραφείο.", "Your digital insurance office.")}
            </h2>
            <p className="text-lg text-slate-300 mb-8">
                {t(
                    "Διαχειριστείτε πελάτες, αναλύστε συμβόλαια με AI και αναπτύξτε την επιχείρησή σας με επαγγελματικά εργαλεία σχεδιασμένα για σύγχρονους ασφαλιστές.",
                    "Manage clients, analyze policies with AI, and grow your business with a professional toolset designed for modern agents."
                )}
            </p>

            <div className="space-y-4">
                <FeatureRow text={t("Ανάλυση κενών με AI", "AI-powered gap analysis")} />
                <FeatureRow text={t("Επώνυμη πύλη πελατών", "Branded client portal")} />
                <FeatureRow text={t("Αυτοματοποιημένη παρακολούθηση ανανεώσεων", "Automated renewal tracking")} />
            </div>
        </>
    )
}

function FeatureRow({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-mint/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-mint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <span className="font-medium text-slate-200">{text}</span>
        </div>
    )
}
