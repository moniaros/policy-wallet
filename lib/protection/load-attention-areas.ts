/**
 * The read seam for the attention areas — one call, four layers, no writes.
 *
 * A surface that wants «what deserves my attention, and how sure are we»
 * calls `loadAttentionAreas` and renders the bundle; it never touches Prisma,
 * never re-derives an expiry, and never learns a health value except through
 * `ctx`. Everything here is assembly: the facts come from `toLifeContext`,
 * the statements from the ProtectionProfile row, the exposure from
 * `assessRisks`, the protection from `buildCoverageModel`, and the verdict
 * words from `buildAttentionAreas` (docs/planning/PERSONAL_RISK_PROFILE.md §C).
 *
 * Three rules this file is responsible for, because they are where a loader
 * usually goes wrong:
 *
 *   - Liveness comes from ONE clock. A policy's band is read off
 *     `resolvePolicyLifecycle` (lib/policy-status.ts) and the engine sees the
 *     same rows through `toPolicyFields`, the mapper every engine entry point
 *     uses. Nothing here compares dates or reads the stored status column for
 *     anything but the ingestion state the lifecycle does not model.
 *   - `analysed` means the limits were READ: `acordData.coverages[]` has
 *     entries, which only a completed deep run produces (the upload-time
 *     extraction writes a summary, never coverages). A completed run that
 *     produced no coverages is still `summary_only` — the honest word.
 *   - A finding is a rule-decided `GapInstance` row, titled through the one
 *     content resolver and graded through `describeSeverity`. AI prose is not
 *     selected, so it cannot leak into a heading.
 *
 * Art. 9: the profile select is exactly what `toLifeContext` reads (the guard
 * in tests/unit/load-attention-areas.test.ts enumerates that file's reads and
 * fails on drift in either direction). `chronicConditions` and
 * `familyMedicalHistory` are among them because the health factor needs them;
 * they travel on `ctx` and nowhere else in the bundle.
 *
 * There is NO score here, and the bundle carries no such field at any depth
 * (source assertion in the test).
 *
 * Server-only by construction: it imports `@/lib/db`, and
 * tests/unit/no-server-modules-in-client-bundle.test.ts fails any client
 * component that can reach it. (The `server-only` marker package is not
 * installed here — Next aliases it internally — so vitest cannot resolve it.)
 */

import type { PolicyholderProfile, Prisma } from "@prisma/client"

import { db } from "@/lib/db"
import { describeSeverity } from "@/lib/gaps/severity-display"
import type { Language } from "@/lib/i18n"
import { resolvePolicyLifecycle, type PolicyLifecycle } from "@/lib/policy-status"
import {
    attentionSummary,
    buildAttentionAreas,
    type AttentionAreaView,
    type AttentionNeeds,
    type AttentionSummary,
} from "@/lib/protection/attention-areas"
import {
    buildCoverageModel,
    coverageInputsFrom,
    protectionDetailFrom,
    type GapFindingInput,
    type PolicyEvidenceInput,
    type PolicyLifecycleBand,
} from "@/lib/protection/coverage-model"
import type { AttentionAreaId } from "@/lib/protection/domains"
import { parseFactProvenance, type FactProvenanceMap, type ProtectionDetail } from "@/lib/protection/evidence"
import { toLifeContext, type ContextFactorKey, type LifeContext } from "@/lib/services/gap-engine/life-context"
import { toPolicyFields } from "@/lib/services/gap-engine/profile-gap-rules"
import { assessRisks, factorsToResolve } from "@/lib/services/gap-engine/risk-assessment"
import {
    areaForRecentChange,
    deriveProtectionPriorities,
    type ProtectionStatementsLike,
} from "@/lib/services/protection-profile/derive-priorities"
import { resolveGapContent } from "@/lib/wallet/gap-report"
import { OPEN_GAP_STATUSES } from "@/lib/wallet/gap-status"

// ── The bundle ──────────────────────────────────────────────────────────

/** Layer 2 as the composition reads it, plus the row facts a surface frames with. */
export interface AttentionBundleNeeds extends AttentionNeeds {
    riskConcerns: string[]
    uncertaintyReasons: string[]
    guidancePreference: string | null
    recentChangeAreas: AttentionAreaId[]
    intent: string | null
    confidenceLevel: string | null
    completedAt: Date | null
    skippedAt: Date | null
}

export interface AttentionAreasBundle {
    /** All ten areas, in the composition's order (activated first). */
    areas: AttentionAreaView[]
    /** Counts of words — never a figure. */
    summary: AttentionSummary
    /** Factors that, answered, would settle at least one `needs_review` risk. */
    factorsToResolve: ContextFactorKey[]
    ctx: LifeContext
    provenance: FactProvenanceMap
    needs: AttentionBundleNeeds
    /** Owned policy rows read, whatever their band. */
    policyCount: number
    /** Of those, the ones whose limits were read (`detail: analysed`). */
    analysedCount: number
    /** `areas` filtered to `activated`, same order. */
    activatedAreas: AttentionAreaId[]
}

export interface LoadAttentionAreasInput {
    userId: string
    language: Language
    /** Injectable so the Athens-midnight behaviour can be asserted; defaults to now. */
    now?: Date
}

// ── Selects ─────────────────────────────────────────────────────────────

/**
 * Exactly the columns `toLifeContext` reads — its FACTOR_COLUMNS plus the plain
 * facts it copies across — and `factProvenance`. Nothing else: a bare
 * `findUnique` would pull every Art. 9 column into a bundle that renders none
 * of them. Exported for the guard that keeps this in step with the engine.
 */
export const PROFILE_CONTEXT_SELECT = {
    answeredFields: true,
    // Person
    dateOfBirth: true,
    maritalStatus: true,
    childrenCount: true,
    dependentsCount: true,
    // Household & assets
    residenceType: true,
    ownsHome: true,
    propertiesOwned: true,
    rentsOutProperty: true,
    ownsBoat: true,
    vehiclesCount: true,
    hasPets: true,
    petsCount: true,
    valuablesValue: true,
    // Work
    employmentStatus: true,
    occupation: true,
    ownsBusiness: true,
    businessEmployees: true,
    // Money
    annualIncome: true,
    incomeDependency: true,
    savingsAmount: true,
    mortgageAmount: true,
    hasLoans: true,
    loanAmount: true,
    // Lifestyle
    travelsFrequently: true,
    isBuildingManager: true,
    activities: true,
    cyberExposure: true,
    retirementPlanning: true,
    // Health & driving — read by the `health` factor; carried on `ctx` only.
    chronicConditions: true,
    familyMedicalHistory: true,
    drivingRecord: true,
    smokingStatus: true,
    coverHeldElsewhere: true,
    // How each fact was written (lib/protection/evidence.ts).
    factProvenance: true,
} satisfies Prisma.PolicyholderProfileSelect

/** The statements (Layer 2) and the row facts the bundle frames with. */
const STATEMENTS_SELECT = {
    intent: true,
    riskConcerns: true,
    commitments: true,
    confidenceLevel: true,
    uncertaintyReasons: true,
    recentChanges: true,
    futureConsiderations: true,
    guidancePreference: true,
    unsureSteps: true,
    completedAt: true,
    skippedAt: true,
} satisfies Prisma.ProtectionProfileSelect

/**
 * A policy as Layer 4 needs it: identity for the lifecycle clock, the
 * extracted envelope, and its OPEN rule findings — id, provenance, severity and
 * the definition's slug. No AI prose is selected.
 */
const POLICY_EVIDENCE_SELECT = {
    id: true,
    lineOfBusiness: true,
    status: true,
    policyNumber: true,
    insurerName: true,
    endDate: true,
    acordData: true,
    gapInstances: {
        where: { status: { in: [...OPEN_GAP_STATUSES] } },
        select: {
            id: true,
            ruleId: true,
            severity: true,
            definition: { select: { slug: true, ruleId: true } },
        },
    },
} satisfies Prisma.PolicySelect

type PolicyRow = Prisma.PolicyGetPayload<{ select: typeof POLICY_EVIDENCE_SELECT }>
type GapRow = PolicyRow["gapInstances"][number]

// ── Helpers ─────────────────────────────────────────────────────────────

function stringList(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []
}

/**
 * The band the coverage model consumes, read off the resolved lifecycle
 * (lib/protection/coverage-model.ts documents the mapping). Two states the
 * contract does not name: `action_needed` is a policy in force whose identity
 * is incomplete — the cover is not — so it is held; a document still being
 * read (`analyzing`, an ingestion state the lifecycle does not model) is
 * presence we cannot place in time.
 */
function lifecycleBand(stored: string | null | undefined, lifecycle: PolicyLifecycle): PolicyLifecycleBand {
    if (String(stored ?? "").toLowerCase() === "analyzing") return "other"
    switch (lifecycle.status) {
        case "active":
        case "action_needed":
            return "active"
        case "expiring_soon":
        case "expired":
            return lifecycle.status
        default:
            return "other"
    }
}

/** One rule-decided finding, titled and graded through the single sources. */
function toFinding(gap: GapRow, lineOfBusiness: string): GapFindingInput {
    const slug = gap.definition.slug
    const content = resolveGapContent(slug, { lineOfBusiness })
    return {
        id: gap.id,
        ruleId: gap.ruleId ?? gap.definition.ruleId,
        slug,
        severity: describeSeverity(gap.severity).severity,
        title: { el: content.titleEl, en: content.titleEn },
    }
}

function toEvidence(policy: PolicyRow, now: Date): PolicyEvidenceInput {
    // The one reading of «were the limits read» — shared with the review closer.
    const coverages = coverageInputsFrom(policy.acordData)
    const detail: ProtectionDetail = protectionDetailFrom(policy.acordData)
    return {
        id: policy.id,
        lineOfBusiness: policy.lineOfBusiness,
        lifecycle: lifecycleBand(policy.status, resolvePolicyLifecycle(policy, now)),
        detail,
        ...(detail === "analysed" ? { coverages } : {}),
        gaps: policy.gapInstances.map((gap) => toFinding(gap, policy.lineOfBusiness)),
    }
}

// ── The loader ──────────────────────────────────────────────────────────

export async function loadAttentionAreas({ userId, language, now = new Date() }: LoadAttentionAreasInput): Promise<AttentionAreasBundle> {
    const [profile, statementsRow, policies] = await Promise.all([
        db.policyholderProfile.findUnique({ where: { userId }, select: PROFILE_CONTEXT_SELECT }),
        db.protectionProfile.findUnique({ where: { userId }, select: STATEMENTS_SELECT }),
        // The engine's own visibility: the policies this person owns.
        db.policy.findMany({ where: { ownerUserId: userId }, select: POLICY_EVIDENCE_SELECT }),
    ])

    // Layer 1 — the subset carries every column the context reads; the cast
    // only drops the identity columns the engine never looks at.
    const ctx = toLifeContext((profile as PolicyholderProfile | null) ?? null, now)
    const provenance = parseFactProvenance(profile?.factProvenance)

    // Layer 2 — passed through as the completion action passes them.
    const statements: ProtectionStatementsLike | null = statementsRow
        ? {
              riskConcerns: statementsRow.riskConcerns,
              commitments: statementsRow.commitments,
              recentChanges: statementsRow.recentChanges,
              futureConsiderations: statementsRow.futureConsiderations,
              unsureSteps: statementsRow.unsureSteps,
          }
        : null
    const recentChangeAreas = [
        ...new Set(
            stringList(statementsRow?.recentChanges)
                .map((change) => areaForRecentChange(change))
                .filter((area): area is AttentionAreaId => area !== undefined)
        ),
    ]
    const needs: AttentionBundleNeeds = {
        riskConcerns: stringList(statementsRow?.riskConcerns),
        uncertaintyReasons: stringList(statementsRow?.uncertaintyReasons),
        guidancePreference: statementsRow?.guidancePreference ?? null,
        recentChangeAreas,
        intent: statementsRow?.intent ?? null,
        confidenceLevel: statementsRow?.confidenceLevel ?? null,
        completedAt: statementsRow?.completedAt ?? null,
        skippedAt: statementsRow?.skippedAt ?? null,
    }

    // Layer 3 — the same rows the engine sees, through its own mapper.
    const assessments = assessRisks(ctx, toPolicyFields(policies))

    // Layer 4 — from policies and rule findings alone.
    const evidence = policies.map((policy) => toEvidence(policy, now))
    const coverage = buildCoverageModel(evidence)

    const areas = buildAttentionAreas({
        priorities: deriveProtectionPriorities(ctx, statements),
        assessments,
        coverage,
        provenance,
        ctx,
        needs,
        language,
    })

    return {
        areas,
        summary: attentionSummary(areas),
        factorsToResolve: factorsToResolve(assessments),
        ctx,
        provenance,
        needs,
        policyCount: evidence.length,
        analysedCount: evidence.filter((p) => p.detail === "analysed").length,
        activatedAreas: areas.filter((a) => a.activated).map((a) => a.area),
    }
}
