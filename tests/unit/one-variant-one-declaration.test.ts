import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * one-variant-one-declaration — no element sets the same property twice under
 * the same variant.
 *
 * Found while sweeping the colour literals: eleven elements carried two
 * `dark:text-…` classes at once. Three of them named DIFFERENT colours, and the
 * one an author would expect to win does not reliably do so — Tailwind emits
 * both at equal specificity, so stylesheet order decides, not class order. The
 * rendered colour is therefore whichever Tailwind happened to sort later, which
 * is not a thing anyone chose. The other eight were exact duplicates: harmless
 * to render, and the reason the conflicting ones survived review, because the
 * shape stops looking like a mistake once it is common.
 *
 * Eight of the eleven were repaired as a side effect of the token sweep (the
 * token flips per theme, so the `dark:` twin was deleted). The remaining three
 * used palette classes with no hex literal, so no colour rule would ever have
 * reached them. Hence a guard on the SHAPE rather than on the colours.
 *
 * UNIVERSE. Every `.tsx` under the scope roots, enumerated from disk, same
 * roots as `design-token-debt.test.ts`. Each root is asserted to exist so a
 * rename fails loudly instead of shrinking the universe to nothing.
 *
 * WHAT COUNTS AS THE SAME SLOT: identical variant chain + identical property
 * prefix. `dark:text-x` and `dark:text-y` collide. `dark:text-x` and
 * `dark:hover:text-y` do not — different variant chains. `dark:text-x` and
 * `dark:bg-y` do not — different properties. `text-x dark:text-y` does not —
 * that is the entire point of a variant.
 *
 * WHAT IT DOES NOT SEE, stated rather than implied:
 *   - classes assembled across separate string literals (a ternary's two arms
 *     are two strings, and are meant to be alternatives, not a collision);
 *   - classes composed at runtime through `cn()` from variables;
 *   - `.ts` files, and any surface outside the roots.
 * A collision spread across two `cn()` arguments is real and invisible here.
 * Recorded, not silently implied to be covered.
 *
 * PROBE. `tests/unit/fixtures/duplicate-variant-probe.tsx` plants each caught
 * shape and each near-miss; the PROBE block asserts the exact multiset.
 */

const SCOPE_ROOTS = [
    'app/(protected)',
    'components/branches',
    'components/dashboard',
    'components/gaps',
    'components/landing',
    'components/wallet',
]

const PROBE = 'tests/unit/fixtures/duplicate-variant-probe.tsx'

function walkTsx(roots: string[]): string[] {
    const out: string[] = []
    const visit = (dir: string) => {
        for (const entry of readdirSync(dir)) {
            if (entry === 'node_modules' || entry.startsWith('.')) continue
            const full = join(dir, entry)
            if (statSync(full).isDirectory()) visit(full)
            else if (full.endsWith('.tsx')) out.push(full)
        }
    }
    for (const root of roots) visit(root)
    return out.sort()
}

/**
 * The colour vocabulary, ENUMERATED from app/globals.css plus Tailwind's own
 * palette shape. This is what separates a collision from a coincidence:
 * `text-sm` and `text-slate-600` are both `text-…` and are not the same slot,
 * because one is a font size. Comparing every `text-` class would make this
 * guard fire on almost every element in the product, which is how a guard gets
 * deleted instead of fixed.
 */
const THEME_COLOURS: ReadonlySet<string> = new Set(
    [...readFileSync('app/globals.css', 'utf-8').matchAll(/^\s*--color-([a-z0-9-]+)\s*:/gim)].map((m) => m[1])
)
const BARE_COLOUR_WORDS = new Set(['white', 'black', 'transparent', 'current', 'inherit'])
/** Tailwind palette shape: `slate-600`, `amber-200/40`. */
const PALETTE = /^[a-z]+-\d{2,3}(\/\d{1,3})?$/

function isColourValue(value: string): boolean {
    const bare = value.replace(/\/\d{1,3}$/, '')
    return BARE_COLOUR_WORDS.has(bare) || PALETTE.test(value) || THEME_COLOURS.has(bare)
}

/** `dark:hover:text-white` -> slot `dark:hover:text`, value `white`. */
function slotOf(cls: string): { slot: string; value: string } | null {
    const m = cls.match(/^((?:[a-z0-9-]+:)*)(bg|text|border|ring|outline|fill|stroke|decoration|accent|caret|placeholder)-(.+)$/)
    if (!m) return null
    const [, variants, prop, value] = m
    if (!isColourValue(value)) return null
    return { slot: `${variants}${prop}`, value }
}

/** Collisions inside ONE class string. Returns human-readable descriptions. */
export function collisionsIn(classString: string): string[] {
    const seen = new Map<string, string[]>()
    for (const cls of classString.split(/\s+/).filter(Boolean)) {
        if (cls.includes('${') || cls.includes('[')) continue // interpolation / arbitrary value
        const parsed = slotOf(cls)
        if (!parsed) continue
        const list = seen.get(parsed.slot) ?? []
        list.push(parsed.value)
        seen.set(parsed.slot, list)
    }
    const out: string[] = []
    for (const [slot, values] of seen) {
        if (values.length > 1) out.push(`${slot}-{${values.join(' | ')}}`)
    }
    return out
}

function scan(files: string[]): { file: string; detail: string; snippet: string }[] {
    const found: { file: string; detail: string; snippet: string }[] = []
    for (const file of files) {
        const src = readFileSync(file, 'utf8')
        for (const m of src.matchAll(/["'`]([^"'`\n]{4,600})["'`]/g)) {
            const chunk = m[1]
            if (!/\s/.test(chunk)) continue
            for (const detail of collisionsIn(chunk)) {
                found.push({ file, detail, snippet: chunk.trim().slice(0, 120) })
            }
        }
    }
    return found
}

describe('no element sets the same property twice under the same variant', () => {
    it('every scope root exists — a rename must fail loudly, not silently', () => {
        for (const root of SCOPE_ROOTS) {
            expect(statSync(root).isDirectory(), `${root} is missing from the scan`).toBe(true)
        }
    })

    const files = walkTsx(SCOPE_ROOTS)

    it('the scan sees the tree', () => {
        expect(files.length).toBeGreaterThan(150)
    })

    it('finds no collisions', () => {
        const found = scan(files)
        const report = found.map((f) => `${f.file}\n      ${f.detail}\n      in: ${f.snippet}`)
        expect(found, `\n  - ${report.join('\n  - ')}\n`).toEqual([])
    })
})

describe('PROBE — the guard has been seen to fire, and to stay quiet', () => {
    const probe = readFileSync(PROBE, 'utf8')
    const hits = scan([PROBE]).map((h) => h.detail).sort()

    it('catches exactly the three planted collisions and nothing else', () => {
        expect(hits).toEqual([
            'dark:bg-{black}'.replace('dark:bg-{black}', 'dark:text-{amber-200 | amber-100}'),
            'dark:text-{slate-400 | slate-400}',
            'sm:bg-{red-100 | red-200}',
        ].sort())
    })

    it('the near-misses are really in the fixture, so the silence means something', () => {
        expect(probe).toContain('dark:hover:text-white')
        expect(probe).toContain('dark:text-white dark:bg-black dark:border-white')
    })

    it('a different variant chain is not a collision', () => {
        expect(collisionsIn('text-slate-600 dark:text-slate-400 dark:hover:text-white')).toEqual([])
    })

    it('a different property under the same variant is not a collision', () => {
        expect(collisionsIn('dark:text-white dark:bg-black')).toEqual([])
    })

    it('but the same slot twice is, even when the values agree', () => {
        expect(collisionsIn('dark:text-slate-400 dark:text-slate-400')).toEqual(['dark:text-{slate-400 | slate-400}'])
    })
})
