/**
 * One function decides what a profile FACT write may do.
 *
 * Five surfaces write the typed `PolicyholderProfile` columns the risk engine
 * reads — the first-stage onboarding, the /protection quick start, the risk
 * wizard (the assessment), an advisor's questionnaire and a declared life
 * event — and until Sept 2026 each carried its own overwrite rule. The
 * onboarding and the quick start refused to touch any answered column, so a
 * floor of «one dependant» taken from «my partner» could never be refined by
 * the same screen; the wizard, the questionnaire and a life event overwrote
 * unconditionally, so the wizard erased stored Art. 9 answers on every save
 * because its form always sent an empty list for the health fields.
 *
 * Provenance (lib/protection/evidence.ts — who wrote the fact, and whether it
 * is a FLOOR or the FIGURE the person gave) is what lets one rule replace
 * five. See docs/planning/PERSONAL_RISK_PROFILE.md §C Layer 1.
 *
 * The precedence, in full:
 *
 *   1. A column absent from `writes` is untouched. Absence is never an erasure.
 *   2. A write of `null` / `undefined` is ignored unless `{ clear: true }` is
 *      explicit — a cleared input is not a declaration of «none».
 *   3. `exact` replaces `coarse`.
 *   4. `coarse` never replaces `exact`.
 *   5. Equal precision → the newer write wins (the incoming write is by
 *      definition the newer one) — EXCEPT that `source: "policy"` never
 *      replaces a declared value, coarse or exact. A document is evidence
 *      about a policy, not a statement by the person.
 *   6. A column that is already KNOWN to the engine (`isColumnKnown`: listed
 *      in `answeredFields`, or holding a non-default value) but carries no
 *      provenance was written by a surface that predates provenance. It is
 *      treated as a declared `exact` value — the conservative reading, so
 *      nothing coarse can overwrite what a person once typed, and no backfill
 *      is needed.
 *
 * Pure: no clock beyond `now`, no database. The caller reads the row, applies,
 * and persists `{ ...data, answeredFields, factProvenance }`.
 * tests/unit/profile-writes-single-path.test.ts fails on a fact write that
 * bypasses this function.
 */

import type { Prisma } from "@prisma/client"
import {
    parseFactProvenance,
    type FactPrecision,
    type FactProvenance,
    type FactProvenanceMap,
    type FactSource,
} from "@/lib/protection/evidence"
import { isColumnKnown } from "@/lib/services/gap-engine/life-context"

export interface FactWrite {
    column: string
    value: unknown
    source: FactSource
    precision: FactPrecision
    /** Only an explicit clear may write `null`. A bare null/undefined is ignored. */
    clear?: boolean
}

export interface ExistingFacts {
    /** The stored row as Prisma returns it, or null when the person has no profile yet. */
    columns: Record<string, unknown> | null
    /** Stored `answeredFields` JSON, as-is. Read leniently. */
    answeredFields: unknown
    /** Stored `factProvenance` JSON, as-is. Read leniently — an old-shape value is tolerated. */
    factProvenance: unknown
}

export interface ApplyFactWritesArgs {
    existing: ExistingFacts
    writes: readonly FactWrite[]
    /** Instant recorded as `at` on every winning write. */
    now: Date
    /**
     * Columns to mark KNOWN without a value — a control the person was shown
     * and left at its default, or a life event's `mark_known` delta. They
     * union into `answeredFields` and nothing else.
     */
    alsoAnswered?: readonly string[]
}

export type FactWriteSkipReason = "no_value" | "coarse_over_exact" | "policy_over_declared"

export interface AppliedFactWrites {
    /** Only the columns whose stored value changes. */
    data: Record<string, unknown>
    /** existing ∪ every column a write settled ∪ `alsoAnswered`. */
    answeredFields: string[]
    /** existing (parsed leniently) with the winning writes' entries merged in. */
    factProvenance: FactProvenanceMap
    /** Writes that did not apply, with the reason. Never silent. */
    skipped: Array<{ column: string; reason: FactWriteSkipReason }>
}

/** The three fields every writer persists, in the shape Prisma takes. */
export interface ProfileFactData extends Record<string, unknown> {
    answeredFields: string[]
    /** The merged FactProvenanceMap, typed for the Json column so no caller casts. */
    factProvenance: Prisma.InputJsonValue
}

function stringList(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []
}

/** Lift a stored row (or its absence) into what `applyFactWrites` reads. */
export function existingFacts(profile: Record<string, unknown> | null | undefined): ExistingFacts {
    return {
        columns: profile ?? null,
        answeredFields: profile?.answeredFields,
        factProvenance: profile?.factProvenance,
    }
}

/**
 * Build writes from a plain column patch.
 *
 * `precision` is either one value for every column or a per-column lookup
 * (missing → `exact`). With `clearNulls`, a `null` in the patch is a
 * deliberate erasure (a life event's `clear` delta) rather than an ignored
 * blank.
 */
export function factWritesFrom(
    patch: Record<string, unknown>,
    opts: {
        source: FactSource
        precision: FactPrecision | Readonly<Record<string, FactPrecision>>
        clearNulls?: boolean
    }
): FactWrite[] {
    const precisionOf = (column: string): FactPrecision =>
        typeof opts.precision === "string" ? opts.precision : (opts.precision[column] ?? "exact")
    return Object.entries(patch).map(([column, value]) => ({
        column,
        value,
        source: opts.source,
        precision: precisionOf(column),
        ...(opts.clearNulls && value === null ? { clear: true } : {}),
    }))
}

interface Claim {
    precision: FactPrecision
    /** null = declared by a surface that predates provenance. */
    source: FactSource | null
}

function claimOn(
    existing: ExistingFacts,
    provenance: FactProvenanceMap,
    answered: Set<string>,
    column: string
): Claim | null {
    const p = provenance[column]
    if (p) return { precision: p.precision, source: p.source }
    if (isColumnKnown(existing.columns, answered, column)) return { precision: "exact", source: null }
    return null
}

function refusal(write: FactWrite, claim: Claim | null): FactWriteSkipReason | null {
    if (!claim) return null
    if (write.source === "policy" && claim.source !== "policy") return "policy_over_declared"
    if (write.precision === "coarse" && claim.precision === "exact") return "coarse_over_exact"
    return null
}

/** Comparable form of a stored or incoming value: Decimal → number, Date → ISO, array → JSON. */
function comparable(value: unknown): unknown {
    if (value === undefined) return null
    if (value instanceof Date) return value.toISOString()
    if (Array.isArray(value)) return JSON.stringify(value)
    if (typeof value === "object" && value !== null) {
        const decimalLike = value as { toNumber?: () => number }
        if (typeof decimalLike.toNumber === "function") return decimalLike.toNumber()
        return JSON.stringify(value)
    }
    return value
}

function sameValue(a: unknown, b: unknown): boolean {
    const x = comparable(a)
    const y = comparable(b)
    if (x === y) return true
    // A Decimal column read back as a string against an incoming number.
    if (
        (typeof x === "number" || typeof x === "string") &&
        (typeof y === "number" || typeof y === "string") &&
        x !== "" &&
        y !== ""
    ) {
        const nx = Number(x)
        const ny = Number(y)
        return Number.isFinite(nx) && Number.isFinite(ny) && nx === ny
    }
    return false
}

export function applyFactWrites(args: ApplyFactWritesArgs): AppliedFactWrites {
    const { existing, writes, now } = args
    const at = now.toISOString()
    const provenance: FactProvenanceMap = { ...parseFactProvenance(existing.factProvenance) }
    const answered = new Set(stringList(existing.answeredFields))
    const stored = existing.columns ?? {}
    const pending: Record<string, unknown> = {}
    const skipped: AppliedFactWrites["skipped"] = []

    for (const write of writes) {
        const { column } = write
        const blank = write.value === null || write.value === undefined
        if (blank && !write.clear) {
            skipped.push({ column, reason: "no_value" })
            continue
        }
        const reason = refusal(write, claimOn(existing, provenance, answered, column))
        if (reason) {
            skipped.push({ column, reason })
            continue
        }
        pending[column] = blank ? null : write.value
        answered.add(column)
        const entry: FactProvenance = { source: write.source, precision: write.precision, at }
        provenance[column] = entry
    }

    for (const column of args.alsoAnswered ?? []) answered.add(column)

    const data: Record<string, unknown> = {}
    for (const [column, value] of Object.entries(pending)) {
        if (!sameValue(stored[column], value)) data[column] = value
    }

    return { data, answeredFields: [...answered], factProvenance: provenance, skipped }
}

/** `{ ...data, answeredFields, factProvenance }` — what the upsert's update AND create both take. */
export function profileFactData(applied: AppliedFactWrites): ProfileFactData {
    return {
        ...applied.data,
        answeredFields: applied.answeredFields,
        // A map of plain { source, precision, at } records — JSON by
        // construction; the interface type just cannot say so to Prisma.
        factProvenance: applied.factProvenance as unknown as Prisma.InputJsonValue,
    }
}
