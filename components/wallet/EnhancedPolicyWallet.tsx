"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Policy } from '@/components/wallet/types'
import { PullToRefresh } from '@/components/ui/PullToRefresh'
import { SwipeableCard, SwipeAction } from '@/components/ui/SwipeableCard'
import { FloatingActionButton, FABAction } from '@/components/ui/FloatingActionButton'
import { PolicyCard } from '@/components/wallet/PolicyCard'
import { StatusSummary } from '@/components/wallet/StatusSummary'
import { useLanguage } from '@/contexts/LanguageContext'
import { Camera, Upload, Edit, Trash2, Star, Share2, Wallet } from 'lucide-react'

interface EnhancedPolicyWalletProps {
    policies: Policy[]
    onRefresh: () => Promise<void>
    onViewPolicy: (id: string) => void
    onDeletePolicy: (id: string) => void
    onToggleFavorite: (id: string) => void
    onSharePolicy: (id: string) => void
    onAddManually: () => void
    onUploadDocument: () => void
    onScanDocument: () => void
}

export function EnhancedPolicyWallet({
    policies,
    onRefresh,
    onViewPolicy,
    onDeletePolicy,
    onToggleFavorite,
    onSharePolicy,
    onAddManually,
    onUploadDocument,
    onScanDocument
}: EnhancedPolicyWalletProps) {
    const { t, language } = useLanguage()
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')
    const [activeFilter, setActiveFilter] = useState<'all' | 'motor' | 'health' | 'home' | 'life' | 'travel'>('all')

    // Filter policies
    const filteredPolicies = policies.filter(p => {
        const matchesSearch = !searchQuery ||
            p.policyNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.insurerName?.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesFilter = activeFilter === 'all' || p.lineOfBusiness === activeFilter

        return matchesSearch && matchesFilter
    })

    // Calculate stats
    const activeCount = policies.filter(p => p.status === 'active').length
    const expiringCount = policies.filter(p => p.status === 'expiring_soon').length
    const actionNeededCount = policies.filter(p => p.status === 'action_needed').length

    // Category counts
    const categoryCounts = {
        all: policies.length,
        motor: policies.filter(p => p.lineOfBusiness === 'motor').length,
        health: policies.filter(p => p.lineOfBusiness === 'health').length,
        home: policies.filter(p => p.lineOfBusiness === 'home').length,
        life: policies.filter(p => p.lineOfBusiness === 'life').length,
        travel: policies.filter(p => p.lineOfBusiness === 'travel').length,
    }

    // FAB actions
    const fabActions: FABAction[] = [
        {
            id: 'scan',
            label: language === 'el' ? 'Σάρωση' : 'Scan Document',
            icon: <Camera className="w-5 h-5" />,
            color: 'sky',
            onClick: onScanDocument
        },
        {
            id: 'upload',
            label: language === 'el' ? 'Ανέβασμα' : 'Upload PDF',
            icon: <Upload className="w-5 h-5" />,
            color: 'emerald',
            onClick: onUploadDocument
        },
        {
            id: 'manual',
            label: language === 'el' ? 'Χειροκίνητα' : 'Add Manually',
            icon: <Edit className="w-5 h-5" />,
            color: 'purple',
            onClick: onAddManually
        }
    ]

    // Swipe actions for policy cards
    const getSwipeActions = (policy: Policy): { left: SwipeAction[], right: SwipeAction[] } => {
        return {
            left: [
                {
                    id: 'favorite',
                    label: policy.isFavorite ? 'Unfavorite' : 'Favorite',
                    icon: <Star className="w-4 h-4" fill={policy.isFavorite ? 'currentColor' : 'none'} />,
                    color: 'amber',
                    onAction: () => onToggleFavorite(policy.id)
                }
            ],
            right: [
                {
                    id: 'share',
                    label: 'Share',
                    icon: <Share2 className="w-4 h-4" />,
                    color: 'blue',
                    onAction: () => onSharePolicy(policy.id)
                },
                {
                    id: 'delete',
                    label: 'Delete',
                    icon: <Trash2 className="w-4 h-4" />,
                    color: 'red',
                    onAction: () => {
                        if (confirm(language === 'el' ? 'Διαγραφή συμβολαίου;' : 'Delete policy?')) {
                            onDeletePolicy(policy.id)
                        }
                    }
                }
            ]
        }
    }

    return (
        <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            {/* Header - Fixed */}
            <div className="flex-none px-4 pt-6 pb-4 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                    {t.wallet.title}
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                    {policies.length} {language === 'el' ? 'συμβόλαια' : 'policies'}
                </p>
            </div>

            {/* Scrollable Content with Pull-to-Refresh */}
            <PullToRefresh onRefresh={onRefresh}>
                <div className="px-4 py-6 space-y-6">
                    {/* Status Summary */}
                    <StatusSummary
                        activeCount={activeCount}
                        expiringCount={expiringCount}
                        actionNeededCount={actionNeededCount}
                    />

                    {/* Search Bar */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="search"
                            placeholder={language === 'el' ? 'Αναζήτηση...' : 'Search policies...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all shadow-sm"
                            inputMode="search"
                        />
                    </div>

                    {/* Category Filters */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
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
                                        ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/30'
                                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                                    }`}
                            >
                                <span>{cat.icon}</span>
                                <span>{cat.label}</span>
                                {categoryCounts[cat.key] > 0 && (
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${activeFilter === cat.key
                                            ? 'bg-white/20'
                                            : 'bg-slate-100 dark:bg-slate-800'
                                        }`}>
                                        {categoryCounts[cat.key]}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Policy Cards with Swipe Actions */}
                    <div className="space-y-4 pb-24">
                        {filteredPolicies.length === 0 ? (
                            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                                <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-2xl">
                                    🔍
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                    {language === 'el' ? 'Δεν βρέθηκαν συμβόλαια' : 'No policies found'}
                                </h3>
                                <p className="text-slate-600 dark:text-slate-400">
                                    {searchQuery
                                        ? (language === 'el' ? 'Δοκιμάστε διαφορετικούς όρους' : 'Try different search terms')
                                        : (language === 'el' ? 'Προσθέστε το πρώτο σας συμβόλαιο' : 'Add your first policy')}
                                </p>
                            </div>
                        ) : (
                            filteredPolicies.map(policy => {
                                const { left, right } = getSwipeActions(policy)
                                return (
                                    <SwipeableCard
                                        key={policy.id}
                                        leftActions={left}
                                        rightActions={right}
                                        onSwipeLeft={() => console.log('Swiped left:', policy.id)}
                                        onSwipeRight={() => console.log('Swiped right:', policy.id)}
                                    >
                                        <PolicyCard
                                            policy={policy}
                                            onView={() => onViewPolicy(policy.id)}
                                            onShare={() => onSharePolicy(policy.id)}
                                        />
                                    </SwipeableCard>
                                )
                            })
                        )}
                    </div>
                </div>
            </PullToRefresh>

            {/* Floating Action Button */}
            <FloatingActionButton
                actions={fabActions}
                mainLabel={language === 'el' ? 'Προσθήκη' : 'Add Policy'}
                position="bottom-right"
                size="lg"
            />
        </div>
    )
}
