import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join, relative } from "node:path"

/**
 * grafi-app-no-raw-hex — the application tier's colour law (§5, G2).
 *
 * The legacy surface carries a RATCHET (design-token-debt.test.ts: a listed
 * debt that may only shrink). The application tier starts clean and stays
 * clean: ZERO colour literals — hex, rgb()/rgba(), hsl(), oklch() — in the
 * design system, the app component tree and the rebuilt routes. Colour is a
 * token role or it does not exist.
 *
 * The universe is enumerated from disk (a root that does not exist yet is
 * simply empty — the rebuilt routes join as they land), and the probe fixture
 * proves every detector fires.
 */
const ROOT = process.cwd()
const SCOPE_ROOTS = [
    "src/design-system",
    "components/app",
    "app/grafi-app.css",
    "app/(protected)/home",
    "app/(protected)/see",
    "app/(protected)/policies",
    "app/(protected)/money",
    "app/(protected)/updates",
    "app/(protected)/adviser",
    "app/(protected)/me",
    "app/(protected)/add",
    "app/(protected)/life-event",
    "app/(protected)/welcome",
]
const FILE_RE = /\.(tsx|ts|css)$/

function walk(path: string, out: string[] = []): string[] {
    let st
    try { st = statSync(path) } catch { return out }
    if (st.isFile()) { if (FILE_RE.test(path)) out.push(path); return out }
    for (const name of readdirSync(path)) {
        if (name === "node_modules" || name.startsWith(".")) continue
        walk(join(path, name), out)
    }
    return out
}

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

/** Every colour literal in a source text, as `kind:literal`. */
export function findColourLiterals(source: string): string[] {
    const src = stripComments(source)
    const found: string[] = []
    // 6/8-digit hex anywhere; 3/4-digit hex only where a CSS value ends
    // (`]`, quote, `;`, `)`, `,`) so prose like «issue #164» is not a colour.
    for (const m of src.matchAll(/#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6})(?![0-9a-zA-Z_-])/g)) found.push(`hex:${m[0].toLowerCase()}`)
    for (const m of src.matchAll(/#[0-9a-fA-F]{3,4}(?=[\]"';,)])/g)) found.push(`hex:${m[0].toLowerCase()}`)
    // Colour functions, including inside Tailwind arbitrary values where an
    // underscore precedes them (`shadow-[0_1px_rgb(...)]`) — `\b` would miss those.
    for (const m of src.matchAll(/(?<![A-Za-z0-9])(rgba?|hsla?|oklch|oklab|lab|lch)\(/g)) found.push(`fn:${m[1]}(`)
    return found
}

describe("the application tier has no colour literal", () => {
    it("enumerates its universe from disk", () => {
        const files = SCOPE_ROOTS.flatMap((r) => walk(join(ROOT, r)))
        expect(files.length).toBeGreaterThan(5)
    })

    it("finds zero hex / rgb / hsl / oklch literals in src/design-system, components/app and the rebuilt routes", () => {
        const offenders: string[] = []
        for (const root of SCOPE_ROOTS) {
            for (const file of walk(join(ROOT, root))) {
                const hits = findColourLiterals(readFileSync(file, "utf-8"))
                if (hits.length) offenders.push(`${relative(ROOT, file)}: ${hits.join(", ")}`)
            }
        }
        expect(offenders, "colour literals in the application tier — use a semantic role (bg-surface-*, text-fg-*, bg-state-*, shadow-g-*)").toEqual([])
    })
})

describe("PROBE — every detector fires", () => {
    it("sees the planted hex, rgb, hsl and oklch literals", () => {
        const found = findColourLiterals(readFileSync(join(ROOT, "tests/unit/fixtures/grafi-app-hex-probe.tsx"), "utf-8"))
        expect(found.sort()).toEqual(["fn:hsl(", "fn:oklch(", "fn:rgb(", "hex:#29685b", "hex:#fff"].sort())
    })
    it("ignores a comment and a prose fragment that is not a colour", () => {
        expect(findColourLiterals("// #29685B in a comment\nconst x = 'issue #164 closed'")).toEqual([])
        expect(findColourLiterals("className=\"text-[#fff]\"")).toEqual(["hex:#fff"])
    })
})
