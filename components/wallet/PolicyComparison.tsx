"use client"

import { useId, useState, useMemo } from "react"
import { Info } from "lucide-react"
import { useRouter } from "next/navigation"
import { parseDocumentDate } from "@/lib/dates/document-date"
import { useLanguage } from "@/contexts/LanguageContext"
import { getPolicyStatusView } from "@/lib/wallet/policy-status-view"
import { StatusPill } from "@/components/ui/StatusPill"
import { useDialog } from "@/hooks/useDialog"
import { calendarDaysUntil } from "@/lib/policy-status"
import { branchFamilyId } from "@/lib/insurance/taxonomy"

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
    const { t, language } = useLanguage()
    const c = t.wallet.comparison
    const locale = language === 'el' ? 'el-GR' : 'en-GB'
    const [selectedIds, setSelectedIds] = useState<string[]>(selectedPolicyIds)

    // Filter to only show comparable policies (same line of business)
    const comparablePolicies = useMemo(() => {
        if (selectedIds.length === 0) return policies

        const firstSelected = policies.find(p => p.id === selectedIds[0])
        if (!firstSelected) return policies

        return policies.filter(p => p.lineOfBusiness === firstSelected.lineOfBusiness)
    }, [policies, selectedIds])

    const selectedPolicies = policies.filter(p => selectedIds.includes(p.id))

    const handleClearAndClose = () => {
        setSelectedIds([])
        onClose()
    }

    // Hooks must precede the early return below — rules-of-hooks.
    const dialogRef = useDialog<HTMLDivElement>(handleClearAndClose, isOpen)
    const titleId = useId()

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
        const parsed = parseDocumentDate(dateString)
        if (!parsed) return '—'
        return parsed.toLocaleDateString(locale, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            timeZone: 'UTC'
        })
    }

    // Premiums are contractual amounts, and this table marks one of them as the
    // lowest. Rounding to whole euros made €1,104.87 and €1,105.20 both render
    // "1.105 €" — two visibly identical figures, one flagged cheapest — so the
    // comparison hid the very difference it exists to show. Cents stay.
    const formatCurrency = (amount: number | null | undefined, currency = 'EUR') => {
        if (amount === null || amount === undefined) return '—'
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount)
    }


    // Define comparison rows based on line of business
    const getCoverageRows = () => {
        const lob = selectedPolicies[0]?.lineOfBusiness

        const commonRows = [
            { key: 'insurer', label: c.rowInsurer, getValue: (p: PolicyForComparison) => p.insurerName },
            { key: 'policyNumber', label: c.rowPolicyNumber, getValue: (p: PolicyForComparison) => p.policyNumber },
            { key: 'status', label: c.rowStatus, getValue: (p: PolicyForComparison) => p.status, isStatus: true },
            { key: 'premium', label: c.rowPremium, getValue: (p: PolicyForComparison) => formatCurrency(p.premiumAmount, p.premiumCurrency), highlight: 'lowest' },
            { key: 'startDate', label: c.rowStartDate, getValue: (p: PolicyForComparison) => formatDate(p.startDate) },
            { key: 'endDate', label: c.rowEndDate, getValue: (p: PolicyForComparison) => formatDate(p.endDate) },
        ]

        // A motorbike or truck comparison used to fall through to the generic
        // rows, losing the vehicle-specific ones.
        if (branchFamilyId(lob || '') === 'motor') {
            return [
                ...commonRows,
                {
                    key: 'vehicle', label: c.rowVehicle, getValue: (p: PolicyForComparison) => {
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
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClearAndClose} />

            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="relative w-full max-w-6xl bg-card rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-8 pb-0 border-b border-border">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3 text-primary dark:text-mint">
                            <div className="w-8 h-8 rounded-xl bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <span className="text-kicker font-black uppercase tracking-[0.2em]">{c.kicker}</span>
                        </div>
                        <button
                            onClick={handleClearAndClose}
                            aria-label={t.common.close}
                            className="p-2 hover:bg-muted rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                            <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <h2 id={titleId} className="text-3xl font-black text-foreground tracking-tighter mb-2">
                        {c.headingLead} <span className="text-muted-foreground italic">{c.headingEmphasis}</span>
                    </h2>
                    <p className="text-base text-muted-foreground font-medium pb-6">
                        {c.subtitle}
                    </p>
                </div>

                <div className="flex-1 overflow-auto p-8">
                    {selectedIds.length < 2 ? (
                        /* Policy Selection */
                        <div className="space-y-4">
                            <p className="text-sm font-medium text-muted-foreground mb-4">
                                {selectedIds.length === 0
                                    ? c.selectFirst
                                    : `${c.selectedPrefix}: ${selectedPolicies[0]?.insurerName} (${selectedPolicies[0]?.lineOfBusiness}). ${c.selectMore}`
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
                                                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
                                                ${isSelected
                                                    ? 'border-primary bg-primary-tint dark:bg-primary/15'
                                                    : 'border-border hover:border-primary/40'
                                                }
                                                ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}
                                            `}
                                        >
                                            <div className="flex items-start gap-3">
                                                <span className="text-2xl">{getPolicyTypeIcon(policy.lineOfBusiness)}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-foreground truncate">
                                                        {policy.insurerName}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground font-mono">
                                                        {policy.policyNumber}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        {(() => {
                                                            const view = getPolicyStatusView(policy, t)
                                                            return <StatusPill tone={view.tone} label={view.label} icon={false} />
                                                        })()}
                                                        {policy.premiumAmount && (
                                                            <span className="text-xs text-muted-foreground">
                                                                {formatCurrency(policy.premiumAmount)}{c.perYearShort}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <div className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
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
                                    <tr className="border-b border-border">
                                        <th className="py-4 px-4 text-left w-40"></th>
                                        {selectedPolicies.map(policy => (
                                            <th key={policy.id} className="py-4 px-6 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <span className="text-3xl">{getPolicyTypeIcon(policy.lineOfBusiness)}</span>
                                                    <span className="font-bold text-foreground">
                                                        {policy.insurerName}
                                                    </span>
                                                    <button
                                                        onClick={() => router.push(`/wallet/${policy.id}`)}
                                                        className="text-xs text-primary dark:text-mint hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
                                                    >
                                                        {c.viewDetails} →
                                                    </button>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {getCoverageRows().map(row => (
                                        <tr key={row.key} className="border-b border-border">
                                            <td className="py-4 px-4 text-sm font-bold text-muted-foreground uppercase tracking-wider">
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
                                                    <td key={policy.id} className={`py-4 px-6 text-center ${isLowest ? 'bg-primary-tint dark:bg-primary/15' : ''}`}>
                                                        {row.isStatus ? (
                                                            (() => {
                                                                const view = getPolicyStatusView(policy, t)
                                                                return <StatusPill tone={view.tone} label={view.label} icon={false} />
                                                            })()
                                                        ) : (
                                                            <span className={`text-sm ${isLowest ? 'text-primary dark:text-mint font-bold' : 'text-foreground'}`}>
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
                            <div className="mt-8 p-6 bg-muted rounded-2xl">
                                <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
                                    {c.quickInsights}
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
                                            <div className="bg-card p-4 rounded-xl">
                                                <p className="text-xs text-muted-foreground font-bold uppercase mb-1">{c.lowestPremium}</p>
                                                <p className="text-lg font-bold text-primary dark:text-mint">{lowest.insurerName}</p>
                                                <p className="text-sm text-muted-foreground">{formatCurrency(lowest.premiumAmount)}{c.perYear}</p>
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
                                        // Athens calendar days, like every other expiry
                                        // count in the product. The raw UTC division here
                                        // could put a policy expiring TODAY at "σε 0
                                        // ημέρες" — or below zero once the clock passed
                                        // midnight UTC on its last day of cover.
                                        const daysUntil = calendarDaysUntil(new Date(soonest.endDate!), new Date())
                                        const whenLabel =
                                            daysUntil <= 0
                                                ? c.expiresToday
                                                : daysUntil === 1
                                                  ? c.expiresTomorrow
                                                  : `${c.inPrefix} ${daysUntil} ${c.daysSuffix}`
                                        return (
                                            <div className="bg-card p-4 rounded-xl">
                                                <p className="text-xs text-muted-foreground font-bold uppercase mb-1">{c.expiresSoonest}</p>
                                                <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{soonest.insurerName}</p>
                                                <p className="text-sm text-muted-foreground">{whenLabel}</p>
                                            </div>
                                        )
                                    })()}

                                    {/* Total Coverage */}
                                    {(() => {
                                        // Premiums in different currencies cannot be added.
                                        // This summed them all and formatted the result as
                                        // euros, so a sterling policy compared against euro
                                        // ones produced a "total" that was not the total of
                                        // anything. Same defect the wallet footprint had.
                                        const currencies = new Set(
                                            selectedPolicies.map((p) => (p.premiumCurrency || 'EUR').trim().toUpperCase())
                                        )
                                        const comparable = currencies.size === 1
                                        const currency = [...currencies][0] || 'EUR'
                                        return (
                                            <div className="bg-card p-4 rounded-xl">
                                                <p className="text-xs text-muted-foreground font-bold uppercase mb-1">{c.totalAnnualCost}</p>
                                                <p className="text-lg font-bold text-foreground">
                                                    {comparable
                                                        ? formatCurrency(
                                                              selectedPolicies.reduce((sum, p) => sum + (p.premiumAmount || 0), 0),
                                                              currency
                                                          )
                                                        : c.totalMixedCurrency}
                                                </p>
                                                <p className="text-sm text-muted-foreground">{selectedPolicies.length} {c.policiesCompared}</p>
                                            </div>
                                        )
                                    })()}
                                </div>

                                {/* Underwriting-accurate framing: "Lowest premium" is
                                    shown in a positive colour, which reads as
                                    "cheapest = best". Within the same product a lower
                                    premium usually buys less cover or a higher excess,
                                    so this says price alone is not value. */}
                                <p className="mt-4 flex items-start gap-2 text-caption leading-relaxed text-muted-foreground">
                                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                    {c.lowestPremiumCaveat}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 pt-0 border-t border-border flex gap-4">
                    <button
                        onClick={handleClearAndClose}
                        className="flex-1 px-8 py-4 bg-muted text-foreground rounded-2xl text-kicker font-black uppercase tracking-widest hover:bg-muted/70 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                        {t.common.close}
                    </button>
                    {selectedIds.length >= 2 && (
                        <button
                            onClick={() => setSelectedIds([])}
                            className="flex-1 px-8 py-4 bg-primary text-primary-foreground rounded-2xl text-kicker font-black uppercase tracking-widest hover:bg-primary-hover transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                        >
                            {c.compareDifferent}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
