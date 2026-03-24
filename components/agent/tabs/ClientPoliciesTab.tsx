"use client"

import React, { useState } from "react"
import { Shield, Calendar, RefreshCw, TrendingUp, Eye, EyeOff, Filter, Plus } from "lucide-react"
import { BrandCard } from "@/components/ui/brand/BrandCard"
import { BrandActionButton } from "@/components/ui/brand/BrandActionButton"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatCurrencyCompact, formatCurrencyFull, formatDateGreek } from "@/lib/agent/format"
import type { Policy } from "../types"
import type { ViewerRole } from "@/components/collaboration/types"

interface ClientPoliciesTabProps {
    policies: Policy[]
    viewerRole: ViewerRole
    commissionRates?: Record<string, number>
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

const STATUS_STYLES: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    expiring_soon: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    expired: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    incomplete: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
}

export function ClientPoliciesTab({
    policies,
    viewerRole,
    commissionRates,
    onRenewPolicy,
    onUploadPolicy,
}: ClientPoliciesTabProps) {
    const { language } = useLanguage()
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
            <BrandCard className="p-8">
                <div className="flex flex-col items-center text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/30">
                        <Shield className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {language === "el"
                            ? "Δεν υπάρχουν ασφαλιστήρια ακόμα"
                            : "No policies linked yet"}
                    </p>
                    {onUploadPolicy && (
                        <BrandActionButton onClick={onUploadPolicy} className="mt-4 text-sm">
                            <Plus className="h-4 w-4" />
                            {language === "el" ? "Προσθήκη Ασφαλιστηρίου" : "Add Policy"}
                        </BrandActionButton>
                    )}
                </div>
            </BrandCard>
        )
    }

    return (
        <div className="space-y-4">
            {/* Filters and actions */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <select
                        value={filterLob || ""}
                        onChange={(e) => setFilterLob(e.target.value || null)}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300"
                    >
                        <option value="">{language === "el" ? "Όλοι οι τύποι" : "All types"}</option>
                        {uniqueLobs.map((lob) => (
                            <option key={lob} value={lob}>
                                {LOB_LABELS[lob]?.[language] || lob}
                            </option>
                        ))}
                    </select>
                    <select
                        value={filterStatus || ""}
                        onChange={(e) => setFilterStatus(e.target.value || null)}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300"
                    >
                        <option value="">{language === "el" ? "Όλες οι καταστάσεις" : "All statuses"}</option>
                        {uniqueStatuses.map((status) => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    {viewerRole === "agent" && commissionRates && (
                        <button
                            type="button"
                            onClick={() => setShowCommission(!showCommission)}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                            {showCommission ? (
                                <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                                <Eye className="h-3.5 w-3.5" />
                            )}
                            {language === "el" ? "Προμήθειες" : "Commission"}
                        </button>
                    )}
                    {onUploadPolicy && (
                        <BrandActionButton onClick={onUploadPolicy} variant="secondary" className="text-xs py-1.5">
                            <Plus className="h-3.5 w-3.5" />
                            {language === "el" ? "Προσθήκη" : "Add"}
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
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-900/30">
                                    <Shield className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                            {LOB_LABELS[policy.lineOfBusiness]?.[language] || policy.lineOfBusiness}
                                        </p>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[policy.status] || STATUS_STYLES.active}`}>
                                            {policy.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {policy.insurerName}
                                        {policy.carPlate && ` · ${policy.carPlate}`}
                                    </p>
                                </div>

                                <div className="text-right">
                                    <div className="flex items-center gap-1 text-xs text-slate-400">
                                        <Calendar className="h-3 w-3" />
                                        {formatDateGreek(policy.endDate)}
                                    </div>
                                    {showCommission && viewerRole === "agent" && commissionRate > 0 && (
                                        <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                                            {commissionRate}% {language === "el" ? "προμήθεια" : "commission"}
                                        </p>
                                    )}
                                </div>

                                {/* Inline actions */}
                                <div className="flex items-center gap-1.5">
                                    {daysToExpiry <= 30 && daysToExpiry >= 0 && onRenewPolicy && (
                                        <button
                                            type="button"
                                            onClick={() => onRenewPolicy(policy.policyId)}
                                            className="rounded-lg bg-teal-50 dark:bg-teal-900/30 px-3 py-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition cursor-pointer flex items-center gap-1"
                                        >
                                            <RefreshCw className="h-3 w-3" />
                                            {language === "el" ? "Ανανέωση" : "Renew"}
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
