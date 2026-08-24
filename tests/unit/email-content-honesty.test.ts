import { describe, it, expect } from 'vitest'
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"
import { counted, daysToExpiryPhrase, greeting } from '@/lib/email/templates/phrases'
import { getWeeklyDigestEmail } from '@/lib/email/templates/weekly-digest'
import { getChurnDay7Email, getChurnDay60Email } from '@/lib/email/templates/churn-prevention'
import { provisionalProtectionScore } from '@/lib/services/gap-engine/protection-score'

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const read = (f: string) => strip(readFileSync(f, 'utf-8'))
const TEMPLATES = globSync('lib/email/templates/*.ts')

/**
 * `healthScoreChange` was passed as a literal `0` behind a TODO, and the digest
 * turned that into a rendered trend line. Every digest, every week, told the
 * reader their protection score was «Σταθερό» / "Stable" — including the weeks
 * it had fallen because a policy lapsed. ProtectionScore is keyed
 * `@unique userId` and keeps no history, so week-over-week cannot be computed
 * today; the fix is to stop claiming it, not to default it.
 */
describe('the digest does not report a trend it has not computed', () => {
    it('no longer accepts or renders a score change', () => {
        const digest = read('lib/email/templates/weekly-digest.ts')
        expect(digest).not.toMatch(/healthScoreChange/)
        expect(digest).not.toMatch(/Σταθερό|Stable/)
    })

    it('the service no longer passes a placeholder for it', () => {
        expect(read('lib/services/weekly-digest.service.ts')).not.toMatch(/healthScoreChange/)
    })
})

/**
 * Guarded at the PRODUCER, not only the renderer. The first version of this
 * suite asserted the template's behaviour given `healthScore: null` and passed
 * unchanged with the service still emitting 0 — so the decision that actually
 * mattered was untested.
 */
describe('the fallback score returns nothing to score, not a score of nothing', () => {
    it('is null with no policies, however many gaps', () => {
        expect(provisionalProtectionScore(0, [])).toBeNull()
        expect(provisionalProtectionScore(0, ['critical', 'high'])).toBeNull()
    })

    it('is 100 for a policy with no gaps', () => {
        expect(provisionalProtectionScore(1, [])).toBe(100)
    })

    it('weights severity the way the gap engine does', () => {
        expect(provisionalProtectionScore(2, ['critical'])).toBe(75)
        expect(provisionalProtectionScore(2, ['high'])).toBe(85)
        expect(provisionalProtectionScore(2, ['medium'])).toBe(92)
        expect(provisionalProtectionScore(2, ['low'])).toBe(97)
    })

    it('floors at zero rather than going negative', () => {
        expect(provisionalProtectionScore(1, Array(10).fill('critical'))).toBe(0)
    })

    it('ignores a severity it does not recognise instead of scoring NaN', () => {
        expect(provisionalProtectionScore(1, ['unknown-severity'])).toBe(100)
    })
})

/**
 * The digest carries NO protection score at all. It used to render a score
 * tile — and its provisional fallback mailed "100%" to portfolios nobody had
 * ever analysed. The score was removed from the product in Aug 2026
 * (PW-MOBILE-TRANSFORM-01, halt H-001); the deeper sweep lives in
 * tests/unit/score-containment.test.ts, this is the outbound-facing assertion
 * against the rendered artifact itself.
 */
describe('the digest reports no score at all', () => {
    const base = {
        renewingSoon: [],
        newGaps: 0,
        unreadMessages: 0,
    }

    it('renders neither the label nor a percentage tile', () => {
        const { html } = getWeeklyDigestEmail('el', 'Μαρία', base)
        expect(html).not.toMatch(/Βαθμολογία προστασίας|σκορ προστασίας/)
        const en = getWeeklyDigestEmail('en', 'Μαρία', base).html
        expect(en).not.toMatch(/[Pp]rotection [Ss]core/)
    })
})

/**
 * The day-7 churn email fires on INACTIVITY — seven days without a login — not
 * on any change in the reader's cover. Titled "your policies need attention" it
 * read as a risk alert, and a reader whose portfolio is in perfect order got it
 * anyway, with an empty body under the warning.
 */
describe('the win-back email only claims a problem when there is one', () => {
    it('does not tell a healthy portfolio it needs attention', () => {
        const { subject, html } = getChurnDay7Email({ language: 'en', expiringPolicies: 0, openGaps: 0 })
        expect(subject).not.toMatch(/need attention/i)
        expect(html).not.toMatch(/needs attention/i)
        expect(html).toMatch(/nothing that needs action/i)
    })

    it('does say so when there is something', () => {
        const { subject, html } = getChurnDay7Email({ language: 'en', expiringPolicies: 2, openGaps: 0 })
        expect(subject).toMatch(/needs attention/i)
        expect(html).toMatch(/2 policies expiring soon/)
    })

    it('agrees with itself in Greek', () => {
        const healthy = getChurnDay7Email({ language: 'el', expiringPolicies: 0, openGaps: 0 })
        expect(healthy.subject).not.toMatch(/χρειάζεται προσοχή/)
        const flagged = getChurnDay7Email({ language: 'el', expiringPolicies: 1, openGaps: 3 })
        expect(flagged.subject).toMatch(/χρειάζεται προσοχή/)
        expect(flagged.html).toMatch(/1 ασφαλιστήριο λήγει σύντομα/)
        expect(flagged.html).toMatch(/3 κενά κάλυψης χρειάζονται αντιμετώπιση/)
    })
})

/**
 * Every counted noun was interpolated in front of a fixed plural, so a reader
 * with exactly one of anything got "1 policies expiring soon" and «1 κενά
 * κάλυψης». Greek needs the whole clause: the verb agrees too.
 */
describe('counted phrases agree with their number', () => {
    it('singular in both languages', () => {
        expect(counted(1, 'policy expiring soon', 'policies expiring soon')).toBe('1 policy expiring soon')
        expect(counted(1, 'κενό κάλυψης χρειάζεται αντιμετώπιση', 'κενά κάλυψης χρειάζονται αντιμετώπιση'))
            .toBe('1 κενό κάλυψης χρειάζεται αντιμετώπιση')
    })

    it('plural for everything else', () => {
        expect(counted(2, 'policy', 'policies')).toBe('2 policies')
        expect(counted(0, 'policy', 'policies')).toBe('0 policies')
    })

    it('no template interpolates a bare count in front of a fixed noun', () => {
        const offenders: string[] = []
        for (const file of TEMPLATES) {
            const src = read(file)
            // e.g. `${openGaps} ${isGreek ? 'κενά …' : 'coverage gaps …'}`
            if (/\$\{[a-zA-Z.!]*(Gaps|Policies|Messages|gapCount|Count)\}\s*\$\{/.test(src)) offenders.push(file)
        }
        expect(offenders, `bare counts in:\n${offenders.join('\n')}`).toEqual([])
    })
})

describe('the expiry countdown reads correctly at the boundary', () => {
    it('names today and tomorrow', () => {
        expect(daysToExpiryPhrase(0, false)).toBe('expires today')
        expect(daysToExpiryPhrase(1, true)).toBe('λήγει αύριο')
    })

    it('counts everything else', () => {
        expect(daysToExpiryPhrase(12, false)).toBe('in 12 days')
        expect(daysToExpiryPhrase(12, true)).toBe('σε 12 ημέρες')
    })
})

/**
 * Every template opened with «Γεια σου» — the informal singular — and addressed
 * the same reader with the formal «σας» in the very next sentence. The product's
 * own UI copy is formal throughout.
 */
describe('emails address the reader the way the product does', () => {
    it('is formal in Greek', () => {
        expect(greeting('Μαρία', true)).toBe('Αγαπητέ/ή Μαρία,')
        expect(greeting(undefined, true)).toBe('Καλησπέρα σας,')
    })

    it('leaves no informal greeting in any template', () => {
        const offenders = TEMPLATES.filter((f) => /Γεια σου/.test(read(f)))
        expect(offenders, `informal greeting in:\n${offenders.join('\n')}`).toEqual([])
    })
})

/**
 * `/home` is now only a redirect to `/dashboard`, and «Dashboard» is an English
 * word sitting in Greek copy where the product's own term is «Πίνακας ελέγχου».
 */
describe('email CTAs point at the canonical route in the reader language', () => {
    it('no template links to the redirect', () => {
        const offenders = TEMPLATES.filter((f) => /APP_URL\}\/home/.test(read(f)))
        expect(offenders, `/home link in:\n${offenders.join('\n')}`).toEqual([])
    })

    it('no Greek CTA says "Dashboard"', () => {
        const offenders = TEMPLATES.filter((f) => /'[^']*Dashboard[^']*'\s*:\s*'/.test(read(f)))
        expect(offenders, `English "Dashboard" in Greek copy:\n${offenders.join('\n')}`).toEqual([])
    })
})


/**
 * An email selected by inactivity may not assert a fact about the portfolio.
 *
 * The day-60 churn email led with «Η κάλυψή σας μπορεί να κινδυνεύει» / "Your
 * coverage may be at risk" behind a padlock. Its tier is chosen on
 * `daysSinceActive` alone; nothing on that path reads an expiry, a gap, or a
 * policy. Day 7 does take `expiringPolicies` and `openGaps` and has a basis.
 *
 * This is the absence-is-not-evidence rule inverted. `all-clear-honesty` guards
 * a check that could not run reporting the GOOD outcome; this is one reporting
 * the BAD one, which is worse — fear built from missing data is a lever, not a
 * warning.
 */
describe('the day-60 email claims only what selected it', () => {
    const RISK_CLAIM = /κινδυν|at risk|επικίνδυν|unprotected|απροστάτευτ|έχετε κενό|you have a gap/i

    it('the tier really is inactivity-only — the reason this rule exists', () => {
        // D-022: assert the precondition. If day60 ever starts receiving
        // portfolio facts, this test should be revisited rather than obeyed.
        const svc = read('lib/services/churn-prevention.service.ts')
        expect(svc).toMatch(/daysSinceActive >= 58/)
        const call = svc.match(/getChurnDay60Email\(\{[^}]*\}\)/)?.[0] ?? ''
        expect(call, 'day60 now takes portfolio input — re-derive what it may claim').not.toMatch(
            /expiringPolicies|openGaps|policies|gaps/
        )
    })

    it('asserts no coverage risk, in either language', () => {
        for (const language of ['el', 'en'] as const) {
            const { subject, html } = getChurnDay60Email({ name: 'Νίκος', language })
            expect(subject, `${language} subject`).not.toMatch(RISK_CLAIM)
            expect(html, `${language} body`).not.toMatch(RISK_CLAIM)
        }
    })

    it('still says the true thing that selected it, and still links back', () => {
        const { subject, html } = getChurnDay60Email({ name: 'Νίκος', language: 'el' })
        expect(subject).toMatch(/2 μήνες/)
        expect(html).toMatch(/\/dashboard/)
    })

    it('day 7 is unaffected — it has a basis and may name it', () => {
        const { html } = getChurnDay7Email({ name: 'Νίκος', language: 'el', expiringPolicies: 2, openGaps: 3 })
        expect(html).toMatch(/2|3/)
    })
})
