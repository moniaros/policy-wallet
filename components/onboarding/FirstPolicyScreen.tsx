"use client"

import { motion } from "framer-motion"
import { Upload, Camera, FileText, ArrowLeft, ArrowRight } from "lucide-react"
import type { OnboardingProgress } from "./OnboardingFlow"

interface FirstPolicyScreenProps {
    progress: OnboardingProgress
    onNext: (data: any) => void
    onBack: () => void
}

export function FirstPolicyScreen({ progress, onNext, onBack }: FirstPolicyScreenProps) {
    const handleSkip = () => {
        onNext({ skipped: true })
    }

    const handleUploadLater = () => {
        onNext({ uploadLater: true })
    }

    return (
        <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4"
                >
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4">
                        <FileText className="w-8 h-8 text-white" />
                    </div>
                </motion.div>

                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-3xl font-bold text-slate-900 mb-3"
                >
                    Προσθέστε το Πρώτο σας Ασφαλιστήριο
                </motion.h2>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-lg text-slate-600"
                >
                    Ανεβάστε ένα ασφαλιστήριο για να δείτε τη δύναμη του AI
                </motion.p>
            </div>

            {/* Upload Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Upload File */}
                <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    onClick={() => window.location.href = '/wallet/add'}
                    className="group relative bg-white border-2 border-indigo-200 rounded-2xl p-8 hover:border-indigo-400 hover:shadow-xl transition-all duration-300 text-left"
                >
                    <div className="absolute top-4 right-4 w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6 text-indigo-600" />
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 mb-2 pr-12">
                        Ανέβασμα Αρχείου
                    </h3>
                    <p className="text-slate-600 text-sm mb-4">
                        PDF ή εικόνα από τον υπολογιστή σας
                    </p>
                    <div className="text-xs text-indigo-600 font-medium">
                        Αρχεία .pdf, .jpg, .png →
                    </div>
                </motion.button>

                {/* Take Photo */}
                <motion.button
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    onClick={() => window.location.href = '/wallet/add?mode=camera'}
                    className="group relative bg-white border-2 border-purple-200 rounded-2xl p-8 hover:border-purple-400 hover:shadow-xl transition-all duration-300 text-left"
                >
                    <div className="absolute top-4 right-4 w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Camera className="w-6 h-6 text-purple-600" />
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 mb-2 pr-12">
                        Φωτογράφηση
                    </h3>
                    <p className="text-slate-600 text-sm mb-4">
                        Βγάλτε φωτογραφία με την κάμερα
                    </p>
                    <div className="text-xs text-purple-600 font-medium">
                        Γρήγορο & εύκολο →
                    </div>
                </motion.button>
            </div>

            {/* Benefits */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-8"
            >
                <h4 className="font-semibold text-slate-900 mb-3">Τι θα πάρετε αμέσως:</h4>
                <ul className="space-y-2">
                    {[
                        "Αυτόματη ανάλυση AI σε <10 δευτερόλεπτα",
                        "Εντοπισμός κενών κάλυψης",
                        "Προτάσεις για εξοικονόμηση χρημάτων",
                        "Απλές εξηγήσεις για κάθε όρο"
                    ].map((benefit, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                            <svg className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {benefit}
                        </li>
                    ))}
                </ul>
            </motion.div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 px-6 py-3 text-slate-600 hover:text-slate-900 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Πίσω
                </button>

                <button
                    onClick={handleUploadLater}
                    className="px-6 py-3 text-slate-500 hover:text-slate-700 transition-colors text-sm"
                >
                    Θα το κάνω αργότερα
                </button>
            </div>
        </div>
    )
}
