"use client"

import { MoreVertical, Eye, RefreshCw, History, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import type { Policy } from './types'
import { useLanguage } from '@/contexts/LanguageContext'

interface PolicyTableProps {
    policies: Policy[]
    onViewPolicy?: (policyId: string) => void
    onRenewPolicy?: (policyId: string) => void
    onViewHistory?: (policyId: string) => void
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
    onViewHistory
}: PolicyTableProps) {
    const { language } = useLanguage()
    const [currentPage, setCurrentPage] = useState(1)
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)
    const policiesPerPage = 5

    // Pagination
    const totalPages = Math.ceil(policies.length / policiesPerPage)
    const startIndex = (currentPage - 1) * policiesPerPage
    const endIndex = startIndex + policiesPerPage
    const currentPolicies = policies.slice(startIndex, endIndex)

    // Status badge styling
    const getStatusBadge = (status: Policy['status']) => {
        const badges = {
            active: {
                bg: 'bg-emerald-50',
                text: 'text-emerald-700',
                label: language === 'el' ? 'Ενεργό' : 'Active'
            },
            expiring_soon: {
                bg: 'bg-amber-50',
                text: 'text-amber-700',
                label: language === 'el' ? 'Λήγει Σύντομα' : 'Renewal Pending'
            },
            incomplete: {
                bg: 'bg-gray-50',
                text: 'text-gray-700',
                label: language === 'el' ? 'Ημιτελές' : 'Incomplete'
            },
            action_needed: {
                bg: 'bg-red-50',
                text: 'text-red-700',
                label: language === 'el' ? 'Απαιτείται Ενέργεια' : 'Action Needed'
            },
            analyzing: {
                bg: 'bg-blue-50',
                text: 'text-blue-700',
                label: language === 'el' ? 'Ανάλυση...' : 'Analyzing...'
            }
        }
        return badges[status] || badges.active
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
                    {language === 'el' ? 'Τα Ασφαλιστήρια Μου' : 'My Insurance Policies'}
                </h2>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                                {language === 'el' ? 'Ασφαλιστής' : 'Insurer'}
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                                {language === 'el' ? 'Αριθμός Συμβολαίου' : 'Policy Number'}
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                                {language === 'el' ? 'Τύπος' : 'Type'}
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                                {language === 'el' ? 'Κατάσταση' : 'Status'}
                            </th>
                            <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">
                                {language === 'el' ? 'Ενέργειες' : 'Actions'}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {currentPolicies.map((policy) => {
                            const statusBadge = getStatusBadge(policy.status)
                            const typeIcon = TYPE_ICONS[policy.lineOfBusiness] || '📄'
                            const isMenuOpen = openMenuId === policy.id

                            return (
                                <tr
                                    key={policy.id}
                                    className="hover:bg-gray-50 transition-colors group"
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

                                    {/* Policy Number */}
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-sm text-gray-700">
                                            {policy.policyNumber}
                                        </span>
                                    </td>

                                    {/* Type */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">{typeIcon}</span>
                                            <span className="text-sm text-gray-700 capitalize">
                                                {policy.lineOfBusiness}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Status */}
                                    <td className="px-6 py-4">
                                        <span className={`
                                            inline-flex items-center px-3 py-1 
                                            rounded-lg text-sm font-medium
                                            ${statusBadge.bg} ${statusBadge.text}
                                        `}>
                                            {statusBadge.label}
                                        </span>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            {/* Renew Now Button (for expiring policies) */}
                                            {policy.status === 'expiring_soon' && (
                                                <button
                                                    onClick={() => onRenewPolicy?.(policy.id)}
                                                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                    {language === 'el' ? 'Ανανέωση' : 'Renew Now'}
                                                </button>
                                            )}

                                            {/* View Details Button */}
                                            <button
                                                onClick={() => onViewPolicy?.(policy.id)}
                                                className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                                            >
                                                {language === 'el' ? 'Προβολή' : 'View Details'}
                                            </button>

                                            {/* More Actions Menu */}
                                            <div className="relative">
                                                <button
                                                    onClick={() => setOpenMenuId(isMenuOpen ? null : policy.id)}
                                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                                >
                                                    <MoreVertical className="w-5 h-5 text-gray-600" />
                                                </button>

                                                {/* Dropdown Menu */}
                                                {isMenuOpen && (
                                                    <>
                                                        <div
                                                            className="fixed inset-0 z-10"
                                                            onClick={() => setOpenMenuId(null)}
                                                        />
                                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                                                            <button
                                                                onClick={() => {
                                                                    onViewHistory?.(policy.id)
                                                                    setOpenMenuId(null)
                                                                }}
                                                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                                                            >
                                                                <History className="w-4 h-4" />
                                                                {language === 'el' ? 'Ιστορικό' : 'View History'}
                                                            </button>
                                                            {policy.status === 'expiring_soon' && (
                                                                <button
                                                                    onClick={() => {
                                                                        onRenewPolicy?.(policy.id)
                                                                        setOpenMenuId(null)
                                                                    }}
                                                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                                                                >
                                                                    <RefreshCw className="w-4 h-4" />
                                                                    {language === 'el' ? 'Ανανέωση' : 'Renew Policy'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
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
                        {language === 'el' ? 'Δεν βρέθηκαν ασφαλιστήρια' : 'No policies found'}
                    </h3>
                    <p className="text-gray-600">
                        {language === 'el'
                            ? 'Προσθέστε το πρώτο σας ασφαλιστήριο για να ξεκινήσετε'
                            : 'Add your first policy to get started'
                        }
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
                        {language === 'el' ? 'Προηγούμενο' : 'Previous'}
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
                        {language === 'el' ? 'Επόμενο' : 'Next'}
                    </button>
                </div>
            )}
        </div>
    )
}
