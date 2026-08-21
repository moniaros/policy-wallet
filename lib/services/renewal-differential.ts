import { mergeAcordData } from "@/lib/services/acord-merge"

/**
 * «Τι άλλαξε στην ανανέωση» — what actually changed between two documents.
 *
 * This is the feature's value. A customer who receives an ανανεωτήριο is told
 * a new premium and nothing else; whether a cover was quietly dropped, or a
 * sum insured cut, is buried in a document that is deliberately terse. The
 * chain already holds both extractions, so the comparison is arithmetic — not
 * a judgement, and not a job for a model.
 *
 * THREE RULES, all consequences of what a renewal notice is:
 *
 *  1. Silence is not a change. A renewal that never mentions glass breakage
 *     has not removed it (see lib/services/acord-merge.ts). Only an explicit
 *     value in the newer document can produce a difference.
 *  2. Facts, no verdicts. Deltas are stated and cited; nothing is labelled
 *     severe, and nothing is recommended. Severity is an underwriting
 *     judgement (Gate 3b) and advice is regulated (IDD).
 *  3. Every entry names its two sources, so a reader can open both documents
 *     and check. A differential nobody can verify is a rumour.
 */

export type ChangeKind = "added" | "removed" | "modified"

export interface FieldChange {
    /** Dotted path into the extraction, e.g. `vehicle.glassBreakage`. */
    path: string
    kind: ChangeKind
    before: unknown
    after: unknown
    /** Document ids the two values came from — the citation. */
    fromDocumentId: string
    toDocumentId: string
}

export interface RenewalDifferential {
    fromDocumentId: string
    toDocumentId: string
    /** Premium in the same currency, when both documents state one. */
    premiumBefore: number | null
    premiumAfter: number | null
    premiumDelta: number | null
    /** Sum-insured style money fields that moved. */
    sumChanges: FieldChange[]
    /** Cover flags and terms that appeared, vanished or changed value. */
    termChanges: FieldChange[]
    /** True when the newer document stated nothing comparable at all. */
    isEmpty: boolean
}

/** Money fields worth calling out separately — a customer reads these first. */
const SUM_PATHS = new Set([
    "policy.sumInsured",
    "vehicle.insuredValue",
    "vehicle.estimatedMarketValue",
    "vehicle.deductible",
    "property.insuredValue",
    "property.estimatedRebuildCost",
    "property.theftCoverageLimit",
])

const PREMIUM_PATH = "policy.premium.amount"

function isPlainObject(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v) && !(v instanceof Date)
}

/** Absent means the document said nothing — never "removed". */
function isSilent(v: unknown): boolean {
    return v === undefined || v === null
}

/**
 * Walk the newer extraction and report only what it EXPLICITLY states
 * differently. Recurses objects; compares arrays and scalars whole.
 */
function collectChanges(
    before: unknown,
    after: unknown,
    fromDocumentId: string,
    toDocumentId: string,
    prefix = ""
): FieldChange[] {
    if (!isPlainObject(after)) return []
    const out: FieldChange[] = []
    const baseObj = isPlainObject(before) ? before : {}

    for (const [key, afterValue] of Object.entries(after)) {
        const path = prefix ? `${prefix}.${key}` : key
        // Rule 1: the newer document is silent here, so nothing changed.
        if (isSilent(afterValue)) continue

        const beforeValue = baseObj[key]

        if (isPlainObject(afterValue) && isPlainObject(beforeValue)) {
            out.push(...collectChanges(beforeValue, afterValue, fromDocumentId, toDocumentId, path))
            continue
        }

        if (isSilent(beforeValue)) {
            out.push({ path, kind: "added", before: null, after: afterValue, fromDocumentId, toDocumentId })
            continue
        }

        if (JSON.stringify(beforeValue) === JSON.stringify(afterValue)) continue

        // `false` where there was `true` is the renewal explicitly dropping a
        // cover — the single most important thing this view can surface.
        const kind: ChangeKind = afterValue === false && beforeValue === true ? "removed" : "modified"
        out.push({ path, kind, before: beforeValue, after: afterValue, fromDocumentId, toDocumentId })
    }

    return out
}

function numberAt(source: unknown, path: string): number | null {
    const value = path.split(".").reduce<any>((acc, part) => (acc == null ? acc : acc[part]), source)
    return typeof value === "number" && Number.isFinite(value) ? value : null
}

export function buildRenewalDifferential(input: {
    fromDocumentId: string
    toDocumentId: string
    /** Extraction of the ORIGINAL (or the merged chain up to it). */
    before: unknown
    /** Extraction of the RENEWAL alone — not the merged view. */
    after: unknown
}): RenewalDifferential {
    const { fromDocumentId, toDocumentId, before, after } = input

    const all = collectChanges(before, after, fromDocumentId, toDocumentId)

    const premiumBefore = numberAt(before, PREMIUM_PATH)
    const premiumAfter = numberAt(after, PREMIUM_PATH)

    const sumChanges = all.filter((c) => SUM_PATHS.has(c.path))
    const termChanges = all.filter((c) => !SUM_PATHS.has(c.path) && c.path !== PREMIUM_PATH)

    return {
        fromDocumentId,
        toDocumentId,
        premiumBefore,
        premiumAfter,
        premiumDelta:
            premiumBefore !== null && premiumAfter !== null ? premiumAfter - premiumBefore : null,
        sumChanges,
        termChanges,
        isEmpty: all.length === 0,
    }
}

/**
 * The merged view a re-analysis should run over: base terms, overridden only
 * where a later document speaks. Re-exported here so callers building the
 * renewal view import one module.
 */
export { mergeAcordData }
