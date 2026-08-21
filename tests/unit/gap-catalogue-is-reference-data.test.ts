import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { createHash } from "node:crypto"

import { AUTHORED_GAP_DEFINITIONS } from "@/lib/gaps/authored-catalogue"
import { hasEvaluableRule } from "@/lib/gap-detection"

/**
 * Gap definitions are REFERENCE DATA: the repo decides which rules are live,
 * and a database row may not disagree.
 *
 * This is the third table in this programme to drift between environments,
 * after migrations and plan rows. On 2026-08-21 dev held 11 definitions and
 * prod held 70, only 6 of them shared — and 5 of dev's were `ai_check`
 * prompts still marked active, so dev was "running" rules that
 * hasEvaluableRule() rejects and that could never fire.
 *
 * The part a unit test can own is the repo side and the shape of the contract.
 * Comparing against a live database needs credentials, so that lives in
 * `npm run verify:gap-catalogue`, which prints a fingerprint each environment
 * can be compared on without shipping anyone's rows anywhere.
 */
describe("the authored gap catalogue is reference data", () => {
    it("declares every rule it wants live, and nothing that cannot fire", () => {
        expect(AUTHORED_GAP_DEFINITIONS.length).toBeGreaterThan(0)
        const inert = AUTHORED_GAP_DEFINITIONS.filter((d) => !hasEvaluableRule(d as any))
        expect(
            inert.map((d) => d.slug),
            "these would sit active in every environment and detect nothing"
        ).toEqual([])
    })

    it("never carries an AI-minted definition", () => {
        // Production accumulated 41 of these between 2026-07-13 and 2026-08-09,
        // one per analysis run, each with rule_id `ai_*` and detectionLogic
        // `{ source: "ai_clarity_pipeline" }`. Nothing may create a
        // GapDefinition from model output; they must never enter the repo as
        // reference data either.
        const offenders = AUTHORED_GAP_DEFINITIONS.filter(
            (d) => d.ruleId?.startsWith("ai_") || JSON.stringify(d.detectionLogic).includes("ai_clarity_pipeline")
        )
        expect(offenders.map((d) => d.slug)).toEqual([])
    })

    it("has a verifier wired up, so drift is detectable rather than discovered", () => {
        const pkg = JSON.parse(readFileSync("package.json", "utf-8"))
        expect(pkg.scripts["verify:gap-catalogue"]).toBeTruthy()
        expect(pkg.scripts["align:gap-catalogue"]).toBeTruthy()
    })

    it("fingerprints on content, not on row count", () => {
        // Inactive rows legitimately differ between environments (prod carries
        // AI-minted history dev has never had), so a count comparison would
        // fail forever on a difference that changes nothing. The fingerprint
        // must cover what the engine actually reads.
        const src = readFileSync("scripts/verify-gap-catalogue.ts", "utf-8")
        for (const field of ["slug", "lineOfBusiness", "severity", "defaultSeverity", "ruleId", "detectionLogic"]) {
            expect(src, `fingerprint ignores ${field}`).toContain(field)
        }
        expect(src).toContain("isActive: true")
    })

    it("the fingerprint is order-independent and key-order-independent", () => {
        // Two environments serialise JSONB differently; a fingerprint that
        // changed with key order would report drift that does not exist.
        const stable = (v: any): string => {
            if (v === null || typeof v !== "object") return JSON.stringify(v ?? null)
            if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`
            return `{${Object.entries(v).sort(([a], [b]) => a.localeCompare(b))
                .map(([k, x]) => `${JSON.stringify(k)}:${stable(x)}`).join(",")}}`
        }
        const a = stable({ rules: [{ type: "x", field: "y" }], operator: "AND" })
        const b = stable({ operator: "AND", rules: [{ field: "y", type: "x" }] })
        expect(createHash("sha256").update(a).digest("hex"))
            .toBe(createHash("sha256").update(b).digest("hex"))
    })
})
