import { describe, it, expect } from 'vitest'
import { en } from '@/lib/i18n/translations/en'
import { el } from '@/lib/i18n/translations/el'

/**
 * Whole-tree el/en key parity.
 *
 * wallet-translation-parity.test.ts pins only six wallet runtime namespaces. But
 * a key added to en.<anything> and forgotten in el ships `undefined` to the
 * reader — and Greek is the DEFAULT language, so the drift hits the PRIMARY
 * audience first, on whatever namespace was missed (dashboard, pricing, auth,
 * agentSettings, branches…). This guards the entire dictionary, both directions.
 *
 * A type mismatch (string in one language, object in the other) also surfaces
 * here: the flattened keysets diverge (`x` vs `x.a`, `x.b`).
 */
function flattenKeys(value: unknown, prefix = ''): string[] {
    if (Array.isArray(value)) return [prefix]
    if (!value || typeof value !== 'object') return [prefix]
    const out: string[] = []
    for (const key of Object.keys(value as Record<string, unknown>)) {
        const next = prefix ? `${prefix}.${key}` : key
        out.push(...flattenKeys((value as Record<string, unknown>)[key], next))
    }
    return out
}

describe('el/en translation dictionaries are in full parity', () => {
    const elKeys = new Set(flattenKeys(el))
    const enKeys = new Set(flattenKeys(en))

    it('sanity: both dictionaries are substantial', () => {
        expect(elKeys.size).toBeGreaterThan(2000)
        expect(enKeys.size).toBeGreaterThan(2000)
    })

    it('every el key exists in en (no English gap)', () => {
        const missing = [...elKeys].filter((k) => !enKeys.has(k)).sort()
        expect(missing, `keys in el but missing in en:\n${missing.join('\n')}`).toEqual([])
    })

    it('every en key exists in el (no Greek gap — the default language)', () => {
        const missing = [...enKeys].filter((k) => !elKeys.has(k)).sort()
        expect(missing, `keys in en but missing in el (renders undefined to default-language users):\n${missing.join('\n')}`).toEqual([])
    })
})
