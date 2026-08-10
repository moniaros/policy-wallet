/**
 * Risk events: the notifications the product exists to send.
 *
 * All of them hang off ONE seam — `recordRiskProfileVersion`. That function
 * already writes a version only when the assessment MATERIALLY changed (it
 * fingerprints status, priority and cover, so rewording an explanation writes
 * nothing), and the timeline already knows how to diff two consecutive versions
 * into transitions. Deriving notifications from anywhere else would let the
 * alert and the timeline disagree about the same movement in front of the same
 * customer.
 *
 * What this closes:
 *
 * - `protection-score-refresh` recomputed every active user's score daily and
 *   notified nobody, so "your protection changed" — the sentence the product is
 *   for — was never actually said.
 * - `GAP_DETECTED` fired only on the upload path, so a gap the daily engine
 *   found was silent. A gap is a gap whether a PDF arrived that morning or not.
 *
 * Nothing here throws: `emit` swallows its own failures, and versioning is
 * observability that must not take down an upload or a cron batch.
 */

import { emit } from "./dispatch"
import { getNotificationConfig, scoreMateriality } from "./config"
import { settingValue } from "./settings"
import { getRisk } from "@/lib/services/gap-engine/risk-catalog"
import { diffVersions, type RiskSnapshot, type RiskTransition } from "@/lib/services/timeline/diff"

/**
 * How far the score must move before it is worth telling someone.
 *
 * A one-point drift is arithmetic, not news, and a product that pings about it
 * teaches people to ignore the pings that matter. Five points is roughly one
 * risk opening or closing.
 *
 * This is the DEFAULT. The live value is `threshold.scoreMateriality`, tunable
 * from the admin console — the right number is an editorial judgement about how
 * often a customer should hear from us, and that should not need a deploy.
 */
export const SCORE_MATERIALITY = 5

export interface RiskEventInput {
    userId: string
    /** Snapshot the new version was written from. */
    current: RiskSnapshot[]
    /** The previous version's snapshot, or null when this is the first. */
    previous: RiskSnapshot[] | null
    overallScore: number
    previousScore: number | null
    /** True when the score is not a number the customer was shown. */
    indeterminate: boolean
    previousIndeterminate: boolean
    version: number
}

function riskName(riskId: string): { el: string; en: string } {
    const def = getRisk(riskId)
    // Fall back to the id rather than inventing a label: a risk in a snapshot
    // that is no longer in the catalog is a catalog change, and guessing a name
    // for it would put a fabricated phrase in front of a customer.
    return def?.name ?? { el: riskId, en: riskId }
}

/** Transitions worth telling the customer about, split by which event they are. */
export function partitionTransitions(transitions: RiskTransition[]): {
    opened: RiskTransition[]
    changed: RiskTransition[]
} {
    const opened = transitions.filter((t) => t.kind === "opened")
    // `opened` is GAP_DETECTED and interrupts. Everything else is in-app only:
    // a risk CLOSING is good news and does not deserve an interruption.
    const changed = transitions.filter((t) => t.kind !== "opened")
    return { opened, changed }
}

/**
 * Emit every notification implied by one new risk-profile version.
 *
 * Call AFTER the version row is committed.
 */
export async function emitRiskEvents(input: RiskEventInput): Promise<void> {
    // Admin-tunable thresholds. Never throws: falls back to the constants above.
    const config = await getNotificationConfig()
    const materiality = scoreMateriality(config)
    const maxNamed = settingValue<number>(config.settings, "threshold.maxGapsPerNotification")
    const riskChangeEnabled = settingValue<boolean>(config.settings, "threshold.riskChangeNotifyEnabled")

    const transitions = diffVersions(
        input.previous ? ({ risks: input.previous } as never) : null,
        { risks: input.current } as never
    )
    const { opened, changed } = partitionTransitions(transitions)

    // ── New coverage gaps ────────────────────────────────────────────────────
    if (opened.length > 0) {
        const names = opened.map((t) => riskName(t.riskId))
        const title =
            opened.length === 1
                ? { el: "Εντοπίσαμε ένα κενό κάλυψης", en: "We found a coverage gap" }
                : {
                      el: `Εντοπίσαμε ${opened.length} κενά κάλυψης`,
                      en: `We found ${opened.length} coverage gaps`,
                  }
        // Name up to `maxNamed` of them, then summarise. A notification listing
        // nine findings is a wall of text nobody reads to the end.
        const named = names.slice(0, Math.max(1, maxNamed))
        const remaining = opened.length - named.length
        const message =
            remaining <= 0
                ? { el: named.map((n) => n.el).join(" · "), en: named.map((n) => n.en).join(" · ") }
                : {
                      el: `${named.map((n) => n.el).join(" · ")} και ${remaining} ακόμη.`,
                      en: `${named.map((n) => n.en).join(" · ")} and ${remaining} more.`,
                  }

        await emit({
            event: "GAP_DETECTED",
            userId: input.userId,
            title,
            message,
            relatedObjectType: "recommendation",
            relatedObjectId: opened[0].riskId,
            vars: { gapName: names[0].en, gapCount: opened.length },
            // Keyed on the version, so a re-run that recomputes the same
            // assessment cannot announce the same gaps twice.
            dedupeKey: `gap:v${input.version}`,
        })
    }

    // ── Other risk-level movement ────────────────────────────────────────────
    if (changed.length > 0 && riskChangeEnabled) {
        const closed = changed.filter((t) => t.kind === "closed").length
        const lost = changed.filter((t) => t.kind === "cover_lost").length
        const first = riskName(changed[0].riskId)

        // Lead with the bad news when there is any: losing cover on a risk is
        // the one thing in this group a customer may need to act on.
        const title =
            lost > 0
                ? { el: "Χάθηκε κάλυψη σε έναν κίνδυνο", en: "Cover lost on a risk" }
                : closed > 0
                  ? { el: "Ένας κίνδυνος έκλεισε", en: "A risk closed" }
                  : { el: "Άλλαξε η εικόνα κινδύνου σας", en: "Your risk picture changed" }

        await emit({
            event: "risk_level_changed",
            userId: input.userId,
            title,
            message: {
                el: changed.length === 1 ? first.el : `${first.el} και ${changed.length - 1} ακόμη αλλαγές.`,
                en: changed.length === 1 ? first.en : `${first.en} and ${changed.length - 1} more changes.`,
            },
            relatedObjectType: "recommendation",
            relatedObjectId: changed[0].riskId,
            vars: { riskName: first.en, changeCount: changed.length },
            dedupeKey: `risk_change:v${input.version}`,
        })
    }

    // ── Protection score ─────────────────────────────────────────────────────
    //
    // An indeterminate score is not a number the customer was ever shown, so a
    // delta against it describes a movement that never happened — the same rule
    // getRiskProfileHistory already applies to its own deltas.
    if (
        input.previousScore !== null &&
        !input.indeterminate &&
        !input.previousIndeterminate &&
        Number.isFinite(input.overallScore) &&
        Number.isFinite(input.previousScore)
    ) {
        const delta = input.overallScore - input.previousScore
        if (Math.abs(delta) >= materiality) {
            const up = delta > 0
            await emit({
                event: "protection_score_changed",
                userId: input.userId,
                title: up
                    ? { el: "Η προστασία σας βελτιώθηκε", en: "Your protection improved" }
                    : { el: "Η προστασία σας μειώθηκε", en: "Your protection dropped" },
                message: {
                    el: `Το σκορ προστασίας σας πήγε από ${input.previousScore}% σε ${input.overallScore}%.`,
                    en: `Your protection score moved from ${input.previousScore}% to ${input.overallScore}%.`,
                },
                vars: {
                    previousScore: input.previousScore,
                    currentScore: input.overallScore,
                    scoreDelta: delta,
                },
                dedupeKey: `score:v${input.version}`,
            })
        }
    }
}
