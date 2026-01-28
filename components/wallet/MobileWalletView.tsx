"use client"

import { useState, useMemo } from 'react'
import type { PolicyWalletProps, Policy } from './types'
import { MobilePolicyCard } from './MobilePolicyCard'
import { GapRecommendationCard, type GapRecommendation } from '../gaps/GapRecommendationCard'
import { useLanguage } from '@/contexts/LanguageContext'
import { useSwipe } from '@/hooks/useSwipe'
import { PullToRefresh } from '@/components/ui/PullToRefresh'
import { hapticFeedback } from '@/utils/haptic'
import {
    PlusIcon, ChatIcon, TrendingUpIcon, DocumentIcon,
    HeartIcon, HomeIcon, ShieldIcon, PawIcon
} from '@/components/icons/PolicyIcons'

export function MobileWalletView({
    policies,
    onViewPolicy,
    onAddManually,
    onShareWithAgent,
    onAddToWallet,
    onViewDocuments,
}: PolicyWalletProps) {
    const { t, language } = useLanguage()
    const [currentPolicyIndex, setCurrentPolicyIndex] = useState(0)
    const [viewMode, setViewMode] = useState<'hero' | 'list'>('hero')
    const [isRefreshing, setIsRefreshing] = useState(false)

    // Swipe gesture handlers
    const handleSwipeLeft = () => {
        if (viewMode === 'hero' && currentPolicyIndex < policies.length - 1) {
            hapticFeedback.swipe()
            setCurrentPolicyIndex(prev => prev + 1)
        }
    }

    const handleSwipeRight = () => {
        if (viewMode === 'hero' && currentPolicyIndex > 0) {
            hapticFeedback.swipe()
            setCurrentPolicyIndex(prev => prev - 1)
        }
    }

    // Swipe ref for hero card
    const swipeRef = useSwipe({
        onSwipeLeft: handleSwipeLeft,
        onSwipeRight: handleSwipeRight
    }, {
        minSwipeDistance: 50
    })

    // Pull to refresh handler
    const handleRefresh = async () => {
        setIsRefreshing(true)
        hapticFeedback.impact()

        // Simulate refresh (replace with actual data fetch)
        await new Promise(resolve => setTimeout(resolve, 1500))

        hapticFeedback.success()
        setIsRefreshing(false)
    }

    // Get primary policy (first active, or first overall)
    const primaryPolicy = useMemo(() => {
        const activePolicies = policies.filter(p => p.status === 'active')
        return activePolicies[currentPolicyIndex] || policies[currentPolicyIndex] || policies[0]
    }, [policies, currentPolicyIndex])

    // Generate gap recommendations based on policies
    const gapRecommendations = useMemo((): GapRecommendation[] => {
        const gaps: GapRecommendation[] = []
        const policyTypes = new Set(policies.map(p => p.lineOfBusiness))

        // Check for missing health insurance
        if (!policyTypes.has('health')) {
            gaps.push({
                gapType: 'missing_health',
                priority: 'high',
                title: language === 'el' ? 'Ασφάλεια Υγείας' : 'Health Insurance',
                description: language === 'el'
                    ? 'Προστατέψτε την υγεία σας και της οικογένειάς σας από απρόβλεπτα ιατρικά έξοδα.'
                    : 'Protect yourself and your family from unexpected medical expenses.',
                estimatedCost: 800
            })
        }

        // Check for missing home insurance
        if (!policyTypes.has('home')) {
            gaps.push({
                gapType: 'missing_home',
                priority: 'high',
                title: language === 'el' ? 'Ασφάλεια Κατοικίας' : 'Home Insurance',
                description: language === 'el'
                    ? 'Προστατέψτε την περιουσία σας από φυσικές καταστροφές, κλοπή και ζημιές.'
                    : 'Protect your property from natural disasters, theft, and damage.',
                estimatedCost: 300
            })
        }

        // Check for missing life insurance
        if (!policyTypes.has('life')) {
            gaps.push({
                gapType: 'missing_life',
                priority: 'medium',
                title: language === 'el' ? 'Ασφάλεια Ζωής' : 'Life Insurance',
                description: language === 'el'
                    ? 'Εξασφαλίστε το μέλλον των αγαπημένων σας προσώπων.'
                    : 'Secure the future of your loved ones.',
                estimatedCost: 500
            })
        }

        // Check for missing pet insurance (if they have home)
        if (policyTypes.has('home') && !policyTypes.has('pet')) {
            gaps.push({
                gapType: 'missing_pet',
                priority: 'low',
                title: language === 'el' ? 'Ασφάλεια Κατοικιδίου' : 'Pet Insurance',
                description: language === 'el'
                    ? 'Τα κτηνιατρικά έξοδα μπορεί να είναι ακριβά. Προστατέψτε το κατοικίδιό σας.'
                    : 'Vet bills can be expensive. Protect your furry friend.',
                estimatedCost: 200
            })
        }

        return gaps.slice(0, 3) // Show top 3 gaps
    }, [policies, language])

    if (policies.length === 0) {
        return (
            <div className="min-h-screen bg-stone-50 dark:bg-stone-900 p-4">
                <div className="max-w-md mx-auto pt-20 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center">
                        <DocumentIcon className="w-10 h-10 text-stone-400 dark:text-stone-500" />
                    </div>
                    <h2 className="text-2xl font-black text-stone-900 dark:text-white mb-3">
                        {language === 'el' ? 'Το Πορτοφόλι Μου' : 'My Wallet'}
                    </h2>
                    <p className="text-stone-600 dark:text-stone-400 mb-6">
                        {language === 'el'
                            ? 'Προσθέστε το πρώτο σας συμβόλαιο για να ξεκινήσετε'
                            : 'Add your first policy to get started'}
                    </p>
                    <button
                        onClick={onAddManually}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl transition-all active:scale-[0.98]"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                        </svg>
                        {language === 'el' ? 'Προσθήκη Συμβολαίου' : 'Add Policy'}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-stone-50 dark:bg-stone-900">
            {/* Header */}
            <div className="bg-white dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700 sticky top-0 z-10">
                <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-stone-900 dark:text-white">
                            PolicyWallet
                        </h1>
                        <p className="text-sm text-stone-500 dark:text-stone-400">
                            {language === 'el' ? 'Το Πορτοφόλι Μου' : 'My Wallet'}
                        </p>
                    </div>
                    <button
                        onClick={onAddManually}
                        className="w-11 h-11 flex items-center justify-center bg-teal-600 hover:bg-teal-700 text-white rounded-full transition-all active:scale-[0.95]"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 py-6 space-y-6">
                {/* Hero Card or List Toggle */}
                <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-bold text-stone-600 dark:text-stone-400">
                        {policies.length} {language === 'el' ? 'Συμβόλαια' : 'Policies'}
                    </p>
                    <button
                        onClick={() => setViewMode(viewMode === 'hero' ? 'list' : 'hero')}
                        className="text-sm font-bold text-teal-600 dark:text-teal-400 hover:underline"
                    >
                        {viewMode === 'hero'
                            ? (language === 'el' ? 'Προβολή Λίστας' : 'View List')
                            : (language === 'el' ? 'Προβολή Κάρτας' : 'View Card')}
                    </button>
                </div>

                {/* Primary Policy (Hero View) */}
                {viewMode === 'hero' && primaryPolicy && (
                    <div>
                        <MobilePolicyCard
                            policy={primaryPolicy}
                            variant="hero"
                            onView={() => onViewPolicy?.(primaryPolicy.id)}
                            onShare={() => onShareWithAgent?.(primaryPolicy.id)}
                            onViewDocuments={() => onViewDocuments?.(primaryPolicy.id)}
                        />

                        {/* Policy Indicators */}
                        {policies.length > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-4">
                                {policies.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentPolicyIndex(index)}
                                        className={`h-2 rounded-full transition-all ${index === currentPolicyIndex
                                            ? 'w-6 bg-teal-600'
                                            : 'w-2 bg-stone-300 dark:bg-stone-600'
                                            }`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* List View */}
                {viewMode === 'list' && (
                    <div className="space-y-3">
                        {policies.map(policy => (
                            <MobilePolicyCard
                                key={policy.id}
                                policy={policy}
                                variant="compact"
                                onView={() => onViewPolicy?.(policy.id)}
                                onShare={() => onShareWithAgent?.(policy.id)}
                                onViewDocuments={() => onViewDocuments?.(policy.id)}
                            />
                        ))}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-3 gap-3">
                    <button
                        onClick={onAddManually}
                        className="flex flex-col items-center gap-2 p-4 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-2xl hover:bg-stone-800 dark:hover:bg-stone-100 transition-all active:scale-[0.98]"
                        aria-label={language === 'el' ? 'Προσθήκη συμβολαίου' : 'Add policy'}
                    >
                        <div className="w-12 h-12 bg-white/10 dark:bg-stone-900/10 rounded-full flex items-center justify-center">
                            <PlusIcon className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold">
                            {language === 'el' ? 'Add Policy' : 'Add Policy'}
                        </span>
                    </button>

                    <button
                        onClick={() => onShareWithAgent?.(primaryPolicy?.id || '')}
                        className="flex flex-col items-center gap-2 p-4 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-2xl hover:bg-stone-800 dark:hover:bg-stone-100 transition-all active:scale-[0.98]"
                        aria-label={language === 'el' ? 'Συνομιλία με πράκτορα' : 'Agent chat'}
                    >
                        <div className="w-12 h-12 bg-white/10 dark:bg-stone-900/10 rounded-full flex items-center justify-center">
                            <ChatIcon className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold">
                            {language === 'el' ? 'Agent Chat' : 'Agent Chat'}
                        </span>
                    </button>

                    <button
                        className="flex flex-col items-center gap-2 p-4 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-2xl hover:bg-stone-800 dark:hover:bg-stone-100 transition-all active:scale-[0.98]"
                        aria-label={language === 'el' ? 'Αναβάθμιση' : 'Upgrade'}
                    >
                        <div className="w-12 h-12 bg-white/10 dark:bg-stone-900/10 rounded-full flex items-center justify-center">
                            <TrendingUpIcon className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold">
                            {language === 'el' ? 'Upgrade' : 'Upgrade'}
                        </span>
                    </button>
                </div>


                {/* Gap Recommendations */}
                {gapRecommendations.length > 0 && (
                    <div>
                        <h3 className="text-lg font-black text-stone-900 dark:text-white mb-3">
                            {language === 'el' ? 'Σας λείπουν:' : 'You\'re missing:'}
                        </h3>
                        <div className="space-y-3">
                            {gapRecommendations.map((gap, index) => (
                                <GapRecommendationCard
                                    key={index}
                                    gap={gap}
                                    onAddCoverage={() => onAddManually?.()}
                                />
                            ))}
                        </div>
                        {gapRecommendations.length >= 3 && (
                            <button className="w-full mt-3 text-sm font-bold text-teal-600 dark:text-teal-400 hover:underline">
                                {language === 'el' ? 'Δείτε όλες τις προτάσεις →' : 'See all recommendations →'}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
