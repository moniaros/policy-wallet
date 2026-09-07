/**
 * The coverage status of each insurance branch, for the policyholder — ONE
 * derivation, composed from the derivations the product already trusts.
 *
 * Built for «Καλύψεις & κενά» (goal series, 2026-09-07). The page's summary
 * («Φαίνεται να καλύπτεται» · «Μερική κάλυψη» · «Χωρίς ασφαλιστήριο» · «Δεν
 * ελέγχθηκε ακόμη») and its category rows read from here, and the dashboard's
 * branch map projects the same status onto its older tile vocabulary
 * (`toTileState`), so the two surfaces can never disagree about one branch.
 *
 * What this module will NOT say, and why:
 *  - «Καλύπτεται καλά»: the checks are five points on a motor policy and the
 *    extractor is silent about most fields; a non-firing rule with an absent
 *    input is INDETERMINATE, not a pass (lib/gaps/composition.ts). The strongest
 *    honest word is the hedged one the product already uses, and it always
 *    carries «Ελέγξαμε {covered} από {checked} σημεία» beside it.
 *  - «Δεν καλύπτεστε»: not owning a product in the wallet is not a gap
 *    (CLAUDE.md, §2.2). The branch says a policy was not seen — and stays
 *    silent when the person declared the cover is held elsewhere.
 *  - a number for findings under review: they are disclosed as a sentence and
 *    never counted in the four (lib/gaps/provenance.ts, R3).
 *  - anything from severity: it is never read here (severity-never-orders).
 *
 * Every decision is on facts the loader passes in; nothing here queries.
 */

import { buildBranchOverview, toTopLevelBranch, type BranchTileState } from "@/lib/insurance/branch-page"
import { normalizeBranch, type InsuranceBranch } from "@/lib/insurance/taxonomy"
import { AUTHORED_GAP_DEFINITIONS } from "@/lib/gaps/authored-catalogue"
import { authoredCheckCount } from "@/lib/gaps/assessment-coverage"
import { classifyRuleQuestion, composeFindings, type Composition, type RuleQuestion } from "@/lib/gaps/composition"
import { attemptedRuleCountOf, describeFindingsProvenance, type AttemptProvenance, type FindingsProvenanceState } from "@/lib/gaps/findings-provenance"
import { canonicalGapSlug, excludeUnderReview, provenanceOf } from "@/lib/gaps/provenance"
import { isPolicyCoverageActive, resolvePolicyLifecycle } from "@/lib/policy-status"
import { isUnreadPolicy } from "@/lib/wallet/unread-policy"
import { protectionDetailFrom } from "@/lib/protection/coverage-model"

// ── Vocabulary ────────────────────────────────────────────────────────────────

/** The four statuses a branch that concerns the person can carry. */
export const COVERAGE_STATUS_IDS = ["appears_covered", "finding", "no_policy", "not_checked"] as const
export type CoverageStatusId = (typeof COVERAGE_STATUS_IDS)[number]

/** Branches the summary discloses in a sentence rather than a count. */
export type DisclosedBucket = "under_review_only" | "held_elsewhere" | "neutral"

export type NotCheckedReason =
    | "unauthored"
    | "no_coverage_checks"
    | "never_analysed"
    | "unread"
    | "stale_failed"
    | "stale_blocked"
    | "in_progress"
    | "none_after_failure"
    | "pre_plan"
    | "no_extraction"

// ── Inputs ────────────────────────────────────────────────────────────────────

export interface CoverageStatusPolicy {
    id: string
    lineOfBusiness: string | null
    status: string | null
    policyNumber: string | null
    insurerName: string | null
    endDate: Date | string | null
    acordData: unknown
    lastAnalyzedAt: Date | string | null
}

/** A LIVE gap row in disclosed scope (readLiveGapRows) — the slug is enough to classify it. */
export interface CoverageStatusGapRow {
    policyId: string
    slug: string | null
    analysisRunId: string
    runFinishedAt: Date | string | null
}

/** An analysis run row; any order, any number per policy — the module picks. */
export interface CoverageStatusRun {
    id: string
    policyId: string
    status: string
    createdAt: Date | string
    finishedAt: Date | string | null
    attemptedRules: unknown
}

export interface CoverageStatusInput {
    policies: readonly CoverageStatusPolicy[]
    gapRows: readonly CoverageStatusGapRow[]
    runs: readonly CoverageStatusRun[]
    /** `protectionScore.expectedLines`; null when no score row exists — then nothing may be «Χωρίς ασφαλιστήριο». */
    expectedLines: readonly string[] | null
    /** `policyholderProfile.coverHeldElsewhere` — lines the person declared they hold outside the wallet. */
    coverHeldElsewhere: readonly string[]
    now?: Date
}

// ── Output ────────────────────────────────────────────────────────────────────

export interface CoverageStatusFlags {
    expiringSoon: boolean
    unknownDuration: boolean
    /** A read policy in the branch has ended or been cancelled and nothing in force replaced it. */
    lapsedOnly: boolean
    /** No in-force policy in the branch had its coverage lines read (summary only). */
    limitsUnread: boolean
    /** At least one in-force policy's latest run completed with warnings. */
    partialRun: boolean
    /** The run that produced the findings used an older catalogue. */
    staleCatalogue: boolean
}

export interface BranchCoverageStatus {
    branch: InsuranceBranch
    /** One of the four, or null when the branch is only disclosed. */
    status: CoverageStatusId | null
    bucket: DisclosedBucket | null
    reason: NotCheckedReason | null
    flags: CoverageStatusFlags
    expected: boolean
    policyCount: number
    inForceCount: number
    /** Classified coverage-class findings on in-force policies — the «Μερική κάλυψη» evidence. */
    findingCount: number
    /** Coverage-class findings still under review — disclosed, never counted. */
    underReviewCount: number
    /** Recording-class findings («δεν καταγράφεται») — a caveat, never a status. */
    notRecordedCount: number
    /** Aggregated coverage line over the branch's in-force policies. */
    checked: number
    covered: number
    indeterminate: number
    lastCheckedAt: Date | null
}

export interface CoverageStatusSummary {
    appearsCovered: number
    finding: number
    noPolicy: number
    notChecked: number
    /** Branches with coverage-class findings that are all under review — held, but outside the four. */
    underReviewOnly: number
    /** The denominator: the four counts plus the under-review-only branches — everything held or expected. */
    relevantCount: number
    /**
     * Live recording-class rows («δεν καταγράφεται») across the relevant branches. A recording
     * rule asks whether a value was written down, never whether cover exists, so these rows change
     * no branch status — which is why «Μερική κάλυψη 0» can sit beside a findings list that is not
     * empty. The summary says so in a sentence rather than leaving the two numbers to disagree.
     */
    notRecorded: number
    heldElsewhere: number
    neutral: number
    /** False when no score row exists; the denominator sentence changes. */
    hasExpectedLines: boolean
    lastCheckedAt: Date | null
}

export interface CoverageStatusResult {
    rows: BranchCoverageStatus[]
    summary: CoverageStatusSummary
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TERMINAL_OK = new Set(["completed", "completed_with_warnings"])

function toDate(value: Date | string | null | undefined): Date | null {
    if (!value) return null
    const d = value instanceof Date ? value : new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
}

function laterOf(a: Date | null, b: Date | null): Date | null {
    if (!a) return b
    if (!b) return a
    return a > b ? a : b
}

/** Question class of a live row, from its slug alone. Unknown degrades to coverage: it can only make the status less reassuring. */
function questionOf(slug: string | null): RuleQuestion {
    const canonical = canonicalGapSlug(slug)
    const definition = canonical ? AUTHORED_GAP_DEFINITIONS.find((d) => d.slug === canonical) : undefined
    if (!definition) return "coverage"
    const question = classifyRuleQuestion(definition.detectionLogic)
    return question === "unknown" ? "coverage" : question
}

function attemptOf(run: CoverageStatusRun): AttemptProvenance {
    return {
        id: run.id,
        status: run.status,
        finishedAt: run.finishedAt,
        createdAt: run.createdAt,
        attemptedRuleCount: attemptedRuleCountOf(run.attemptedRules),
    }
}

interface PolicyFacts {
    id: string
    branchId: string
    lifecycle: string
    unread: boolean
    inForce: boolean
    detailAnalysed: boolean
    unauthored: boolean
    coverageChecks: number
    provenance: FindingsProvenanceState
    composition: Composition
    classifiedCoverageRows: number
    underReviewCoverageRows: number
    recordingRows: number
    lastCheckedAt: Date | null
}

function policyFacts(policy: CoverageStatusPolicy, input: CoverageStatusInput, now: Date): PolicyFacts {
    const lifecycle = resolvePolicyLifecycle(policy, now).status
    const unread = isUnreadPolicy(policy)
    const inForce = !unread && isPolicyCoverageActive(policy, now)
    const branch = normalizeBranch(policy.lineOfBusiness)

    const runs = input.runs.filter((r) => r.policyId === policy.id)
    const byCreated = [...runs].sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0))
    const latestAttempt = byCreated[0] ?? null
    const lastCompleted =
        [...runs]
            .filter((r) => TERMINAL_OK.has(r.status))
            .sort((a, b) => (toDate(b.finishedAt ?? b.createdAt)?.getTime() ?? 0) - (toDate(a.finishedAt ?? a.createdAt)?.getTime() ?? 0))[0] ?? null

    const rows = input.gapRows.filter((r) => r.policyId === policy.id)
    const provenance = describeFindingsProvenance(
        rows.map((r) => ({ analysisRunId: r.analysisRunId, runFinishedAt: r.runFinishedAt })),
        latestAttempt ? attemptOf(latestAttempt) : null,
        lastCompleted ? attemptOf(lastCompleted) : null
    )

    const plan = (lastCompleted?.attemptedRules ?? null) as { slugs?: unknown; catalogueVersion?: unknown } | null
    const composition = composeFindings({
        lineOfBusiness: branch.id,
        acordData: policy.acordData,
        firedSlugs: rows.map((r) => r.slug ?? "").filter(Boolean),
        completedRun: lastCompleted ? { finishedAt: lastCompleted.finishedAt ?? lastCompleted.createdAt } : null,
        attempted:
            plan && Array.isArray(plan.slugs) && typeof plan.catalogueVersion === "string"
                ? { slugs: plan.slugs.filter((s): s is string => typeof s === "string"), catalogueVersion: plan.catalogueVersion }
                : null,
        now,
    })

    const coverageRows = rows.filter((r) => questionOf(r.slug) === "coverage")
    const recordingRows = rows.length - coverageRows.length
    // R3: only classified rows may count; under review is disclosed, never summed.
    const classifiedCoverageRows = excludeUnderReview(coverageRows, (r) => r.slug).length

    const coverageChecks = AUTHORED_GAP_DEFINITIONS.filter(
        (d) => d.lineOfBusiness === branch.id && classifyRuleQuestion(d.detectionLogic) === "coverage"
    ).length

    return {
        id: policy.id,
        branchId: toTopLevelBranch(branch).id,
        lifecycle,
        unread,
        inForce,
        detailAnalysed: protectionDetailFrom(policy.acordData) === "analysed",
        unauthored: authoredCheckCount(branch.id) === 0,
        coverageChecks,
        provenance: provenance.state,
        composition,
        classifiedCoverageRows,
        underReviewCoverageRows: coverageRows.length - classifiedCoverageRows,
        recordingRows,
        lastCheckedAt: laterOf(provenance.findingsAt, toDate(lastCompleted?.finishedAt ?? lastCompleted?.createdAt ?? null)),
    }
}

const NOT_CHECKED_BY_PROVENANCE: Partial<Record<FindingsProvenanceState, NotCheckedReason>> = {
    none: "never_analysed",
    none_after_failure: "none_after_failure",
    stale_failed: "stale_failed",
    stale_blocked: "stale_blocked",
    in_progress: "in_progress",
}

// ── The derivation ────────────────────────────────────────────────────────────

export function deriveCoverageStatus(input: CoverageStatusInput): CoverageStatusResult {
    const now = input.now ?? new Date()
    const facts = input.policies.map((p) => policyFacts(p, input, now))
    const byId = new Map(facts.map((f) => [f.id, f]))

    // The universe and the per-branch policy counts come from the SAME
    // derivation the dashboard map uses — one fold of children into parents,
    // one rule for which rich branches always render.
    const overview = buildBranchOverview(
        input.policies.map((p) => {
            const f = byId.get(p.id)!
            return { id: p.id, lineOfBusiness: p.lineOfBusiness, status: f.lifecycle, endDate: toDate(p.endDate), unread: f.unread }
        }),
        input.expectedLines ? [...input.expectedLines] : []
    )
    const expectedTopLevel = new Set(
        (input.expectedLines ?? []).map((line) => normalizeBranch(line)).filter((b) => !b.parentId).map((b) => b.id)
    )
    const heldElsewhere = new Set(input.coverHeldElsewhere.map((line) => toTopLevelBranch(normalizeBranch(line)).id))

    const rows: BranchCoverageStatus[] = overview.map((entry) => {
        const branchId = entry.branch.id
        const branchFacts = facts.filter((f) => f.branchId === branchId)
        const read = branchFacts.filter((f) => !f.unread)
        const inForce = read.filter((f) => f.inForce)
        const expected = expectedTopLevel.has(branchId)

        const flags: CoverageStatusFlags = {
            expiringSoon: inForce.some((f) => f.lifecycle === "expiring_soon"),
            unknownDuration: inForce.some((f) => f.lifecycle === "unknown_duration"),
            lapsedOnly: inForce.length === 0 && read.some((f) => f.lifecycle === "expired" || f.lifecycle === "cancelled"),
            limitsUnread: inForce.length > 0 && !inForce.some((f) => f.detailAnalysed),
            partialRun: inForce.some((f) => f.provenance === "partial"),
            staleCatalogue: inForce.some((f) => f.composition.kind === "composition" && f.composition.stale !== null),
        }

        let checked = 0
        let covered = 0
        let indeterminate = 0
        let noExtraction = 0
        for (const f of inForce) {
            if (f.composition.kind !== "composition") continue
            checked += f.composition.coverage.checked
            covered += f.composition.coverage.covered
            indeterminate += f.composition.coverage.indeterminate
            noExtraction += f.composition.coverage.items.filter((i) => i.outcome === "indeterminate" && i.reason === "no_extraction").length
        }

        const base = {
            branch: entry.branch,
            flags,
            expected,
            policyCount: entry.policyCount,
            inForceCount: inForce.length,
            findingCount: inForce.reduce((n, f) => n + f.classifiedCoverageRows, 0),
            underReviewCount: inForce.reduce((n, f) => n + f.underReviewCoverageRows, 0),
            notRecordedCount: inForce.reduce((n, f) => n + f.recordingRows, 0),
            checked,
            covered,
            indeterminate,
            lastCheckedAt: inForce.reduce<Date | null>((d, f) => laterOf(d, f.lastCheckedAt), null),
        }
        const decided = (status: CoverageStatusId | null, bucket: DisclosedBucket | null, reason: NotCheckedReason | null = null): BranchCoverageStatus => ({
            ...base,
            status,
            bucket,
            reason,
        })

        // Nothing in force.
        if (inForce.length === 0) {
            if (read.length === 0 && branchFacts.length > 0) return decided("not_checked", null, "unread")
            if (read.length > 0) return decided("no_policy", null) // held, but lapsed or cancelled — flags.lapsedOnly says so
            if (expected) return heldElsewhere.has(branchId) ? decided(null, "held_elsewhere") : decided("no_policy", null)
            return decided(null, "neutral")
        }

        // In force. Precedence: finding > under_review_only > not_checked > appears_covered.
        if (base.findingCount > 0) return decided("finding", null)
        if (base.underReviewCount > 0) return decided(null, "under_review_only")
        if (inForce.every((f) => f.unauthored)) return decided("not_checked", null, "unauthored")
        if (inForce.every((f) => f.coverageChecks === 0)) return decided("not_checked", null, "no_coverage_checks")
        for (const f of inForce) {
            const reason = NOT_CHECKED_BY_PROVENANCE[f.provenance]
            if (reason) return decided("not_checked", null, reason)
            if (f.composition.kind === "no_run") return decided("not_checked", null, "never_analysed")
            if (f.composition.kind === "pre_plan") return decided("not_checked", null, "pre_plan")
            if (f.composition.kind === "unauthored") return decided("not_checked", null, "unauthored")
        }
        if (checked === 0) return decided("not_checked", null, "never_analysed")
        if (covered === 0 && noExtraction === checked) return decided("not_checked", null, "no_extraction")
        return decided("appears_covered", null)
    })

    const count = (status: CoverageStatusId) => rows.filter((r) => r.status === status).length
    const bucket = (b: DisclosedBucket) => rows.filter((r) => r.bucket === b).length
    const appearsCovered = count("appears_covered")
    const finding = count("finding")
    const noPolicy = count("no_policy")
    const notChecked = count("not_checked")
    const underReviewOnly = bucket("under_review_only")

    return {
        rows,
        summary: {
            appearsCovered,
            finding,
            noPolicy,
            notChecked,
            underReviewOnly,
            relevantCount: appearsCovered + finding + noPolicy + notChecked + underReviewOnly,
            notRecorded: relevantRows(rows).reduce((n, r) => n + r.notRecordedCount, 0),
            heldElsewhere: bucket("held_elsewhere"),
            neutral: bucket("neutral"),
            hasExpectedLines: input.expectedLines !== null,
            lastCheckedAt: rows.reduce<Date | null>((d, r) => laterOf(d, r.lastCheckedAt), null),
        },
    }
}

/** Branches that concern the person: the four statuses and the under-review-only ones — the denominator's members. */
export function relevantRows(rows: readonly BranchCoverageStatus[]): BranchCoverageStatus[] {
    return rows.filter((r) => r.status !== null || r.bucket === "under_review_only")
}

/** The invariant every render may assert: four counts + three buckets = rows. */
export function coverageStatusSums(result: CoverageStatusResult): boolean {
    const s = result.summary
    return s.appearsCovered + s.finding + s.noPolicy + s.notChecked + s.underReviewOnly + s.heldElsewhere + s.neutral === result.rows.length
}

// ── Projection onto the dashboard map's older vocabulary ─────────────────────

/**
 * The home's branch map keeps its five tile words this release; it reads the
 * SAME status through this projection, so a branch this page calls «Δεν
 * ελέγχθηκε ακόμη» can never be «Καλυμμένο» there. Under review and held
 * elsewhere both project to `neutral` («Δεν έχει αξιολογηθεί»): the first
 * because the assessment is not finished, the second because «Χωρίς
 * ασφαλιστήριο» would contradict what the person declared.
 */
export function toTileState(row: Pick<BranchCoverageStatus, "status" | "bucket" | "reason" | "flags">): BranchTileState {
    switch (row.status) {
        case "appears_covered":
            return "covered"
        case "finding":
            return "attention"
        case "no_policy":
            return row.flags.lapsedOnly ? "attention" : "not_held"
        case "not_checked":
            return row.reason === "unread" ? "unread" : "neutral"
        default:
            return "neutral"
    }
}
