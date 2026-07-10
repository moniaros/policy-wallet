"use client"

import { useState } from "react"
import { ArrowRight, BarChart3, AlertTriangle, FileUp, Wand2, Check } from "lucide-react"
import { motion } from "framer-motion"
import { useLanguage } from "@/contexts/LanguageContext"
import { AiDisclaimer } from "@/components/ui/AiDisclaimer"

import { generateDemoProposal } from "@/app/onboarding/agent/actions"

interface StepProps {
    onNext: () => void
    onBack: () => void
}

export function DemoAnalysisStep({ onNext, onBack }: StepProps) {
    const { language } = useLanguage()
    const t = (el: string, en: string) => (language === "el" ? el : en)
    const [analyzing, setAnalyzing] = useState(false)
    const [analysisComplete, setAnalysisComplete] = useState(false)
    const [proposalData, setProposalData] = useState<any>(null)

    const runDemoAnalysis = async () => {
        setAnalyzing(true)
        try {
            // In a real app, we might pass a file from the upload step
            const result = await generateDemoProposal(null as any)
            if (result.success) {
                setProposalData(result.data)
                setAnalysisComplete(true)
            }
        } catch (error) {
            console.error("Demo analysis failed", error)
        } finally {
            setAnalyzing(false)
        }
    }

    return (
        <div className="space-y-6">
            {!analysisComplete ? (
                <>
                    <div className="w-16 h-16 bg-[#4F46E5] rounded-2xl flex items-center justify-center shadow-lg shadow-[#4F46E5]/20 mb-6">
                        <Wand2 className="w-8 h-8 text-white" />
                    </div>

                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                            {t("Δείτε τη δύναμη του AI.", "See the power of AI.")}
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 text-lg">
                            {t(
                                "Ανεβάστε ένα συμβόλαιο πελάτη ή χρησιμοποιήστε το demo χαρτοφυλάκιο για να εντοπίσετε άμεσα κενά κάλυψης.",
                                "Upload a client policy or use our demo portfolio to instantly identify coverage gaps."
                            )}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <button
                            onClick={runDemoAnalysis}
                            disabled={analyzing}
                            className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6 text-left hover:border-primary hover:bg-primary/5 transition-all group overflow-hidden"
                        >
                            {analyzing && (
                                <motion.div
                                    className="absolute inset-0 bg-primary/5"
                                    initial={{ width: "0%" }}
                                    animate={{ width: "100%" }}
                                    transition={{ duration: 2.5, ease: "linear" }}
                                />
                            )}
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm">
                                    <BarChart3 className={`w-6 h-6 ${analyzing ? 'text-primary dark:text-mint animate-pulse' : 'text-slate-400 group-hover:text-primary dark:group-hover:text-mint'}`} />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white">
                                        {t("Εκτέλεση Demo Ανάλυσης", "Run Demo Analysis")}
                                    </p>
                                    <p className="text-sm text-slate-500">
                                        {t("Χρησιμοποιήστε ένα δείγμα χαρτοφυλακίου για άμεσα αποτελέσματα.", "Use a sample portfolio to see instant insights.")}
                                    </p>
                                </div>
                            </div>
                        </button>

                        <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6 text-left opacity-60 cursor-not-allowed">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm">
                                    <FileUp className="w-6 h-6 text-slate-400" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white">
                                        {t("Ανέβασμα Συμβολαίου Πελάτη", "Upload Client Policy")}
                                    </p>
                                    <p className="text-sm text-slate-500">
                                        {t("Η ανάλυση PDF ενεργοποιείται μετά τη ρύθμιση.", "PDF analysis enabled after setup.")}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    <div className="bg-primary-tint dark:bg-primary/15 border border-primary/20 dark:border-primary/30 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-full bg-primary-soft dark:bg-primary/30 flex items-center justify-center">
                                <Check className="w-5 h-5 text-primary dark:text-mint" />
                            </div>
                            <div>
                                <h3 className="font-bold text-[#166534] dark:text-mint">
                                    {t("Η Ανάλυση Ολοκληρώθηκε", "Analysis Complete")}
                                </h3>
                                <p className="text-xs text-primary dark:text-mint">
                                    {t("Αναλύθηκε", "Analyzed")} {proposalData?.policySummary?.type} ({proposalData?.policySummary?.insurer})
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {proposalData?.gaps?.map((gap: any, index: number) => (
                                <div key={index} className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex items-start gap-3">
                                    <AlertTriangle className={`w-5 h-5 ${gap.severity === 'high' ? 'text-amber-500' : 'text-blue-500'} flex-shrink-0 mt-0.5`} />
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{gap.title}</p>
                                        <p className="text-xs text-slate-500 mt-1">{gap.description}</p>
                                        {gap.severity === 'high' && (
                                            <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#166534] dark:text-mint bg-primary-soft dark:bg-primary/15 px-2 py-1 rounded-full">
                                                <Wand2 className="w-3 h-3" />
                                                {t("Πρόταση Δημιουργήθηκε", "Proposal Generated")}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <AiDisclaimer />
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => { setAnalysisComplete(false); setAnalyzing(false); }}
                            className="px-6 py-4 rounded-xl font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-all"
                        >
                            {t("Επαναφορά", "Reset")}
                        </button>
                        <button
                            onClick={onNext}
                            className="flex-1 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:-translate-y-1"
                        >
                            {t("Συνέχεια", "Continue")} <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </motion.div>
            )}

            {!analysisComplete && (
                <div className="flex gap-3 pt-4">
                    <button
                        onClick={onBack}
                        className="px-6 py-4 rounded-xl font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-all"
                    >
                        {t("Πίσω", "Back")}
                    </button>
                    <button
                        onClick={onNext}
                        className="flex-1 bg-white border-2 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold py-4 rounded-xl transition-all"
                    >
                        {t("Παράλειψη Demo", "Skip Demo")}
                    </button>
                </div>
            )}
        </div>
    )
}
