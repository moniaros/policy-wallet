"use client"

import React, { useState } from "react"
import { ArrowLeft, LayoutDashboard, Shield, Activity, Euro } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { Skeleton } from "@/components/ui/skeleton"
import { ClientOverviewTab } from "./tabs/ClientOverviewTab"
import { ClientPoliciesTab } from "./tabs/ClientPoliciesTab"
import { ClientActivityTab } from "./tabs/ClientActivityTab"
import { ClientFinancialsTab } from "./tabs/ClientFinancialsTab"
import type { Customer, Policy, Opportunity, Interaction } from "./types"
import type { ViewerRole } from "@/components/collaboration/types"
import type { AgentTier } from "@/types/subscription-entitlements"

type TabId = "overview" | "policies" | "activity" | "financials"

const TAB_COPY = {
    overview: { el: "Επισκόπηση", en: "Overview" },
    policies: { el: "Ασφαλιστήρια", en: "Policies" },
    activity: { el: "Δραστηριότητα", en: "Activity" },
    financials: { el: "Οικονομικά", en: "Financials" },
} as const

const pick = (pair: { el: string; en: string }, language: string) =>
    language === "el" ? pair.el : pair.en

interface ClientDetailViewProps {
    customer: Customer
    viewerRole: ViewerRole
    agentTier: AgentTier
    healthScore: number
    policies: Policy[]
    opportunities: Opportunity[]
    interactions: Interaction[]
    commissionRates?: Record<string, number>
    financials?: {
        totalPremiums: number
        premiumsByLob: Record<string, number>
        commissionEarned: number
        commissionProjected: number
        renewalProbability: number
    }
    onBack?: () => void
    onCreateProposal?: (gapId: string) => void
    onRenewPolicy?: (policyId: string) => void
    onUploadPolicy?: () => void
    onSendQuestionnaire?: () => void
}

export function ClientDetailView({
    customer,
    viewerRole,
    agentTier,
    healthScore,
    policies,
    opportunities,
    interactions,
    commissionRates,
    financials,
    onBack,
    onCreateProposal,
    onRenewPolicy,
    onUploadPolicy,
    onSendQuestionnaire,
}: ClientDetailViewProps) {
    const { language } = useLanguage()
    const [activeTab, setActiveTab] = useState<TabId>("overview")

    const tabs: Array<{ id: TabId; label: string; icon: React.ElementType; agentOnly?: boolean }> = [
        {
            id: "overview",
            label: pick(TAB_COPY.overview, language),
            icon: LayoutDashboard,
        },
        {
            id: "policies",
            label: pick(TAB_COPY.policies, language),
            icon: Shield,
        },
        {
            id: "activity",
            label: pick(TAB_COPY.activity, language),
            icon: Activity,
        },
        {
            id: "financials",
            label: pick(TAB_COPY.financials, language),
            icon: Euro,
            agentOnly: true,
        },
    ]

    const visibleTabs = tabs
        // The Financials tab renders nothing without a `financials` prop (no
        // caller supplies one today) — don't show a tab that opens a blank pane.
        .filter((tab) => tab.id !== "financials" || !!financials)
        .filter((tab) => !tab.agentOnly || viewerRole === "agent")

    const initials = `${customer.name.charAt(0)}${customer.surname.charAt(0)}`.toUpperCase()

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950">
            {/* Header */}
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60">
                <div className="max-w-[1200px] mx-auto px-6 py-5">
                    <div className="flex items-center gap-4">
                        {onBack && (
                            <button
                                type="button"
                                onClick={onBack}
                                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            >
                                <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                            </button>
                        )}
                        {customer.avatar ? (
                            <img
                                src={customer.avatar}
                                alt={`${customer.name} ${customer.surname}`}
                                className="h-12 w-12 rounded-full object-cover"
                            />
                        ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-lg font-bold text-primary dark:bg-primary/15 dark:text-mint">
                                {initials}
                            </div>
                        )}
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                                {customer.name} {customer.surname}
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {customer.email}
                                {customer.phone && ` · ${customer.phone}`}
                            </p>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 mt-4 -mb-px">
                        {visibleTabs.map((tab) => {
                            const Icon = tab.icon
                            const isActive = activeTab === tab.id
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl border-b-2 transition cursor-pointer ${
                                        isActive
                                            ? "border-primary dark:border-mint text-primary dark:text-mint bg-white/50 dark:bg-slate-800/50"
                                            : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                                    }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {tab.label}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Tab Content */}
            <div className="max-w-[1200px] mx-auto px-6 py-6">
                {activeTab === "overview" && (
                    <ClientOverviewTab
                        customer={customer}
                        healthScore={healthScore}
                        policies={policies}
                        opportunities={opportunities}
                        onCreateProposal={onCreateProposal}
                    />
                )}
                {activeTab === "policies" && (
                    <ClientPoliciesTab
                        policies={policies}
                        viewerRole={viewerRole}
                        commissionRates={commissionRates}
                        onRenewPolicy={onRenewPolicy}
                        onUploadPolicy={onUploadPolicy}
                    />
                )}
                {activeTab === "activity" && (
                    <ClientActivityTab
                        interactions={interactions}
                        customer={customer}
                    />
                )}
                {activeTab === "financials" && viewerRole === "agent" && financials && (
                    <ClientFinancialsTab
                        financials={financials}
                        agentTier={agentTier}
                    />
                )}
            </div>
        </div>
    )
}

export function ClientDetailViewSkeleton() {
    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950">
            <div className="bg-white/70 dark:bg-slate-900/70 border-b border-slate-200/60 dark:border-slate-800/60">
                <div className="max-w-[1200px] mx-auto px-6 py-5">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div>
                            <Skeleton className="h-6 w-40" />
                            <Skeleton className="h-4 w-56 mt-1" />
                        </div>
                    </div>
                    <div className="flex gap-1 mt-4">
                        {[1, 2, 3, 4].map((i) => (
                            <Skeleton key={i} className="h-10 w-28 rounded-t-xl" />
                        ))}
                    </div>
                </div>
            </div>
            <div className="max-w-[1200px] mx-auto px-6 py-6">
                <Skeleton className="h-96 w-full rounded-2xl" />
            </div>
        </div>
    )
}
