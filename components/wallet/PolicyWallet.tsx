"use client"

import type { PolicyWalletProps, Policy } from './types'
import { StatusSummary } from './StatusSummary'
import { PolicyCard } from './PolicyCard'
import { EmptyState } from './EmptyState'
import { useLanguage } from '@/contexts/LanguageContext'
import { Skeleton } from '@/components/ui/skeleton'

// Design tokens: teal (primary), amber (secondary), stone (neutral), Inter typography

export function PolicyWallet({
    policies,
    isLoading = false,
    onViewPolicy,
    onAddManually,
    onUploadDocument,
    onShareWithAgent,
    onAddToWallet,
    onViewDocuments,
}: PolicyWalletProps & { isLoading?: boolean }) {
    const { t, language } = useLanguage()
    // Group policies by line of business
    const motorPolicies = policies.filter(p => p.lineOfBusiness === 'motor')
    const healthPolicies = policies.filter(p => p.lineOfBusiness === 'health')
    const homePolicies = policies.filter(p => p.lineOfBusiness === 'home')

    // Sort within each group: expiring_soon → action_needed → active → incomplete
    const sortPolicies = (pols: Policy[]) => {
        const order = { expiring_soon: 0, action_needed: 1, active: 2, incomplete: 3 }
        return [...pols].sort((a, b) => order[a.status] - order[b.status])
    }

    const sortedMotor = sortPolicies(motorPolicies)
    const sortedHealth = sortPolicies(healthPolicies)
    const sortedHome = sortPolicies(homePolicies)

    // Calculate status summary
    const activeCount = policies.filter(p => p.status === 'active').length
    const expiringCount = policies.filter(p => p.status === 'expiring_soon').length
    const actionNeededCount = policies.filter(p => p.status === 'action_needed').length

    // Loading State (Skeletons)
    if (isLoading) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-8">
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
                </div>
                <div className="space-y-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="space-y-3">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-32 rounded-xl" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    // Empty state
    if (policies.length === 0) {
        return (
            <EmptyState
                onAddManually={onAddManually}
                onUploadDocument={onUploadDocument}
            />
        )
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
            {/* Status Summary */}
            <StatusSummary
                activeCount={activeCount}
                expiringCount={expiringCount}
                actionNeededCount={actionNeededCount}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Motor Insurance */}
                {sortedMotor.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2 px-2">
                            <div className="p-2 bg-stone-100 dark:bg-stone-800 rounded-lg text-stone-600 dark:text-stone-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                            </div>
                            <h2 className="text-xs font-black text-stone-400 uppercase tracking-widest">
                                {t.policyTypes.motor}
                            </h2>
                        </div>
                        <div className="space-y-4">
                            {sortedMotor.map(policy => (
                                <PolicyCard
                                    key={policy.id}
                                    policy={policy}
                                    onView={() => onViewPolicy?.(policy.id)}
                                    onShare={() => onShareWithAgent?.(policy.id)}
                                    onAddToWallet={() => onAddToWallet?.(policy.id)}
                                    onViewDocuments={() => onViewDocuments?.(policy.id)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Health Insurance */}
                {sortedHealth.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2 px-2">
                            <div className="p-2 bg-stone-100 dark:bg-stone-800 rounded-lg text-stone-600 dark:text-stone-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                            </div>
                            <h2 className="text-xs font-black text-stone-400 uppercase tracking-widest">
                                {t.policyTypes.health}
                            </h2>
                        </div>
                        <div className="space-y-4">
                            {sortedHealth.map(policy => (
                                <PolicyCard
                                    key={policy.id}
                                    policy={policy}
                                    onView={() => onViewPolicy?.(policy.id)}
                                    onShare={() => onShareWithAgent?.(policy.id)}
                                    onAddToWallet={() => onAddToWallet?.(policy.id)}
                                    onViewDocuments={() => onViewDocuments?.(policy.id)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Home Insurance */}
                {sortedHome.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2 px-2">
                            <div className="p-2 bg-stone-100 dark:bg-stone-800 rounded-lg text-stone-600 dark:text-stone-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                            </div>
                            <h2 className="text-xs font-black text-stone-400 uppercase tracking-widest">
                                {t.policyTypes.home}
                            </h2>
                        </div>
                        <div className="space-y-4">
                            {sortedHome.map(policy => (
                                <PolicyCard
                                    key={policy.id}
                                    policy={policy}
                                    onView={() => onViewPolicy?.(policy.id)}
                                    onShare={() => onShareWithAgent?.(policy.id)}
                                    onAddToWallet={() => onAddToWallet?.(policy.id)}
                                    onViewDocuments={() => onViewDocuments?.(policy.id)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Add Policy CTAs */}
            <div className="mt-16 pt-8 border-t border-stone-100 dark:border-stone-800 flex justify-center">
                <button
                    onClick={onAddManually}
                    className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-bold rounded-2xl shadow-xl shadow-stone-900/10 hover:scale-[1.02] hover:shadow-2xl transition-all duration-300"
                >
                    <span className="w-6 h-6 rounded-full bg-white/20 dark:bg-stone-900/20 flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                    </span>
                    {t.wallet.addPolicy}
                    <div className="absolute inset-0 rounded-2xl ring-2 ring-white/20 dark:ring-black/10 group-hover:ring-4 transition-all" />
                </button>
            </div>
        </div>
    )
}
