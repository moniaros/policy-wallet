"use client"

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { Policy } from './types'
import { useLanguage } from '@/contexts/LanguageContext'

interface PolicyCardProps {
    policy: Policy
    onView?: () => void
    onShare?: () => void
    onAddToWallet?: () => void
    onViewDocuments?: () => void
    onRunAnalysis?: () => void
    onDelete?: () => void
    onViewHistory?: () => void
    id?: string
}

export function PolicyCard({
    policy,
    onView,
    onShare,
    onAddToWallet,
    onViewDocuments,
    onRunAnalysis,
    onDelete,
    onViewHistory,
    id
}: PolicyCardProps) {
    const [menuOpen, setMenuOpen] = useState(false)
    const [showInsights, setShowInsights] = useState(false)
    const [menuPosition, setMenuPosition] = useState<{ top: number, right: number } | null>(null)
    const { t, language } = useLanguage()

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat(language === 'el' ? 'el-GR' : 'en-US', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0
        }).format(amount)
    }

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

    const handleMenuOpen = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (menuOpen) {
            setMenuOpen(false)
            setMenuPosition(null)
        } else {
            const rect = e.currentTarget.getBoundingClientRect()
            setMenuPosition({
                top: rect.bottom + window.scrollY,
                right: window.innerWidth - rect.right
            })
            setMenuOpen(true)
        }
    }

    const closeMenu = () => {
        setMenuOpen(false)
        setMenuPosition(null)
    }

    // Close menu on scroll or resize
    useEffect(() => {
        const handleScroll = () => {
            if (menuOpen) {
                setMenuOpen(false)
                setMenuPosition(null)
            }
        }
        window.addEventListener('scroll', handleScroll, true)
        window.addEventListener('resize', handleScroll)
        return () => {
            window.removeEventListener('scroll', handleScroll, true)
            window.removeEventListener('resize', handleScroll)
        }
    }, [menuOpen])

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
            case 'analyzing':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-full">
                        <span className="w-2 h-2 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
                        {language === 'el' ? 'ΑΝΑΛΥΣΗ...' : 'ANALYZING...'}
                    </span>
                )
            default:
                return null
        }
    }

    // Get policy type icon and color
    const getPolicyVisuals = () => {
        const lob = policy.lineOfBusiness as string
        switch (lob) {
            case 'motor': return { icon: '🚗', color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' }
            case 'health': return { icon: '❤️', color: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400' }
            case 'home': return { icon: '🏠', color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' }
            case 'life': return { icon: '🛡️', color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' }
            case 'travel': return { icon: '✈️', color: 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400' }
            default: return { icon: '📄', color: 'bg-stone-50 text-stone-600 dark:bg-stone-800 dark:text-stone-400' }
        }
    }

    const visuals = getPolicyVisuals()

    return (
        <div
            id={id}
            onClick={onView}
            className="group relative bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl border border-stone-200/60 dark:border-stone-700/60 rounded-[2rem] p-6 lg:p-7 shadow-sm hover:shadow-2xl hover:shadow-teal-500/10 dark:hover:shadow-teal-400/5 hover:-translate-y-1.5 transition-all duration-500 cursor-pointer overflow-hidden active:scale-[0.98]"
        >
            {/* Glossy overlay effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent dark:from-white/5 pointer-events-none" />

            {/* Spotlight effect on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-[radial-gradient(circle_at_var(--mouse-x,50%)_var(--mouse-y,50%),rgba(20,184,166,0.06),transparent_70%)] transition-opacity duration-700 pointer-events-none" />

            {/* Status indicator line at top */}
            <div className={`absolute top-0 left-6 right-6 h-1 rounded-b-full ${policy.status === 'active' ? 'bg-teal-500' :
                policy.status === 'expiring_soon' ? 'bg-amber-500' :
                    policy.status === 'action_needed' ? 'bg-red-500' :
                        policy.status === 'analyzing' ? 'bg-blue-500 animate-pulse' :
                            'bg-stone-300 dark:bg-stone-600'
                }`} />

            {/* Verified Badge */}
            {policy.verified && (
                <div className="absolute top-4 left-6 flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 rounded-lg">
                    <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Verified by AI</span>
                </div>
            )}

            {/* Shared with collaborators indicator */}
            {policy.sharedWithAgents.length > 0 && (
                <div className="absolute top-4 right-4 group/tooltip cursor-pointer">
                    <div className="relative">
                        <div className="p-2.5 bg-gradient-to-br from-teal-500 to-blue-600 rounded-xl text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                            </svg>
                        </div>
                        {policy.sharedWithAgents.length > 1 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full border-2 border-white dark:border-stone-900 flex items-center justify-center">
                                <span className="text-[10px] font-black text-white">{policy.sharedWithAgents.length}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Policy info */}
            <div className="pr-10 sm:pr-12">
                {/* Header Section: Icon + Insurer + Insured Item */}
                <div className="flex items-start gap-4 mb-5 relative z-10">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform duration-500 ${policy.status === 'analyzing' ? 'bg-stone-100 dark:bg-stone-800' : visuals.color}`}>
                        {policy.status === 'analyzing' ? '🧠' : visuals.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <h3 className={`text-sm font-bold text-stone-500 uppercase tracking-widest ${policy.status === 'analyzing' ? 'animate-pulse opacity-70' : ''}`}>
                                {policy.insurerName}
                            </h3>
                            {policy.verified && (
                                <svg className="w-4 h-4 text-teal-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            )}
                        </div>

                        {/* Insured Item - Critical Fix #1 */}
                        {policy.insuredItem ? (
                            <div className="mt-1">
                                <h2 className="text-xl font-black text-stone-900 dark:text-white leading-tight">
                                    {policy.insuredItem.title}
                                </h2>
                                {policy.insuredItem.subtitle && (
                                    <p className="text-xs font-medium text-stone-400 mt-0.5 font-mono">
                                        {policy.insuredItem.subtitle}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <h2 className="text-xl font-black text-stone-900 dark:text-white leading-tight mt-1 capitalize">
                                {policy.lineOfBusiness} Policy
                            </h2>
                        )}

                    </div>
                </div>

                {/* Status and Expiry */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {getStatusBadge()}

                    {/* Renewal Countdown */}
                    {daysLeft !== null && daysLeft >= 0 && daysLeft <= 60 && (
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold uppercase tracking-wider ${daysLeft <= 7 ? 'text-red-500' : 'text-amber-600 dark:text-amber-400'}`}>
                                {daysLeft} Days Left
                            </span>
                            {daysLeft <= 30 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        // Trigger renewal
                                        alert("Renewal request sent to agent!")
                                    }}
                                    className="px-2 py-1 bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-[10px] font-black uppercase tracking-wider rounded-lg hover:bg-teal-600 dark:hover:bg-teal-400 transition-colors"
                                >
                                    Renew
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Expiry date - always visible on larger screens */}
                <div className="hidden sm:block mt-3 pt-3 border-t border-stone-100 dark:border-stone-700">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-stone-400 dark:text-stone-500">
                            {t.wallet.ends}: {formatDate(policy.endDate)}
                        </span>

                        {policy.aiInsights && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setShowInsights(!showInsights)
                                }}
                                className="flex items-center gap-1 text-xs font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                {showInsights ? 'Hide Insights' : t.dashboard.runAnalysis}
                            </button>
                        )}
                    </div>
                </div>

                {/* AI Insights Section (Expanded) */}
                {showInsights && policy.aiInsights && (
                    <div className="mt-4 p-4 bg-stone-50 dark:bg-stone-900/50 rounded-2xl border border-stone-100 dark:border-stone-700 animate-in slide-in-from-top-2">
                        {/* Exclusions */}
                        {policy.aiInsights.exclusions && policy.aiInsights.exclusions.length > 0 && (
                            <div className="mb-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">What's NOT Covered</h4>
                                <ul className="space-y-2">
                                    {policy.aiInsights.exclusions.map((exclusion, i) => (
                                        <li
                                            key={i}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                console.log("Opportunity Triggered: User viewed exclusion " + exclusion)
                                            }}
                                            className="flex items-start gap-2 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-white dark:hover:bg-stone-800 p-2 rounded-lg cursor-pointer transition-colors"
                                        >
                                            <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                            {exclusion}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Benchmark */}
                        {policy.aiInsights.premiumBenchmark && (
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">Premium Fairness</h4>
                                <div className="flex items-end gap-2">
                                    <div>
                                        <span className="text-xs text-stone-500">You Pay</span>
                                        <div className="text-lg font-black text-stone-900 dark:text-white">{formatCurrency(policy.aiInsights.premiumBenchmark.current)}</div>
                                    </div>
                                    <div className="mb-1 text-stone-300 dark:text-stone-600">vs</div>
                                    <div>
                                        <span className="text-xs text-stone-500">Local Avg</span>
                                        <div className="text-lg font-bold text-stone-500">{formatCurrency(policy.aiInsights.premiumBenchmark.localAverage)}</div>
                                    </div>
                                    {policy.aiInsights.premiumBenchmark.savingsPotential > 0 && (
                                        <div className="ml-auto bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-xl text-xs font-bold">
                                            Save {formatCurrency(policy.aiInsights.premiumBenchmark.savingsPotential)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Quick Actions - Mobile: Bottom row, Desktop: Keep Overflow menu */}
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
                    onClick={(e) => handleMenuOpen(e)}
                    className="flex items-center justify-center px-4 py-2 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-xl text-xs font-bold hover:bg-stone-800 dark:hover:bg-stone-100 transition-colors"
                >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                </button>
            </div>

            {/* Desktop: Overflow menu - Also used by mobile portal now */}
            <div className={`absolute bottom-6 right-6 ${menuOpen ? 'z-30' : 'z-20'}`}>
                {/* On Desktop we use the absolute positioned button */}
                <div className="relative hidden sm:block" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={(e) => handleMenuOpen(e)}
                        className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                    </button>
                </div>

                {menuOpen && typeof document !== 'undefined' && createPortal(
                    <>
                        <div
                            className="fixed inset-0 z-[9998]"
                            onClick={closeMenu}
                        />
                        <div
                            className="fixed z-[9999] w-64 bg-white dark:bg-stone-800 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-700 py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200 divide-y divide-stone-100 dark:divide-stone-700"
                            style={{
                                top: `${menuPosition?.top ?? 0}px`,
                                right: `${menuPosition?.right ?? 0}px`,
                                marginTop: '8px'
                            }}
                        >
                            {/* Understand */}
                            <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-stone-400">
                                {(t.dashboard as any).actionGroups?.understand || 'Understand'}
                            </div>
                            <button
                                onClick={() => {
                                    onRunAnalysis?.()
                                    closeMenu()
                                }}
                                className="w-full px-4 py-2 text-left text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors flex items-center gap-3"
                            >
                                <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                </div>
                                {t.dashboard.runAnalysis}
                            </button>
                            <button
                                onClick={() => {
                                    onViewDocuments?.()
                                    closeMenu()
                                }}
                                className="w-full px-4 py-2 text-left text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors flex items-center gap-3"
                            >
                                <div className="w-8 h-8 bg-amber-50 dark:bg-amber-900/30 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                                {t.wallet.documents}
                            </button>

                            {/* Act */}
                            <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-stone-400 mt-1">
                                {(t.dashboard as any).actionGroups?.act || 'Act'}
                            </div>
                            <button
                                onClick={() => {
                                    onShare?.()
                                    closeMenu()
                                }}
                                className="w-full px-4 py-2 text-left text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors flex items-center gap-3"
                            >
                                <div className="w-8 h-8 bg-teal-50 dark:bg-teal-900/30 rounded-lg flex items-center justify-center text-teal-600 dark:text-teal-400">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                </div>
                                {t.wallet.shareWithAgent}
                            </button>
                            <button
                                onClick={() => {
                                    onAddToWallet?.()
                                    closeMenu()
                                }}
                                className="w-full px-4 py-2 text-left text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors flex items-center gap-3"
                            >
                                <div className="w-8 h-8 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                </div>
                                Add to Wallet
                            </button>

                            {/* Review */}
                            <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-stone-400 mt-1">
                                {(t.dashboard as any).actionGroups?.review || 'Review'}
                            </div>
                            <button
                                onClick={() => {
                                    onViewHistory?.()
                                    closeMenu()
                                }}
                                className="w-full px-4 py-2 text-left text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors flex items-center gap-3"
                            >
                                <div className="w-8 h-8 bg-stone-100 dark:bg-stone-700 rounded-lg flex items-center justify-center text-stone-500 dark:text-stone-400">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                {t.dashboard.viewHistory}
                            </button>

                            {/* Danger */}
                            <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-300 mt-1">
                                {(t.dashboard as any).actionGroups?.danger || 'Danger Zone'}
                            </div>
                            <button
                                onClick={() => {
                                    onDelete?.()
                                    closeMenu()
                                }}
                                className="w-full px-4 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-3"
                            >
                                <div className="w-8 h-8 bg-red-50 dark:bg-red-900/30 rounded-lg flex items-center justify-center text-red-600 dark:text-red-400">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </div>
                                {t.dashboard.delete}
                            </button>
                        </div>
                    </>,
                    document.body
                )}
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
