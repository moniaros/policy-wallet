"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useLanguage } from "@/contexts/LanguageContext"
// Placeholder imports for steps
import { AgentWelcomeStep } from "@/components/onboarding/agent/AgentWelcomeStep"
import { AgencyBrandingStep } from "@/components/onboarding/agent/AgencyBrandingStep"
import { LicenseVerificationStep } from "@/components/onboarding/agent/LicenseVerificationStep"
import { FirstClientInviteStep } from "@/components/onboarding/agent/FirstClientInviteStep"

export default function AgentOnboardingFlow() {
    const { language } = useLanguage()
    const t = (el: string, en: string) => (language === "el" ? el : en)
    const [step, setStep] = useState(1)

    // Animation variants
    const variants = {
        enter: { x: 50, opacity: 0 },
        center: { x: 0, opacity: 1 },
        exit: { x: -50, opacity: 0 }
    }

    const nextStep = () => setStep(s => s + 1)
    const prevStep = () => setStep(s => s - 1)

    return (
        <div className="w-full max-w-xl">
            <div className="mb-8 flex items-center justify-between">
                <div className="flex gap-2">
                    {[1, 2, 3, 4].map(i => (
                        <div
                            key={i}
                            className={`h-1.5 rounded-full transition-all duration-300 ${i <= step ? 'w-8 bg-primary' : 'w-2 bg-slate-200 dark:bg-slate-700'
                                }`}
                        />
                    ))}
                </div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {t(`Βήμα ${step} από 4`, `Step ${step} of 4`)}
                </span>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                    {/* Step components will go here */}
                    {step === 1 && <AgentWelcomeStep onNext={nextStep} />}
                    {step === 2 && <AgencyBrandingStep onNext={nextStep} onBack={prevStep} />}
                    {step === 3 && <LicenseVerificationStep onNext={nextStep} onBack={prevStep} />}
                    {step === 4 && <FirstClientInviteStep onNext={() => window.location.href = '/dashboard/agent'} onBack={prevStep} />}
                </motion.div>
            </AnimatePresence>
        </div>
    )
}
