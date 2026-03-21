"use client"

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { Policy } from './types'
import { useLanguage } from '@/contexts/LanguageContext'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { CarIcon, HeartIcon, HomeIcon, ShieldIcon, PlaneIcon, DocumentIcon } from '@/components/icons/PolicyIcons'

interface PolicyCardProps {
    policy: Policy
    onView?: () => void
    onShare?: () => void
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
    onViewDocuments,
    onRunAnalysis,
    onDelete,
    onViewHistory,
    id
}: PolicyCardProps) {
    const [menuOpen, setMenuOpen] = useState(false)
    const [showInsights, setShowInsights] = useState(false)
    const [menuPosition, setMenuPosition] = useState<{ top: number, left: number, origin: 'top right' | 'bottom right' } | null>(null)
    const { t, language } = useLanguage()
    const cardCopy = t.wallet.mobileCard

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
            const MENU_WIDTH = 256
            const MENU_HEIGHT = 360
            const VIEWPORT_PADDING = 12
            const GAP = 8
            const spaceBelow = window.innerHeight - rect.bottom
            const openUpward = spaceBelow < MENU_HEIGHT

            const top = openUpward
                ? Math.max(VIEWPORT_PADDING, rect.top - MENU_HEIGHT - GAP)
                : Math.min(window.innerHeight - MENU_HEIGHT - VIEWPORT_PADDING, rect.bottom + GAP)

            const left = Math.min(
                window.innerWidth - MENU_WIDTH - VIEWPORT_PADDING,
                Math.max(VIEWPORT_PADDING, rect.right - MENU_WIDTH)
            )

            setMenuPosition({
                top,
                left,
                origin: openUpward ? 'bottom right' : 'top right'
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

    useEffect(() => {
        if (!menuOpen) return
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeMenu()
            }
        }
        window.addEventListener('keydown', closeOnEscape)
        return () => window.removeEventListener('keydown', closeOnEscape)
    }, [menuOpen])

    // Status badge styling
    const getStatusBadge = () => {
        switch (policy.status) {
            case 'active':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-[#1FDC86]/15 dark:bg-[#1FDC86]/15 text-[#19b870] dark:text-[#7de8ba] border border-[#1FDC86]/35 dark:border-[#1FDC86]/35 rounded-full">
                        <span className="w-1.5 h-1.5 bg-[#1FDC86] rounded-full animate-pulse"></span>
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
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-black/5 dark:bg-black text-black/70 dark:text-white/60 border border-black/10 dark:border-white/15 rounded-full">
                        <span className="w-1.5 h-1.5 bg-black/35 dark:bg-white/35 rounded-full"></span>
                        {t.policyStatus.incomplete}
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
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-black/5 dark:bg-white/10 text-black/80 dark:text-white/75 border border-black/15 dark:border-white/20 rounded-full">
                        <span className="w-2 h-2 border-2 border-[#1FDC86] border-t-transparent rounded-full animate-spin"></span>
                        {t.policyStatus.analyzing}
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
            case 'motor': return { Icon: CarIcon, color: 'bg-[#000000] dark:bg-black text-white' }
            case 'health': return { Icon: HeartIcon, color: 'bg-[#000000] dark:bg-black text-white' }
            case 'home': return { Icon: HomeIcon, color: 'bg-[#000000] dark:bg-black text-white' }
            case 'life': return { Icon: ShieldIcon, color: 'bg-[#000000] dark:bg-black text-white' }
            case 'travel': return { Icon: PlaneIcon, color: 'bg-[#000000] dark:bg-black text-white' }
            default: return { Icon: DocumentIcon, color: 'bg-[#000000] dark:bg-black text-white' }
        }
    }

    const visuals = getPolicyVisuals()
    const VisualIcon = visuals.Icon

    return (
        <div
            id={id}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onView?.()
                }
            }}
            onClick={onView}
            className="group relative bg-[#FFFFFF] dark:bg-[#111111] border border-black/10 dark:border-white/15 rounded-[2rem] p-6 lg:p-7 shadow-[0_2px_12px_rgb(0,0,0,0.02)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden arc-card outline-none focus-visible:ring-2 focus-visible:ring-[#1FDC86]"
        >
            {/* Glossy overlay effect */}
            {/* Status indicator line at top */}
            <div className={`absolute top-0 left-6 right-6 h-1 rounded-b-full ${policy.status === 'active' ? 'bg-[#1FDC86]' :
                policy.status === 'expiring_soon' ? 'bg-amber-500' :
                    policy.status === 'action_needed' ? 'bg-red-500' :
                        policy.status === 'analyzing' ? 'bg-black/50 animate-pulse' :
                            'bg-black/20 dark:bg-white/20'
                }`} />

            {/* Verified Badge */}
            {policy.verified && (
                <div className="absolute top-4 left-6 flex items-center gap-1.5 px-2 py-1 bg-[#1FDC86]/12 dark:bg-[#1FDC86]/15 border border-[#1FDC86]/30 dark:border-[#1FDC86]/35 rounded-lg">
                    <svg className="w-3 h-3 text-[#1FDC86] dark:text-[#1FDC86]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#19b870] dark:text-[#7de8ba]">{cardCopy.verifiedByAi}</span>
                </div>
            )}

            {/* Shared with collaborators indicator */}
            {policy.sharedWithAgents.length > 0 && (
                <div className="absolute top-4 right-4 group/tooltip cursor-pointer">
                    <div className="relative">
                        <div className="p-2.5 bg-[#1FDC86] rounded-xl text-black shadow-lg hover:-translate-y-[1px] transition-all duration-200">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                            </svg>
                        </div>
                        {policy.sharedWithAgents.length > 1 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#000000] rounded-full border-2 border-white dark:border-white/15 flex items-center justify-center">
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
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform duration-500 ${policy.status === 'analyzing' ? 'bg-black/5 dark:bg-black' : visuals.color}`}>
                        {policy.status === 'analyzing' ? <Sparkles className='w-7 h-7 animate-pulse' /> : <VisualIcon className='w-8 h-8' />}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <h3 className={`text-sm font-bold text-black/60 uppercase tracking-widest ${policy.status === 'analyzing' ? 'animate-pulse opacity-70' : ''}`}>
                                {policy.insurerName}
                            </h3>
                            {policy.verified && (
                                <svg className="w-4 h-4 text-[#1FDC86] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            )}
                        </div>

                        {/* Insured Item - Critical Fix #1 */}
                        {policy.insuredItem ? (
                            <div className="mt-1">
                                <h2 className="text-xl font-black text-black dark:text-white leading-tight">
                                    {policy.insuredItem.title}
                                </h2>
                                {policy.insuredItem.subtitle && (
                                    <p className="text-xs font-medium text-black/45 mt-0.5 font-mono">
                                        {policy.insuredItem.subtitle}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <h2 className="text-xl font-black text-black dark:text-white leading-tight mt-1 capitalize">
                                {`${t.policyTypes?.[policy.lineOfBusiness as keyof typeof t.policyTypes] || policy.lineOfBusiness} ${cardCopy.policyWord}`}
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
                                {daysLeft} {cardCopy.daysLeft}
                            </span>
                            {daysLeft <= 30 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        toast.success(t.wallet.policyDetailsPage.renewalRequested)
                                    }}
                                    className="px-2 py-1 bg-[#111111] dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-wider rounded-lg hover:-translate-y-[1px] hover:shadow-sm transition-all arc-btn"
                                >
                                    {cardCopy.renew}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Expiry date - always visible on larger screens */}
                <div className="hidden sm:block mt-3 pt-3 border-t border-black/10 dark:border-white/15">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-black/45 dark:text-white/70">
                            {t.wallet.ends}: {formatDate(policy.endDate)}
                        </span>

                        {policy.aiInsights && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setShowInsights(!showInsights)
                                }}
                                className="flex items-center gap-1 text-xs font-bold text-[#1FDC86] dark:text-[#1FDC86] hover:text-[#19b870]"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                {showInsights ? cardCopy.hideInsights : t.dashboard.runAnalysis}
                            </button>
                        )}
                    </div>
                </div>

                {/* AI Insights Section (Expanded) */}
                {showInsights && policy.aiInsights && (
                    <div className="mt-4 p-4 bg-black/5 dark:bg-black/50 rounded-2xl border border-black/10 dark:border-white/15 animate-in slide-in-from-top-2">
                        {/* Exclusions */}
                        {policy.aiInsights.exclusions && policy.aiInsights.exclusions.length > 0 && (
                            <div className="mb-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-black/45 mb-2">{t.policyCard.whatsNotCovered}</h4>
                                <ul className="space-y-2">
                                    {policy.aiInsights.exclusions.map((exclusion, i) => (
                                        <li
                                            key={i}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                console.log("Opportunity Triggered: User viewed exclusion " + exclusion)
                                            }}
                                            className="flex items-start gap-2 text-xs font-medium text-black/70 dark:text-white/70 hover:bg-white dark:hover:bg-black/80 p-2 rounded-lg cursor-pointer transition-colors"
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
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-black/45 mb-2">{t.policyCard.premiumFairness}</h4>
                                <div className="flex items-end gap-2">
                                    <div>
                                        <span className="text-xs text-black/60">{t.policyCard.youPay}</span>
                                        <div className="text-lg font-black text-black dark:text-white">{formatCurrency(policy.aiInsights.premiumBenchmark.current)}</div>
                                    </div>
                                    <div className="mb-1 text-black/35 dark:text-white/75">/</div>
                                    <div>
                                        <span className="text-xs text-black/60">{t.policyCard.localAvg}</span>
                                        <div className="text-lg font-bold text-black/60">{formatCurrency(policy.aiInsights.premiumBenchmark.localAverage)}</div>
                                    </div>
                                    {policy.aiInsights.premiumBenchmark.savingsPotential > 0 && (
                                        <div className="ml-auto bg-[#1FDC86]/15 dark:bg-[#1FDC86]/15 text-[#19b870] dark:text-[#1FDC86] px-3 py-1 rounded-xl text-xs font-bold">
                                            {t.policyCard.save} {formatCurrency(policy.aiInsights.premiumBenchmark.savingsPotential)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Quick Actions - Mobile: Bottom row, Desktop: Keep Overflow menu */}
            <div className="sm:hidden mt-4 pt-3 border-t border-black/10 dark:border-white/15 flex items-center gap-2">
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onShare?.()
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#FFFFFF] dark:bg-[#111111] text-black dark:text-white border border-black/10 dark:border-white/15 rounded-xl text-xs font-bold hover:bg-black/5 dark:hover:bg-black/80 transition-colors arc-btn"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    {t.wallet.share}
                </button>
                <button
                    onClick={(e) => handleMenuOpen(e)}
                    className="flex items-center justify-center px-4 py-2 bg-[#111111] dark:bg-white text-white dark:text-[#111111] rounded-xl text-xs font-bold hover:shadow-md transition-all arc-btn"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    aria-controls={menuOpen ? `policy-card-menu-${policy.id}` : undefined}
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
                        className="p-2 rounded-xl text-black/45 dark:text-white/60 bg-white dark:bg-[#111111] hover:bg-black/5 dark:hover:bg-black/80 border border-black/10 dark:border-white/15 hover:text-black/70 dark:hover:text-white/85 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1FDC86]/40 arc-btn"
                        aria-haspopup="menu"
                        aria-expanded={menuOpen}
                        aria-controls={menuOpen ? `policy-card-menu-${policy.id}` : undefined}
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                    </button>
                </div>

                {menuOpen && typeof document !== 'undefined' && createPortal(
                    <>
                        <div
                            className="fixed inset-0 z-[9998] bg-black/5 dark:bg-black/20 backdrop-blur-[1px]"
                            onClick={closeMenu}
                        />
                        <div
                            id={`policy-card-menu-${policy.id}`}
                            role="menu"
                            className="fixed z-[9999] w-64 bg-white dark:bg-black rounded-2xl shadow-xl border border-black/10 dark:border-white/15 py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-150 divide-y divide-black/10 dark:divide-white/15"
                            style={{
                                top: `${menuPosition?.top ?? 0}px`,
                                left: `${menuPosition?.left ?? 0}px`,
                                transformOrigin: menuPosition?.origin ?? 'top right',
                            }}
                        >
                            {/* Understand */}
                            <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-black/45">
                                {t.dashboard.actionGroups.understand}
                            </div>
                            <button
                                onClick={() => {
                                    onRunAnalysis?.()
                                    closeMenu()
                                }}
                                role="menuitem"
                                className="w-full px-4 py-2 text-left text-sm font-medium text-black/80 dark:text-white/85 hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:bg-black/5 dark:focus-visible:bg-white/10 transition-colors flex items-center gap-3"
                            >
                                <div className="w-8 h-8 bg-black/5 dark:bg-white/10 rounded-lg flex items-center justify-center text-black/75 dark:text-white/75">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                </div>
                                {t.dashboard.runAnalysis}
                            </button>
                            <button
                                onClick={() => {
                                    onViewDocuments?.()
                                    closeMenu()
                                }}
                                role="menuitem"
                                className="w-full px-4 py-2 text-left text-sm font-medium text-black/80 dark:text-white/85 hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:bg-black/5 dark:focus-visible:bg-white/10 transition-colors flex items-center gap-3"
                            >
                                <div className="w-8 h-8 bg-amber-50 dark:bg-amber-900/30 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                                {t.wallet.documents}
                            </button>

                            {/* Act */}
                            <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-black/45 mt-1">
                                {t.dashboard.actionGroups.act}
                            </div>
                            <button
                                onClick={() => {
                                    onShare?.()
                                    closeMenu()
                                }}
                                role="menuitem"
                                className="w-full px-4 py-2 text-left text-sm font-medium text-black/80 dark:text-white/85 hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:bg-black/5 dark:focus-visible:bg-white/10 transition-colors flex items-center gap-3"
                            >
                                <div className="w-8 h-8 bg-[#1FDC86]/12 dark:bg-[#1FDC86]/15 rounded-lg flex items-center justify-center text-[#1FDC86] dark:text-[#1FDC86]">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                </div>
                                {t.wallet.shareWithAgent}
                            </button>

                            {/* Review */}
                            <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-black/45 mt-1">
                                {t.dashboard.actionGroups.review}
                            </div>
                            <button
                                onClick={() => {
                                    onViewHistory?.()
                                    closeMenu()
                                }}
                                role="menuitem"
                                className="w-full px-4 py-2 text-left text-sm font-medium text-black/80 dark:text-white/85 hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:bg-black/5 dark:focus-visible:bg-white/10 transition-colors flex items-center gap-3"
                            >
                                <div className="w-8 h-8 bg-black/5 dark:bg-white/15 rounded-lg flex items-center justify-center text-black/60 dark:text-white/60">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                {t.dashboard.viewHistory}
                            </button>

                            {/* Danger */}
                            <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-300 mt-1">
                                {t.dashboard.actionGroups.danger}
                            </div>
                            <button
                                onClick={() => {
                                    onDelete?.()
                                    closeMenu()
                                }}
                                role="menuitem"
                                className="w-full px-4 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 focus-visible:outline-none focus-visible:bg-red-50 dark:focus-visible:bg-red-900/20 transition-colors flex items-center gap-3"
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
                <svg className="w-5 h-5 text-black/85 dark:text-white/85" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
            </div>
        </div>
    )
}








