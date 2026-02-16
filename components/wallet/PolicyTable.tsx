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
    motor: { icon: CarIcon, badge: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-700 dark:text-amber-300' },
    health: { icon: HeartIcon, badge: 'bg-cyan-100 dark:bg-cyan-900/30', iconColor: 'text-cyan-700 dark:text-cyan-300' },
    home: { icon: HomeIcon, badge: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-700 dark:text-emerald-300' },
    life: { icon: ShieldIcon, badge: 'bg-violet-100 dark:bg-violet-900/30', iconColor: 'text-violet-700 dark:text-violet-300' },
    travel: { icon: PlaneIcon, badge: 'bg-indigo-100 dark:bg-indigo-900/30', iconColor: 'text-indigo-700 dark:text-indigo-300' },
    liability: { icon: ScaleIcon, badge: 'bg-slate-100 dark:bg-slate-800', iconColor: 'text-slate-700 dark:text-slate-300' },
    pet: { icon: PawIcon, badge: 'bg-orange-100 dark:bg-orange-900/30', iconColor: 'text-orange-700 dark:text-orange-300' },
    professional: { icon: BriefcaseIcon, badge: 'bg-stone-100 dark:bg-stone-800', iconColor: 'text-stone-700 dark:text-stone-300' },
    other: { icon: DocumentIcon, badge: 'bg-stone-100 dark:bg-stone-800', iconColor: 'text-stone-700 dark:text-stone-300' },
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
        cancelled: language === 'el' ? 'Ακυρωμένο' : 'Cancelled',
        expired: language === 'el' ? 'ΛΗΞΕ' : 'EXPIRED',
        analyzing: t.dashboard.statusLabels.analyzing,
        actionNeeded: language === 'el' ? 'ΛΕΙΠΟΥΝ ΣΤΟΙΧΕΙΑ' : 'MISSING INFO',
        active: language === 'el' ? 'ΕΝΕΡΓΟ' : 'ACTIVE',
        renewalPending: language === 'el' ? 'ΧΡΕΙΑΖΕΤΑΙ ΑΝΑΝΕΩΣΗ' : 'RENEWAL NEEDED',
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
                className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
                icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
                message: summary.status.message,
            }
        }

        const styleByTone: Record<string, string> = {
            critical: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
            warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
            active: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
            inactive: 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200',
            info: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300',
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
            return { text: label.unverified, className: 'text-stone-500 dark:text-stone-400', icon: <ShieldAlert className="w-3.5 h-3.5" /> }
        }
        return { text: label.noIssues, className: 'text-teal-600 dark:text-teal-400', icon: <CheckCircle2 className="w-3.5 h-3.5" /> }
    }

    return (
        <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden">
            <div className="px-6 py-5 border-b border-stone-200 dark:border-stone-800">
                <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">{t.dashboard.myPolicies}</h2>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[720px]">
                    <thead>
                        <tr className="bg-stone-50 dark:bg-stone-800/40 border-b border-stone-200 dark:border-stone-800">
                            <th className="px-6 py-4 text-left text-sm font-semibold text-stone-700 dark:text-stone-300">{(t.dashboard as any).insuredItem || 'Insured Item'}</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-stone-700 dark:text-stone-300">{t.dashboard.insurer}</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-stone-700 dark:text-stone-300">{t.dashboard.status}</th>
                            <th className="px-6 py-4 text-right text-sm font-semibold text-stone-700 dark:text-stone-300">{t.dashboard.actions}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                        {currentPolicies.map((policy) => {
                            const statusBadge = getStatusBadge(policy)
                            const insightBadge = getInsightBadge(policy)
                            const isMenuOpen = openMenuId === policy.id
                            const visual = POLICY_VISUALS[policy.lineOfBusiness] || POLICY_VISUALS.other
                            const Icon = visual.icon
                            const typeLabel = t.policyTypes[policy.lineOfBusiness as keyof typeof t.policyTypes] || policy.lineOfBusiness
                            const summary = getDocumentPolicySummary(policy, language === 'el' ? 'el' : 'en', typeLabel)

                            return (
                                <tr key={policy.id} onClick={() => onViewPolicy?.(policy.id)} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors group cursor-pointer">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-11 h-11 rounded-xl ${visual.badge} flex items-center justify-center`}>
                                                <Icon className={`w-6 h-6 ${visual.iconColor}`} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-bold text-stone-900 dark:text-white text-sm truncate">{summary.assetTitle}</div>
                                                {summary.assetSubtitle ? <div className="text-xs text-stone-500 font-mono mt-0.5 truncate">{summary.assetSubtitle}</div> : null}
                                                <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                                                    {summary.insurerLine}
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="font-semibold text-stone-900 dark:text-white text-sm">{policy.insurerName}</div>
                                            <div className="text-xs text-stone-500 font-mono mt-0.5">{policy.policyNumber}</div>
                                        </div>
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="flex flex-col items-start gap-1.5">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${statusBadge.className}`}>
                                                {statusBadge.icon}
                                                {statusBadge.text}
                                            </span>
                                            <div className="text-xs text-stone-600 dark:text-stone-400">
                                                {label.expiresOn}: <span className="font-semibold">{summary.expiryDisplay}</span>
                                            </div>
                                            <div className="text-xs text-stone-600 dark:text-stone-400">
                                                {label.premium}: <span className="font-semibold">{summary.premiumDisplay}</span>
                                            </div>
                                            <div className="text-xs text-stone-600 dark:text-stone-400">
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
                                                className="px-4 py-2 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-sm font-medium rounded-lg transition-colors cursor-pointer"
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
                                                className={`p-2.5 rounded-lg transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 ${isMenuOpen ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-white shadow-sm' : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300'}`}
                                                aria-label={t.dashboard.actions}
                                                aria-expanded={isMenuOpen}
                                                aria-haspopup="menu"
                                                aria-controls={isMenuOpen ? `policy-actions-menu-${policy.id}` : undefined}
                                            >
                                                <MoreVertical className="w-5 h-5 text-stone-600 dark:text-stone-300" />
                                            </button>

                                            {isMenuOpen && typeof document !== 'undefined' && createPortal(
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-[9998] bg-stone-900/5 dark:bg-stone-950/20 backdrop-blur-[1px]"
                                                        onClick={() => {
                                                            setOpenMenuId(null)
                                                            setMenuPosition(null)
                                                        }}
                                                    />
                                                    <div
                                                        id={`policy-actions-menu-${policy.id}`}
                                                        role="menu"
                                                        className="fixed z-[9999] w-64 bg-white dark:bg-stone-800 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-700 py-2 animate-in fade-in zoom-in-95 duration-150"
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
                                                            className="w-full px-4 py-2.5 text-left text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700/50 focus-visible:outline-none focus-visible:bg-stone-50 dark:focus-visible:bg-stone-700/50 flex items-center gap-3 transition-colors"
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
                                                            className="w-full px-4 py-2.5 text-left text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700/50 focus-visible:outline-none focus-visible:bg-stone-50 dark:focus-visible:bg-stone-700/50 flex items-center gap-3 transition-colors"
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
                                                            className="w-full px-4 py-2.5 text-left text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700/50 focus-visible:outline-none focus-visible:bg-stone-50 dark:focus-visible:bg-stone-700/50 flex items-center gap-3 transition-colors"
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
                                                                className="w-full px-4 py-2.5 text-left text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700/50 focus-visible:outline-none focus-visible:bg-stone-50 dark:focus-visible:bg-stone-700/50 flex items-center gap-3 transition-colors"
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
                    <div className="w-16 h-16 mx-auto mb-4 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-8 h-8 text-stone-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">{t.dashboard.noPolicies}</h3>
                    <p className="text-stone-600 dark:text-stone-400">{t.dashboard.addFirstPolicy}</p>
                </div>
            )}

            {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                    <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                        {t.dashboard.previous}
                    </button>

                    <div className="flex items-center gap-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                                    currentPage === page
                                        ? 'bg-teal-600 text-white'
                                        : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800'
                                }`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                        {t.dashboard.next}
                    </button>
                </div>
            )}
        </div>
    )
}
