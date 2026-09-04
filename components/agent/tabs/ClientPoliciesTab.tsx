"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Shield, Calendar, TrendingUp, Eye, EyeOff, Filter, Plus, FileText } from "lucide-react"
import { CardHead } from "@/components/dashboard/home/CardHead"
import { EmptyState, PolicyPreviewRow } from "@/components/ui/EmptyState"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatCurrencyCompact, formatCurrencyFull, formatDateShort } from "@/lib/agent/format"
import type { Policy } from "../types"
import type { ViewerRole } from "@/components/collaboration/types"
import { branchLabel } from '@/lib/insurance/taxonomy'
import { displayInsurerName, displayPolicyNumber } from '@/lib/wallet/policy-identity'

interface ClientPoliciesTabProps {
    policies: Policy[]
    /** Owner of these policies — needed to build the agent policy-detail URL. */
    customerId?: string
    viewerRole: ViewerRole
    commissionRates?: Record<string, number>
    /** True when the viewing agent's plan includes branded reports (Pro+). */
    canBrandedReport?: boolean
    onUploadPolicy?: () => void
}

// Was a hand-kept map of five lines, so anything outside it — motorbike, truck,
// renters, pet, liability, legal expenses, every business line — rendered its raw
// id ("motorbike") to the agent. lib/insurance/taxonomy already owns these
// labels, in both languages, for the whole vocabulary.

const TAB_COPY = {
    allTypes: { el: "Όλοι οι τύποι", en: "All types" },
    allStatuses: { el: "Όλες οι καταστάσεις", en: "All statuses" },
    commission: { el: "Προμήθειες", en: "Commission" },
    add: { el: "Προσθήκη", en: "Add" },
    commissionUnit: { el: "προμήθεια", en: "commission" },
    managedByYou: { el: "Διαχειριζόμενο από εσάς", en: "Managed by you" },
    policies: { el: "Ασφαλιστήρια", en: "Policies" },
} as const

// Status pills on the status TOKENS, the state as a word.
const STATUS_STYLES: Record<string, string> = {
    active: "bg-status-success-tint text-status-success",
    expiring_soon: "bg-status-warning-tint text-status-warning",
    // Expired is a calendar fact, not an alarm — same amber language as the
    // policyholder surfaces (never green, never a red siren).
    expired: "bg-status-warning-tint text-status-warning",
    unknown_duration: "bg-muted text-muted-foreground",
    action_needed: "bg-status-danger-tint text-status-danger",
    cancelled: "bg-muted text-muted-foreground",
    analyzing: "bg-status-info-tint text-status-info",
    incomplete: "bg-muted text-muted-foreground",
}

const STATUS_LABELS: Record<string, { el: string; en: string }> = {
    active: { el: "Ενεργό", en: "Active" },
    expiring_soon: { el: "Λήγει σύντομα", en: "Expiring soon" },
    expired: { el: "Ληγμένο", en: "Expired" },
    unknown_duration: { el: "Άγνωστη διάρκεια", en: "Unknown duration" },
    action_needed: { el: "Απαιτείται ενέργεια", en: "Action needed" },
    cancelled: { el: "Ακυρωμένο", en: "Cancelled" },
    analyzing: { el: "Ανάλυση…", en: "Analyzing…" },
    incomplete: { el: "Ελλιπές", en: "Incomplete" },
}

export function ClientPoliciesTab({
    policies,
    customerId,
    viewerRole,
    commissionRates,
    canBrandedReport = false,
    onUploadPolicy,
}: ClientPoliciesTabProps) {
    const { language, t } = useLanguage()
    const [showCommission, setShowCommission] = useState(false)
    const [filterLob, setFilterLob] = useState<string | null>(null)
    const [filterStatus, setFilterStatus] = useState<string | null>(null)

    const filteredPolicies = policies.filter((p) => {
        if (filterLob && p.lineOfBusiness !== filterLob) return false
        if (filterStatus && p.status !== filterStatus) return false
        return true
    })

    const uniqueLobs = [...new Set(policies.map((p) => p.lineOfBusiness))]
    const uniqueStatuses = [...new Set(policies.map((p) => p.status))]

    if (policies.length === 0) {
        return (
            <EmptyState
                icon={Shield}
                headline={t.emptyStates.clientPolicies.headline}
                description={t.emptyStates.clientPolicies.description}
                cta={onUploadPolicy ? { label: t.emptyStates.clientPolicies.cta, onClick: onUploadPolicy } : undefined}
                previewLabel={t.emptyStates.example}
                preview={
                    <PolicyPreviewRow
                        name={t.emptyStates.clientPolicies.exampleName}
                        meta={t.emptyStates.clientPolicies.exampleMeta}
                        statusLabel={t.emptyStates.clientPolicies.exampleStatus}
                    />
                }
            />
        )
    }

    return (
        <div className="space-y-4">
            {/* Filters and actions — selects on the input recipe, the two
                actions as soft pills (the page's primary lives in the FAB). */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <select
                        value={filterLob || ""}
                        onChange={(e) => setFilterLob(e.target.value || null)}
                        className="pw-input pw-input-sm w-auto"
                    >
                        <option value="">{TAB_COPY.allTypes[language]}</option>
                        {uniqueLobs.map((lob) => (
                            <option key={lob} value={lob}>
                                {branchLabel(lob, language === 'el' ? 'el' : 'en')}
                            </option>
                        ))}
                    </select>
                    <select
                        value={filterStatus || ""}
                        onChange={(e) => setFilterStatus(e.target.value || null)}
                        className="pw-input pw-input-sm w-auto"
                    >
                        <option value="">{TAB_COPY.allStatuses[language]}</option>
                        {uniqueStatuses.map((status) => (
                            <option key={status} value={status}>
                                {(STATUS_LABELS[status] || STATUS_LABELS.incomplete)[language]}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    {viewerRole === "agent" && commissionRates && (
                        <button
                            type="button"
                            onClick={() => setShowCommission(!showCommission)}
                            aria-pressed={showCommission}
                            className="pw-soft-button"
                        >
                            {showCommission ? (
                                <EyeOff className="h-4 w-4" aria-hidden="true" />
                            ) : (
                                <Eye className="h-4 w-4" aria-hidden="true" />
                            )}
                            {TAB_COPY.commission[language]}
                        </button>
                    )}
                    {onUploadPolicy && (
                        <button type="button" onClick={onUploadPolicy} className="pw-soft-button">
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            {TAB_COPY.add[language]}
                        </button>
                    )}
                </div>
            </div>

            {/* Policy list — ONE card of sub-card rows. */}
            <section className="pw-card pw-pad">
                <CardHead
                    as="h3"
                    icon={Shield}
                    title={TAB_COPY.policies[language]}
                    meta={<span className="tabular-nums">{filteredPolicies.length}</span>}
                />
                {filteredPolicies.length === 0 ? (
                    /* "No policies at all" is handled above. This is the other empty
                       state: both filters offer only values present in the data, but
                       they combine, so type=motor + status=expired can match nothing
                       on a client who holds an active motor policy and an expired
                       health one. That rendered a blank strip under the filters with
                       no explanation and no way back. */
                    <div className="pw-subcard mt-4 px-4 py-8 text-center">
                        <p className="text-sm text-muted-foreground">{t.emptyStates.clientPolicies.noFilterMatch}</p>
                        <button
                            type="button"
                            onClick={() => { setFilterLob(null); setFilterStatus(null) }}
                            className="mt-3 inline-flex min-h-9 items-center text-caption font-semibold text-primary hover:underline dark:text-mint"
                        >
                            {t.emptyStates.clearFilters}
                        </button>
                    </div>
                ) : (
                <ul className="mt-4 space-y-2">
                    {filteredPolicies.map((policy) => {
                        const commissionRate = commissionRates?.[policy.lineOfBusiness] || 0
                        const lobLabel = branchLabel(policy.lineOfBusiness, language === 'el' ? 'el' : 'en')
                        // The detail page re-checks getPolicyAccess server-side, so a
                        // link here can never widen access — it only stops hiding a
                        // page the agent is already entitled to open.
                        const canOpen = viewerRole === "agent" && !!customerId

                        return (
                            <li
                                key={policy.policyId}
                                className={`pw-subcard relative flex items-center gap-3 p-3 ${canOpen ? "transition-colors hover:bg-muted focus-within:ring-2 focus-within:ring-primary" : ""}`}
                            >
                                <span className="pw-card-chip" aria-hidden="true">
                                    <Shield className="h-4 w-4" strokeWidth={1.75} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-semibold text-foreground">
                                            {canOpen ? (
                                                // Stretched link: the whole row is the hit target, but the
                                                // anchor stays a real <a> (middle-click / open-in-new-tab
                                                // work) and is not nested inside the branded-report anchor.
                                                <Link
                                                    href={`/customers/${customerId}/policy/${policy.policyId}`}
                                                    aria-label={[lobLabel, displayInsurerName(policy.insurerName), displayPolicyNumber(policy.policyNumber)].filter(Boolean).join(' · ')}
                                                    className="after:absolute after:inset-0 after:rounded-[14px] focus:outline-none"
                                                >
                                                    {lobLabel}
                                                </Link>
                                            ) : (
                                                lobLabel
                                            )}
                                        </p>
                                        <span className={`rounded-full px-2 py-0.5 text-caption font-semibold ${STATUS_STYLES[policy.status] || STATUS_STYLES.incomplete}`}>
                                            {(STATUS_LABELS[policy.status] || STATUS_LABELS.incomplete)[language]}
                                        </span>
                                        {policy.managedByAgent && (
                                            <span className="rounded-full bg-status-success-tint px-2 py-0.5 text-caption font-semibold text-status-success">
                                                {TAB_COPY.managedByYou[language]}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-caption text-muted-foreground">
                                        {displayInsurerName(policy.insurerName)}
                                        {policy.assetLabel && ` · ${policy.assetLabel}`}
                                    </p>
                                </div>

                                <div className="text-right">
                                    <p className="flex items-center justify-end gap-1 text-caption text-muted-foreground">
                                        <Calendar className="h-3 w-3" aria-hidden="true" />
                                        {formatDateShort(policy.endDate, language)}
                                    </p>
                                    {showCommission && viewerRole === "agent" && commissionRate > 0 && (
                                        <p className="mt-0.5 text-caption font-semibold text-primary dark:text-mint">
                                            {commissionRate}% {TAB_COPY.commissionUnit[language]}
                                        </p>
                                    )}
                                </div>

                                {/* Inline actions — z-10 keeps them clickable above the
                                    row-wide stretched link. */}
                                <div className="relative z-10 flex items-center gap-1.5">
                                    {/* Branded report — agent-only, needs a completed
                                        analysis and a Pro+ plan. Opens the print-ready
                                        HTML in a new tab (agent saves / shares as PDF). */}
                                    {viewerRole === "agent" && canBrandedReport && policy.hasAnalysis && (
                                        <a
                                            href={`/api/v1/agent/policies/${policy.policyId}/branded-report`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="pw-soft-button bg-card"
                                        >
                                            <FileText className="h-4 w-4" aria-hidden="true" />
                                            {t.agentUi.brandedReport}
                                        </a>
                                    )}
                                    {/* A button labelled "Renew" used to be the ONLY route into
                                        the policy detail page, and it rendered only within 30 days
                                        of expiry — so an agent could not open a policy expiring in
                                        60 days, or an expired one, at all. It also navigated to a
                                        page that offers no renewal action, only review and edit.
                                        The row itself is now the link; the expiry state is already
                                        carried honestly by the status badge above. */}
                                </div>
                            </li>
                        )
                    })}
                </ul>
                )}
            </section>
        </div>
    )
}
