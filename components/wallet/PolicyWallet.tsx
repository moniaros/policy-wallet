"use client"

import { useState, useMemo, useEffect } from 'react'
import type { PolicyWalletProps, Policy } from './types'
import { StatusSummary } from './StatusSummary'
import { PolicyCard } from './PolicyCard'
import { PolicyTable } from './PolicyTable'
import { EmptyState } from './EmptyState'
import { useLanguage } from '@/contexts/LanguageContext'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Sparkles } from 'lucide-react'

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
    onViewHistory,
    user,
}: PolicyWalletProps & {
    isLoading?: boolean,
    onRunAnalysis?: (policyId: string) => void,
    onDeletePolicy?: (policyId: string) => void,
    onViewHistory?: (policyId: string) => void
}) {
    const [showAddMenu, setShowAddMenu] = useState(false)
    const { t, language } = useLanguage()
    const [searchQuery, setSearchQuery] = useState('')
    const [activeFilter, setActiveFilter] = useState<'all' | 'motor' | 'health' | 'home' | 'life' | 'travel'>('all')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')

    // Persist View Mode
    useEffect(() => {
        const savedMode = localStorage.getItem('wallet_view_mode') as 'grid' | 'list'
        if (savedMode) setViewMode(savedMode)
    }, [])

    const handleViewModeChange = (mode: 'grid' | 'list') => {
        setViewMode(mode)
        localStorage.setItem('wallet_view_mode', mode)
    }

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

    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return t.dashboard.greeting.morning
        if (hour < 17) return t.dashboard.greeting.afternoon
        return t.dashboard.greeting.evening
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12 sm:px-6 lg:px-8 bg-transparent">

            {/* Greeting & Header */}
            {/* Portfolio Insight Strip (Fix #6) */}
            <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-700 delay-100">
                {policies.some(p => p.status === 'action_needed' || p.status === 'expiring_soon') ? (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-2xl p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0 text-amber-600">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-100">
                                {policies.filter(p => p.status === 'action_needed' || p.status === 'expiring_soon').length === 1
                                    ? (t.dashboard as any).portfolioInsights?.oneNeedsAttention
                                    : (t.dashboard as any).portfolioInsights?.multipleNeedAttention?.replace('{count}', policies.filter(p => p.status === 'action_needed' || p.status === 'expiring_soon').length)}
                            </h3>
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                                Check expirations and coverage gaps.
                            </p>
                        </div>
                    </div>
                ) : !policies.some(p => p.lineOfBusiness === 'health') ? (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-blue-100/50 transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0 text-blue-600">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-blue-900 dark:text-blue-100">
                                {(t.dashboard as any).portfolioInsights?.missingCoverage?.health || 'Looking to protect your health?'}
                            </h3>
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                                Explore health insurance options tailored for you.
                            </p>
                        </div>
                    </div>
                ) : !policies.some(p => p.lineOfBusiness === 'home' || p.lineOfBusiness === 'renters') ? (
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-purple-100/50 transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0 text-purple-600">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-purple-900 dark:text-purple-100">
                                {(t.dashboard as any).portfolioInsights?.missingCoverage?.home || 'Secure your home.'}
                            </h3>
                            <p className="text-xs text-purple-700 dark:text-purple-300">
                                Find the best home insurance coverage.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0 text-emerald-600">
                            <div className="text-xl">✨</div>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                                {(t.dashboard as any).portfolioInsights?.allGood || 'All policies are active and verified'}
                            </h3>
                            <p className="text-xs text-emerald-700 dark:text-emerald-300">
                                Your coverage is up to date.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Toolbar: Search & Filter */}
            <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/40 dark:bg-stone-900/40 backdrop-blur-md p-2 rounded-2xl border border-white/40 dark:border-stone-700/40 shadow-sm">

                    {/* Search Input */}
                    <div className="relative group w-full sm:max-w-md">
                        <input
                            type="text"
                            placeholder={t.wallet.searchPlaceholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            id="tour-search"
                            className="pl-10 pr-4 py-2 bg-white/60 dark:bg-stone-900/60 backdrop-blur-xl border border-white/40 dark:border-stone-700/40 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all w-full placeholder:text-stone-400 dark:placeholder:text-stone-600 shadow-sm hover:bg-white/80 dark:hover:bg-stone-900/80"
                        />
                        <svg className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-teal-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    {/* Right Side Actions */}
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">

                        {/* Filter Tabs (Simplified for compact view) */}
                        {/* Filter Tabs (Simplified for compact view) */}
                        <div className="flex bg-stone-100/50 dark:bg-stone-800/50 p-1 rounded-lg border border-stone-200/50 dark:border-stone-700/50 overflow-x-auto max-w-[200px] sm:max-w-none">
                            {['all', 'recommended', 'motor', 'health', 'home'].map((filter) => {
                                if (filter === 'recommended' && policies.length < 3) return null; // Hide recommended until meaningful
                                return (
                                    <button
                                        key={filter}
                                        onClick={() => setActiveFilter(filter as any)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold capitalize transition-all whitespace-nowrap ${activeFilter === filter
                                            ? 'bg-white dark:bg-stone-700 shadow-sm text-teal-700 dark:text-teal-400'
                                            : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
                                            }`}
                                    >
                                        {filter === 'all' ? t.common?.all || 'All' : filter}
                                    </button>
                                )
                            })}
                        </div>

                        {/* View Switcher */}
                        <div className="hidden sm:flex bg-stone-100/50 dark:bg-stone-800/50 p-1 rounded-lg border border-stone-200/50 dark:border-stone-700/50">
                            <button
                                onClick={() => handleViewModeChange('grid')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-stone-700 shadow-sm text-teal-600 dark:text-teal-400' : 'text-stone-500'}`}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                            </button>
                            <button
                                onClick={() => handleViewModeChange('list')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-stone-700 shadow-sm text-teal-600 dark:text-teal-400' : 'text-stone-500'}`}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

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
                premiumTrend={[]}
            />

            {/* Main Content Area */}
            <div className={`animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200`}>
                {viewMode === 'list' ? (
                    <PolicyTable
                        policies={filteredPolicies}
                        onViewPolicy={onViewPolicy}
                        onRenewPolicy={(policyId: string) => console.log('Renew:', policyId)}
                        onViewHistory={onViewHistory}
                        onRunAnalysis={onRunAnalysis}
                        onDelete={onDeletePolicy}
                        onShare={onShareWithAgent}
                        onAddToWallet={onAddToWallet}
                        onViewDocuments={onViewDocuments}
                    />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        {filteredPolicies.map((policy, index) => (
                            <PolicyCard
                                key={policy.id}
                                policy={policy}
                                onView={() => onViewPolicy?.(policy.id)}
                                onShare={() => onShareWithAgent?.(policy.id)}
                                onAddToWallet={() => onAddToWallet?.(policy.id)}
                                onViewDocuments={() => onViewDocuments?.(policy.id)}
                                onRunAnalysis={() => onRunAnalysis?.(policy.id)}
                                onDelete={() => onDeletePolicy?.(policy.id)}
                                onViewHistory={() => onViewHistory?.(policy.id)}
                                id={index === 0 ? "tour-policy-card-0" : undefined}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* No search results empty state */}
            {filteredPolicies.length === 0 && policies.length > 0 && (
                <div className="py-20 text-center">
                    <div className="w-20 h-20 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-black text-stone-900 dark:text-white capitalize">{t.wallet.noPoliciesFound}</h3>
                    <p className="text-stone-500 dark:text-stone-400 mt-2 font-medium">{t.wallet.noPoliciesFoundDesc}</p>
                    <button
                        onClick={() => { setSearchQuery(''); setActiveFilter('all'); }}
                        className="mt-6 text-teal-600 dark:text-teal-400 font-black uppercase text-xs tracking-widest hover:underline"
                    >
                        Clear all filters
                    </button>
                </div>
            )}

            {/* Add Policy FAB - Visible on all screens */}
            {/* Add Policy FAB - Visible on all screens */}
            <div className="fixed bottom-8 right-8 z-40">
                {policies.length > 0 ? (
                    /* Tiered FAB for returning users */
                    <div className="relative group">
                        <div className="absolute bottom-full right-0 mb-4 flex flex-col gap-2 opacity-0 scale-90 translate-y-4 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 origin-bottom-right">
                            <button onClick={onAddManually} className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-stone-800 rounded-xl shadow-xl text-xs font-bold text-stone-600 dark:text-stone-300 whitespace-nowrap hover:bg-stone-50 dark:hover:bg-stone-700">
                                Add details manually
                                <span className="w-8 h-8 flex items-center justify-center bg-stone-100 dark:bg-stone-900 rounded-lg">✍️</span>
                            </button>
                            <button onClick={onUploadDocument} className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-stone-800 rounded-xl shadow-xl text-xs font-bold text-stone-600 dark:text-stone-300 whitespace-nowrap hover:bg-stone-50 dark:hover:bg-stone-700">
                                Upload document
                                <span className="w-8 h-8 flex items-center justify-center bg-stone-100 dark:bg-stone-900 rounded-lg">📄</span>
                            </button>
                        </div>
                        <button
                            id="tour-fab"
                            className="flex items-center justify-center w-16 h-16 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300"
                            aria-label="Add Policy"
                        >
                            <span className="text-2xl font-light">+</span>
                        </button>
                    </div>
                ) : (
                    /* Simple FAB for new users */
                    <button
                        onClick={onAddManually}
                        id="tour-fab"
                        className="group relative flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-2xl shadow-2xl shadow-teal-500/20 hover:scale-110 active:scale-95 transition-all duration-300 border border-white/10"
                        aria-label="Add Policy"
                    >
                        <svg className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    )
}
