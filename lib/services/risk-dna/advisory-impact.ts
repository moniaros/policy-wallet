/**
 * Advisor Opportunity Engine, and the executive view over a book.
 *
 * **What this replaces, and why.** The existing opportunity scorer ranks by
 * `ConversionLikelihood`: gap severity because "critical gaps convert better",
 * engagement because "active users convert better", recency because fresh
 * detections are easier to close. That is a sales-lead queue with an insurance
 * vocabulary — it ranks a customer higher for being *easy to sell to*, and a
 * household that never logs in and needs help most sinks to the bottom.
 *
 * This ranks by **advisory impact**: how much a household's protection would
 * actually improve, how exposed they are while it does not, and how much of the
 * picture only a human can resolve. Those three are the case for an advisor's
 * time. Conversion likelihood is not a factor at all — not because revenue does
 * not matter, but because a queue ordered by need and a queue ordered by
 * closeability are different queues, and only one of them can be called advice.
 *
 * The old scorer is left in place for the surfaces that still speak it; nothing
 * here reads it.
 */

import type { Bilingual } from "@/lib/services/gap-engine/risk-types"
import type { DimensionResult } from "./compute"
import type { CustomerHealthIndex } from "./health-index"

export interface AdvisoryImpact {
    userId: string
    /** 0-100. Ranks a book by where an advisor's time does the most good. */
    impact: number
    factors: {
        /** Protection points recoverable by closing what is open. */
        recoverable: number
        /** How severe the open exposures are. */
        exposure: number
        /** How many people a gap here reaches. */
        reach: number
        /** How much only a human can settle — the advisor's actual edge. */
        unresolved: number
    }
    /** The five answers, for the advisor rather than the customer. */
    whatChanged: Bilingual | null
    whyItMatters: Bilingual
    nextAction: Bilingual
    confidence: "high" | "medium" | "low"
    howItImproves: Bilingual
}

export interface ImpactInputs {
    userId: string
    dimensions: DimensionResult[]
    health: CustomerHealthIndex
    dependantCount: number
    /** Dimensions that moved down since the last check. */
    worsening: number
}

/**
 * Score one household by how much good an advisor could do.
 *
 * Weights are deliberately flat-ish and few. A ten-factor model would imply a
 * precision this has no evidence for, and the ordering is what matters: two
 * households a point apart are interchangeable, and both should be worked.
 */
export function advisoryImpact(inputs: ImpactInputs): AdvisoryImpact {
    const { userId, dimensions, health, dependantCount, worsening } = inputs

    // 1. Recoverable protection (40%). The honest headline: what closing the
    //    open items would actually move, taken from the same projection the
    //    customer is shown, so advisor and customer see one number.
    const recoverablePoints = dimensions.reduce((sum, d) => sum + (d.ifActioned?.points ?? 0), 0)
    const recoverable = Math.min(100, recoverablePoints * 4)

    // 2. Exposure while it stays open (30%).
    const urgentCount = dimensions.filter((d) => d.urgency === "now").length
    const soonCount = dimensions.filter((d) => d.urgency === "soon").length
    const exposure = Math.min(100, urgentCount * 40 + soonCount * 15)

    // 3. Reach (15%). A gap that touches four people is not the same as one
    //    that touches one, and no conversion model has ever cared.
    const reach = Math.min(100, dependantCount * 25)

    // 4. What only a human can settle (15%). Where the analysis ran out — an
    //    unread policy, an underwriting question, an unanswered fact — is
    //    exactly where an advisor is worth paying for.
    const lowConfidence = dimensions.filter((d) => d.confidence === "low" && d.applicableCount > 0).length
    const unresolved = Math.min(100, lowConfidence * 25 + (health.confidence === "low" ? 25 : 0))

    const impact = Math.round(
        recoverable * 0.4 + exposure * 0.3 + reach * 0.15 + unresolved * 0.15
    )

    const topDimension = [...dimensions]
        .filter((d) => d.openCount > 0)
        .sort((a, b) => (b.ifActioned?.points ?? 0) - (a.ifActioned?.points ?? 0))[0]

    return {
        userId,
        impact,
        factors: {
            recoverable: Math.round(recoverable),
            exposure: Math.round(exposure),
            reach: Math.round(reach),
            unresolved: Math.round(unresolved),
        },
        whatChanged:
            worsening > 0
                ? {
                      en: `${worsening} ${worsening === 1 ? "area has" : "areas have"} moved backwards since the last check.`,
                      el: `${worsening} ${worsening === 1 ? "περιοχή υποχώρησε" : "περιοχές υποχώρησαν"} από τον προηγούμενο έλεγχο.`,
                  }
                : null,
        whyItMatters:
            dependantCount > 0
                ? {
                      en: `${dependantCount} ${dependantCount === 1 ? "person depends" : "people depend"} on this household's protection, and ${urgentCount + soonCount} ${urgentCount + soonCount === 1 ? "area needs" : "areas need"} attention.`,
                      el: `${dependantCount} ${dependantCount === 1 ? "άτομο εξαρτάται" : "άτομα εξαρτώνται"} από την προστασία αυτού του νοικοκυριού, και ${urgentCount + soonCount} ${urgentCount + soonCount === 1 ? "περιοχή χρειάζεται" : "περιοχές χρειάζονται"} προσοχή.`,
                  }
                : {
                      en: `${urgentCount + soonCount} ${urgentCount + soonCount === 1 ? "area needs" : "areas need"} attention.`,
                      el: `${urgentCount + soonCount} ${urgentCount + soonCount === 1 ? "περιοχή χρειάζεται" : "περιοχές χρειάζονται"} προσοχή.`,
                  },
        nextAction: topDimension
            ? {
                  en: `Start with ${topDimension.label.en.toLowerCase()} — it is where the most protection is recoverable.`,
                  el: `Ξεκινήστε από: ${topDimension.label.el.toLowerCase()} — εκεί ανακτάται η μεγαλύτερη προστασία.`,
              }
            : lowConfidence > 0
              ? {
                    en: "Nothing is open, but several areas rest on facts we could not settle. Confirm them.",
                    el: "Τίποτα δεν είναι ανοιχτό, αλλά αρκετές περιοχές στηρίζονται σε στοιχεία που δεν μπορέσαμε να επιβεβαιώσουμε. Επιβεβαιώστε τα.",
                }
              : {
                    en: "Nothing needs attention right now.",
                    el: "Τίποτα δεν χρειάζεται προσοχή αυτή τη στιγμή.",
                },
        // The advisor's own confidence in this ranking, which is the customer's
        // health confidence — the ranking cannot be surer than its inputs.
        confidence: health.confidence,
        howItImproves: {
            en:
                recoverablePoints > 0
                    ? `Closing what is open would move their protection score by about ${recoverablePoints} ${recoverablePoints === 1 ? "point" : "points"}.`
                    : "There is no score movement available here; the value is in confirming what we could not read.",
            el:
                recoverablePoints > 0
                    ? `Η κάλυψη των ανοιχτών θεμάτων θα μετακινούσε το σκορ προστασίας τους κατά περίπου ${recoverablePoints} ${recoverablePoints === 1 ? "μονάδα" : "μονάδες"}.`
                    : "Δεν υπάρχει διαθέσιμη μετακίνηση σκορ εδώ· η αξία βρίσκεται στην επιβεβαίωση όσων δεν μπορέσαμε να διαβάσουμε.",
        },
    }
}

// ── Executive view ───────────────────────────────────────────────────

export interface BookOverview {
    householdCount: number
    /** People reached by the book's protection, not policies sold. */
    peopleCovered: number
    /** Households with at least one urgent exposure. */
    urgentHouseholds: number
    /** Protection points recoverable across the whole book. */
    recoverablePoints: number
    /** Households whose picture is too thin to advise on. */
    unknownHouseholds: number
    /** Median health index — how well the book is understood. */
    medianHealth: number | null
    whatChanged: Bilingual | null
    whyItMatters: Bilingual
    nextAction: Bilingual
}

/**
 * The book, measured in protection rather than production.
 *
 * Every number here is deliberately a protection measure. A traditional
 * executive dashboard counts policies, premium and conversion; those are
 * measures of the seller. Households reached, people covered, exposure standing
 * open and protection recoverable are measures of whether the book is doing its
 * job — and they move in the same direction as a healthy business without
 * pretending to be one.
 */
export function bookOverview(
    impacts: AdvisoryImpact[],
    healths: CustomerHealthIndex[],
    peopleCovered: number,
    worseningHouseholds: number
): BookOverview {
    const scored = healths.map((h) => h.index).filter((v): v is number => typeof v === "number")
    const sorted = [...scored].sort((a, b) => a - b)
    const medianHealth =
        sorted.length === 0
            ? null
            : sorted.length % 2 === 1
              ? sorted[(sorted.length - 1) / 2]
              : Math.round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2)

    const urgentHouseholds = impacts.filter((i) => i.factors.exposure >= 40).length
    const recoverablePoints = impacts.reduce((sum, i) => sum + Math.round(i.factors.recoverable / 4), 0)
    const unknownHouseholds = healths.filter((h) => h.index === null).length

    return {
        householdCount: impacts.length,
        peopleCovered,
        urgentHouseholds,
        recoverablePoints,
        unknownHouseholds,
        medianHealth,
        whatChanged:
            worseningHouseholds > 0
                ? {
                      en: `${worseningHouseholds} ${worseningHouseholds === 1 ? "household has" : "households have"} moved backwards since the last check.`,
                      el: `${worseningHouseholds} ${worseningHouseholds === 1 ? "νοικοκυριό υποχώρησε" : "νοικοκυριά υποχώρησαν"} από τον προηγούμενο έλεγχο.`,
                  }
                : null,
        whyItMatters: {
            // peopleCovered inflects too — a book covering exactly one person
            // is not "1 people depend" (count-copy-agreement.test.ts).
            en: `${peopleCovered} ${peopleCovered === 1 ? "person depends" : "people depend"} on this book. ${urgentHouseholds} ${urgentHouseholds === 1 ? "household carries" : "households carry"} an exposure that should not be left open.`,
            el: `${peopleCovered} ${peopleCovered === 1 ? "άτομο εξαρτάται" : "άτομα εξαρτώνται"} από αυτό το χαρτοφυλάκιο. ${urgentHouseholds} ${urgentHouseholds === 1 ? "νοικοκυριό φέρει" : "νοικοκυριά φέρουν"} έκθεση που δεν πρέπει να μείνει ανοιχτή.`,
        },
        nextAction:
            unknownHouseholds > 0
                ? {
                      en: `${unknownHouseholds} ${unknownHouseholds === 1 ? "household is" : "households are"} too thinly known to advise on. That is the first constraint, not the gaps.`,
                      // «γνωστό» at one — the adjective agrees with the count
                      // even though «είναι» is number-neutral, so the whole
                      // clause splits (count-copy-agreement.test.ts).
                      el:
                          unknownHouseholds === 1
                              ? "1 νοικοκυριό είναι πολύ ελλιπώς γνωστό για να δοθούν συμβουλές. Αυτός είναι ο πρώτος περιορισμός, όχι τα κενά."
                              : `${unknownHouseholds} νοικοκυριά είναι πολύ ελλιπώς γνωστά για να δοθούν συμβουλές. Αυτός είναι ο πρώτος περιορισμός, όχι τα κενά.`,
                  }
                : {
                      en: "Work the list in order of advisory impact.",
                      el: "Εργαστείτε τη λίστα με σειρά συμβουλευτικού αντικτύπου.",
                  },
    }
}
