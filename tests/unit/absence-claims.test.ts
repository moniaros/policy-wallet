import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * "Not detected" is not "does not exist".
 *
 * The policy detail page told policyholders "Δεν εντοπίστηκαν εξαιρέσεις ή
 * ειδικοί όροι σε αυτό το συμβόλαιο" / "No exclusions or special conditions
 * were detected in this policy" whenever extraction returned nothing. Every
 * insurance policy has exclusions (Εξαίρεση — see policywallet.gr/lexiko); a
 * failed automated read is not evidence of unlimited cover, and someone acting
 * on that belief could discover the difference at claim time. A second
 * exclusions surface carried the same wording, and the coverage-gap empty state
 * read as a clean bill of health.
 *
 * These are absence claims about a regulated contract, so they have to be
 * hedged to what we actually know.
 */

const FILES = ['lib/i18n/translations/el.ts', 'lib/i18n/translations/en.ts'] as const

function value(src: string, key: string): string[] {
    return [...src.matchAll(new RegExp(`${key}:\\s*'([^']*)'`, 'g'))].map((m) => m[1])
}

describe('exclusion absence claims are hedged', () => {
    it.each(FILES)('%s never states a policy has no exclusions', (file) => {
        const src = readFileSync(file, 'utf-8')
        for (const key of ['noExclusionsDetected', 'noExclusionsDesc']) {
            for (const v of value(src, key)) {
                // Must acknowledge the limit of the automated read.
                expect(
                    /δεν σημαίνει ότι δεν υπάρχουν|κάθε ασφαλιστήριο|does not mean there are none|every policy has them/i.test(v),
                    `${file} ${key} asserts absence without hedging: "${v}"`
                ).toBe(true)
            }
        }
    })

    it.each(FILES)('%s says the policy wording prevails over the extraction', (file) => {
        const src = readFileSync(file, 'utf-8')
        const [disclaimer] = value(src, 'exclusionsDisclaimer')
        expect(disclaimer, 'exclusionsDisclaimer missing').toBeTruthy()
        expect(
            /υπερισχύει|prevail/i.test(disclaimer),
            `extraction is presented as authoritative: "${disclaimer}"`
        ).toBe(true)
        expect(
            /ενδέχεται να μην είναι πλήρεις|may be incomplete/i.test(disclaimer),
            `extraction is not flagged as possibly incomplete: "${disclaimer}"`
        ).toBe(true)
    })
})

describe('gap absence claims do not read as a clean bill of health', () => {
    it.each(FILES)('%s scopes "no gaps" to what is known', (file) => {
        const src = readFileSync(file, 'utf-8')
        for (const v of value(src, 'noGaps')) {
            // "No coverage gaps detected" full stop implies fully covered.
            expect(
                /στα στοιχεία που έχουμε|με βάση όσα γνωρίζουμε|ανοιχτά κενά|what we hold|what we know|open gaps/i.test(v),
                `unscoped gap-absence claim: "${v}"`
            ).toBe(true)
        }
    })
})
