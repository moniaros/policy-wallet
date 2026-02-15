"use client"

import { useState } from "react"
import { ArrowRight, Upload, Palette, Building, Phone, Globe } from "lucide-react"

interface StepProps {
    onNext: () => void
    onBack: () => void
}

export function AgencyBrandingStep({ onNext, onBack }: StepProps) {
    const [logoPreview, setLogoPreview] = useState<string | null>(null)

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setLogoPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    return (
        <div className="space-y-6">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-6">
                <Palette className="w-8 h-8 text-white" />
            </div>

            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                    Brand your business.
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-lg">
                    Customize how you appear to your clients in the PolicyWallet app.
                </p>
            </div>

            <div className="space-y-6">
                {/* Logo Upload */}
                <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase">Agency Logo</label>
                    <div className="flex items-center gap-4">
                        <div className={`w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 overflow-hidden relative`}>
                            {logoPreview ? (
                                <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-cover" />
                            ) : (
                                <Building className="w-8 h-8 text-slate-400" />
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                        </div>
                        <div className="flex-1">
                            <button className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 relative">
                                Upload Logo
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                            </button>
                            <p className="text-xs text-slate-500 mt-1">Recommended: 400x400px PNG or JPG.</p>
                        </div>
                    </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase">Business Phone</label>
                        <div className="relative">
                            <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                            <input
                                type="tel"
                                placeholder="+30 690 000 0000"
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase">Website (Optional)</label>
                        <div className="relative">
                            <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                            <input
                                type="url"
                                placeholder="https://myagency.com"
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>
                </div>
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
