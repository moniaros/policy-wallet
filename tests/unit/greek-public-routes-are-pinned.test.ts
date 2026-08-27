/**
 * A Greek public page must PIN its locale. Greek is not allowed to be merely
 * the default.
 *
 * `LanguageProvider` (contexts/LanguageContext.tsx) initialises to 'el' and then
 * an effect overwrites it from `localStorage`. A page that does not pin its
 * locale therefore renders in whatever language THAT DEVICE last chose — and
 * `localStorage` is per-device, which is why this surfaces as "English on my
 * phone, Greek on my laptop" and looks like a mobile bug when nothing in the
 * locale path is device-dependent at all.
 *
 * It is also unrecoverable from inside the page: `PublicHeader` computes the ΕΛ
 * link's href as the Greek path, which on an unpinned Greek route is the page
 * you are already on. The toggle navigates nowhere and localStorage still says
 * 'en'. Commit 0a4b2bd9 fixed exactly this for the legal pages ("the Greek legal
 * pages were serving English… the ΕΛ toggle was a no-op on all four"); /guides,
 * /lexiko, /pricing, /company and /solutions/agents never got that treatment and
 * shipped the same defect to production.
 *
 * THE UNIVERSE IS DERIVED FROM THE FILESYSTEM, not a list. Every English public
 * page implies a Greek twin, and every Greek twin of a bilingual pair must pin.
 * A new bilingual route is covered the day it is written.
 */
import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync, existsSync } from "node:fs"
import { join } from "node:path"

const PUBLIC_ROOT = "app/(public)"
const EN_ROOT = join(PUBLIC_ROOT, "en")

/** Every page.tsx under a root, returned as paths relative to that root. */
function pagesUnder(root: string): string[] {
    if (!existsSync(root)) return []
    const walk = (dir: string): string[] =>
        readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
            const full = join(dir, entry.name)
            if (entry.isDirectory()) return walk(full)
            return entry.name === "page.tsx" ? [full] : []
        })
    return walk(root).map((p) => p.slice(root.length + 1))
}

/**
 * The three ways a Greek page may pin its locale. All three exist in the repo
 * already; this guard ratifies them rather than inventing a fourth.
 *
 *  1. <StaticLanguageProvider language="el" …>  — app/(public)/product/page.tsx
 *  2. an explicit locale/language="el" prop     — app/(public)/page.tsx, /needs, /trust
 *  3. server-side resolveLegalLanguage()        — app/(public)/privacy/page.tsx
 */
const PINS: ReadonlyArray<{ name: string; pattern: RegExp }> = [
    { name: "StaticLanguageProvider", pattern: /<StaticLanguageProvider\b[^>]*language=(?:"el"|\{"el"\})/ },
    { name: "locale prop", pattern: /\b(?:locale|language)=(?:"el"|\{"el"\}|'el')/ },
    { name: "resolveLegalLanguage", pattern: /\bresolveLegalLanguage\b/ },
]

/**
 * A page that renders no JSX has no locale to pin. `/for-agents` is a bare
 * `redirect()` — it emits nothing a language provider could govern, so requiring
 * it to pin would be a rule about a rendering that does not exist.
 */
function rendersNothing(source: string): boolean {
    return !/<[A-Za-z>]/.test(source)
}

function pinnedBy(source: string): string | null {
    return PINS.find((p) => p.pattern.test(source))?.name ?? null
}

describe("Greek public routes pin their locale", () => {
    const enPages = pagesUnder(EN_ROOT)

    it("the scan actually sees the English route tree", () => {
        // A guard whose universe silently empties passes for ever. This is the
        // floor: /en carried 30 pages when the rule was written.
        expect(enPages.length).toBeGreaterThan(20)
    })

    it("every Greek twin of a bilingual public route pins its locale to Greek", () => {
        const unpinned: string[] = []
        let checked = 0

        for (const rel of enPages) {
            const greek = join(PUBLIC_ROOT, rel)
            // An English-only page (no Greek twin) is out of scope: there is no
            // Greek rendering for localStorage to hijack.
            if (!existsSync(greek)) continue
            const src = readFileSync(greek, "utf-8")
            if (rendersNothing(src)) continue
            checked++
            if (!pinnedBy(src)) {
                unpinned.push("/" + rel.replace(/\/page\.tsx$/, ""))
            }
        }

        expect(checked).toBeGreaterThan(20)
        expect(unpinned, `Greek public routes that render in whatever language the DEVICE last chose:\n  ${unpinned.join("\n  ")}\n\nPin each one — see app/(public)/product/page.tsx:17.`).toEqual([])
    })
    /**
     * The probe. A guard that cannot be shown to go red is not a guard — three
     * guards in this repo passed while what they protect was broken. These two
     * fixtures are committed beside the test: one is the exact shape /guides
     * shipped to production with, the other is the corrected shape.
     */
    it("detects the unpinned shape, and accepts each ratified pin", () => {
        const fixture = (name: string) =>
            readFileSync(join("tests/fixtures/greek-route-pinning", name), "utf-8")

        expect(pinnedBy(fixture("unpinned.page.tsx.txt"))).toBeNull()
        expect(pinnedBy(fixture("pinned.page.tsx.txt"))).toBe("StaticLanguageProvider")

        // All three ratified patterns must be recognised, or fixing a page the
        // approved way would still fail this guard.
        expect(pinnedBy('<LandingClient locale="el" />')).toBe("locale prop")
        expect(pinnedBy("const lang = resolveLegalLanguage(sp)")).toBe("resolveLegalLanguage")

        // ...and English must NOT count as pinning a Greek route.
        expect(pinnedBy('<StaticLanguageProvider language="en" counterpartPath="/guides">')).toBeNull()
    })
})
