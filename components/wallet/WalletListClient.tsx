"use client"

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import {
    Wallet,
    Plus,
    Search,
    Shield,
    Clock,
    AlertTriangle,
    FileText,
    ChevronRight,
    Filter,
    ArrowUpRight,
    Car,
    Heart,
    Home,
    Plane,
    Briefcase,
    Dog,
    AlertCircle,
    Calendar
} from 'lucide-react'
import { offlineStorage } from '@/lib/services/offline-storage'
import { useOffline } from '@/components/providers/OfflineProvider'
import { useEffect } from 'react'
import { toast } from 'sonner'
import type { Policy } from './types'

interface WalletListClientProps {
    policies: Policy[]
    user?: {
        name: string
    }
}

type FilterType = 'all' | 'active' | 'expiring' | 'action_needed'

export function WalletListClient({ policies, user }: WalletListClientProps) {
    const { t, language } = useLanguage()
    const router = useRouter()
    const [filter, setFilter] = useState<FilterType>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const { isOnline } = useOffline()
    const [displayPolicies, setDisplayPolicies] = useState<Policy[]>(policies)

    // --- Sync Logic ---
    useEffect(() => {
        const syncPolicies = async () => {
            if (isOnline) {
                // We are online, save latest policies to offline storage
                if (policies.length > 0) {
                    await offlineStorage.savePolicies(policies)
                }
                setDisplayPolicies(policies)
            } else {
                // We are offline, try to load from storage
                try {
                    const stored = await offlineStorage.getStoredPolicies()
                    if (stored && stored.length > 0) {
                        setDisplayPolicies(stored)
                    } else {
                        // Keep using initial policies if storage empty (likely empty array)
                        setDisplayPolicies(policies)
                    }
                } catch (err) {
                    console.error('Failed to load offline policies', err)
                }
            }
        }
        syncPolicies()
    }, [isOnline, policies])
    const stats = useMemo(() => {
        const source = displayPolicies
        return {
            total: source.length,
            expiring: source.filter(p => p.status === 'expiring_soon').length,
            actionNeeded: source.filter(p => p.status === 'action_needed' || p.status === 'incomplete').length,
            active: source.filter(p => p.status === 'active').length
        }
    }, [policies])

    const filteredPolicies = useMemo(() => {
        return displayPolicies.filter(policy => {
            // Text Search
            const searchLower = searchQuery.toLowerCase()
            const matchesSearch =
                policy.insurerName.toLowerCase().includes(searchLower) ||
                policy.policyNumber.toLowerCase().includes(searchLower) ||
                policy.lineOfBusiness.toLowerCase().includes(searchLower)

            // Status Filter
            let matchesFilter = true
            if (filter === 'active') matchesFilter = policy.status === 'active'
            if (filter === 'expiring') matchesFilter = policy.status === 'expiring_soon'
            if (filter === 'action_needed') matchesFilter = ['action_needed', 'incomplete'].includes(policy.status)

            return matchesSearch && matchesFilter
        })
    }, [displayPolicies, filter, searchQuery])

    // --- Helpers ---
    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'motor': return Car
            case 'health': return Heart
            case 'home': return Home
            case 'travel': return Plane
            case 'pet': return Dog
            case 'professional': return Briefcase
            case 'liability': return Shield
            default: return Shield
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
            case 'expiring_soon': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800'
            case 'action_needed':
            case 'incomplete': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active': return t.policyStatus.active
            case 'expiring_soon': return t.policyStatus.expiringSoon
            case 'action_needed': return t.policyStatus.actionNeeded
            case 'incomplete': return t.common.loading
            default: return status
        }
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '—'
        return new Date(dateStr).toLocaleDateString(language === 'el' ? 'el-GR' : 'en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-8">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 text-white rounded-b-3xl shadow-xl pb-16 pt-8 px-6 lg:px-12 mb-8">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-3xl rounded-full -mr-32 -mt-32 pointer-events-none mix-blend-overlay" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-300/20 blur-3xl rounded-full -ml-32 -mb-32 pointer-events-none mix-blend-overlay" />

                <div className="relative z-10 max-w-7xl mx-auto">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-2 opacity-90">
                                <Wallet className="w-5 h-5" />
                                <span className="text-xs font-bold uppercase tracking-wider">Policy Wallet</span>
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mb-2">
                                {t.wallet.yourCoverage}
                            </h1>
                            <p className="text-emerald-50 text-base lg:text-lg opacity-90 max-w-md">
                                {t.wallet.manageTrack}
                            </p>
                        </div>
                        <button
                            onClick={() => router.push('/wallet/add')}
                            className="flex items-center gap-2 bg-white text-emerald-700 px-4 py-2 md:px-6 md:py-2.5 rounded-xl font-bold hover:bg-emerald-50 active:scale-95 transition-all shadow-lg hover:shadow-xl text-sm md:text-base"
                        >
                            <Plus className="w-4 h-4 md:w-5 md:h-5" />
                            {t.wallet.addPolicy}
                        </button>
                    </div>

                    {/* Stats Slider */}
                    <div className="flex md:grid md:grid-cols-4 gap-4 overflow-x-auto no-scrollbar pb-2 md:pb-0 -mx-6 px-6 md:mx-0 md:px-0 snap-x">
                        <div className="flex-shrink-0 w-[160px] md:w-auto bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-colors snap-start">
                            <div className="flex items-center gap-2 mb-1.5 text-emerald-100">
                                <Shield className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-wide">{t.wallet.totalPolicies}</span>
                            </div>
                            <span className="text-3xl font-bold">{stats.total}</span>
                        </div>
                        <div className="flex-shrink-0 w-[160px] md:w-auto bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-colors snap-start">
                            <div className="flex items-center gap-2 mb-1.5 text-emerald-100">
                                <Clock className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-wide">{t.wallet.activePolicies}</span>
                            </div>
                            <span className="text-3xl font-bold">{stats.active}</span>
                        </div>
                        <div className={`flex-shrink-0 w-[160px] md:w-auto backdrop-blur-md border rounded-2xl p-4 transition-colors snap-start ${stats.expiring > 0 ? 'bg-amber-500/20 border-amber-400/40 text-white' : 'bg-white/10 border-white/20 hover:bg-white/15'}`}>
                            <div className="flex items-center gap-2 mb-1.5 text-emerald-100">
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-wide">{t.wallet.expiringPolicies}</span>
                            </div>
                            <span className="text-3xl font-bold">{stats.expiring}</span>
                        </div>
                        <div className={`flex-shrink-0 w-[160px] md:w-auto backdrop-blur-md border rounded-2xl p-4 transition-colors snap-start ${stats.actionNeeded > 0 ? 'bg-red-500/20 border-red-400/40 text-white' : 'bg-white/10 border-white/20 hover:bg-white/15'}`}>
                            <div className="flex items-center gap-2 mb-1.5 text-emerald-100">
                                <AlertTriangle className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-wide">{t.wallet.attentionNeeded}</span>
                            </div>
                            <span className="text-3xl font-bold">{stats.actionNeeded}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-20">
                {/* Controls */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 shadow-lg border border-slate-200 dark:border-slate-800 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
                    {/* Tabs */}
                    <div className="flex p-1 bg-slate-50 dark:bg-slate-950 rounded-xl overflow-x-auto max-w-full no-scrollbar w-full md:w-auto">
                        {[
                            { id: 'all', label: t.wallet.allPolicies },
                            { id: 'active', label: t.wallet.activePolicies },
                            { id: 'expiring', label: t.wallet.expiringPolicies },
                            { id: 'action_needed', label: t.wallet.attentionNeeded }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setFilter(tab.id as FilterType)}
                                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${filter === tab.id
                                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700'
                                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="relative w-full md:w-auto md:min-w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder={t.wallet.searchPlaceholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-transparent focus:border-emerald-500/50 focus:bg-white dark:focus:bg-slate-900 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                        />
                    </div>
                </div>

                {/* Policies Grid */}
                {filteredPolicies.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
                        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Shield className="w-8 h-8 text-emerald-500/50" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t.wallet.noPoliciesFound}</h3>
                        <p className="text-slate-500 text-sm mb-8 max-w-sm mx-auto">
                            {searchQuery
                                ? t.wallet.noPoliciesFoundDesc
                                : t.wallet.noPoliciesYetDesc}
                        </p>
                        {!searchQuery && (
                            <button
                                onClick={() => router.push('/wallet/add')}
                                className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg active:scale-95"
                            >
                                <Plus className="w-5 h-5" />
                                {t.wallet.addFirstPolicy}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredPolicies.map((policy) => {
                            const Icon = getTypeIcon(policy.lineOfBusiness)
                            const statusColor = getStatusColor(policy.status)

                            return (
                                <div
                                    key={policy.id}
                                    onClick={() => router.push(`/wallet/${policy.id}`)}
                                    className="group relative bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm hover:shadow-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 dark:hover:border-emerald-500/30 transition-all duration-300 cursor-pointer overflow-hidden"
                                >
                                    <div className="flex justify-between items-start mb-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-xl font-bold text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 group-hover:scale-105 transition-transform">
                                                {policy.insurerLogo ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={policy.insurerLogo} alt={policy.insurerName} className="w-8 h-8 object-contain" />
                                                ) : (
                                                    policy.insurerName.charAt(0)
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900 dark:text-white leading-tight mb-0.5">
                                                    {policy.insurerName}
                                                </h3>
                                                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                                                    {policy.policyNumber}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${statusColor}`}>
                                            {getStatusLabel(policy.status)}
                                        </div>
                                    </div>

                                    <div className="space-y-3 mb-5">
                                        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">
                                            <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-medium capitalize">
                                                {t.policyTypes[policy.lineOfBusiness as keyof typeof t.policyTypes] || policy.lineOfBusiness.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                                            <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                                                <Calendar className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-medium">
                                                {formatDate(policy.endDate)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between transition-colors">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                            {t.wallet.viewDetails}
                                        </span>
                                        <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-all">
                                            <ArrowUpRight className="w-4 h-4" />
                                        </div>
                                    </div>

                                    {/* Gradient Border Bottom */}
                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

        </div>
    )
}
