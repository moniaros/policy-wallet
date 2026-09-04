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
    /** «Φαίνεται να καλύπτεται» on a line whose limits were not read. */
    limitsUnread: boolean
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
            // Conservative: a line elsewhere may have answered the area with
            // its limits read, but the area's own held lines are what we can
            // see — so «τα όρια δεν έχουν διαβαστεί» can over-warn, never over-claim.
            limitsUnread: area.alignment === "appears_covered" && !area.protection.hasAnalysed,
            finding: area.alignment === "gap" ? (area.protection.gaps.find((g) => g.onHeldPolicy)?.title ?? null) : null,
            unknownFactors: questionsForArea(area.area, area.unknownFactors).map((q) => q.factor as ContextFactorKey),
            nextStep: area.explanation.nextStep,
            density: area.explanation.density,
            why: byRow.get(priorityId)?.reason.text ?? null,
        }
    })
}

/** Counts of words over the RENDERED rows — the fact cells' numbers, so they match what is on the page. */
export function mapRowCounts(rows: readonly MapRow[]): { areaCount: number; unknownCount: number; coveredCount: number } {
    return {
        areaCount: rows.length,
        unknownCount: rows.filter((r) => r.alignment === "unknown").length,
        coveredCount: rows.filter((r) => r.alignment === "appears_covered" && r.heldLine).length,
    }
}
