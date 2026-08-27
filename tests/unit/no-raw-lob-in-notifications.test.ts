import { describe, it, expect } from 'vitest'
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"

/**
 * In-app notifications render their stored `message`/`title` VERBATIM
 * (NotificationCard/Bell/Client show `{event.message}` with no localisation
 * layer). So a raw `lineOfBusiness` taxonomy code interpolated into a message
 * reaches the reader as "added a income_protection policy to your wallet".
 *
 * Fixed in the agent "policy added" (→ customer) and "policy shared" (→ agent)
 * notifications; this pins the class. It flags a `${…lineOfBusiness}` ONLY inside
 * a `message:`/`title:` field, so legitimate raw-code uses (AI prompts, dedup
 * keys, DB filters) are not touched.
 */
/**
 * A message:/title: assignment on this line whose interpolation carries the
 * raw code. The Phase 6 audit found the original regex required the
 * interpolation to END in `.lineOfBusiness}` — which missed one of the TWO
 * authentic offenders this guard was written about: the "policy shared"
 * message interpolated `${policy?.lineOfBusiness || 'insurance'}`, and the
 * fallback pushed `.lineOfBusiness` away from the closing brace. Now each
 * `${…}` segment is checked for the raw field, and a segment that routes
 * through normalizeBranch/.label/branchFamilyId stays exempt.
 */
function rawLobInNotificationText(line: string): boolean {
    const m = line.match(/\b(?:message|title):\s*[`'"](.*)$/)
    if (!m) return false
    for (const seg of m[1].matchAll(/\$\{[^}]*\}/g)) {
        if (!/\.lineOfBusiness\b/.test(seg[0])) continue
        if (/normalizeBranch|\.label\b|branchFamilyId/.test(seg[0])) continue
        return true
    }
    return false
}

describe('no raw lineOfBusiness code leaks into notification message/title text', () => {
    it('every notification message/title resolves lineOfBusiness to a label', () => {
        const files = [
            ...globSync('app/**/actions.ts'),
            ...globSync('app/api/**/route.ts'),
            ...globSync('lib/services/**/*.ts'),
            ...globSync('lib/notifications.ts'),
        ].filter((f) => !f.includes('.test.'))

        const offenders: string[] = []
        for (const file of files) {
            readFileSync(file, 'utf-8').split('\n').forEach((line, i) => {
                if (rawLobInNotificationText(line)) {
                    offenders.push(`${file}:${i + 1}  ${line.trim()}`)
                }
            })
        }

        expect(files.length).toBeGreaterThan(10) // sanity: the glob matched
        expect(
            offenders,
            `raw lineOfBusiness code in notification text (use normalizeBranch(...).label):\n${offenders.join('\n')}`,
        ).toEqual([])
    })
})

/**
 * RED-PROOF (Phase 6 guard audit): the matcher against the AUTHENTIC pre-fix
 * lines (f9362ed1 removed exactly these — the "policy added" message a
 * customer read as "added a income_protection policy to your wallet", and the
 * "policy shared" message the agent read the same way), plus the resolved
 * shape that must stay silent. KNOWN LIMIT, on the record: the matcher is
 * single-line — a message built across lines, or assigned to a variable
 * first, is invisible. The tree was swept for `${…lineOfBusiness}` everywhere
 * during the audit; no notification writer carries the multi-line form today.
 */
describe('the notification matcher is proven on authentic sources', () => {
    it('flags both messages that shipped', () => {
        expect(rawLobInNotificationText(
            'message: `${agentLabel} added a ${data.policy.lineOfBusiness} policy from ${data.policy.insurerName} to your wallet and can view and manage that policy. You can revoke this access at any time from My Agent.`,',
        )).toBe(true)
        expect(rawLobInNotificationText(
            "message: `${authResult.dbUser.name || 'A customer'} has shared their ${policy?.lineOfBusiness || 'insurance'} policy (${policy?.insurerName}) with you with ${permissions} access.`,",
        )).toBe(true)
    })

    it('stays silent on a resolved label and on non-text fields', () => {
        expect(rawLobInNotificationText(
            'message: `${agentLabel} added a ${normalizeBranch(data.policy.lineOfBusiness).label.el} policy`,',
        )).toBe(false)
        // A dedup key legitimately uses the raw code — it is not message/title text.
        expect(rawLobInNotificationText(
            'dedupKey: `renewal:${policy.id}:${policy.lineOfBusiness}`,',
        )).toBe(false)
    })
})
