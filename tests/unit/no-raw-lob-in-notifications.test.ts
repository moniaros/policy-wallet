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
                // A message:/title: assignment on this line that interpolates a raw
                // `${x.lineOfBusiness}` (normalizeBranch(...).label[…] ends in
                // `.label[…]`, so it is not matched).
                if (/\b(message|title):\s*[`'"].*\$\{[^}]*\.lineOfBusiness\}/.test(line)) {
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
