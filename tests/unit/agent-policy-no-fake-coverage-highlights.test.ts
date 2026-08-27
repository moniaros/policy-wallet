import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * The agent's per-customer policy detail page rendered a generic "Coverage
 * Highlights" block that showed the SAME two static items — with green
 * checkmarks — for every policy, regardless of what it actually covers:
 *   • "Standard Coverage · Full protection based on policy specifications"
 *   • "Direct Support · 24/7 assistance via insurer"
 * Neither was extracted from the policy; the 24/7-assistance line asserted cover
 * that many policies do not have — a fabricated coverage claim presented as fact
 * to the advisor. The real, policy-specific coverage (summary + AI-extracted
 * structured coverages + gap analysis) is shown below, so the filler was removed.
 *
 * KNOWN LIMIT, on the record (Phase 6 guard audit): this guard is keyed to the
 * exact retired translation keys on ONE named file — the same filler wired
 * under NEW keys, or on another surface, passes it. The audit swept the
 * translation catalogues for the filler under any key: the retired `pd.*` keys
 * are gone; `emergencyAssistance` ("24/7 emergency assistance via insurer")
 * still EXISTS in both catalogues but has no renderer — dead weight, not a
 * live claim. `no-overpromise-copy` separately pins `standardCoverageDesc`
 * ("Full protection…") out of both catalogues.
 */
const FILE = 'app/(protected)/customers/[id]/policy/[policyId]/page.tsx'
const SRC = readFileSync(FILE, 'utf-8')

/** The render markers of the fabricated block, exactly as they shipped. */
const FILLER_MARKERS = [
    /\{pd\.standardCoverage\b/,
    /\{pd\.standardCoverageDesc\b/,
    /\{pd\.directSupport\b/,
    /\{pd\.directSupportDesc\b/,
    /\{pd\.coverageHighlights\}/,
]

const fillerMarkersIn = (src: string) => FILLER_MARKERS.filter((re) => re.test(src))

describe('agent policy detail does not render fabricated coverage highlights', () => {
    it('renders none of the filler markers', () => {
        expect(fillerMarkersIn(SRC).map(String)).toEqual([])
    })
})

/**
 * RED-PROOF: the markers against the AUTHENTIC pre-fix block (8bb532e3~1,
 * verbatim) — all five must fire on it, and none on the post-fix page.
 */
describe('the markers are proven on the authentic pre-fix block', () => {
    const AUTHENTIC = `<div className="p-8">
    <h2 className="text-sm font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-6">{pd.coverageHighlights}</h2>
    <div>
        <p className="font-bold text-neutral-900 dark:text-neutral-100">{pd.standardCoverage}</p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{pd.standardCoverageDesc}</p>
    </div>
    <div>
        <p className="font-bold text-neutral-900 dark:text-neutral-100">{pd.directSupport}</p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{pd.directSupportDesc}</p>
    </div>
</div>`

    it('all five markers fire on the block that shipped', () => {
        expect(fillerMarkersIn(AUTHENTIC)).toHaveLength(5)
    })

    it('a mention of the KEY NAME without a render does not fire', () => {
        // `pd.standardCoverage` in prose (or a data access without a JSX
        // brace) is not the fabricated render.
        expect(fillerMarkersIn('// the retired pd.standardCoverage key')).toHaveLength(0)
        expect(fillerMarkersIn('const x = pd.directSupport')).toHaveLength(0)
    })
})
