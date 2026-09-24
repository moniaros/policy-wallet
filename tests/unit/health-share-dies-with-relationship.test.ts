import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { globSync } from "glob"

/**
 * Prevention brief P2 + CLAUDE.md «an agent's access dies with the
 * relationship — however the relationship ends». A health snapshot is access
 * too. Universe: every non-test source file under app/ and lib/ that ENDS a
 * relationship (writes status terminated/inactive) or REVOKES grants (the
 * required companion of ending or moving one). Each must also revoke or
 * delete health shares.
 */
const ENDS_OR_REVOKES = /status:\s*["'](terminated|inactive)["']|accessGrant\.updateMany\([\s\S]{0,400}?["']revoked["']/
const REVOKES_SHARES = /healthShare\.(updateMany|deleteMany)\(/

export function offendersIn(files: Array<{ path: string; text: string }>): string[] {
    return files
        .filter((f) => ENDS_OR_REVOKES.test(f.text) && /customerRelationship\.update|accessGrant\.updateMany/.test(f.text))
        .filter((f) => !REVOKES_SHARES.test(f.text))
        .map((f) => f.path)
}

describe("a health share dies with the relationship, however it ends", () => {
    const files = [...globSync("app/**/*.{ts,tsx}"), ...globSync("lib/**/*.ts")]
        .filter((p) => !p.includes(".test."))
        .map((path) => ({ path, text: readFileSync(path, "utf-8") }))

    it("sees a real universe (the terminate and transfer paths are in it)", () => {
        const enders = files.filter((f) => ENDS_OR_REVOKES.test(f.text) && /customerRelationship\.update|accessGrant\.updateMany/.test(f.text)).map((f) => f.path)
        expect(enders).toContain("app/(protected)/agent/relationship-actions.ts")
        expect(enders).toContain("lib/services/team.service.ts")
    })

    it("every file that ends a relationship or revokes grants also revokes health shares", () => {
        expect(offendersIn(files)).toEqual([])
    })

    it("probe: a terminate without the share revoke turns the guard red", () => {
        const text = readFileSync("tests/fixtures/guard-probes/health-share-survives-relationship-end.ts.txt", "utf-8")
        expect(offendersIn([{ path: "probe.ts", text }])).toEqual(["probe.ts"])
    })
})
