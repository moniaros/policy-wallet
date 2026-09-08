import { describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"

/**
 * Goal G — the inventory is itself guarded (PW-TRANSPARENCY-02).
 *
 * docs/transparency/GUARDS.md maps every defect class to its guards and probes.
 * This test parses that table and fails when:
 *   - a listed guard file, harness metric or probe fixture does not exist;
 *   - a class marked "every commit" has no guard under tests/unit (the path CI runs);
 *   - a class marked "present" lists no probe (a guard without a probe is not a guard);
 *   - one of the five classes the spec names for every commit is missing or not present;
 *   - CI stops running tests/unit.
 */
const DOC = "docs/transparency/GUARDS.md"
const EVERY_COMMIT_REQUIRED = ["score-absence", "under-review-containment", "placeholder-token-leakage", "absence-is-not-reassurance", "no-fabricated-public-count"]

interface Row { cls: string; guards: string[]; probes: string[]; cadence: string; status: string }

function rows(): Row[] {
    const lines = readFileSync(DOC, "utf8").split("\n").filter((l) => l.startsWith("| ") && !l.startsWith("| class") && !l.startsWith("|---"))
    return lines.map((l) => {
        const cells = l.split("|").slice(1, -1).map((c) => c.trim())
        const list = (c: string) => (c === "—" ? [] : c.split(";").map((x) => x.trim()).filter(Boolean))
        return { cls: cells[0], guards: list(cells[1]), probes: list(cells[2]), cadence: cells[3], status: cells[4] }
    })
}

function metricExists(ref: string): boolean {
    const [file, fn] = ref.split("#")
    if (!existsSync(file)) return false
    return !fn || new RegExp(`export (async )?function ${fn}\\b`).test(readFileSync(file, "utf8"))
}

describe("the guard inventory", () => {
    const table = rows()

    it("lists the twenty-two classes of the spec plus the close-out's three (F1 order, F2 dimension scores, F5 citations), the bridge's countdown guard (C-01/C-02) Goal 5's rule-authoring guards and Queue B's effect-told guard", () => {
        expect(table.length).toBe(40)
    })

    it("every listed guard, metric and probe exists on disk", () => {
        const missing: string[] = []
        for (const r of table) {
            for (const g of r.guards) if (!metricExists(g)) missing.push(`${r.cls}: guard ${g}`)
            for (const p of r.probes) {
                if (p.startsWith("in-test")) continue
                const path = p.includes("/") ? p : `tests/fixtures/guard-probes/${p}`
                if (!existsSync(path)) missing.push(`${r.cls}: probe ${p}`)
            }
        }
        expect(missing).toEqual([])
    })

    it("a present class has at least one guard and one probe; an every-commit class has a guard under tests/unit", () => {
        const problems: string[] = []
        for (const r of table) {
            if (r.status.startsWith("not yet applicable")) { if (r.guards.length) problems.push(`${r.cls}: not applicable yet lists guards`); continue }
            if (r.guards.length === 0) problems.push(`${r.cls}: no guard`)
            if (r.probes.length === 0) problems.push(`${r.cls}: no probe — not demonstrated red`)
            if (r.cadence.startsWith("every commit") && !r.guards.some((g) => g.startsWith("tests/unit/"))) problems.push(`${r.cls}: claims every commit without a tests/unit guard`)
        }
        expect(problems).toEqual([])
    })

    it("the five classes the spec runs on every commit are present, unit-level and probed", () => {
        for (const cls of EVERY_COMMIT_REQUIRED) {
            const r = table.find((x) => x.cls.startsWith(cls))
            expect(r, cls).toBeTruthy()
            expect(r!.status.startsWith("present"), `${cls} status`).toBe(true)
            expect(r!.cadence.startsWith("every commit"), `${cls} cadence`).toBe(true)
            expect(r!.guards.some((g) => g.startsWith("tests/unit/")), `${cls} unit guard`).toBe(true)
        }
        expect(readFileSync(".github/workflows/ci.yml", "utf8")).toMatch(/vitest --run tests\/unit/)
    })
})
