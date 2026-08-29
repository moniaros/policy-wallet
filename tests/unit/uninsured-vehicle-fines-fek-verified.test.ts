import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { guides } from '@/lib/guides/content'

/**
 * REGRESSION-GUARD (labelled as such, per §0.2 of the run contract).
 *
 * This criterion was ALREADY SATISFIED when it was written. It cannot fail on
 * the pre-change code, because there was no change — so it is not evidence that
 * anything was fixed by this run, and it is reported separately from the
 * criteria that are.
 *
 * WHAT IT PINS, AND WHY THAT IS WORTH A FILE. `HALTS-GROWTH.md` recorded two
 * defects live on `/guides/prostimo-anasfalistou-oximatos` on 2026-08-26:
 *
 *   HALT-G04  fines published as €100/€150/€250 scaled by ENGINE SIZE, where
 *             ν.5113/2024 άρ.23 §1α sets €1,000/€500/€250 by VEHICLE CLASS.
 *             A passenger car understated by €350, on the page a reader
 *             consults precisely to find out what they owe.
 *   HALT-G02  the cross-check attributed to ΑΑΔΕ, where the verified reading
 *             assigns it to Γ.Γ.Π.Σ.Ψ.Δ. and the fine to Γ.Δ. Σ.Δ.Ο.Ε.
 *
 * Both were corrected between then and 2026-08-29 — verified in this source AND
 * on the live page, which is the check §0.2 demands: a grep that finds a comment
 * describing a removal has found the comment. The live page carries the three
 * correct figures and zero occurrences of «ΑΑΔΕ».
 *
 * A euro-denominated penalty is the most amendable kind of figure in the source
 * set — SRC-010's own `interval_note` puts its reverify at six months, the
 * shortest in the file, because these get revised inside unrelated fiscal bills.
 * So this is a number that has already been wrong once, on a public page, in the
 * direction that costs the reader money. It should not be able to drift back
 * without a test going red.
 *
 * THE CHECKER IS A PURE FUNCTION over article text, so the same code can be run
 * against the PRE-FIX wording. The PROBE block below does exactly that and
 * asserts it red — which is the only way a regression guard can be shown to work
 * at all, since the live corpus can never demonstrate it.
 */

/** ν.5113/2024 άρ.23 §1α, as quoted verbatim in SOURCES.md SRC-010. */
const FEK_FIGURES = [
    { euro: '1.000', who: 'λεωφορεία και τα φορτηγά δημόσιας χρήσης' },
    { euro: '500', who: 'επιβατηγά' },
    { euro: '250', who: 'δίκυκλα' },
] as const

/** The wording that was live and wrong. Kept as data, never as prose to grep. */
const RETIRED_FIGURES = ['100 ευρώ', '150 ευρώ'] as const

export interface FineTextVerdict {
    problems: string[]
}

/**
 * Judge one article's Greek body. Returns [] when the text states the ΦΕΚ
 * figures by vehicle class and makes no engine-size claim.
 */
export function judgeFineText(text: string): FineTextVerdict {
    const problems: string[] = []

    for (const { euro } of FEK_FIGURES) {
        if (!text.includes(`${euro} ευρώ`)) {
            problems.push(`the ΦΕΚ figure €${euro} is absent — SRC-010 sets it in ν.5113/2024 άρ.23 §1α`)
        }
    }

    for (const retired of RETIRED_FIGURES) {
        if (text.includes(retired)) {
            problems.push(
                `«${retired}» is back. It was published, it understated the liability, and it is not in the law.`
            )
        }
    }

    // The basis is the other half of HALT-G04 and the easier half to regress:
    // a figure can be right while the basis it is scaled by is wrong. Any
    // mention of κυβισμός is only acceptable as an explicit denial.
    const cubicMentions = [...text.matchAll(/[^.]*κυβισμ[^.]*\./g)].map((m) => m[0])
    for (const sentence of cubicMentions) {
        if (!/όχι\s+ανά\s+κυβισμ/.test(sentence)) {
            problems.push(
                `engine size is invoked without being denied: «${sentence.trim().slice(0, 90)}…». ` +
                    `The law scales by vehicle class.`
            )
        }
    }

    return { problems }
}

const ARTICLE_SLUG = 'prostimo-anasfalistou-oximatos'

function greekBodyOf(slug: string): string {
    const guide = guides.find((g) => g.slug === slug)
    if (!guide) throw new Error(`guide ${slug} not found — the corpus moved and this guard is stale`)
    // Serialise every Greek string the article renders, whatever its shape.
    return JSON.stringify(guide)
}

describe('REGRESSION-GUARD: the uninsured-vehicle fines stay ΦΕΚ-verified', () => {
    it('the article still exists in the corpus', () => {
        expect(guides.some((g) => g.slug === ARTICLE_SLUG)).toBe(true)
    })

    it('states the three ΦΕΚ figures, by vehicle class, with no engine-size basis', () => {
        const { problems } = judgeFineText(greekBodyOf(ARTICLE_SLUG))
        expect(problems, `\n  - ${problems.join('\n  - ')}\n`).toEqual([])
    })

    it('cites the article of the law the figures come from', () => {
        expect(greekBodyOf(ARTICLE_SLUG)).toMatch(/άρθρο 23 του ν\. 5113\/2024/)
    })

    it('SRC-010 still carries the verbatim excerpt those figures are read from', () => {
        // The figures and their evidence must not drift apart: a correct number
        // whose source entry has been edited away is a number nobody can check.
        const sources = readFileSync('docs/growth/SOURCES.md', 'utf-8')
        const block = sources.slice(sources.indexOf('### SRC-010'), sources.indexOf('### SRC-011'))
        expect(block, 'SRC-010 block not found in SOURCES.md').toBeTruthy()
        for (const { euro } of FEK_FIGURES) {
            expect(block, `SRC-010's excerpt no longer contains €${euro}`).toContain(euro)
        }
        expect(block).toMatch(/verified_at/)
        expect(block).toMatch(/reverify_after/)
    })

    it('attributes the fine to Σ.Δ.Ο.Ε., and nothing in the article says ΑΑΔΕ', () => {
        const body = greekBodyOf(ARTICLE_SLUG)
        expect(body, 'the Σ.Δ.Ο.Ε. attribution has gone').toMatch(/Σ\.Δ\.Ο\.Ε\./)
        // HALT-G02's defect, pinned. ΑΑΔΕ's role in this regime is road tax.
        expect(
            (body.match(/ΑΑΔΕ/g) ?? []).length,
            'ΑΑΔΕ is back in this article — HALT-G02, which was corrected'
        ).toBe(0)
    })
})

describe('PROBE — the checker has been seen to fail on the wording that was live', () => {
    /**
     * Verbatim shape of the pre-fix sentence, from HALT-G04's own record of what
     * was published. This is the only way this guard can be demonstrated red:
     * the live corpus is already correct, so nothing in it can turn it.
     */
    const PRE_FIX = 'παράβολο κλιμακούμενο με τον κυβισμό — ενδεικτικά 100 ευρώ για δίκυκλα, ' +
        '150 ευρώ για επιβατικά μικρά και 250 ευρώ για μεγαλύτερα.'

    it('the published wording fails on every count it should', () => {
        const { problems } = judgeFineText(PRE_FIX)
        const joined = problems.join(' | ')
        expect(problems.length).toBeGreaterThanOrEqual(4)
        expect(joined).toMatch(/€1\.000 is absent/)
        expect(joined).toMatch(/€500 is absent/)
        expect(joined).toMatch(/«100 ευρώ» is back/)
        expect(joined).toMatch(/«150 ευρώ» is back/)
        expect(joined).toMatch(/engine size is invoked without being denied/)
    })

    it('the corrected wording passes, so the probe is not red unconditionally', () => {
        const FIXED = 'κλιμακούμενο ανά κατηγορία οχήματος και όχι ανά κυβισμό: 250 ευρώ για τα ' +
            'δίκυκλα, 500 ευρώ για τα επιβατηγά και κάθε άλλο όχημα, και 1.000 ευρώ για τα ' +
            'λεωφορεία και τα φορτηγά δημόσιας χρήσης.'
        expect(judgeFineText(FIXED).problems).toEqual([])
    })

    it('a right figure with a wrong basis is still caught', () => {
        // The half of HALT-G04 that is easiest to regress on its own.
        const HALF = '250 ευρώ, 500 ευρώ και 1.000 ευρώ, κλιμακούμενα ανά κυβισμό του οχήματος.'
        expect(judgeFineText(HALF).problems.join(' ')).toMatch(/engine size is invoked/)
    })
})
