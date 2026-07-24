"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Shield, Calendar, TrendingUp, Eye, EyeOff, Filter, Plus, FileText } from "lucide-react"
import { BrandCard } from "@/components/ui/brand/BrandCard"
import { BrandActionButton } from "@/components/ui/brand/BrandActionButton"
import { EmptyState, PolicyPreviewRow } from "@/components/ui/EmptyState"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatCurrencyCompact, formatCurrencyFull, formatDateGreek } from "@/lib/agent/format"
import type { Policy } from "../types"
import type { ViewerRole } from "@/components/collaboration/types"

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

const LOB_LABELS: Record<string, { en: string; el: string }> = {
    motor: { en: "Motor", el: "Αυτοκίνητο" },
    health: { en: "Health", el: "Υγεία" },
    home: { en: "Home", el: "Κατοικία" },
    life: { en: "Life", el: "Ζωή" },
    travel: { en: "Travel", el: "Ταξίδι" },
}

const TAB_COPY = {
    allTypes: { el: "Όλοι οι τύποι", en: "All types" },
    allStatuses: { el: "Όλες οι καταστάσεις", en: "All statuses" },
    commission: { el: "Προμήθειες", en: "Commission" },
    add: { el: "Προσθήκη", en: "Add" },
    commissionUnit: { el: "προμήθεια", en: "commission" },
    managedByYou: { el: "Διαχειριζόμενο από εσάς", en: "Managed by you" },
} as const

const STATUS_STYLES: Record<string, string> = {
    active: "bg-primary-soft text-[#166534] dark:bg-primary/15 dark:text-mint",
    expiring_soon: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    // Expired is a calendar fact, not an alarm — same amber language as the
    // policyholder surfaces (never green, never a red siren).
    expired: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    unknown_duration: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
    action_needed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    cancelled: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
    analyzing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    incomplete: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
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
            {/* Filters and actions */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-neutral-400" />
                    <select
                        value={filterLob || ""}
                        onChange={(e) => setFilterLob(e.target.value || null)}
                        className="pw-input pw-input-sm"
                    >
                        <option value="">{TAB_COPY.allTypes[language]}</option>
                        {uniqueLobs.map((lob) => (
                            <option key={lob} value={lob}>
                                {LOB_LABELS[lob]?.[language] || lob}
                            </option>
                        ))}
                    </select>
                    <select
                        value={filterStatus || ""}
                        onChange={(e) => setFilterStatus(e.target.value || null)}
                        className="pw-input pw-input-sm"
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
                            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer"
                        >
                            {showCommission ? (
                                <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                                <Eye className="h-3.5 w-3.5" />
                            )}
                            {TAB_COPY.commission[language]}
                        </button>
                    )}
                    {onUploadPolicy && (
                        <BrandActionButton onClick={onUploadPolicy} variant="secondary" className="text-xs py-1.5">
                            <Plus className="h-3.5 w-3.5" />
                            {TAB_COPY.add[language]}
                        </BrandActionButton>
                    )}
                </div>
            </div>

            {/* Policy list */}
            {filteredPolicies.length === 0 ? (
                /* "No policies at all" is handled above. This is the other empty
                   state: both filters offer only values present in the data, but
                   they combine, so type=motor + status=expired can match nothing
                   on a client who holds an active motor policy and an expired
                   health one. That rendered a blank strip under the filters with
                   no explanation and no way back. */
                <div className="rounded-xl border border-dashed border-neutral-200 dark:border-neutral-700 px-4 py-8 text-center">
                    <p className="text-sm text-muted-foreground">{t.emptyStates.clientPolicies.noFilterMatch}</p>
                    <button
                        type="button"
                        onClick={() => { setFilterLob(null); setFilterStatus(null) }}
                        className="mt-3 text-xs font-semibold text-primary dark:text-mint hover:underline"
                    >
                        {t.emptyStates.clearFilters}
                    </button>
                </div>
            ) : (
            <div className="space-y-2">
                {filteredPolicies.map((policy) => {
                    const commissionRate = commissionRates?.[policy.lineOfBusiness] || 0
                    const lobLabel = LOB_LABELS[policy.lineOfBusiness]?.[language] || policy.lineOfBusiness
                    // The detail page re-checks getPolicyAccess server-side, so a
                    // link here can never widen access — it only stops hiding a
                    // page the agent is already entitled to open.
                    const canOpen = viewerRole === "agent" && !!customerId

                    return (
                        <BrandCard
                            key={policy.policyId}
                            className={`p-4 relative ${canOpen ? "transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03] focus-within:ring-2 focus-within:ring-primary" : ""}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft dark:bg-primary/15">
                                    <Shield className="h-5 w-5 text-primary dark:text-mint" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold text-foreground">
                                            {canOpen ? (
                                                // Stretched link: the whole card is the hit target, but the
                                                // anchor stays a real <a> (middle-click / open-in-new-tab
                                                // work) and is not nested inside the branded-report anchor.
                                                <Link
                                                    href={`/customers/${customerId}/policy/${policy.policyId}`}
                                                    aria-label={`${lobLabel} · ${policy.insurerName} · ${policy.policyNumber}`}
                                                    className="after:absolute after:inset-0 after:rounded-2xl focus:outline-none"
                                                >
                                                    {lobLabel}
                                                </Link>
                                            ) : (
                                                lobLabel
                                            )}
                                        </p>
                                        <span className={`rounded-full px-2 py-0.5 text-kicker font-medium ${STATUS_STYLES[policy.status] || STATUS_STYLES.incomplete}`}>
                                            {(STATUS_LABELS[policy.status] || STATUS_LABELS.incomplete)[language]}
                                        </span>
                                        {policy.managedByAgent && (
                                            <span className="rounded-full px-2 py-0.5 text-kicker font-medium bg-primary-soft text-[#166534] dark:bg-primary/15 dark:text-mint">
                                                {TAB_COPY.managedByYou[language]}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {policy.insurerName}
                                        {policy.carPlate && ` · ${policy.carPlate}`}
                                    </p>
                                </div>

                                <div className="text-right">
                                    <div className="flex items-center gap-1 text-xs text-neutral-400">
                                        <Calendar className="h-3 w-3" />
                                        {formatDateGreek(policy.endDate)}
                                    </div>
                                    {showCommission && viewerRole === "agent" && commissionRate > 0 && (
                                        <p className="text-kicker font-medium text-primary dark:text-mint mt-0.5">
                                            {commissionRate}% {TAB_COPY.commissionUnit[language]}
                                        </p>
                                    )}
                                </div>

                                {/* Inline actions — z-10 keeps them clickable above the
                                    card-wide stretched link. */}
                                <div className="relative z-10 flex items-center gap-1.5">
                                    {/* Branded report — agent-only, needs a completed
                                        analysis and a Pro+ plan. Opens the print-ready
                                        HTML in a new tab (agent saves / shares as PDF). */}
                                    {viewerRole === "agent" && canBrandedReport && policy.hasAnalysis && (
                                        <a
                                            href={`/api/v1/agent/policies/${policy.policyId}/branded-report`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer flex items-center gap-1"
                                        >
                                            <FileText className="h-3 w-3" />
                                            {t.agentUi.brandedReport}
                                        </a>
                                    )}
                                    {/* A button labelled "Renew" used to be the ONLY route into
                                        the policy detail page, and it rendered only within 30 days
                                        of expiry — so an agent could not open a policy expiring in
                                        60 days, or an expired one, at all. It also navigated to a
                                        page that offers no renewal action, only review and edit.
                                        The card itself is now the link; the expiry state is already
                                        carried honestly by the status badge above. */}
                                </div>
                            </div>
                        </BrandCard>
                    )
                })}
            </div>
            )}
        </div>
    )
}
