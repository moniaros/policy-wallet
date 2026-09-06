"use client"

import { useId, useState, useMemo } from "react"
import { Info } from "lucide-react"
import { useRouter } from "next/navigation"
import { parseDocumentDate } from "@/lib/dates/document-date"
import { APP_TIME_ZONE, resolveLocale } from "@/lib/i18n/format"
import { useLanguage } from "@/contexts/LanguageContext"
import { getPolicyStatusView } from "@/lib/wallet/policy-status-view"
import { StatusPill } from "@/components/ui/StatusPill"
import { useDialog } from "@/hooks/useDialog"
import { calendarDaysUntil } from "@/lib/policy-status"
import { branchFamilyId, normalizeBranch } from "@/lib/insurance/taxonomy"
import { motorSection, homeSection, lifeSection } from "@/lib/wallet/coverage-sections"
import { classifyMotorCoverageTier } from "@/lib/wallet/motor-coverage-tier"
import { displayInsurerName, displayPolicyNumber, policyAssetIdentifier, policyRowIdentity } from '@/lib/wallet/policy-identity'
import { AiDisclaimer } from "@/components/ui/AiDisclaimer"

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
    // Full extracted envelope. The caller passes it as-is; the branch-specific
    // rows read the same canonical sections the coverage panels do.
    acordData?: any
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
    const locale = resolveLocale(language)
    const [selectedIds, setSelectedIds] = useState<string[]>(selectedPolicyIds)

    // Filter to only show comparable policies (same line of business)
    const comparablePolicies = useMemo(() => {
        if (selectedIds.length === 0) return policies

        const firstSelected = policies.find(p => p.id === selectedIds[0])
        if (!firstSelected) return policies

        // Compare by branch FAMILY, not the raw line: a motorbike and a car are
        // both motor and the comparison renders motor rows for both, so they must
        // be selectable together. Raw equality blocked motorbike-vs-car,
        // renters-vs-home, income-protection-vs-life.
        return policies.filter(p => branchFamilyId(p.lineOfBusiness) === branchFamilyId(firstSelected.lineOfBusiness))
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
            if (firstSelected && policy && branchFamilyId(policy.lineOfBusiness) !== branchFamilyId(firstSelected.lineOfBusiness)) {
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
            // Contractual start/end dates — pin Athens so they can't render the
            // previous day (and disagree with the Athens-computed day counts).
            timeZone: APP_TIME_ZONE,
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
            { key: 'insurer', label: c.rowInsurer, getValue: (p: PolicyForComparison) => displayInsurerName(p.insurerName) },
            { key: 'policyNumber', label: c.rowPolicyNumber, getValue: (p: PolicyForComparison) => displayPolicyNumber(p.policyNumber) ?? '' },
            { key: 'status', label: c.rowStatus, getValue: (p: PolicyForComparison) => p.status, isStatus: true },
            { key: 'premium', label: c.rowPremium, getValue: (p: PolicyForComparison) => formatCurrency(p.premiumAmount, p.premiumCurrency), highlight: 'lowest', rawValue: (p: PolicyForComparison) => p.premiumAmount ?? null },
            { key: 'startDate', label: c.rowStartDate, getValue: (p: PolicyForComparison) => formatDate(p.startDate) },
            { key: 'endDate', label: c.rowEndDate, getValue: (p: PolicyForComparison) => formatDate(p.endDate) },
        ]

        const family = branchFamilyId(lob || '')

        // Branch-specific rows — the figures you actually compare between two
        // policies of the same type. Without these, comparing two health plans
        // showed only insurer/premium/dates, not which one has the higher annual
        // limit or better hospital class: the whole point of the comparison.
        const money = (n: number | null | undefined) =>
            n === null || n === undefined ? '—' : formatCurrency(n)
        const yesNo = (v: boolean | undefined) =>
            v === undefined ? '—' : v ? c.covered : c.notCovered

        if (family === 'motor') {
            return [
                ...commonRows,
                {
                    key: 'vehicle', label: c.rowVehicle, getValue: (p: PolicyForComparison) => {
                        const v = p.acordData?.vehicle
                        // The plate through the shared identity primitive, so a
                        // masked value («XXXX») renders as nothing rather than as
                        // data, and no second file knows which field identifies
                        // a motor policy (P5-wallet-01).
                        const plate = policyAssetIdentifier(p)
                        const name = v ? `${v.make || ''} ${v.model || ''}`.trim() : ''
                        return [name, plate ? `(${plate})` : ''].filter(Boolean).join(' ') || '—'
                    }
                },
                { key: 'motorTier', label: c.rowCoverageTier, getValue: (p: PolicyForComparison) => {
                    const t = classifyMotorCoverageTier(motorSection(p.acordData)?.coverageTier)
                    return t === 'comprehensive' ? c.tierComprehensive
                        : t === 'third_party_fire_theft' ? c.tierThirdPartyFireTheft
                            : t === 'third_party' ? c.tierThirdParty
                                : (motorSection(p.acordData)?.coverageTier || '—')
                } },
            ]
        }

        if (family === 'health') {
            return [
                ...commonRows,
                { key: 'healthAnnual', label: c.rowAnnualLimit, getValue: (p: PolicyForComparison) => money(p.acordData?.health?.annualLimit), highlight: 'highest', rawValue: (p: PolicyForComparison) => p.acordData?.health?.annualLimit ?? null },
                { key: 'healthClass', label: c.rowHospitalClass, getValue: (p: PolicyForComparison) => p.acordData?.health?.hospitalClass || '—' },
            ]
        }

        if (family === 'home') {
            return [
                ...commonRows,
                { key: 'homeSum', label: c.rowSumInsured, getValue: (p: PolicyForComparison) => money(homeSection(p.acordData)?.insuredValue), highlight: 'highest', rawValue: (p: PolicyForComparison) => homeSection(p.acordData)?.insuredValue ?? null },
                { key: 'homeEq', label: c.rowEarthquake, getValue: (p: PolicyForComparison) => yesNo(homeSection(p.acordData)?.catastropheCoverage?.earthquake) },
            ]
        }

        if (family === 'life') {
            return [
                ...commonRows,
                { key: 'lifeDeath', label: c.rowDeathBenefit, getValue: (p: PolicyForComparison) => money(lifeSection(p.acordData)?.deathBenefit), highlight: 'highest', rawValue: (p: PolicyForComparison) => lifeSection(p.acordData)?.deathBenefit ?? null },
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
                            {/* One selected but nothing else of its type to pair with:
                                say so, rather than leave "select more" pointing at a
                                grid with a single, already-selected card. */}
                            {selectedIds.length === 1 &&
                            comparablePolicies.filter(p => !selectedIds.includes(p.id)).length === 0 ? (
                                <p className="text-sm font-medium text-muted-foreground mb-4">
                                    {c.needSameTypeToCompare}
                                </p>
                            ) : (
                                <p className="text-sm font-medium text-muted-foreground mb-4">
                                    {selectedIds.length === 0
                                        ? c.selectFirst
                                        : `${c.selectedPrefix}: ${displayInsurerName(selectedPolicies[0]?.insurerName)} (${selectedPolicies[0] ? normalizeBranch(selectedPolicies[0].lineOfBusiness).label[language] : ''}). ${c.selectMore}`
                                    }
                                </p>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {comparablePolicies.map(policy => {
                                    const isSelected = selectedIds.includes(policy.id)
                                    const firstSelectedLob = policies.find(p => p.id === selectedIds[0])?.lineOfBusiness
                                    const isDisabled = selectedIds.length > 0 &&
                                        branchFamilyId(policy.lineOfBusiness) !== branchFamilyId(firstSelectedLob || '')

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
                                                        {displayInsurerName(policy.insurerName)}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground font-mono">
                                                        {displayPolicyNumber(policy.policyNumber)}
                                                    </p>
                                                    {/* WHICH policy is this? The picker showed only
                                                        insurer + number, so choosing between two
                                                        motor policies meant choosing between two
                                                        identical cards — on the one screen whose
                                                        whole job is telling them apart. */}
                                                    {(() => {
                                                        const identity = policyRowIdentity(policy)
                                                        return identity.kind === "asset" || identity.kind === "person" ? (
                                                            <p
                                                                className="text-xs text-muted-foreground truncate"
                                                                data-fact="asset.identifier"
                                                                data-fact-subject={policy.id}
                                                            >
                                                                {identity.value}
                                                            </p>
                                                        ) : null
                                                    })()}
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
                                        <th scope="col" className="py-4 px-4 text-left w-40"><span className="sr-only">{c.rowInsurer}</span></th>
                                        {selectedPolicies.map(policy => (
                                            <th scope="col" key={policy.id} className="py-4 px-6 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <span className="text-3xl">{getPolicyTypeIcon(policy.lineOfBusiness)}</span>
                                                    <span className="font-bold text-foreground">
                                                        {displayInsurerName(policy.insurerName)}
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
                                            <th scope="row" className="py-4 px-4 text-left text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                                {row.label}
                                            </th>
                                            {(() => {
                                                // Which cell (if any) is the best in this row — lowest for
                                                // premium, HIGHEST for cover figures (annual limit, sum
                                                // insured, death benefit). Only star when at least two
                                                // policies have a value AND they are not all equal, so an
                                                // identical row isn't cluttered with stars.
                                                const rawOf = (p: PolicyForComparison) =>
                                                    (row as any).rawValue ? (row as any).rawValue(p) as number | null : null
                                                const nums = selectedPolicies
                                                    .map(rawOf)
                                                    .filter((v): v is number => typeof v === 'number')
                                                const best = !(row as any).highlight || nums.length < 2 || new Set(nums).size < 2
                                                    ? null
                                                    : (row as any).highlight === 'lowest' ? Math.min(...nums) : Math.max(...nums)
                                                return selectedPolicies.map(policy => {
                                                    const value = row.getValue(policy)
                                                    const raw = rawOf(policy)
                                                    const isBest = best !== null && typeof raw === 'number' && raw === best
                                                    return (
                                                        <td key={policy.id} className={`py-4 px-6 text-center ${isBest ? 'bg-primary-tint dark:bg-primary/15' : ''}`}>
                                                            {(row as any).isStatus ? (
                                                                (() => {
                                                                    const view = getPolicyStatusView(policy, t)
                                                                    return <StatusPill tone={view.tone} label={view.label} icon={false} />
                                                                })()
                                                            ) : (
                                                                <span className={`text-sm ${isBest ? 'text-primary dark:text-mint font-bold' : 'text-foreground'}`}>
                                                                    {value}
                                                                    {isBest && (
                                                                        <span className="ml-1">
                                                                            <span aria-hidden="true">⭐</span>
                                                                            <span className="sr-only">
                                                                                {' '}{(row as any).highlight === 'lowest' ? c.bestLowest : c.bestHighest}
                                                                            </span>
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            )}
                                                        </td>
                                                    )
                                                })
                                            })()}
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
                                                <p className="text-lg font-bold text-primary dark:text-mint">{displayInsurerName(lowest.insurerName)}</p>
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
                                                <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{displayInsurerName(soonest.insurerName)}</p>
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
            {/* H-006/H-007: this surface compares AI-extracted coverage. Once per
                screen, the reader is told what that is and who to ask. */}
            <AiDisclaimer variant="inline" />
        </div>
    )
}
