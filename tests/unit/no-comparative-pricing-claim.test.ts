import { describe, expect, it } from "vitest"
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

/**
 * Goal G — no-comparative-pricing-claim (PW-TRANSPARENCY-02).
 *
 * The public surface and the copy store may state a price; they may not claim
 * to be cheaper, lower or best-priced against anyone. Enumerated from disk over
 * the public routes, the landing components, the marketing library and both
 * translation files; the probe pair proves the matcher red and clean.
 */
const ROOTS = ["app/(public)", "components/landing", "components/marketing", "lib/marketing", "lib/i18n/translations", "lib/legal"]
const CLAIM = /φθηνότερ|πιο φθην|πιο οικονομικ[οόή] από|χαμηλότερ(η|ες) τιμ|καλύτερη τιμή|cheaper than|lower price than|lowest price|best price|beat any price|price match/i

function walk(dir: string, out: string[] = []): string[] {
    if (!existsSync(dir)) return out
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry)
        if (statSync(full).isDirectory()) walk(full, out)
        else if (/\.(tsx?|mdx?)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full)
    }
    return out
}

export function comparativePricingClaims(src: string): string[] {
    return src.split("\n").filter((line) => CLAIM.test(line) && !/i18n-hardcoded-ignore|guard: comparative-ok/.test(line)).map((l) => l.trim().slice(0, 120))
}

describe("no comparative pricing claim", () => {
    const files = ROOTS.flatMap((r) => walk(r))

    it("walks a real universe", () => {
        expect(files.length).toBeGreaterThan(50)
    })

    it("finds no comparative claim on the public surface or in the copy store", () => {
        const offenders = files.flatMap((f) => comparativePricingClaims(readFileSync(f, "utf8")).map((l) => `${f}: ${l}`))
        expect(offenders).toEqual([])
    })

    it("PROBE: the matcher fires on the comparative fixture and not on the clean one", () => {
        expect(comparativePricingClaims(readFileSync("tests/fixtures/guard-probes/pricing-comparative.tsx.txt", "utf8")).length).toBeGreaterThan(0)
        expect(comparativePricingClaims(readFileSync("tests/fixtures/guard-probes/pricing-clean.tsx.txt", "utf8"))).toEqual([])
    })
})
