"use client"

import { useState } from "react"
import { ArrowRight, Upload, Palette, Building, Phone, Globe } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { useSupabaseUser } from "@/hooks/useSupabaseUser"
import { updateAgentProfile, uploadAgentAsset } from "@/app/onboarding/agent/actions"

interface StepProps {
    onNext: () => void
    onBack: () => void
}

export function AgencyBrandingStep({ onNext, onBack }: StepProps) {
    const { user } = useSupabaseUser()
    const { language } = useLanguage()
    const t = (el: string, en: string) => (language === "el" ? el : en)
    const [logoPreview, setLogoPreview] = useState<string | null>(null)
    const [logoFile, setLogoFile] = useState<File | null>(null)
    const [phone, setPhone] = useState("")
    const [website, setWebsite] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setLogoFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setLogoPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleContinue = async () => {
        if (!user?.id) return
        setIsLoading(true)

        try {
            // Upload logo if selected
            if (logoFile) {
                const formData = new FormData()
                formData.append("file", logoFile)
                formData.append("type", "logo")
                await uploadAgentAsset(formData)
            }

            // Save phone and website
            if (phone || website) {
                await updateAgentProfile({
                    phone: phone || undefined,
                    website: website || undefined,
                })
            }

            onNext()
        } catch {
            // Still proceed — branding is optional
            onNext()
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25 mb-6">
                <Palette className="w-8 h-8 text-white dark:text-[#1A2420]" />
            </div>

            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                    {t("Δώστε ταυτότητα στην επιχείρησή σας.", "Brand your business.")}
                </h1>
                <p className="text-slate-600 dark:text-slate-500 text-lg">
                    {t(
                        "Προσαρμόστε τον τρόπο που εμφανίζεστε στους πελάτες σας στην εφαρμογή PolicyWallet.",
                        "Customize how you appear to your clients in the PolicyWallet app."
                    )}
                </p>
            </div>

            <div className="space-y-6">
                {/* Logo Upload */}
                <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase">
                        {t("Λογότυπο Γραφείου", "Agency Logo")}
                    </label>
                    <div className="flex items-center gap-4">
                        <label className={`w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 overflow-hidden relative cursor-pointer`}>
                            {logoPreview ? (
                                <img src={logoPreview} alt={t("Προεπισκόπηση Λογοτύπου", "Logo Preview")} className="w-full h-full object-cover" />
                            ) : (
                                <Building className="w-8 h-8 text-slate-500" />
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                title={t("Ανεβάστε λογότυπο", "Upload logo")}
                            />
                        </label>
                        <div className="flex-1">
                            <label className="text-sm font-semibold text-primary dark:text-mint hover:text-primary-hover cursor-pointer">
                                {t("Ανεβάστε Λογότυπο", "Upload Logo")}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    className="hidden"
                                />
                            </label>
                            <p className="text-xs text-slate-500 mt-1">
                                {t("Προτεινόμενο: 400x400px PNG ή JPG.", "Recommended: 400x400px PNG or JPG.")}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label htmlFor="agencybrandingstep-f1" className="block text-xs font-bold text-slate-500 uppercase">
                            {t("Τηλέφωνο Επιχείρησης", "Business Phone")}
                        </label>
                        <div className="relative">
                            <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                            <input id="agencybrandingstep-f1"
                                type="tel"
                                placeholder="+30 690 000 0000"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="pw-input pl-10 pr-4"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label htmlFor="agencybrandingstep-f2" className="block text-xs font-bold text-slate-500 uppercase">
                            {t("Ιστοσελίδα (Προαιρετικό)", "Website (Optional)")}
                        </label>
                        <div className="relative">
                            <Globe className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                            <input id="agencybrandingstep-f2"
                                type="url"
                                placeholder="https://myagency.com"
                                value={website}
                                onChange={(e) => setWebsite(e.target.value)}
                                className="pw-input pl-10 pr-4"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex gap-3 pt-4">
                <button
                    type="button"
                    onClick={onBack}
                    className="px-6 py-4 rounded-xl font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-600 dark:hover:bg-slate-800 transition-all"
                >
                    {t("Πίσω", "Back")}
                </button>
                <button
                    type="button"
                    onClick={handleContinue}
                    disabled={isLoading}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? t("Αποθήκευση...", "Saving...") : <>{t("Συνέχεια", "Continue")} <ArrowRight className="w-5 h-5" /></>}
                </button>
            </div>

            <button
                type="button"
                onClick={onNext}
                className="w-full text-center text-sm text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
            >
                {t("Παράλειψη προς το παρόν", "Skip for now")}
            </button>
        </div>
    )
}
