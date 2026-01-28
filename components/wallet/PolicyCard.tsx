"use client"

import { useState } from 'react'
import type { Policy } from './types'
import { useLanguage } from '@/contexts/LanguageContext'

interface PolicyCardProps {
    policy: Policy
    onView?: () => void
    onShare?: () => void
    onAddToWallet?: () => void
    onViewDocuments?: () => void
}

export function PolicyCard({ policy, onView, onShare, onAddToWallet, onViewDocuments }: PolicyCardProps) {
    const [menuOpen, setMenuOpen] = useState(false)
    const { t, language } = useLanguage()

    // Format date based on locale
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '—'
        return new Date(dateStr).toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
    }

    // Calculate days until expiry
    const getDaysUntilExpiry = () => {
        if (!policy.endDate) return null
        const now = new Date()
        const end = new Date(policy.endDate)
        const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return diff
    }

    const daysLeft = getDaysUntilExpiry()

    // Status badge styling
    const getStatusBadge = () => {
        switch (policy.status) {
            case 'active':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-full">
                        <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse"></span>
                        {t.policyStatus.active}
                    </span>
                )
            case 'expiring_soon':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                        {t.policyStatus.expiringSoon}
                    </span>
                )
            case 'incomplete':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700 rounded-full">
                        <span className="w-1.5 h-1.5 bg-stone-400 rounded-full"></span>
                        Incomplete
                    </span>
                )
            case 'action_needed':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-full">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                        {t.policyStatus.actionNeeded}
                    </span>
                )
            default:
                return null
        }
    }

    // Get policy type icon
    const getPolicyIcon = () => {
        const lob = policy.lineOfBusiness as string
        switch (lob) {
            case 'motor':
                return '🚗'
            case 'health':
                return '❤️'
            case 'home':
                return '🏠'
            case 'life':
                return '🛡️'
            case 'travel':
                return '✈️'
            case 'liability':
                return '⚖️'
            default:
                return '📋'
        }
    }

    return (
        <div
            onClick={onView}
            className="relative bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-3xl p-5 sm:p-6 hover:shadow-xl hover:border-teal-200 dark:hover:border-teal-900/50 transition-all cursor-pointer group active:scale-[0.98]"
        >
            {/* Status indicator line at top */}
            <div className={`absolute top-0 left-6 right-6 h-1 rounded-b-full ${policy.status === 'active' ? 'bg-teal-500' :
                policy.status === 'expiring_soon' ? 'bg-amber-500' :
                    policy.status === 'action_needed' ? 'bg-red-500' :
                        'bg-stone-300 dark:bg-stone-600'
                }`} />

            {/* Shared with agent indicator */}
            {policy.sharedWithAgents.length > 0 && (
                <div className="absolute top-4 right-4 group/tooltip">
                    <div className="p-2 bg-teal-50 dark:bg-teal-900/30 rounded-full text-teal-600 dark:text-teal-400">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                        </svg>
                    </div>
                    <div className="absolute top-10 right-0 hidden group-hover/tooltip:block z-10 px-3 py-2 text-xs font-medium bg-stone-900 dark:bg-stone-700 text-white rounded-xl shadow-xl whitespace-nowrap">
                        Shared with {policy.sharedWithAgents[0].agentName}
                    </div>
                </div>
            )}

            {/* Policy info */}
            <div className="pr-10 sm:pr-12">
                {/* Mobile: Icon + Insurer row */}
                <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl flex-shrink-0 mt-0.5">{getPolicyIcon()}</span>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-lg sm:text-xl font-black text-stone-900 dark:text-white tracking-tight leading-tight truncate">
                            {policy.insurerName}
                        </h3>
                        <p className="text-sm font-mono text-stone-500 dark:text-stone-400 truncate">
                            {policy.policyNumber}
                        </p>
                    </div>
                </div>

                {/* Status and Expiry */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {getStatusBadge()}
                    {daysLeft !== null && daysLeft >= 0 && daysLeft <= 60 && (
                        <span className={`text-xs font-bold uppercase tracking-wider ${daysLeft <= 7 ? 'text-red-500' :
                            daysLeft <= 30 ? 'text-amber-600 dark:text-amber-400' :
                                'text-stone-400 dark:text-stone-500'
                            }`}>
                            {daysLeft === 0 ? (language === 'el' ? 'Λήγει σήμερα' : 'Expires today') :
                                daysLeft === 1 ? (language === 'el' ? 'Λήγει αύριο' : 'Expires tomorrow') :
                                    `${daysLeft} ${language === 'el' ? 'ημέρες' : 'days'}`}
                        </span>
                    )}
                </div>

                {/* Expiry date - always visible on larger screens */}
                <div className="hidden sm:block mt-3 pt-3 border-t border-stone-100 dark:border-stone-700">
                    <span className="text-xs font-medium text-stone-400 dark:text-stone-500">
                        {t.wallet.ends}: {formatDate(policy.endDate)}
                    </span>
                </div>
            </div>

            {/* Quick Actions - Mobile: Bottom row, Desktop: Overflow menu */}
            <div className="sm:hidden mt-4 pt-3 border-t border-stone-100 dark:border-stone-700 flex items-center gap-2">
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onAddToWallet?.()
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 rounded-xl text-xs font-bold hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Wallet
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onShare?.()
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-xl text-xs font-bold hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onView?.()
                    }}
                    className="flex items-center justify-center px-4 py-2 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-xl text-xs font-bold hover:bg-stone-800 dark:hover:bg-stone-100 transition-colors"
                >
                    View
                    <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            {/* Desktop: Overflow menu */}
            <div className="hidden sm:block absolute bottom-6 right-6">
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                    </button>

                    {menuOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setMenuOpen(false)}
                            />
                            <div className="absolute right-0 bottom-full mb-2 z-20 w-56 bg-white dark:bg-stone-800 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-700 py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <button
                                    onClick={() => {
                                        onShare?.()
                                        setMenuOpen(false)
                                    }}
                                    className="w-full px-4 py-3 text-left text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors flex items-center gap-3"
                                >
                                    <div className="w-8 h-8 bg-teal-50 dark:bg-teal-900/30 rounded-lg flex items-center justify-center text-teal-600 dark:text-teal-400">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                    </div>
                                    {t.wallet.shareWithAgent}
                                </button>
                                <button
                                    onClick={() => {
                                        onAddToWallet?.()
                                        setMenuOpen(false)
                                    }}
                                    className="w-full px-4 py-3 text-left text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors flex items-center gap-3"
                                >
                                    <div className="w-8 h-8 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                    </div>
                                    Add to Wallet
                                </button>
                                <button
                                    onClick={() => {
                                        onViewDocuments?.()
                                        setMenuOpen(false)
                                    }}
                                    className="w-full px-4 py-3 text-left text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors flex items-center gap-3"
                                >
                                    <div className="w-8 h-8 bg-amber-50 dark:bg-amber-900/30 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    </div>
                                    {t.wallet.documents}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Hover arrow indicator - Desktop only */}
            <div className="hidden sm:flex absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
            </div>
        </div>
    )
}
