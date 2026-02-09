"use client"

import { AlertCircle, CheckCircle2, Clock3, MoreVertical, RefreshCw, Search, ShieldAlert, ShieldCheck, Trash2, Share2, FileText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Policy } from './types'
import { useLanguage } from '@/contexts/LanguageContext'

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

const INSURER_COLORS = ['bg-purple-500', 'bg-blue-500', 'bg-teal-500', 'bg-indigo-500', 'bg-red-500', 'bg-orange-500']

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
    const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null)
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

    const label = {
        cancelled: language === 'el' ? 'Ακυρωμένο' : 'Cancelled',
        expired: t.policyStatus?.expired || (language === 'el' ? 'Έληξε' : 'Expired'),
        analyzing: t.dashboard.statusLabels.analyzing,
        actionNeeded: t.dashboard.statusLabels.action_needed,
        active: t.dashboard.statusLabels.active,
        renewalPending: t.dashboard.statusLabels.expiring_soon,
        unverified: language === 'el' ? 'Μη επαληθευμένο' : 'Unverified',
        noIssues: language === 'el' ? 'Χωρίς θέματα' : 'No issues',
        policySuffix: language === 'el' ? 'ασφαλιστήριο' : 'policy',
        understandPolicy: t.dashboard.runAnalysis || (language === 'el' ? 'Κατανόηση συμβολαίου' : 'Understand policy'),
    }

    const getStatusBadge = (status: Policy['status'], endDate: string | null) => {
        const isExpired = endDate ? new Date(endDate) < new Date() : false

        if (status === 'cancelled') {
            return {
                text: label.cancelled,
                className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
                icon: <ShieldAlert className="w-3.5 h-3.5" />,
            }
        }
        if (isExpired) {
            return {
                text: label.expired,
                className: 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300',
                icon: <Clock3 className="w-3.5 h-3.5" />,
            }
        }
        if (status === 'analyzing') {
            return {
                text: label.analyzing,
                className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
                icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
            }
        }
        if (status === 'action_needed') {
            return {
                text: label.actionNeeded,
                className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
                icon: <AlertCircle className="w-3.5 h-3.5" />,
            }
        }

        return {
            text: label.active,
            className: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
            icon: <ShieldCheck className="w-3.5 h-3.5" />,
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

    const getInsurerInitials = (name: string) =>
        name
            .split(' ')
            .map((word) => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)

    const getInsurerColor = (name: string) => {
        const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
        return INSURER_COLORS[hash % INSURER_COLORS.length]
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
                            <th className="px-6 py-4 text-left text-sm font-semibold text-stone-700 dark:text-stone-300">{t.dashboard.insurer}</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-stone-700 dark:text-stone-300">{(t.dashboard as any).insuredItem || 'Insured Item'}</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-stone-700 dark:text-stone-300">{t.dashboard.status}</th>
                            <th className="px-6 py-4 text-right text-sm font-semibold text-stone-700 dark:text-stone-300">{t.dashboard.actions}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                        {currentPolicies.map((policy) => {
                            const statusBadge = getStatusBadge(policy.status, policy.endDate)
                            const insightBadge = getInsightBadge(policy)
                            const isMenuOpen = openMenuId === policy.id

                            return (
                                <tr key={policy.id} onClick={() => onViewPolicy?.(policy.id)} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors group cursor-pointer">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {policy.insurerLogo ? (
                                                <img src={policy.insurerLogo} alt={policy.insurerName} className="w-10 h-10 rounded-lg object-contain bg-white border border-stone-200" />
                                            ) : (
                                                <div className={`w-10 h-10 rounded-lg ${getInsurerColor(policy.insurerName)} flex items-center justify-center text-white font-bold text-sm`}>
                                                    {getInsurerInitials(policy.insurerName)}
                                                </div>
                                            )}
                                            <span className={`font-medium text-stone-900 dark:text-stone-100 ${policy.status === 'analyzing' ? 'opacity-80' : ''}`}>{policy.insurerName}</span>
                                        </div>
                                    </td>

                                    <td className="px-6 py-4">
                                        {policy.insuredItem ? (
                                            <div>
                                                <div className="font-bold text-stone-900 dark:text-white text-sm">{policy.insuredItem.title}</div>
                                                {policy.insuredItem.subtitle ? <div className="text-xs text-stone-500 font-mono mt-0.5">{policy.insuredItem.subtitle}</div> : null}
                                            </div>
                                        ) : (
                                            <div className="text-stone-400 text-sm italic">{`${t.policyTypes[policy.lineOfBusiness as keyof typeof t.policyTypes] || policy.lineOfBusiness} ${label.policySuffix}`}</div>
                                        )}
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="flex flex-col items-start gap-1.5">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${statusBadge.className}`}>
                                                {statusBadge.icon}
                                                {statusBadge.text}
                                            </span>
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
                                                    const rect = e.currentTarget.getBoundingClientRect()
                                                    setMenuPosition({ top: rect.bottom + window.scrollY, right: window.innerWidth - rect.right })
                                                    setOpenMenuId(isMenuOpen ? null : policy.id)
                                                }}
                                                className={`p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors cursor-pointer ${isMenuOpen ? 'bg-stone-100 dark:bg-stone-800' : ''}`}
                                                aria-label={t.dashboard.actions}
                                            >
                                                <MoreVertical className="w-5 h-5 text-stone-600 dark:text-stone-300" />
                                            </button>

                                            {isMenuOpen && typeof document !== 'undefined' && createPortal(
                                                <>
                                                    <div className="fixed inset-0 z-[9998]" onClick={() => setOpenMenuId(null)} />
                                                    <div
                                                        className="fixed z-[9999] w-64 bg-white dark:bg-stone-800 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-700 py-2 animate-in fade-in zoom-in-95 duration-200"
                                                        style={{ top: `${menuPosition?.top ?? 0}px`, right: `${menuPosition?.right ?? 0}px`, marginTop: '8px' }}
                                                    >
                                                        <button
                                                            onClick={() => {
                                                                onRunAnalysis?.(policy.id)
                                                                setOpenMenuId(null)
                                                            }}
                                                            className="w-full px-4 py-2 text-left text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700/50 flex items-center gap-3 transition-colors"
                                                        >
                                                            <Search className="w-4 h-4" />
                                                            {label.understandPolicy}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                onViewDocuments?.(policy.id)
                                                                setOpenMenuId(null)
                                                            }}
                                                            className="w-full px-4 py-2 text-left text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700/50 flex items-center gap-3 transition-colors"
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                            {t.wallet.documents}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                onShare?.(policy.id)
                                                                setOpenMenuId(null)
                                                            }}
                                                            className="w-full px-4 py-2 text-left text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700/50 flex items-center gap-3 transition-colors"
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
                                                                className="w-full px-4 py-2 text-left text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700/50 flex items-center gap-3 transition-colors"
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
                                                            className="w-full px-4 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-3 transition-colors"
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
