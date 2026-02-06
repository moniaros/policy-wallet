"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Car, Home, Heart, Briefcase, ArrowLeft, ArrowRight, Plus } from "lucide-react"
import type { OnboardingProgress } from "./OnboardingFlow"

interface PreferencesScreenProps {
    onComplete: (insuranceTypes: string[], language: string) => void
    onBack: () => void
    onSkip: () => void
    progress: OnboardingProgress
}

const INSURANCE_TYPES = [
    { id: 'motor', label: 'Motor', icon: Car, color: 'from-blue-500 to-blue-600' },
    { id: 'home', label: 'Home', icon: Home, color: 'from-orange-500 to-orange-600' },
    { id: 'health', label: 'Health', icon: Heart, color: 'from-red-500 to-red-600' },
    { id: 'life', label: 'Life', icon: Briefcase, color: 'from-purple-500 to-purple-600' },
]

export function PreferencesScreen({ onComplete, onBack, onSkip, progress }: PreferencesScreenProps) {
    const [selectedTypes, setSelectedTypes] = useState<string[]>([])
    const [showOthers, setShowOthers] = useState(false)

    const handleToggleType = (typeId: string) => {
        setSelectedTypes(prev =>
            prev.includes(typeId)
                ? prev.filter(id => id !== typeId)
                : [...prev, typeId]
        )
    }

    const handleContinue = () => {
        if (selectedTypes.length > 0) {
            onComplete(selectedTypes, 'en')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="max-w-2xl w-full"
            >
                <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-white/30 shadow-2xl p-8 md:p-12">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span className="text-sm font-medium">Back</span>
                        </button>
                        <button
                            onClick={onSkip}
                            className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
                        >
                            <span className="text-sm font-medium">Skip</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Title */}
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-slate-900 mb-2">
                            Let's personalize your experience
                        </h2>
                        <div className="h-1 w-20 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" />
                    </div>

                    {/* Progress Indicator */}
                    <div className="flex items-center gap-3 mb-8">
                        <span className="text-sm font-medium text-slate-600">
                            Step {progress.currentStep} of {progress.totalSteps}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-sm text-slate-500">Setup</span>
                        <div className="flex-1 ml-4">
                            <div className="flex gap-1">
                                {Array.from({ length: progress.totalSteps }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < progress.currentStep
                                                ? 'bg-gradient-to-r from-indigo-500 to-violet-500'
                                                : 'bg-slate-200'
                                            }`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Question */}
                    <p className="text-lg text-slate-700 mb-6">
                        What's your main insurance type?
                    </p>

                    {/* Insurance Type Cards */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        {INSURANCE_TYPES.map((type, index) => {
                            const Icon = type.icon
                            const isSelected = selectedTypes.includes(type.id)

                            return (
                                <motion.button
                                    key={type.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.1 }}
                                    onClick={() => handleToggleType(type.id)}
                                    className={`relative p-6 rounded-2xl border-2 transition-all duration-200 cursor-pointer group ${isSelected
                                            ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-100'
                                            : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md'
                                        }`}
                                >
                                    {/* Selected Checkmark */}
                                    {isSelected && (
                                        <div className="absolute top-3 right-3 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}

                                    {/* Icon */}
                                    <div className={`w-16 h-16 mx-auto mb-3 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center transform group-hover:scale-110 transition-transform duration-200`}>
                                        <Icon className="w-8 h-8 text-white" />
                                    </div>

                                    {/* Label */}
                                    <p className={`text-lg font-semibold text-center ${isSelected ? 'text-emerald-700' : 'text-slate-900'
                                        }`}>
                                        {type.label}
                                    </p>
                                </motion.button>
                            )
                        })}
                    </div>

                    {/* Other Types Button */}
                    <button
                        onClick={() => setShowOthers(!showOthers)}
                        className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all duration-200 flex items-center justify-center gap-2 text-slate-600 hover:text-indigo-600 mb-8"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="font-medium">Other Types</span>
                    </button>

                    {/* Continue Button */}
                    <button
                        onClick={handleContinue}
                        disabled={selectedTypes.length === 0}
                        className={`w-full py-4 px-8 rounded-xl font-semibold text-lg transition-all duration-200 ${selectedTypes.length > 0
                                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 cursor-pointer'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                    >
                        Continue
                        <ArrowRight className="inline-block w-5 h-5 ml-2" />
                    </button>

                    {/* Selected Count */}
                    {selectedTypes.length > 0 && (
                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center text-sm text-slate-500 mt-4"
                        >
                            {selectedTypes.length} type{selectedTypes.length > 1 ? 's' : ''} selected
                        </motion.p>
                    )}
                </div>
            </motion.div>
        </div>
    )
}
