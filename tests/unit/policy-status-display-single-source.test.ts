import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { globSync } from '../helpers/glob'

/**
 * No B2C surface derives a policy status outside getPolicyStatusView /
 * resolvePolicyLifecycle.
 *
 * Two pipelines that agree today drift again — that is not a hypothesis, it is
 * this product's record. `lib/wallet/map-policy-card-status.ts` (deleted, P1-10)
 * began as two byte-identical copies, one per route, dividing milliseconds; the
 * clock was fixed, but its VOCABULARY had already drifted: it had no 'expired'
 * state, so a lapsed policy read «Απαιτείται ενέργεια» on Σύμβουλος while the
 * wallet said «Ληγμένο» about the same policy on the same day. Before that,
 * MobilePolicyCard's `getStatusConfig` read the raw stored status and fell back
 * to green, painting an expired policy as a red alarm on one breakpoint and
 * green on another.
 *
 * This guard is NEW rather than an extension, deliberately:
 *   - tests/unit/live-policy-status-filter.test.ts guards which ROWS a Prisma
 *     query admits — data selection, a different invariant with a different
 *     universe (where-clauses) and different exemption semantics.
 *   - tests/unit/policy-status-view.test.ts pins the pipeline's BEHAVIOUR, not
 *     its exclusivity.
 * It is the policy-status sibling of gap-severity-display-single-source.test.ts,
 * which does the same job for severity.
 *
 * Two signatures, each proven against committed probe fixtures:
 *   A. threshold derivation — day arithmetic plus PRODUCTION of a status verdict
 *      literal ('expiring_soon' | 'expired' | 'action_needed') in one file. The
 *      map-policy-card-status shape.
 *   B. a hand-rolled status→presentation map — an object keyed by active: /
 *      expiring_soon: / expired: outside the sanctioned modules. The
 *      getStatusConfig shape.
 *
 * Known, accepted blind spots (documented so silence is not mistaken for proof):
 *   - a derivation split across two files (arithmetic here, literals there)
 *     evades signature A; the import seam usually trips signature B instead.
 *   - a ternary whose ONLY production context is an else-branch (`: 'expired'`)
 *     is not matched — that colon is indistinguishable from a type annotation
 *     at this level of parsing.
 *   - template-literal interpolation is not parsed.
 */

const STATUS_VERDICTS = 'expiring_soon|expired|action_needed'

/** Strip block comments and line comments (https:// survives). */
function stripComments(src: string): string {
    return src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^[ \t]*\/\/.*$/gm, '')
        .replace(/([^:'"`])\/\/[^\n]*$/gm, '$1')
}

const DAY_ARITHMETIC = [
    /\bcalendarDaysUntil\s*\(/,
    /86[_]?400[_]?000/,
    /1000\s*\*\s*60\s*\*\s*60\s*\*\s*24/,
    /24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/,
]

/**
 * A status verdict literal being PRODUCED — returned, assigned, yielded by a
 * ternary's then-branch, or written to a `status:` field. Comparisons
 * (`=== 'expired'`, `case 'expired':`) do not match: comparing to the
 * vocabulary is fine, minting it is not.
 */
const PRODUCES_VERDICT = new RegExp(
    `(?:\\breturn\\s+|\\?\\s*|(?<![=!<>])=\\s*|=>\\s*|\\bstatus\\s*:\\s*)(['"])(${STATUS_VERDICTS})\\1`
)

/** Word in object-KEY position: not `.expired` (property access), colon on the
 *  same line, whitespace after it (excludes Tailwind's `active:scale-95`). */
const keyPosition = (word: string) => new RegExp(`(?<!\\.)\\b${word}[ \\t]*:[ \\t]`)
const MAP_KEYS = [keyPosition('expired'), keyPosition('expiring_?[sS]oon'), keyPosition('active')]

function derivesByThreshold(src: string): boolean {
    return DAY_ARITHMETIC.some((re) => re.test(src)) && PRODUCES_VERDICT.test(src)
}

function handRollsStatusMap(src: string): boolean {
    return MAP_KEYS.every((re) => re.test(src))
}

// ─────────────────────────────────────────────────────────────────────────────
// Exemptions. Every entry is a file NAMED with a reason — never a path glob
// (§12.4: agent/admin surfaces are read but exempted individually). Presence is
// the ratchet: an exempted file that stops tripping fails as stale, so a fix
// cannot silently regress.
// ─────────────────────────────────────────────────────────────────────────────

const THRESHOLD_EXEMPTIONS: Record<string, string> = {
    'lib/policy-status.ts':
        'THE canonical resolver — the module the invariant points everything at.',
    'app/api/v1/jobs/privacy-retention/route.ts':
        'status: "expired" here is a DataExportRequest (DSR download) lifecycle, not a ' +
        'policy; the day arithmetic is GDPR retention windows.',
    'components/wallet/coverage-details/MotorCoverageDetails.tsx':
        'Green Card validity — a per-document border fact resolvePolicyLifecycle does ' +
        'not model. Counts days through the sanctioned calendarDaysUntil and carries ' +
        'its own behavioural guard (the Green Card block in policy-card-status.test.ts).',
}

const MAP_EXEMPTIONS: Record<string, string> = {
    'lib/policy-status.ts':
        'Canonical getStatusLabel / getStatusColor maps, pinned word-for-word to ' +
        't.policyStatus by policy-status-wording.test.ts.',
    'lib/wallet/policy-status-view.ts':
        'THE display pipeline — STATUS_TONE / STATUS_I18N_KEY are the single source ' +
        'every surface must use.',
    'lib/i18n/translations/el.ts':
        'Vocabulary, not derivation — the words themselves live here.',
    'lib/i18n/translations/en.ts':
        'Vocabulary, not derivation — the words themselves live here.',
    'components/branches/BranchDetail.tsx':
        'DEBT (found by this guard’s first enumeration, P1-10, then extracted verbatim ' +
        'from app/(protected)/branches/[branch]/page.tsx in V2-P2-01 so /protection/[branch] ' +
        'shares it): the status KEY comes from effectivePolicyStatus (sanctioned), but the ' +
        'component duplicates the status→translation-key bridge policy-status-view keeps ' +
        'private. Migrating to getPolicyStatusView is tidying, not a truth fix — the ' +
        'derivation is compliant.',
    'components/agent/tabs/ClientPoliciesTab.tsx':
        '§12.4 agent-facing surface, exempted BY NAME per the run rule. The key ' +
        'arrives lifecycle-derived (customer.service.ts effectivePolicyStatus) but the ' +
        'label+colour maps are hand-rolled duplicates. Migrate in an agent-scoped task.',
}

// ─────────────────────────────────────────────────────────────────────────────
// The guard proper.
// ─────────────────────────────────────────────────────────────────────────────

describe('no surface derives a policy status outside the single pipeline', () => {
    const files = [
        ...globSync('app/**/*.{ts,tsx}'),
        ...globSync('components/**/*.{ts,tsx}'),
        ...globSync('lib/**/*.{ts,tsx}'),
    ].filter((f) => !/\.(test|spec)\.[tj]sx?$/.test(f) && !f.endsWith('.d.ts')).sort()

    const sources = files.map((file) => ({ file, src: stripComments(readFileSync(file, 'utf-8')) }))

    it('enumerates a real universe (a broken glob must fail loudly, not pass emptily)', () => {
        expect(files.length).toBeGreaterThan(1000)
        for (const known of [
            'app/(protected)/agent/page.tsx', // the P1-10 offender's call site
            'app/(protected)/wallet/page.tsx',
            'components/wallet/PolicyCard.tsx',
            'components/ui/StatusPill.tsx',
            'lib/wallet/policy-status-view.ts',
            'lib/policy-status.ts',
        ]) {
            expect(files, `universe must include ${known}`).toContain(known)
        }
    })

    it('the deleted second pipeline stays deleted', () => {
        expect(
            existsSync('lib/wallet/map-policy-card-status.ts'),
            'lib/wallet/map-policy-card-status.ts is back. Its whole vocabulary lives in ' +
            'getPolicyStatusView now — including the expired state it never had. Delete it ' +
            'and derive through the pipeline.'
        ).toBe(false)
    })

    const enforce = (
        matcher: (src: string) => boolean,
        exemptions: Record<string, string>,
        label: string,
        fix: string,
    ) => {
        const hits = sources.filter(({ src }) => matcher(src)).map(({ file }) => file)
        const offenders = hits.filter((f) => !(f in exemptions))
        const stale = Object.keys(exemptions).filter((f) => !hits.includes(f))

        expect(
            offenders,
            `These ${label}. ${fix}\nOr add a BY-NAME exemption with a written reason ` +
            `(§12.4 surfaces too — never a path glob):\n  ${offenders.join('\n  ')}`
        ).toEqual([])

        expect(
            stale,
            `Stale exemptions — these no longer trip the matcher. Delete their entries so ` +
            `the fix cannot silently regress:\n  ${stale.join('\n  ')}`
        ).toEqual([])
    }

    it('no file combines day arithmetic with minting a status verdict literal', () => {
        enforce(
            derivesByThreshold,
            THRESHOLD_EXEMPTIONS,
            'compute days-until and mint a status verdict from a threshold — a second lifecycle pipeline',
            'Derive through resolvePolicyLifecycle / getPolicyStatusView (lib/policy-status, lib/wallet/policy-status-view).'
        )
    })

    it('no file keeps a hand-rolled status→presentation map', () => {
        enforce(
            handRollsStatusMap,
            MAP_EXEMPTIONS,
            'map active/expiring_soon/expired to presentation locally — the shape that once rendered one policy in three colours',
            'Take tone, label and classes from getPolicyStatusView / StatusPill.'
        )
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// Probe fixtures: the matcher proven red AND proven honest against committed
// files (CLAUDE.md: "a guard without a probe in the repo is not a guard").
// ─────────────────────────────────────────────────────────────────────────────

describe('the scanner is proven against committed probes', () => {
    const probe = (name: string) =>
        stripComments(readFileSync(`tests/fixtures/guard-probes/${name}`, 'utf-8'))

    it('flags the exact source of the pipeline this guard exists to bury', () => {
        // The fixture IS lib/wallet/map-policy-card-status.ts as deleted in P1-10 —
        // the strongest probe available: the guard must stay red on the very code
        // whose removal it protects.
        const src = probe('policy-status-second-pipeline.ts.txt')
        expect(derivesByThreshold(src)).toBe(true)
    })

    it('flags a hand-rolled status→tone map (the getStatusConfig shape)', () => {
        expect(handRollsStatusMap(probe('policy-status-handrolled-tone-map.tsx.txt'))).toBe(true)
    })

    it('does NOT flag a compliant surface full of near-miss shapes', () => {
        const src = probe('policy-status-compliant-surface.tsx.txt')
        // The probe genuinely contains the dangerous tokens in comparison/variant
        // positions — otherwise this would prove nothing about discrimination.
        expect(src).toMatch(/=== 'expired'/)
        expect(src).toMatch(/active:scale-95/)
        expect(src).toMatch(/calendarDaysUntil/)
        expect(derivesByThreshold(src)).toBe(false)
        expect(handRollsStatusMap(src)).toBe(false)
    })

    it('ignores mentions inside comments', () => {
        const commented = `
            // return 'expired' if calendarDaysUntil(end, now) < 0
            /* const TONE = { active: 'x', expiring_soon: 'y', expired: 'z' } */
            export {}
        `
        expect(derivesByThreshold(stripComments(commented))).toBe(false)
        expect(handRollsStatusMap(stripComments(commented))).toBe(false)
    })
})
