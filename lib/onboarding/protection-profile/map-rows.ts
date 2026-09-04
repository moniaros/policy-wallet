/**
 * The protection map's rows — the attention areas reduced to what the
 * onboarding renders, from STRUCTURED fields only.
 *
 * `AttentionAreaView` (lib/protection/attention-areas.ts) carries the formal
 * explanation triplet /protection renders («Γιατί το βλέπετε»). The
 * onboarding speaks in the singular and must never mix registers inside a
 * screen, so it reads the alignment, the unknown factors, the next-step KIND,
 * the confidence level and the density — and composes its own sentences from
 * the dictionary under `onboarding.protectionProfile.map`. The formal strings
 * are not read here, by construction.
 *
 * Pure, so the card and the analytics («one `attention_area_created` per
 * rendered area») agree on which rows exist without a second filter.
 */

import type { Alignment, AttentionAreaView, ExplanationDensity, NextStep } from "@/lib/protection/attention-areas"
import { AREAS, type AttentionAreaId } from "@/lib/protection/domains"
import type { EvidenceLevel } from "@/lib/protection/evidence"
import { questionsForArea } from "@/lib/protection/factor-questions"
import type { ContextFactorKey } from "@/lib/services/gap-engine/life-context"
import type { Bilingual } from "@/lib/services/life-events/types"
import type { PriorityImportance, ProtectionPriority } from "@/lib/services/protection-profile/derive-priorities"

export interface MapRow {
    area: AttentionAreaId
    /** The map's row id (`household`, `money:income`, …) — icons and labels key on it. */
    priorityId: string
    importance: PriorityImportance
    alignment: Alignment
    confidence: EvidenceLevel
    /** A policy in force stands behind the alignment. False ⇒ nothing may read as covered. */
    heldLine: boolean
    /** «Φαίνεται να καλύπτεται» on a line whose limits were not read — the composition's own field. */
    limitsUnread: boolean
    /** The line behind the word ends within the month — «λήγει σύντομα». */
    expiringSoon: boolean
    /** Nothing held, and the only policy seen for the area has lapsed — «έχει λήξει», never «δεν έχουμε δει». */
    lapsedOnly: boolean
    /** The rule-decided finding's title when the alignment is `gap`. */
    finding: Bilingual | null
    /** Unknown facts, one per written column, health only inside health. */
    unknownFactors: ContextFactorKey[]
    nextStep: NextStep
    density: ExplanationDensity
    /** The map's own singular reason for the row, when the priorities hold one. */
    why: Bilingual | null
}

/** Activated areas, plus the ones a fact could not settle — nothing dormant. */
export function isMapRow(area: AttentionAreaView): boolean {
    return area.activated || area.importance === "needs_review"
}

export function mapRowsFrom(areas: readonly AttentionAreaView[], priorities: readonly ProtectionPriority[]): MapRow[] {
    const byRow = new Map(priorities.map((p) => [p.id, p]))
    return areas.filter(isMapRow).map((area) => {
        const priorityId = AREAS[area.area].priorityId
        const heldLine = !area.requiresValidation
        return {
            area: area.area,
            priorityId,
            importance: area.importance,
            alignment: area.alignment,
            confidence: area.confidence,
            heldLine,
            // Liveness and depth come from the composition's own fields —
            // the lines that ANSWERED the area, wherever they are held —
            // never from re-deriving them here or matching a sentence.
            limitsUnread: area.limitsUnread,
            expiringSoon: area.expiringSoon,
            lapsedOnly: area.lapsedOnly,
            finding: area.alignment === "gap" ? (area.protection.gaps.find((g) => g.onHeldPolicy)?.title ?? null) : null,
            unknownFactors: questionsForArea(area.area, area.unknownFactors).map((q) => q.factor as ContextFactorKey),
            nextStep: area.explanation.nextStep,
            density: area.explanation.density,
            why: byRow.get(priorityId)?.reason.text ?? null,
        }
    })
}

/**
 * What the alignment line SAYS for a row — the shape the card renders, so
 * two rows that would read the same are the same. Held-ness folds in
 * because a claimed cover with nothing held renders as «not yet checked».
 */
export function rowVerdictKey(row: MapRow): string {
    if (row.alignment === "appears_covered" && !row.heldLine) return `not_yet_checked${row.lapsedOnly ? ":lapsed" : ""}`
    const caveats = [
        row.alignment === "appears_covered" && row.limitsUnread ? "limits_unread" : null,
        row.heldLine && row.expiringSoon ? "expiring_soon" : null,
        !row.heldLine && row.lapsedOnly ? "lapsed" : null,
    ].filter((c): c is string => c !== null)
    const base = row.alignment === "gap" ? `gap:${row.finding?.en ?? ""}` : row.alignment
    return caveats.length > 0 ? `${base}:${caveats.join("+")}` : base
}

export interface MovedRow {
    area: AttentionAreaId
    priorityId: string
    /** Null when the area was not a row before the upload. */
    before: MapRow | null
    after: MapRow
}

/**
 * The rows whose alignment line changed between the map before the upload
 * and the map re-read after it — «what moved». A row that reads the same is
 * not listed; a row that disappeared is not either (the map shows the
 * current picture). Pure; order is the AFTER map's.
 */
export function movedRows(before: readonly MapRow[], after: readonly MapRow[]): MovedRow[] {
    const previous = new Map(before.map((r) => [r.area, r]))
    const out: MovedRow[] = []
    for (const row of after) {
        const was = previous.get(row.area) ?? null
        if (was && rowVerdictKey(was) === rowVerdictKey(row)) continue
        out.push({ area: row.area, priorityId: row.priorityId, before: was, after: row })
    }
    return out
}

/** Counts of words over the RENDERED rows — the fact cells' numbers, so they match what is on the page. */
export function mapRowCounts(rows: readonly MapRow[]): { areaCount: number; unknownCount: number; coveredCount: number; notYetCheckedCount: number } {
    return {
        areaCount: rows.length,
        unknownCount: rows.filter((r) => r.alignment === "unknown").length,
        coveredCount: rows.filter((r) => r.alignment === "appears_covered" && r.heldLine).length,
        notYetCheckedCount: rows.filter((r) => rowVerdictKey(r) === "not_yet_checked").length,
    }
}
