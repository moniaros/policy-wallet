export const runtime = 'nodejs'

import Link from "next/link"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { formatCurrency } from "@/lib/i18n/format"
import { getTranslations } from "@/lib/i18n"
import type { User } from "@prisma/client"
import { getCachedProtectionScore } from "@/lib/services/gap-engine"
import { provisionalProtectionScore } from "@/lib/services/gap-engine/protection-score"
import { CircleHelp, Upload } from "lucide-react"
import { normalizeBranch } from "@/lib/insurance/taxonomy"
import { resolvePolicyLifecycle } from "@/lib/policy-status"
import { selectPremiumBearingPolicies, calculatePremiumFootprintDetailed } from "@/lib/wallet/premium-footprint"
import { premiumExclusionNote } from "@/lib/wallet/premium-exclusion-note"
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

function daysUntil(date: Date) {
    return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

/**
 * Money on the policyholder's own dashboard.
 *
 * This built its own Intl formatter pinned to "en-GB", so a Greek user — the
 * default — saw "€1,105" where Greek writes "1.105 €", in the same object
 * literal whose endDateLabel already switched locale correctly. Delegates to
 * the shared formatter now; the null return is kept because callers rely on
 * `|| '€0'` rather than the shared formatter's "—".
 */
function formatCurrencyValue(amount: unknown, lang: 'el' | 'en', currency: string = "EUR") {
    if (amount == null) return null
    const numericAmount = typeof amount === "number" ? amount : Number(amount)
    if (!Number.isFinite(numericAmount)) return null

    return formatCurrency(numericAmount, lang, { currency: currency || "EUR" })
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

    // One parallel batch for every independent read — these ran strictly
    // serially (~7 round-trips) on the hottest customer page, all keyed on the
    // same user id with no ordering dependencies.
    const [
        policies,
        customerRelationship,
        entitlements,
        openGaps,
        cachedScore,
        hasAnalysisRun,
        hasNotificationPref,
    ] = await Promise.all([
        db.policy.findMany({
            where: { ownerUserId: dbUser.id },
            include: { documents: true },
            orderBy: { endDate: "asc" },
        }),
        db.customerRelationship.findFirst({
            where: {
                policyholderUserId: dbUser.id,
                status: "active",
            },
            include: { agent: true },
        }),
        resolveUserEntitlements(dbUser.id),
        db.gapInstance.findMany({
            where: {
                policy: { ownerUserId: dbUser.id },
                status: { in: ["open", "detected", "acknowledged"] },
            },
            select: { severity: true },
        }),
        // Protection score: READ-ONLY cached score (never runs the engine on a
        // GET render). Freshness is the cron / upload pipeline's job.
        getCachedProtectionScore(dbUser.id).catch(() => null),
        db.policyAnalysisRun.findFirst({
            where: { userId: dbUser.id, status: { in: ["completed", "completed_with_warnings"] } },
            select: { id: true },
        }),
        db.notificationPreference.findFirst({
            where: { userId: dbUser.id, enabled: true },
            select: { id: true },
        }),
    ])
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
    // The stored status is an ingestion state nothing ever recomputes — no code
    // path writes 'expired' onto a policy — so `status === "active"` matched every
    // policy ever uploaded and inflated the premium total. Resolve the real
    // lifecycle from the extracted end date instead. Everything below (count,
    // insurers, premium, per-branch chips) derives from this one list so the
    // tiles cannot contradict each other.
    const { policies: activePolicies, unknownDurationCount } = selectPremiumBearingPolicies(policies, now)
    const insurerCount = new Set(
        activePolicies.map((policy) => policy.insurerName).filter(Boolean)
    ).size
    const sixMonthsOut = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000)
    const upcomingRenewals = policies
        .map((policy) => ({ policy, endDate: resolvePolicyLifecycle(policy, now).endDate }))
        .filter((entry): entry is { policy: typeof entry.policy; endDate: Date } =>
            entry.endDate !== null && entry.endDate > now && entry.endDate <= sixMonthsOut
        )
        .sort((a, b) => a.endDate.getTime() - b.endDate.getTime())

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

    const hasHealthPolicy = policies.some((policy) => normalizeBranch(policy.lineOfBusiness).id === "health")

    // Branches where the user holds more than one active policy — surfaced
    // as an honest "worth checking for overlaps" note (the old tile invented
    // a €/year savings figure from a flat 12% multiplier).
    const branchPolicyCounts = new Map<string, number>()
    for (const policy of activePolicies) {
        const branchId = normalizeBranch(policy.lineOfBusiness).id
        branchPolicyCounts.set(branchId, (branchPolicyCounts.get(branchId) ?? 0) + 1)
    }
    const overlapBranchCount = [...branchPolicyCounts.values()].filter((count) => count > 1).length

    // Portfolio summary: total premium + LOB breakdown.
    //
    // The total is the audited footprint, not a raw sum. This card used to
    // `reduce` premiumAmount over every in-force policy and format the result as
    // euros — so a policy written in sterling was added to the euro figures and
    // the sum labelled «€», and a policy with no extracted premium silently
    // counted as 0, both with nothing on screen saying so. `calculatePremium-
    // FootprintDetailed` exists precisely to prevent that (it is what the wallet
    // uses); the dashboard headline had drifted onto its own arithmetic.
    const premiumFootprint = calculatePremiumFootprintDetailed(policies, now)
    const totalAnnualPremium = premiumFootprint.total
    const premiumCurrency = premiumFootprint.currency
    // Chips must sum to the headline, so the per-branch breakdown counts the same
    // policies the total does — the majority currency only.
    const currencyOf = (p: { premiumCurrency?: string | null }) =>
        String(p.premiumCurrency ?? '').trim().toUpperCase() || 'EUR'
    const lobBreakdown = activePolicies
        .filter((p) => currencyOf(p) === premiumCurrency)
        .reduce((acc, p) => {
            const lob = p.lineOfBusiness || 'other'
            if (!acc[lob]) acc[lob] = 0
            acc[lob] += Number(p.premiumAmount ?? 0)
            return acc
        }, {} as Record<string, number>)

    const openGapCount = openGaps.length

    /* Protection score.
     *
     * Three states, because there were previously only one and it lied in two
     * of them:
     *
     *  - No policies at all -> NO score. It used to render `0` with the red
     *    "Χρειάζεται προσοχή" verdict, which tells someone who has simply not
     *    uploaded anything yet that they are badly protected. The same bug was
     *    fixed on /coverage-insights in 65183b7; this page kept it, and this is
     *    the page people land on.
     *  - Engine score present -> the real, weighted, category-based figure.
     *  - Engine score absent but policies exist -> a DIFFERENT formula (flat
     *    penalties per gap severity). It is not the same measure and can differ
     *    materially for the same portfolio, so it is now labelled a provisional
     *    estimate instead of being passed off as the score.
     */
    const hasPolicies = policies.length > 0
    const isProvisionalScore = hasPolicies && !cachedScore
    const healthScore: number | null = cachedScore
        ? cachedScore.overallScore
        : provisionalProtectionScore(policies.length, openGaps.map(g => g.severity))

    // Precomputed view models — components stay presentational
    const portfolioChips = Object.entries(lobBreakdown)
        .filter(([, amount]) => amount > 0)
        .sort(([, a], [, b]) => b - a)
        .map(([lob, amount]) => {
            const branch = normalizeBranch(lob)
            return {
                id: lob,
                icon: getBranchIcon(branch.id),
                amountLabel: formatCurrencyValue(amount, lang, premiumCurrency) || '€0',
            }
        })

    // Everything the total leaves out, said plainly — matching the wallet's
    // StatusSummary. A figure that silently drops a foreign-currency or
    // premium-less policy understates what the household spends.
    const premiumExcludedNote = premiumExclusionNote(
        {
            otherCurrencyCount: premiumFootprint.otherCurrencyCount,
            unknownPremiumCount: premiumFootprint.unknownPremiumCount,
            unknownDurationCount,
        },
        t.status
    )

    const renewalItems = upcomingRenewals.slice(0, 6).map(({ policy, endDate }) => {
        const branch = normalizeBranch(policy.lineOfBusiness)
        return {
            id: policy.id,
            insurerName: policy.insurerName,
            icon: getBranchIcon(branch.id),
            typeLabel: branch.label[lang],
            endDateLabel: endDate.toLocaleDateString(isGreek ? "el-GR" : "en-GB"),
            days: daysUntil(endDate),
            premiumLabel: formatCurrencyValue(policy.premiumAmount, lang, policy.premiumCurrency || "EUR"),
        }
    })

    const scoreSummary = healthScore === null
        ? ''
        : healthScore >= 70
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
    const coverageMapEntries = buildBranchOverview(policies, cachedScore?.expectedLines ?? []).map((entry) => ({
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

                {/* Getting Started Checklist */}
                <div className="mb-4">
                    <GettingStartedWrapper
                        policyCount={policies.length}
                        hasAnalysis={Boolean(hasAnalysisRun)}
                        gapCount={openGapCount}
                        hasAgent={Boolean(customerRelationship)}
                        notificationsEnabled={Boolean(hasNotificationPref)}
                    />
                </div>

                {/* Signup-selected plan continuity (never activated → offer checkout) */}
                {carriedPlan && (
                    <div className="mb-4">
                        <CarriedPlanCard planId={carriedPlan} billingPeriod={carriedBilling} />
                    </div>
                )}

                {/* Free-tier usage banner (Trigger A surface: approaching the policy cap).
                    The meter counts every stored policy — that is what checkPolicyLimit
                    blocks on. Metering only the in-force ones would promise headroom the
                    next upload does not actually have. */}
                {isFreeTier && policies.length >= 2 && (
                    <div className="mb-4">
                        <UpgradeTriggerCard
                            featureKey="policy_upload_limit"
                            triggerSource="home_usage_banner"
                            returnTo="/dashboard"
                            dismissible
                            meter={{
                                label: home.freePlanPolicies,
                                used: policies.length,
                                limit: FREE_POLICY_LIMIT,
                                hint: home.freePlanHint,
                            }}
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <StatTiles
                        activeCount={activePolicies.length}
                        healthScore={healthScore}
                        openGapCount={openGapCount}
                        isProvisional={isProvisionalScore}
                        labels={{
                            activePolicies: home.activePolicies,
                            protectionScore: home.protectionScore,
                            scoreSummary,
                            gapsCount: home.coverageGapsCount.replace('{count}', String(openGapCount)),
                            scoreUnavailable: home.scoreUnavailable,
                            scoreUnavailableHint: home.scoreUnavailableHint,
                            provisional: home.scoreProvisional,
                            provisionalHint: home.scoreProvisionalHint,
                            methodologyTitle: home.scoreMethodologyTitle,
                            methodologyBody: home.scoreMethodologyBody,
                            methodologyLimits: home.scoreMethodologyLimits,
                            methodologyNotAdvice: home.scoreMethodologyNotAdvice,
                        }}
                    />

                    {totalAnnualPremium > 0 && (
                        <PortfolioSummaryCard
                            totalLabel={formatCurrencyValue(totalAnnualPremium, lang, premiumCurrency) || '€0'}
                            chips={portfolioChips}
                            labels={{
                                kicker: home.portfolioKicker,
                                totalAnnualPremium: home.totalAnnualPremium,
                            }}
                            excludedNote={premiumExcludedNote}
                        />
                    )}

                    {/* Branch coverage map — every branch with its covered/gap state */}
                    <BranchCoverageMap
                        entries={coverageMapEntries}
                        labels={{ kicker: home.coverageMapKicker, viewAll: home.viewAllBranches }}
                        className="lg:col-span-3"
                    />

                    {/* Trigger G: multi-insurer portfolio insight for free tier */}
                    {isFreeTier && insurerCount >= 2 && (
                        <UpgradeTriggerCard
                            featureKey="multi_insurer_insights"
                            triggerSource="home_multi_insurer"
                            returnTo="/coverage-insights"
                            dismissible
                            className="lg:col-span-3"
                        />
                    )}

                    <RenewalsTimelineCard
                        items={renewalItems}
                        hasPolicies={policies.length > 0}
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

                {/* Detected gaps + top recommended actions (persisted engine output) */}
                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
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
                            note: home.severityNote,
                        }}
                    />
                </div>

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
                        <p className="text-xs text-muted-foreground">{home.helpOpen}</p>
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
