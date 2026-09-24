import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { globSync } from "glob"

/**
 * Prevention brief: PolicyWallet never infers an individual screening schedule
 * from age, sex or answers, and never turns a self-assessment into a list of
 * examinations to ask for. Universe: every rendered source under app/ and
 * components/. None may import the retired calendar or read `.checks` off a
 * score.
 */
const CALENDAR = /from ["']@\/lib\/wellness\/preventive["']|preventiveItemsFor\(/
// `.checks` is only the risk-derived list where the file reads assessment scores.
const SCORE_CHECKS = /\.checks\b/
const READS_SCORES = /@\/lib\/wellness\/scoring|CategoryScore/

export function offenders(files: Array<{ path: string; text: string }>): string[] {
    return files
        .filter((f) => {
            const code = f.text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
            return CALENDAR.test(code) || (READS_SCORES.test(code) && SCORE_CHECKS.test(code))
        })
        .map((f) => f.path)
}

describe("no individual screening schedule on any surface", () => {
    const files = [...globSync("app/**/*.{ts,tsx}"), ...globSync("components/**/*.{ts,tsx}")]
        .filter((p) => !p.includes(".test."))
        .map((path) => ({ path, text: readFileSync(path, "utf-8") }))

    it("sees the wellness page", () => {
        expect(files.map((f) => f.path)).toContain("app/(protected)/wellness/WellnessClient.tsx")
    })
    it("nothing renders the age/sex calendar or the risk-derived checks", () => {
        expect(offenders(files)).toEqual([])
    })
    it("probe: importing the calendar turns the guard red", () => {
        const text = readFileSync("tests/fixtures/guard-probes/wellness-screening-schedule.tsx.txt", "utf-8")
        expect(offenders([{ path: "probe.tsx", text }])).toEqual(["probe.tsx"])
    })
})
