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
            month: 'short'
        })
    }

    const totalPremium = useMemo(() => {
        return displayPolicies.reduce((sum, p) => sum + (p.premiumAmount || 0), 0)
    }, [displayPolicies])

    return (
        <div className="min-h-screen bg-stone-50 dark:bg-stone-950 pb-24">
            {/* Branded Header */}
            <div className="px-6 pt-12 pb-6 flex items-center justify-between sticky top-0 md:relative z-20 bg-stone-50/95 dark:bg-stone-950/95 backdrop-blur-md md:bg-transparent">
                <div className="flex items-center gap-0.5">
                    <span className="text-2xl font-black tracking-tight text-stone-900 dark:text-white">Policy</span>
                    <span className="text-2xl font-black tracking-tight text-teal-600">Wallet</span>
                </div>
                <div className="w-12 h-12 rounded-full border-2 border-stone-200 dark:border-stone-800 flex items-center justify-center text-stone-400 group active:scale-95 transition-all">
                    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                        <line x1="9" y1="9" x2="9.01" y2="9" />
                        <line x1="15" y1="9" x2="15.01" y2="9" />
                    </svg>
                </div>
            </div>

            <div className="px-6 mb-8">
                <h2 className="text-xl font-black text-stone-900 dark:text-white tracking-tight mb-6">
                    Your Coverage
                </h2>

                {/* KPI Cards Horizontal Scroll */}
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-6 px-6 snap-x safe-area-inset-right">
                    {/* Total Policies Card */}
                    <div className="flex-shrink-0 w-[180px] bg-gradient-to-br from-teal-600 to-teal-400 rounded-[32px] p-6 text-white shadow-xl shadow-teal-600/20 snap-start">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-80 block mb-2">Total Policies:</span>
                        <span className="text-4xl font-black tracking-tighter">{stats.total}</span>
                    </div>

                    {/* Monthly Premium Card */}
                    <div className="flex-shrink-0 w-[240px] bg-gradient-to-br from-teal-500 to-teal-300 rounded-[32px] p-6 text-white shadow-xl shadow-teal-500/20 snap-start">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-80 block mb-2">Yearly Premium:</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black tracking-tighter">€{totalPremium.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Potential Savings Card - Hidden until real data is available to remove dummy data
                    <div className="flex-shrink-0 w-[220px] bg-stone-900 dark:bg-white rounded-[32px] p-6 shadow-xl shadow-stone-900/10 snap-start group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <svg className="w-24 h-24 text-white dark:text-stone-900" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.15-1.46-3.27-3.4h1.96c.1 1.05 1.18 1.91 2.53 1.91 1.35 0 2.53-.86 2.53-1.95 0-1.01-.84-1.55-2.27-1.95-1.99-.54-3.41-1.38-3.41-3.36 0-1.89 1.4-3.03 3.09-3.42V4h2.67v1.93c1.61.35 2.87 1.45 2.99 3.23h-1.96c-.1-1.03-1.07-1.77-2.38-1.77-1.34 0-2.29.98-2.29 1.91 0 1.01.97 1.55 2.39 1.95 2.01.54 3.39 1.47 3.39 3.39 0 1.89-1.39 3.02-3.21 3.45z" /></svg>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2 relative z-10">Potential Savings:</span>
                        <div className="relative z-10">
                            <span className="text-3xl font-black tracking-tighter text-white dark:text-stone-900">€0.00</span>
                            <span className="text-xs font-bold text-emerald-400 dark:text-emerald-600 block mt-1">/ Year ROI</span>
                        </div>
                    </div>
                    */}

                    {/* Document Vault Card */}
                    <div className="flex-shrink-0 w-[200px] bg-white dark:bg-stone-800 border-2 border-stone-100 dark:border-stone-700 rounded-[32px] p-6 snap-start">
                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">Vault Health:</span>
                        <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="none" className="text-stone-100 dark:text-stone-700" />
                                    <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="none" className="text-teal-500" strokeDasharray="125.6" strokeDashoffset="18.84" strokeLinecap="round" />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-stone-900 dark:text-white">85%</span>
                            </div>
                            <span className="text-xs font-bold text-stone-600 dark:text-stone-300 leading-tight">Docs<br />Organized</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-6 mb-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black text-stone-900 dark:text-white tracking-tight">
                        Policy List
                    </h2>
                    <button
                        onClick={() => router.push('/wallet/add')}
                        className="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-400 active:scale-90 transition-all"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                {/* Policies List */}
                <div className="space-y-4">
                    {displayPolicies.length === 0 ? (
                        <div className="text-center py-12 bg-white dark:bg-stone-900 rounded-[32px] border-2 border-dashed border-stone-100 dark:border-stone-800">
                            <p className="text-stone-400 text-sm font-medium italic">No policies found.</p>
                        </div>
                    ) : (
                        displayPolicies.map((policy) => {
                            const Icon = getTypeIcon(policy.lineOfBusiness)
                            const isActive = policy.status === 'active'

                            return (
                                <div
                                    key={policy.id}
                                    onClick={() => router.push(`/wallet/${policy.id}`)}
                                    className="bg-white dark:bg-stone-900 rounded-[32px] p-5 flex items-center gap-4 shadow-sm border border-stone-50 dark:border-stone-800/50 active:scale-[0.98] transition-all cursor-pointer group"
                                >
                                    <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center transition-colors ${isActive ? 'bg-teal-50 text-teal-600' : 'bg-stone-50 text-stone-400'}`}>
                                        <Icon className="w-7 h-7" />
                                    </div>

                                    <div className="flex-1">
                                        <h3 className="text-base font-black text-stone-900 dark:text-white tracking-tight">
                                            {policy.insurerName}
                                        </h3>
                                        <p className="text-xs font-bold text-stone-400">
                                            {policy.acordData?.model || policy.policyNumber}
                                        </p>
                                    </div>

                                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${isActive
                                        ? 'bg-teal-600 text-white'
                                        : 'bg-amber-400 text-stone-900'
                                        }`}>
                                        {policy.status.replace('_', ' ')}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    )
}

