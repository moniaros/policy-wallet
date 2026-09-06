/**
 * PW-CONTENT-01 Goal 3 (D-C3) — the relationship index renders nowhere.
 *
 * «Δείκτης σχέσης πελάτη 90/100» combined counts with coefficients
 * (40/20/20/20), recency thresholds (7/30/90/180 days) and colour bands with
 * verdict labels, and read «Καλή» for a customer whose every policy had
 * expired and for one whose every analysis had failed. A number out of a total
 * renders only with its denominator and counting basis; being a separate code
 * path from the protection score did not make it a different kind of claim.
 *
 * Enumerated from disk: no .tsx under app/ or components/ reads a
 * relationship score, the module is gone, and the dead copy keys with it.
 */
import { describe, expect, it } from "vitest"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

function walk(dir: string): string[] {
    if (!existsSync(dir)) return []
    return readdirSync(dir).flatMap((name) => {
        const p = join(dir, name)
        if (statSync(p).isDirectory()) return name === "node_modules" ? [] : walk(p)
        return /\.(tsx?)$/.test(p) ? [p] : []
    })
}
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
const INDEX = /\bhealthScore\b|RelationshipScore|agent\/health-score/

export function rendersRelationshipIndex(src: string): boolean { return INDEX.test(stripComments(src)) }

describe("Goal 3 — the relationship index renders nowhere", () => {
    const files = [...walk("app"), ...walk("components"), ...walk("lib/agent"), ...walk("lib/services")]
    it("the module is gone", () => { expect(existsSync("lib/agent/health-score.ts")).toBe(false) })
    it("no file reads or renders it (enumerated from disk)", () => {
        const offenders = files.filter((f) => rendersRelationshipIndex(readFileSync(f, "utf8")))
        expect(offenders).toEqual([])
    })
    it("the dead copy is gone in both languages", () => {
        for (const p of ["lib/i18n/translations/el.ts", "lib/i18n/translations/en.ts"]) {
            const src = readFileSync(p, "utf8")
            expect(src).not.toMatch(/healthScoreHint|Δείκτης σχέσης|Relationship index|Client relationship"/)
        }
        expect(readFileSync("lib/i18n/role-copy.ts", "utf8")).not.toMatch(/tableHealth/)
    })
    it("the probe turns the scan red", () => {
        expect(rendersRelationshipIndex(readFileSync("tests/fixtures/guard-probes/relationship-index-render.tsx.txt", "utf8"))).toBe(true)
    })
})
