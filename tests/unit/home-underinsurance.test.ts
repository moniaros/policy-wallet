import { describe, it, expect } from 'vitest'
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"
import { evaluatePortfolioRules } from '@/lib/services/gap-engine/portfolio-rules'

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const home = (property: Record<string, unknown>) => ({
    id: 'pol-1',
    lineOfBusiness: 'home',
    status: 'active',
    insurerName: 'ΕΘΝΙΚΗ',
    policyNumber: 'H-1',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2027-01-01'),
    acordData: { property: { earthquakeCoverageIncluded: true, ...property } },
})
const gapsFor = (p: any) =>
    evaluatePortfolioRules([p], { hasAgent: true, now: new Date('2026-07-24T09:00:00Z') })
const underinsurance = (p: any) => gapsFor(p).find((g) => g.ruleId === 'home_underinsured')

/**
 * Four surfaces promised this check and nothing performed it: the home branch
 * page said "we compare the insured amount with the square metres and the
 * details in your profile" — the profile holds nothing about a property's size
 * or value — a guide said the AI "automatically flags whether the reconstruction
 * sum appears inadequate", and the glossary said PolicyWallet "flags when the
 * sum insured looks low relative to the property".
 *
 * The product's own guide calls underinsurance "the most important — and most
 * neglected — step of every renewal" and explains the average clause correctly.
 * It was the one thing the analysis claimed to catch and did not.
 */
describe('underinsurance is detected from the figures the document states', () => {
    it('flags a sum insured materially below the stated rebuild cost', () => {
        const gap = underinsurance(home({ insuredValue: 100_000, estimatedRebuildCost: 200_000 }))
        expect(gap).toBeTruthy()
        expect(gap!.severity).toBe('high')
    })

    it('explains the average clause — every claim, not only a total loss', () => {
        const gap = underinsurance(home({ insuredValue: 100_000, estimatedRebuildCost: 200_000 }))!
        expect(gap.reason.en).toMatch(/EVERY claim — not only a total loss/)
        expect(gap.reason.el).toMatch(/ΚΑΘΕ αποζημίωση — όχι μόνο η ολική ζημιά/)
    })

    it('shows the shortfall and what it costs on a real claim', () => {
        const gap = underinsurance(home({ insuredValue: 100_000, estimatedRebuildCost: 200_000 }))!
        expect(gap.evidence.en).toMatch(/50% short/)
        // A €10,000 loss settles at €5,000 under a 50% shortfall.
        expect(gap.evidence.en).toMatch(/€5,000/)
    })

    it('does not fire on a rounding difference', () => {
        expect(underinsurance(home({ insuredValue: 196_000, estimatedRebuildCost: 200_000 }))).toBeUndefined()
    })

    it('does not fire when the sum insured meets or exceeds the rebuild cost', () => {
        expect(underinsurance(home({ insuredValue: 200_000, estimatedRebuildCost: 200_000 }))).toBeUndefined()
        expect(underinsurance(home({ insuredValue: 250_000, estimatedRebuildCost: 200_000 }))).toBeUndefined()
    })

    it('says nothing when the document gives no rebuild cost', () => {
        // Square metres alone cannot support the conclusion — the guides
        // deliberately decline to hardcode a €/m² rate, pointing at the AADE
        // figure instead, so inventing one here would be a fabricated benchmark.
        expect(underinsurance(home({ insuredValue: 100_000, squareMeters: 120 }))).toBeUndefined()
        expect(underinsurance(home({ estimatedRebuildCost: 200_000 }))).toBeUndefined()
    })

    it('ignores zero and non-numeric figures rather than dividing by them', () => {
        expect(underinsurance(home({ insuredValue: 0, estimatedRebuildCost: 200_000 }))).toBeUndefined()
        expect(underinsurance(home({ insuredValue: 100_000, estimatedRebuildCost: 0 }))).toBeUndefined()
        expect(underinsurance(home({ insuredValue: 'x', estimatedRebuildCost: 'y' }))).toBeUndefined()
    })

    it('applies to a rented home too — renters is a child of home', () => {
        const renters = { ...home({ insuredValue: 20_000, estimatedRebuildCost: 60_000 }), lineOfBusiness: 'renters' }
        expect(underinsurance(renters)).toBeTruthy()
    })

    it('does not fire on a lapsed policy', () => {
        const lapsed = { ...home({ insuredValue: 100_000, estimatedRebuildCost: 200_000 }), status: 'expired' }
        expect(underinsurance(lapsed)).toBeUndefined()
    })
})

/**
 * The copy must describe the check that exists, not the one that was promised.
 */
describe('every surface describes the check the engine performs', () => {
    it('no source still claims a comparison against profile details', () => {
        const offenders: string[] = []
        for (const f of [...globSync('lib/**/*.ts'), ...globSync('components/**/*.tsx')]) {
            const src = strip(readFileSync(f, 'utf-8'))
            if (/square metres and the details in your profile|τετραγωνικά και τα στοιχεία που δίνεις/.test(src)) {
                offenders.push(f)
            }
        }
        expect(offenders, `stale capability claim in:\n${offenders.join('\n')}`).toEqual([])
    })

    it('the branch page states the real condition', () => {
        const src = strip(readFileSync('lib/insurance/content/home.ts', 'utf-8'))
        expect(src).toMatch(/when the policy states both a sum insured and a rebuild cost/)
        expect(src).toMatch(/όταν το ασφαλιστήριο αναφέρει και ασφαλισμένο κεφάλαιο και κόστος ανακατασκευής/)
    })

    it('the glossary no longer promises an unconditional flag', () => {
        const src = strip(readFileSync('lib/glossary/content.ts', 'utf-8'))
        expect(src).not.toMatch(/flags when the sum insured looks low relative to the property/)
        expect(src).not.toMatch(/helps you see if it looks under- or over-estimated/)
        expect(src).toMatch(/if the policy also states a rebuild cost/)
    })

    it('the guide drops "automatically" for the rebuild check', () => {
        const src = strip(readFileSync('lib/guides/content.ts', 'utf-8'))
        expect(src).not.toMatch(/επισημαίνει αυτόματα .*κεφάλαιο ανακατασκευής φαίνεται ανεπαρκές/)
        expect(src).toMatch(/εφόσον το έγγραφο αναφέρει και τα δύο ποσά/)
    })
})

/**
 * The two neighbouring portfolio rules carried the same child-branch assumption
 * — `normalizeBranch(...).id === "home"` is the CHILD's id, so a rented home was
 * invisible to the earthquake rule and a motorbike to the roadside one. They
 * survived the earlier sweep because it looked at the profile rules and the
 * score, not here. I reproduced the bug writing the underinsurance rule and this
 * suite caught it.
 */
describe('the neighbouring portfolio rules see child branches too', () => {
    const gaps = (p: any) =>
        evaluatePortfolioRules([p], { hasAgent: true, now: new Date('2026-07-24T09:00:00Z') })

    it('the earthquake rule sees a rented home', () => {
        const renters = {
            ...home({ earthquakeCoverageIncluded: false }),
            lineOfBusiness: 'renters',
        }
        expect(gaps(renters).some((g) => g.ruleId === 'home_no_earthquake')).toBe(true)
    })

    it('the roadside rule sees a motorbike', () => {
        const bike = {
            id: 'pol-2',
            lineOfBusiness: 'motorbike',
            status: 'active',
            insurerName: 'ΕΘΝΙΚΗ',
            policyNumber: 'M-1',
            startDate: new Date('2026-01-01'),
            endDate: new Date('2027-01-01'),
            acordData: { vehicle: { hasRoadsideAssistance: false } },
        }
        expect(gaps(bike).some((g) => g.ruleId === 'motor_no_roadside')).toBe(true)
    })

    it('no portfolio rule compares a raw line-of-business id any more', () => {
        const src = strip(readFileSync('lib/services/gap-engine/portfolio-rules.ts', 'utf-8'))
        expect(src).not.toMatch(/normalizeBranch\(p\.lineOfBusiness\)\.id [!=]==/)
        // The local helper moved to lib/insurance/taxonomy as branchFamilyId —
        // the module that owns the parent relationship — once the same question
        // turned out to be asked in six other files.
        expect(src).toMatch(/branchFamilyId\(p\.lineOfBusiness\)/)
        expect(src).toMatch(/from "@\/lib\/insurance\/taxonomy"/)
    })
})
