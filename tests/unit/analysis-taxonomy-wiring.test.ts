/**
 * WP-05/WP-06 — the finalize step actually runs the deterministic layers.
 *
 * The orchestrator's finalize swaps a policy's ENTIRE gap set
 * (`gapInstance.deleteMany` → `createMany`). Before this wiring that swap was
 * built from AI findings alone, which meant two real defects:
 *
 *  1. Every completed deep analysis ERASED the deterministic instances (Green
 *     Card expiry, ENFIA components, earthquake) and nothing in the flow
 *     recreated them — lib/gap-detection.ts only ran from an out-of-band job.
 *  2. Deterministic definitions fell through `getGapDefinitionsForPolicy`'s
 *     description-as-prompt fallback and were RE-ASKED to the model — asking
 *     the AI to re-answer a question the code answers exactly, letting an
 *     unlucky completion overrule the deterministic result.
 *
 * The orchestrator is a 2,700-line service that only runs against a live
 * pipeline, so these are source-level assertions, the same technique the repo
 * uses for route policy and loading coverage: they pin that the calls exist,
 * in the right order, with the right guards. The behavioural halves live in
 * taxonomy-gap-backstop.test.ts (pure logic) and gap-detection's own suites.
 */
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const SOURCE = readFileSync(
    "lib/services/analysis/policy-analysis-orchestrator.service.ts",
    "utf-8"
)

describe("analysis flow runs the deterministic layers", () => {
    it("reads a real orchestrator", () => {
        // Vacuity floor: a moved file would make every check below pass on "".
        expect(SOURCE.length).toBeGreaterThan(50_000)
        expect(SOURCE).toContain("gapInstance.deleteMany")
    })

    it("merges taxonomy backstop findings into the detected gap set", () => {
        expect(SOURCE).toContain('from "./taxonomy-gap-backstop"')
        expect(SOURCE).toContain("taxonomyBackstopGaps({")
        // Fed from the snapshot's two evidence lists, deduped against AI slugs.
        expect(SOURCE).toContain("covered: clarity.coverageSnapshot?.covered ?? []")
        expect(SOURCE).toContain("notCovered: clarity.coverageSnapshot?.notCovered ?? []")
        expect(SOURCE).toContain("existingSlugs: [...detectedGaps.keys()]")
    })

    it("evaluates the seeded deterministic rules before the swap", () => {
        expect(SOURCE).toContain('from "@/lib/gap-detection"')

        const dslCall = SOURCE.indexOf("detectGapsForPolicy({")
        const swap = SOURCE.indexOf("gapInstance.deleteMany")
        expect(dslCall).toBeGreaterThan(-1)
        // Before the delete+create swap, so the swap is a union, not an erase.
        expect(dslCall).toBeLessThan(swap)
    })

    it("evaluates the rules against the post-analysis policy shape", () => {
        const call = SOURCE.slice(
            SOURCE.indexOf("detectGapsForPolicy({"),
            SOURCE.indexOf("alreadyInstanced")
        )
        // Fresh extraction, not the stale row: merged ACORD + parsed dates.
        expect(call).toContain("acordData: mergedAcord")
        expect(call).toContain("startDate: finalStartDate")
        expect(call).toContain("endDate: finalEndDate")
    })

    it("dedupes DSL rows against rows the AI pass already created", () => {
        // Same definition detected by both engines must not violate the
        // (policy_id, gap_definition_id) unique index inside createMany.
        expect(SOURCE).toContain("alreadyInstanced.has(gap.gapDefinitionId)")
    })

    it("no longer re-asks the model questions the code answers exactly", () => {
        const start = SOURCE.indexOf("private async getGapDefinitionsForPolicy")
        expect(start).toBeGreaterThan(-1)
        const fn = SOURCE.slice(start, start + 2500)

        expect(fn).toContain("Boolean(logic?.check)")
        expect(fn).toContain('logic?.source === "ai_clarity_pipeline"')
    })

    it("labels taxonomy definitions as deterministic, not ai_*", () => {
        expect(SOURCE).toContain('ruleId: isTaxonomy ? "coverage_taxonomy" : `ai_${slug}`')
        expect(SOURCE).toContain('{ source: "coverage_taxonomy" }')
    })

    it("keeps the deterministic pass non-fatal", () => {
        // A defective rule row must not fail someone's analysis run.
        expect(SOURCE).toContain(
            "Deterministic gap evaluation failed during finalize (non-blocking)"
        )
    })
})
