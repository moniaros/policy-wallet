"use client"

import type { PolicyWalletProps, Policy } from './types'
import { StatusSummary } from './StatusSummary'
import { PolicyCard } from './PolicyCard'
import { EmptyState } from './EmptyState'

// Design tokens: teal (primary), amber (secondary), stone (neutral), Inter typography

export function PolicyWallet({
    policies,
    onViewPolicy,
    onAddManually,
    onUploadDocument,
    onShareWithAgent,
    onAddToWallet,
    onViewDocuments,
}: PolicyWalletProps) {
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
        <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            {/* Status Summary */}
            <StatusSummary
                activeCount={activeCount}
                expiringCount={expiringCount}
                actionNeededCount={actionNeededCount}
            />

            {/* Motor Insurance */}
            {sortedMotor.length > 0 && (
                <section className="mt-8">
                    <div className="flex items-center gap-2 mb-4">
                        <svg className="w-5 h-5 text-stone-600 dark:text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 uppercase tracking-wide">
                            Αυτοκίνητο
                        </h2>
                    </div>
                    <div className="space-y-3">
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
                </section>
            )}

            {/* Health Insurance */}
            {sortedHealth.length > 0 && (
                <section className="mt-8">
                    <div className="flex items-center gap-2 mb-4">
                        <svg className="w-5 h-5 text-stone-600 dark:text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 uppercase tracking-wide">
                            Υγεία
                        </h2>
                    </div>
                    <div className="space-y-3">
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
                </section>
            )}

            {/* Home Insurance */}
            {sortedHome.length > 0 && (
                <section className="mt-8">
                    <div className="flex items-center gap-2 mb-4">
                        <svg className="w-5 h-5 text-stone-600 dark:text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 uppercase tracking-wide">
                            Κατοικία
                        </h2>
                    </div>
                    <div className="space-y-3">
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
                </section>
            )}

            {/* Add Policy CTAs */}
            <div className="mt-12 pt-8 border-t border-stone-200 dark:border-stone-700">
                <button
                    onClick={onAddManually}
                    className="w-full px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors shadow-sm"
                >
                    Προσθήκη ασφάλισης
                </button>
            </div>
        </div>
    )
}
