/**
 * Assembling the timeline, and attributing cause.
 *
 * Pure — rows in, entries out — so the causal reasoning can be tested without a
 * database, which matters because it is the part that makes claims.
 *
 * **How a recommendation finds its cause.** `RiskProfileVersion` stores a
 * per-risk snapshot with the trigger that produced it, so the version in which a
 * risk *opened* is recoverable, and that version knows whether a declared life
 * event caused it. The chain is therefore real rather than inferred:
 *
 *     recommendation → the version where its risk opened → the event that
 *     triggered that version
 *
 * When the history does not reach back far enough — every customer whose
 * recommendations predate versioning — we fall back to a declared life event
 * that is known to expose that risk and predates the finding. Where even that is
 * absent we say so, rather than attaching the nearest-looking event. **A wrong
 * cause is worse than no cause**: it teaches the customer that the explanations
 * are decorative.
 */

import { normalizeBranch } from "@/lib/insurance/taxonomy"
import { calendarDaysUntil } from "@/lib/policy-status"
import { displayInsurerName } from "@/lib/wallet/policy-identity"
import { RISK_CATALOG } from "@/lib/services/gap-engine/risk-catalog"
import { risksExposedBy } from "@/lib/services/gap-engine/recommendation-context"
import { getLifeEvent } from "@/lib/services/life-events/registry"
import type { Bilingual } from "@/lib/services/gap-engine/risk-types"
import { diffVersions, explainScoreChange, triggerLabel, type RiskTransition, type VersionRow } from "./diff"
import { byNewestFirst, type TimelineEntry } from "./types"

// ── Source rows ──────────────────────────────────────────────────────

export interface LifeEventRow {
    id: string
    definitionId: string
    occurredAt: Date
}

export interface PolicyRow {
    id: string
    lineOfBusiness: string | null
    insurerName: string | null
    createdAt: Date
    startDate: Date | null
    endDate: Date | null
    status: string | null
}

export interface RenewalRow {
    id: string
    policyId: string
    policyEndDate: Date
    status: string
    outcome: string | null
    outcomeAt: Date | null
    createdAt: Date
}

export interface RecommendationRow {
    id: string
    riskId: string | null
    lineOfBusiness: string
    title: Bilingual
    createdAt: Date
    status: string
}

export interface AdvisorActionRow {
    id: string
    kind: "thread_opened" | "action_assigned" | "action_completed" | "gap_validated" | "advisor_linked"
    at: Date
    subject: string | null
}

export interface TimelineSources {
    lifeEvents: LifeEventRow[]
    policies: PolicyRow[]
    renewals: RenewalRow[]
    recommendations: RecommendationRow[]
    advisorActions: AdvisorActionRow[]
    /** Oldest first. */
    versions: VersionRow[]
}

// ── Labels ───────────────────────────────────────────────────────────

const RISK_NAMES = new Map(RISK_CATALOG.map((r) => [r.id, r.name]))

const riskName = (riskId: string): Bilingual =>
    RISK_NAMES.get(riskId) ?? { en: riskId, el: riskId }

const branchLabel = (lob: string | null): Bilingual => normalizeBranch(lob).label

/**
 * Whether two versions hold scores that can honestly be subtracted.
 *
 * One definition, used by the title, the explanation and the delta badge —
 * three renderings of the same claim that must not be able to disagree.
 */
function comparableScores(previous: VersionRow | null, current: VersionRow): previous is VersionRow {
    return (
        previous !== null &&
        !current.indeterminate &&
        !previous.indeterminate &&
        Number.isFinite(current.overallScore) &&
        Number.isFinite(previous.overallScore)
    )
}

/**
 * How many individual risk rows one recalculation may contribute.
 *
 * The score entry carries the full counts, so this bounds the noise without
 * losing the fact. See the note at the call site.
 */
const MAX_RISK_ROWS_PER_VERSION = 3

/**
 * Which transitions earn one of those rows.
 *
 * A risk opening or losing its cover is what a reader is scanning for; a
 * priority easing is not. Ordering by consequence rather than by whatever the
 * catalog iteration happened to produce.
 */
const TRANSITION_RANK: Record<RiskTransition["kind"], number> = {
    opened: 0,
    cover_lost: 1,
    priority_up: 2,
    closed: 3,
    cover_gained: 4,
    priority_down: 5,
}

function rankTransitions(transitions: RiskTransition[]): RiskTransition[] {
    return [...transitions].sort(
        (a, b) =>
            TRANSITION_RANK[a.kind] - TRANSITION_RANK[b.kind] || a.riskId.localeCompare(b.riskId)
    )
}

/**
 * A date we can actually place on a timeline.
 *
 * Every source here is a database timestamp, so this should never fire — but the
 * whole surface is one `Array.sort` over these values, and `calendarDaysUntil`
 * throws rather than answering on an invalid Date. One unreadable row must not
 * take the page.
 */
function readableDate(value: unknown): value is Date {
    return value instanceof Date && !Number.isNaN(value.getTime())
}

// ── Build ────────────────────────────────────────────────────────────

/**
 * Where each risk most recently opened, and under which version.
 *
 * Built once by walking the version history forwards. A risk can open, close and
 * open again — a lapsed policy does exactly that — so the LAST opening before a
 * finding is the one that explains it, not the first.
 */
function openingVersions(versions: VersionRow[]): Map<string, VersionRow> {
    const openedAt = new Map<string, VersionRow>()
    for (let i = 0; i < versions.length; i++) {
        const transitions = diffVersions(versions[i - 1] ?? null, versions[i])
        for (const t of transitions) {
            if (t.kind === "opened") openedAt.set(t.riskId, versions[i])
        }
    }
    return openedAt
}

export function buildTimeline(sources: TimelineSources, now: Date = new Date()): TimelineEntry[] {
    const entries: TimelineEntry[] = []
    const versions = [...sources.versions].sort((a, b) => a.version - b.version)
    // One opening index for the whole build. Recomputing it per recommendation
    // walked the entire version history once per card.
    const openedAt = openingVersions(versions)

    // ── Life events ──────────────────────────────────────────────────
    const eventEntryId = new Map<string, string>()
    for (const event of sources.lifeEvents) {
        const definition = getLifeEvent(event.definitionId)
        const id = `life_event:${event.id}`
        eventEntryId.set(event.id, id)
        entries.push({
            id,
            kind: "life_event",
            at: event.occurredAt,
            title: definition?.label ?? { en: event.definitionId, el: event.definitionId },
            detail: definition?.description ?? null,
            // A declared change IS a cause. Nothing caused it but the customer.
            cause: null,
            href: "/protection",
        })
    }

    // ── Policies ─────────────────────────────────────────────────────
    for (const policy of sources.policies) {
        const branch = branchLabel(policy.lineOfBusiness)
        // Through the primitive, never the raw column: `insurerName` can hold a
        // sentinel (`__PENDING_EXTRACTION__`, `Unknown Insurer`) on a healthy
        // active policy, and this title rendered one to a customer verbatim.
        // `displayInsurerName` returns '' for a placeholder, so the title
        // degrades to the branch label alone rather than leaking the token.
        const insurer = displayInsurerName(policy.insurerName)
        entries.push({
            id: `policy_added:${policy.id}`,
            kind: "policy_added",
            at: policy.createdAt,
            title: {
                en: `${branch.en} policy added${insurer ? ` — ${insurer}` : ""}`,
                el: `Προστέθηκε ασφαλιστήριο ${branch.el}${insurer ? ` — ${insurer}` : ""}`,
            },
            detail: null,
            cause: null,
            href: `/wallet/${policy.id}`,
        })

        // Cover ending is a change in what protects them, and it is the one
        // timeline entry that appears without anyone doing anything.
        // Whether cover has ended is a CALENDAR question on the Athens calendar,
        // answered by the one clock in lib/policy-status. Comparing milliseconds
        // put a policy's last day on the timeline as already over for the three
        // hours after the customer's own calendar had rolled past it — the
        // repo's own guard caught this, correctly.
        if (policy.endDate && readableDate(policy.endDate) && calendarDaysUntil(policy.endDate, now) < 0) {
            entries.push({
                id: `coverage_change:${policy.id}:ended`,
                kind: "coverage_change",
                at: policy.endDate,
                title: {
                    en: `${branch.en} cover ended`,
                    el: `Έληξε η κάλυψη ${branch.el}`,
                },
                detail: {
                    en: "From this date the risks this policy answered were no longer covered by it.",
                    el: "Από την ημερομηνία αυτή οι κίνδυνοι που κάλυπτε το ασφαλιστήριο έπαψαν να καλύπτονται από αυτό.",
                },
                cause: null,
                href: `/wallet/${policy.id}`,
            })
        }
    }

    // ── Renewals ─────────────────────────────────────────────────────
    for (const renewal of sources.renewals) {
        const resolved = renewal.outcome !== null && renewal.outcomeAt !== null
        entries.push({
            id: `renewal:${renewal.id}`,
            kind: "renewal",
            at: resolved ? renewal.outcomeAt! : renewal.createdAt,
            title: resolved
                ? renewalOutcomeTitle(renewal.outcome!)
                : { en: "Renewal came due", el: "Ήρθε η ώρα ανανέωσης" },
            detail: null,
            cause: null,
            href: `/wallet/${renewal.policyId}`,
        })
    }

    // ── Score and risk changes, from the version history ─────────────
    const scoreEntryByVersion = new Map<number, string>()
    for (let i = 0; i < versions.length; i++) {
        const previous = versions[i - 1] ?? null
        const current = versions[i]
        const transitions = diffVersions(previous, current)
        const id = `score_change:${current.version}`
        scoreEntryByVersion.set(current.version, id)

        const causeEventId = current.lifeEventId ? eventEntryId.get(current.lifeEventId) : undefined
        entries.push({
            id,
            kind: "score_change",
            at: current.computedAt,
            title: scoreTitle(previous, current),
            detail: explainScoreChange(previous, current, transitions),
            cause: causeEventId
                ? {
                      entryId: causeEventId,
                      explanation: {
                          en: "Recalculated because you told us about this change.",
                          el: "Επανυπολογίστηκε επειδή μας δηλώσατε αυτή τη μεταβολή.",
                      },
                  }
                : null,
            // Same condition as the title and the explanation, which is the
            // point: the badge renders this number directly, so a delta that
            // survives while the sentence beside it is suppressed prints
            // "+NaN" next to "we know too little to say".
            delta: comparableScores(previous, current)
                ? current.overallScore - previous.overallScore
                : null,
            href: "/protection",
        })

        // Cap the per-version risk rows.
        //
        // Twelve recalculations flipping eight risks each produced 96 risk rows,
        // and since they are the newest things on the page they filled the
        // entire window: the timeline built to explain recommendations showed
        // zero recommendations, zero life events and zero policies. Nothing is
        // hidden by capping — the score entry directly above states the full
        // counts ("5 risks opened"); these rows are the detail beneath it.
        for (const transition of rankTransitions(transitions).slice(0, MAX_RISK_ROWS_PER_VERSION)) {
            entries.push({
                id: `risk_change:${current.version}:${transition.riskId}:${transition.kind}`,
                kind: "risk_change",
                at: current.computedAt,
                title: transitionTitle(transition),
                detail: riskName(transition.riskId),
                cause: {
                    entryId: causeEventId ?? id,
                    explanation: causeEventId
                        ? {
                              en: "This followed directly from the change you recorded.",
                              el: "Προέκυψε άμεσα από τη μεταβολή που καταγράψατε.",
                          }
                        : {
                              en: `Found during ${triggerLabel(current.trigger).en}.`,
                              el: `Εντοπίστηκε κατά ${triggerLabel(current.trigger).el}.`,
                          },
                },
                riskId: transition.riskId,
                href: "/protection",
            })
        }
    }

    // ── Recommendations, with their cause ────────────────────────────
    for (const rec of sources.recommendations) {
        entries.push({
            id: `recommendation:${rec.id}`,
            kind: "recommendation",
            at: rec.createdAt,
            title: rec.title,
            detail: null,
            cause: attributeRecommendation(rec, versions, sources.lifeEvents, eventEntryId, scoreEntryByVersion, openedAt),
            riskId: rec.riskId,
            href: "/protection",
        })
    }

    // ── Advisor actions ──────────────────────────────────────────────
    for (const action of sources.advisorActions) {
        entries.push({
            id: `advisor_action:${action.id}`,
            kind: "advisor_action",
            at: action.at,
            title: advisorTitle(action.kind),
            detail: action.subject ? { en: action.subject, el: action.subject } : null,
            cause: null,
            href: "/collaboration",
        })
    }

    // An entry we cannot date cannot be placed in a sequence, and rendering it
    // would print "Invalid Date" against a real claim about the customer's life.
    const placeable = entries.filter((entry) => readableDate(entry.at))

    // Causes are resolved while building, so anything dropped above — or simply
    // absent from its source query — leaves a reference to an entry that is not
    // on the page. "Why this?" would then scroll nowhere, which reads as a
    // broken control. A cause we cannot show is not a cause we can claim.
    const present = new Set(placeable.map((entry) => entry.id))
    return placeable
        .map((entry) =>
            entry.cause && !present.has(entry.cause.entryId) ? { ...entry, cause: null } : entry
        )
        .sort(byNewestFirst)
}

/**
 * What put a recommendation on the screen, independent of any surface.
 *
 * `source` records HOW we know, because the three answers are not equally
 * strong and the copy should not pretend otherwise:
 *
 *  - `version_event` — the risk opened in a recalculation the customer's own
 *    declared change triggered. Recorded fact.
 *  - `version_trigger` — the risk opened in a recalculation, but nothing the
 *    customer declared caused it (an upload, a cron re-check).
 *  - `exposing_event` — no version history reaches back this far, but a declared
 *    event that this risk structurally depends on predates the finding. Weaker;
 *    we did not watch it happen, and the wording does not claim we did.
 *
 * Returning null is the fourth answer and a legitimate one.
 */
export interface RecommendationCause {
    source: "version_event" | "version_trigger" | "exposing_event"
    /** The life event, when one is implicated. */
    lifeEventId: string | null
    /** The version whose recalculation opened it, when known. */
    version: number | null
    explanation: Bilingual
}

export function attributeRecommendationCause(
    riskId: string | null,
    createdAt: Date,
    versions: VersionRow[],
    lifeEvents: LifeEventRow[],
    /** Precomputed opening index. Supplied by `buildTimeline`, which needs it
     *  once for the whole page rather than once per card. */
    openedIndex?: Map<string, VersionRow>
): RecommendationCause | null {
    if (!riskId) {
        // Policy and portfolio findings come from reading a document, not from a
        // change in the customer's life. Saying so is the honest answer.
        return null
    }

    const version = (openedIndex ?? openingVersions(versions)).get(riskId)
    if (version) {
        if (version.lifeEventId) {
            return {
                source: "version_event",
                lifeEventId: version.lifeEventId,
                version: version.version,
                explanation: {
                    en: "You told us about this change, and it opened the risk behind this recommendation.",
                    el: "Μας δηλώσατε αυτή τη μεταβολή, και άνοιξε τον κίνδυνο πίσω από αυτή την πρόταση.",
                },
            }
        }
        return {
            source: "version_trigger",
            lifeEventId: null,
            version: version.version,
            explanation: {
                en: `This risk opened during ${triggerLabel(version.trigger).en}.`,
                el: `Ο κίνδυνος άνοιξε κατά ${triggerLabel(version.trigger).el}.`,
            },
        }
    }

    // Date-safe: this runs inside the page render, and an unreadable timestamp
    // on one row must not take the whole timeline. An event we cannot date also
    // cannot be shown to precede the finding, so it is not a candidate cause.
    if (!readableDate(createdAt)) return null
    const nearest = lifeEvents
        .filter((e) => readableDate(e.occurredAt) && e.occurredAt.getTime() <= createdAt.getTime())
        .filter((e) => risksExposedBy(e.definitionId).includes(riskId))
        .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())[0]
    if (nearest) {
        const definition = getLifeEvent(nearest.definitionId)
        const label = definition?.label
        return {
            source: "exposing_event",
            lifeEventId: nearest.id,
            version: null,
            explanation: label
                ? {
                      en: `This risk depends on a change you recorded: ${label.en.toLowerCase()}.`,
                      el: `Ο κίνδυνος εξαρτάται από μεταβολή που καταγράψατε: ${label.el.toLowerCase()}.`,
                  }
                : {
                      en: "This risk depends on a change you recorded.",
                      el: "Ο κίνδυνος εξαρτάται από μεταβολή που καταγράψατε.",
                  },
        }
    }

    // Nothing recorded. Say that, rather than attaching the nearest-looking
    // event — a wrong cause teaches the reader the explanations are decorative.
    return null
}

/** The same attribution, resolved to timeline entry ids. */
function attributeRecommendation(
    rec: RecommendationRow,
    versions: VersionRow[],
    lifeEvents: LifeEventRow[],
    eventEntryId: Map<string, string>,
    scoreEntryByVersion: Map<number, string>,
    openedIndex: Map<string, VersionRow>
): TimelineEntry["cause"] {
    const cause = attributeRecommendationCause(rec.riskId, rec.createdAt, versions, lifeEvents, openedIndex)
    if (!cause) return null

    const entryId =
        (cause.lifeEventId ? eventEntryId.get(cause.lifeEventId) : undefined) ??
        (cause.version !== null ? scoreEntryByVersion.get(cause.version) : undefined)

    // An attribution we cannot point at is not renderable as a link. The card
    // still shows the sentence; the timeline needs a target and has none.
    return entryId ? { entryId, explanation: cause.explanation } : null
}

// ── Titles ───────────────────────────────────────────────────────────

function scoreTitle(previous: VersionRow | null, current: VersionRow): Bilingual {
    // A score that is not a finite number is not a score. Printing it produced
    // "Protection score: NaN" against a real claim about the customer's cover.
    if (current.indeterminate || !Number.isFinite(current.overallScore)) {
        return { en: "Not enough known to score yet", el: "Ανεπαρκή στοιχεία για βαθμολόγηση" }
    }
    if (!comparableScores(previous, current)) {
        // NO NUMBER. A timeline says what HAPPENED; the score is a metric someone
        // computed, and stating it as an event («your protection fell to 74»)
        // makes a stronger claim than the dashboard's own donut ever did — it
        // reads as something that befell the customer rather than something we
        // calculated. The value itself lives in exactly one place, behind the
        // dashboard's disclosure, where it carries its qualifier.
        return {
            en: "Your cover was assessed",
            el: "Η κάλυψή σας αξιολογήθηκε",
        }
    }
    const delta = current.overallScore - previous.overallScore
    if (delta === 0) {
        return {
            en: "The assessment did not move",
            el: "Η αξιολόγηση δεν μετακινήθηκε",
        }
    }
    return delta > 0
        ? {
              en: "The assessment improved",
              el: "Η αξιολόγηση βελτιώθηκε",
          }
        : {
              en: "The assessment declined",
              el: "Η αξιολόγηση υποχώρησε",
          }
}

function transitionTitle(t: RiskTransition): Bilingual {
    const branch = branchLabel(t.lineOfBusiness)
    switch (t.kind) {
        case "opened":
            return { en: "A risk opened", el: "Άνοιξε ένας κίνδυνος" }
        case "closed":
            return { en: "A risk closed", el: "Έκλεισε ένας κίνδυνος" }
        case "priority_up":
            return { en: "A risk became more serious", el: "Ένας κίνδυνος έγινε σοβαρότερος" }
        case "priority_down":
            return { en: "A risk became less serious", el: "Ένας κίνδυνος έγινε λιγότερο σοβαρός" }
        case "cover_gained":
            return {
                en: `${branch.en} cover started answering a risk`,
                el: `Η κάλυψη ${branch.el} άρχισε να απαντά σε έναν κίνδυνο`,
            }
        case "cover_lost":
            return {
                en: `${branch.en} cover stopped answering a risk`,
                el: `Η κάλυψη ${branch.el} έπαψε να απαντά σε έναν κίνδυνο`,
            }
    }
}

function renewalOutcomeTitle(outcome: string): Bilingual {
    switch (outcome) {
        case "renewed_same_insurer":
            return { en: "Renewed with the same insurer", el: "Ανανεώθηκε με την ίδια ασφαλιστική" }
        case "renewed_different_insurer":
            return { en: "Renewed with a different insurer", el: "Ανανεώθηκε με άλλη ασφαλιστική" }
        case "lapsed":
            return { en: "Renewal lapsed", el: "Η ανανέωση έληξε άπρακτη" }
        case "cancelled":
            return { en: "Renewal cancelled", el: "Η ανανέωση ακυρώθηκε" }
        default:
            return { en: "Renewal resolved", el: "Η ανανέωση διευθετήθηκε" }
    }
}

function advisorTitle(kind: AdvisorActionRow["kind"]): Bilingual {
    switch (kind) {
        case "advisor_linked":
            return { en: "An advisor was connected", el: "Συνδέθηκε σύμβουλος" }
        case "thread_opened":
            return { en: "Your advisor opened a conversation", el: "Ο σύμβουλός σας άνοιξε συζήτηση" }
        case "action_assigned":
            return { en: "Your advisor assigned an action", el: "Ο σύμβουλός σας ανέθεσε ενέργεια" }
        case "action_completed":
            return { en: "An action was completed", el: "Ολοκληρώθηκε μια ενέργεια" }
        case "gap_validated":
            return { en: "Your advisor confirmed a finding", el: "Ο σύμβουλός σας επιβεβαίωσε ένα εύρημα" }
    }
}
