"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ArrowRight, Check } from "lucide-react"
import { completeOnboardingStep } from "@/app/onboarding/actions"
import { useLanguage } from "@/contexts/LanguageContext"

interface DashboardTourProps {
    onComplete: () => void
}

interface TourStep {
    targetId: string
    title: { el: string; en: string }
    content: { el: string; en: string }
    position: string
}

const steps: TourStep[] = [
    {
        targetId: "tour-policy-card-0",
        title: { el: "Το πρώτο σας συμβόλαιο!", en: "Your First Policy!" },
        content: { el: "Εδώ βρίσκεται το νέο σας συμβόλαιο. Πατήστε για πλήρη στοιχεία, έγγραφα και AI ανάλυση.", en: "Here lies your newly added policy. Tap it to see full details, documents, and AI insights." },
        position: "bottom"
    },
    {
        targetId: "tour-fab",
        title: { el: "Προσθήκη συμβολαίων", en: "Add More Policies" },
        content: { el: "Χρησιμοποιήστε αυτό το κουμπί για να προσθέσετε συμβόλαια — υποστηρίζει PDF, φωτογραφίες ή χειροκίνητη εισαγωγή.", en: "Use this button to add more policies anytime—supports PDF, photos, or manual entry." },
        position: "top-left"
    },
    {
        targetId: "tour-search",
        title: { el: "Αναζήτηση & Φίλτρα", en: "Find & Filter" },
        content: { el: "Βρείτε γρήγορα οποιοδήποτε συμβόλαιο με αναζήτηση ή φίλτρα κατηγορίας.", en: "Quickly find any policy by searching or filtering by category." },
        position: "bottom"
    }
]

export default function DashboardTour({ onComplete }: DashboardTourProps) {
    const { language } = useLanguage()
    const lang = language === "el" ? "el" : "en"
    const [currentStep, setCurrentStep] = useState(0)
    const [position, setPosition] = useState({ top: 0, left: 0, width: 0, height: 0 })
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        // Find target element
        const updatePosition = () => {
            const step = steps[currentStep]
            const el = document.getElementById(step.targetId)

            if (el) {
                const rect = el.getBoundingClientRect()
                setPosition({
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height
                })
                setIsVisible(true)
            } else {
                // If element not found, center screen or skip
                // For now, fallback to center
                setPosition({
                    top: window.innerHeight / 2 - 100,
                    left: window.innerWidth / 2 - 150,
                    width: 300,
                    height: 200
                })
                setIsVisible(true)
            }
        }

        // Wait for render
        const timer = setTimeout(updatePosition, 500)
        window.addEventListener('resize', updatePosition)

        return () => {
            clearTimeout(timer)
            window.removeEventListener('resize', updatePosition)
        }
    }, [currentStep])

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(s => s + 1)
        } else {
            onComplete()
        }
    }

    const stepData = steps[currentStep]

    // A coach-mark tour is not a modal — trapping focus would defeat its purpose
    // of pointing AT the page. What it did lack was any keyboard dismissal, and
    // step changes were silent to screen readers.
    useEffect(() => {
        if (!isVisible) return
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onComplete()
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [isVisible, onComplete])

    if (!isVisible) return null

    return (
        <div className="fixed inset-0 z-50 pointer-events-none">
            {/* Dark Overlay with cutout via clip-path is hard dynamically. 
                Using strictly CSS or SVG mask? 
                Simpler approach: 4 divs for overlay around the hole.
            */}
            <div className="absolute inset-0 bg-transparent">
                {/* Top */}
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 0.6 }}
                    className="absolute bg-black left-0 top-0 w-full"
                    style={{ height: position.top }}
                />
                {/* Bottom */}
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 0.6 }}
                    className="absolute bg-black left-0 w-full bottom-0"
                    style={{ top: position.top + position.height }}
                />
                {/* Left */}
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 0.6 }}
                    className="absolute bg-black left-0"
                    style={{
                        top: position.top,
                        height: position.height,
                        width: position.left
                    }}
                />
                {/* Right */}
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 0.6 }}
                    className="absolute bg-black right-0"
                    style={{
                        top: position.top,
                        height: position.height,
                        left: position.left + position.width
                    }}
                />
            </div>

            {/* Spotlight Border */}
            <motion.div
                layout
                className="absolute border-2 border-white/50 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] pointer-events-none"
                style={{
                    top: position.top - 4,
                    left: position.left - 4,
                    width: position.width + 8,
                    height: position.height + 8,
                    borderRadius: 16
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />

            {/* Tooltip Card */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={currentStep}
                role="dialog"
                aria-live="polite"
                aria-label={stepData.title[lang]}
                className="absolute pointer-events-auto bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl max-w-sm border border-slate-200 dark:border-slate-800"
                style={{
                    top: stepData.position === 'bottom'
                        ? position.top + position.height + 20
                        : position.top - 200, // Approximate for top placement
                    left: Math.max(20, Math.min(window.innerWidth - 340, position.left)) // Clamp to screen
                }}
            >
                <button
                    type="button"
                    onClick={onComplete}
                    aria-label={lang === "el" ? "Κλείσιμο" : "Close"}
                    className="absolute top-4 right-4 text-slate-500 hover:text-slate-600 dark:hover:text-slate-200"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-primary dark:text-mint uppercase tracking-wider">
                        {lang === "el" ? "Συμβουλή" : "Tip"} {currentStep + 1}/{steps.length}
                    </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                    {stepData.title[lang]}
                </h3>

                <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm">
                    {stepData.content[lang]}
                </p>

                <div className="flex justify-between items-center">
                    <div className="flex gap-1">
                        {steps.map((_, i) => (
                            <div
                                key={i}
                                className={`w-2 h-2 rounded-full transition-colors ${i === currentStep ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                            />
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={handleNext}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
                    >
                        {currentStep === steps.length - 1
                            ? (lang === "el" ? "Τέλος" : "Finish")
                            : (lang === "el" ? "Επόμενο" : "Next")}
                        {currentStep === steps.length - 1 ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                    </button>
                </div>
            </motion.div>
        </div>
    )
}
