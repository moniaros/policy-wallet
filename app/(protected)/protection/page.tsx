export const runtime = 'nodejs'

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { getTranslations } from "@/lib/i18n"
import { effectivePolicyStatus, isPolicyCoverageActive } from "@/lib/policy-status"
import { gapsOnActiveCoverage } from "@/lib/gaps/gap-universe"
import { resolveInsurerDisplay } from "@/lib/wallet/insurer-registry"
import { displayInsurerName, displayPolicyNumber } from "@/lib/wallet/policy-identity"
import { getGapEngineSnapshot, type GapEngineSnapshot } from "@/lib/services/gap-engine"
import { getRiskIntelligence } from "@/lib/services/risk-dna/service"
import { resolveUserEntitlements } from "@/lib/subscription-entitlements"
import { declarableLifeEvents, getLifeEvent, magnitudePrompt } from "@/lib/services/life-events/registry"
import { getLifeEventHistory } from "@/lib/services/life-events/service"
import { QUICK_START_QUESTIONS, quickStartComplete } from "@/lib/services/onboarding/quick-start"
import { toLifeContext } from "@/lib/services/gap-engine/life-context"
import { submitQuickStart } from "@/app/(protected)/protection/quick-start-actions"
import { ProtectionSurface } from "@/components/protection/ProtectionSurface"
import type { ProtectionLens } from "@/components/protection/ProtectionLensTabs"
import type { BranchTileState } from "@/lib/insurance/branch-page"

/**
 * «Η προστασία μου» — the §4.2 consolidated protection surface.
 *
 * One route, two lenses over one portfolio (ανά κλάδο / ανά κίνδυνο, chosen by
 * `?lens=`), plus the surviving /coverage-insights content (recommendations,
 * wizard, life events, refresh, upgrade). Each lens is the SOURCE surface's own
 * derivation, moved: the branch tiles are buildBranchOverview over lifecycle
 * statuses, the risk lens is getRiskIntelligence rendered by the same view.
 * The three old routes were removed by V2-P2-03; this is their one home.
 *
 * Read-only, like both sources: no engine run happens in render — the WRITE
 * path lives behind the explicit refresh action, the upload pipeline and cron.
 */
export default async function ProtectionPage({
    searchParams,
}: {
    searchParams: Promise<{ lens?: string }>
}) {
    const { lens: lensParam } = await searchParams
    const lens: ProtectionLens = lensParam === "risk" ? "risk" : "branch"

    const { dbUser } = await getAuthenticatedUser()
    const lang: 'el' | 'en' = dbUser.preferredLanguage === 'en' ? 'en' : 'el'
    const t = getTranslations(lang)

    const [entitlements, profileRecord, policies, score, allGapInstances] = await Promise.all([
        resolveUserEntitlements(dbUser.id),
        db.policyholderProfile.findUnique({ where: { userId: dbUser.id } }),
        db.policy.findMany({
            // status ≠ deleted: a soft-deleted row neither renders nor counts —
            // the same held-policy predicate as the wallet and both source
            // surfaces, so branch tile counts sum to portfolio.policyCount.
            where: { ownerUserId: dbUser.id, status: { not: 'deleted' } },
            select: {
                id: true,
                lineOfBusiness: true,
                status: true,
                endDate: true,
                acordData: true,
                // The findings surface's extra needs (A-10…A-21):
                policyNumber: true,
                insurerName: true,
                // Set only by the deep pipeline — the A-13/A-17 discriminator.
                lastAnalyzedAt: true,
            },
        }),
        // Read-only: expectedLines for tile states, never a rendered score.
        db.protectionScore.findUnique({ where: { userId: dbUser.id } }),
        // Open findings — same query as the source surface (minus the unused
        // definition include); rows serialize into client props, so only the
        // fields the client reads travel (no acordData per gap).
        db.gapInstance.findMany({
            where: {
                policy: { ownerUserId: dbUser.id },
                status: { in: ['detected', 'acknowledged', 'open'] },
            },
            include: {
                policy: {
                    select: {
                        id: true,
                        policyNumber: true,
                        lineOfBusiness: true,
                        insurerName: true,
                        status: true,
                        endDate: true,
                    },
                },
            },
            orderBy: { detectedAt: 'desc' },
        }),
    ])

    // CRITICAL (source-surface rule, verbatim): coverage insights describe the
    // protection you have TODAY. A lapsed policy is not protection — its
    // findings must not be presented as the current coverage picture (they
    // stay on that policy's own page). The tally therefore counts through the
    // shared predicate (gapsOnActiveCoverage) — the same helper the dashboard
    // filters through, so the surfaces state one gap universe (§2.8: 43 vs 33
    // was this filter existing on one side only).
    const activePolicies = policies.filter((policy) => isPolicyCoverageActive(policy))
    const expiredPolicies = policies.filter(
        (policy) => !isPolicyCoverageActive(policy) && effectivePolicyStatus(policy) === 'expired'
    )
    const gapInstances = gapsOnActiveCoverage(allGapInstances, policies)

    // Same signal as /coverage-insights: at least one policy provides
    // coverage TODAY (drives the recommendations empty state).
    const hasPolicies = activePolicies.length > 0

    // A-13/A-17 discriminator: lastAnalyzedAt is set ONLY by the deep
    // pipeline, so "0 findings" over a null column is nobody-looked, never
    // checked-and-clear.
    const hasDeepAnalysis = activePolicies.some((policy) => policy.lastAnalyzedAt != null)

    // Read-only snapshot (recommendations + smart content + completeness).
    let engineResult: GapEngineSnapshot | null = null
    try {
        engineResult = await getGapEngineSnapshot(dbUser.id)
    } catch (err) {
        console.error("Gap engine snapshot failed on /protection:", err)
    }

    // Life events — declared history, and which one-time events are spent.
    const declaredEvents = await getLifeEventHistory(dbUser.id).catch(() => [])
    const recordedIds = new Set(declaredEvents.map((e) => e.definitionId))
    const lifeEventOptions = declarableLifeEvents().map((definition) => ({
        id: definition.id,
        domain: definition.domain,
        label: definition.label,
        description: definition.description,
        needsMagnitude: magnitudePrompt(definition.id) !== null,
        magnitudeLabel: magnitudePrompt(definition.id),
        alreadyRecorded: !definition.repeatable && recordedIds.has(definition.id),
    }))
    const recentLifeEvents = declaredEvents.slice(0, 5).map((event) => ({
        id: event.id,
        definitionId: event.definitionId,
        label: getLifeEvent(event.definitionId)?.label ?? {
            en: event.definitionId,
            el: event.definitionId,
        },
        occurredAt: event.occurredAt.toISOString(),
    }))

    // ── The active lens's data (one lens per request) ──────────────────
    const branchLens =
        lens === "branch"
            ? {
                  // The REAL lifecycle, never the stale stored string — an
                  // expired policy renders attention, never covered.
                  policies: policies.map((policy) => ({
                      id: policy.id,
                      lineOfBusiness: policy.lineOfBusiness,
                      status: effectivePolicyStatus(policy),
                      endDate: policy.endDate,
                  })),
                  expectedLines: (score?.expectedLines as string[] | null) ?? [],
                  labels: {
                      stateLabels: {
                          covered: t.branches.statusCovered,
                          attention: t.branches.statusAttention,
                          not_held: t.branches.statusNotHeld,
                          neutral: t.branches.statusNeutral,
                      } as Record<BranchTileState, string>,
                      policyTypeLabels: t.policyTypes as Record<string, string>,
                      onePolicy: t.branches.onePolicy,
                      policyCountN: t.branches.policyCountN,
                  },
              }
            : null

    const riskLens =
        lens === "risk"
            ? {
                  intelligence: await getRiskIntelligence(dbUser.id),
                  // Gated on the opener's OWN questions, never the health index
                  // (source-surface rule: the index refuses to report below a
                  // third, so gating on it re-asked answered questions forever).
                  quickStart: quickStartComplete(toLifeContext(profileRecord))
                      ? null
                      : { questions: QUICK_START_QUESTIONS, onSubmit: submitQuickStart },
              }
            : null

    const engine = engineResult
        ? {
              recommendations: engineResult.recommendations.map((r) => ({
                  ...r,
                  createdAt: r.createdAt.toISOString(),
              })),
              smartContent: engineResult.smartContent,
              profileIncomplete: engineResult.profileCompleteness < 80,
              showWizard: engineResult.profileCompleteness < 80,
              wizardInitialData: profileRecord
                  ? {
                        maritalStatus: profileRecord.maritalStatus,
                        dependentsCount: profileRecord.dependentsCount,
                        employmentStatus: profileRecord.employmentStatus,
                        ownsHome: profileRecord.ownsHome,
                        mortgageAmount: profileRecord.mortgageAmount ? Number(profileRecord.mortgageAmount) : null,
                        hasPets: profileRecord.hasPets,
                        vehiclesCount: profileRecord.vehiclesCount,
                        annualIncome: profileRecord.annualIncome ? Number(profileRecord.annualIncome) : null,
                        occupation: profileRecord.occupation,
                        travelsFrequently: profileRecord.travelsFrequently,
                        hasLoans: profileRecord.hasLoans,
                        loanAmount: profileRecord.loanAmount ? Number(profileRecord.loanAmount) : null,
                        smokingStatus: profileRecord.smokingStatus,
                        lifeEvents: Array.isArray(profileRecord.lifeEvents)
                            ? (profileRecord.lifeEvents as Array<{ type: string; date: string }>)
                            : undefined,
                        childrenCount: profileRecord.childrenCount,
                        residenceType: profileRecord.residenceType,
                        propertiesOwned: profileRecord.propertiesOwned,
                        rentsOutProperty: profileRecord.rentsOutProperty,
                        ownsBoat: profileRecord.ownsBoat,
                        ownsBusiness: profileRecord.ownsBusiness,
                        businessEmployees: profileRecord.businessEmployees,
                        savingsAmount: profileRecord.savingsAmount ? Number(profileRecord.savingsAmount) : null,
                        valuablesValue: profileRecord.valuablesValue ? Number(profileRecord.valuablesValue) : null,
                        activities: Array.isArray(profileRecord.activities)
                            ? (profileRecord.activities as string[])
                            : null,
                        cyberExposure: profileRecord.cyberExposure,
                        retirementPlanning: profileRecord.retirementPlanning,
                    }
                  : undefined,
              showUpgradeTrigger:
                  entitlements.tier === "free" && engineResult.recommendations.length > 0,
          }
        : null

    return (
        <ProtectionSurface
            language={lang}
            lens={lens}
            labels={{
                title: t.protection.title,
                subtitle: t.protection.subtitle,
                lens: {
                    aria: t.protection.lensAria,
                    byBranch: t.protection.lensByBranch,
                    byRisk: t.protection.lensByRisk,
                },
                refresh: {
                    refresh: t.insights.refreshAnalysis,
                    refreshing: t.insights.refreshingAnalysis,
                    failed: t.insights.refreshFailed,
                },
            }}
            branchLens={branchLens}
            riskLens={riskLens}
            engine={engine}
            tier={entitlements.tier}
            hasPolicies={hasPolicies}
            lifeEvents={{ options: lifeEventOptions, recent: recentLifeEvents }}
            findings={{
                gaps: gapInstances,
                stats: {
                    critical: gapInstances.filter((g) => g.severity === 'critical').length,
                    high: gapInstances.filter((g) => g.severity === 'high').length,
                    medium: gapInstances.filter((g) => g.severity === 'medium').length,
                    low: gapInstances.filter((g) => g.severity === 'low').length,
                    totalGaps: gapInstances.length,
                    totalPolicies: activePolicies.length,
                    totalCoverage: 0,
                },
                // A-12 — the honesty notice naming what the tally does NOT count.
                excludedExpired: expiredPolicies.map((policy) => ({
                    id: policy.id,
                    label:
                        resolveInsurerDisplay(policy.insurerName).displayName ||
                        displayPolicyNumber(policy.policyNumber) ||
                        '',
                })),
                isPaid: entitlements.isPaid,
                hasDeepAnalysis,
                // Same gate as the source surface: deep gap analysis is
                // pro-tier; below it the A-17 state offers the unlock CTA.
                // H-009, answered 2026-08-25: deep analysis sits on BOTH paid
                // tiers. Was `tier !== 'pro'`, which locked out paying Plus
                // subscribers while the CTA told them Plus would unlock it —
                // the copy was fixed first because it was false either way;
                // this is the gate the owner decided.
                isDeepAnalysisLocked: entitlements.tier === 'free',
                canUseAgentCollaboration: entitlements.limits.agentCollaboration,
                policies: activePolicies.map((p) => ({
                    id: p.id,
                    insurerName: displayInsurerName(p.insurerName, p.lineOfBusiness || 'Policy'),
                    lineOfBusiness: {
                        code: (p.acordData as any)?.policy?.lineOfBusiness?.code || p.lineOfBusiness || 'other',
                        name:
                            (p.acordData as any)?.policy?.lineOfBusiness?.Description ||
                            p.lineOfBusiness ||
                            (lang === 'el' ? 'Άλλο Συμβόλαιο' : 'Other Policy'),
                    },
                })),
            }}
        />
    )
}
