import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * The invite modal read as startup-speak — "Growth Protocol", "magic link",
 * "Dispatch Magic Link", "Collaborator" — which undermines the professional,
 * trustworthy impression an insurance agent's client invitation must give (a
 * client receiving a "magic link" from their agent reads it as phishing-
 * adjacent). And its title said "partner" while the action invites a client.
 */
describe('invite flow uses professional insurance language', () => {
    it.each(['lib/i18n/translations/el.ts', 'lib/i18n/translations/en.ts'])(
        '%s has no startup jargon in the invite copy',
        (file) => {
            const src = readFileSync(file, 'utf-8')
            const invite = /invite:\s*\{[\s\S]*?\n {4}\},/.exec(src)?.[0] || ''
            expect(invite).not.toMatch(/magic link|magic|Growth Protocol|Πρωτόκολλο Ανάπτυξης|μαγικ/i)
            // the "secure link" framing that replaced "magic link"
            expect(invite).toMatch(/secure link|ασφαλή σύνδεσμο/i)
        }
    )

    it('validates the email format before sending (button onClick, not form submit)', () => {
        const src = readFileSync('components/agent/InviteModal.tsx', 'utf-8')
        expect(src).toMatch(/@\[\^\\s@\]/) // the email regex guard
        expect(src).toContain('emailInvalid')
        expect(src).toContain('role="alert"')
    })
})

describe('no startup jargon anywhere in customer copy', () => {
    it.each(['lib/i18n/translations/el.ts', 'lib/i18n/translations/en.ts'])(
        '%s uses professional insurance language, not growth-hacking terms',
        (file) => {
            const src = readFileSync(file, 'utf-8')
            // "magic link", "Growth Protocol", "Manual Entry Protocol" etc. read
            // as consumer-app / startup jargon on an insurance platform. A
            // market-leading insurer says "secure link", "sign-in link",
            // "manual entry".
            const offenders = [...src.matchAll(/(\w+):\s*'([^']*(?:magic|Growth Protocol|Entry Protocol|Πρωτόκολλο|μαγικ)[^']*)'/gi)]
                .map((m) => `${m[1]}: ${m[2]}`)
            expect(offenders, `startup jargon in copy:\n${offenders.join('\n')}`).toEqual([])
        }
    )
})
