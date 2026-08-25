export const runtime = 'nodejs'

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { getTranslations } from "@/lib/i18n"
import { effectivePolicyStatus, isPolicyCoverageActive } from "@/lib/policy-status"
import { getGapEngineSnapshot, type GapEngineSnapshot } from "@/lib/services/gap-engine"
import { getRiskIntelligence } from "@/lib/services/risk-dna/service"
import { resolveUserEntitlements } from "@/lib/subscription-entitlements"
import { declarableLifeEvents, getLifeEvent, magnitudePrompt } from "@/lib/services/life-events/registry"
import { getLifeEventHistory } from "@/lib/services/life-events/service"
import { QUICK_START_QUESTIONS, quickStartComplete } from "@/lib/services/onboarding/quick-start"
import { toLifeContext } from "@/lib/services/gap-engine/life-context"
import { submitQuickStart } from "@/app/(protected)/insights/risk-profile/actions"
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
 * The three old routes stay alive until V2-P2-03 removes them.
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

    const [entitlements, profileRecord, policies, score] = await Promise.all([
        resolveUserEntitlements(dbUser.id),
        db.policyholderProfile.findUnique({ where: { userId: dbUser.id } }),
        db.policy.findMany({
            // status ≠ deleted: a soft-deleted row neither renders nor counts —
            // the same held-policy predicate as the wallet and both source
            // surfaces, so branch tile counts sum to portfolio.policyCount.
            where: { ownerUserId: dbUser.id, status: { not: 'deleted' } },
            select: { id: true, lineOfBusiness: true, status: true, endDate: true, acordData: true },
        }),
        // Read-only: expectedLines for tile states, never a rendered score.
        db.protectionScore.findUnique({ where: { userId: dbUser.id } }),
    ])

    // Same signal as /coverage-insights: at least one policy provides
    // coverage TODAY (drives the recommendations empty state).
    const hasPolicies = policies.some((policy) => isPolicyCoverageActive(policy))

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
        />
    )
}
