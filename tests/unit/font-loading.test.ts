/**
 * WP-17 — fonts are declared once, and never hide text while loading.
 *
 * There were TEN separate `next/font` calls: the root layout's Inter, four more
 * Inter instances with static weights that duplicated it, and four
 * IBM_Plex_Sans instances on auth pages. Each call is its own font loading, so
 * the duplicates re-fetched Inter instead of reusing the root's.
 *
 * Worse, nine of the ten omitted `display: "swap"`. Without it the browser
 * hides text until the font arrives (FOIT) — on the Greek subset, on the auth
 * screens a new user sees first, that is a blank page on a slow connection.
 */
import { readFileSync } from "node:fs"
import { globSync } from "glob"
import { describe, expect, it } from "vitest"

function filesDeclaringFonts(): string[] {
    return [...globSync("app/**/*.{ts,tsx}"), ...globSync("components/**/*.{ts,tsx}")]
        .filter((f) => /from\s*["']next\/font/.test(readFileSync(f, "utf-8")))
}

describe("font declarations", () => {
    it("scans a meaningful number of files", () => {
        // Vacuity floor: a broken glob would make "no scattered fonts" trivially true.
        expect(globSync("app/**/*.tsx").length).toBeGreaterThan(50)
    })

    it("declares every font in one module", () => {
        // lib/fonts.ts is the single owner; nothing under app/ or components/
        // should reach for next/font directly.
        expect(filesDeclaringFonts()).toEqual([])
    })

    it("sets display: swap on every family, so text is never invisible", () => {
        // Comments are stripped first: the doc comment in lib/fonts.ts quotes
        // `display: "swap"` while explaining the bug, and counting that as a
        // declaration would let a family without it pass.
        const src = readFileSync("lib/fonts.ts", "utf-8")
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/\/\/.*$/gm, "")

        const families = [...src.matchAll(/=\s*(\w+)\(\{/g)].map((m) => m[1])
        const swaps = [...src.matchAll(/display:\s*["']swap["']/g)]

        expect(families.length).toBeGreaterThan(0)
        expect(swaps).toHaveLength(families.length)
    })

    it("keeps the Greek subset on every family", () => {
        // The product's default language is Greek; a Latin-only subset renders
        // Greek as tofu.
        const src = readFileSync("lib/fonts.ts", "utf-8")
        const subsetDecls = [...src.matchAll(/subsets:\s*\[([^\]]*)\]/g)].map((m) => m[1])

        expect(subsetDecls.length).toBeGreaterThan(0)
        for (const decl of subsetDecls) {
            expect(decl).toContain("greek")
        }
    })
})
