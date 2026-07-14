export const runtime = 'nodejs'

import Link from "next/link"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { getTranslations } from "@/lib/i18n"
import type { User } from "@prisma/client"
import { getProtectionScore } from "@/lib/services/gap-engine"
import { CircleHelp, Upload } from "lucide-react"
import { normalizeBranch } from "@/lib/insurance/taxonomy"
import { getBranchIcon } from "@/lib/insurance/branch-icons"
import { GettingStartedWrapper } from "@/components/dashboard/GettingStartedWrapper"
import { resolveUserEntitlements } from "@/lib/subscription-entitlements"
import { FREE_POLICY_LIMIT } from "@/lib/monetization/feature-gates"
import { UpgradeTriggerCard } from "@/components/monetization/UpgradeTriggerCard"
import { CarriedPlanCard } from "@/components/monetization/CarriedPlanCard"
import { buildBranchOverview } from "@/lib/insurance/branch-page"
import { BranchCoverageMap } from "@/components/branches/BranchCoverageMap"
import { StatTiles } from "@/components/dashboard/home/StatTiles"
import { PortfolioSummaryCard } from "@/components/dashboard/home/PortfolioSummaryCard"
import { RenewalsTimelineCard } from "@/components/dashboard/home/RenewalsTimelineCard"
import { QuickActionsRow } from "@/components/dashboard/home/QuickActionsRow"
import { StatusRow } from "@/components/dashboard/home/StatusRow"
import { CoverageGapsWidget } from "@/components/dashboard/home/CoverageGapsWidget"
import { RecommendedActionsWidget } from "@/components/dashboard/home/RecommendedActionsWidget"
import { effectivePolicyStatus, isPolicyCoverageActive } from "@/lib/policy-status"

function daysUntil(date: Date) {
    return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function formatCurrencyValue(amount: unknown, currency: string = "EUR") {
    if (amount == null) return null
    const numericAmount = typeof amount === "number" ? amount : Number(amount)
    if (!Number.isFinite(numericAmount)) return null

    return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: currency || "EUR",
        maximumFractionDigits: 0,
    }).format(numericAmount)
}

export default async function PolicyholderHomePage({ preloadedDbUser }: { preloadedDbUser?: User } = {}) {
    const dbUser = preloadedDbUser ?? (await getAuthenticatedUser()).dbUser

    if (!preloadedDbUser) {
        // Role-guard only when accessed directly — dashboard/page.tsx already redirects
        const role = (dbUser.roles || "policyholder").split(",")[0]
        if (role !== "policyholder") {
            if (role === "agent") redirect("/dashboard/agent")
            if (role === "admin") redirect("/admin/dashboard")
        }
    }

    const lang: 'el' | 'en' = dbUser.preferredLanguage === 'en' ? 'en' : 'el'
    const isGreek = lang === 'el'
    const t = getTranslations(lang)
    const home = t.dashboard.home

    const policies = await db.policy.findMany({
        where: { ownerUserId: dbUser.id },
        include: { documents: true },
        orderBy: { endDate: "asc" },
    })

    const customerRelationship = await db.customerRelationship.findFirst({
        where: {
            policyholderUserId: dbUser.id,
            status: "active",
        },
        include: { agent: true },
    })

    const entitlements = await resolveUserEntitlements(dbUser.id)
    const isFreeTier = entitlements.tier === "free"

    // Plan picked at signup but never activated (carried through onboarding)
    let carriedPlan: "ph-plus" | "ph-pro" | null = null
    let carriedBilling: "monthly" | "annual" = "monthly"
    if (isFreeTier) {
        const profile = await db.policyholderProfile.findUnique({
            where: { userId: dbUser.id },
            select: { preferences: true },
        })
        const prefs = (profile?.preferences ?? {}) as Record<string, unknown>
        if (prefs.selectedPlan === "ph-plus" || prefs.selectedPlan === "ph-pro") {
            carriedPlan = prefs.selectedPlan
            carriedBilling = prefs.selectedBilling === "annual" ? "annual" : "monthly"
        }
    }

    const now = new Date()
    // Coverage liveness from the REAL end date — the stored status string is
    // never recomputed, so an expired policy would count as protection.
    const activePolicies = policies.filter((policy) => isPolicyCoverageActive(policy))
    const insurerCount = new Set(
        activePolicies.map((policy) => policy.insurerName).filter(Boolean)
    ).size
    const sixMonthsOut = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000)
    const upcomingRenewals = policies
        .filter((policy) => policy.endDate > now && policy.endDate <= sixMonthsOut)
        .sort((a, b) => a.endDate.getTime() - b.endDate.getTime())

    const hasPolicies = policies.length > 0

    const recentDocuments = policies
        .flatMap((policy) =>
            policy.documents.map((document) => ({
                id: document.id,
                policyId: policy.id,
                fileName: document.fileName,
                uploadedAt: document.uploadedAt,
                insurerName: policy.insurerName,
            }))
        )
        .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
        .slice(0, 5)

    const hasHealthPolicy = activePolicies.some((policy) => normalizeBranch(policy.lineOfBusiness).id === "health")

    // Branches where the user holds more than one active policy — surfaced
    // as an honest "worth checking for overlaps" note (the old tile invented
    // a €/year savings figure from a flat 12% multiplier).
    const branchPolicyCounts = new Map<string, number>()
    for (const policy of activePolicies) {
        const branchId = normalizeBranch(policy.lineOfBusiness).id
        branchPolicyCounts.set(branchId, (branchPolicyCounts.get(branchId) ?? 0) + 1)
    }
    const overlapBranchCount = [...branchPolicyCounts.values()].filter((count) => count > 1).length

    // Portfolio summary: total premium + LOB breakdown
    const totalAnnualPremium = activePolicies
        .filter(p => p.premiumAmount != null)
        .reduce((sum, p) => sum + Number(p.premiumAmount ?? 0), 0)
    const lobBreakdown = activePolicies.reduce((acc, p) => {
        const lob = p.lineOfBusiness || 'other'
        if (!acc[lob]) acc[lob] = 0
        acc[lob] += Number(p.premiumAmount ?? 0)
        return acc
    }, {} as Record<string, number>)

    // Gaps inside a lapsed policy are not the user's current risk — same rule
    // as the engine (lib/services/gap-engine) and coverage-insights.
    const livePolicyIds = new Set(activePolicies.map((policy) => policy.id))
    const allOpenGaps = await db.gapInstance.findMany({
        where: {
            policy: { ownerUserId: dbUser.id },
            status: { in: ["open", "detected", "acknowledged"] },
        },
        select: { severity: true, policyId: true },
    })
    const openGaps = allOpenGaps.filter((gap) => !gap.policyId || livePolicyIds.has(gap.policyId))
    const openGapCount = openGaps.length

    // Protection score: prefer cached gap engine score, fallback to legacy penalty-based calculation
    const cachedScore = await getProtectionScore(dbUser.id, 24 * 60 * 60 * 1000).catch(() => null)
    let healthScore: number
    if (cachedScore) {
        healthScore = cachedScore.overallScore
    } else {
        const criticalGaps = openGaps.filter(g => g.severity === "critical").length
        const highGaps = openGaps.filter(g => g.severity === "high").length
        const mediumGaps = openGaps.filter(g => g.severity === "medium").length
        const lowGaps = openGaps.filter(g => g.severity === "low").length
        healthScore = policies.length === 0
            ? 0
            : Math.max(0, Math.min(100, 100 - (criticalGaps * 25 + highGaps * 15 + mediumGaps * 8 + lowGaps * 3)))
    }

    // Getting Started checklist data
    const hasAnalysisRun = await db.policyAnalysisRun.findFirst({
        where: { userId: dbUser.id, status: { in: ["completed", "completed_with_warnings"] } },
        select: { id: true },
    })
    const hasNotificationPref = await db.notificationPreference.findFirst({
        where: { userId: dbUser.id, enabled: true },
        select: { id: true },
    })

    // Precomputed view models — components stay presentational
    const portfolioChips = Object.entries(lobBreakdown)
        .filter(([, amount]) => amount > 0)
        .sort(([, a], [, b]) => b - a)
        .map(([lob, amount]) => {
            const branch = normalizeBranch(lob)
            return {
                id: lob,
                icon: getBranchIcon(branch.id),
                amountLabel: formatCurrencyValue(amount) || '€0',
            }
        })

    const renewalItems = upcomingRenewals.slice(0, 6).map((policy) => {
        const branch = normalizeBranch(policy.lineOfBusiness)
        return {
            id: policy.id,
            insurerName: policy.insurerName,
            icon: getBranchIcon(branch.id),
            typeLabel: branch.label[lang],
            endDateLabel: policy.endDate.toLocaleDateString(isGreek ? "el-GR" : "en-GB"),
            days: daysUntil(policy.endDate),
            premiumLabel: formatCurrencyValue(policy.premiumAmount, policy.premiumCurrency || "EUR"),
        }
    })

    const scoreSummary = healthScore >= 70
        ? home.scoreGood
        : healthScore >= 40
            ? home.scoreNeedsImprovement
            : home.scoreNeedsAttention

    const agentName = customerRelationship
        ? customerRelationship.agent.name || customerRelationship.agent.email || ""
        : ""

    const savingsLine = overlapBranchCount === 0
        ? home.noSavings
        : overlapBranchCount === 1
            ? home.overlapOne
            : home.overlapMany.replace('{count}', String(overlapBranchCount))

    // Branch coverage map: tile states from policies + the cached score's
    // expected lines (already fetched above — no extra engine work)
    const policyTypeLabels = t.policyTypes as Record<string, string>
    const stateLabels = {
        covered: t.branches.statusCovered,
        attention: t.branches.statusAttention,
        gap: t.branches.statusGap,
        neutral: t.branches.statusNeutral,
    } as const
    const coverageMapEntries = buildBranchOverview(
        policies.map((policy) => ({
            id: policy.id,
            lineOfBusiness: policy.lineOfBusiness,
            status: effectivePolicyStatus(policy),
            endDate: policy.endDate,
        })),
        cachedScore?.expectedLines ?? []
    ).map((entry) => ({
        id: entry.branch.id,
        icon: getBranchIcon(entry.branch.id),
        label: policyTypeLabels[entry.branch.id] || entry.branch.label[lang],
        state: entry.state,
        stateLabel: stateLabels[entry.state],
    }))

    const gapSeverityCounts = {
        critical: openGaps.filter((gap) => gap.severity === "critical").length,
        high: openGaps.filter((gap) => gap.severity === "high").length,
        medium: openGaps.filter((gap) => gap.severity === "medium").length,
        low: openGaps.filter((gap) => gap.severity === "low").length,
    }

    // Top persisted recommendations — read-only, never re-runs the engine
    let recommendedActions: Array<{ id: string; title: string; urgency: "critical" | "high" | "medium" | "low" }> = []
    try {
        const { getActiveRecommendations } = await import("@/lib/services/gap-engine")
        const recommendations = await getActiveRecommendations(dbUser.id)
        recommendedActions = recommendations.slice(0, 3).map((rec) => ({
            id: rec.id,
            title: rec.title[lang] || rec.title.en,
            urgency: rec.urgency,
        }))
    } catch (error) {
        console.error("Failed to load home recommendations:", error)
    }

    return (
        <div className="pw-page-shell">
            <div className="mx-auto max-w-4xl px-4 py-6 pb-28 sm:px-6 lg:pb-6">
                <div className="mb-5">
                    <p className="pw-kicker">{t.nav.home}</p>
                    <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-[#0F172A] dark:text-white">
                        {home.title}
                    </h1>
                </div>

                {/* ── Ordering principle ──────────────────────────────────
                    What the user must ACT on comes first (uncovered risks,
                    expiring policies), then what they can DO (quick actions),
                    then the picture of their coverage, then passive numbers,
                    and only then the upgrade offers. The old order led with
                    upsells and buried the "you are uninsured" card 11th. */}

                {/* Getting Started Checklist — self-hiding; the only useful
                    thing on an empty portfolio */}
                <div className="mb-4">
                    <GettingStartedWrapper
                        policyCount={activePolicies.length}
                        hasAnalysis={Boolean(hasAnalysisRun)}
                        gapCount={openGapCount}
                        hasAgent={Boolean(customerRelationship)}
                        notificationsEnabled={Boolean(hasNotificationPref)}
                    />
                </div>

                {hasPolicies && (
                    <>
                        {/* 1 ── Needs your attention: what to do + what is missing */}
                        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                            <RecommendedActionsWidget
                                items={recommendedActions}
                                language={lang}
                                labels={{
                                    kicker: home.actionsKicker,
                                    noActions: home.noActions,
                                    viewAll: home.viewAllActions,
                                }}
                            />
                            <CoverageGapsWidget
                                counts={gapSeverityCounts}
                                labels={{
                                    kicker: home.gapsKicker,
                                    noGaps: home.noGaps,
                                    severity: {
                                        critical: home.severityCritical,
                                        high: home.severityHigh,
                                        medium: home.severityMedium,
                                        low: home.severityLow,
                                    },
                                }}
                            />
                        </div>

                        {/* 2 ── Time-critical: what expires next */}
                        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                            <div className="lg:col-span-3">
                                <RenewalsTimelineCard
                                    items={renewalItems}
                                    hasPolicies={hasPolicies}
                                    showUpgradeTeaser={isFreeTier && upcomingRenewals.length > 0}
                                    labels={{
                                        kicker: home.renewalTimeline,
                                        policiesSuffix: home.policiesSuffix,
                                        trackExpirationsTitle: home.trackExpirationsTitle,
                                        trackExpirationsBody: home.trackExpirationsBody,
                                        addPolicy: home.addPolicy,
                                        noExpirationsTitle: home.noExpirationsTitle,
                                        noExpirationsBody: home.noExpirationsBody,
                                        daysShort: home.daysShort,
                                    }}
                                />
                            </div>
                        </div>
                    </>
                )}

                {/* 3 ── Primary actions: ask AI · upload · recent documents */}
                <QuickActionsRow
                    openGapCount={openGapCount}
                    recentDocuments={recentDocuments}
                    labels={{
                        aiAnalysis: home.aiAnalysis,
                        aiSummary: openGapCount > 0
                            ? home.gapsNeedReview.replace('{count}', String(openGapCount))
                            : home.coverageStable,
                        viewDetails: home.viewDetails,
                        quickUpload: home.quickUpload,
                        addNewPolicy: home.addNewPolicy,
                        recentDocuments: home.recentDocuments,
                        noDocuments: home.noDocuments,
                    }}
                />

                {/* 4 ── Coverage at a glance (lapsed branches read amber, not green) */}
                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <BranchCoverageMap
                        entries={coverageMapEntries}
                        labels={{ kicker: home.coverageMapKicker, viewAll: home.viewAllBranches }}
                        className="lg:col-span-3"
                    />
                </div>

                {/* 5 ── Passive but motivating: count + protection score */}
                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <StatTiles
                        activeCount={activePolicies.length}
                        healthScore={healthScore}
                        openGapCount={openGapCount}
                        labels={{
                            activePolicies: home.activePolicies,
                            protectionScore: home.protectionScore,
                            scoreSummary,
                            gapsCount: home.coverageGapsCount.replace('{count}', String(openGapCount)),
                        }}
                    />
                </div>

                {/* 6 ── Plan offers — below the value, never above it */}
                {carriedPlan && (
                    <div className="mt-4">
                        <CarriedPlanCard planId={carriedPlan} billingPeriod={carriedBilling} />
                    </div>
                )}

                {isFreeTier && activePolicies.length >= 2 && (
                    <div className="mt-4">
                        <UpgradeTriggerCard
                            featureKey="policy_upload_limit"
                            triggerSource="home_usage_banner"
                            returnTo="/home"
                            dismissible
                            meter={{
                                label: home.freePlanPolicies,
                                used: activePolicies.length,
                                limit: FREE_POLICY_LIMIT,
                                hint: home.freePlanHint,
                            }}
                        />
                    </div>
                )}

                {isFreeTier && insurerCount >= 2 && (
                    <div className="mt-4">
                        <UpgradeTriggerCard
                            featureKey="multi_insurer_insights"
                            triggerSource="home_multi_insurer"
                            returnTo="/coverage-insights"
                            dismissible
                        />
                    </div>
                )}

                {/* 7 ── Reference numbers and status */}
                {totalAnnualPremium > 0 && (
                    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <PortfolioSummaryCard
                            totalLabel={formatCurrencyValue(totalAnnualPremium) || '€0'}
                            chips={portfolioChips}
                            labels={{
                                kicker: home.portfolioKicker,
                                totalAnnualPremium: home.totalAnnualPremium,
                            }}
                        />
                    </div>
                )}

                <StatusRow
                    agentConnected={Boolean(customerRelationship)}
                    labels={{
                        agentStatus: home.agentStatus,
                        agentLine: customerRelationship
                            ? home.agentConnected.replace('{name}', agentName)
                            : home.noAgent,
                        checkupKicker: home.checkupKicker,
                        checkupLine: hasHealthPolicy ? home.checkupAvailable : home.checkupAddHealth,
                        savingsKicker: home.savingsKicker,
                        savingsLine,
                    }}
                />

                <div className="mt-4">
                    <Link
                        href="/help"
                        className="pw-card flex items-center justify-between px-5 py-3.5"
                    >
                        <div className="flex items-center gap-3">
                            <CircleHelp className="h-5 w-5 text-black/60 dark:text-white/65" />
                            <p className="text-sm font-semibold text-black dark:text-white">{home.helpTitle}</p>
                        </div>
                        <p className="text-xs text-black/55 dark:text-white/65">{home.helpOpen}</p>
                    </Link>
                </div>
            </div>

            <Link
                href="/wallet/add"
                className="fixed bottom-24 left-1/2 z-30 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-2xl bg-primary text-white dark:text-[#1A2420] shadow-xl transition hover:bg-primary-hover lg:bottom-6 lg:left-auto lg:right-6 lg:translate-x-0"
                aria-label={home.quickUploadAria}
            >
                <Upload className="h-6 w-6" />
            </Link>

        </div>
    )
}
