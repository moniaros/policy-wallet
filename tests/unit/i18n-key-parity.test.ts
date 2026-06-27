import { describe, expect, it } from 'vitest'

import { en } from '@/lib/i18n/translations/en'
import { el } from '@/lib/i18n/translations/el'

/**
 * Full el/en key-parity guard.
 *
 * `wallet-translation-parity.test.ts` only checks a hand-picked list of runtime
 * namespaces, so a key added to (say) `agent`/`admin`/`account` in one language
 * but not the other ships silently — English users see the raw key string. This
 * test asserts the entire keysets match, in both directions.
 *
 * An array value is treated as a leaf (its contents aren't required to align).
 */
function flattenKeys(value: unknown, prefix = ''): string[] {
    if (Array.isArray(value)) return [prefix]
    if (!value || typeof value !== 'object') return [prefix]

    const out: string[] = []
    for (const key of Object.keys(value as Record<string, unknown>)) {
        const nextPrefix = prefix ? `${prefix}.${key}` : key
        out.push(...flattenKeys((value as Record<string, unknown>)[key], nextPrefix))
    }
    return out
}

describe('i18n full key parity', () => {
    const enKeys = new Set(flattenKeys(en))
    const elKeys = new Set(flattenKeys(el))

    it('has no keys present in el but missing from en', () => {
        const missingInEn = [...elKeys].filter((k) => !enKeys.has(k)).sort()
        expect(missingInEn, `Keys in el missing from en:\n${missingInEn.join('\n')}`).toEqual([])
    })

    it('has no keys present in en but missing from el', () => {
        const missingInEl = [...enKeys].filter((k) => !elKeys.has(k)).sort()
        expect(missingInEl, `Keys in en missing from el:\n${missingInEl.join('\n')}`).toEqual([])
    })
})
