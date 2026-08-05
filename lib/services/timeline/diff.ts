/**
 * Explaining a score movement, and finding what opened a risk.
 *
 * This is the module the mission's two hard requirements rest on. Both are
 * answered by the same thing: `RiskProfileVersion` stores a per-risk snapshot
 * alongside the trigger that produced it, so consecutive versions can be
 * *diffed*. The score did not "go down" — three specific risks opened, and one
 * of them opened because the customer declared a mortgage on the 14th.
 *
 * Pure: rows in, sentences out. No database, no clock.
 */

import type { Bilingual } from "@/lib/services/gap-engine/risk-types"

/** One risk as a version recorded it. Mirrors `snapshotRisks`. */
export interface RiskSnapshot {
    riskId: string
    lineOfBusiness: string
    status: string
    priority: string
    confidence: string
    coveredBy: string[]
}

export interface VersionRow {
    version: number
    computedAt: Date
    trigger: string
    lifeEventId: string | null
    overallScore: number
    indeterminate: boolean
    openFindingCount: number
    risks: RiskSnapshot[]
}

const OPEN = new Set(["protection_gap", "opportunity"])

/** Read the stored JSON defensively — it is a Json column, not a typed row. */
export function parseRisks(raw: unknown): RiskSnapshot[] {
    if (!Array.isArray(raw)) return []
    return raw.flatMap((entry) => {
        if (!entry || typeof entry !== "object") return []
        const r = entry as Record<string, unknown>
        if (typeof r.riskId !== "string") return []
        return [
            {
                riskId: r.riskId,
                lineOfBusiness: typeof r.lineOfBusiness === "string" ? r.lineOfBusiness : "",
                status: typeof r.status === "string" ? r.status : "",
                priority: typeof r.priority === "string" ? r.priority : "",
                confidence: typeof r.confidence === "string" ? r.confidence : "",
                coveredBy: Array.isArray(r.coveredBy)
                    ? r.coveredBy.filter((x): x is string => typeof x === "string")
                    : [],
            },
        ]
    })
}

export interface RiskTransition {
    riskId: string
    lineOfBusiness: string
    kind: "opened" | "closed" | "priority_up" | "priority_down" | "cover_gained" | "cover_lost"
}

const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }

/**
 * What moved between two versions.
 *
 * A risk appearing for the first time counts as `opened` only if it is open —
 * the first assessment of a customer's life is not a list of things that "just
 * happened to them", and reporting it that way would make a new user's timeline
 * read like a catastrophe.
 */
export function diffVersions(previous: VersionRow | null, current: VersionRow): RiskTransition[] {
    const before = new Map((previous?.risks ?? []).map((r) => [r.riskId, r]))
    const transitions: RiskTransition[] = []

    for (const now of current.risks) {
        const was = before.get(now.riskId)
        const isOpen = OPEN.has(now.status)
        const wasOpen = was ? OPEN.has(was.status) : false

        if (!was) {
            // Only the FIRST version establishes a baseline silently; a risk
            // appearing later genuinely became relevant.
            if (previous && isOpen) {
                transitions.push({ riskId: now.riskId, lineOfBusiness: now.lineOfBusiness, kind: "opened" })
            }
            continue
        }

        if (isOpen && !wasOpen) {
            transitions.push({ riskId: now.riskId, lineOfBusiness: now.lineOfBusiness, kind: "opened" })
        } else if (!isOpen && wasOpen) {
            transitions.push({ riskId: now.riskId, lineOfBusiness: now.lineOfBusiness, kind: "closed" })
        }

        const rankNow = PRIORITY_RANK[now.priority] ?? 9
        const rankWas = PRIORITY_RANK[was.priority] ?? 9
        if (rankNow < rankWas) {
            transitions.push({ riskId: now.riskId, lineOfBusiness: now.lineOfBusiness, kind: "priority_up" })
        } else if (rankNow > rankWas) {
            transitions.push({ riskId: now.riskId, lineOfBusiness: now.lineOfBusiness, kind: "priority_down" })
        }

        const coveredNow = now.coveredBy.length > 0
        const coveredWas = was.coveredBy.length > 0
        if (coveredNow && !coveredWas) {
            transitions.push({ riskId: now.riskId, lineOfBusiness: now.lineOfBusiness, kind: "cover_gained" })
        } else if (!coveredNow && coveredWas) {
            transitions.push({ riskId: now.riskId, lineOfBusiness: now.lineOfBusiness, kind: "cover_lost" })
        }
    }

    // A risk that disappears from the catalog snapshot entirely is a catalog
    // change, not something that happened to the customer. Deliberately silent.
    //
    // Deduped by (risk, kind): `risks` is a Json column, so a snapshot CAN
    // contain the same risk twice. Two identical transitions become two
    // timeline entries with the same id — duplicate React keys — and make the
    // score explanation say "2 risks opened" when one risk was listed twice.
    const seen = new Set<string>()
    return transitions.filter((t) => {
        const key = `${t.riskId}:${t.kind}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
    })
}

/** What the customer did that set a recalculation going. */
export function triggerLabel(trigger: string): Bilingual {
    switch (trigger) {
        case "life_event":
            return { en: "a change you told us about", el: "μια μεταβολή που μας δηλώσατε" }
        case "policy_change":
            return { en: "a change in your wallet", el: "μια μεταβολή στο πορτοφόλι σας" }
        case "profile_update":
            return { en: "answers you gave about your life", el: "απαντήσεις που δώσατε για τη ζωή σας" }
        case "manual":
            return { en: "a refresh you asked for", el: "μια ανανέωση που ζητήσατε" }
        case "cron":
        default:
            return { en: "our routine re-check", el: "τον τακτικό μας επανέλεγχο" }
    }
}

/**
 * Why the score moved, in words.
 *
 * Names counts rather than every risk: "three risks opened" is readable, and a
 * list of eleven risk names in a timeline row is not. The rows for the risks
 * themselves carry the detail, and they sit directly beneath this one.
 */
export function explainScoreChange(
    previous: VersionRow | null,
    current: VersionRow,
    transitions: RiskTransition[]
): Bilingual {
    const trigger = triggerLabel(current.trigger)

    if (!previous) {
        return {
            en: `This is the first assessment of your protection, prompted by ${trigger.en}.`,
            el: `Πρόκειται για την πρώτη αξιολόγηση της προστασίας σας, μετά από ${trigger.el}.`,
        }
    }

    // An indeterminate score on either side means there was no comparable
    // number, so there is no movement to explain — saying otherwise would
    // invent a change the customer never saw.
    // Treated exactly like an indeterminate score: a non-finite number is not
    // one the customer was ever shown, so there is no movement to explain.
    if (
        current.indeterminate ||
        previous.indeterminate ||
        !Number.isFinite(current.overallScore) ||
        !Number.isFinite(previous.overallScore)
    ) {
        return {
            en: `We still know too little about your life to put a number on it, so there is no movement to report — only that we re-checked after ${trigger.en}.`,
            el: `Γνωρίζουμε ακόμη πολύ λίγα για τη ζωή σας ώστε να δώσουμε αριθμό, οπότε δεν υπάρχει μεταβολή προς αναφορά — μόνο ότι επανελέγξαμε μετά από ${trigger.el}.`,
        }
    }

    const opened = transitions.filter((t) => t.kind === "opened").length
    const closed = transitions.filter((t) => t.kind === "closed").length
    const coverGained = transitions.filter((t) => t.kind === "cover_gained").length
    const coverLost = transitions.filter((t) => t.kind === "cover_lost").length

    const parts: Bilingual[] = []
    if (opened > 0) {
        parts.push({
            en: `${opened} ${opened === 1 ? "risk" : "risks"} opened`,
            el: `${opened} ${opened === 1 ? "κίνδυνος άνοιξε" : "κίνδυνοι άνοιξαν"}`,
        })
    }
    if (closed > 0) {
        parts.push({
            en: `${closed} ${closed === 1 ? "risk" : "risks"} closed`,
            el: `${closed} ${closed === 1 ? "κίνδυνος έκλεισε" : "κίνδυνοι έκλεισαν"}`,
        })
    }
    if (coverGained > 0) {
        parts.push({
            en: `cover started answering ${coverGained} of them`,
            el: `η κάλυψη άρχισε να απαντά σε ${coverGained} από αυτούς`,
        })
    }
    if (coverLost > 0) {
        parts.push({
            en: `cover stopped answering ${coverLost} of them`,
            el: `η κάλυψη έπαψε να απαντά σε ${coverLost} από αυτούς`,
        })
    }

    const delta = current.overallScore - previous.overallScore
    const movement: Bilingual =
        delta > 0
            ? { en: `rose ${delta} points`, el: `ανέβηκε ${delta} μονάδες` }
            : delta < 0
              ? { en: `fell ${Math.abs(delta)} points`, el: `έπεσε ${Math.abs(delta)} μονάδες` }
              : { en: "did not move", el: "δεν μετακινήθηκε" }

    if (parts.length === 0) {
        // The fingerprint only writes a version on a material change, so this is
        // a confidence or coverage shift with no status movement behind it.
        return {
            en: `Your score ${movement.en} after ${trigger.en}. What changed was how much of your position we could establish, not which risks apply.`,
            el: `Το σκορ σας ${movement.el} μετά από ${trigger.el}. Αυτό που άλλαξε είναι πόσα μπορέσαμε να διαπιστώσουμε για τη θέση σας, όχι ποιοι κίνδυνοι ισχύουν.`,
        }
    }

    const join = (items: string[], lang: "en" | "el") =>
        items.length <= 1
            ? items.join("")
            : `${items.slice(0, -1).join(", ")} ${lang === "el" ? "και" : "and"} ${items[items.length - 1]}`

    return {
        en: `Your score ${movement.en} after ${trigger.en}: ${join(parts.map((p) => p.en), "en")}.`,
        el: `Το σκορ σας ${movement.el} μετά από ${trigger.el}: ${join(parts.map((p) => p.el), "el")}.`,
    }
}
