import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * Conduct-risk guard: customer-facing copy must not promise outcomes the
 * product/policy cannot guarantee, and estimates must not masquerade as
 * certainty.
 *
 * - The gap-alert email told policyholders to "review now to ensure you are
 *   fully protected" — reviewing a finding ensures no such thing, and no
 *   policy provides "full protection".
 * - The savings report (a printable, agent-brandable, client-facing document)
 *   headlined a summed AI estimate with per-item "(85% βεβαιότητα)" — an LLM's
 *   self-assessed confidence presented as statistical CERTAINTY — and carried
 *   no methodology or cover-reduction caveat next to the number.
 * - Dead "Full protection based on policy specifications" keys deleted before
 *   anything could wire them.
 */
const MAIL = readFileSync('lib/mail-templates.ts', 'utf-8')
const REPORT = readFileSync('lib/services/reports/savings-report.ts', 'utf-8')
const EL = readFileSync('lib/i18n/translations/el.ts', 'utf-8')
const EN = readFileSync('lib/i18n/translations/en.ts', 'utf-8')

describe('customer emails do not overpromise outcomes', () => {
    it('gap alert does not claim reviewing ensures full protection', () => {
        expect(MAIL).not.toMatch(/fully protected|πλήρη προστασία/)
        expect(MAIL).not.toMatch(/ensure continuous coverage/)
    })
})

describe('savings report presents estimates as estimates', () => {
    it('no pseudo-certainty percentage on AI estimates', () => {
        expect(REPORT).not.toMatch(/βεβαιότητα|% confidence/)
        expect(REPORT).toContain('Ενδεικτική εκτίμηση')
    })

    it('the headline total carries the methodology + cover-reduction caveat', () => {
        expect(REPORT).toMatch(/savings-total .caveat/)
        expect(REPORT).toContain('Χαμηλότερο ασφάλιστρο μπορεί να σημαίνει μικρότερη κάλυψη')
        expect(REPORT).toContain('A lower premium can mean less cover')
        // The policy document stays the authoritative source.
        expect(REPORT).toContain('Αυθεντική πηγή παραμένει το ασφαλιστήριό σας')
    })

    it('uses the standardized policy term and Athens-pinned dates', () => {
        expect(REPORT).toContain('Αριθμός ασφαλιστηρίου')
        expect(REPORT).toContain('timeZone: "Europe/Athens"')
    })
})

describe('marketing never promises analysis "in seconds"', () => {
    // Analysis queues (QStash) and takes minutes — the help center was fixed to
    // say so, but the marketing/SEO layer still promised "under 30 seconds",
    // breaking the product's first promise on first use. Uploading IS seconds;
    // claims about the ANALYSIS must not be.
    it('no analysis/read-speed claim in seconds across marketing + SEO', () => {
        const { readdirSync, statSync } = require('node:fs') as typeof import('node:fs')
        const { join } = require('node:path') as typeof import('node:path')
        const collect = (dir: string): string[] =>
            readdirSync(dir).flatMap((name) => {
                const p = join(dir, name)
                if (statSync(p).isDirectory()) return collect(p)
                return /\.(tsx?|ts)$/.test(p) ? [p] : []
            })
        // The auth pages were once outside this guard, which is how "Takes 90
        // seconds" and "Bank-grade security" lived on the signup and
        // password-reset screens while the marketing tree was audited to three
        // consecutive zero-finding rounds. A guard that stops at the marketing
        // directory does not protect the pages people actually sign up on.
        //
        // Then the same hole opened one level down: the list below named two
        // files in lib/, and `lib/copy.ts` — which claimed "Bank-Grade Security"
        // AND "ISO 27001 certification", a compliance certification the company
        // does not hold — sat outside it for months. It was dead code, so
        // nothing rendered the claim, but a hand-kept list is what let a false
        // certification claim live in the repo unexamined. That is the third
        // time in this programme a curated file list has been the hole.
        //
        // So: all of lib/ is walked, not two files from it.
        const files = [...collect('app/(public)'), ...collect('app/auth'), ...collect('lib')]
        expect(files.length).toBeGreaterThan(10)
        // `\s` after the verb is load-bearing. Without it, widening the scan to
        // all of lib/ made this fire on `readRetryAfterSeconds` — an identifier
        // where "read" and "Seconds" are 16 characters apart and no claim is
        // being made to anyone. Prose puts a space between the verb and the
        // number; camelCase does not.
        const CLAIM = /(αναλύ\p{L}*|analy[sz]\p{L}*|διαβάζ\p{L}*|reads?)\s[^.\n]{0,50}(δευτερόλεπτ|seconds)/iu

        // Proven in both directions, or widening the scope just moved the hole.
        expect(CLAIM.test('reads your policy in 30 seconds'), 'must catch the claim').toBe(true)
        expect(CLAIM.test('αναλύει το συμβόλαιο σε 90 δευτερόλεπτα'), 'must catch the Greek claim').toBe(true)
        expect(CLAIM.test('const readRetryAfterSeconds = 5'), 'must not catch an identifier').toBe(false)
        for (const file of files) {
            const src = readFileSync(file, 'utf-8')
            const m = src.match(CLAIM)
            expect.soft(m, `${file}: "${m?.[0] ?? ''}"`).toBeNull()
        }
    })
})

describe('no "full protection" claims wait in the translations', () => {
    it('standardCoverageDesc ("Full protection…") is gone from both languages', () => {
        expect(EL).not.toContain('standardCoverageDesc')
        expect(EN).not.toContain('standardCoverageDesc')
        expect(EN).not.toMatch(/Full protection based on policy/)
    })
})
