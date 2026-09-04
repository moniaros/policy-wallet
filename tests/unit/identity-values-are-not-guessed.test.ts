import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { globSync } from "glob"

/**
 * `Math.random().toString(36).substring(7)` is not an identifier.
 *
 * It returns fewer than four characters roughly once in 4,800 draws, and can in
 * principle return an empty string — `Math.random()` occasionally lands on a
 * value whose base-36 form is short enough that there is nothing left after
 * index 7. Whether that matters depends entirely on what the value is used for,
 * and in both places it was used here it was matched on rather than merely
 * rendered:
 *
 * - **Batch upload.** The id is the React key AND the handle that
 *   `handleRemove` and `handleUpdatePolicy` match on. Two rows sharing one means
 *   deleting a document deletes someone else's, or a policy number typed into
 *   one file is submitted against another.
 * - **Policy placeholders.** `PENDING-xxxxx` is written to the database, and the
 *   duplicate check matches on (ownerUserId, policyNumber, insurerName). Every
 *   placeholder shares the insurer `AI Analyzing...`, so two colliding suffixes
 *   look like the same policy and raise a merge request between two genuinely
 *   different ones — which, if approved, loses a policy.
 *
 * A batch upload makes those uploads concurrent by design, which is exactly the
 * condition the collision needs.
 */

/**
 * `substring(2, 9)` and friends take a FIXED-WIDTH slice and are safe; the
 * open-ended `substring(7)` / `slice(7)` is the one whose length depends on
 * the value it happened to draw. Comments are stripped by the caller.
 */
const OPEN_ENDED_RANDOM_SLICE =
    /Math\.random\(\)\s*\.toString\(\s*36\s*\)\s*\.(?:substring|slice|substr)\(\s*\d+\s*\)/g

function openEndedRandomSlices(code: string): number[] {
    const lines: number[] = []
    for (const match of code.matchAll(OPEN_ENDED_RANDOM_SLICE)) {
        lines.push(code.slice(0, match.index).split("\n").length)
    }
    return lines
}

describe("random values that are matched on come from a real generator", () => {
    const FILES = globSync("{app,lib,components}/**/*.{ts,tsx}", {
        ignore: ["**/node_modules/**", "**/*.test.*"],
    })

    it("scans a realistic number of files", () => {
        expect(FILES.length).toBeGreaterThan(300)
    })

    it("nothing builds an identifier by slicing Math.random()", () => {
        const offenders: string[] = []

        for (const file of FILES) {
            const src = readFileSync(file, "utf-8")
            const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
            for (const line of openEndedRandomSlices(code)) {
                offenders.push(`${file}:${line}`)
            }
        }

        expect(
            offenders,
            "An open-ended slice of Math.random().toString(36) has no length\n" +
                "guarantee. Use crypto.randomUUID() where the value is an identity:\n" +
                `  ${offenders.join("\n  ")}`
        ).toEqual([])
    })

    it("the two sites that were matched on now use randomUUID", () => {
        expect(readFileSync("components/wallet/BatchUploadModal.tsx", "utf-8")).toContain(
            "crypto.randomUUID()"
        )
        // The upload path no longer mints its own placeholder: the ONE minter is
        // lib/wallet/policy-identity.ts mintPlaceholderIdentity, which draws the
        // suffix from crypto.randomUUID().
        expect(readFileSync("lib/wallet/policy-identity.ts", "utf-8")).toMatch(
            /\$\{PLACEHOLDER_POLICY_NUMBER_PREFIX\}\$\{crypto\.randomUUID\(\)/
        )
        expect(readFileSync("lib/services/policy.service.ts", "utf-8")).not.toMatch(/PENDING-\$\{/)
    })
})

describe("the failure mode is real, not theoretical", () => {
    it("the old expression really does produce unusably short values", () => {
        // Demonstrated rather than asserted from memory: if this ever stops
        // being true the guard above can be relaxed on evidence.
        let short = 0
        const DRAWS = 200_000
        for (let i = 0; i < DRAWS; i += 1) {
            if (Math.random().toString(36).substring(7).length < 4) short += 1
        }
        expect(short, "no short draws in 200k — re-examine the premise").toBeGreaterThan(0)
    })

    it("randomUUID does not have the problem", () => {
        for (let i = 0; i < 1_000; i += 1) {
            expect(crypto.randomUUID()).toHaveLength(36)
        }
        // And the 8-char slice used for the policy placeholder is fixed-width.
        const slices = new Set(
            Array.from({ length: 5_000 }, () => crypto.randomUUID().slice(0, 8).toUpperCase())
        )
        expect(slices.size).toBeGreaterThan(4_990)
        for (const s of slices) expect(s).toHaveLength(8)
    })
})

/**
 * RED-PROOF (Phase 6 guard audit): the slice matcher against the AUTHENTIC
 * pre-fix expressions — BatchUploadModal's row id and PolicyService's
 * `PENDING-…` placeholder both built identity from
 * `Math.random().toString(36).substring(7)` — and the fixed-width or
 * UUID shapes that must stay silent.
 */
describe("the slice matcher is proven on the authentic expressions", () => {
    it("flags the open-ended slices that shipped", () => {
        expect(openEndedRandomSlices("const id = Math.random().toString(36).substring(7)")).toHaveLength(1)
        expect(
            openEndedRandomSlices("policyNumber: `PENDING-${Math.random().toString(36).substring(7).toUpperCase()}`,")
        ).toHaveLength(1)
        expect(openEndedRandomSlices("const key = Math.random().toString(36).slice(2)")).toHaveLength(1)
    })

    it("stays silent on fixed-width slices and randomUUID", () => {
        expect(openEndedRandomSlices("const id = Math.random().toString(36).substring(2, 9)")).toEqual([])
        expect(openEndedRandomSlices("const id = crypto.randomUUID()")).toEqual([])
        expect(openEndedRandomSlices("policyNumber: `PENDING-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,")).toEqual([])
    })
})
