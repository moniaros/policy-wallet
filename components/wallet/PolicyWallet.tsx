"use client"

import { useState, useMemo } from 'react'
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
    onBatchUpload,
    onShareWithAgent,
    onAddToWallet,
    onViewDocuments,
}: PolicyWalletProps & { isLoading?: boolean }) {
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
        const order = { expiring_soon: 0, action_needed: 1, active: 2, incomplete: 3 }
        return [...pols].sort((a, b) => order[a.status] - order[b.status])
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
        // Try to extract premium from different possible locations
        return sum
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
        <div className="max-w-5xl mx-auto px-4 py-6 sm:py-10 sm:px-6 lg:px-8">
            {/* Header with Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-black text-stone-900 dark:text-white tracking-tight">
                        {t.wallet.title}
                    </h1>
                    <p className="text-stone-500 dark:text-stone-400 mt-1">
                        {policies.length} {language === 'el' ? 'συμβόλαια' : 'policies'}
                    </p>
                </div>
                <div className="relative">
                    <button
                        onClick={() => setShowAddMenu(!showAddMenu)}
                        className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl shadow-lg shadow-teal-600/20 hover:shadow-teal-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="hidden sm:inline">{t.wallet.addPolicy}</span>
                        <span className="sm:hidden">Add</span>
                        <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {/* Add Dropdown Menu */}
                    {showAddMenu && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowAddMenu(false)} />
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-stone-800 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-700 overflow-hidden z-20 animate-in fade-in slide-in-from-top-2">
                                <button
                                    onClick={() => { onAddManually?.(); setShowAddMenu(false); }}
                                    className="w-full px-4 py-3 text-left hover:bg-stone-50 dark:hover:bg-stone-700 flex items-center gap-3 transition-colors"
                                >
                                    <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900/30 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="font-bold text-stone-900 dark:text-white text-sm">Add Manually</p>
                                        <p className="text-xs text-stone-400">Enter policy details</p>
                                    </div>
                                </button>
                                <button
                                    onClick={() => { onBatchUpload?.(); setShowAddMenu(false); }}
                                    className="w-full px-4 py-3 text-left hover:bg-stone-50 dark:hover:bg-stone-700 flex items-center gap-3 transition-colors border-t border-stone-100 dark:border-stone-700"
                                >
                                    <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="font-bold text-stone-900 dark:text-white text-sm">Batch Upload</p>
                                        <p className="text-xs text-stone-400">Upload multiple files</p>
                                    </div>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Status Summary */}
            <StatusSummary
                activeCount={activeCount}
                expiringCount={expiringCount}
                actionNeededCount={actionNeededCount}
            />

            {/* Search and Filters */}
            <div className="mb-8 space-y-4">
                {/* Search Bar */}
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder={language === 'el' ? 'Αναζήτηση συμβολαίων...' : 'Search policies...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-sm"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-stone-400 hover:text-stone-600"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Category Filters */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
                    {[
                        { key: 'all' as const, label: language === 'el' ? 'Όλα' : 'All', icon: '📋' },
                        { key: 'motor' as const, label: t.policyTypes.motor, icon: '🚗' },
                        { key: 'health' as const, label: t.policyTypes.health, icon: '❤️' },
                        { key: 'home' as const, label: t.policyTypes.home, icon: '🏠' },
                        { key: 'life' as const, label: t.policyTypes.life, icon: '🛡️' },
                        { key: 'travel' as const, label: t.policyTypes.travel, icon: '✈️' },
                    ].filter(cat => categoryCounts[cat.key] > 0 || cat.key === 'all').map(cat => (
                        <button
                            key={cat.key}
                            onClick={() => setActiveFilter(cat.key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all flex-shrink-0 ${activeFilter === cat.key
                                ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 shadow-lg'
                                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                                }`}
                        >
                            <span>{cat.icon}</span>
                            <span>{cat.label}</span>
                            {categoryCounts[cat.key] > 0 && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeFilter === cat.key
                                    ? 'bg-white/20 dark:bg-stone-900/20'
                                    : 'bg-stone-200 dark:bg-stone-700'
                                    }`}>
                                    {categoryCounts[cat.key]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* No Results State */}
            {filteredPolicies.length === 0 && (
                <div className="text-center py-16 bg-stone-50 dark:bg-stone-900/50 rounded-3xl border border-stone-100 dark:border-stone-800">
                    <div className="w-16 h-16 mx-auto mb-4 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center text-2xl">
                        🔍
                    </div>
                    <h3 className="text-lg font-bold text-stone-900 dark:text-white mb-2">
                        {language === 'el' ? 'Δεν βρέθηκαν συμβόλαια' : 'No policies found'}
                    </h3>
                    <p className="text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
                        {language === 'el'
                            ? 'Δοκιμάστε διαφορετικούς όρους αναζήτησης ή φίλτρα'
                            : 'Try different search terms or filters'}
                    </p>
                    <button
                        onClick={() => {
                            setSearchQuery('')
                            setActiveFilter('all')
                        }}
                        className="mt-4 text-teal-600 dark:text-teal-400 font-bold text-sm hover:underline"
                    >
                        {language === 'el' ? 'Καθαρισμός φίλτρων' : 'Clear filters'}
                    </button>
                </div>
            )}

            {/* Policies Grid */}
            {filteredPolicies.length > 0 && (
                <div className={activeFilter === 'all'
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                    : "space-y-4 max-w-2xl"
                }>
                    {activeFilter === 'all' ? (
                        <>
                            {/* Motor Insurance */}
                            {renderPolicySection(
                                t.policyTypes.motor,
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>,
                                sortedMotor
                            )}

                            {/* Health Insurance */}
                            {renderPolicySection(
                                t.policyTypes.health,
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>,
                                sortedHealth
                            )}

                            {/* Home Insurance */}
                            {renderPolicySection(
                                t.policyTypes.home,
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>,
                                sortedHome
                            )}

                            {/* Life Insurance */}
                            {renderPolicySection(
                                t.policyTypes.life,
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>,
                                sortedLife
                            )}

                            {/* Travel Insurance */}
                            {renderPolicySection(
                                t.policyTypes.travel,
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>,
                                sortedTravel
                            )}
                        </>
                    ) : (
                        // Single category view - show all filtered as a list
                        <div className="space-y-4">
                            {filteredPolicies.map(policy => (
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
                    )}
                </div>
            )}

            {/* Mobile Add Policy FAB */}
            <div className="fixed bottom-6 right-6 sm:hidden z-40">
                <button
                    onClick={onAddManually}
                    className="w-14 h-14 bg-teal-600 hover:bg-teal-700 text-white rounded-full shadow-xl shadow-teal-600/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>
        </div>
    )
}
