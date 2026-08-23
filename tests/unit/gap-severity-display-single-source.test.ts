import { describe, it, expect } from "vitest"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import {
    describeSeverity,
    severityRank,
    toGapSeverity,
    SEVERITY_CAVEAT_KEY,
    SEVERITY_UNDERWRITER_VALIDATED,
    isSeverityValidated,
    describeSeverityForDefinition,
} from "@/lib/gaps/severity-display"

/**
 * Gate 3b: severity is not a verdict, and no screen may imply it is.
 *
 * Severity became rule-derived in Phase 3a. The thresholds and labels are still
 * unvalidated by an underwriter, and the launch checklist has always said they
 * must never surface as authoritative. Before `lib/gaps/severity-display.ts`
 * there were ~10 independent severity→label/colour maps, so the caveat appeared
 * on three surfaces and was missing from the loudest ones.
 *
 * This file does two jobs: it pins the primitive's behaviour, and it stops the
 * bypass list growing.
 */

describe("the primitive", () => {
    it("pairs every severity with the caveat while Gate 3b is open", () => {
        expect(SEVERITY_UNDERWRITER_VALIDATED).toBe(false)
        for (const value of ["critical", "high", "medium", "low"]) {
            expect(describeSeverity(value).caveatKey, value).toBe(SEVERITY_CAVEAT_KEY)
        }
    })

    it("orders by seriousness", () => {
        expect(severityRank("critical")).toBeGreaterThan(severityRank("high"))
        expect(severityRank("high")).toBeGreaterThan(severityRank("medium"))
        expect(severityRank("medium")).toBeGreaterThan(severityRank("low"))
    })

    it("degrades unknown values to medium rather than throwing at render time", () => {
        // The column is a free String and has held AI-invented values.
        expect(toGapSeverity(null)).toBe("medium")
        expect(toGapSeverity("CRITICAL")).toBe("critical")
        expect(toGapSeverity("catastrophic")).toBe("medium")
    })

    it("exposes a tone, not a colour", () => {
        // A raw colour in the model layer is how ten copies of this map started.
        const description = describeSeverity("critical")
        expect(description.tone).toBe("urgent")
        expect(JSON.stringify(description)).not.toMatch(/#|bg-|text-red|rose-/)
    })
})

/**
 * Surfaces that still hand-roll severity presentation.
 *
 * This list is DEBT, not permission. Every entry is a place a person can see a
 * severity without the sentence that says what it is worth. It may shrink; a
 * new entry means a new screen implied a risk verdict the product cannot back.
 */
const KNOWN_BYPASSES = new Set([
    // Already shows the caveat (`recPriorityNote`) and still keeps its own colour
    // map, so migrating it is tidying, not a truth fix.
    "components/coverage/RecommendationCards.tsx",
    // MIGRATED 2026-08-23 (dashboard Goal 3): CoverageGapsWidget and
    // AttentionList now take order and tone from describeSeverity() and turn the
    // neutral tone into a class in ONE place (components/gaps/severity-tone.ts),
    // keyed by tone rather than by the severity words. Both dropped off this list.

    // These keep their own colour map AND print a severity WORD to a person, so
    // each now renders <SeverityCaveat /> — pinned by CAVEAT_REQUIRED below.
    // Migrating their colour maps to describeSeverity() is still outstanding, but
    // that is tidying; the truth fix is done.
    "components/agent/ActionQueueCard.tsx",
    "components/tasks/TasksClient.tsx",
    "app/(protected)/insights/InsightsClient.tsx",
    "components/coverage/InsightCard.tsx",

    // Already carried a caveat before this pass — the list used to claim otherwise.
    // CoverageInsightsClient renders `recPriorityNote`; ClientOverviewTab carries a
    // stronger, surface-specific one ("not an assessment of insurance adequacy").
    "components/coverage/CoverageInsightsClient.tsx",
    "components/agent/tabs/ClientOverviewTab.tsx",

    // Colour ONLY — no severity word reaches the reader. PolicyBriefCard's dot is
    // even aria-hidden. A disclaimer bolted to a coloured dot is noise, not honesty.
    "components/wallet/policy-detail/PolicyBriefCard.tsx",
    "components/wallet/PolicyReviewScreen.tsx",
])

/**
 * Surfaces that print a severity WORD ("Critical", «Κρίσιμο», a priority pill) and
 * must therefore say what that word is worth.
 *
 * Gate 3b — underwriter validation of the thresholds and labels — is NOT closable
 * by code, and is still open. Until it closes, a screen that names a severity
 * without this line is asserting a risk verdict the product cannot back.
 */
const CAVEAT_REQUIRED = [
    "components/agent/ActionQueueCard.tsx",
    "components/tasks/TasksClient.tsx",
    "app/(protected)/insights/InsightsClient.tsx",
    "components/coverage/InsightCard.tsx",
]

function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
        const full = join(dir, entry)
        if (entry === "node_modules" || entry === ".next") return []
        if (statSync(full).isDirectory()) return sourceFiles(full)
        return /\.tsx?$/.test(entry) ? [full] : []
    })
}

/** A map from severity words to presentation — the shape that multiplied. */
function handRollsSeverityPresentation(source: string): boolean {
    const hasAllFour = /\bcritical\b/.test(source) && /\bhigh\b/.test(source) && /\bmedium\b/.test(source) && /\blow\b/.test(source)
    if (!hasAllFour) return false
    // Presentation, not logic: a colour class or a label lookup keyed by them.
    return /(bg-|text-|border-)(red|rose|amber|orange|yellow|sky|blue|slate|gray)-\d{3}/.test(source)
}

describe("no new hand-rolled severity presentation", () => {
    const offenders = [...sourceFiles("components"), ...sourceFiles("app")]
        .filter((path) => !path.includes("/admin/"))
        .filter((path) => {
            const source = readFileSync(path, "utf-8")
            // Only files that actually deal in gap/recommendation severity.
            if (!/gap|severity|urgency/i.test(source)) return false
            if (source.includes("severity-display")) return false
            return handRollsSeverityPresentation(source)
        })
        .map((path) => path.replace(/\\/g, "/"))
        .filter((path) => !KNOWN_BYPASSES.has(path))
        .sort()

    // The walk and the matcher are the whole guard. If either silently returned
    // nothing — a moved directory, a renamed class convention — `offenders`
    // would be empty and this file would report success while checking nothing.
    // That is the failure mode a guard cannot self-report, so it is asserted.
    const walked = [...sourceFiles("components"), ...sourceFiles("app")]
    const severityRelated = walked.filter((p) => /gap|severity|urgency/i.test(readFileSync(p, "utf-8")))

    it("the walk and the pre-filter both find files (the scan is not vacuous)", () => {
        expect(walked.length, "sourceFiles() found nothing — did a directory move?").toBeGreaterThan(200)
        expect(
            severityRelated.length,
            "no file mentions gap/severity/urgency — the pre-filter is now excluding everything"
        ).toBeGreaterThan(10)
    })

    it("the matcher fires on a hand-rolled map, and not on a compliant surface", () => {
        // A guard never shown to fail is not a guard. This is the shape that
        // multiplied: all four severity words plus a colour class keyed by them.
        const handRolled = `
            const TONE = {
                critical: "bg-red-100 text-red-800",
                high: "bg-orange-100 text-orange-800",
                medium: "bg-amber-100 text-amber-800",
                low: "bg-slate-100 text-slate-800",
            }
        `
        expect(handRollsSeverityPresentation(handRolled)).toBe(true)

        // Names the words but presents nothing — logic, not a colour map.
        const logicOnly = `
            const ORDER = ["critical", "high", "medium", "low"] as const
            export const worst = (a: string, b: string) => (ORDER.indexOf(a as any) < ORDER.indexOf(b as any) ? a : b)
        `
        expect(handRollsSeverityPresentation(logicOnly)).toBe(false)

        // Presents colour but is not about severity at all.
        const unrelated = `const BADGE = "bg-blue-100 text-blue-800"`
        expect(handRollsSeverityPresentation(unrelated)).toBe(false)
    })

    it("every severity surface goes through the primitive, or is listed as debt", () => {
        expect(
            offenders,
            "These render a gap severity with their own label/colour map. Use " +
                "describeSeverity() from lib/gaps/severity-display.ts and render its " +
                "caveatKey, or add the file to KNOWN_BYPASSES with a reason:\n  " +
                `${offenders.join("\n  ")}`
        ).toEqual([])
    })

    it("the debt list does not silently grow", () => {
        // A ceiling, so the list can only shrink without someone noticing. Drop
        // it as surfaces migrate; never raise it to make a new screen pass.
        expect(KNOWN_BYPASSES.size).toBeLessThanOrEqual(9)
    })

    it("every surface that names a severity says what the word is worth", () => {
        const silent = CAVEAT_REQUIRED.filter((path) => {
            const source = readFileSync(join(process.cwd(), path), "utf-8")
            return !/<SeverityCaveat\b/.test(source)
        }).sort()

        expect(
            silent,
            "These print a severity word to a person while Gate 3b (underwriter " +
                "validation of the thresholds and labels) is still open. Render " +
                "<SeverityCaveat /> from components/gaps/SeverityCaveat.tsx:\n  " +
                `${silent.join("\n  ")}`
        ).toEqual([])
    })

    it("per-definition validation drops the caveat for that rule only", () => {
        // Gate 3b arrives a branch at a time. A global boolean could only say
        // "none of it" or "all of it", so the honest setting was "none" forever —
        // and every screen kept apologising for rules that may have been fine.
        const unvalidated = describeSeverityForDefinition("high", { severityValidatedAt: null })
        expect(unvalidated.caveatKey).toBe(SEVERITY_CAVEAT_KEY)

        const validated = describeSeverityForDefinition("high", {
            severityValidatedAt: new Date("2026-09-01"),
        })
        expect(validated.caveatKey).toBeNull()
        // Everything else about the presentation is unchanged — validation is a
        // statement about the THRESHOLD, not a licence to restyle the label.
        expect(validated.severity).toBe(unvalidated.severity)
        expect(validated.labelKey).toBe(unvalidated.labelKey)
        expect(validated.rank).toBe(unvalidated.rank)
    })

    it("fails safe: no definition, or a definition it cannot read, still gets the caveat", () => {
        expect(isSeverityValidated(null)).toBe(false)
        expect(isSeverityValidated(undefined)).toBe(false)
        expect(isSeverityValidated({})).toBe(false)
        expect(describeSeverityForDefinition("critical", null).caveatKey).toBe(SEVERITY_CAVEAT_KEY)
    })

    it("the caveat disappears the day an underwriter signs off, everywhere at once", () => {
        // The reason this is one component and not four pasted <p> tags: sign-off
        // must be a one-line change, or it will be done unevenly and some screen
        // will keep apologising for a scale that no longer needs it.
        const caveat = readFileSync(
            join(process.cwd(), "components/gaps/SeverityCaveat.tsx"),
            "utf-8"
        )
        expect(caveat).toMatch(/if \(SEVERITY_UNDERWRITER_VALIDATED\) return null/)
        expect(
            SEVERITY_UNDERWRITER_VALIDATED,
            "Gate 3b is a HUMAN gate. If this is now true, an underwriter must have " +
                "signed off on the thresholds AND the labels — not a developer."
        ).toBe(false)
    })
})
