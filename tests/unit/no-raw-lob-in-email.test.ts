import { describe, it, expect } from 'vitest'
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"

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
/**
 * An interpolation that carries the raw code. Checked per `${…}` segment: the
 * raw field with no resolver in the SAME segment is the leak — so
 * `${normalizeBranch(x.lineOfBusiness).label.el}` is exempt, while the
 * fallback shape `${x.lineOfBusiness || 'insurance'}` (which the notification
 * guard's original end-anchored regex missed on an authentic offender) is not.
 */
function rawLobInterpolated(line: string): boolean {
    for (const seg of line.matchAll(/\$\{[^}]*\}/g)) {
        if (!/\.lineOfBusiness\b/.test(seg[0])) continue
        if (/normalizeBranch|\.label\b|branchFamilyId/.test(seg[0])) continue
        return true
    }
    return false
}

describe('no raw lineOfBusiness code leaks into email/notification text', () => {
    it('no template interpolates ${…lineOfBusiness} without a label resolution', () => {
        const files = [
            ...globSync('lib/email/**/*.ts'),
            'lib/services/renewal.service.ts',
        ].filter((f) => !f.includes('.test.'))

        const offenders: string[] = []
        for (const file of files) {
            readFileSync(file, 'utf-8').split('\n').forEach((line, i) => {
                if (rawLobInterpolated(line)) {
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

/**
 * RED-PROOF (Phase 6 guard audit): the matcher against the AUTHENTIC pre-fix
 * lines (4e3e6b75 removed exactly these from the weekly digest and the renewal
 * composer), and the post-fix resolution that must stay silent.
 */
describe('the interpolation matcher is proven on authentic sources', () => {
    it('flags the digest cell and the renewal title that shipped', () => {
        expect(rawLobInterpolated(
            '<td style="padding: 8px 0; font-size: 14px; color: #6B7280;">${r.lineOfBusiness}</td>',
        )).toBe(true)
        expect(rawLobInterpolated(
            "    const title = `Renewal alert: ${customerName}'s ${policy.lineOfBusiness} policy`",
        )).toBe(true)
    })

    it('stays silent on a resolved label', () => {
        expect(rawLobInterpolated(
            '<td>${normalizeBranch(r.lineOfBusiness).label.el}</td>',
        )).toBe(false)
    })
})
