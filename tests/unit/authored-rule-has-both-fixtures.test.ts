/**
 * PW-CONTENT-01 Goal 5 — authored-rule-has-both-fixtures: every authored rule
 * is traced with at least one document that makes it FIRE and one where it
 * correctly stays quiet. EVERY_SLUG_TRACED (gap-rule-catalogue-trace) proves a
 * rule is traced at all; this proves both directions. Read from the trace
 * source, enumerated over the catalogue; in-test probe.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { AUTHORED_GAP_DEFINITIONS } from "@/lib/gaps/authored-catalogue"

const SRC = readFileSync("tests/unit/gap-rule-catalogue-trace.test.ts", "utf8")
const HELPERS_BOTH_WAYS = /^\s*(\w+): (booleanCoverCases|recordedFieldCases)\(/m // helpers that build both directions by construction

/** The trace block for one slug: from its key to the next top-level key or the object's end. */
export function traceBlock(src: string, slug: string): string | null {
    const start = src.indexOf("\n    " + slug + ":")
    if (start < 0) return null
    const rest = src.slice(start + 1)
    const next = rest.search(/\n {4}[a-z_]+: |\n\}/)
    return next < 0 ? rest : rest.slice(0, next)
}
export function hasBothDirections(block: string): boolean {
    if (/^\s*\w+: (booleanCoverCases|recordedFieldCases)\(/.test(block)) return true
    return /fires: true/.test(block) && /fires: false/.test(block)
}

describe("Goal 5 — authored-rule-has-both-fixtures", () => {
    it("every authored rule has a firing and a quiet fixture", () => {
        const missing = AUTHORED_GAP_DEFINITIONS.map((d) => d.slug).filter((slug) => { const b = traceBlock(SRC, slug); return !b || !hasBothDirections(b) })
        expect(missing).toEqual([])
    })
    it("the probe (a block with only a firing case) turns it red", () => {
        const probe = "\n    probe_only_fires: [\n        { name: 'fires', acord: {}, fires: true },\n    ],\n}\n"
        expect(hasBothDirections(traceBlock(probe, "probe_only_fires")!)).toBe(false)
        expect(HELPERS_BOTH_WAYS.test("    x: booleanCoverCases('a.b', 'x'),")).toBe(true)
    })
})
