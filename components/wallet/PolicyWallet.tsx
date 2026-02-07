"use client"

import { useState, useMemo } from 'react'
import type { PolicyWalletProps, Policy } from './types'
import { StatusSummary } from './StatusSummary'
import { PolicyCard } from './PolicyCard'
import { PolicyTable } from './PolicyTable'
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
    onBatchUpload,
    onShareWithAgent,
    onAddToWallet,
    onViewDocuments,
    onRunAnalysis,
    onDeletePolicy,
    user,
}: PolicyWalletProps & {
    isLoading?: boolean,
    onRunAnalysis?: (policyId: string) => void,
    onDeletePolicy?: (policyId: string) => void
}) {
    const [showAddMenu, setShowAddMenu] = useState(false)
    const { t, language } = useLanguage()
    const [searchQuery, setSearchQuery] = useState('')
    const [activeFilter, setActiveFilter] = useState<'all' | 'motor' | 'health' | 'home' | 'life' | 'travel'>('all')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

    // Filter policies based on search and category
    const filteredPolicies = useMemo(() => {
        let filtered = policies

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            filtered = policies.filter(p =>
                p.policyNumber?.toLowerCase().includes(query) ||
                p.insurerName?.toLowerCase().includes(query) ||
                p.lineOfBusiness?.toLowerCase().includes(query)
            )
        }

        // Apply category filter
        if (activeFilter !== 'all') {
            filtered = filtered.filter(p => p.lineOfBusiness === activeFilter)
        }

        return filtered
    }, [policies, searchQuery, activeFilter])

    // Group filtered policies by line of business
    const motorPolicies = filteredPolicies.filter(p => (p.lineOfBusiness as string) === 'motor')
    const healthPolicies = filteredPolicies.filter(p => (p.lineOfBusiness as string) === 'health')
    const homePolicies = filteredPolicies.filter(p => (p.lineOfBusiness as string) === 'home')
    const lifePolicies = filteredPolicies.filter(p => (p.lineOfBusiness as string) === 'life')
    const travelPolicies = filteredPolicies.filter(p => (p.lineOfBusiness as string) === 'travel')

    // Sort within each group: expiring_soon → action_needed → active → incomplete
    const sortPolicies = (pols: Policy[]) => {
        const order: Record<string, number> = { analyzing: 1, expiring_soon: 2, action_needed: 3, active: 4, incomplete: 5 }
        return [...pols].sort((a, b) => (order[a.status] ?? 99) - (order[b.status] ?? 99))
    }

    const sortedMotor = sortPolicies(motorPolicies)
    const sortedHealth = sortPolicies(healthPolicies)
    const sortedHome = sortPolicies(homePolicies)
    const sortedLife = sortPolicies(lifePolicies)
    const sortedTravel = sortPolicies(travelPolicies)

    // Calculate status summary (from original policies, not filtered)
    const activeCount = policies.filter(p => p.status === 'active').length
    const expiringCount = policies.filter(p => p.status === 'expiring_soon').length
    const actionNeededCount = policies.filter(p => p.status === 'action_needed').length

    // Calculate total annual premium
    const totalPremium = policies.reduce((sum, p) => {
        // Only count active/processed policies for the total
        if (p.status === 'analyzing') return sum
        return sum + (p.premiumAmount || 0)
    }, 0)

    // Category filter counts
    const categoryCounts = {
        all: policies.length,
        motor: policies.filter(p => (p.lineOfBusiness as string) === 'motor').length,
        health: policies.filter(p => (p.lineOfBusiness as string) === 'health').length,
        home: policies.filter(p => (p.lineOfBusiness as string) === 'home').length,
        life: policies.filter(p => (p.lineOfBusiness as string) === 'life').length,
        travel: policies.filter(p => (p.lineOfBusiness as string) === 'travel').length,
    }

    // Loading State (Skeletons)
    if (isLoading) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
                </div>
                <Skeleton className="h-12 rounded-2xl mb-6" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <Skeleton key={i} className="h-40 rounded-3xl" />
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
                userName={user?.name}
            />
        )
    }

    // Render a policy section
    const renderPolicySection = (title: string, icon: React.ReactNode, sortedPolicies: Policy[]) => {
        if (sortedPolicies.length === 0) return null

        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2 px-2">
                    <div className="p-2 bg-stone-100 dark:bg-stone-800 rounded-lg text-stone-600 dark:text-stone-400">
                        {icon}
                    </div>
                    <h2 className="text-xs font-black text-stone-400 uppercase tracking-widest">
                        {title}
                    </h2>
                    <span className="ml-auto text-xs font-bold text-stone-400 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-full">
                        {sortedPolicies.length}
                    </span>
                </div>
                <div className={viewMode === 'list' ? 'space-y-3' : 'space-y-4'}>
                    {sortedPolicies.map(policy => (
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
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-6 sm:py-10 sm:px-6 lg:px-8">

            {/* Status Summary */}
            <StatusSummary
                activeCount={activeCount}
                expiringCount={expiringCount}
                actionNeededCount={actionNeededCount}
                totalPremium={totalPremium}
                policyBreakdown={{
                    health: policies.filter(p => p.lineOfBusiness === 'health').length,
                    auto: policies.filter(p => p.lineOfBusiness === 'motor').length,
                    home: policies.filter(p => p.lineOfBusiness === 'home').length,
                    life: policies.filter(p => p.lineOfBusiness === 'life').length,
                    travel: policies.filter(p => p.lineOfBusiness === 'travel').length,
                }}
                expiringPolicies={policies
                    .filter(p => p.status === 'expiring_soon')
                    .map(p => ({
                        name: `${t.policyTypes[p.lineOfBusiness as keyof typeof t.policyTypes] || p.lineOfBusiness}`,
                        expiryDate: p.endDate ? new Date(p.endDate).toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown'
                    }))
                }
                premiumTrend={[]} // Disable trend for now as we don't have history
            />

            {/* Policy Table */}
            <PolicyTable
                policies={policies}
                onViewPolicy={onViewPolicy}
                onRenewPolicy={(policyId: string) => {
                    // Handle renewal - could navigate to renewal page or modal
                    console.log('Renew policy:', policyId)
                }}
                onViewHistory={(policyId: string) => {
                    // Handle history view
                    console.log('View history:', policyId)
                    onViewPolicy?.(policyId) // Re-route to policy details for now
                }}
                onRunAnalysis={onRunAnalysis}
                onDelete={onDeletePolicy}
            />

            {/* Add Policy FAB - Visible on all screens */}
            <div className="fixed bottom-6 right-6 z-40">
                <button
                    onClick={onAddManually}
                    className="w-14 h-14 bg-teal-600 hover:bg-teal-700 text-white rounded-full shadow-xl shadow-teal-600/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                    aria-label="Add Policy"
                    title={t.wallet.addPolicy}
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>
        </div>
    )
}
