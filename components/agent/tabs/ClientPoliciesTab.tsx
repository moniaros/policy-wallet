"use client"

import React, { useState } from "react"
import { Shield, Calendar, RefreshCw, TrendingUp, Eye, EyeOff, Filter, Plus, FileText } from "lucide-react"
import { BrandCard } from "@/components/ui/brand/BrandCard"
import { BrandActionButton } from "@/components/ui/brand/BrandActionButton"
import { EmptyState, PolicyPreviewRow } from "@/components/ui/EmptyState"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatCurrencyCompact, formatCurrencyFull, formatDateGreek } from "@/lib/agent/format"
import type { Policy } from "../types"
import type { ViewerRole } from "@/components/collaboration/types"

interface ClientPoliciesTabProps {
    policies: Policy[]
    viewerRole: ViewerRole
    commissionRates?: Record<string, number>
    /** True when the viewing agent's plan includes branded reports (Pro+). */
    canBrandedReport?: boolean
    onRenewPolicy?: (policyId: string) => void
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
    renew: { el: "Ανανέωση", en: "Renew" },
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
    viewerRole,
    commissionRates,
    canBrandedReport = false,
    onRenewPolicy,
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
                        className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-300"
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
                        className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-300"
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
            <div className="space-y-2">
                {filteredPolicies.map((policy) => {
                    const commissionRate = commissionRates?.[policy.lineOfBusiness] || 0
                    const daysToExpiry = Math.floor(
                        (new Date(policy.endDate).getTime() - Date.now()) / 86_400_000
                    )

                    return (
                        <BrandCard key={policy.policyId} className="p-4">
                            <div className="flex items-center gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft dark:bg-primary/15">
                                    <Shield className="h-5 w-5 text-primary dark:text-mint" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold text-foreground">
                                            {LOB_LABELS[policy.lineOfBusiness]?.[language] || policy.lineOfBusiness}
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

                                {/* Inline actions */}
                                <div className="flex items-center gap-1.5">
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
                                    {daysToExpiry <= 30 && daysToExpiry >= 0 && onRenewPolicy && (
                                        <button
                                            type="button"
                                            onClick={() => onRenewPolicy(policy.policyId)}
                                            className="rounded-lg bg-primary-soft dark:bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary dark:text-mint hover:bg-primary/20 dark:hover:bg-primary/25 transition cursor-pointer flex items-center gap-1"
                                        >
                                            <RefreshCw className="h-3 w-3" />
                                            {TAB_COPY.renew[language]}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </BrandCard>
                    )
                })}
            </div>
        </div>
    )
}
