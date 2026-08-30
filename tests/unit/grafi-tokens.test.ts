import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdtempSync, cpSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * Grafí token pipeline — three facts held as tests, each proven able to fail:
 *
 *  1. app/grafi.css matches a FRESH generation from tokens/*.json. "Generated —
 *     do not edit" is a comment until something fails on a hand edit; this is
 *     that something.
 *  2. The semantic tier contains no raw hex — roles reference primitive NAMES.
 *     The generator enforces it at build time; the probe below proves the
 *     enforcement fires rather than trusting it.
 *  3. The contrast gate fails the build on a floor miss. Proven by planting the
 *     brief's own original sand-700 (#9A6B21), which measures 4.17:1 on
 *     sand-50 — the value the gate rejected on its first real run.
 *
 * Probes run the real generator in a temp copy of tokens/, so they exercise the
 * shipped script, not a reimplementation.
 */

const GEN = 'scripts/build-tokens.mjs'

function runGeneratorIn(dir: string): { ok: boolean; out: string } {
    try {
        const out = execFileSync('node', [join(process.cwd(), GEN)], { cwd: dir, encoding: 'utf8', stdio: 'pipe' })
        return { ok: true, out }
    } catch (e: any) {
        return { ok: false, out: String(e.stderr ?? e.stdout ?? e.message) }
    }
}

/** A sandbox with tokens/, scripts path resolution and output dirs. */
function sandbox(mutate?: (dir: string) => void): { ok: boolean; out: string; css?: string } {
    const dir = mkdtempSync(join(tmpdir(), 'grafi-'))
    cpSync('tokens', join(dir, 'tokens'), { recursive: true })
    cpSync('scripts/build-tokens.mjs', join(dir, 'scripts/build-tokens.mjs'))
    cpSync('app/grafi.css', join(dir, 'app/grafi.css'))
    // docs dir for the matrix
    cpSync('docs/contrast-matrix.md', join(dir, 'docs/contrast-matrix.md'))
    mutate?.(dir)
    const res = runGeneratorIn(dir)
    let css: string | undefined
    try { css = readFileSync(join(dir, 'app/grafi.css'), 'utf8') } catch { css = undefined }
    rmSync(dir, { recursive: true, force: true })
    return { ...res, css }
}

describe('grafi.css is generated, current, and hex-free at the semantic tier', () => {
    it('the committed CSS matches a fresh generation byte-for-byte', () => {
        const committed = readFileSync('app/grafi.css', 'utf8')
        const fresh = sandbox()
        expect(fresh.ok, fresh.out).toBe(true)
        expect(fresh.css, 'app/grafi.css drifted from tokens/*.json — run `npm run tokens`').toBe(committed)
    })

    it('globals.css imports it, so the tokens actually reach the page', () => {
        expect(readFileSync('app/globals.css', 'utf8')).toContain('@import "./grafi.css"')
    })

    it('the styleguide consumes the core roles — deleting it would silently de-generate the utilities', () => {
        // Tailwind emits @theme-inline utilities ON USE. With no consumer the
        // pipeline looks generated and is inert; /styleguide is the standing
        // consumer, and this pins it.
        const sg = readFileSync('app/(public)/styleguide/page.tsx', 'utf8')
        for (const cls of ['bg-surface-base', 'text-fg-primary', 'bg-state-gap-fill', 'text-state-gap', 'bg-action-primary-bg', 'rounded-g-pill']) {
            expect(sg, `styleguide no longer uses ${cls}`).toContain(cls)
        }
    })

    it('semantic.json holds no raw hex', () => {
        const sem = JSON.parse(readFileSync('tokens/semantic.json', 'utf8'))
        for (const theme of ['light', 'dark'] as const) {
            for (const [role, val] of Object.entries<string>(sem[theme])) {
                expect(val, `semantic.${theme}.${role}`).not.toMatch(/^#/)
            }
        }
    })
})

describe('PROBE — each enforcement has been seen to fire', () => {
    it('a raw hex planted in the semantic tier fails the build', () => {
        const r = sandbox((dir) => {
            const p = join(dir, 'tokens/semantic.json')
            const sem = JSON.parse(readFileSync(p, 'utf8'))
            sem.light['fg-brand'] = '#29685B' // the right colour, the wrong tier
            writeFileSync(p, JSON.stringify(sem))
        })
        expect(r.ok).toBe(false)
        expect(r.out).toMatch(/raw hex .* reference a primitive name/)
    })

    it("the brief's original sand-700 fails the contrast gate — the first real catch, preserved", () => {
        const r = sandbox((dir) => {
            const p = join(dir, 'tokens/primitives.json')
            writeFileSync(p, readFileSync(p, 'utf8').replace('#8D621E', '#9A6B21'))
        })
        expect(r.ok).toBe(false)
        expect(r.out).toMatch(/contrast pair\(s\) below floor/)
    })

    it('an unknown primitive reference fails loudly, not silently', () => {
        const r = sandbox((dir) => {
            const p = join(dir, 'tokens/semantic.json')
            const sem = JSON.parse(readFileSync(p, 'utf8'))
            sem.dark['surface-base'] = 'green-950' // not in the scale
            writeFileSync(p, JSON.stringify(sem))
        })
        expect(r.ok).toBe(false)
        expect(r.out).toMatch(/unknown primitive "green-950"/)
    })
})
