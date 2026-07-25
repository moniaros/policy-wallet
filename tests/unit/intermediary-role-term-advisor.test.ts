import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * The intermediary role is standardized on "advisor" / «σύμβουλος» (ratified):
 * it is the term the Greek default already used ~28:1 and the IDD / Law
 * 4583/2018-accurate one for an insurer-agnostic platform (an «ασφαλιστικός
 * πράκτορας» is insurer-tied; a «σύμβουλος / διαμεσολαβητής» advises the client).
 *
 * This guards the DISPLAY strings only. Object keys (agentShort, navAgent,
 * claimAskAgentCta…), the internal "agent" role value, and the /agent route are
 * intentionally unchanged — so we scan only the VALUE side of each
 * `key: '…'` line (everything after the first `key:`), never the key itself.
 */
const EN = readFileSync('lib/i18n/translations/en.ts', 'utf-8')
const EL = readFileSync('lib/i18n/translations/el.ts', 'utf-8')

function valueSides(src: string): string[] {
    return src.split('\n').map((line) => {
        const m = line.match(/^\s*[A-Za-z0-9_]+:\s*(.*)$/)
        return m ? m[1] : '' // value (+ trailing); '' for keys-only / non key:value lines
    })
}

describe('intermediary role reads as "advisor", never "agent"/«πράκτορας»', () => {
    it('no EN string value calls the role an "agent"', () => {
        const offenders = valueSides(EN).filter((v) => /\bagents?\b/i.test(v))
        expect(offenders).toEqual([])
    })

    it('no EL string value calls the role a «πράκτορας»', () => {
        const offenders = valueSides(EL).filter((v) => /πράκτορ/i.test(v))
        expect(offenders).toEqual([])
    })
})
