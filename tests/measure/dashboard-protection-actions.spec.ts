/**
 * PW-MOBILE-TRANSFORM-02, Phase 5 — Αρχική `/dashboard` §11 matrix, built for
 * the duplicate-`/protection` consolidation (the surface's known finding).
 *
 * Eight §11 metrics — scrollHeight, sectionCount, containerCount,
 * duplicateFacts, duplicateActions, countConsistency, smallTapTargets,
 * clippedLabels/pageOverflow — every one resolved from ./metrics (shared
 * definitions, no local variants), captured at 320/390/430 across the states
 * the brief names: empty portfolio, unanalysed policy, failed analysis run,
 * all-expired, and the populated case.
 *
 * WHY THIS SPEC EXISTS BESIDE dashboard-baseline.spec.ts: the baseline matrix
 * cannot reproduce the finding it is supposed to referee. `applyPortfolioState`
 * writes policies and gap instances but never `recommendation_instances`, so
 * on every baseline state the attention list renders its empty state and the
 * three recommendation-driven `/protection` offers (the list's «view all», the
 * per-item rows, the plan card's «+N ακόμη») never mount — the duplicate-action
 * defect measured live at 390 is structurally invisible to those fixtures
 * ("fixtures must be able to produce the defect", dashboard-fixtures.ts). The
 * recommendation fixture below closes that hole, in two doses:
 *
 *   - `typical-recs-few`  (2 active recommendations): the list is NOT
 *     truncated, so before the fix «view all» is an undifferentiated repeat of
 *     the hero CTA's destination; after the fix it must not render at all.
 *   - `typical-recs-many` (5 active recommendations): the list IS truncated,
 *     so «view all» is a legitimate continuation and must render in both runs.
 *
 * Run one state at a time (foreground, the 600s watchdog):
 *   MEASURE_RUN=<name> npx playwright test tests/measure/dashboard-protection-actions.spec.ts \
 *     --project=measure-dash -g "<state>"
 */

import { test, expect, type Page } from "@playwright/test"
import { applyPortfolioState, type PortfolioState } from "./dashboard-fixtures"
import { evidenceDirs, ensureDirs, openSurface, captureSurface, withDb } from "./surface-harness"
import { WIDTHS, type Width, duplicateActions, countConsistency, clippedLabels } from "./metrics"

const EMAIL = "e2e-ph-dash@policywallet.test"
const dirs = evidenceDirs("dashboard")

/** ruleId prefix scoping every row this spec writes — the ΣΥΜΒ-2026- discipline. */
const REC_RULE_PREFIX = "fixture-dupact-"

/**
 * Realistic bilingual recommendation prose. No leading numerals on purpose:
 * the count-consistency collector reads an instrumented element's FIRST number
 * (count-collector.ts), and `reasonCountKey` maps none of these risks, so a
 * leading digit here would manufacture "unmeasurable" rows that say nothing
 * about the page.
 */
const REC_FIXTURES = [
    {
        urgency: "critical",
        lineOfBusiness: "home",
        title: { el: "Η κατοικία σας μπορεί να είναι ασφαλισμένη κάτω από το κόστος ανακατασκευής", en: "Your home may be insured below its rebuild cost" },
        personalReason: { el: "Δηλώσατε ιδιόκτητη κατοικία και το ποσό κάλυψης δεν έχει επιβεβαιωθεί.", en: "You told us you own your home and the insured amount is unconfirmed." },
    },
    {
        urgency: "high",
        lineOfBusiness: "life",
        title: { el: "Το νοικοκυριό σας ίσως εκτεθεί αν σταματήσει το εισόδημά σας", en: "Your household may be exposed if your income stops" },
        personalReason: { el: "Μέλη της οικογένειάς σας εξαρτώνται από το εισόδημά σας.", en: "Members of your family depend on your income." },
    },
    {
        urgency: "medium",
        lineOfBusiness: "health",
        title: { el: "Η περίοδος αναμονής της νοσοκομειακής κάλυψης δεν έχει καταγραφεί", en: "The hospital cover's waiting period is not recorded" },
        personalReason: { el: "Στο έγγραφο δεν εντοπίστηκε ημερομηνία έναρξης της παροχής.", en: "The document does not record when the benefit starts." },
    },
    {
        urgency: "medium",
        lineOfBusiness: "motor",
        title: { el: "Η κάλυψη ιδίων ζημιών ισχύει με απαλλαγή που δεν έχετε επιβεβαιώσει", en: "Own-damage cover carries an excess you have not confirmed" },
        personalReason: { el: "Η απαλλαγή περιορίζει τι θα λάβετε σε ένα ρεαλιστικό περιστατικό.", en: "The excess limits what you would receive in a realistic claim." },
    },
    {
        urgency: "low",
        lineOfBusiness: "travel",
        title: { el: "Η ταξιδιωτική σας κάλυψη λήγει πριν από το επόμενο ταξίδι σας", en: "Your travel cover ends before your next trip" },
        personalReason: { el: "Η διάρκεια του συμβολαίου δεν φτάνει την περίοδο που δηλώσατε.", en: "The policy term does not reach the period you declared." },
    },
] as const

async function clearRecommendations(db: any, ownerEmail: string): Promise<void> {
    const owner = await db.user.findUnique({ where: { email: ownerEmail }, select: { id: true } })
    if (!owner) throw new Error(`clearRecommendations: ${ownerEmail} not provisioned`)
    await db.recommendationInstance.deleteMany({
        where: { userId: owner.id, ruleId: { startsWith: REC_RULE_PREFIX } },
    })
}

/**
 * WIPE THE WHOLE WALLET, not just the ΣΥΜΒ-2026- family.
 *
 * Found live in this spec's first baseline run: the dash account carried six
 * stray `WH-CONC-MOT*` policies (the single-line-concentration family another
 * dashboard spec applies and never removes), so the capture labelled `empty`
 * measured a six-policy wallet at 4.9k px — a state label that lies about what
 * was on screen, the exact poison the baseline spec's state-sanity check
 * exists to catch (it only knows its own prefix, so it passed). This account
 * exists to be rebuilt (dashboard-fixtures.ts header); every other dashboard
 * spec applies its own fixtures on entry, so a full wipe here breaks nobody.
 * Recommendation rows are wiped account-wide for the same reason: a state
 * label must describe everything the page renders, not just one family.
 */
async function resetWallet(db: any, ownerEmail: string): Promise<void> {
    if (/cquudefwfwrmvpftuhyl/.test(process.env.DATABASE_URL || "") || /cquudefwfwrmvpftuhyl/.test(process.env.DIRECT_URL || "")) {
        throw new Error("resetWallet: refusing to run against the PRODUCTION database")
    }
    const owner = await db.user.findUnique({ where: { email: ownerEmail }, select: { id: true } })
    if (!owner) throw new Error(`resetWallet: ${ownerEmail} not provisioned`)
    await db.policy.deleteMany({ where: { ownerUserId: owner.id } })
    await db.recommendationInstance.deleteMany({ where: { userId: owner.id } })
}

async function applyRecommendations(db: any, ownerEmail: string, count: number): Promise<void> {
    if (/cquudefwfwrmvpftuhyl/.test(process.env.DATABASE_URL || "") || /cquudefwfwrmvpftuhyl/.test(process.env.DIRECT_URL || "")) {
        throw new Error("applyRecommendations: refusing to run against the PRODUCTION database")
    }
    const owner = await db.user.findUnique({ where: { email: ownerEmail }, select: { id: true } })
    if (!owner) throw new Error(`applyRecommendations: ${ownerEmail} not provisioned`)
    await clearRecommendations(db, ownerEmail)
    for (const [i, spec] of REC_FIXTURES.slice(0, count).entries()) {
        await db.recommendationInstance.create({
            data: {
                userId: owner.id,
                lineOfBusiness: spec.lineOfBusiness,
                ruleId: `${REC_RULE_PREFIX}${i + 1}`,
                title: spec.title,
                description: spec.title,
                urgency: spec.urgency,
                personalReason: spec.personalReason,
                status: "active",
            },
        })
    }
}

/** Every-run mutation copied from dashboard-baseline.spec.ts's arm (c): all analyses FAILED. */
async function failAllAnalyses(db: any, ownerEmail: string): Promise<void> {
    const owner = await db.user.findUnique({ where: { email: ownerEmail }, select: { id: true } })
    if (!owner) throw new Error(`failAllAnalyses: ${ownerEmail} not provisioned`)
    const policies = await db.policy.findMany({
        where: { ownerUserId: owner.id, policyNumber: { startsWith: "ΣΥΜΒ-2026-" } },
        select: { id: true, acordData: true },
    })
    await db.policyAnalysisRun.deleteMany({
        where: { policy: { ownerUserId: owner.id, policyNumber: { startsWith: "ΣΥΜΒ-2026-" } } },
    })
    for (const p of policies) {
        await db.policy.update({
            where: { id: p.id },
            data: {
                lastAnalyzedAt: new Date(Date.now() - 5 * 86_400_000),
                acordData: {
                    ...(p.acordData as object),
                    processingError: {
                        code: "TRANSIENT_FAILURE",
                        message: "Your project has exceeded its monthly spending cap.",
                        retryable: true,
                        occurredAt: new Date().toISOString(),
                    },
                },
            },
        })
        await db.policyAnalysisRun.create({
            data: {
                policyId: p.id, userId: owner.id, provider: "fixture", model: "fixture",
                status: "failed", failureCode: "TRANSIENT_FAILURE",
                startedAt: new Date(), finishedAt: new Date(),
            },
        })
    }
}

/**
 * One capture = the full shared battery (captureSurface) PLUS the three §11
 * metrics the harness does not yet fold in — duplicateActions,
 * countConsistency, clippedLabels — all from ./metrics, recorded in the same
 * JSON so a reader gets all eight in one file.
 */
async function captureDashboard(page: Page, label: string, width: Width, state: string) {
    const acts = await duplicateActions(page)
    const cnts = await countConsistency(page)
    const clipped = await clippedLabels(page)
    await captureSurface(
        page,
        dirs,
        label,
        width,
        [],
        {
            portfolioState: state,
            duplicateActions: acts,
            countConsistencyShared: {
                verdict: cnts.verdict,
                failures: cnts.failures,
                totalKeys: cnts.totalKeys,
                comparableKeys: cnts.comparableKeys,
                corroboratedKeys: cnts.corroboratedKeys,
                inconsistent: cnts.inconsistent,
                nonComparable: cnts.nonComparable,
                unmeasurableCount: cnts.unmeasurable.length,
                unmeasurable: cnts.unmeasurable.slice(0, 30),
                excludedByDesign: cnts.excludedByDesign,
            },
            clippedLabels: clipped,
        },
        1500,
        3
    )
    const gated = acts.groups.filter((g) => g.gated)
    console.log(
        `[dupact] ${label}@${width}: gated=${acts.duplicateActionCount} navOverlap=${acts.navOverlapCount} ` +
        `countFailures=${cnts.failures} clipped=${clipped.length}` +
        (gated.length
            ? ` :: ${gated.map((g) => `${g.identity}×${g.contentCount}+${g.navCount}nav`).join(" | ")}`
            : "")
    )
}

test.describe.configure({ mode: "serial" })

test.beforeAll(() => ensureDirs(dirs))

interface StateSpec {
    name: string
    portfolio: PortfolioState
    recommendations: number
    failAnalyses?: boolean
}

const STATES: StateSpec[] = [
    // Degraded first — the invariant states, where an all-clear would be a lie.
    { name: "empty", portfolio: "empty", recommendations: 0 },
    { name: "single-unanalysed", portfolio: "single", recommendations: 0 },
    { name: "typical-all-failed", portfolio: "typical", recommendations: 0, failAnalyses: true },
    { name: "all-expired", portfolio: "all-expired", recommendations: 0 },
    // The populated case, in both doses of the known finding (header comment).
    { name: "typical-recs-few", portfolio: "typical", recommendations: 2 },
    { name: "typical-recs-many", portfolio: "typical", recommendations: 5 },
]

for (const state of STATES) {
    test(`state: ${state.name}`, async ({ page }) => {
        test.setTimeout(9 * 60_000)

        await withDb(async (db) => {
            await resetWallet(db, EMAIL)
            await applyPortfolioState(db, EMAIL, state.portfolio)
            if (state.failAnalyses) await failAllAnalyses(db, EMAIL)
            if (state.recommendations > 0) await applyRecommendations(db, EMAIL, state.recommendations)
        })

        for (const width of WIDTHS) {
            await openSurface(page, "/dashboard", width)

            // STATE SANITY (the dashboard-baseline lesson): the fixture the
            // label claims must actually be on screen before it is believed.
            const rendered = await page.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " "))
            if (state.portfolio === "empty") {
                expect(rendered, "empty state still lists fixture policies").not.toMatch(/ΣΥΜΒ-2026-|WH-CONC-|WH-VARIED-/)
                // The empty hero is the only render site of data-action="upload"
                // — its presence is what PROVES the wallet really was empty,
                // where a prefix check only proves one family was cleared.
                const emptyHero = await page.locator('[data-action="upload"]').count()
                expect(emptyHero, `empty@${width}: the hero did not render its empty state — the wallet is not empty`).toBeGreaterThan(0)
            }
            if (state.recommendations > 0) {
                expect(
                    rendered.includes(REC_FIXTURES[0].title.el) || rendered.includes(REC_FIXTURES[1].title.el),
                    `${state.name}@${width}: no fixture recommendation rendered — the state cannot produce the defect`
                ).toBe(true)
            }

            await captureDashboard(page, state.name, width, state.name)
        }
    })
}

test("cleanup: remove this spec's recommendation rows", async () => {
    await withDb((db) => clearRecommendations(db, EMAIL))
})
