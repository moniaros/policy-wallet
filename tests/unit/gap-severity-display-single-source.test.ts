import { describe, it, expect } from "vitest"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import {
    describeSeverity,
    severityRank,
    toGapSeverity,
    SEVERITY_CAVEAT_KEY,
    SEVERITY_UNDERWRITER_VALIDATED,
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
    // These three already show the caveat (`recPriorityNote`) — they still keep
    // their own colour map, so migrating them is tidying, not a truth fix.
    "components/coverage/RecommendationCards.tsx",
    "components/dashboard/home/CoverageGapsWidget.tsx",
    "components/dashboard/home/AttentionList.tsx",

    // These show a severity with NO caveat. Ranked by how loudly.
    // ActionQueueCard announces "N clients with critical gaps" on the agent
    // dashboard; TasksClient renders task rows whose titles were written into
    // the database as the English string "Critical coverage gap"; the rest are
    // per-gap badges and border colours.
    "components/agent/ActionQueueCard.tsx",
    "components/tasks/TasksClient.tsx",
    "app/(protected)/insights/InsightsClient.tsx",
    "components/coverage/InsightCard.tsx",
    "components/coverage/CoverageInsightsClient.tsx",
    "components/agent/tabs/ClientOverviewTab.tsx",
    "components/wallet/policy-detail/PolicyBriefCard.tsx",
    "components/wallet/PolicyReviewScreen.tsx",
])

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
        expect(KNOWN_BYPASSES.size).toBeLessThanOrEqual(11)
    })
})
