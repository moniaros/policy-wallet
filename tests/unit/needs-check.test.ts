import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
    NEEDS_QUESTIONS,
    NEEDS_STEPS,
    EXPOSURE_IDS,
    HELD_IDS,
    isComplete,
    isStepComplete,
    toRiskProfilePayload,
    type NeedsAnswers,
} from '@/lib/needs/questions'
import { needsOutcome } from '@/lib/needs/outcome'
import { RiskProfileSchema } from '@/lib/validations/risk-profile'

/**
 * The public needs check makes two promises that only a test can hold it to.
 *
 * The first is the honesty rule: six questions cannot tell anyone whether they
 * are covered, so the page may not grade, score or claim a gap. Every competing
 * product in this category ends its questionnaire with a number, and the pull
 * toward adding one later is exactly what this file exists to resist.
 *
 * The second is the carry-over: the whole value of the page is that the answers
 * survive signup. That only works if what it stores is still valid input for
 * `PATCH /api/v1/risk-profile` — so the payload is asserted against the route's
 * OWN schema rather than a copy of it. If someone tightens the risk API, this
 * fails here instead of silently dropping a new customer's answers on the floor.
 */

const FULL: NeedsAnswers = {
    residence: 'owned',
    properties: 1,
    marital: 'married',
    children: 2,
    vehicles: 1,
    work: 'self_employed',
    loan: true,
    retirement: false,
    exposures: ['pets', 'travel'],
    activities: ['skiing'],
    cyber: 'high',
    held: ['health'],
}

describe('the needs questions', () => {
    it('is a wizard of several steps, each with questions', () => {
        expect(NEEDS_STEPS.length).toBeGreaterThanOrEqual(5)
        for (const step of NEEDS_STEPS) {
            expect(step.questions.length, `${step.id} has no questions`).toBeGreaterThan(0)
            expect(step.title.el.length).toBeGreaterThan(2)
            expect(step.intro.el.length, `${step.id} must say why it asks`).toBeGreaterThan(20)
        }
        for (const q of NEEDS_QUESTIONS) {
            expect(q.choices.length, `${q.id} needs choices`).toBeGreaterThanOrEqual(2)
        }
    })

    /**
     * The brief was "risk questions for every branch". A questionnaire that
     * quietly covers only motor and home would still pass every other test in
     * this file, so the breadth is asserted directly.
     */
    it('reaches every major branch of the taxonomy', () => {
        const { payload } = toRiskProfilePayload(FULL)
        const fields = Object.keys(payload)
        for (const field of [
            'residenceType', 'propertiesOwned', 'rentsOutProperty', 'isBuildingManager', // home, liability
            'childrenCount', 'maritalStatus',                                            // life
            'vehiclesCount', 'ownsBoat',                                                 // motor, marine
            'employmentStatus', 'ownsBusiness', 'hasLoans', 'retirementPlanning',        // income, business, pension
            'travelsFrequently', 'hasPets', 'activities', 'cyberExposure',               // travel, pet, life, cyber
            'coverHeldElsewhere',                                                        // what they already hold
        ]) {
            expect(fields, `${field} is never collected`).toContain(field)
        }
    })

    it('asks what the visitor already holds, so it cannot invent a gap', () => {
        const held = NEEDS_QUESTIONS.find((q) => q.id === 'held')
        expect(held, 'no question collects existing cover').toBeTruthy()
        expect(HELD_IDS.length).toBeGreaterThanOrEqual(5)
    })

    it('is bilingual everywhere a visitor can read', () => {
        for (const q of NEEDS_QUESTIONS) {
            expect(q.prompt.el).not.toBe(q.prompt.en)
            expect(q.prompt.el.length).toBeGreaterThan(3)
            expect(q.prompt.en.length).toBeGreaterThan(3)
            for (const c of q.choices) {
                expect(c.label.el.length, `${q.id} choice label`).toBeGreaterThan(0)
                expect(c.label.en.length, `${q.id} choice label`).toBeGreaterThan(0)
            }
        }
    })

    /**
     * GDPR Art. 9. An anonymous visitor has no account for a consent record to
     * attach to, so special-category data must not be collected here however
     * useful it would be to the engine. The authenticated wizard asks these.
     */
    it('asks for no health, income or identity data', () => {
        const banned = [
            'chronicConditions', 'familyMedicalHistory', 'smokingStatus',
            'heightCm', 'weightKg', 'gender', 'dateOfBirth',
            'annualIncome', 'savingsAmount', 'occupation',
        ]
        const ids = NEEDS_QUESTIONS.map((q) => String(q.id))
        for (const field of banned) expect(ids).not.toContain(field)

        const { payload } = toRiskProfilePayload(FULL)
        for (const field of banned) {
            expect(Object.keys(payload), `${field} must not be sent`).not.toContain(field)
        }
    })

    it('is incomplete until every question is answered', () => {
        expect(isComplete({})).toBe(false)
        expect(isComplete({ ...FULL, exposures: undefined })).toBe(false)
        expect(isComplete({ ...FULL, loan: undefined })).toBe(false)
        // An empty multi-select IS an answer — "none of these".
        expect(isComplete({ ...FULL, exposures: [], activities: [], held: [] })).toBe(true)
        expect(isComplete(FULL)).toBe(true)
    })

    it('gates each step on its own questions, not on the whole form', () => {
        // The wizard must let someone through step 1 without having answered
        // step 5, or the Continue button never enables.
        const first = NEEDS_STEPS[0]
        const onlyFirst: NeedsAnswers = { residence: 'rented', properties: 0 }
        expect(isStepComplete(first, onlyFirst)).toBe(true)
        expect(isComplete(onlyFirst)).toBe(false)
    })
})

describe('the payload the account receives', () => {
    it('is accepted by the risk API\'s own schema', () => {
        const { payload, answeredFields } = toRiskProfilePayload(FULL)
        const parsed = RiskProfileSchema.safeParse({ ...payload, answeredFields })
        expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true)
    })

    it('is still valid when the visitor answers no to everything', () => {
        const empty: NeedsAnswers = {
            residence: 'rented', children: 0, vehicles: 0,
            work: 'employed', loan: false, exposures: [],
        }
        const { payload, answeredFields } = toRiskProfilePayload(empty)
        expect(RiskProfileSchema.safeParse({ ...payload, answeredFields }).success).toBe(true)
        // Every exposure is recorded as answered-false, not as silence. Without
        // this the engine cannot tell "I have no boat" from "never asked" and
        // parks the risk in needs_review forever.
        expect(payload.ownsBoat).toBe(false)
        expect(answeredFields).toContain('ownsBoat')
    })

    it('declares every field it writes as answered', () => {
        const { payload, answeredFields } = toRiskProfilePayload(FULL)
        expect([...answeredFields].sort()).toEqual(Object.keys(payload).sort())
    })

    it('does not let the profile contradict itself', () => {
        const { payload } = toRiskProfilePayload(FULL)
        // owned home implies ownsHome; children imply dependents
        expect(payload.residenceType).toBe('owned')
        expect(payload.ownsHome).toBe(true)
        expect(payload.childrenCount).toBe(2)
        expect(payload.dependentsCount).toBe(2)
    })

    it('maps every exposure id to a real profile column', () => {
        const { payload } = toRiskProfilePayload({ ...FULL, exposures: [...EXPOSURE_IDS] })
        for (const col of ['hasPets', 'travelsFrequently', 'ownsBusiness', 'ownsBoat', 'rentsOutProperty', 'isBuildingManager']) {
            expect(payload[col], `${col} should be true`).toBe(true)
        }
    })
})

describe('the result never becomes a verdict', () => {
    // Comments stripped: the rationale for having no score necessarily uses the
    // word "score", and a guard that trips on its own explanation is a guard
    // someone deletes. Blanking preserves line numbers.
    const strip = (src: string) =>
        src
            .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
            .replace(/^(\s*)\/\/.*$/gm, '$1')

    const SRC = [
        strip(readFileSync('lib/needs/outcome.ts', 'utf-8')),
        strip(readFileSync('components/needs/NeedsCheck.tsx', 'utf-8')),
    ].join('\n')

    it('carries no score, grade or percentage', () => {
        expect(SRC).not.toMatch(/\bscore\b/i)
        expect(SRC).not.toMatch(/\d+\s*%/)
        expect(SRC).not.toMatch(/βαθμολογ/i)
    })

    it('never tells a stranger they have a gap', () => {
        // We have not read their policies. "Worth checking" is the strongest
        // claim six questions support.
        for (const item of needsOutcome(FULL)) {
            const text = `${item.because.el} ${item.check.el} ${item.because.en} ${item.check.en}`
            expect(text, item.id).not.toMatch(/έχετε κενό|you have a gap|δεν καλύπτεστε|you are not covered/i)
        }
    })

    it('says out loud that it has not seen the policies', () => {
        const ui = readFileSync('components/needs/NeedsCheck.tsx', 'utf-8')
        expect(ui).toMatch(/Δεν έχουμε δει τα ασφαλιστήριά σας/)
        expect(ui).toMatch(/We have not seen your policies/)
    })

    it('grounds every item in something the visitor actually said', () => {
        for (const item of needsOutcome(FULL)) {
            expect(item.because.el.length, item.id).toBeGreaterThan(10)
            expect(item.because.en.length, item.id).toBeGreaterThan(10)
            expect(item.check.el.length, item.id).toBeGreaterThan(20)
        }
    })
})

describe('the result reacts to the answers', () => {
    it('offers nothing motor-related to someone with no vehicle', () => {
        const ids = needsOutcome({ ...FULL, vehicles: 0 }).map((i) => i.id)
        expect(ids).not.toContain('motor')
    })

    it('raises life cover when there are dependents, and not when there are none', () => {
        expect(needsOutcome({ ...FULL, children: 2 }).map((i) => i.id)).toContain('life-dependents')
        expect(needsOutcome({ ...FULL, children: 0 }).map((i) => i.id)).not.toContain('life-dependents')
    })

    it('always gives an answer, even to someone who said no to everything', () => {
        const items = needsOutcome({
            residence: 'family', children: 0, vehicles: 0,
            work: 'retired', loan: false, exposures: [],
        })
        // An empty result would read as "you need nothing", which is a claim.
        expect(items.length).toBeGreaterThan(0)
    })

    it('orders by consequence, not by the order the questions were asked', () => {
        const items = needsOutcome(FULL)
        const weights = items.map((i) => i.weight)
        expect([...weights].sort((a, b) => b - a)).toEqual(weights)
    })

    it('links only to product pages that exist', () => {
        const catalog = readFileSync('lib/product/catalog.tsx', 'utf-8')
        const all = needsOutcome({
            residence: 'owned', children: 1, vehicles: 1, work: 'self_employed',
            loan: true, exposures: [...EXPOSURE_IDS],
        })
        const rented = needsOutcome({ ...FULL, residence: 'rented' })
        for (const item of [...all, ...rented]) {
            expect(catalog, `/product/${item.product} is not in the catalog`).toContain(`id: "${item.product}"`)
        }
    })
})

describe('the public route stays reachable', () => {
    it('is on the proxy allowlist', () => {
        // `auth: public` in an inventory means nothing if proxy.ts 307s the
        // path to signin first — the trap that silently killed the cron routes
        // and the cookie-consent POST.
        expect(readFileSync('proxy.ts', 'utf-8')).toMatch(/"\/needs"/)
    })

    /**
     * It shipped without a header or a footer at all — no nav, no logo home, no
     * language toggle, and no route to terms/privacy/cookies, which have to be
     * reachable from every page. Nothing caught it: the route returned 200, axe
     * was clean, and every other test here passed, because a page with no
     * navigation is still a valid page. Only opening it showed the problem.
     */
    it('renders inside the public shell, like every other public page', () => {
        const body = readFileSync('app/(public)/needs/NeedsPageBody.tsx', 'utf-8')
        expect(body).toMatch(/LoBPageShell/)
        // The shell is what supplies PublicHeader and PublicMegaFooter.
        const shell = readFileSync('components/landing/LoBPageShell.tsx', 'utf-8')
        expect(shell).toMatch(/PublicHeader/)
        expect(shell).toMatch(/PublicMegaFooter/)
    })

    it('exists in both languages with its own metadata', () => {
        const seo = readFileSync('lib/seo/marketing-pages.ts', 'utf-8')
        expect(seo).toMatch(/needs: \{/)
        expect(seo).toMatch(/path: "\/needs"/)
        readFileSync('app/(public)/needs/page.tsx', 'utf-8')
        readFileSync('app/(public)/en/needs/page.tsx', 'utf-8')
    })
})
