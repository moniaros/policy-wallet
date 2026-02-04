"use client"

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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
import type { Policy } from './types'

interface WalletListClientProps {
    policies: Policy[]
    user?: {
        name: string
    }
}

type FilterType = 'all' | 'active' | 'expiring' | 'action_needed'

export function WalletListClient({ policies, user }: WalletListClientProps) {
    const router = useRouter()
    const [filter, setFilter] = useState<FilterType>('all')
    const [searchQuery, setSearchQuery] = useState('')

    // --- Derived Data ---
    const stats = useMemo(() => {
        return {
            total: policies.length,
            expiring: policies.filter(p => p.status === 'expiring_soon').length,
            actionNeeded: policies.filter(p => p.status === 'action_needed' || p.status === 'incomplete').length,
            active: policies.filter(p => p.status === 'active').length
        }
    }, [policies])

    const filteredPolicies = useMemo(() => {
        return policies.filter(policy => {
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
    }, [policies, filter, searchQuery])

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
            case 'active': return 'Active'
            case 'expiring_soon': return 'Expiring Soon'
            case 'action_needed': type: return 'Action Needed'
            case 'incomplete': return 'Incomplete'
            default: return status
        }
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '—'
        return new Date(dateStr).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 text-white rounded-b-[2.5rem] shadow-2xl pb-16 pt-8 px-6 lg:px-12 mb-8">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-3xl rounded-full -mr-32 -mt-32 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-300/20 blur-3xl rounded-full -ml-32 -mb-32 pointer-events-none" />

                <div className="relative z-10 max-w-7xl mx-auto">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-2 opacity-90">
                                <Wallet className="w-5 h-5" />
                                <span className="text-xs font-bold uppercase tracking-wider">Policy Wallet</span>
                            </div>
                            <h1 className="text-4xl lg:text-5xl font-black tracking-tight mb-2">
                                Your Coverage
                            </h1>
                            <p className="text-emerald-50 text-lg opacity-90">
                                Manage and track all your insurance assets in one place.
                            </p>
                        </div>
                        <button
                            onClick={() => router.push('/wallet/add')}
                            className="hidden md:flex items-center gap-2 bg-white text-emerald-700 px-6 py-3 rounded-xl font-bold hover:bg-emerald-50 active:scale-95 transition-all shadow-lg hover:shadow-xl"
                        >
                            <Plus className="w-5 h-5" />
                            Add Policy
                        </button>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-1 text-emerald-100">
                                <Shield className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase">Total Policies</span>
                            </div>
                            <span className="text-3xl font-black">{stats.total}</span>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-1 text-emerald-100">
                                <Clock className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase">Active</span>
                            </div>
                            <span className="text-3xl font-black">{stats.active}</span>
                        </div>
                        <div className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 ${stats.expiring > 0 ? 'bg-amber-500/20 border-amber-400/30' : ''}`}>
                            <div className="flex items-center gap-2 mb-1 text-emerald-100">
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase">Expiring</span>
                            </div>
                            <span className="text-3xl font-black">{stats.expiring}</span>
                        </div>
                        <div className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 ${stats.actionNeeded > 0 ? 'bg-red-500/20 border-red-400/30' : ''}`}>
                            <div className="flex items-center gap-2 mb-1 text-emerald-100">
                                <AlertTriangle className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase">Attention</span>
                            </div>
                            <span className="text-3xl font-black">{stats.actionNeeded}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-20">
                {/* Controls */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xl border border-slate-200 dark:border-slate-800 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
                    {/* Tabs */}
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto max-w-full no-scrollbar">
                        {[
                            { id: 'all', label: 'All Policies' },
                            { id: 'active', label: 'Active' },
                            { id: 'expiring', label: 'Expiring' },
                            { id: 'action_needed', label: 'Action Needed' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setFilter(tab.id as FilterType)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${filter === tab.id
                                        ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm'
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
                            placeholder="Search policies..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 transition-all"
                        />
                    </div>
                </div>

                {/* Policies Grid */}
                {filteredPolicies.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 border-dashed">
                        <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Shield className="w-10 h-10 text-emerald-500/50" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No policies found</h3>
                        <p className="text-slate-500 mb-8 max-w-sm mx-auto">
                            {searchQuery
                                ? "We couldn't find any policies matching your search."
                                : "Get started by adding your first insurance policy to your digital wallet."}
                        </p>
                        {!searchQuery && (
                            <button
                                onClick={() => router.push('/wallet/add')}
                                className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all"
                            >
                                <Plus className="w-5 h-5" />
                                Add Your First Policy
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPolicies.map((policy) => {
                            const Icon = getTypeIcon(policy.lineOfBusiness)
                            const statusColor = getStatusColor(policy.status)

                            return (
                                <div
                                    key={policy.id}
                                    onClick={() => router.push(`/wallet/${policy.id}`)}
                                    className="group relative bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm hover:shadow-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all duration-300 cursor-pointer overflow-hidden"
                                >
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-2xl font-black text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700">
                                                {policy.insurerLogo ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={policy.insurerLogo} alt={policy.insurerName} className="w-8 h-8 object-contain" />
                                                ) : (
                                                    policy.insurerName.charAt(0)
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900 dark:text-white leading-tight">
                                                    {policy.insurerName}
                                                </h3>
                                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-0.5">
                                                    {policy.policyNumber}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${statusColor}`}>
                                            {getStatusLabel(policy.status)}
                                        </div>
                                    </div>

                                    <div className="space-y-4 mb-6">
                                        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                                            <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-medium capitalize">
                                                {policy.lineOfBusiness.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                                            <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                                                <Calendar className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-medium">
                                                Expires {formatDate(policy.endDate)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between group-hover:text-emerald-600 transition-colors">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 group-hover:text-emerald-600">
                                            View Details
                                        </span>
                                        <ArrowUpRight className="w-5 h-5" />
                                    </div>

                                    {/* Hover Effect Gradient */}
                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Mobile FAB */}
            <button
                onClick={() => router.push('/wallet/add')}
                className="md:hidden fixed bottom-24 right-6 w-14 h-14 bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center z-40 active:scale-90 transition-transform"
            >
                <Plus className="w-7 h-7" />
            </button>
        </div>
    )
}
