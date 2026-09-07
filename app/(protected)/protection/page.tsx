export const runtime = 'nodejs'

import { scrubRenderableText } from '@/lib/wallet/policy-identity'
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { getTranslations } from "@/lib/i18n"
import { effectivePolicyStatus, isPolicyCoverageActive } from "@/lib/policy-status"
import { gapsOnActiveCoverage } from "@/lib/gaps/gap-universe"
import { resolveInsurerDisplay } from "@/lib/wallet/insurer-registry"
import { displayPolicyNumber } from "@/lib/wallet/policy-identity"
import { getGapEngineSnapshot, type GapEngineSnapshot } from "@/lib/services/gap-engine"
import { getRiskIntelligence } from "@/lib/services/risk-dna/service"
import { resolveUserEntitlements } from "@/lib/subscription-entitlements"
import { canRunDeepAnalysis } from "@/lib/monetization/feature-gates"
import { declarableLifeEvents, getLifeEvent, magnitudePrompt } from "@/lib/services/life-events/registry"
import { getLifeEventHistory } from "@/lib/services/life-events/service"
import { QUICK_START_QUESTIONS, quickStartComplete } from "@/lib/services/onboarding/quick-start"
import { toLifeContext } from "@/lib/services/gap-engine/life-context"
import { submitQuickStart } from "@/app/(protected)/protection/quick-start-actions"
import { loadAttentionAreas } from "@/lib/protection/load-attention-areas"
import { areaListItems, unknownFactorItems } from "@/components/protection/area-detail-model"
import { ProtectionSurface } from "@/components/protection/ProtectionSurface"
import type { ProtectionLens } from "@/components/protection/ProtectionLensTabs"
import { deriveCoverageStatus, type CoverageStatusId } from "@/lib/protection/coverage-status"
import { parseFamilyFilter, parseStatusFilter } from "@/lib/protection/coverage-families"
import { chooseProtectionNextStep } from "@/lib/protection/next-step"
import { partitionByAssessment } from "@/lib/gaps/assessment-coverage"
import { attemptedRuleCountOf, describeFindingsProvenance, findingsProvenanceLine, formatProvenanceDate } from "@/lib/gaps/findings-provenance"
import { orderByProvenance } from "@/lib/gaps/provenance"
import { provenanceLabelWithCitation } from "@/components/gaps/provenance-label"
import { resolveGapContent } from "@/lib/wallet/gap-report"
import { areaForLob } from "@/lib/protection/domains"
import { normalizeBranch } from "@/lib/insurance/taxonomy"
import { readLiveGapRows } from "@/lib/gaps/gap-rows"
import { resolveUserLanguage } from "@/lib/i18n/resolve-language"

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
/** The model's stored prose, with policy placeholders and fixture tokens redacted; null stays null. */
const scrubProse = (text: string | null) => (text ? scrubRenderableText(text) : null)

export default async function ProtectionPage({
    searchParams,
}: {
    searchParams: Promise<{ lens?: string; status?: string; family?: string }>
}) {
    const { lens: lensParam, status: statusParam, family: familyParam } = await searchParams
    const lens: ProtectionLens = lensParam === "risk" ? "risk" : "branch"
    // The two filters of the category list — allow-listed, never validated
    // against a reader (an unknown value is simply «Όλα»).
    const statusFilter: CoverageStatusId | null = parseStatusFilter(statusParam)
    const familyFilter = parseFamilyFilter(familyParam)

    const { dbUser } = await getAuthenticatedUser()
    const lang: 'el' | 'en' = resolveUserLanguage(dbUser.preferredLanguage)
    const t = getTranslations(lang)

    const [entitlements, profileRecord, policies, score, allGapInstances, attention, runs] = await Promise.all([
        resolveUserEntitlements(dbUser.id),
        db.policyholderProfile.findUnique({ where: { userId: dbUser.id } }),
        db.policy.findMany({
            where: { ownerUserId: dbUser.id, status: { not: 'deleted' } },
            select: {
                id: true,
                lineOfBusiness: true,
                status: true,
                endDate: true,
                acordData: true,
                policyNumber: true,
                insurerName: true,
                lastAnalyzedAt: true,
            },
        }),
        db.protectionScore.findUnique({ where: { userId: dbUser.id } }),
        readLiveGapRows({ scope: "disclosed",
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
                // The run each finding came from, so the list can be dated and
                // the coverage status can tell a current run from a stale one.
                analysisRun: { select: { finishedAt: true } },
                // The rule's authored description (English) backs the English
                // «what it means»; the Greek one is the model's description of
                // the rule-decided gap (aiSuggestionEl), as on the policy page.
                definition: { select: { description: true } },
            },
            orderBy: { detectedAt: 'desc' },
        }),
        loadAttentionAreas({ userId: dbUser.id, language: lang }),
        // The wallet's recent analysis runs, reduced in memory to the latest
        // attempt and the last completed run per policy — the findings
        // provenance and the composition both read them. One query, not one
        // per policy.
        db.policyAnalysisRun.findMany({
            where: { userId: dbUser.id },
            orderBy: { createdAt: 'desc' },
            take: 200,
            select: { id: true, policyId: true, status: true, createdAt: true, finishedAt: true, attemptedRules: true },
        }),
    ])

    // «There are still unknown factors»: some area's composition lists a fact
    // the engine lacks. The gate of the «Πλήρες προφίλ» path below the areas.
    const hasUnknownFactors = attention.areas.some((area) => area.unknownFactors.length > 0)

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
    const riskLens =
        lens === "risk"
            ? {
                  intelligence: await getRiskIntelligence(dbUser.id),
                  attention: {
                      items: areaListItems(attention.areas, lang, t.protection.attention),
                      summary: attention.summary,
                      unknownFactors: unknownFactorItems(attention.factorsToResolve, attention.areas, lang),
                      copy: t.protection.attention,
                  },
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
              showWizard: hasUnknownFactors,
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
                        // Health & lifestyle, and the building-manager role.
                        // Audit B (Sept 2026): these eight were never passed,
                        // so the wizard rendered them empty and every save sent
                        // the empty state back — erasing the stored Art. 9
                        // answers. A stored null is passed as null on purpose:
                        // it tells the wizard «nothing here to protect».
                        // tests/unit/risk-profile-save-never-erases-health
                        // derives the wizard's prop keys and fails if one is
                        // omitted here again.
                        gender: profileRecord.gender,
                        heightCm: profileRecord.heightCm,
                        weightKg: profileRecord.weightKg,
                        chronicConditions: Array.isArray(profileRecord.chronicConditions)
                            ? (profileRecord.chronicConditions as string[])
                            : null,
                        familyMedicalHistory: Array.isArray(profileRecord.familyMedicalHistory)
                            ? (profileRecord.familyMedicalHistory as string[])
                            : null,
                        drivingRecord: profileRecord.drivingRecord,
                        activityLevel: profileRecord.activityLevel,
                        isBuildingManager: profileRecord.isBuildingManager,
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

    // ── The story's facts — decided once, rendered once ────────────────────
    const coverage = deriveCoverageStatus({
        policies,
        gapRows: allGapInstances
            .filter((g) => Boolean(g.policyId))
            .map((g) => ({
                policyId: g.policyId as string,
                slug: g.definition.slug,
                analysisRunId: g.analysisRunId,
                runFinishedAt: g.analysisRun?.finishedAt ?? null,
            })),
        runs,
        // null when no score row exists: then nothing may be «Χωρίς ασφαλιστήριο».
        expectedLines: score ? ((score.expectedLines as string[] | null) ?? []) : null,
        coverHeldElsewhere: Array.isArray(profileRecord?.coverHeldElsewhere)
            ? (profileRecord.coverHeldElsewhere as unknown[]).filter((x): x is string => typeof x === 'string')
            : [],
    })
    const policyTypeLabels = t.policyTypes as Record<string, string>
    const branchTitle = (id: string, fallback: { el: string; en: string }) => policyTypeLabels[id] || fallback[lang]

    // The findings on active coverage, explained: the rule's authored words for
    // «what it means», the provenance class in plain language for «why», the
    // area of life it concerns. Under review is listed apart, never counted.
    const gapViews = orderByProvenance(gapInstances, (g) => g.definition.slug).map((g) => {
        const lob = g.policy?.lineOfBusiness ?? null
        const branch = normalizeBranch(lob)
        // The card's title comes from the authored content map, bilingual and
        // deduplicated by concept; a slug the map has not learned gets a
        // generic heading and a Sentry tag, never the model's prose.
        const content = resolveGapContent(g.definition.slug, { lineOfBusiness: lob })
        return {
            id: g.id,
            policyId: g.policyId ?? g.policy?.id ?? null,
            title: lang === 'el' ? content.titleEl : content.titleEn,
            // Rules decide a gap; the model only describes one. The description
            // is the model's, marked as such at the point of use (the list's
            // inline AI disclaimer), and absent rather than English when the
            // model wrote none in Greek.
            // Through the prose scrub: the model's sentence can carry a stored
            // placeholder («Unknown Insurer», «PENDING-…») verbatim, and nothing
            // downstream reads the identity columns to catch it. Real extracted
            // names pass untouched (owner decision 2026-09-07).
            meaning: scrubProse(lang === 'el' ? g.aiSuggestionEl || null : g.definition.description || g.aiSuggestion || null),
            why: t.protection.why[g.provenance],
            provenanceLabel: provenanceLabelWithCitation(g.definition.slug, lang, t.provenance),
            area: areaForLob(lob)?.label[lang] ?? null,
            branch: branchTitle(branch.id, branch.label),
            underReview: g.provenance === 'under_review',
        }
    })
    const gapItems = gapViews.filter((v) => !v.underReview)
    const underReviewItems = gapViews.filter((v) => v.underReview)
    const gapState = !hasPolicies ? 'no_policies' : !hasDeepAnalysis ? 'not_analysed' : gapViews.length === 0 ? 'clear' : 'findings'
    const activeAssessment = partitionByAssessment(activePolicies)

    // One dated line for the list: the wallet's latest attempt and its last
    // completed run, so the reader knows which check the findings come from.
    const latestAttempt = runs[0] ?? null
    const lastCompleted =
        [...runs]
            .filter((r) => r.status === 'completed' || r.status === 'completed_with_warnings')
            .sort((a, b) => (b.finishedAt ?? b.createdAt).getTime() - (a.finishedAt ?? a.createdAt).getTime())[0] ?? null
    const provenanceLine =
        runs.length === 0
            ? null
            : findingsProvenanceLine(
                  describeFindingsProvenance(
                      gapInstances.map((g) => ({ analysisRunId: g.analysisRunId, runFinishedAt: g.analysisRun?.finishedAt ?? null })),
                      latestAttempt ? { ...latestAttempt, attemptedRuleCount: attemptedRuleCountOf(latestAttempt.attemptedRules) } : null,
                      lastCompleted ? { ...lastCompleted, attemptedRuleCount: attemptedRuleCountOf(lastCompleted.attemptedRules) } : null
                  ),
                  t.gapProvenance,
                  lang
              )

    // THE next step — one, from facts (lib/protection/next-step.ts).
    const nextStep = chooseProtectionNextStep({
        inForcePolicyCount: activePolicies.length,
        analysedPolicyCount: activePolicies.filter((p) => p.lastAnalyzedAt != null).length,
        deepAnalysisAllowed: canRunDeepAnalysis(entitlements.tier),
        summary: coverage.summary,
        classifiedFindingCount: gapItems.length,
        unknownFactorCount: attention.factorsToResolve.length,
        recommendationCount: engineResult?.recommendations.length ?? 0,
    })
    const stepCopy = t.protection.nextStep[nextStep.id]
    const stepCta =
        nextStep.id === 'answer' && nextStep.count === 1
            ? t.protection.nextStep.answer.ctaOne
            : stepCopy.cta.replace('{n}', String(nextStep.count ?? ''))

    const heldElsewhereLabels = coverage.rows.filter((r) => r.bucket === 'held_elsewhere').map((r) => branchTitle(r.branch.id, r.branch.label))
    const lastCheckedLabel = coverage.summary.lastCheckedAt
        ? t.protection.improve.lastChecked.replace('{date}', formatProvenanceDate(coverage.summary.lastCheckedAt, lang))
        : t.protection.improve.neverChecked
    const refreshLabels = {
        refresh: t.insights.refreshAnalysis,
        refreshing: t.insights.refreshingAnalysis,
        failed: t.insights.refreshFailed,
    }

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
                refresh: refreshLabels,
                fullProfile: {
                    title: t.protection.attention.detail.fullProfileTitle,
                    lead: t.protection.attention.detail.fullProfileLead,
                },
            }}
            nextStep={{ step: nextStep, title: t.protection.nextStep.title, body: stepCopy.body, cta: stepCta }}
            engineUnavailable={engineResult === null}
            engineUnavailableText={t.protection.gaps.engineUnavailable}
            summary={{ summary: coverage.summary, heldElsewhereLabels, copy: { ...t.protection.summary, status: t.protection.status } }}
            gaps={{
                items: gapItems,
                underReview: underReviewItems,
                visibleLimit: entitlements.tier === 'free' ? 2 : null,
                provenanceLine,
                state: gapState,
                isDeepAnalysisLocked: !canRunDeepAnalysis(entitlements.tier),
                assessedCount: activeAssessment.assessed.length,
                excludedCount: activeAssessment.excludedCount,
                excludedExpired: expiredPolicies.map(
                    (policy) => resolveInsurerDisplay(policy.insurerName).displayName || displayPolicyNumber(policy.policyNumber) || ''
                ),
                copy: { ...t.protection.gaps, underReviewDisclosure: t.provenance.underReviewDisclosure },
            }}
            categories={{
                rows: coverage.rows,
                family: familyFilter,
                status: statusFilter,
                copy: {
                    ...t.protection.categories,
                    status: t.protection.status,
                    caveats: t.protection.statusCaveats,
                    filters: t.protection.filters,
                    policyTypeLabels,
                },
            }}
            riskLens={riskLens}
            life={{
                lifeEvents: { options: lifeEventOptions, recent: recentLifeEvents },
                wizard: { show: Boolean(engine?.showWizard), initialData: engine?.wizardInitialData },
                copy: t.protection.life,
            }}
            improve={{
                recommendationCount: engineResult ? engineResult.recommendations.length : null,
                showUpgradeTrigger: Boolean(engine?.showUpgradeTrigger),
                lastCheckedLabel,
                copy: { ...t.protection.improve, refresh: refreshLabels },
            }}
        />
    )
}
