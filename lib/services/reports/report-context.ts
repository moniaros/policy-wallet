import { db } from "@/lib/db"
import { composeFindings, describeCatalogueStaleness, type Composition } from "@/lib/gaps/composition"
import {
    attemptedRuleCountOf,
    describeFindingsProvenance,
    findingsProvenanceLine,
    formatProvenanceDate,
    type ProvenanceLine,
} from "@/lib/gaps/findings-provenance"
import { readLiveGapRows } from "@/lib/gaps/gap-rows"
import { getTranslations } from "@/lib/i18n"
import { resolvePolicyLifecycle } from "@/lib/policy-status"
import { extractionConfirmation, resolveRecordStatus, type RecordStatusResult } from "@/lib/wallet/record-status"

/**
 * Everything a report needs to say the same things the app says.
 *
 * The two report routes — the agent's branded report and the customer's own
 * savings report — had built this inline, in duplicate. That is exactly how the
 * report became a third surface that can contradict the other two: the app grew
 * a record-state line and a composition, and neither report followed, because
 * following meant editing the same block twice (PW-BRIDGE-01 C-03, C-04).
 *
 * Both routes now read from here, so a surface can no longer drift by omission.
 * What a caller does with it is still the caller's business — the branded report
 * adds agency branding, the customer's does not.
 */
export interface ReportContext {
    /** The analysis whose prose the report prints. */
    resultJson: Record<string, unknown>
    finishedAt: Date | null
    /** Rule-decided gaps, live rows only, in the shape the generator takes. */
    gaps: { slug: string; severity?: string }[]
    /** Which run the findings came from, and whether the latest attempt is that run. */
    provenance: ProvenanceLine | null
    /** V3: the run predates the check plan — what was checked cannot be stated. */
    prePlan: { dateLabel: string | null } | null
    /** Goal 4: checks were added after the run. */
    staleCatalogue: { dateLabel: string | null } | null
    /** B2: what the rules actually checked, in two lines with their denominators. */
    composition: Composition | null
    /** B1: where the work on this record has got to — «Προς επιβεβαίωση» and friends. */
    recordStatus: RecordStatusResult | null
}

/**
 * Build it, or return null when there is no completed analysis to report on —
 * which is the one case both routes already answer with a 404.
 */
export async function buildReportContext(params: {
    policyId: string
    language: "el" | "en"
}): Promise<ReportContext | null> {
    const { policyId, language } = params

    const [policy, run, latestAttempt] = await Promise.all([
        db.policy.findUnique({
            where: { id: policyId },
            select: {
                lineOfBusiness: true,
                status: true,
                endDate: true,
                policyNumber: true,
                insurerName: true,
                acordData: true,
            },
        }),
        db.policyAnalysisRun.findFirst({
            where: { policyId, status: { in: ["completed", "completed_with_warnings"] } },
            orderBy: { finishedAt: "desc" },
            select: { resultJson: true, finishedAt: true, createdAt: true, attemptedRules: true },
        }),
        db.policyAnalysisRun.findFirst({
            where: { policyId },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                status: true,
                finishedAt: true,
                createdAt: true,
                attemptedRules: true,
                blockedReason: true,
            },
        }),
    ])

    if (!policy || !run?.resultJson) return null

    const gapRows = await readLiveGapRows({
        scope: "disclosed",
        where: { policyId, status: "open", supersededAt: null },
        select: {
            severity: true,
            analysisRunId: true,
            analysisRun: { select: { finishedAt: true } },
            definition: { select: { slug: true } },
        },
    })

    const provenance = findingsProvenanceLine(
        describeFindingsProvenance(
            gapRows.map((g) => ({ analysisRunId: g.analysisRunId, runFinishedAt: g.analysisRun?.finishedAt ?? null })),
            latestAttempt
                ? { ...latestAttempt, attemptedRuleCount: attemptedRuleCountOf(latestAttempt.attemptedRules) }
                : null,
            { id: "prose-run", status: "completed", finishedAt: run.finishedAt }
        ),
        getTranslations(language).gapProvenance,
        language
    )

    const runDateLabel = formatProvenanceDate(run.finishedAt ?? null, language)
    const attemptedPlan = (run.attemptedRules ?? null) as { slugs?: unknown; catalogueVersion?: unknown } | null
    const hasPlan = Array.isArray(attemptedPlan?.slugs)

    // The same call the policy page makes, with the same inputs — that identity
    // is the point of this module.
    const composition = composeFindings({
        lineOfBusiness: policy.lineOfBusiness,
        acordData: policy.acordData,
        firedSlugs: gapRows.map((g) => g.definition.slug),
        completedRun: {
            finishedAt: run.finishedAt ?? run.createdAt ?? null,
            dateLabel: runDateLabel,
        },
        attempted:
            hasPlan && typeof attemptedPlan?.catalogueVersion === "string"
                ? {
                      slugs: (attemptedPlan.slugs as unknown[]).filter((s): s is string => typeof s === "string"),
                      catalogueVersion: attemptedPlan.catalogueVersion,
                  }
                : null,
    })

    const lifecycle = resolvePolicyLifecycle(policy)
    const recordStatus = resolveRecordStatus({
        lifecycleStatus: lifecycle.status,
        policyStatus: policy.status,
        latestRun: latestAttempt
            ? { status: latestAttempt.status, blockedReason: latestAttempt.blockedReason ?? null }
            : null,
        ...extractionConfirmation(policy.acordData),
    })

    const staleness = describeCatalogueStaleness(run.attemptedRules, runDateLabel)

    return {
        resultJson: run.resultJson as Record<string, unknown>,
        finishedAt: run.finishedAt ?? null,
        gaps: gapRows.map((g) => ({ slug: g.definition.slug, ...(g.severity ? { severity: g.severity } : {}) })),
        provenance,
        prePlan: hasPlan ? null : { dateLabel: runDateLabel },
        staleCatalogue: staleness ? { dateLabel: staleness.runDateLabel } : null,
        composition,
        recordStatus,
    }
}
