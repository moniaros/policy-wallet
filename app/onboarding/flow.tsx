"use client"

import { useState, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, Check, Upload, Camera, FileText, Shield, Home, Heart, Briefcase, Car, X, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { completeOnboardingStep, uploadOnboardingPolicy } from "./actions"
import { trackJourneyEvent } from "@/lib/journey/funnel"

interface OnboardingFlowProps {
    initialState: {
        step: number
        completed: boolean
        name: string
    }
}

const variants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 1000 : -1000,
        opacity: 0
    }),
    center: {
        zIndex: 1,
        x: 0,
        opacity: 1
    },
    exit: (direction: number) => ({
        zIndex: 0,
        x: direction < 0 ? 1000 : -1000,
        opacity: 0
    })
}

export default function OnboardingFlow({ initialState }: OnboardingFlowProps) {
    const [step, setStep] = useState(initialState.step)
    const [direction, setDirection] = useState(0)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        trackJourneyEvent("onboarding_started", {
            source: initialState.step > 1 ? "resume" : "new_signup",
        })
    }, [initialState.step])

    const nextStep = useCallback(async (data?: any) => {
        setLoading(true)
        try {
            if (step === 4) {
                trackJourneyEvent("onboarding_completed", { steps_completed: 4 })
            }
            await completeOnboardingStep(step + 1, data)
            setDirection(1)
            setStep(s => s + 1)
        } catch (error) {
            toast.error("Something went wrong")
        } finally {
            setLoading(false)
        }
    }, [step])

    const skipStep = useCallback(async () => {
        setLoading(true)
        try {
            await completeOnboardingStep(step + 1)
            setDirection(1)
            setStep(s => s + 1)
        } catch (error) {
            toast.error("Something went wrong")
        } finally {
            setLoading(false)
        }
    }, [step])

    // Render Steps based on state
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 overflow-hidden relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            <AnimatePresence initial={false} custom={direction} mode="wait">
                {step === 1 && (
                    <WelcomeStep key="welcome" onNext={() => nextStep()} name={initialState.name} />
                )}
                {step === 2 && (
                    <PreferencesStep key="preferences" onNext={nextStep} onSkip={skipStep} />
                )}
                {step === 3 && (
                    <UploadStep key="upload" onNext={nextStep} onSkip={skipStep} />
                )}
                {step === 4 && (
                    <SuccessStep key="success" onNext={() => nextStep()} />
                )}
            </AnimatePresence>
        </div>
    )
}

function WelcomeStep({ onNext, name }: { onNext: () => void, name: string }) {
    return (
        <motion.div
            className="w-full max-w-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 dark:border-slate-800 text-center relative overflow-hidden"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5 }}
        >
            <div className="mb-8 flex justify-center">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 animate-bounce-slow">
                    <Shield className="w-10 h-10 text-white" />
                </div>
            </div>

            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                Welcome to PolicyWallet, {name}!
            </h1>

            <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 max-w-sm mx-auto">
                All your insurance in one secure place.
                AI-powered gap detection, digital wallet integration, and more.
            </p>

            <div className="space-y-3 mb-8 text-left max-w-xs mx-auto">
                <FeatureItem icon={Check} text="AI-powered gap detection" />
                <FeatureItem icon={Check} text="Digital wallet integration" />
                <FeatureItem icon={Check} text="Share with your agent" />
            </div>

            <button
                onClick={onNext}
                className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 transform transition hover:-translate-y-1 active:scale-95 flex items-center justify-center group"
            >
                Get Started
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>

            <p className="mt-4 text-xs text-slate-400">
                Takes less than 2 minutes
            </p>
        </motion.div>
    )
}

function PreferencesStep({ onNext, onSkip }: { onNext: (data: any) => void, onSkip: () => void }) {
    const [selected, setSelected] = useState<string[]>([])

    const types = [
        { id: 'motor', label: 'Motor', icon: Car },
        { id: 'home', label: 'Home', icon: Home },
        { id: 'health', label: 'Health', icon: Heart },
        { id: 'life', label: 'Life', icon: Briefcase }, // Briefcase as placeholder for Life/Business
    ]

    const toggle = (id: string) => {
        setSelected(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        )
    }

    return (
        <motion.div
            className="w-full max-w-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 dark:border-slate-800"
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
        >
            <div className="flex justify-between items-center mb-6">
                <button onClick={onSkip} className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    Skip
                </button>
                <div className="text-xs font-medium text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">
                    Step 1 of 3
                </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                What's your main insurance type?
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8">
                Select all that apply to personalize your experience.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-8">
                {types.map((type) => {
                    const isSelected = selected.includes(type.id)
                    const Icon = type.icon
                    return (
                        <div
                            key={type.id}
                            onClick={() => toggle(type.id)}
                            className={`
                                cursor-pointer p-6 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-3
                                ${isSelected
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-emerald-500/20 shadow-lg scale-[1.02]'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50 dark:hover:bg-slate-800'}
                            `}
                        >
                            <Icon className={`w-8 h-8 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                            <span className={`font-medium ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-300'}`}>
                                {type.label}
                            </span>
                        </div>
                    )
                })}
            </div>

            <button
                onClick={() => onNext({ insuranceTypes: selected })}
                disabled={selected.length === 0}
                className={`w-full py-4 px-6 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center
                    ${selected.length > 0
                        ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:shadow-indigo-500/30 hover:-translate-y-1'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'}
                `}
            >
                Continue
                <ArrowRight className="w-5 h-5 ml-2" />
            </button>
        </motion.div>
    )
}

function UploadStep({ onNext, onSkip }: { onNext: (data?: any) => void, onSkip: () => void }) {
    const [uploading, setUploading] = useState(false)
    const [dragActive, setDragActive] = useState(false)

    const handleFile = async (file: File) => {
        setUploading(true)
        const formData = new FormData()
        formData.append("file", file)

        try {
            const result = await uploadOnboardingPolicy(formData)
            if (result.success) {
                trackJourneyEvent("first_policy_uploaded", {
                    policy_id: result.policyId,
                    source: "onboarding_upload_step",
                })
                onNext({ policyId: result.policyId }) // Success step
            } else {
                toast.error(result.error)
                setUploading(false)
            }
        } catch (e) {
            toast.error("Upload failed")
            setUploading(false)
        }
    }

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setDragActive(false)
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0])
        }
    }

    return (
        <motion.div
            className="w-full max-w-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 dark:border-slate-800"
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
        >
            <div className="flex justify-between items-center mb-6">
                <button onClick={onSkip} className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    Skip for now
                </button>
                <div className="text-xs font-medium text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-full">
                    Step 2 of 3
                </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Add your first policy
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8">
                AI analysis starts immediately after upload.
            </p>

            <div
                onDragEnter={(e) => { e.preventDefault(); setDragActive(true) }}
                onDragLeave={(e) => { e.preventDefault(); setDragActive(false) }}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
                onDrop={onDrop}
                className={`
                    border-3 border-dashed rounded-2xl p-10 mb-8 text-center transition-all duration-200 relative
                    ${dragActive
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 scale-105'
                        : 'border-indigo-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 hover:border-indigo-400 hover:bg-indigo-50/50'}
                `}
            >
                {uploading ? (
                    <div className="flex flex-col items-center">
                        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                        <p className="text-lg font-medium text-slate-700 dark:text-slate-300">Analyzing document...</p>
                        <p className="text-sm text-slate-400 mt-2">Initial results usually appear within 1 minute.</p>
                    </div>
                ) : (
                    <>
                        <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-md mx-auto mb-4">
                            <Upload className="w-8 h-8 text-indigo-500" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">
                            Upload Policy Document
                        </h3>
                        <p className="text-sm text-slate-500 mb-6">
                            Drag & drop or PDF, JPG, PNG up to 15MB
                        </p>

                        <label className="inline-block">
                            <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                            />
                            <span className="cursor-pointer py-2 px-6 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm">
                                Browse Files
                            </span>
                        </label>
                    </>
                )}
            </div>

            <div className="relative mb-8">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-slate-900 text-slate-400">OR</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <button
                    disabled={uploading}
                    className="flex flex-col items-center p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                    <Camera className="w-6 h-6 text-slate-500 mb-2" />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Scan Camera</span>
                </button>
                <button
                    disabled={uploading}
                    onClick={() => onSkip()}
                    className="flex flex-col items-center p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                    <FileText className="w-6 h-6 text-slate-500 mb-2" />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Enter Manually</span>
                </button>
            </div>
        </motion.div>
    )
}

function SuccessStep({ onNext }: { onNext: () => void }) {
    return (
        <motion.div
            className="w-full max-w-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 dark:border-slate-800 text-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
        >
            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>

            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                You're all set!
            </h1>

            <p className="text-slate-600 dark:text-slate-300 mb-8 max-w-sm mx-auto">
                Your account is ready and your first policy has been uploaded.
                Analysis may still be running in the background.
            </p>

            <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <span>Account created</span>
                </div>
                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <span>Policy uploaded and analysis started</span>
                </div>
                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <span>Next: ask AI, share with your agent, and review renewals</span>
                </div>
            </div>

            <button
                onClick={onNext}
                className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 transform transition hover:-translate-y-1"
            >
                Start Exploring
            </button>
        </motion.div>
    )
}

function FeatureItem({ icon: Icon, text }: { icon: any, text: string }) {
    return (
        <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
            <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span>{text}</span>
        </div>
    )
}
