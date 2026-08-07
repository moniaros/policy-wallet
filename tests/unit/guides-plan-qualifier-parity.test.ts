import { describe, it, expect } from 'vitest'
import { guides } from '@/lib/guides/content'

/**
 * If one locale names the plan a claim depends on, the other must too.
 *
 * The renewal-checklist guide said, in Greek, that PolicyWallet alerts you
 * «από το πλάνο Starter». The English twin dropped the qualifier and promised
 * the alerts outright — on a page whose CTA is "Start free with one policy",
 * where `free` has notifications off. The Greek reader got the truth and the
 * English reader got a promise the product does not keep for them.
 *
 * A pure string-length or word-count comparison would be useless here (Greek
 * runs longer than English throughout). What must match is the COUNT of plan
 * qualifiers: if a paired string mentions Starter or PolicyWallet Plus in one
 * language, its twin has to as well.
 */
const PLAN_MENTIONS = [
    /πλάνο\s+Starter|Starter\s+plan|\bStarter\b/gi,
    /PolicyWallet\s+Plus/gi,
]

function qualifierCount(text: string): number {
    let n = 0
    for (const re of PLAN_MENTIONS) n += (text.match(re) ?? []).length
    return n
}

/** Every {el, en} pair reachable in the guide content, with a path for blame. */
function collectPairs(node: unknown, path: string, out: { path: string; el: string; en: string }[]) {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
        node.forEach((item, i) => collectPairs(item, `${path}[${i}]`, out))
        return
    }
    const rec = node as Record<string, unknown>
    if (typeof rec.el === 'string' && typeof rec.en === 'string') {
        out.push({ path, el: rec.el, en: rec.en })
        return
    }
    for (const [key, value] of Object.entries(rec)) collectPairs(value, `${path}.${key}`, out)
}

describe('guide copy names the same plans in both languages', () => {
    const pairs: { path: string; el: string; en: string }[] = []
    collectPairs(guides, 'guides', pairs)

    it('finds a real body of paired copy', () => {
        expect(pairs.length).toBeGreaterThan(100)
    })

    it('a plan named in one language is named in the other', () => {
        for (const pair of pairs) {
            const el = qualifierCount(pair.el)
            const en = qualifierCount(pair.en)
            if (el === en) continue
            expect
                .soft(
                    en,
                    `${pair.path}: Greek names a plan ${el}x, English ${en}x — one reader is being promised more than the product gives them.\n  EL: ${pair.el}\n  EN: ${pair.en}`
                )
                .toBe(el)
        }
    })
})
