import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

function tsxFiles(dir: string, acc: string[] = []): string[] {
    for (const e of readdirSync(dir)) {
        const p = join(dir, e)
        if (statSync(p).isDirectory()) tsxFiles(p, acc)
        else if (p.endsWith('.tsx')) acc.push(p)
    }
    return acc
}
const FILES = [...tsxFiles('app'), ...tsxFiles('components')]

function buttonClasses(): { file: string; cls: string }[] {
    const out: { file: string; cls: string }[] = []
    for (const file of FILES) {
        const src = readFileSync(file, 'utf-8')
        for (const m of src.matchAll(/<button\b[^>]*?className="([^"]*)"/g)) {
            out.push({ file, cls: m[1].split(/\s+/).join(' ') })
        }
    }
    return out
}

/**
 * 151 hand-written buttons used 47 DISTINCT styling signatures for what is
 * nominally one primary button — radius across rounded-lg/-xl/-2xl/-full,
 * weight across medium/bold/black, padding across py-2/2.5/3. The design system
 * already had the answer (.pw-primary-button, pill radius per
 * --pw-radius-button: 9999px); it was simply not adopted.
 */
describe('button consistency', () => {
    it('has no hand-rolled primary fill left', () => {
        const offenders = buttonClasses().filter(
            (b) =>
                /\bbg-primary\b/.test(b.cls) &&
                !/\bbg-primary-soft\b/.test(b.cls) &&
                !b.cls.includes('pw-primary-button')
        )
        expect(
            offenders,
            `hand-rolled primary buttons:\n${offenders.map((o) => `${o.file}: ${o.cls}`).join('\n')}`
        ).toEqual([])
    })

    it('does not reintroduce the retired arc-btn system', () => {
        // .arc-btn* was a second button system at rounded-xl, contradicting the
        // pill rule. Its 9 call sites moved to the canonical pair.
        const inTsx = FILES.filter((f) => readFileSync(f, 'utf-8').includes('arc-btn'))
        expect(inTsx, `arc-btn used in:\n${inTsx.join('\n')}`).toEqual([])
        const css = readFileSync('app/globals.css', 'utf-8')
        expect(css).not.toMatch(/^\s*\.arc-btn/m)
    })

    it('keeps the canonical pair defined with the pill radius', () => {
        const css = readFileSync('app/globals.css', 'utf-8')
        for (const util of ['.pw-primary-button', '.pw-secondary-button']) {
            expect(css, `${util} missing`).toContain(`${util} {`)
        }
        expect(css).toContain('--pw-radius-button: 9999px')
    })

    it('collapsed the signature count for primary buttons', () => {
        const sigs = new Set(
            buttonClasses()
                .filter((b) => b.cls.includes('pw-primary-button'))
                .map((b) =>
                    b.cls
                        .split(' ')
                        .filter((t) => /^(rounded|px-|py-|p-|font-|text-(xs|sm|base|body))/.test(t))
                        .sort()
                        .join(' ')
                )
        )
        // Was 47 distinct appearance signatures across 60 primary buttons.
        expect(sigs.size, `remaining appearance overrides: ${[...sigs]}`).toBeLessThanOrEqual(3)
    })
})

/**
 * 107 controls with a static className used 48 distinct appearance signatures,
 * so no two forms agreed on radius, fill or padding. MASTER.md had documented
 * the gap ("There is no shared Input/Select/Textarea/Label primitive yet") and
 * specified the recipe to match; .pw-input is that recipe, stated once.
 */
describe('form control consistency', () => {
    function controlClasses(): { file: string; cls: string }[] {
        const out: { file: string; cls: string }[] = []
        for (const file of FILES) {
            if (file.includes('ui/form/')) continue
            const src = readFileSync(file, 'utf-8')
            for (const m of src.matchAll(/<(input|select|textarea)\b([^>]*)>/g)) {
                if (/type="(checkbox|radio|hidden|file|range)"/.test(m[2])) continue
                const c = /className="([^"]*)"/.exec(m[2])
                if (c) out.push({ file, cls: c[1].split(/\s+/).join(' ') })
            }
        }
        return out
    }

    it('routes styled controls through .pw-input', () => {
        const offenders = controlClasses().filter(
            (c) =>
                !c.cls.includes('pw-input') &&
                // 3+ appearance tokens means it is restyling the control, not
                // nudging one already on the utility.
                (c.cls.match(/\b(rounded|border|bg-|px-|py-|h-\d)/g) || []).length >= 3
        )
        expect(
            offenders,
            `hand-rolled controls:\n${offenders.map((o) => `${o.file}: ${o.cls}`).join('\n')}`
        ).toEqual([])
    })

    it('defines the canonical control utility with the sanctioned focus ring', () => {
        const css = readFileSync('app/globals.css', 'utf-8')
        expect(css).toContain(':where(.pw-input) {')
        expect(css).toContain(':where(.pw-input-sm) {')
        // MASTER.md names focus:ring-4 focus:ring-primary/10 as the sanctioned ring.
        expect(css).toMatch(/focus:ring-4 focus:ring-primary\/10/)
    })

    it('does not pin a fixed height that would fight the 44px mobile floor', () => {
        const css = readFileSync('app/globals.css', 'utf-8')
        const block = /:where\(\.pw-input\) \{[\s\S]*?\n {2}\}/.exec(css)?.[0] || ''
        expect(block, '.pw-input block not found — did the selector change?').not.toBe('')
        expect(block).not.toMatch(/\bh-\d+\b/)
    })
})

describe('chip toggles', () => {
    it('gives the multi-select chip a 44px target', () => {
        // The base-layer floor covers button/input/select/textarea; the tappable
        // element in a chip is the LABEL, so it needs its own minimum.
        const src = readFileSync('components/ui/form/ChipToggle.tsx', 'utf-8')
        expect(src).toContain('min-h-11')
    })

    it('gives the sr-only checkbox a visible focus ring on the chip', () => {
        const src = readFileSync('components/ui/form/ChipToggle.tsx', 'utf-8')
        expect(src).toContain('has-[:focus-visible]:ring-2')
    })

    it('leaves no hand-rolled sr-only chip toggles behind', () => {
        const offenders = FILES.filter((f) => {
            const s = readFileSync(f, 'utf-8')
            return /className="sr-only"/.test(s) && /cursor-pointer px-3 py-1\.5 rounded-lg border/.test(s)
        })
        expect(offenders, `hand-rolled chips in:\n${offenders.join('\n')}`).toEqual([])
    })
})

/**
 * Tailwind 4 emits globals.css AFTER its own utilities in this setup, so a
 * plain `.pw-input` / `.pw-primary-button` selector beat every per-instance
 * override. The signin icon-inputs carried `pl-9` and still computed
 * padding-left: 24px, putting the mail icon on top of the placeholder. A text
 * search of the stylesheet could not see this — only the rendered page could.
 */
describe('shared recipes must not outrank per-instance overrides', () => {
    const css = readFileSync('app/globals.css', 'utf-8')

    it.each(['.pw-input', '.pw-input-sm', '.pw-primary-button', '.pw-secondary-button'])(
        '%s is declared at zero specificity',
        (util) => {
            expect(css, `${util} must be wrapped in :where()`).toContain(`:where(${util})`)
            // A bare `\n  .pw-input {` declaration would reintroduce the bug.
            expect(css).not.toMatch(new RegExp(`\\n {2}\\${util} \\{`))
        }
    )
})
