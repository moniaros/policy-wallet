import { describe, expect, it } from 'vitest'
import { publicPricingContent } from '@/lib/pricing/public-pricing-content'
import { DEFAULT_ENTITLEMENT_LIMITS } from '@/lib/pricing/plan-defaults'
import { FEATURE_GATES } from '@/lib/monetization/feature-gates'

/**
 * The parity test that did not exist — and its absence is how /pricing came to
 * contradict itself on one screen.
 *
 * `public-pricing-content.ts` is a git-tracked file with no code path tying it
 * to `plan-defaults.ts` or the DB entitlements JSON. The comparison table
 * matched the enforced limits by authoring discipline and a comment; the plan
 * cards did not, and nothing failed. The Free card advertised gap detection
 * (enforced: `gapAnalysisPerDay: 0`), the Plus card advertised gap & duplicate
 * detection, and the table below both said Family-only.
 *
 * THE DECIDED TRUTH THIS ASSERTS (D1 as amended 2026-08-30):
 *   - GAP detection is Family: `gapAnalysisPerDay` 0 / 0 / unlimited is the
 *     enforced gate, and no cheaper card may claim it.
 *   - DUPLICATE detection is UNGATED: it runs for every plan, and the only
 *     limit is the ceiling — the plan's policy count (3 / 10 / 25) bounds the
 *     comparison set at upload. There is deliberately no `FEATURE_GATES` entry:
 *     the old `duplicate_coverage_detection` declaration said `pro`, was never
 *     enforced anywhere, and misdescribed the product. Deleted, and the
 *     deletion is pinned here so it cannot quietly return as a paywall.
 *   - The CEILING ITSELF is asserted (the "limit as well as the gate"): each
 *     card's headline policy count must equal the enforced `policies` limit.
 *
 * Scope note, verified in code before this was written: duplicate detection
 * fires only where two documents name the SAME insured subject — a plate, an
 * address, a pet, a vessel (`policyAssetSubjectKey`). Health, life, cyber,
 * business and pension have no subject and are never compared, so no copy may
 * claim household-wide or cross-person duplicate detection on any tier.
 */

const content = publicPricingContent.policyholder
const plans = Object.fromEntries(content.plans.map((p) => [p.key, p]))

const featureText = (planKey: string) =>
    plans[planKey].features.map((f) => `${f.label.el} ${f.label.en}`).join(' | ')

const GAP_WORDING = /κενών|gap/i
const DUP_WORDING = /διπλών|διπλές|duplicate/i

describe('the pricing page states the enforced truth — gap gate, duplicate non-gate, and the ceiling', () => {
    it('the three consumer plans exist', () => {
        expect(Object.keys(plans).sort()).toEqual(['free', 'plus', 'pro'])
    })

    it('each card headline count equals the enforced policy ceiling', () => {
        for (const [key, limits] of Object.entries(DEFAULT_ENTITLEMENT_LIMITS)) {
            if (!(key in plans)) continue
            expect(
                featureText(key),
                `${key} card must state its enforced ceiling of ${limits.policies}`
            ).toMatch(new RegExp(`${limits.policies} ασφαλιστήρια`))
        }
    })

    it('no card below Family claims gap detection, and Family claims it', () => {
        expect(DEFAULT_ENTITLEMENT_LIMITS.free.gapAnalysisPerDay).toBe(0)
        expect(DEFAULT_ENTITLEMENT_LIMITS.plus.gapAnalysisPerDay).toBe(0)
        expect(DEFAULT_ENTITLEMENT_LIMITS.pro.gapAnalysisPerDay).toBeNull()
        for (const key of ['free', 'plus'] as const) {
            const offending = plans[key].features.filter(
                (f) => f.included && GAP_WORDING.test(`${f.label.el} ${f.label.en}`)
            )
            expect(
                offending.map((f) => f.label.el),
                `${key} card advertises gap detection, which is enforced Family-only`
            ).toEqual([])
        }
        expect(featureText('pro')).toMatch(GAP_WORDING)
    })

    it('duplicate detection appears with no tier qualifier — it is ungated, bounded only by the ceiling', () => {
        // Present and included on every card…
        for (const key of ['free', 'plus', 'pro'] as const) {
            const dup = plans[key].features.find((f) => DUP_WORDING.test(`${f.label.el} ${f.label.en}`))
            expect(dup, `${key} card must state duplicate detection`).toBeDefined()
            expect(dup!.included, `${key} card must include it`).toBe(true)
        }
        // …and the comparison table row is true for all three.
        const dupRow = content.comparisonRows.find(
            (r) => DUP_WORDING.test(`${r.name.el} ${r.name.en}`) && !GAP_WORDING.test(`${r.name.el} ${r.name.en}`)
        )
        expect(dupRow, 'the table needs a duplicate-only row — a combined gap-&-duplicate row forces one half to lie').toBeDefined()
        expect(dupRow!.values).toEqual({ free: true, plus: true, pro: true })
    })

    it('the gap table row is Family-only', () => {
        const gapRow = content.comparisonRows.find(
            (r) => GAP_WORDING.test(r.name.el) && !DUP_WORDING.test(r.name.el)
        )
        expect(gapRow, 'the table needs a gap-only row').toBeDefined()
        expect(gapRow!.values).toEqual({ free: false, plus: false, pro: true })
    })

    it('the claims-guide paywall stays deleted — the guide is on every plan (PW-CONTENT-02)', () => {
        expect('claims_preparation_assistant' in FEATURE_GATES, 'claims_preparation_assistant returned: ClaimsGuidanceCard renders for every plan').toBe(false)
    })

    it('the deleted paywall declaration stays deleted', () => {
        expect(
            'duplicate_coverage_detection' in FEATURE_GATES,
            'duplicate_coverage_detection returned to FEATURE_GATES — it was deleted by decision ' +
                '(D1 as amended 2026-08-30): the capability runs for every plan, and a declared-but-' +
                'unenforced paywall is a false claim waiting for a renderer'
        ).toBe(false)
    })
})

/**
 * PW-CONTENT-02 — the ENTITLEMENT-CLAIM guard (build item 1, amendment A1).
 *
 * The cards and tables above were checked for gap/duplicate wording and the
 * policy ceiling only. On 2026-10-21 twelve of the thirty-eight capability
 * statements the public site makes were false against enforced code, in rows
 * this file never looked at: «Πλήρης ανάλυση AI» ✓ on Free and Plus, Agent Pro
 * «200» analyses (enforced 150) beside a card that said 150, Free «Υπενθυμίσεις
 * ανανέωσης ✗» (it gets the 30-day email). A guard that lists the rows it knows
 * about guards those rows, so this one ENUMERATES: every feature and every
 * comparison row of both audiences must carry a `claim` key, and what the page
 * renders for each tier must equal `planClaim()` — derived from plan-defaults
 * and the feature gates, never from a literal tier name.
 *
 * A1 extends it to IN-APP strings: the translation bundles may not promise a
 * free full analysis, because nothing grants it (`users.trial_analysis_used_at`
 * is never written; the orchestrator refuses Free). Decision H-019: public and
 * in-app copy state what the code enforces.
 *
 * Probe: tests/fixtures/guard-probes/entitlement-claim-false.json (and
 * entitlement-claim-in-app.ts.txt) — the self-checks below run the SAME
 * detectors over them and require red.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { planClaim, UNSTATED, isAgentClaim, type ClaimKey, type ClaimValue } from '@/lib/marketing/plan-claims'
import type { AgentTier, PlanTier } from '@/types/subscription-entitlements'

type Loc = { el: string; en: string }
type Cell = boolean | string | Loc
type Feature = { claim?: ClaimKey | null; label: Loc; included: boolean }
type Row = { claim?: ClaimKey | null; name: Loc; values: Record<string, Cell> }
type Audience = { plans: { key: string; features: Feature[] }[]; comparisonRows: Row[] }

const TIER_OF_KEY: Record<string, PlanTier | AgentTier> = {
    free: 'free', plus: 'plus', pro: 'pro',
    'agent-free': 'agent_free', 'agent-starter': 'agent_starter', 'agent-pro': 'agent_pro', 'agent-agency': 'agency',
}

/** A label that states a capability but is deliberately not tied to one enforced field. Each needs a reason. */
const UNTAGGED_OK: Record<string, string> = {
    'Υποστήριξη μέσω email': 'support is email only, on every plan (owner decision 2026-10-22); no entitlement field',
}

/**
 * The words a label must contain to carry a given claim tag. Without this the guard trusted the
 * author's tag: relabel the `basicSummary` line «Πλήρης ανάλυση AI» and it stayed green (review I4).
 */
const plain = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
/** Written accent-free and lower-case: labels are compared through `plain()`. */
const KEYWORDS: Record<ClaimKey, RegExp> = {
    policies: /ασφαλιστηρ|polic/, basicSummary: /συνοψη|summary/, deepAnalysis: /αναλυση ai|ai analysis/,
    gapDetection: /κενων|gap/, duplicateDetection: /διπλων|duplicate/, renewalEmail30: /υπενθυμιση|reminder/,
    renewalLadder: /υπενθυμισεις|reminders/, interactiveQA: /ερωτησεις|q&a/, reportExport: /αναφορας|report/,
    advisorCollaboration: /συμβουλο|advisor/, multiInsurerInsights: /ασφαλιστικες|insurers/, exclusions: /εξαιρεσ|exclusion/,
    renewalDate: /ανανεωσης|renewal/, 'agent.clients': /πελατ|client/, 'agent.analysesPerMonth': /αναλυσεις|analyses/,
    'agent.bulkImportRows': /μαζι|εισαγωγη|γραμμες|import|rows|at once/, 'agent.teamMembers': /ομαδα|team|μελη/,
    'agent.questionnaireTemplates': /ερωτηματολογια|questionnaire/, 'agent.renewalAutomation': /ανανεωσης|renewal/,
'agent.commissionTracking': /προμηθειων|commission/,
    'agent.crossSellIntelligence': /καλυψης|cover/, 'agent.expiryList': /ληγει|running out|ληξ/, 'agent.clientScreen': /πελατ|client/,
}
/**
 * Claims that are TRUE ON EVERY PLAN cannot be checked by comparing a rendered flag with planClaim()
 * (a false line tagged with one of them stays true). So each may carry ONLY its own label, anchored:
 * relabel a Free-card line «Υπενθυμίσεις ανανέωσης από 90 έως 3 ημέρες πριν» as `renewalDate` and it fails.
 */
const EXACT_LABELS: Partial<Record<ClaimKey, RegExp>> = {
    basicSummary: /^(βασικη συνοψη ασφαλιστηριου|basic policy summary)$/,
    duplicateDetection: /^(εντοπισμος διπλων καλυψεων|duplicate-cover detection)$/,
    renewalEmail30: /^(υπενθυμιση ανανεωσης 30 ημερες πριν \(email\)|renewal reminder 30 days ahead \(email\))$/,
    renewalDate: /^(ημερομηνια ανανεωσης|renewal date)$/,
    exclusions: /^(εμφανιση εξαιρεσεων|exclusions shown)$/,
    multiInsurerInsights: /^(ανεφικτο|unavailable)$/, // no implementation: no line may carry it
    'agent.expiryList': /^(λιστα με ο,τι ληγει|a list of what is running out)$/,
    'agent.clientScreen': /^(βασικη εικονα πελατων|ολοι οι πελατες σε μια οθονη|basic client view|every client on one screen)$/,
}
const labelIsExact = (key: ClaimKey, text: string) => !EXACT_LABELS[key] || EXACT_LABELS[key]!.test(plain(text))
const claimText = (v: ClaimValue) => String(v)
const hasNumber = (text: string, n: number) => new RegExp(`(?<![\\d.,])${n}(?![\\d.,])`).test(text)
const UNLIMITED = /Απεριόριστ|Unlimited/i
const cellText = (c: Cell): string => (typeof c === 'string' ? c : typeof c === 'boolean' ? String(c) : `${c.el} ${c.en}`)

function claimOffenders(audience: Audience): string[] {
    const bad: string[] = []
    for (const plan of audience.plans) {
        const tier = TIER_OF_KEY[plan.key]
        for (const f of plan.features) {
            const where = `card ${plan.key} «${f.label.el}»`
            if (f.claim === undefined) { bad.push(`${where}: no \`claim\` tag`); continue }
            if (f.claim === null) {
                if (!(f.label.el in UNTAGGED_OK)) bad.push(`${where}: claim:null needs an UNTAGGED_OK reason`)
                continue
            }
            if (!labelIsExact(f.claim, f.label.el) || !labelIsExact(f.claim, f.label.en)) bad.push(`${where}: an always-true claim (${f.claim}) may carry only its own label`)
            if (!KEYWORDS[f.claim].test(plain(f.label.el)) || !KEYWORDS[f.claim].test(plain(f.label.en))) bad.push(`${where}: the label does not say what the \`${f.claim}\` tag claims`)
            const v = planClaim(f.claim as never, tier as never)
            if (v === UNSTATED) bad.push(`${where}: the plan's ${f.claim} is not stated for this tier — the line must go`)
            else if (typeof v === 'boolean') { if (f.included !== v) bad.push(`${where}: renders included=${f.included}, code says ${claimText(v)} (${f.claim})`) }
            else if (v === null) { if (!f.included || !UNLIMITED.test(`${f.label.el} ${f.label.en}`)) bad.push(`${where}: code says unlimited (${f.claim})`) }
            else if (!f.included || !hasNumber(f.label.el, v) || !hasNumber(f.label.en, v)) bad.push(`${where}: code says ${v} (${f.claim}), label does not`)
        }
    }
    for (const row of audience.comparisonRows) {
        const where = `row «${row.name.el}»`
        if (row.claim === undefined) { bad.push(`${where}: no \`claim\` tag`); continue }
        if (row.claim === null) { if (!(row.name.el in UNTAGGED_OK)) bad.push(`${where}: claim:null needs an UNTAGGED_OK reason`); continue }
        if (!labelIsExact(row.claim, row.name.el) || !labelIsExact(row.claim, row.name.en)) bad.push(`${where}: an always-true claim (${row.claim}) may carry only its own label`)
        if (!KEYWORDS[row.claim].test(plain(row.name.el)) || !KEYWORDS[row.claim].test(plain(row.name.en))) bad.push(`${where}: the row name does not say what the \`${row.claim}\` tag claims`)
        for (const [key, cell] of Object.entries(row.values)) {
            const tier = TIER_OF_KEY[key]
            const v = planClaim(row.claim as never, tier as never)
            const t = cellText(cell)
            if (v === UNSTATED) { if (cell !== '—') bad.push(`${where} / ${key}: renders «${t}», code leaves it unstated (must be «—»)`) }
            else if (typeof v === 'boolean') { if (cell !== v) bad.push(`${where} / ${key}: renders ${t}, code says ${v} (${row.claim})`) }
            else if (v === null) { if (typeof cell === 'boolean' ? !cell : !UNLIMITED.test(t)) bad.push(`${where} / ${key}: renders «${t}», code says unlimited (${row.claim})`) }
            else if (typeof cell === 'boolean') { if (cell !== v > 0) bad.push(`${where} / ${key}: renders ${t}, code says ${v} (${row.claim})`) }
            else if (!hasNumber(t, v)) bad.push(`${where} / ${key}: renders «${t}», code says ${v} (${row.claim})`)
        }
    }
    return bad
}

describe('PW-CONTENT-02 — every public capability claim equals what the code enforces', () => {
    it.each(['policyholder', 'agent'] as const)('%s pricing: tags present and every rendered value equals planClaim()', (audience) => {
        const bad = claimOffenders(publicPricingContent[audience] as unknown as Audience)
        expect(bad, `public pricing states what the code does not enforce:\n${bad.join('\n')}`).toEqual([])
    })

    it('probe: the detector turns red on a false pricing table (Agent Pro «200», Free «Πλήρης ανάλυση AI» ✓, an untagged line)', () => {
        const probe = JSON.parse(readFileSync('tests/fixtures/guard-probes/entitlement-claim-false.json', 'utf-8'))
        const agent = claimOffenders({ plans: probe.agent.plans, comparisonRows: probe.agent.comparisonRows }).join('\n')
        const ph = claimOffenders({ plans: probe.policyholder.plans, comparisonRows: probe.policyholder.comparisonRows }).join('\n')
        expect(agent).toMatch(/agent-pro: renders «200», code says 150/)
        expect(agent).toMatch(/agent-agency: renders «Απεριόριστες Unlimited», code says 400/)
        expect(ph).toMatch(/card free «Πλήρης ανάλυση AI»: renders included=true, code says false/)
        expect(ph).toMatch(/no `claim` tag/)
        expect(ph).toMatch(/the label does not say what the `basicSummary` tag claims/)
        expect(ph).toMatch(/always-true claim \(renewalDate\) may carry only its own label/)
        expect(agent).toMatch(/always-true claim \(agent.clientScreen\) may carry only its own label/)
    })

    it('every claim key a page uses is a real key (an agent key on an agent plan, a B2C key on a B2C plan)', () => {
        for (const audience of ['policyholder', 'agent'] as const) {
            const content = publicPricingContent[audience] as unknown as Audience
            for (const plan of content.plans) for (const f of plan.features) {
                if (f.claim) expect(isAgentClaim(f.claim), `${plan.key} «${f.label.el}»`).toBe(audience === 'agent')
            }
        }
    })
})

/** In-app strings (A1): a promise nothing grants. Enumerated from the filesystem, not from two known files. */
const IN_APP_ROOTS = ['app', 'components', 'lib']
// In-app promises of full analysis below Family, or of unlimited analyses, that the code does not grant (review I7).
const IN_APP_BANNED = /πρώτη πλήρης ανάλυση είναι δωρεάν|first full analysis is free|Full AI analysis is a Plus feature|διαθέσιμη σε Plus\/Pro|available on Plus\/Pro|Οι αναλύσεις είναι απεριόριστες σε κάθε πλάνο|Analyses are unlimited on every plan|3 ασφαλιστήρια με πλήρη ανάλυση|3 policies with the full AI analysis|Απεριόριστες αναλύσεις|Unlimited (document |AI )?analyses|Απεριόριστες AI αναλύσεις|δεν περιλαμβάνει αναλύσεις AI|\d+M tokens\/(μήνα|month)|Αποκλειστική υποστήριξη|Dedicated support|upgrade or downgrade|υποβαθμίσετε|δυνατότητα του Plus|περιλαμβάνονται στο Plus|προτεραιότητα υποστήριξης|[Pp]riority support|Υποστήριξη προτεραιότητας|with Plus or Pro|Απεριόριστα ασφαλιστήρια(?! στο πορτοφόλι)|Unlimited policies(?! in your wallet)|Digital wallet integration|Branded emails|Επώνυμα emails|Portfolio gap view(?! is available on the Family)|available on Plus and Pro|διαθέσιμη στα Plus και Pro|(Savings report export|Portfolio export) is available on Pro plans|(ανάλυση AI|AI analysis)[^.\n]{0,30}(σε όλα τα πλάνα|on every plan)|free trial analysis|(εξαγωγή|export|report|αναφορ|κενά|gaps?|portfolio|sharing|κοινοποίηση|πλήρης ανάλυση|full (AI )?analysis)[^.\n]{0,60}(paid plans?|πληρωμένα πλάνα|επί πληρωμή πλάνα)|(από το|from|with|στο) Plus[^.\n]{0,40}(πλήρη ανάλυση|full analysis)|(Αναβαθμίστε|Upgrade) (σε|to) Plus[^.\n]{0,30}(πλήρη|full)|full (AI )?analysis is (included|available) (with|from) Plus|διαθέσιμη από το Plus|Plus includes (the )?full|Με το Plus έχετε (την )?πλήρη|Priority analysis queue|Προτεραιότητα στην ανάλυση|Οι αναλύσεις σας τρέχουν πρώτες|Your analyses run first|(ερωτήσεις|questions|Q&A|εξαγωγή αναφοράς|report export|συνεργασία|collaboration|messaging)[^.\n]{0,70}(περιλαμβάν\S*|διαθέσιμ\S*|included|available)\s+(με το|με|στο|with|on|in)\s+Plus\b|(\bAI\b|ανάλυση|ερωτήσεις|questions|analysis|collaboration|συνεργασία)[^.\n]{0,60}(paid plans?|πληρωμένα πλάνα|επί πληρωμή πλάνα|συνδρομητικά πλάνα)|υποχρεωτική για τα σκάφη|Υποχρεωτική για σκάφη αναψυχής|υποχρεωτική για σκάφη αναψυχής|Compulsory for recreational craft|compulsory for recreational craft|compulsory for (pleasure|recreational) craft|Pre-renewal checklist|Λίστα ελέγχου πριν την ανανέωση|(πλήρης ανάλυση|ανάλυση κενών|full (ai )?analysis|gap (detection|analysis)|gaps?)[^.\n]{0,60}(είναι δυνατότητα του|περιλαμβάν\S* στο|διαθέσιμη (με το|στο)|is a|unlocks (on|with)|included (in|on))\s+Plus\b|ουρά ανάλυσης \(Plus\)|analysis queue \(Plus\)/i
function inAppFiles(dir: string): string[] {
    if (!existsSync(dir)) return []
    return readdirSync(dir).flatMap((name) => {
        const p = join(dir, name)
        if (/(^|\/)(node_modules|\.next)\//.test(p + '/')) return []
        if (statSync(p).isDirectory()) return inAppFiles(p)
        return /\.tsx?$/.test(name) ? [p] : []
    })
}
function inAppOffenders(files: { path: string; text: string }[]): string[] {
    const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, '')).replace(/^[ \t]*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, (m) => m.replace(/[^\n]/g, ''))
    return files.flatMap((f) => strip(f.text).split('\n').flatMap((line, i) => (IN_APP_BANNED.test(line) ? [`${f.path}:${i + 1}  ${line.trim().slice(0, 100)}`] : [])))
}

describe('PW-CONTENT-02 A1 — no in-app string promises a free full analysis (H-019: Family only until PW-ENTITLE-01)', () => {
    it('no source file under app/, components/ or lib/ carries the promise', () => {
        const files = IN_APP_ROOTS.flatMap(inAppFiles).map((path) => ({ path, text: readFileSync(path, 'utf-8') }))
        const bad = inAppOffenders(files)
        expect(bad, `an unbacked promise is back:\n${bad.join('\n')}`).toEqual([])
    })
    it('probe: the detector turns red on every probe line — Greek forms included', () => {
        const probe = readFileSync('tests/fixtures/guard-probes/entitlement-claim-in-app.ts.txt', 'utf-8')
        const found = inAppOffenders([{ path: 'probe', text: probe }]).join('\n')
        for (const needle of ['Η πρώτη πλήρης ανάλυση είναι δωρεάν', 'Απεριόριστες αναλύσεις εγγράφων', 'δεν περιλαμβάνει αναλύσεις AI', 'Unlimited AI analyses', 'tokens/month', 'Dedicated support', 'upgrade or downgrade', 'δυνατότητα του Plus', 'προτεραιότητα υποστήριξης', 'Απεριόριστα ασφαλιστήρια', 'Digital wallet integration', 'Υποστήριξη προτεραιότητας', 'analysis queue (Plus)', 'διαθέσιμη στα Plus και Pro', 'περιλαμβάνεται στο Plus', 'is a Plus feature', 'διαθέσιμη με το Plus', 'unlocks on Plus', 'included in the paid plans', 'free trial analysis', 'compulsory for recreational craft', 'included with Plus', 'περιλαμβάνονται με το Plus', 'διαθέσιμη στο Plus', 'Plus includes the full', 'Με το Plus έχετε πλήρη', 'Priority analysis queue', 'περιλαμβάνεται στα πληρωμένα πλάνα', 'available on paid plans', 'included with Plus', 'διαθέσιμη από το Plus', 'Upgrade to Plus for the full', 'Αναβαθμίστε σε Plus για πλήρη'])
            expect(found, `the in-app guard must catch «${needle}»`).toContain(needle)
    })
})


/**
 * PW-CONTENT-02 review I3 — the /compare and homepage comparison rows are public
 * capability claims too. `COMPARISON_ROWS[*].policywallet` is checked against
 * `planClaim` across free / plus / pro: a capability true on every plan reads
 * «yes»; true on Family only reads «family». Rows with `claim: null` are prose
 * about the product's job (listed below with a reason).
 */
import { COMPARISON_ROWS } from '@/lib/marketing/positioning'
import { RENEWAL_MILESTONES } from '@/lib/renewals/milestones'
import { readFileSync as readSrc } from 'node:fs'

const PROSE_ROWS = new Set(['See all your policies together', 'Explains what they say in plain words'])
type CmpRow = { claim: ClaimKey | null; job: { en: string }; policywallet: string }
function comparisonOffenders(rows: CmpRow[]): string[] {
    const bad: string[] = []
    for (const row of rows) {
        if (row.claim === null) { if (!PROSE_ROWS.has(row.job.en)) bad.push(`«${row.job.en}»: claim:null needs a PROSE_ROWS reason`); continue }
        const on = (['free', 'plus', 'pro'] as const).map((t) => planClaim(row.claim as never, t as never) === true)
        const expected = on.every(Boolean) ? 'yes' : on.slice(0, 2).every((v) => !v) && on[2] ? 'family' : 'MIXED'
        if (row.policywallet !== expected) bad.push(`«${row.job.en}»: renders «${row.policywallet}», code says ${expected} (${row.claim})`)
    }
    return bad
}
describe('PW-CONTENT-02 — comparison rows equal the enforced entitlement', () => {
    it('every claim-tagged row\'s PolicyWallet verdict matches planClaim on free / plus / pro', () => {
        const bad = comparisonOffenders(COMPARISON_ROWS as never)
        expect(bad, bad.join('\n')).toEqual([])
    })
    it('probe — a «family» cell on an ungated capability is caught by the SAME detector', () => {
        const bad = comparisonOffenders([{ claim: 'exclusions', job: { en: 'probe: exclusions shown only with Family' }, policywallet: 'family' }])
        expect(bad.join('\n')).toMatch(/renders «family», code says yes \(exclusions\)/)
        expect(comparisonOffenders([{ claim: 'gapDetection', job: { en: 'probe: gaps for everyone' }, policywallet: 'yes' }]).join('\n')).toMatch(/code says family \(gapDetection\)/)
    })
})

describe('PW-CONTENT-02 review I6 — the reminder cadence in copy equals RENEWAL_MILESTONES', () => {
    const max = Math.max(...RENEWAL_MILESTONES), min = Math.min(...RENEWAL_MILESTONES)
    it('every renewalLadder line states the first and last rung', () => {
        const bad: string[] = []
        for (const audience of ['policyholder', 'agent'] as const) {
            const c = publicPricingContent[audience] as unknown as Audience
            for (const plan of c.plans) for (const f of plan.features) if (f.claim === 'renewalLadder' && !(hasNumber(f.label.el, max) && hasNumber(f.label.el, min) && hasNumber(f.label.en, max) && hasNumber(f.label.en, min))) bad.push(`${plan.key} «${f.label.el}»`)
            for (const r of c.comparisonRows) if (r.claim === 'renewalLadder' && !(hasNumber(r.name.el, max) && hasNumber(r.name.el, min))) bad.push(`row «${r.name.el}»`)
        }
        expect(bad, `the ladder is ${max}…${min} days (milestones.ts):\n${bad.join('\n')}`).toEqual([])
    })
    it('the homepage step states the first rung', () => {
        const src = readSrc('lib/landing/content.ts', 'utf-8')
        expect(src).toMatch(new RegExp(`από ${max} ημέρες`))
        expect(src).toMatch(new RegExp(`from ${max} days`))
    })
})


/**
 * PW-CONTENT-02 scope extension (owner, 2026-10-22) — the in-app agent pricing page
 * (/agent/pricing) carries its OWN feature list and its own price fallbacks. Its
 * analysis counts and prices must equal the entitlement source and the plan defaults
 * (it said 200 for Pro against an enforced 150, listed an internal token budget, and
 * fell back to 19.99 / 49.99 / 99.99 against 29 / 79 / 199).
 */
import { DEFAULT_PLAN_FACTS } from '@/lib/pricing/plan-defaults'
describe('PW-CONTENT-02 — /agent/pricing equals the enforced entitlements', () => {
    const src = readFileSync('app/(protected)/agent/pricing/AgentPricingClient.tsx', 'utf-8')
    const blocks = src.split(/\n {4}\{\n {8}id: "/).slice(1)
    const T: Record<string, AgentTier> = { 'agent-free': 'agent_free', 'agent-starter': 'agent_starter', 'agent-pro': 'agent_pro', 'agent-agency': 'agency' }
    it('the page defines the four agent plans', () => expect(blocks.map((b) => b.split('"')[0]).sort()).toEqual(Object.keys(T).sort()))
    it.each(Object.keys(T))('%s: analysis count, customers and fallback price match', (id) => {
        const block = blocks.find((b) => b.startsWith(id + '"'))!
        const tier = T[id]
        const analyses = [...block.matchAll(/(\d+)\s+(?:AI\s+)?(?:analyses|αναλύσεις)/gi)].map((m) => Number(m[1]))
        const expected = planClaim('agent.analysesPerMonth', tier)
        if (expected === UNSTATED) expect(analyses, `${id}: the count is not stated for this plan`).toEqual([])
        else if (expected !== null) expect(new Set(analyses), `${id}: enforced ${expected}`).toEqual(new Set([expected]))
        const customers = [...block.matchAll(/(\d+)\s+(?:customers|πελάτες)/gi)].map((m) => Number(m[1]))
        const wantCustomers = planClaim('agent.clients', tier)
        if (wantCustomers !== null) expect(new Set(customers), `${id}: enforced ${wantCustomers} customers`).toEqual(new Set([wantCustomers]))
        const price = Number(block.match(/priceEur: ([\d.]+)/)![1])
        const fact = DEFAULT_PLAN_FACTS.find((p) => p.id === id)!
        expect(price, `${id} fallback price`).toBe(fact.monthlyEur)
    })
})
