"use client"

import { useState, useEffect } from "react"
import { WelcomeScreen } from "./WelcomeScreen"
import { PreferencesScreen } from "./PreferencesScreen"
import { FirstPolicyScreen } from "./FirstPolicyScreen"
import { InteractiveTour } from "./InteractiveTour"
import { SuccessScreen } from "./SuccessScreen"
import { useRouter } from "next/navigation"

export type OnboardingStep = 'welcome' | 'preferences' | 'first-policy' | 'tour' | 'success' | 'complete'

export interface OnboardingProgress {
    currentStep: number
    totalSteps: number
    completedSteps: Set<string>
    preferences: {
        insuranceTypes: string[]
        language: string
    }
    firstPolicyAdded: boolean
    tourCompleted: boolean
}

interface OnboardingFlowProps {
    userName?: string
    onComplete: () => void
}

export function OnboardingFlow({ userName, onComplete }: OnboardingFlowProps) {
    const router = useRouter()
    const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome')
    const [progress, setProgress] = useState<OnboardingProgress>({
        currentStep: 1,
        totalSteps: 5,
        completedSteps: new Set(),
        preferences: {
            insuranceTypes: [],
            language: 'en'
        },
        firstPolicyAdded: false,
        tourCompleted: false
    })

    // Track analytics
    useEffect(() => {
        // Track onboarding start
        if (typeof window !== 'undefined' && currentStep === 'welcome') {
            trackEvent('onboarding_started', { source: 'first_login' })
        }
    }, [])

    const handleNext = () => {
        const steps: OnboardingStep[] = ['welcome', 'preferences', 'first-policy', 'tour', 'success']
        const currentIndex = steps.indexOf(currentStep)

        if (currentIndex < steps.length - 1) {
            const nextStep = steps[currentIndex + 1]
            setCurrentStep(nextStep)
            setProgress(prev => ({
                ...prev,
                currentStep: currentIndex + 2,
                completedSteps: new Set([...prev.completedSteps, currentStep])
            }))

            trackEvent('onboarding_step_completed', { step: currentIndex + 1, step_name: currentStep })
        } else {
            handleComplete()
        }
    }

    const handleBack = () => {
        const steps: OnboardingStep[] = ['welcome', 'preferences', 'first-policy', 'tour', 'success']
        const currentIndex = steps.indexOf(currentStep)

        if (currentIndex > 0) {
            setCurrentStep(steps[currentIndex - 1])
            setProgress(prev => ({
                ...prev,
                currentStep: currentIndex
            }))
        }
    }

    const handleSkip = () => {
        trackEvent('onboarding_skipped', { last_step: currentStep, progress: progress.currentStep })
        handleComplete()
    }

    const handleComplete = () => {
        const completionTime = Math.floor(performance.now() / 1000) // seconds
        trackEvent('onboarding_completed', {
            duration_seconds: completionTime,
            policies_added: progress.firstPolicyAdded ? 1 : 0,
            tour_completed: progress.tourCompleted
        })

        // Mark onboarding as complete in localStorage
        if (typeof window !== 'undefined') {
            localStorage.setItem('onboarding_completed', 'true')
            localStorage.setItem('onboarding_completed_at', new Date().toISOString())
        }

        onComplete()
    }

    const handlePreferencesComplete = (insuranceTypes: string[], language: string) => {
        setProgress(prev => ({
            ...prev,
            preferences: { insuranceTypes, language }
        }))
        handleNext()
    }

    const handlePolicyAdded = () => {
        setProgress(prev => ({
            ...prev,
            firstPolicyAdded: true
        }))
        trackEvent('first_policy_uploaded', { method: 'onboarding' })
        handleNext()
    }

    const handleTourComplete = () => {
        setProgress(prev => ({
            ...prev,
            tourCompleted: true
        }))
        handleNext()
    }

    // Check if user has already completed onboarding
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const completed = localStorage.getItem('onboarding_completed')
            if (completed === 'true') {
                onComplete()
            }
        }
    }, [onComplete])

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700">
            {/* Progress Bar */}
            {currentStep !== 'welcome' && currentStep !== 'success' && (
                <div className="fixed top-0 left-0 right-0 z-50">
                    <div className="h-1 bg-white/20">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500 ease-out"
                            style={{ width: `${(progress.currentStep / progress.totalSteps) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Onboarding Content */}
            <div className="relative z-10">
                {currentStep === 'welcome' && (
                    <WelcomeScreen
                        userName={userName}
                        onNext={handleNext}
                    />
                )}

                {currentStep === 'preferences' && (
                    <PreferencesScreen
                        onComplete={handlePreferencesComplete}
                        onBack={handleBack}
                        onSkip={handleSkip}
                        progress={progress}
                    />
                )}

                {currentStep === 'first-policy' && (
                    <FirstPolicyScreen
                        preferences={progress.preferences}
                        onPolicyAdded={handlePolicyAdded}
                        onBack={handleBack}
                        onSkip={handleSkip}
                        progress={progress}
                    />
                )}

                {currentStep === 'tour' && (
                    <InteractiveTour
                        onComplete={handleTourComplete}
                        onSkip={handleSkip}
                    />
                )}

                {currentStep === 'success' && (
                    <SuccessScreen
                        progress={progress}
                        onComplete={handleComplete}
                    />
                )}
            </div>
        </div>
    )
}

// Analytics helper
function trackEvent(eventName: string, properties?: Record<string, any>) {
    // Integrate with your analytics provider (Mixpanel, Amplitude, etc.)
    console.log('📊 Track:', eventName, properties)

    // Example: Mixpanel
    // if (typeof window !== 'undefined' && window.mixpanel) {
    //   window.mixpanel.track(eventName, properties)
    // }
}
