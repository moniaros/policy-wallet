/**
 * Continuous risk monitoring, and the hooks a prediction engine would attach to.
 *
 * **Monitoring already half-exists and was never surfaced.** A nightly cron
 * recomputes every stale assessment, and `RiskProfileVersion` writes a row only
 * when the fingerprint changes — so the product has been detecting material
 * change for some time and telling nobody. This turns that into a watch: a set
 * of named signals, each with a verdict, that any surface can render and any job
 * can act on.
 *
 * **Prediction hooks, not a predictor.** The architecture for forecasting life
 * events is designed (docs/architecture/life-event-foresight.md) and deliberately
 * not built here: it needs a labelled outcome history this product has not yet
 * accumulated, and a predictor trained on nothing is a random number with a
 * confidence score attached. What is built is the seam — `PredictionSignal`
 * describes what a predictor would emit, and `openPredictionHooks` reports the
 * observable precursors we can already see, clearly marked as observations
 * rather than forecasts.
 */

import type { Bilingual } from "@/lib/services/gap-engine/risk-types"
import type { LifeContext } from "@/lib/services/gap-engine/life-context"
import { calendarDaysUntil } from "@/lib/policy-status"
import type { DimensionResult } from "./compute"

// ── Continuous monitoring ────────────────────────────────────────────

export type WatchVerdict = "clear" | "attention" | "action"

export interface WatchSignal {
    id: string
    label: Bilingual
    verdict: WatchVerdict
    /** What changed — null when this signal has nothing to report. */
    detail: Bilingual | null
    /** What should happen next. */
    action: Bilingual | null
    confidence: "high" | "medium" | "low"
}

export interface MonitoringInputs {
    ctx: LifeContext
    dimensions: DimensionResult[]
    lastAssessedAt: Date | null
    /** Live policies with a readable end date, for the lapse watch. */
    policies: Array<{ id: string; endDate: Date | null; lineOfBusiness: string | null }>
    now?: Date
}

/**
 * The standing watch.
 *
 * Every signal reports even when it has nothing to say, because a watch that
 * only appears when something is wrong cannot be distinguished from a watch that
 * is broken. `clear` is a result.
 */
export function monitorRisk(inputs: MonitoringInputs): WatchSignal[] {
    const { ctx, dimensions, lastAssessedAt, policies } = inputs
    const now = inputs.now ?? new Date()
    const readable = (d: Date | null | undefined): d is Date =>
        d instanceof Date && !Number.isNaN(d.getTime())

    const signals: WatchSignal[] = []

    // 1. Cover about to lapse. The only signal here that is a hard deadline.
    const dated = policies
        .filter((p) => readable(p.endDate))
        .map((p) => ({ ...p, days: calendarDaysUntil(p.endDate as Date, now) }))
    const lapsing = dated.filter((p) => p.days >= 0 && p.days <= 45)
    // ALREADY LAPSED. The window used to be `days >= 0`, which quietly excluded
    // every policy that had already ended — so a wallet whose cover was entirely
    // expired reported «Κάλυψη που λήγει: Εντάξει». The check had not found
    // anything about to lapse because there was nothing left to lapse, and it
    // said so as reassurance. Absence of a detected problem is not evidence of
    // no problem.
    const expired = dated.filter((p) => p.days < 0)
    signals.push({
        id: "cover_lapsing",
        label: { en: "Cover about to lapse", el: "Κάλυψη που λήγει" },
        verdict: expired.length > 0 || lapsing.length > 0 ? "action" : "clear",
        detail:
            expired.length > 0
                ? {
                      en: `${expired.length} ${expired.length === 1 ? "policy has" : "policies have"} already ended${lapsing.length > 0 ? `, and ${lapsing.length} more end within 45 days` : ""}.`,
                      el: `${expired.length} ${expired.length === 1 ? "ασφαλιστήριο έχει ήδη λήξει" : "ασφαλιστήρια έχουν ήδη λήξει"}${lapsing.length > 0 ? ` και άλλα ${lapsing.length} λήγουν μέσα σε 45 ημέρες` : ""}.`,
                  }
                : lapsing.length > 0
                ? {
                      en: `${lapsing.length} ${lapsing.length === 1 ? "policy ends" : "policies end"} within 45 days.`,
                      el: `${lapsing.length} ${lapsing.length === 1 ? "ασφαλιστήριο λήγει" : "ασφαλιστήρια λήγουν"} μέσα σε 45 ημέρες.`,
                  }
                : null,
        action:
            expired.length > 0
                ? { en: "Renew or replace the cover that has ended.", el: "Ανανεώστε ή αντικαταστήστε την κάλυψη που έληξε." }
                : lapsing.length > 0
                ? { en: "Confirm each one is being renewed.", el: "Επιβεβαιώστε ότι ανανεώνεται το καθένα." }
                : null,
        confidence: "high",
    })

    // 2. Dimensions moving the wrong way.
    const worsening = dimensions.filter((d) => d.trend === "worsening")
    signals.push({
        id: "dimensions_worsening",
        label: { en: "Protection moving backwards", el: "Κάλυψη που μειώνεται" },
        verdict: worsening.length > 1 ? "action" : worsening.length === 1 ? "attention" : "clear",
        detail:
            worsening.length > 0
                ? {
                      en: `${worsening.map((d) => d.label.en).join(", ")} fell since the last check.`,
                      el: `${worsening.map((d) => d.label.el).join(", ")}: πτώση από τον προηγούμενο έλεγχο.`,
                  }
                : null,
        action:
            worsening.length > 0
                ? { en: "Look at what moved on your timeline.", el: "Δείτε τι μετακινήθηκε στο χρονολόγιό σας." }
                : null,
        // Depends on there being history at all; without it every dimension
        // reads `unknown`, which is not the same as `clear`.
        confidence: dimensions.some((d) => d.trend !== "unknown") ? "high" : "low",
    })

    // 3. A picture going stale. Not an alarm — a statement about us, not them.
    const staleDays =
        lastAssessedAt && readable(lastAssessedAt) ? -calendarDaysUntil(lastAssessedAt, now) : null
    signals.push({
        id: "picture_stale",
        label: { en: "How current this is", el: "Πότε έγινε ο τελευταίος έλεγχος" },
        verdict: staleDays === null ? "attention" : staleDays > 180 ? "attention" : "clear",
        detail:
            staleDays === null
                ? { en: "We have not assessed your position yet.", el: "Δεν έχουμε αξιολογήσει ακόμη τη θέση σας." }
                : staleDays > 180
                  ? {
                        en: `Last assessed ${staleDays} days ago. Lives change faster than that.`,
                        el: `Τελευταία αξιολόγηση πριν ${staleDays} ημέρες. Οι ζωές αλλάζουν ταχύτερα.`,
                    }
                  : null,
        action:
            staleDays === null || staleDays > 180
                ? { en: "Tell us about anything that has changed.", el: "Πείτε μας για οτιδήποτε άλλαξε." }
                : null,
        confidence: "high",
    })

    // 4. Critical exposures standing open.
    const critical = dimensions.filter((d) => d.urgency === "now")
    signals.push({
        id: "critical_open",
        label: { en: "Serious exposures open", el: "Σοβαροί κίνδυνοι χωρίς κάλυψη" },
        verdict: critical.length > 0 ? "action" : "clear",
        detail:
            critical.length > 0
                ? {
                      en: `${critical.map((d) => d.label.en).join(", ")} ${critical.length === 1 ? "carries" : "carry"} an exposure we would not leave open.`,
                      el: `${critical.map((d) => d.label.el).join(", ")}: έκθεση που δεν θα αφήναμε ανοιχτή.`,
                  }
                : null,
        action: critical.length > 0 ? { en: "Start with these.", el: "Ξεκινήστε από αυτά." } : null,
        confidence: "high",
    })

    void ctx
    return signals
}

// ── Prediction hooks ─────────────────────────────────────────────────

/**
 * The shape a predictor would emit.
 *
 * Defined here so the seam is real and typed rather than a promise in a doc.
 * Nothing produces a `forecast` today — see the module note.
 */
export interface PredictionSignal {
    id: string
    kind: "observation" | "forecast"
    label: Bilingual
    /** What we can see, or what we expect. */
    detail: Bilingual
    /** 0-1. Only meaningful on a `forecast`; an observation is not a probability. */
    probability: number | null
    /** Which life event this points at, from the registry. */
    suggestsEvent: string | null
    /** What would change if it happened. */
    wouldOpen: string[]
}

/**
 * Precursors we can already observe, stated as observations.
 *
 * Deliberately not dressed as predictions. "You are 64 and have no pension
 * arrangement" is a fact about today that happens to imply something about next
 * year; "you are 73% likely to retire within 18 months" is a number this product
 * cannot yet honestly produce. The first is useful and true; the second would be
 * invented.
 */
export function openPredictionHooks(ctx: LifeContext, dimensions: DimensionResult[]): PredictionSignal[] {
    const signals: PredictionSignal[] = []

    if (ctx.age !== null && ctx.age >= 60 && ctx.age < 70 && ctx.employmentStatus !== "retired") {
        signals.push({
            id: "approaching_retirement",
            kind: "observation",
            label: { en: "Retirement is close", el: "Η σύνταξη πλησιάζει" },
            detail: {
                en: "You are within the years most people stop working. What protects an income changes when the income does.",
                el: "Βρίσκεστε στα χρόνια που οι περισσότεροι σταματούν να εργάζονται. Ό,τι προστατεύει ένα εισόδημα αλλάζει όταν αλλάζει το εισόδημα.",
            },
            probability: null,
            suggestsEvent: "retirement",
            wouldOpen: ["retirement_shortfall"],
        })
    }

    if (ctx.known.mortgage && (ctx.mortgageAmount ?? 0) > 0 && ctx.dependentsCount > 0) {
        signals.push({
            id: "debt_with_dependants",
            kind: "observation",
            label: { en: "Debt and dependants together", el: "Χρέος και εξαρτώμενα μαζί" },
            detail: {
                en: "A mortgage and people who rely on you is the combination where one interruption reaches everyone at once.",
                el: "Στεγαστικό δάνειο μαζί με άτομα που στηρίζονται σε εσάς είναι ο συνδυασμός όπου μία διακοπή φτάνει ταυτόχρονα σε όλους.",
            },
            probability: null,
            suggestsEvent: null,
            wouldOpen: ["life_debt", "life_dependents"],
        })
    }

    const thin = dimensions.filter((d) => d.confidence === "low" && d.applicableCount > 0)
    if (thin.length >= 3) {
        signals.push({
            id: "picture_too_thin_to_forecast",
            kind: "observation",
            label: { en: "Too little known to look ahead", el: "Πολύ λίγα γνωστά για πρόβλεψη" },
            detail: {
                en: `${thin.length} areas rest on unanswered questions. Anything we said about what comes next would be guesswork.`,
                el: `${thin.length} περιοχές στηρίζονται σε αναπάντητες ερωτήσεις. Οτιδήποτε λέγαμε για το τι έρχεται θα ήταν εικασία.`,
            },
            probability: null,
            suggestsEvent: null,
            wouldOpen: [],
        })
    }

    return signals
}
