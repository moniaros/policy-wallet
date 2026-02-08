"use client"

import { MoreVertical, Eye, RefreshCw, History, AlertCircle, Sparkles, Trash2, Share2, Wallet, FileText, Search } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
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

// Insurance type icons mapping
const TYPE_ICONS: Record<string, string> = {
    health: '❤️',
    motor: '🚗',
    home: '🏠',
    life: '🛡️',
    travel: '✈️',
    liability: '⚖️',
    pet: '🐾',
    professional: '💼',
    other: '📄',
    breakdown: '🔧',
    legal_expenses: '⚖️',
    income_protection: '💰',
    gadget: '📱',
    bicycle: '🚲',
    business: '🏢',
    cyber: '💻',
    motorbike: '🏍️',
    public_liability: '🤝',
    renters: '🔑'
}

// Insurer logo colors (fallback for missing logos)
const INSURER_COLORS = [
    'bg-purple-500',
    'bg-blue-500',
    'bg-teal-500',
    'bg-indigo-500',
    'bg-red-500',
    'bg-orange-500'
]

export function PolicyTable({
    policies,
    onViewPolicy,
    onRenewPolicy,
    onViewHistory,
    onRunAnalysis,
    onDelete,
    onShare,
    onAddToWallet,
    onViewDocuments
}: PolicyTableProps) {
    const { language, t } = useLanguage()
    const [currentPage, setCurrentPage] = useState(1)
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)
    const [menuPosition, setMenuPosition] = useState<{ top: number, right: number } | null>(null)
    const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
    const policiesPerPage = 5

    // Pagination
    const totalPages = Math.ceil(policies.length / policiesPerPage)
    const startIndex = (currentPage - 1) * policiesPerPage
    const endIndex = startIndex + policiesPerPage
    const currentPolicies = policies.slice(startIndex, endIndex)

    // Handle menu open
    const handleMenuOpen = (policyId: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (openMenuId === policyId) {
            setOpenMenuId(null)
            setMenuPosition(null)
        } else {
            const rect = e.currentTarget.getBoundingClientRect()
            setMenuPosition({
                top: rect.bottom + window.scrollY,
                right: window.innerWidth - rect.right
            })
            setOpenMenuId(policyId)
        }
    }

    // Close menu on scroll or resize
    useEffect(() => {
        const handleScroll = () => {
            if (openMenuId) {
                setOpenMenuId(null)
                setMenuPosition(null)
            }
        }
        window.addEventListener('scroll', handleScroll, true)
        window.addEventListener('resize', handleScroll)
        return () => {
            window.removeEventListener('scroll', handleScroll, true)
            window.removeEventListener('resize', handleScroll)
        }
    }, [openMenuId])

    // Status badge styling - Layer 1: Operational Status
    const getStatusBadge = (status: Policy['status'], endDate: string | null) => {
        const isExpired = endDate && new Date(endDate) < new Date()

        if (status === 'cancelled') return { label: 'Cancelled', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: '🔴' }
        if (isExpired) return { label: 'Expired', bg: 'bg-stone-100 dark:bg-stone-800', text: 'text-stone-500 dark:text-stone-400', icon: '🔴' }
        if (status === 'analyzing') return { label: 'Analyzing', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', icon: '🔄' }
        if (status === 'action_needed') return { label: 'Action Needed', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', icon: '⚠️' }

        // Default Active
        return { label: 'Active', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', icon: '🟢' }
    }

    const getInsightBadge = (policy: Policy) => {
        // Layer 2: Insights
        if (policy.status === 'expiring_soon') return { label: 'Renewal Pending', color: 'text-amber-600', icon: '⚠️' }
        if (!policy.verified) return { label: 'Unverified', color: 'text-stone-400', icon: '🛡️' }
        return { label: 'No Issues', color: 'text-teal-600', icon: '✅' }
    }

    // Get insurer initials for logo fallback
    const getInsurerInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    // Get color for insurer (deterministic based on name)
    const getInsurerColor = (name: string) => {
        const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
        return INSURER_COLORS[hash % INSURER_COLORS.length]
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">
                    {t.dashboard.myPolicies}
                </h2>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-stone-300">
                                {t.dashboard.insurer}
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-stone-300">
                                {(t.dashboard as any).insuredItem || 'Insured Item'}
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-stone-300">
                                {t.dashboard.status}
                            </th>
                            <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 dark:text-stone-300">
                                {t.dashboard.actions}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {currentPolicies.map((policy) => {
                            const statusBadge = getStatusBadge(policy.status, policy.endDate)
                            const insightBadge = getInsightBadge(policy)
                            const typeIcon = TYPE_ICONS[policy.lineOfBusiness] || '📄'
                            const isMenuOpen = openMenuId === policy.id

                            return (
                                <tr
                                    key={policy.id}
                                    onClick={() => onViewPolicy?.(policy.id)}
                                    className="hover:bg-gray-50 transition-colors group cursor-pointer"
                                >
                                    {/* Insurer */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {policy.insurerLogo ? (
                                                <img
                                                    src={policy.insurerLogo}
                                                    alt={policy.insurerName}
                                                    className="w-10 h-10 rounded-lg object-contain bg-white border border-gray-200"
                                                />
                                            ) : (
                                                <div className={`
                                                    w-10 h-10 rounded-lg 
                                                    ${getInsurerColor(policy.insurerName)}
                                                    flex items-center justify-center
                                                    text-white font-bold text-sm
                                                `}>
                                                    {getInsurerInitials(policy.insurerName)}
                                                </div>
                                            )}
                                            <span className={`font-medium text-gray-900 ${policy.status === 'analyzing' ? 'animate-pulse opacity-70' : ''}`}>
                                                {policy.insurerName}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Insured Item (New Column) */}
                                    <td className="px-6 py-4">
                                        {policy.insuredItem ? (
                                            <div>
                                                <div className="font-bold text-stone-900 dark:text-white text-sm">{policy.insuredItem.title}</div>
                                                {policy.insuredItem.subtitle && <div className="text-xs text-stone-500 font-mono mt-0.5">{policy.insuredItem.subtitle}</div>}
                                            </div>
                                        ) : (
                                            <div className="text-stone-400 text-sm italic">
                                                {policy.lineOfBusiness} policy
                                            </div>
                                        )}
                                    </td>

                                    {/* Status (Split System) */}
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col items-start gap-1.5">
                                            {/* Layer 1: Operational */}
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap border ${statusBadge.bg} ${statusBadge.text} border-transparent bg-opacity-50`}>
                                                {statusBadge.icon} {statusBadge.label}
                                            </span>

                                            {/* Layer 2: Insights */}
                                            {insightBadge.label !== 'No Issues' && (
                                                <div className={`flex items-center gap-1.5 text-xs font-medium ${insightBadge.color} px-2`}>
                                                    <span>{insightBadge.icon}</span> {insightBadge.label}
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                                            {/* Renew Now Button (for expiring policies) */}
                                            {policy.status === 'expiring_soon' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onRenewPolicy?.(policy.id)
                                                    }}
                                                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                    {t.dashboard.renewNow}
                                                </button>
                                            )}

                                            {/* View Details Button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onViewPolicy?.(policy.id)
                                                }}
                                                className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                                            >
                                                {t.dashboard.viewDetails}
                                            </button>

                                            {/* More Actions Menu */}
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => handleMenuOpen(policy.id, e)}
                                                    className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${isMenuOpen ? 'bg-gray-100' : ''}`}
                                                >
                                                    <MoreVertical className="w-5 h-5 text-gray-600" />
                                                </button>
                                            </div>

                                            {/* Portal Dropdown Menu */}
                                            {isMenuOpen && typeof document !== 'undefined' && createPortal(
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-[9998]"
                                                        onClick={() => {
                                                            setOpenMenuId(null)
                                                            setMenuPosition(null)
                                                        }}
                                                    />
                                                    <div
                                                        className="fixed z-[9999] w-64 bg-white dark:bg-stone-800 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-700 py-3 animate-in fade-in zoom-in-95 duration-200"
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
                                                                onViewPolicy?.(policy.id)
                                                                setOpenMenuId(null)
                                                            }}
                                                            className="w-full px-4 py-2 text-left text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700/50 flex items-center gap-3 transition-colors"
                                                        >
                                                            <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                                <Search className="w-4 h-4" />
                                                            </div>
                                                            {t.dashboard.runAnalysis || 'Understand Policy'}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                onViewDocuments?.(policy.id)
                                                                setOpenMenuId(null)
                                                            }}
                                                            className="w-full px-4 py-2 text-left text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700/50 flex items-center gap-3 transition-colors"
                                                        >
                                                            <div className="w-8 h-8 bg-amber-50 dark:bg-amber-900/30 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400">
                                                                <FileText className="w-4 h-4" />
                                                            </div>
                                                            {t.wallet.documents}
                                                        </button>

                                                        {/* Act */}
                                                        <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-stone-400 mt-2">
                                                            {(t.dashboard as any).actionGroups?.act || 'Act'}
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                onShare?.(policy.id)
                                                                setOpenMenuId(null)
                                                            }}
                                                            className="w-full px-4 py-2 text-left text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700/50 flex items-center gap-3 transition-colors"
                                                        >
                                                            <div className="w-8 h-8 bg-teal-50 dark:bg-teal-900/30 rounded-lg flex items-center justify-center text-teal-600 dark:text-teal-400">
                                                                <Share2 className="w-4 h-4" />
                                                            </div>
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
                                                                <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                                                    <RefreshCw className="w-4 h-4" />
                                                                </div>
                                                                {t.dashboard.renewPolicy}
                                                            </button>
                                                        )}

                                                        {/* Danger Zone */}
                                                        <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-300 mt-2">
                                                            {(t.dashboard as any).actionGroups?.danger || 'Danger Zone'}
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                onDelete?.(policy.id)
                                                                setOpenMenuId(null)
                                                            }}
                                                            className="w-full px-4 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-3 transition-colors"
                                                        >
                                                            <div className="w-8 h-8 bg-red-50 dark:bg-red-900/30 rounded-lg flex items-center justify-center text-red-500">
                                                                <Trash2 className="w-4 h-4" />
                                                            </div>
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

            {/* Empty State */}
            {currentPolicies.length === 0 && (
                <div className="px-6 py-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {t.dashboard.noPolicies}
                    </h3>
                    <p className="text-gray-600">
                        {t.dashboard.addFirstPolicy}
                    </p>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {t.dashboard.previous}
                    </button>

                    <div className="flex items-center gap-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`
                                    w-10 h-10 rounded-lg text-sm font-medium transition-colors
                                    ${currentPage === page
                                        ? 'bg-teal-600 text-white'
                                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                                    }
                                `}
                            >
                                {page}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {t.dashboard.next}
                    </button>
                </div>
            )}
        </div>
    )
}
