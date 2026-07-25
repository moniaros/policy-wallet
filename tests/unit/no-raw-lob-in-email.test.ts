import { describe, it, expect } from 'vitest'
import { readFileSync, globSync } from 'node:fs'

/**
 * `Policy.lineOfBusiness` is a raw taxonomy CODE (`income_protection`,
 * `group_life`…). Interpolated straight into a customer- or agent-facing message
 * it reads as an auto-generated machine string — "Maria's income_protection
 * policy". Every such surface must resolve it to the human branch label via
 * normalizeBranch(...).label first.
 *
 * Found and fixed in the renewal email/task titles and the weekly-digest table;
 * this pins the class so a raw `${…lineOfBusiness}` can't creep back into an email
 * template or the renewal notification composer.
 */
describe('no raw lineOfBusiness code leaks into email/notification text', () => {
    it('no template interpolates ${…lineOfBusiness} without a label resolution', () => {
        const files = [
            ...globSync('lib/email/**/*.ts'),
            'lib/services/renewal.service.ts',
        ].filter((f) => !f.includes('.test.'))

        const offenders: string[] = []
        for (const file of files) {
            readFileSync(file, 'utf-8').split('\n').forEach((line, i) => {
                // A string interpolation whose expression ENDS in `.lineOfBusiness`
                // is the raw-code leak; `normalizeBranch(x.lineOfBusiness).label[…]`
                // ends in `.label[…]` and is therefore not matched.
                if (/\$\{[^}]*\.lineOfBusiness\}/.test(line)) {
                    offenders.push(`${file}:${i + 1}  ${line.trim()}`)
                }
            })
        }

        expect(files.length).toBeGreaterThan(3) // sanity: the glob matched
        expect(
            offenders,
            `raw lineOfBusiness code in user-facing text (use normalizeBranch(...).label):\n${offenders.join('\n')}`,
        ).toEqual([])
    })
})
