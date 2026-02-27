"use client"

import { AlertCircle, CheckCircle2, Clock3, MoreVertical, RefreshCw, Search, ShieldAlert, ShieldCheck, Trash2, Share2, FileText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import type { Policy } from './types'
import { useLanguage } from '@/contexts/LanguageContext'
import { getDocumentPolicySummary } from '@/lib/wallet/document-insights'
import {
    CarIcon,
    HeartIcon,
    HomeIcon,
    ShieldIcon,
    PlaneIcon,
    ScaleIcon,
    PawIcon,
    BriefcaseIcon,
    DocumentIcon,
} from '@/components/icons/PolicyIcons'

interface PolicyTableProps {
    policies: Policy[]
    onViewPolicy?: (policyId: string) => void
    onRenewPolicy?: (policyId: string) => void
    onViewHistory?: (policyId: string) => void
    onRunAnalysis?: (policyId: string) => void
    onDelete?: (policyId: string) => void
    onShare?: (policyId: string) => void
    onAddToWallet?: (policyId: string) => void
    onViewDocuments?: (policyId: string) => void
}

const POLICY_VISUALS: Record<string, { icon: any; badge: string; iconColor: string }> = {
    motor: { icon: CarIcon, badge: 'bg-[#000000] dark:bg-black', iconColor: 'text-white' },
    health: { icon: HeartIcon, badge: 'bg-[#000000] dark:bg-black', iconColor: 'text-white' },
    home: { icon: HomeIcon, badge: 'bg-[#000000] dark:bg-black', iconColor: 'text-white' },
    life: { icon: ShieldIcon, badge: 'bg-[#000000] dark:bg-black', iconColor: 'text-white' },
    travel: { icon: PlaneIcon, badge: 'bg-[#000000] dark:bg-black', iconColor: 'text-white' },
    liability: { icon: ScaleIcon, badge: 'bg-[#000000] dark:bg-black', iconColor: 'text-white' },
    pet: { icon: PawIcon, badge: 'bg-[#000000] dark:bg-black', iconColor: 'text-white' },
    professional: { icon: BriefcaseIcon, badge: 'bg-[#000000] dark:bg-black', iconColor: 'text-white' },
    other: { icon: DocumentIcon, badge: 'bg-[#000000] dark:bg-black', iconColor: 'text-white' },
}

export function PolicyTable({
    policies,
    onViewPolicy,
    onRenewPolicy,
    onRunAnalysis,
    onDelete,
    onShare,
    onViewDocuments,
}: PolicyTableProps) {
    const { language, t } = useLanguage()
    const [currentPage, setCurrentPage] = useState(1)
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; origin: 'top right' | 'bottom right' } | null>(null)
    const policiesPerPage = 6

    const totalPages = Math.max(1, Math.ceil(policies.length / policiesPerPage))
    const startIndex = (currentPage - 1) * policiesPerPage
    const currentPolicies = policies.slice(startIndex, startIndex + policiesPerPage)

    useEffect(() => {
        const closeMenu = () => {
            setOpenMenuId(null)
            setMenuPosition(null)
        }
        window.addEventListener('scroll', closeMenu, true)
        window.addEventListener('resize', closeMenu)
        return () => {
            window.removeEventListener('scroll', closeMenu, true)
            window.removeEventListener('resize', closeMenu)
        }
    }, [])

    useEffect(() => {
        if (!openMenuId) return
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpenMenuId(null)
                setMenuPosition(null)
            }
        }
        window.addEventListener('keydown', closeOnEscape)
        return () => window.removeEventListener('keydown', closeOnEscape)
    }, [openMenuId])

    const label = {
        cancelled: t.policyStatus?.cancelled || (language === 'el' ? 'Ακυρωμένο' : 'Cancelled'),
        expired: t.policyStatus?.expired || (language === 'el' ? 'Έληξε' : 'EXPIRED'),
        analyzing: t.dashboard.statusLabels.analyzing,
        actionNeeded: language === 'el' ? 'Απαιτείται ενέργεια' : 'MISSING INFO',
        active: t.policyStatus?.active || (language === 'el' ? 'Ενεργό' : 'ACTIVE'),
        renewalPending: language === 'el' ? 'Απαιτείται ανανέωση' : 'RENEWAL NEEDED',
        unverified: language === 'el' ? 'Μη επαληθευμένο' : 'Unverified',
        noIssues: language === 'el' ? 'Χωρίς θέματα' : 'No issues',
        understandPolicy: t.dashboard.runAnalysis || (language === 'el' ? 'Κατανόηση συμβολαίου' : 'Understand policy'),
        expiresOn: language === 'el' ? 'Λήξη' : 'Expiry',
        premium: language === 'el' ? 'Ασφάλιστρο' : 'Premium',
        assetFallback: language === 'el' ? 'Ασφαλισμένο αντικείμενο' : 'Insured asset',
    }

    const getStatusBadge = (policy: Policy) => {
        const typeLabel = t.policyTypes[policy.lineOfBusiness as keyof typeof t.policyTypes] || policy.lineOfBusiness
        const summary = getDocumentPolicySummary(policy, language === 'el' ? 'el' : 'en', typeLabel)
        if (policy.status === 'analyzing') {
            return {
                text: label.analyzing,
                className: 'bg-black/5 dark:bg-white/10 text-black/80 dark:text-white/75',
                icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
                message: summary.status.message,
            }
        }

        const styleByTone: Record<string, string> = {
            critical: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
            warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
            active: 'bg-[#1FDC86]/15 dark:bg-[#1FDC86]/15 text-[#19b870] dark:text-[#7de8ba]',
            inactive: 'bg-black/10 dark:bg-white/15 text-black/80 dark:text-white/85',
            info: 'bg-black/5 dark:bg-black/30 text-black/80 dark:text-white/70',
        }

        const iconByTone: Record<string, ReactNode> = {
            critical: <AlertCircle className="w-3.5 h-3.5" />,
            warning: <AlertCircle className="w-3.5 h-3.5" />,
            active: <ShieldCheck className="w-3.5 h-3.5" />,
            inactive: <ShieldAlert className="w-3.5 h-3.5" />,
            info: <Clock3 className="w-3.5 h-3.5" />,
        }

        return {
            text: summary.status.label,
            className: styleByTone[summary.status.tone] || styleByTone.active,
            icon: iconByTone[summary.status.tone] || iconByTone.active,
            message: summary.status.message,
        }
    }

    const getInsightBadge = (policy: Policy) => {
        if (policy.status === 'expiring_soon') {
            return { text: label.renewalPending, className: 'text-amber-600 dark:text-amber-400', icon: <Clock3 className="w-3.5 h-3.5" /> }
        }
        if (!policy.verified) {
            return { text: label.unverified, className: 'text-black/60 dark:text-white/60', icon: <ShieldAlert className="w-3.5 h-3.5" /> }
        }
        return { text: label.noIssues, className: 'text-[#1FDC86] dark:text-[#1FDC86]', icon: <CheckCircle2 className="w-3.5 h-3.5" /> }
    }

    return (
        <div className="bg-[#FFFFFF] dark:bg-[#111111] rounded-[2rem] shadow-[0_2px_12px_rgb(0,0,0,0.02)] border border-black/10 dark:border-white/15 overflow-hidden arc-card">
            <div className="px-6 py-5 border-b border-black/10 dark:border-white/15">
                <h2 className="text-xl font-bold text-black dark:text-white">{t.dashboard.myPolicies}</h2>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[720px]">
                    <thead>
                        <tr className="bg-black/5 dark:bg-black border-b border-black/10 dark:border-white/15">
                            <th className="px-6 py-4 text-left text-sm font-semibold text-black/80 dark:text-white/70">{(t.dashboard as any).insuredItem || 'Insured Item'}</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-black/80 dark:text-white/70">{t.dashboard.insurer}</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-black/80 dark:text-white/70">{t.dashboard.status}</th>
                            <th className="px-6 py-4 text-right text-sm font-semibold text-black/80 dark:text-white/70">{t.dashboard.actions}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black/10 dark:divide-white/10">
                        {currentPolicies.map((policy) => {
                            const statusBadge = getStatusBadge(policy)
                            const insightBadge = getInsightBadge(policy)
                            const isMenuOpen = openMenuId === policy.id
                            const visual = POLICY_VISUALS[policy.lineOfBusiness] || POLICY_VISUALS.other
                            const Icon = visual.icon
                            const typeLabel = t.policyTypes[policy.lineOfBusiness as keyof typeof t.policyTypes] || policy.lineOfBusiness
                            const summary = getDocumentPolicySummary(policy, language === 'el' ? 'el' : 'en', typeLabel)

                            return (
                                <tr key={policy.id} onClick={() => onViewPolicy?.(policy.id)} className="hover:bg-black/5 dark:hover:bg-black/80 transition-colors group cursor-pointer">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-11 h-11 rounded-xl ${visual.badge} flex items-center justify-center`}>
                                                <Icon className={`w-6 h-6 ${visual.iconColor}`} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-bold text-black dark:text-white text-sm truncate">{summary.assetTitle}</div>
                                                {summary.assetSubtitle ? <div className="text-xs text-black/60 dark:text-white/60 font-mono mt-0.5 truncate">{summary.assetSubtitle}</div> : null}
                                                <div className="text-xs text-black/60 dark:text-white/60 mt-0.5 truncate">
                                                    {summary.insurerLine}
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="font-semibold text-black dark:text-white text-sm">{policy.insurerName}</div>
                                            <div className="text-xs text-black/60 dark:text-white/60 font-mono mt-0.5">{policy.policyNumber}</div>
                                        </div>
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="flex flex-col items-start gap-1.5">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${statusBadge.className}`}>
                                                {statusBadge.icon}
                                                {statusBadge.text}
                                            </span>
                                            <div className="text-xs text-black/70 dark:text-white/60">
                                                {label.expiresOn}: <span className="font-semibold">{summary.expiryDisplay}</span>
                                            </div>
                                            <div className="text-xs text-black/70 dark:text-white/60">
                                                {label.premium}: <span className="font-semibold">{summary.premiumDisplay}</span>
                                            </div>
                                            <div className="text-xs text-black/70 dark:text-white/60">
                                                <span className="font-medium">{statusBadge.message}</span>
                                            </div>
                                            <div className={`inline-flex items-center gap-1.5 text-xs font-medium ${insightBadge.className} px-1`}>
                                                {insightBadge.icon}
                                                {insightBadge.text}
                                            </div>
                                        </div>
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => onViewPolicy?.(policy.id)}
                                                className="arc-btn arc-btn-primary px-4 py-2 text-sm font-bold cursor-pointer"
                                            >
                                                {t.dashboard.viewDetails}
                                            </button>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    const rect = e.currentTarget.getBoundingClientRect()
                                                    const MENU_WIDTH = 256
                                                    const MENU_HEIGHT = 272
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
                                                        origin: openUpward ? 'bottom right' : 'top right',
                                                    })
                                                    if (isMenuOpen) {
                                                        setOpenMenuId(null)
                                                        setMenuPosition(null)
                                                    } else {
                                                        setOpenMenuId(policy.id)
                                                    }
                                                }}
                                                className={`p-2.5 rounded-lg transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1FDC86]/40 ${isMenuOpen ? 'bg-black/5 dark:bg-black text-black dark:text-white shadow-sm' : 'hover:bg-black/5 dark:hover:bg-black/80 text-black/70 dark:text-white/70'}`}
                                                aria-label={t.dashboard.actions}
                                                aria-expanded={isMenuOpen}
                                                aria-haspopup="menu"
                                                aria-controls={isMenuOpen ? `policy-actions-menu-${policy.id}` : undefined}
                                            >
                                                <MoreVertical className="w-5 h-5 text-black/70 dark:text-white/70" />
                                            </button>

                                            {isMenuOpen && typeof document !== 'undefined' && createPortal(
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-[9998] bg-black/5 dark:bg-black/20 backdrop-blur-[1px]"
                                                        onClick={() => {
                                                            setOpenMenuId(null)
                                                            setMenuPosition(null)
                                                        }}
                                                    />
                                                    <div
                                                        id={`policy-actions-menu-${policy.id}`}
                                                        role="menu"
                                                        className="fixed z-[9999] w-64 bg-white dark:bg-black rounded-2xl shadow-2xl border border-black/10 dark:border-white/15 py-2 animate-in fade-in zoom-in-95 duration-150"
                                                        style={{
                                                            top: `${menuPosition?.top ?? 0}px`,
                                                            left: `${menuPosition?.left ?? 0}px`,
                                                            transformOrigin: menuPosition?.origin ?? 'top right',
                                                        }}
                                                    >
                                                        <button
                                                            onClick={() => {
                                                                onRunAnalysis?.(policy.id)
                                                                setOpenMenuId(null)
                                                            }}
                                                            role="menuitem"
                                                            className="w-full px-4 py-2.5 text-left text-sm font-medium text-black/80 dark:text-white/85 hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:bg-black/5 dark:focus-visible:bg-white/10 flex items-center gap-3 transition-colors"
                                                        >
                                                            <Search className="w-4 h-4" />
                                                            {label.understandPolicy}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                onViewDocuments?.(policy.id)
                                                                setOpenMenuId(null)
                                                            }}
                                                            role="menuitem"
                                                            className="w-full px-4 py-2.5 text-left text-sm font-medium text-black/80 dark:text-white/85 hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:bg-black/5 dark:focus-visible:bg-white/10 flex items-center gap-3 transition-colors"
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                            {t.wallet.documents}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                onShare?.(policy.id)
                                                                setOpenMenuId(null)
                                                            }}
                                                            role="menuitem"
                                                            className="w-full px-4 py-2.5 text-left text-sm font-medium text-black/80 dark:text-white/85 hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:bg-black/5 dark:focus-visible:bg-white/10 flex items-center gap-3 transition-colors"
                                                        >
                                                            <Share2 className="w-4 h-4" />
                                                            {t.wallet.shareWithAgent}
                                                        </button>
                                                        {policy.status === 'expiring_soon' && (
                                                            <button
                                                                onClick={() => {
                                                                    onRenewPolicy?.(policy.id)
                                                                    setOpenMenuId(null)
                                                                }}
                                                                role="menuitem"
                                                                className="w-full px-4 py-2.5 text-left text-sm font-medium text-black/80 dark:text-white/85 hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:bg-black/5 dark:focus-visible:bg-white/10 flex items-center gap-3 transition-colors"
                                                            >
                                                                <RefreshCw className="w-4 h-4" />
                                                                {t.dashboard.renewPolicy}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                onDelete?.(policy.id)
                                                                setOpenMenuId(null)
                                                            }}
                                                            role="menuitem"
                                                            className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 focus-visible:outline-none focus-visible:bg-red-50 dark:focus-visible:bg-red-900/10 flex items-center gap-3 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                            {t.dashboard.delete}
                                                        </button>
                                                    </div>
                                                </>,
                                                document.body
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {currentPolicies.length === 0 && (
                <div className="px-6 py-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-black/5 dark:bg-black rounded-full flex items-center justify-center">
                        <AlertCircle className="w-8 h-8 text-black/45 dark:text-white/55" />
                    </div>
                    <h3 className="text-lg font-semibold text-black dark:text-white mb-2">{t.dashboard.noPolicies}</h3>
                    <p className="text-black/70 dark:text-white/60">{t.dashboard.addFirstPolicy}</p>
                </div>
            )}

            {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-black/10 dark:border-white/15 flex items-center justify-between">
                    <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 text-sm font-medium text-black/80 dark:text-white/70 bg-white dark:bg-[#111111] border border-black/10 dark:border-white/15 rounded-lg hover:bg-black/5 dark:hover:bg-black/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                        {t.dashboard.previous}
                    </button>

                    <div className="flex items-center gap-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors cursor-pointer ${currentPage === page
                                    ? 'bg-[#1FDC86] text-white'
                                    : 'bg-white dark:bg-[#111111] text-black/80 dark:text-white/70 border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-black/80'
                                    }`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 text-sm font-medium text-black/80 dark:text-white/70 bg-white dark:bg-[#111111] border border-black/10 dark:border-white/15 rounded-lg hover:bg-black/5 dark:hover:bg-black/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                        {t.dashboard.next}
                    </button>
                </div>
            )}
        </div>
    )
}





