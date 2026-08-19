/**
 * The one place a gap severity becomes something a person reads.
 *
 * ── Why this exists ──────────────────────────────────────────────────────────
 *
 * Severity is now RULE-derived (Phase 3a): it comes from the `GapDefinition`
 * the rule fired on, not from a model picking an enum. That fixed where the
 * value comes from. It did not make the value *right*.
 *
 * The thresholds and labels themselves — what separates "high" from "critical",
 * and whether a missing leishmaniasis rider really is critical for a particular
 * dog — have never been validated by an underwriter. The launch checklist has
 * said so for months: severities are placeholders, and must never surface as
 * authoritative in any UI. That is Gate 3b, and it is not closable by code.
 *
 * Until it closes, every surface that shows a severity must also say what the
 * severity is: an indication of what to look at first, not a verdict on
 * someone's risk. Before this module there were about ten independent
 * severity→label/colour maps and no choke point, so the caveat appeared on
 * three surfaces and was missing from the loudest ones — an agent dashboard
 * banner announcing "3 clients with critical gaps", a printable report with a
 * red CRITICAL badge, a task list whose rows are literally titled "Critical
 * coverage gap".
 *
 * ── The rule ─────────────────────────────────────────────────────────────────
 *
 * Render severity through `describeSeverity()` and render its `caveatKey`
 * nearby. `tests/unit/gap-severity-display-single-source.test.ts` fails on a new
 * hand-rolled map.
 */

export type GapSeverity = "critical" | "high" | "medium" | "low"

export const GAP_SEVERITIES: readonly GapSeverity[] = ["critical", "high", "medium", "low"]

/**
 * Gate 3b, in one flag.
 *
 * Flip to `true` only when an underwriter has signed off the thresholds AND the
 * labels — not when someone is confident, and not to make a screen look
 * tidier. `describeSeverity` reads it, so the caveat disappears everywhere at
 * once, deliberately, in one commit that a reviewer can see.
 */
export const SEVERITY_UNDERWRITER_VALIDATED = false

export interface SeverityDescription {
    severity: GapSeverity
    /** i18n key for the label ("Critical priority"). */
    labelKey: string
    /** Neutral tone token. Deliberately NOT a raw colour. */
    tone: "urgent" | "elevated" | "moderate" | "informational"
    /** Sort weight — higher first. The one use of severity needing no caveat. */
    rank: number
    /**
     * i18n key for the sentence that must accompany the label, or null once an
     * underwriter has validated the scale.
     */
    caveatKey: string | null
}

const TABLE: Record<GapSeverity, Omit<SeverityDescription, "severity" | "caveatKey">> = {
    critical: { labelKey: "dashboard.home.recPriorityCritical", tone: "urgent", rank: 4 },
    high: { labelKey: "dashboard.home.recPriorityHigh", tone: "elevated", rank: 3 },
    medium: { labelKey: "dashboard.home.recPriorityMedium", tone: "moderate", rank: 2 },
    low: { labelKey: "dashboard.home.recPriorityLow", tone: "informational", rank: 1 },
}

/**
 * The caveat every severity display must carry until Gate 3b closes.
 *
 * This string already existed and was already shown on three surfaces —
 * "Priorities are based on your profile and the gaps we detected; they are not
 * a definitive risk assessment." Reusing it rather than inventing a second
 * wording keeps one sentence to translate and one to change.
 */
export const SEVERITY_CAVEAT_KEY = "dashboard.home.recPriorityNote"

/** Normalises anything stored in the column, including legacy junk. */
export function toGapSeverity(value: string | null | undefined): GapSeverity {
    const normalized = (value ?? "").trim().toLowerCase()
    return (GAP_SEVERITIES as readonly string[]).includes(normalized)
        ? (normalized as GapSeverity)
        : "medium"
}

/**
 * How to present this severity — label, tone, sort weight, and the caveat that
 * has to go with it.
 */
export function describeSeverity(value: string | null | undefined): SeverityDescription {
    const severity = toGapSeverity(value)
    return {
        severity,
        ...TABLE[severity],
        caveatKey: SEVERITY_UNDERWRITER_VALIDATED ? null : SEVERITY_CAVEAT_KEY,
    }
}

/**
 * Ranking only — for ordering a list so the most serious thing is first.
 *
 * Safe without a caveat because it shows the reader nothing: it changes what is
 * at the top, not what anyone is told about their risk.
 */
export function severityRank(value: string | null | undefined): number {
    return TABLE[toGapSeverity(value)].rank
}
