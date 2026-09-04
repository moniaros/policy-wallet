export const runtime = 'nodejs'

import Link from "next/link"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { formatCurrency, formatDate } from "@/lib/i18n/format"
import { calendarDaysUntil } from "@/lib/policy-status"
import { getTranslations } from "@/lib/i18n"
import type { User } from "@prisma/client"
import { getCachedProtectionScore, getActiveRecommendations } from "@/lib/services/gap-engine"
import { getOpenReview } from "@/lib/services/risk-review/service"
import { getReviewPolicy } from "@/lib/services/risk-review/policy"
import { RiskReviewCard } from "@/components/risk/RiskReviewCard"
import { getTimeline } from "@/lib/services/timeline/service"
import { assembleWatch } from "@/lib/services/risk-dna/service"
import { buildProtectionPlan } from "@/lib/services/protection-plan"
import { portfolioFacts, derivePortfolioCounts } from "@/lib/dashboard/portfolio-summary"
import { gapsOnActiveCoverage } from "@/lib/gaps/gap-universe"
import { declarableLifeEvents } from "@/lib/services/life-events/registry"
import { Upload } from "lucide-react"
import { normalizeBranch } from "@/lib/insurance/taxonomy"
import { displayPersonName, displayPolicyNumber, policyAssetIdentifier } from "@/lib/wallet/policy-identity"
import { resolvePolicyLifecycle, effectivePolicyStatus } from "@/lib/policy-status"
import { selectPremiumBearingPolicies, calculatePremiumFootprintDetailed } from "@/lib/wallet/premium-footprint"
import { premiumExclusionParts } from "@/lib/wallet/premium-exclusion-note"
import { deriveRenewalChecklist } from "@/lib/wallet/renewal-outlook"
import { deriveClaimDeadlines, extractPolicySections, hasAutoRenewal } from "@/lib/wallet/policy-detail"
import { complianceObligations } from "@/lib/insurance/policy-conditions"
import { getBranchIcon } from "@/lib/insurance/branch-icons"
import { resolveUserEntitlements } from "@/lib/subscription-entitlements"
import { FREE_POLICY_LIMIT } from "@/lib/monetization/feature-gates"
import { UpgradeTriggerCard } from "@/components/monetization/UpgradeTriggerCard"
import { CarriedPlanCard } from "@/components/monetization/CarriedPlanCard"
import { buildBranchOverview } from "@/lib/insurance/branch-page"
import { BranchCoverageMap } from "@/components/branches/BranchCoverageMap"
import { ProtectionStatusHero } from "@/components/dashboard/home/ProtectionStatusHero"
import { AttentionList, type AttentionItem } from "@/components/dashboard/home/AttentionList"
import { reasonCountKey } from "@/lib/instrumentation/reason-count-keys"
import { ProtectionPlanCard, type ProtectionPlanStepView } from "@/components/dashboard/home/ProtectionPlanCard"
import { ProtectionMonitorCard, type MonitorSignalView } from "@/components/dashboard/home/ProtectionMonitorCard"
import { LifeEventPromptCard } from "@/components/dashboard/home/LifeEventPromptCard"
import { AdvisorSupportRow } from "@/components/dashboard/home/AdvisorSupportRow"
import { PortfolioSummaryCard } from "@/components/dashboard/home/PortfolioSummaryCard"
import { RenewalsTimelineCard } from "@/components/dashboard/home/RenewalsTimelineCard"
import { CoverageGapsWidget } from "@/components/dashboard/home/CoverageGapsWidget"
import { RecentChangesWidget } from "@/components/dashboard/home/RecentChangesWidget"
import { ProtectionPrioritiesCard } from "@/components/dashboard/home/ProtectionPrioritiesCard"
import { ProtectionProfileResumeCard } from "@/components/dashboard/home/ProtectionProfileResumeCard"
import { resolveProtectionOnboardingState, shouldEnterProtectionOnboarding } from "@/lib/services/protection-profile/state"
import { deriveProtectionPriorities } from "@/lib/services/protection-profile/derive-priorities"
import { toLifeContext } from "@/lib/services/gap-engine/life-context"
import { areaForLob, areaForRisk } from "@/lib/protection/domains"
import { loadAttentionAreas } from "@/lib/protection/load-attention-areas"

/**
 * Calendar days until a date, in Athens.
 *
 * This used to be `Math.ceil((date - Date.now()) / 86_400_000)` — a duration in
 * 24-hour units, not a count of calendar days. Two ways that is wrong on the
 * screen where someone learns when their cover ends:
 *
 * - Policy end dates are stored at midnight UTC, which is 03:00 Athens. A policy
 *   ending "tomorrow" was routinely off by one, and this number picks the
 *   urgency colour on the renewals card (red ≤30, amber ≤89) shown beside the
 *   end date — so the badge and the date could contradict each other.
 * - A 24-hour unit drifts a whole day across a DST boundary, and Greece changes
 *   clocks twice a year.
 *
 * `calendarDaysUntil` is the helper the rest of the product already uses, and it
 * exists with a comment explaining exactly this trap. Being a day out on a
 * COMPULSORY motor policy is not cosmetic here.
 */
function daysUntil(date: Date) {
    return calendarDaysUntil(date, new Date())
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
    const t = getTranslations(lang)
    const home = t.dashboard.home

    // One parallel batch for every independent read, all keyed on the same user
    // id with no ordering dependencies. This page is READ-ONLY: never call
    // getProtectionScore / runGapEngine / refreshProtectionScore here — a GET
    // render must not write, and freshness is the cron / upload pipeline's job.
    const [
        policies,
        customerRelationship,
        entitlements,
        openGaps,
        cachedScore,
        openReview,
        profile,
        recentVersions,
        analysisRunGroups,
        hasNotificationPref,
        activeRecommendations,
        recStatusGroups,
        timelineEntries,
        protectionProfileRow,
        attentionBundle,
    ] = await Promise.all([
        db.policy.findMany({
            // status ≠ deleted: a soft-deleted row (the API's DELETE path) is
            // not a policy the owner holds. Counting it inflated every number
            // on this page — the same predicate the wallet list now applies,
            // so `portfolio.policyCount` cannot disagree between the two.
            where: { ownerUserId: dbUser.id, status: { not: "deleted" } },
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
            select: { severity: true, policyId: true },
        }),
        // Protection score: READ-ONLY cached score (never runs the engine on a
        // GET render). Freshness is the cron / upload pipeline's job.
        getCachedProtectionScore(dbUser.id).catch(() => null),
        getOpenReview(dbUser.id).catch(() => null),
        db.policyholderProfile.findUnique({ where: { userId: dbUser.id } }),
        // Score history — the newest two versions carry the delta and the
        // category movement. Fails soft: the table sits behind a migration some
        // environments have not applied.
        db.riskProfileVersion
            .findMany({
                where: { userId: dbUser.id },
                orderBy: { version: "desc" },
                take: 2,
                select: {
                    version: true,
                    computedAt: true,
                    overallScore: true,
                    indeterminate: true,
                    categoryScores: true,
                    risks: true,
                },
            })
            .catch(
                () =>
                    [] as Array<{
                        version: number
                        computedAt: Date
                        overallScore: number
                        indeterminate: boolean
                        categoryScores: unknown
                        risks: unknown
                    }>
            ),
        db.policyAnalysisRun
            .groupBy({
                by: ["status"],
                where: { userId: dbUser.id },
                _count: { _all: true },
            })
            .catch(() => [] as Array<{ status: string; _count: { _all: number } }>),
        db.notificationPreference.findFirst({
            where: { userId: dbUser.id, enabled: true },
            select: { id: true },
        }),
        getActiveRecommendations(dbUser.id).catch(() => []),
        db.recommendationInstance
            .groupBy({
                by: ["status"],
                where: { userId: dbUser.id },
                _count: { _all: true },
            })
            .catch(() => [] as Array<{ status: string; _count: { _all: number } }>),
        getTimeline(dbUser.id, { limit: 3 }).catch(() => []),
        // Layer 1 — the statements behind «Η εικόνα σας» and the resume state.
        db.protectionProfile
            .findUnique({
                where: { userId: dbUser.id },
                select: {
                    answers: true,
                    answeredSteps: true,
                    unsureSteps: true,
                    completedAt: true,
                    skippedAt: true,
                    summaryViewedAt: true,
                    uploadChoice: true,
                    riskConcerns: true,
                    commitments: true,
                    recentChanges: true,
                    futureConsiderations: true,
                },
            })
            .catch(() => null),
        // The composed view behind «Η εικόνα σας» — needs, exposure and the
        // documents, with a confidence (lib/protection/load-attention-areas.ts).
        // Read-only; fails soft to no card rather than to a card with a claim.
        loadAttentionAreas({ userId: dbUser.id, language: lang }).catch(() => null),
    ])
    const isFreeTier = entitlements.tier === "free"

    // ── Layer 1: the first stage of onboarding ───────────────────────────
    // Entered ONCE: a new customer with no policies, no completed profile and
    // no skip is sent to it. Every screen there carries a visible skip, and a
    // skip is remembered here — nobody is sent twice.
    const legacyOnboardingCompleted =
        ((profile?.preferences ?? {}) as Record<string, unknown>).onboardingCompleted === true
    if (
        shouldEnterProtectionOnboarding({
            completedAt: protectionProfileRow?.completedAt ?? null,
            skippedAt: protectionProfileRow?.skippedAt ?? null,
            policyCount: policies.length,
            legacyCompleted: legacyOnboardingCompleted,
        })
    ) {
        redirect("/onboarding")
    }
    const protectionState = resolveProtectionOnboardingState(protectionProfileRow)
    // Derived on read from the facts and the statements — never stored, never a score.
    const protectionPriorities =
        protectionProfileRow?.completedAt && profile
            ? deriveProtectionPriorities(toLifeContext(profile as any, new Date()), protectionProfileRow)
            : []

    // Plan picked at signup but never activated (carried through onboarding)
    let carriedPlan: "ph-plus" | "ph-pro" | null = null
    let carriedBilling: "monthly" | "annual" = "monthly"
    if (isFreeTier) {
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
    const renewalCandidates = policies
        .map((policy) => ({ policy, endDate: resolvePolicyLifecycle(policy, now).endDate }))
        .filter((entry): entry is { policy: typeof entry.policy; endDate: Date } =>
            entry.endDate !== null && entry.endDate > now && entry.endDate <= sixMonthsOut
        )
    // Same number twice = one renewal. The premium footprint already collapses
    // duplicate uploads of one policy number to the row holding the current
    // term (selectPremiumBearingPolicies); the timeline did not, so a policy
    // uploaded three times rendered three identical rows — one renewal read
    // as three, and the header counted all of them. Same rule here: the
    // latest term per number wins; rows with no number stay as they are.
    const latestRenewalByNumber = new Map<string, (typeof renewalCandidates)[number]>()
    const unnumberedRenewals: typeof renewalCandidates = []
    for (const entry of renewalCandidates) {
        const key = (entry.policy.policyNumber || "").trim().toLowerCase()
        if (!key) {
            unnumberedRenewals.push(entry)
            continue
        }
        const existing = latestRenewalByNumber.get(key)
        if (!existing || entry.endDate.getTime() > existing.endDate.getTime()) {
            latestRenewalByNumber.set(key, entry)
        }
    }
    const upcomingRenewals = [...latestRenewalByNumber.values(), ...unnumberedRenewals]
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
        .slice(0, 3)

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

    // THE GAP UNIVERSE IS ACTIVE COVERAGE — the same predicate
    // /coverage-insights applies ("a lapsed policy is not protection; its
    // findings stay on that policy's own page"). This tally links straight to
    // that page, and used to count every gap the owner had ever accumulated —
    // 43 here against 33 there, for one portfolio (§2.8). One shared filter
    // now, so the two surfaces cannot drift.
    const liveGaps = gapsOnActiveCoverage(openGaps, policies, now)
    const openGapCount = liveGaps.length

    // Open gaps per policy, for the renewal rows' honest "points to check".
    // Profile-level gaps carry no policyId and deliberately attach to nothing.
    const gapsByPolicy = new Map<string, number>()
    for (const gap of liveGaps) {
        if (!gap.policyId) continue
        gapsByPolicy.set(gap.policyId, (gapsByPolicy.get(gap.policyId) ?? 0) + 1)
    }

    // Analysis runs, grouped once: completed => the engine has read something.
    const runCount = (statuses: string[]) =>
        analysisRunGroups
            .filter((group) => statuses.includes(group.status))
            .reduce((sum, group) => sum + group._count._all, 0)
    const hasCompletedAnalysis = runCount(["completed", "completed_with_warnings"]) > 0

    /**
     * THE FACTS, which replaced the protection score outright.
     *
     * The score was a weighted average of coverage BREADTH presented as a
     * protection verdict — `healthScore >= 70 ? «Καλή κάλυψη» : …` — rendered
     * over portfolios the measure could not describe: one never-analysed policy
     * scored «Καλή κάλυψη», a wallet where every policy had expired scored
     * «Χρειάζεται βελτίωση», and its fallback returned 100 for a portfolio
     * nothing had ever read. Removed from the product Aug 2026 (run
     * PW-MOBILE-TRANSFORM-01, halt H-001); see
     * docs/evidence/dashboard-mobile/BASELINE.md D1 and
     * tests/unit/score-containment.test.ts.
     */
    const hasPolicies = policies.length > 0
    // One importable derivation (derivePortfolioCounts) instead of five inline
    // filters, so the count-consistency guard can assert the hero, the wallet
    // tiles and the risk watch count the same portfolio.
    const portfolioInput = derivePortfolioCounts(policies, now)
    const factLabel: Record<string, [string, string]> = {
        total: [home.factTotalOne, home.factTotalMany],
        expired: [home.factExpiredOne, home.factExpiredMany],
        expiringSoon: [home.factExpiringOne, home.factExpiringMany],
        neverAnalysed: [home.factNeverAnalysedOne, home.factNeverAnalysedMany],
        analysisFailed: [home.factFailedOne, home.factFailedMany],
    }
    // Each fact keeps its KIND and its COUNT, so the hero can mark the element
    // that renders it with the kind's registered count key (the hero's
    // KIND_COUNT_KEY map — portfolio.policyCount etc.). The line used to be
    // joined into one string here, which meant the page stated «12
    // ασφαλιστήρια» with nothing machine-readable saying what the 12 counted —
    // and the count-consistency metric had to guess by matching nouns, which
    // grouped the score, an upsell's plan limit («έως 10 ασφαλιστήρια») and a
    // labelled subset together as a contradiction.
    const facts = portfolioFacts(portfolioInput).map(({ kind, count }) => {
        const [one, many] = factLabel[kind]
        return { kind, count, label: count === 1 ? one : many.replace('{count}', String(count)) }
    })

    // The monitor still needs the newest assessment version (for its risks
    // snapshot) — the score value it carries is never rendered.
    const [newestVersion] = recentVersions

    const areasLine = hasPolicies
        ? activeRecommendations.length === 0
            ? null
            : activeRecommendations.length === 1
                ? home.heroAreasOne
                : home.heroAreasMany.replace('{count}', String(activeRecommendations.length))
        : null

    // What needs my attention: the top findings as risk → why → next step.
    const timingLabels: Record<string, string> = {
        now: home.attentionTimingNow,
        weeks: home.attentionTimingWeeks,
        months: home.attentionTimingMonths,
    }
    const urgencyLabels = {
        critical: home.recPriorityCritical,
        high: home.recPriorityHigh,
        medium: home.recPriorityMedium,
        low: home.recPriorityLow,
    } as const
    const attentionItems: AttentionItem[] = activeRecommendations.slice(0, 3).map((rec) => ({
        id: rec.id,
        // Analytics identity (§J): the rule that decided it, else the catalogue
        // risk the engine assessed; the area from the same vocabulary the
        // priorities card speaks (lib/protection/domains.ts).
        ruleId: rec.ruleId ?? rec.riskId ?? "unknown",
        area: (rec.riskId ? areaForRisk(rec.riskId) : undefined)?.id ?? areaForLob(normalizeBranch(rec.lineOfBusiness).id)?.id,
        title: rec.title[lang] || rec.title.en,
        reason: rec.personalReason ? rec.personalReason[lang] || rec.personalReason.en : null,
        // The reason is pre-composed prose; when the risk that wrote it leads
        // with a registered quantity («2 άτομα εξαρτώνται…» ← dependants), the
        // shared map names the key so the count metric can compare it.
        reasonCountKey: reasonCountKey(rec),
        urgency: rec.urgency,
        urgencyLabel: urgencyLabels[rec.urgency],
        timingLabel: rec.timing && rec.timing.level !== "no_deadline" ? timingLabels[rec.timing.level] ?? null : null,
    }))

    // Your protection plan: recorded facts only, derived by one pure function.
    const handledRecommendationCount = recStatusGroups
        .filter((group) => group.status === "actioned" || group.status === "dismissed")
        .reduce((sum, group) => sum + group._count._all, 0)
    const plan = buildProtectionPlan({
        profileCompleted: Boolean(protectionProfileRow?.completedAt),
        policyCount: policies.length,
        hasCompletedAnalysis,
        openGapCount,
        hasAgent: Boolean(customerRelationship),
        notificationsEnabled: Boolean(hasNotificationPref),
        activeRecommendationIds: activeRecommendations.map((rec) => rec.id),
        handledRecommendationCount,
    })
    const setupStepCopy: Record<string, { title: string; description: string }> = {
        profile: { title: home.planStepProfileTitle, description: home.planStepProfileBody },
        upload: { title: home.planStepUploadTitle, description: home.planStepUploadBody },
        analysis: { title: home.planStepAnalysisTitle, description: home.planStepAnalysisBody },
        gaps: { title: home.planStepGapsTitle, description: home.planStepGapsBody },
        agent: { title: home.planStepAgentTitle, description: home.planStepAgentBody },
        notifications: { title: home.planStepNotificationsTitle, description: home.planStepNotificationsBody },
    }
    /**
     * THE PLAN IS SETUP ONLY. Coverage findings are not plan steps.
     *
     * `buildProtectionPlan` returns two kinds in one list — `setup` (upload a
     * policy, run an analysis, connect an advisor: finite, five of them, and
     * genuinely completable) and `recommendation` (coverage findings: unbounded,
     * and "completing" one means buying or changing cover, which is a different
     * act entirely). They shared one list and one progress bar, so «11 από 22»
     * told the customer they were half-way through something that has no end,
     * and the denominator moved whenever the engine found another finding.
     *
     * The findings are not lost: they are what «Χρειάζεται την προσοχή σας»
     * renders, from the same recommendation rows, one section up. Showing them
     * again here as plan steps was the third of the page's three gap surfaces.
     */
    const setupSteps = plan.steps.filter((step) => step.kind === "setup")
    const setupCompleted = setupSteps.filter((step) => step.state === "done").length
    const planStepViews: ProtectionPlanStepView[] = []
    for (const step of setupSteps) {
        if (step.kind === "setup") {
            const copy = setupStepCopy[step.id]
            planStepViews.push({
                id: step.id,
                kind: step.kind,
                state: step.state,
                href: step.href,
                title: copy?.title ?? step.id,
                description: step.state === "open" ? copy?.description ?? null : null,
            })
            continue
        }
    }
    // Open findings live in the attention section; the plan links there rather
    // than restating them.
    const openFindingCount = plan.steps.filter(
        (step) => step.kind === "recommendation" && step.state === "open"
    ).length
    const planMoreOpenLabel =
        openFindingCount > 0 ? home.planMoreOpen.replace('{count}', String(openFindingCount)) : null

    // The standing watch — computed only for entitled accounts (the capability
    // is what the non-entitled card sells; rendering fabricated signals under a
    // blur would be a lie about work never done). Assembly is pure CPU over the
    // rows already fetched above.
    const monitorEntitled = entitlements.limits.advancedAnalytics === true
    let monitorSignals: MonitorSignalView[] | null = null
    if (monitorEntitled && (hasPolicies || recentVersions.length > 0)) {
        try {
            const verdictLabels = {
                clear: home.monitorVerdictClear,
                attention: home.monitorVerdictAttention,
                action: home.monitorVerdictAction,
            } as const
            monitorSignals = assembleWatch({
                profile,
                policies,
                latestVersion: newestVersion
                    ? { computedAt: newestVersion.computedAt, risks: newestVersion.risks }
                    : null,
                // The last engine RUN, not the last material change — versions
                // only move when something moved.
                lastAssessedAt: cachedScore?.computedAt ?? null,
                now,
            }).map((signal) => ({
                id: signal.id,
                label: signal.label[lang],
                verdict: signal.verdict,
                verdictLabel: verdictLabels[signal.verdict],
                detail: signal.detail ? signal.detail[lang] : null,
                // Segmented detail, localized: each counted quantity keeps its
                // data-count key through to the DOM (§6.7).
                detailParts: signal.detailParts
                    ? signal.detailParts.map((part) => ({
                          text: part.text[lang] || part.text.en,
                          countKey: part.countKey,
                          factKey: part.factKey,
                      }))
                    : null,
                action: signal.action ? signal.action[lang] : null,
            }))
        } catch (error) {
            // Never render a broken watch — the section is omitted instead.
            console.error("Failed to assemble protection watch:", error)
            monitorSignals = null
        }
    }
    /**
     * AT MOST ONE UPGRADE OFFER ON THE PAGE.
     *
     * Three rendered independently — the policy-cap meter, the monitoring
     * placeholder, and the multi-insurer teaser — and each styled its button as
     * the page's primary action, so 3 of the 4 primaries measured at Goal 2 were
     * upgrade buttons. The monitoring one is a SUBSTITUTION (it occupies the
     * monitor slot and explains what monitoring is), so it does not add a card;
     * the other two do. When the substitution is showing, the standalone offers
     * stand down.
     */
    const monitorPlaceholderShown = !monitorEntitled
    const standaloneUpgrade: "policy_upload_limit" | "multi_insurer_insights" | null =
        !isFreeTier || monitorPlaceholderShown
            ? null
            : policies.length >= 2
                ? "policy_upload_limit"
                : insurerCount >= 2
                    ? "multi_insurer_insights"
                    : null

    const monitorLastCheckedLabel = cachedScore
        ? home.monitorLastChecked.replace('{date}', formatDate(cachedScore.computedAt, lang))
        : null

    const lifeEventChips = declarableLifeEvents()
        .slice(0, 4)
        .map((event) => ({ id: event.id, label: event.label[lang] }))

    // Everything the total leaves out, said plainly — matching the wallet's
    // StatusSummary. A figure that silently drops a foreign-currency or
    // premium-less policy understates what the household spends.
    const premiumExcludedParts = premiumExclusionParts(
        {
            otherCurrencyCount: premiumFootprint.otherCurrencyCount,
            unknownPremiumCount: premiumFootprint.unknownPremiumCount,
            unknownDurationCount,
        },
        t.status
    )

    const portfolioChips = Object.entries(lobBreakdown)
        .filter(([, amount]) => amount > 0)
        .sort(([, a], [, b]) => b - a)
        .map(([lob, amount]) => {
            const branch = normalizeBranch(lob)
            return {
                id: lob,
                icon: getBranchIcon(branch.id),
                // The branch NAME, not just its icon. An icon is a decoration
                // with no accessible name; two euro figures sitting under a
                // larger one with only a pictogram to tell them apart is a
                // breakdown the reader has to guess at.
                branchLabel: branch.label[lang] || branch.label.en,
                amountLabel: formatCurrencyValue(amount, lang, premiumCurrency) || '€0',
            }
        })

    const renewalItems = upcomingRenewals.slice(0, 4).map(({ policy, endDate }) => {
        const branch = normalizeBranch(policy.lineOfBusiness)
        const days = daysUntil(endDate)
        // The term bar: both ends are dates the document states. A start on
        // or after the end is a placeholder, not a term — no bar then, rather
        // than a full one claiming a year that was never read.
        const termStart =
            policy.startDate instanceof Date && policy.startDate.getTime() < endDate.getTime()
                ? policy.startDate
                : null
        const termProgressPct = termStart
            ? Math.max(
                  0,
                  Math.min(
                      100,
                      Math.round(
                          ((now.getTime() - termStart.getTime()) / (endDate.getTime() - termStart.getTime())) * 100
                      )
                  )
              )
            : null
        // The SAME derivation the policy page's renewal outlook renders — one
        // module, one count, two surfaces that cannot disagree.
        const sections = extractPolicySections(policy.acordData)
        const checkpointCount = deriveRenewalChecklist({
            openGapCount: gapsByPolicy.get(policy.id) ?? 0,
            deadlineConditionCount: deriveClaimDeadlines(sections.notableConditions).length,
            obligationCount: complianceObligations((policy.acordData as any)?.conditions).filter(
                (o) => o.severity === "critical" || o.severity === "high"
            ).length,
            hasAutoRenewal: hasAutoRenewal(sections.notableConditions),
            lastAnalyzedAt: policy.lastAnalyzedAt ?? null,
            documentCount: policy.documents.length,
        }).length
        return {
            id: policy.id,
            insurerName: policy.insurerName,
            // D11: two motor policies with the same insurer and the same number
            // of days left rendered as two identical rows. The branch, the
            // countdown and the insurer are not enough to tell one contract from
            // another — the policy number is. Through policyLabel, so a
            // placeholder sentinel never reaches the row.
            policyRef: displayPolicyNumber(policy.policyNumber),
            // P5-wallet-01: the asset identifier (plate / address / pet's name)
            // through the ONE module that owns the line→field rule. When
            // present the card renders it INSTEAD of the policy number — the
            // owner knows «ΙΖΤ-1234», not «SYMB-2025-MOT-…». Null (health,
            // life, …) leaves the row exactly as before.
            assetLabel: policyAssetIdentifier(policy),
            // Set below, once every row's identifier is known: two rows that
            // share a plate get their policy numbers back.
            showPolicyRef: false,
            termProgressPct,
            termStartLabel: termStart
                ? home.renewalTermStart.replace('{start}', formatDate(termStart, lang))
                : null,
            termAria: termStart
                ? home.renewalTermAria
                      .replace('{start}', formatDate(termStart, lang))
                      .replace('{end}', formatDate(endDate, lang))
                : null,
            icon: getBranchIcon(branch.id),
            titleLabel:
                days === 0
                    ? home.renewalToday.replace('{type}', branch.label[lang])
                    : days === 1
                        ? home.renewalInOneDay.replace('{type}', branch.label[lang])
                        : home.renewalInDays
                              .replace('{type}', branch.label[lang])
                              .replace('{days}', String(days)),
            // Athens-pinned: a bare toLocaleDateString resolves against the
            // RUNTIME zone, which is UTC on Vercel, so this rendered the
            // previous day for anything ending near Athens midnight.
            endDateLabel: formatDate(endDate, lang),
            days,
            premiumLabel: formatCurrencyValue(policy.premiumAmount, lang, policy.premiumCurrency || "EUR"),
            checkpointCount,
            checkpointLabel:
                checkpointCount === 0
                    ? null
                    : checkpointCount === 1
                        ? home.renewalCheckpointsOne
                        : home.renewalCheckpointsMany.replace('{count}', String(checkpointCount)),
        }
    })

    // D11, second sighting: the asset identifier REPLACED the policy number on
    // the row (P5-wallet-01), so two contracts on one plate rendered as one
    // row twice. When identifiers collide, the number comes back beside them.
    const assetLabelCounts = new Map<string, number>()
    for (const item of renewalItems) {
        if (item.assetLabel) assetLabelCounts.set(item.assetLabel, (assetLabelCounts.get(item.assetLabel) ?? 0) + 1)
    }
    for (const item of renewalItems) {
        item.showPolicyRef = Boolean(item.assetLabel) && (assetLabelCounts.get(item.assetLabel!) ?? 0) > 1
    }

    // The advisor's stored name can be synthetic — fall back to the account
    // email, which identifies the real counterparty, never to a fixture token.
    const agentName = customerRelationship
        ? displayPersonName(customerRelationship.agent.name) ||
          customerRelationship.agent.email ||
          ""
        : ""

    // Branch coverage map: tile states from policies + the cached score's
    // expected lines (already fetched above — no extra engine work)
    const policyTypeLabels = t.policyTypes as Record<string, string>
    const stateLabels = {
        covered: t.branches.statusCovered,
        attention: t.branches.statusAttention,
        not_held: t.branches.statusNotHeld,
        neutral: t.branches.statusNeutral,
    } as const
    // LIFECYCLE status in, never the stored string — buildBranchOverview's own
    // contract ("callers pass effectivePolicyStatus"), which /branches honours
    // and this page did not: an expired policy fed the map as stored-'active'
    // and painted its branch green while the /branches tile showed amber.
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

    // Severity BUCKETS of the same live-gap universe as openGapCount — the four
    // chips sum to gap.openCount by construction, and to what /coverage-insights
    // states, because all three read `liveGaps`.
    const gapSeverityCounts = {
        critical: liveGaps.filter((gap) => gap.severity === "critical").length,
        high: liveGaps.filter((gap) => gap.severity === "high").length,
        medium: liveGaps.filter((gap) => gap.severity === "medium").length,
        low: liveGaps.filter((gap) => gap.severity === "low").length,
    }

    // The last few things that changed, and whether we recorded why. The
    // dashboard could show a score and a list of recommendations with no
    // account of how either got there; this is the way in to that account.
    const recentChanges = timelineEntries.map((entry) => ({
        id: entry.id,
        title: entry.title[lang] || entry.title.en,
        at: entry.at.toISOString(),
        delta: entry.delta ?? null,
        explained: entry.cause !== null,
    }))

    // Layer 1 on the home: the customer's own picture of what matters, or the
    // way into saying it. Never a score — the hero stays the only verdict
    // surface — and the upload ACTION stays the hero's; this card only links.
    const protectionCard =
        protectionState.status === "completed" ? (
            attentionBundle ? (
                <ProtectionPrioritiesCard
                    areas={attentionBundle.areas}
                    summary={attentionBundle.summary}
                    priorityCount={protectionPriorities.length}
                    unsureCount={protectionState.unsureSteps.length}
                    // The hero's universe (status ≠ deleted), so both footers agree.
                    policyCount={policies.length}
                    language={lang}
                    mapLabels={t.onboarding.protectionProfile.summary}
                    labels={{
                        kicker: home.prioritiesKicker,
                        lead: home.prioritiesLead,
                        countLabel: home.prioritiesCountLabel,
                        unsureLabel: home.prioritiesUnsureLabel,
                        areaCountLabel: home.prioritiesAreaCountLabel,
                        unknownCountLabel: home.prioritiesUnknownCountLabel,
                        coveredCountLabel: home.prioritiesCoveredCountLabel,
                        limitsUnread: home.prioritiesLimitsUnread,
                        expiringSoon: home.prioritiesExpiringSoon,
                        lapsedOnly: home.prioritiesLapsedOnly,
                        noPolicies: home.prioritiesNoPolicies,
                        uploadCta: home.prioritiesUploadCta,
                        withPolicies: home.prioritiesWithPolicies,
                        absenceCaveat: home.prioritiesAbsenceCaveat,
                        alignmentCta: home.prioritiesAlignmentCta,
                        disclaimer: home.prioritiesDisclaimer,
                    }}
                />
            ) : null
        ) : (
            <ProtectionProfileResumeCard
                variant={protectionState.status === "in_progress" ? "in_progress" : "start"}
                labels={
                    protectionState.status === "in_progress"
                        ? { kicker: home.resumeInProgressKicker, body: home.resumeInProgressBody, cta: home.resumeInProgressCta }
                        : { kicker: home.resumeStartKicker, body: home.resumeStartBody, cta: home.resumeStartCta }
                }
            />
        )

    const planCard = (
        <ProtectionPlanCard
            steps={planStepViews}
            completed={setupCompleted}
            total={setupSteps.length}
            allDone={setupCompleted === setupSteps.length}
            moreOpenLabel={planMoreOpenLabel}
            moreOpenCount={openFindingCount}
            labels={{
                kicker: home.planKicker,
                // The TEMPLATE, not the joined string: the card interpolates it
                // so each number can carry its own data-count (plan.stepsDone /
                // plan.stepsTotal). A pre-joined «3 από 5» is a quantity the
                // count-consistency scan cannot attribute.
                progressTemplate: home.planProgress,
                upToDate: home.planUpToDate,
            }}
        />
    )

    // The audited footprint as the overview row's last cell — the ONE render
    // of portfolio.totalAnnualPremium on the page (it left the portfolio card).
    const premiumKpi =
        totalAnnualPremium > 0
            ? {
                  value: formatCurrencyValue(totalAnnualPremium, lang, premiumCurrency) || '€0',
                  label: home.totalAnnualPremium,
                  excludedParts: premiumExcludedParts,
              }
            : null

    return (
        <div className="pw-page-shell">
            <div className="mx-auto max-w-page-wide px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                {/* DIRECTION A (2026-09-03): the reference's grid — a main column of
                    two card tracks and a right rail — replaces six stacked
                    sections. Nothing left the page: the six section groups became
                    positions in one grid, and every card kept its data, its keys
                    and its honesty notes. What changed is what a reader meets
                    first: the facts row, the findings, the renewals — then the
                    map, the portfolio, and in the rail the people and the plan. */}
                <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                    <h1 className="text-h2 font-semibold tracking-tight text-foreground">
                        {home.title}
                    </h1>
                    {/* The page's ONE upload offer. The desktop FAB and the
                        portfolio card's link are gone; on an empty wallet the
                        hero's invitation is the offer, so this stands down. */}
                    {hasPolicies && (
                        <Link
                            href="/wallet/add"
                            className="pw-primary-button pw-btn-sm inline-flex min-h-11 items-center gap-2"
                        >
                            <Upload className="h-4 w-4" aria-hidden="true" />
                            {home.addNewPolicy}
                        </Link>
                    )}
                </div>

                {/* The review, when one is open. Above everything else on
                    purpose: a review responds to something that happened in the
                    customer's life, and nothing below does. */}
                {openReview && getReviewPolicy(openReview.trigger) && (
                    <div className="mb-5">
                        <RiskReviewCard
                            review={{
                                id: openReview.id,
                                trigger: openReview.trigger,
                                dueAt: openReview.dueAt.toISOString(),
                                scoreAtOpen: openReview.scoreAtOpen,
                                findingsAtOpen: openReview.findingsAtOpen,
                            }}
                            label={getReviewPolicy(openReview.trigger)!.label}
                            reason={getReviewPolicy(openReview.trigger)!.reason}
                        />
                    </div>
                )}

                <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
                    {/* ── Main column ─────────────────────────────────────── */}
                    <div className="grid min-w-0 gap-5 md:grid-cols-2">
                        {protectionCard && <div className="min-w-0 md:col-span-2">{protectionCard}</div>}
                        <div className="min-w-0 md:col-span-2">
                            <ProtectionStatusHero
                                hasPolicies={hasPolicies}
                                facts={facts}
                                areasLine={areasLine}
                                openRecommendationCount={activeRecommendations.length}
                                premium={premiumKpi}
                                language={lang}
                                labels={{
                                    kicker: home.heroKicker,
                                    meta: home.overviewMeta,
                                    cta: home.heroCta,
                                    emptyTitle: home.heroEmptyTitle,
                                    emptyBody: home.heroEmptyBody,
                                    emptyCta: home.heroEmptyCta,
                                }}
                            />
                        </div>

                        {/* Signup-selected plan continuity (never activated → offer checkout) */}
                        {carriedPlan && (
                            <div className="min-w-0 md:col-span-2">
                                <CarriedPlanCard planId={carriedPlan} billingPeriod={carriedBilling} />
                            </div>
                        )}

                        {/* Free-tier usage banner (Trigger A surface: approaching the policy cap).
                            The meter counts every stored policy — that is what checkPolicyLimit
                            blocks on. Metering only the in-force ones would promise headroom the
                            next upload does not actually have. */}
                        {standaloneUpgrade === "policy_upload_limit" && (
                            <div className="min-w-0 md:col-span-2">
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
                                        // The meter's "used" IS the policy count; its
                                        // limit is a PLAN fact, not a portfolio one —
                                        // separate keys keep «2/10» from reading as a
                                        // contradiction of «2 ασφαλιστήρια».
                                        usedCountKey: "portfolio.policyCount",
                                        limitCountKey: "entitlement.policyLimit",
                                    }}
                                />
                            </div>
                        )}

                        {/* What needs my attention, with the severity tally INSIDE it —
                            the reference's "score" slot, filled with counts. scroll-mt:
                            the plan card's «+N ακόμη» anchors here (href="#attention")
                            and the sticky top bar would otherwise cover the heading. */}
                        <div id="attention" className="min-w-0 scroll-mt-20">
                            <AttentionList
                                items={attentionItems}
                                totalCount={activeRecommendations.length}
                                language={lang}
                                tally={
                                    <CoverageGapsWidget
                                        variant="embedded"
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
                                            // `severityNote` and `recPriorityNote` are the
                                            // same sentence authored under two keys, and the
                                            // attention list below states it. Passing null
                                            // renders it once per page.
                                            note: null,
                                            groupLabel: home.severityGroupLabel,
                                        }}
                                    />
                                }
                                labels={{
                                    kicker: home.attentionKicker,
                                    viewAll: home.viewAllActions,
                                    emptyTitle: home.attentionEmptyTitle,
                                    emptyBody: home.attentionEmptyBody,
                                    priorityNote: home.recPriorityNote,
                                }}
                            />
                        </div>

                        <RenewalsTimelineCard
                            items={renewalItems}
                            // The TRUE count, not the rendered rows: items is capped
                            // at four, and the header used to count the capped list —
                            // eight upcoming renewals read as «6 ασφαλιστήρια».
                            totalCount={upcomingRenewals.length}
                            hasPolicies={policies.length > 0}
                            showUpgradeTeaser={isFreeTier && upcomingRenewals.length > 0}
                            labels={{
                                kicker: home.renewalTimeline,
                                policiesSuffixOne: home.policiesSuffixOne,
                                policiesSuffix: home.policiesSuffix,
                                trackExpirationsTitle: home.trackExpirationsTitle,
                                trackExpirationsBody: home.trackExpirationsBody,
                                noExpirationsTitle: home.noExpirationsTitle,
                                noExpirationsBody: home.noExpirationsBody,
                            }}
                        />

                        {/* What the wallet covers, by branch — and the way into
                            life-event reassessment, attached to the map it moves. */}
                        <div className="grid min-w-0 gap-3 md:col-span-2">
                            <BranchCoverageMap
                                entries={coverageMapEntries}
                                labels={{ kicker: home.coverageMapKicker, viewAll: home.viewAllBranches }}
                            />
                            <LifeEventPromptCard
                                chips={lifeEventChips}
                                labels={{
                                    kicker: home.lifeEventKicker,
                                    body: home.lifeEventBody,
                                    cta: home.lifeEventCta,
                                }}
                            />
                        </div>

                        {/* Portfolio: per-branch premium + documents. The total sits in
                            the overview row above; the upload offer is the page header's. */}
                        <div className="min-w-0 md:col-span-2">
                            <PortfolioSummaryCard
                                totalLabel={null}
                                showAddLink={false}
                                chips={portfolioChips}
                                recentDocuments={recentDocuments}
                                labels={{
                                    kicker: home.portfolioKicker,
                                    totalAnnualPremium: home.totalAnnualPremium,
                                    recentDocuments: home.recentDocuments,
                                    noDocuments: home.noDocuments,
                                    addNewPolicy: home.addNewPolicy,
                                }}
                                excludedParts={premiumExcludedParts}
                            />
                        </div>

                        {/* Trigger G: multi-insurer portfolio insight for free tier */}
                        {standaloneUpgrade === "multi_insurer_insights" && (
                            <div className="min-w-0 md:col-span-2">
                                <UpgradeTriggerCard
                                    featureKey="multi_insurer_insights"
                                    triggerSource="home_multi_insurer"
                                    returnTo="/protection"
                                    dismissible
                                />
                            </div>
                        )}
                    </div>

                    {/* ── Rail: the people and the plan ───────────────────── */}
                    <aside className="grid min-w-0 gap-5">
                        <AdvisorSupportRow
                            agentConnected={Boolean(customerRelationship)}
                            agentName={agentName || null}
                            labels={{
                                title: home.advisorTitle,
                                agentStatus: home.agentStatus,
                                agentLine: customerRelationship
                                    ? home.agentConnected.replace('{name}', agentName)
                                    : home.noAgent,
                                hint: customerRelationship ? home.advisorConnectedHint : home.advisorNoneHint,
                                cta: customerRelationship ? home.advisorOpen : home.advisorConnect,
                                helpTitle: home.helpTitle,
                                helpOpen: home.helpOpen,
                            }}
                        />

                        {planCard}

                        {/* The standing watch. Non-entitled accounts see what
                            monitoring IS — future tense, no fabricated signals. */}
                        {monitorEntitled && monitorSignals ? (
                            <ProtectionMonitorCard
                                signals={monitorSignals}
                                lastCheckedLabel={monitorLastCheckedLabel}
                                labels={{
                                    kicker: home.monitorKicker,
                                    notYetAssessed: home.monitorNotAssessed,
                                    detailsLink: home.monitorDetailsLink,
                                }}
                            />
                        ) : !monitorEntitled ? (
                            <UpgradeTriggerCard
                                featureKey="protection_monitoring"
                                triggerSource="home_protection_monitor"
                                returnTo="/dashboard"
                            />
                        ) : null}

                        <RecentChangesWidget
                            changes={recentChanges}
                            labels={{
                                kicker: home.recentChangesKicker,
                                empty: home.recentChangesEmpty,
                                viewAll: home.recentChangesViewAll,
                                explained: home.recentChangesExplained,
                            }}
                        />
                    </aside>
                </div>
            </div>
        </div>
    )
}
