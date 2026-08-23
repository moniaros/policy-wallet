import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const read = (f: string) => strip(readFileSync(f, 'utf-8'))
const DETECTION = read('lib/gap-detection.ts')
const SEED = read('prisma/seed.ts')

/**
 * A limit is the SUM INSURED — what the policy would pay. The `low_limit` rule
 * read `premiumAmount`, what the customer pays for it. The two are routinely
 * three orders of magnitude apart, so the check could not be right at any
 * threshold: set to flag cover below €500,000 it matched every policy in the
 * book, because no premium is half a million euros; set at €200 it flagged cheap
 * policies while claiming their COVER was inadequate.
 */
describe('the low-limit rule reads a limit', () => {
    it('does not compare the premium', () => {
        const rule = DETECTION.slice(DETECTION.indexOf("rule.type === 'low_limit'"))
            .slice(0, 900)
        expect(rule).not.toMatch(/premiumAmount/)
        expect(rule).toMatch(/sumInsured|insuredValue/)
    })

    it('says nothing when the sum insured is unknown', () => {
        const rule = DETECTION.slice(DETECTION.indexOf("rule.type === 'low_limit'")).slice(0, 900)
        expect(rule).toMatch(/typeof declared !== 'number'[\s\S]{0,60}return false/)
    })
})

/**
 * `coverageSummary` is a nullable free-text column many policies never get, and
 * `''.includes(x)` is false for any non-empty x — so an unpopulated field made
 * EVERY configured missing-coverage rule fire at once. The policy the product
 * understood least was the one reported as riddled with gaps.
 */
describe('an empty coverage summary is not evidence of missing cover', () => {
    it('returns false rather than flagging everything', () => {
        const rule = DETECTION.slice(DETECTION.indexOf("rule.type === 'missing_coverage'")).slice(0, 800)
        expect(rule).toMatch(/if \(!coverageSummary \|\| !requiredCoverage\) return false/)
    })
})

/**
 * The Green Card warning window is a calendar question, like every other expiry
 * count in the product — a certificate that expires TODAY must still be inside
 * the 30-day window.
 */
describe('the date window counts Athens calendar days', () => {
    it('uses the shared helper, not raw milliseconds', () => {
        const rule = DETECTION.slice(DETECTION.indexOf("rule.type === 'date_within_days'")).slice(0, 800)
        expect(rule).toMatch(/calendarDaysUntil\(target, new Date\(\)\)/)
        expect(rule).not.toMatch(/1000 \* 60 \* 60 \* 24/)
    })
})

/**
 * `low_deductible_premium_waste` fires when the deductible is LOW — when the
 * policyholder is better protected — and its remedy is to reduce that
 * protection. Filed as a gap it counted toward gapCount, which feeds the
 * protection-score penalty: the product docked someone's score for carrying less
 * risk themselves, then advised them to carry more. Advising a higher excess
 * without knowing what loss they can absorb is also advice on the substance of
 * an insurance contract, which is regulated in Greece (IDD, Law 4583/2018).
 */
describe('a premium-saving idea is not a coverage gap', () => {
    it('the deductible rule is not an active gap definition', () => {
        const block = SEED.slice(SEED.indexOf("slug: 'low_deductible_premium_waste'"))
            .slice(0, 700)
        expect(block).toMatch(/isActive: false/)
    })

    it('and it no longer tells the reader to raise their excess', () => {
        const block = SEED.slice(SEED.indexOf("slug: 'low_deductible_premium_waste'")).slice(0, 700)
        expect(block).not.toMatch(/Consider raising the deductible/)
        expect(block).not.toMatch(/suggest raising it/)
    })
})

/**
 * ENFIA (Ενιαίος Φόρος Ιδιοκτησίας Ακινήτων) is Greece's unified property
 * ownership TAX. There is no "ENFIA insurance" and it requires no cover at all —
 * insuring a home against fire, earthquake and flood earns a DISCOUNT on it.
 *
 * lib/guides/content.ts has had this right all along. The gap definition, the
 * ACORD schema's field description, the agent playbook, the AI prompt and two
 * marketing surfaces all said "requirement" or "compliance" — and two of those
 * are fed to the model, so the product was teaching itself the wrong concept.
 */
describe('ENFIA is described as the tax discount it is', () => {
    it('the guide, which was always correct, still is', () => {
        const guides = read('lib/guides/content.ts')
        expect(guides).toMatch(/entitled to an ENFIA property-tax discount/)
    })

    it('no source calls it a requirement or a compliance obligation', () => {
        const files = [
            'prisma/seed.ts',
            // The rule-bearing definitions moved out of seed.ts in Phase 7 so the
            // seed, the trace test and the underwriter packet share one source.
            'lib/gaps/authored-catalogue.ts',
            'lib/schemas/acord-data.ts',
            'lib/services/gap-engine/agent-playbook.ts',
            'lib/product/catalog.tsx',
            'app/(public)/product/property/PageClient.tsx',
        ]
        const offenders = files.filter((f) =>
            /(ENFIA|ΕΝΦΙΑ)[^.\n]{0,60}(compliance|Compliance|συμμόρφωση|Συμμόρφωση)|(compliance|συμμόρφωση)[^.\n]{0,30}(ENFIA|ΕΝΦΙΑ)/.test(read(f))
        )
        expect(offenders, `ENFIA as an obligation in:\n${offenders.join('\n')}`).toEqual([])
    })

    it('the gap definition names the discount', () => {
        // Reads the catalogue module, not seed.ts — the definitions moved there in
        // Phase 7. This assertion is the reason the move had to keep the wording
        // byte-identical rather than being retyped.
        const catalogue = read('lib/gaps/authored-catalogue.ts')
        const block = catalogue
            .slice(catalogue.indexOf("slug: 'missing_enfia_components'"))
            .slice(0, 900)
        expect(block).toMatch(/qualifies it for a reduction in ENFIA property tax/)
        expect(block).not.toMatch(/ENFIA\) insurance requires/)
    })

    it('the model is told what ENFIA is, in both prompt surfaces', () => {
        expect(read('lib/schemas/acord-data.ts')).toMatch(/ENFIA is a tax, not an insurance requirement/)
        expect(read('lib/services/ai/prompts.ts')).toMatch(/ENFIA is a property TAX that mandates no cover/)
    })
})

/**
 * The coordination-centre rule tests whether a phone number was EXTRACTED. That
 * is not the same as the policy not having one.
 */
describe('a missing extraction is reported as a missing extraction', () => {
    it('says what is known, not what is assumed', () => {
        const catalogue = read('lib/gaps/authored-catalogue.ts')
        const block = catalogue
            .slice(catalogue.indexOf("slug: 'missing_coordination_centre'"))
            .slice(0, 900)
        expect(block).toMatch(/No coordination centre[^']*is recorded/)
        expect(block).not.toMatch(/Greek health policies should specify/)
    })
})

/**
 * "Security Alert" belongs on a breach notification, not on a finding about
 * someone's insurance — and the set it counted admits `high` severities while
 * calling them all critical.
 */
describe('the gap notification is an insurance message, not a security one', () => {
    const ROUTE = read('app/api/v1/jobs/process-policy/route.ts')

    it('drops the security framing everywhere it appeared', () => {
        expect(ROUTE).not.toMatch(/Security Alert/)
        expect(read('lib/mail-templates.ts')).not.toMatch(/Security Alert/)
    })

    it('does not call high-severity findings critical', () => {
        // The filter deliberately admits `high` as well as `critical`, so the
        // message must not name the whole set "critical". Asserted on the strings
        // the reader sees rather than on the local's name — the first version of
        // this test checked for `seriousGaps` and survived a rename straight back
        // to `criticalGaps`.
        // Anchored on the count, not a local's name — `findings` became the
        // bilingual pair findingsEl/findingsEn when notification content went
        // { el, en } (P1-05), and an anchor on the exact old name would have
        // gone stale the same way `seriousGaps` nearly did.
        const start = ROUTE.indexOf('const n = seriousGaps.length')
        const end = ROUTE.indexOf('channels:', start)
        expect(start).toBeGreaterThan(-1)
        const readerFacing = ROUTE.slice(start, end)
        expect(readerFacing).toMatch(/σημαντικά ευρήματα/)
        expect(readerFacing).toMatch(/significant/)
        expect(readerFacing).not.toMatch(/critical|κρίσιμ/i)
    })

    it('speaks BOTH product languages and agrees with its own count', () => {
        // The route used to resolve preferredLanguage itself and compose one
        // language. Since P1-05 notification content is bilingual by type and
        // the dispatcher resolves the recipient's language — so the assertion
        // is that both arms exist and each pluralises correctly.
        expect(ROUTE).toMatch(/title: \{ el: 'Εντοπίστηκε πιθανό κενό κάλυψης', en: 'Possible coverage gap found' \}/)
        expect(ROUTE).toMatch(/n === 1 \? 'σημαντικό εύρημα' : 'σημαντικά ευρήματα'/)
        expect(ROUTE).toMatch(/n === 1 \? 'finding' : 'findings'/)
    })
})
