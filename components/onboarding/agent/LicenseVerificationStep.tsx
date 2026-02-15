"use client"

import { useState } from "react"
import { ArrowRight, ShieldCheck, FileText, CheckCircle2 } from "lucide-react"

interface StepProps {
    onNext: () => void
    onBack: () => void
}

export function LicenseVerificationStep({ onNext, onBack }: StepProps) {
    const [file, setFile] = useState<File | null>(null)

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setFile(e.target.files[0])
        }
    }

    return (
        <div className="space-y-6">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 mb-6">
                <ShieldCheck className="w-8 h-8 text-white" />
            </div>

            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                    Verify your license.
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-lg">
                    Upload your professional license to unlock Verified Agent status and premium features.
                </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center transition-all hover:border-emerald-500 hover:bg-emerald-50/10 group relative">
                {file ? (
                    <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-3">
                            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <p className="font-bold text-slate-900 dark:text-white">{file.name}</p>
                        <p className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        <button onClick={() => setFile(null)} className="text-xs text-red-500 font-bold mt-2 hover:underline relative z-20">Remove</button>
                    </div>
                ) : (
                    <>
                        <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 transition-colors">
                            <FileText className="w-6 h-6 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
                        </div>
                        <p className="font-bold text-slate-700 dark:text-slate-200">Click to upload license document</p>
                        <p className="text-sm text-slate-500 mt-1">PDF, JPG, or PNG (Max 5MB)</p>
                    </>
                )}
                <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
            </div>

            <div className="flex gap-3 pt-4">
                <button
                    onClick={onBack}
                    className="px-6 py-4 rounded-xl font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-all"
                >
                    Back
                </button>
                <button
                    onClick={onNext}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:-translate-y-1"
                >
                    Continue <ArrowRight className="w-5 h-5" />
                </button>
            </div>
            <button
                onClick={onNext}
                className="w-full text-center text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
                Skip for now
            </button>
        </div>
    )
}
