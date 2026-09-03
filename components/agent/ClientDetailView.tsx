"use client"

import React, { useState } from "react"
import { ArrowLeft, LayoutDashboard, Shield, Activity, Euro } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { useTabs } from "@/hooks/useTabs"
import { Skeleton } from "@/components/ui/skeleton"
import { ClientOverviewTab } from "./tabs/ClientOverviewTab"
import { ClientPoliciesTab } from "./tabs/ClientPoliciesTab"
import { ClientActivityTab } from "./tabs/ClientActivityTab"
import { ClientFinancialsTab } from "./tabs/ClientFinancialsTab"
import { ProtectionScoreTrendCard } from "./ProtectionScoreTrendCard"
import type { Customer, Policy, Opportunity, Interaction } from "./types"
import type { ViewerRole } from "@/components/collaboration/types"
import type { AgentTier } from "@/types/subscription-entitlements"

type TabId = "overview" | "policies" | "activity" | "financials"

const TAB_COPY = {
    overview: { el: "Επισκόπηση", en: "Overview" },
    policies: { el: "Ασφαλιστήρια", en: "Policies" },
    activity: { el: "Δραστηριότητα", en: "Activity" },
    financials: { el: "Οικονομικά", en: "Financials" },
    tablistLabel: { el: "Ενότητες πελάτη", en: "Client sections" },
} as const

const pick = (pair: { el: string; en: string }, language: string) =>
    language === "el" ? pair.el : pair.en

interface ClientDetailViewProps {
    customer: Customer
    viewerRole: ViewerRole
    agentTier: AgentTier
    /** True when the viewing agent's plan includes branded reports (Pro+). */
    canBrandedReport?: boolean
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
    onUploadPolicy?: () => void
    onSendQuestionnaire?: () => void
    /** Rendered under the tab panel, inside the same page container (the
        profile's collaboration cards) — so the page has ONE column. */
    children?: React.ReactNode
}

export function ClientDetailView({
    customer,
    viewerRole,
    agentTier,
    canBrandedReport = false,
    healthScore,
    policies,
    opportunities,
    interactions,
    commissionRates,
    financials,
    onBack,
    onCreateProposal,
    onUploadPolicy,
    onSendQuestionnaire,
    children,
}: ClientDetailViewProps) {
    const { language, t } = useLanguage()
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

    const { tabProps, panelProps } = useTabs(
        visibleTabs.map((t) => t.id),
        activeTab,
        setActiveTab
    )

    const initials = `${customer.name.charAt(0)}${customer.surname.charAt(0)}`.toUpperCase()

    return (
        <div className="pw-page-shell">
            <div className="mx-auto max-w-page space-y-4 px-4 pb-32 pt-6 sm:px-6 lg:px-8 lg:pt-8">
                {/* The person as a card head — back · avatar · name and contact —
                    with the sections as a segmented tablist under it. */}
                <section className="pw-card pw-pad">
                    <div className="flex items-center gap-3">
                        {onBack && (
                            <button
                                type="button"
                                onClick={onBack}
                                aria-label={t.common.back}
                                className="pw-soft-button h-11 w-11 shrink-0 px-0"
                            >
                                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                            </button>
                        )}
                        {customer.avatar ? (
                            <img
                                src={customer.avatar}
                                alt=""
                                aria-hidden="true"
                                className="h-12 w-12 shrink-0 rounded-full object-cover"
                            />
                        ) : (
                            <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary-soft text-base font-semibold text-primary dark:bg-primary/15 dark:text-mint">
                                {initials}
                            </span>
                        )}
                        <div className="min-w-0">
                            <h1 className="text-title font-semibold text-foreground">
                                {customer.name} {customer.surname}
                            </h1>
                            <p className="text-caption text-muted-foreground">
                                {customer.email}
                                {customer.phone && ` · ${customer.phone}`}
                            </p>
                        </div>
                    </div>

                    {/* Tabs.
                        - Real tablist semantics: role tablist/tab, aria-selected,
                          aria-controls, roving tabindex + arrow keys (they were
                          plain buttons a screen reader announced as unrelated).
                        - On the segmented recipe, which reads aria-selected for the
                          active look. `pw-scroll-strip` is the scrolling primitive;
                          the literal `overflow-x-auto` stays beside it because
                          client-detail-tabs pins the token. */}
                    <div
                        role="tablist"
                        aria-label={pick(TAB_COPY.tablistLabel, language)}
                        className="pw-segmented pw-scroll-strip mt-4 overflow-x-auto"
                    >
                        {visibleTabs.map((tab) => {
                            const Icon = tab.icon
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    {...tabProps(tab.id)}
                                    className="pw-segment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                >
                                    <Icon className="h-4 w-4" aria-hidden="true" />
                                    {tab.label}
                                </button>
                            )
                        })}
                    </div>
                </section>

                {/* Tab Content — each pane is a labelled tabpanel bound to its tab. */}
                <div {...panelProps} className="space-y-4 focus-visible:outline-none">
                    {activeTab === "overview" && (
                        <div className="space-y-4">
                            <ClientOverviewTab
                                customer={customer}
                                healthScore={healthScore}
                                policies={policies}
                                opportunities={opportunities}
                                onCreateProposal={onCreateProposal}
                            />
                            {/* Renders nothing until this client has score history —
                                an empty chart says less than no chart. Self-fetching
                                so a trend failure cannot take the profile down. */}
                            <ProtectionScoreTrendCard customerId={customer.id} />
                        </div>
                    )}
                    {activeTab === "policies" && (
                        <ClientPoliciesTab
                            policies={policies}
                            viewerRole={viewerRole}
                            commissionRates={commissionRates}
                            canBrandedReport={canBrandedReport}
                            customerId={customer.id}
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

                {children}
            </div>
        </div>
    )
}

export function ClientDetailViewSkeleton() {
    return (
        <div className="pw-page-shell">
            <div className="mx-auto max-w-page space-y-4 px-4 pb-32 pt-6 sm:px-6 lg:px-8 lg:pt-8">
                <div className="pw-card pw-pad">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div>
                            <Skeleton className="h-6 w-40" />
                            <Skeleton className="mt-1 h-4 w-56" />
                        </div>
                    </div>
                    <div className="mt-4 flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                            <Skeleton key={i} className="h-10 w-28 rounded-full" />
                        ))}
                    </div>
                </div>
                <Skeleton className="h-96 w-full rounded-2xl" />
            </div>
        </div>
    )
}
