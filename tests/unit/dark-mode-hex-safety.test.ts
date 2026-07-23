import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

function tsx(dir: string, acc: string[] = []): string[] {
    for (const e of readdirSync(dir)) {
        const p = join(dir, e)
        if (statSync(p).isDirectory()) tsx(p, acc)
        else if (p.endsWith('.tsx')) acc.push(p)
    }
    return acc
}

// Authenticated, dark-capable surface only. Landing/marketing is light-only by
// design and legitimately hardcodes its palette.
const FILES = [...tsx('components'), ...tsx('app/(protected)')].filter(
    (f) => !/\/landing\/|\/public|marketing|\.test\./.test(f)
)

const DARK_TEXT = /#(0f172a|1a2420|111111|1e293b|0f1729)/i
const LIGHT_BG = /#(fff(fff)?|f8fafc|f9fafb)/i

/**
 * The product carries ~900 hardcoded hex values (token debt). An audit found
 * they cause NO dark-mode bug — every hardcoded DARK text sits inside a `dark:`
 * variant or on a fixed mint/primary background, and no hardcoded LIGHT
 * background lacks a `dark:` override. This keeps that true: a dark text/light
 * bg hardcoded WITHOUT a dark override would go invisible when the theme flips.
 */
describe('hardcoded hex does not break dark mode', () => {
    it('no dark hardcoded text without a dark: override', () => {
        const offenders: string[] = []
        for (const f of FILES) {
            const src = readFileSync(f, 'utf-8')
            for (const m of src.matchAll(/className="([^"]*text-\[(#[0-9A-Fa-f]{6})\][^"]*)"/g)) {
                const [, cls, hex] = m
                if (!DARK_TEXT.test(hex)) continue
                if (/dark:[\w:-]*text-/.test(cls)) continue // dark text override (allows focus:/hover: infixes)
                // Dark text on a fixed brand fill (mint/primary) is correct in
                // both themes because the background never flips.
                if (/\bbg-mint\b|\bbg-primary\b/.test(cls)) continue
                offenders.push(`${f}: ${cls.slice(0, 70)}`)
            }
        }
        expect(offenders, `dark text with no dark override:\n${offenders.join('\n')}`).toEqual([])
    })

    it('no light hardcoded background without a dark: override', () => {
        const offenders: string[] = []
        for (const f of FILES) {
            const src = readFileSync(f, 'utf-8')
            for (const m of src.matchAll(/className="([^"]*bg-\[(#[0-9A-Fa-f]{3,6})\][^"]*)"/g)) {
                const [, cls, hex] = m
                if (!LIGHT_BG.test(hex)) continue
                if (/dark:[\w:-]*bg-/.test(cls)) continue
                offenders.push(`${f}: ${cls.slice(0, 70)}`)
            }
        }
        expect(offenders, `light bg with no dark override:\n${offenders.join('\n')}`).toEqual([])
    })
})
