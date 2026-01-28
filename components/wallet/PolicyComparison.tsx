"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"

interface PolicyForComparison {
    id: string
    policyNumber: string
    insurerName: string
    lineOfBusiness: string
    status: string
    startDate: string | null
    endDate: string | null
    premiumAmount?: number | null
    premiumCurrency?: string
    coverageSummary?: string | null
    acordData?: {
        coverages?: {
            name: string
            limit?: string
            deductible?: string
        }[]
        vehicle?: {
            plateNumber?: string
            make?: string
            model?: string
        }
    }
}

interface PolicyComparisonProps {
    policies: PolicyForComparison[]
    isOpen: boolean
    onClose: () => void
    selectedPolicyIds?: string[]
}

export function PolicyComparison({ policies, isOpen, onClose, selectedPolicyIds = [] }: PolicyComparisonProps) {
    const router = useRouter()
    const [selectedIds, setSelectedIds] = useState<string[]>(selectedPolicyIds)

    // Filter to only show comparable policies (same line of business)
    const comparablePolicies = useMemo(() => {
        if (selectedIds.length === 0) return policies

        const firstSelected = policies.find(p => p.id === selectedIds[0])
        if (!firstSelected) return policies

        return policies.filter(p => p.lineOfBusiness === firstSelected.lineOfBusiness)
    }, [policies, selectedIds])

    const selectedPolicies = policies.filter(p => selectedIds.includes(p.id))

    if (!isOpen) return null

    const toggleSelect = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(i => i !== id))
        } else if (selectedIds.length < 3) {
            // Enforce max 3 policies
            const policy = policies.find(p => p.id === id)
            const firstSelected = policies.find(p => p.id === selectedIds[0])

            // Must be same line of business
            if (firstSelected && policy?.lineOfBusiness !== firstSelected.lineOfBusiness) {
                return
            }

            setSelectedIds(prev => [...prev, id])
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
            case 'expiring_soon': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            default: return 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
        }
    }

    const getPolicyTypeIcon = (type: string) => {
        switch (type?.toLowerCase()) {
            case 'motor': return '🚗'
            case 'health': return '❤️'
            case 'home': return '🏠'
            case 'life': return '🛡️'
            case 'travel': return '✈️'
            case 'liability': return '⚖️'
            default: return '📋'
        }
    }

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '—'
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
    }

    const formatCurrency = (amount: number | null | undefined, currency = 'EUR') => {
        if (amount === null || amount === undefined) return '—'
        return new Intl.NumberFormat('el-GR', {
            style: 'currency',
            currency,
            maximumFractionDigits: 0
        }).format(amount)
    }

    const handleClearAndClose = () => {
        setSelectedIds([])
        onClose()
    }

    // Define comparison rows based on line of business
    const getCoverageRows = () => {
        const lob = selectedPolicies[0]?.lineOfBusiness

        const commonRows = [
            { key: 'insurer', label: 'Insurer', getValue: (p: PolicyForComparison) => p.insurerName },
            { key: 'policyNumber', label: 'Policy #', getValue: (p: PolicyForComparison) => p.policyNumber },
            { key: 'status', label: 'Status', getValue: (p: PolicyForComparison) => p.status, isStatus: true },
            { key: 'premium', label: 'Annual Premium', getValue: (p: PolicyForComparison) => formatCurrency(p.premiumAmount, p.premiumCurrency), highlight: 'lowest' },
            { key: 'startDate', label: 'Start Date', getValue: (p: PolicyForComparison) => formatDate(p.startDate) },
            { key: 'endDate', label: 'End Date', getValue: (p: PolicyForComparison) => formatDate(p.endDate) },
        ]

        if (lob === 'motor') {
            return [
                ...commonRows,
                {
                    key: 'vehicle', label: 'Vehicle', getValue: (p: PolicyForComparison) => {
                        const v = p.acordData?.vehicle
                        return v ? `${v.make || ''} ${v.model || ''} (${v.plateNumber || ''})` : '—'
                    }
                },
            ]
        }

        return commonRows
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={handleClearAndClose} />

            <div className="relative w-full max-w-6xl bg-white dark:bg-stone-900 rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-8 pb-0 border-b border-stone-100 dark:border-stone-800">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3 text-teal-600">
                            <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Policy Comparison</span>
                        </div>
                        <button
                            onClick={handleClearAndClose}
                            className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors"
                        >
                            <svg className="w-5 h-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <h2 className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter mb-2">
                        Compare <span className="text-stone-400 dark:text-stone-500 italic">Policies.</span>
                    </h2>
                    <p className="text-base text-stone-500 dark:text-stone-400 font-medium pb-6">
                        Select up to 3 policies of the same type to compare side-by-side.
                    </p>
                </div>

                <div className="flex-1 overflow-auto p-8">
                    {selectedIds.length < 2 ? (
                        /* Policy Selection */
                        <div className="space-y-4">
                            <p className="text-sm font-medium text-stone-500 mb-4">
                                {selectedIds.length === 0
                                    ? 'Select the first policy to compare:'
                                    : `Selected: ${selectedPolicies[0]?.insurerName} (${selectedPolicies[0]?.lineOfBusiness}). Select more:`
                                }
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {comparablePolicies.map(policy => {
                                    const isSelected = selectedIds.includes(policy.id)
                                    const isDisabled = selectedIds.length > 0 &&
                                        policy.lineOfBusiness !== policies.find(p => p.id === selectedIds[0])?.lineOfBusiness

                                    return (
                                        <button
                                            key={policy.id}
                                            onClick={() => toggleSelect(policy.id)}
                                            disabled={isDisabled}
                                            className={`
                                                p-4 rounded-2xl text-left transition-all border-2
                                                ${isSelected
                                                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                                                    : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600'
                                                }
                                                ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}
                                            `}
                                        >
                                            <div className="flex items-start gap-3">
                                                <span className="text-2xl">{getPolicyTypeIcon(policy.lineOfBusiness)}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-stone-900 dark:text-white truncate">
                                                        {policy.insurerName}
                                                    </p>
                                                    <p className="text-xs text-stone-400 font-mono">
                                                        {policy.policyNumber}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getStatusColor(policy.status)}`}>
                                                            {policy.status.replace('_', ' ')}
                                                        </span>
                                                        {policy.premiumAmount && (
                                                            <span className="text-xs text-stone-500">
                                                                {formatCurrency(policy.premiumAmount)}/yr
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <div className="flex-shrink-0 w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center text-white">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    ) : (
                        /* Comparison Table */
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-stone-200 dark:border-stone-700">
                                        <th className="py-4 px-4 text-left w-40"></th>
                                        {selectedPolicies.map(policy => (
                                            <th key={policy.id} className="py-4 px-6 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <span className="text-3xl">{getPolicyTypeIcon(policy.lineOfBusiness)}</span>
                                                    <span className="font-bold text-stone-900 dark:text-white">
                                                        {policy.insurerName}
                                                    </span>
                                                    <button
                                                        onClick={() => router.push(`/wallet/${policy.id}`)}
                                                        className="text-xs text-teal-600 hover:underline"
                                                    >
                                                        View Details →
                                                    </button>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {getCoverageRows().map(row => (
                                        <tr key={row.key} className="border-b border-stone-100 dark:border-stone-800">
                                            <td className="py-4 px-4 text-sm font-bold text-stone-500 uppercase tracking-wider">
                                                {row.label}
                                            </td>
                                            {selectedPolicies.map(policy => {
                                                const value = row.getValue(policy)
                                                const isLowest = row.highlight === 'lowest' &&
                                                    selectedPolicies.every(p => {
                                                        const pVal = policy.premiumAmount ?? Infinity
                                                        const otherVal = p.premiumAmount ?? Infinity
                                                        return pVal <= otherVal
                                                    }) && policy.premiumAmount

                                                return (
                                                    <td key={policy.id} className={`py-4 px-6 text-center ${isLowest ? 'bg-teal-50 dark:bg-teal-900/20' : ''}`}>
                                                        {row.isStatus ? (
                                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(value as string)}`}>
                                                                {(value as string).replace('_', ' ')}
                                                            </span>
                                                        ) : (
                                                            <span className={`text-sm ${isLowest ? 'text-teal-600 dark:text-teal-400 font-bold' : 'text-stone-700 dark:text-stone-300'}`}>
                                                                {value}
                                                                {isLowest && <span className="ml-1">⭐</span>}
                                                            </span>
                                                        )}
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Footer with Key Insights */}
                            <div className="mt-8 p-6 bg-stone-50 dark:bg-stone-800/50 rounded-2xl">
                                <h4 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-4">
                                    Quick Insights
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Lowest Premium */}
                                    {(() => {
                                        const sorted = [...selectedPolicies]
                                            .filter(p => p.premiumAmount)
                                            .sort((a, b) => (a.premiumAmount || 0) - (b.premiumAmount || 0))
                                        const lowest = sorted[0]
                                        if (!lowest) return null
                                        return (
                                            <div className="bg-white dark:bg-stone-900 p-4 rounded-xl">
                                                <p className="text-xs text-stone-400 font-bold uppercase mb-1">Lowest Premium</p>
                                                <p className="text-lg font-bold text-teal-600">{lowest.insurerName}</p>
                                                <p className="text-sm text-stone-500">{formatCurrency(lowest.premiumAmount)}/year</p>
                                            </div>
                                        )
                                    })()}

                                    {/* Expires Soonest */}
                                    {(() => {
                                        const sorted = [...selectedPolicies]
                                            .filter(p => p.endDate)
                                            .sort((a, b) => new Date(a.endDate!).getTime() - new Date(b.endDate!).getTime())
                                        const soonest = sorted[0]
                                        if (!soonest) return null
                                        const daysUntil = Math.ceil((new Date(soonest.endDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                                        return (
                                            <div className="bg-white dark:bg-stone-900 p-4 rounded-xl">
                                                <p className="text-xs text-stone-400 font-bold uppercase mb-1">Expires Soonest</p>
                                                <p className="text-lg font-bold text-amber-600">{soonest.insurerName}</p>
                                                <p className="text-sm text-stone-500">in {daysUntil} days</p>
                                            </div>
                                        )
                                    })()}

                                    {/* Total Coverage */}
                                    <div className="bg-white dark:bg-stone-900 p-4 rounded-xl">
                                        <p className="text-xs text-stone-400 font-bold uppercase mb-1">Total Annual Cost</p>
                                        <p className="text-lg font-bold text-stone-900 dark:text-white">
                                            {formatCurrency(selectedPolicies.reduce((sum, p) => sum + (p.premiumAmount || 0), 0))}
                                        </p>
                                        <p className="text-sm text-stone-500">{selectedPolicies.length} policies compared</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 pt-0 border-t border-stone-100 dark:border-stone-800 flex gap-4">
                    <button
                        onClick={handleClearAndClose}
                        className="flex-1 px-8 py-4 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-stone-200 dark:hover:bg-stone-700 transition-all"
                    >
                        Close
                    </button>
                    {selectedIds.length >= 2 && (
                        <button
                            onClick={() => setSelectedIds([])}
                            className="flex-1 px-8 py-4 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-600 dark:hover:bg-teal-500 hover:text-white transition-all"
                        >
                            Compare Different Policies
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
