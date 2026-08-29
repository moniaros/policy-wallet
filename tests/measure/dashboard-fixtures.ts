/**
 * Portfolio-state fixtures for the dashboard matrix.
 *
 * The structural difference from the policy-detail series: a portfolio state is
 * a property of the USER's whole wallet, so it cannot be expressed as six
 * policies sitting side by side. `applyPortfolioState` REBUILDS the dashboard
 * account's wallet — deleting what a previous state left behind — which is why
 * that account is separate from every other fixture user.
 *
 * FIXTURES MUST BE ABLE TO PRODUCE THE DEFECT. This is the Goal 0.5 lesson from
 * the policy-detail series, applied before the first capture rather than after
 * the review: a clean wallet reproduces none of the candidate defects, so the
 * baseline would show them absent because they were never present, and the
 * guards written for them would ship having never fired. The degraded
 * conditions below are therefore deliberate, and each names the candidate it
 * exists to reproduce.
 *
 * Local-dev database only; refuses the production project by ref.
 */

export type PortfolioState = "empty" | "single" | "typical" | "heavy" | "all-expired"

export const PORTFOLIO_STATES: PortfolioState[] = ["empty", "single", "typical", "heavy", "all-expired"]

/**
 * Real Greek insurer legal names, at their real length.
 *
 * D7 is a truncation candidate and the thing being truncated is the customer's
 * only clue about WHICH policy a row is about. Testing that with "Acme Ltd"
 * would prove nothing — these are the actual registered names from the
 * reference data, and the first is what production stores for Εθνική.
 */
const LONG_INSURER = "ΑΝΩΝΥΜΟΣ ΕΛΛΗΝΙΚΗ ΕΤΑΙΡΙΑ ΓΕΝΙΚΩΝ ΑΣΦΑΛΕΙΩΝ «Η ΕΘΝΙΚΗ»"
const LONG_INSURER_2 = "ΥΔΡΟΓΕΙΟΣ Ανώνυμος Ασφαλιστική και Αντασφαλιστική Εταιρεία"

const DAY = 86_400_000

interface PolicySpec {
    policyNumber: string
    lineOfBusiness: string
    insurerName: string
    /** days from now; negative = expired */
    endInDays: number
    premiumAmount: number | null
    analyzed: boolean
    /** attach N open gap instances from the authored catalogue */
    gaps?: number
    /** a run that failed AFTER a completed one */
    failedRun?: boolean
    /** stored status "analyzing" — the "N σε ανάλυση" state */
    analyzing?: boolean
    /** why this policy is in the set, when it is not just filler */
    reproduces?: string
}

const utcMidnight = (offsetDays: number) => {
    const d = new Date(Date.now() + offsetDays * DAY)
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

export function policiesFor(state: PortfolioState): PolicySpec[] {
    switch (state) {
        case "empty":
            return []

        case "single":
            // One policy, NEVER analysed. The score has nothing to work from,
            // and twelve sections for one policy is the density question.
            return [
                {
                    policyNumber: "ΣΥΜΒ-2026-S1",
                    lineOfBusiness: "motor",
                    insurerName: "Interamerican",
                    endInDays: 200,
                    premiumAmount: 312.4,
                    analyzed: false,
                    reproduces: "single-policy density; score with nothing analysed",
                },
            ]

        case "typical":
            return [
                { policyNumber: "ΣΥΜΒ-2026-T1", lineOfBusiness: "motor", insurerName: "Interamerican", endInDays: 210, premiumAmount: 312.4, analyzed: true, gaps: 2 },
                { policyNumber: "ΣΥΜΒ-2026-T2", lineOfBusiness: "health", insurerName: "Εθνική Ασφαλιστική", endInDays: 18, premiumAmount: 1138.27, analyzed: true, gaps: 1 },
                {
                    policyNumber: "ΣΥΜΒ-2026-T3",
                    lineOfBusiness: "home",
                    insurerName: "Generali",
                    endInDays: 120,
                    premiumAmount: 240,
                    analyzed: true,
                    failedRun: true,
                    reproduces: "D1 — a failed run inside an otherwise healthy portfolio",
                },
            ]

        case "heavy":
            return [
                {
                    policyNumber: "ΣΥΜΒ-2026-H1",
                    lineOfBusiness: "motor",
                    insurerName: LONG_INSURER,
                    endInDays: 164,
                    premiumAmount: 420,
                    analyzed: true,
                    gaps: 2,
                    reproduces: "D7 — the longest real insurer name, at 320px",
                },
                {
                    policyNumber: "ΣΥΜΒ-2026-H2",
                    lineOfBusiness: "motor",
                    insurerName: "Interamerican",
                    endInDays: 164,
                    premiumAmount: 380,
                    analyzed: true,
                    gaps: 2,
                    reproduces: "D11 — display values identical to H3 (same branch, same days, same insurer, same gap count)",
                },
                {
                    policyNumber: "ΣΥΜΒ-2026-H3",
                    lineOfBusiness: "motor",
                    insurerName: "Interamerican",
                    endInDays: 164,
                    premiumAmount: 380,
                    analyzed: true,
                    gaps: 2,
                    reproduces: "D11 — the twin of H2",
                },
                {
                    policyNumber: "ΣΥΜΒ-2026-H4",
                    lineOfBusiness: "health",
                    insurerName: LONG_INSURER_2,
                    endInDays: 12,
                    premiumAmount: null,
                    analyzed: true,
                    gaps: 3,
                    reproduces: "D4 — a policy with NO premium, against a page that totals premiums",
                },
                { policyNumber: "ΣΥΜΒ-2026-H5", lineOfBusiness: "home", insurerName: "Generali", endInDays: 30, premiumAmount: 240, analyzed: true, gaps: 1 },
                { policyNumber: "ΣΥΜΒ-2026-H6", lineOfBusiness: "life", insurerName: "NN Hellas", endInDays: 400, premiumAmount: 600, analyzed: true, gaps: 1 },
                { policyNumber: "ΣΥΜΒ-2026-H7", lineOfBusiness: "travel", insurerName: "Europ Assistance", endInDays: 45, premiumAmount: 60, analyzed: true },
                { policyNumber: "ΣΥΜΒ-2026-H8", lineOfBusiness: "pet", insurerName: "Interamerican", endInDays: 90, premiumAmount: 120, analyzed: true, gaps: 1 },
                {
                    policyNumber: "ΣΥΜΒ-2026-H9",
                    lineOfBusiness: "motor",
                    insurerName: "Ergo",
                    endInDays: 250,
                    premiumAmount: 290,
                    analyzed: false,
                    reproduces: "an UNANALYSED policy inside a scored portfolio",
                },
                {
                    policyNumber: "ΣΥΜΒ-2026-H10",
                    lineOfBusiness: "health",
                    insurerName: "Generali",
                    endInDays: 300,
                    premiumAmount: 900,
                    analyzed: true,
                    failedRun: true,
                    reproduces: "D1 — a failed run the score cannot see",
                },
                { policyNumber: "ΣΥΜΒ-2026-H11", lineOfBusiness: "home", insurerName: "Ydrogios", endInDays: -20, premiumAmount: 180, analyzed: true, gaps: 1, reproduces: "an EXPIRED policy inside a live portfolio" },
                { policyNumber: "ΣΥΜΒ-2026-H12", lineOfBusiness: "motor", insurerName: "Hellas Direct", endInDays: 500, premiumAmount: 210, analyzed: true },
            ]

        case "all-expired":
            // The score's honesty is most testable here: every policy is past
            // its end date, so the wallet provides no cover at all. A positive
            // verdict over this portfolio is a false statement about a
            // customer's protection (invariant 2).
            return [
                { policyNumber: "ΣΥΜΒ-2026-X1", lineOfBusiness: "motor", insurerName: "Interamerican", endInDays: -400, premiumAmount: 312.4, analyzed: true, gaps: 2 },
                { policyNumber: "ΣΥΜΒ-2026-X2", lineOfBusiness: "health", insurerName: LONG_INSURER, endInDays: -200, premiumAmount: 1138.27, analyzed: true, gaps: 1 },
                { policyNumber: "ΣΥΜΒ-2026-X3", lineOfBusiness: "home", insurerName: "Generali", endInDays: -90, premiumAmount: 240, analyzed: true, gaps: 1 },
                { policyNumber: "ΣΥΜΒ-2026-X4", lineOfBusiness: "life", insurerName: "NN Hellas", endInDays: -30, premiumAmount: 600, analyzed: true },
            ]
    }
}

const SUMMARY_EL =
    "Το συμβόλαιο καλύπτει την αστική ευθύνη προς τρίτους, πυρκαγιά και φυσικά φαινόμενα. Περιλαμβάνει οδική βοήθεια 24/7."

/**
 * Rebuild the dashboard account's wallet into `state`.
 *
 * Destructive by design and scoped by the `ΣΥΜΒ-2026-` prefix, so it can never
 * touch a policy another fixture set owns. Gap instances and analysis runs
 * cascade from the policy delete.
 */
/**
 * Realistic Greek gap prose, varied per instance.
 *
 * These used to be one string ending «(δοκιμαστικό περιεχόμενο)», applied to
 * EVERY gap. Two consequences, both of which surfaced in review as product
 * defects: placeholder text rendered in the customer-facing attention list, and
 * every attention item read identically except for its severity chip — which
 * looked like severity carrying no information when it was the fixture giving
 * every gap the same words.
 *
 * A fixture that ships placeholder text cannot be used to prove placeholder
 * text never renders, and a fixture that makes every row identical cannot
 * distinguish a real duplicate-rendering defect from itself.
 */
const FIXTURE_GAP_PROSE: Array<{ el: string; en: string; suggestionEl: string; suggestionEn: string }> = [
    {
        el: "Στο ασφαλιστήριο δεν εντοπίστηκε κάλυψη για αυτό το ενδεχόμενο.",
        en: "The policy does not appear to cover this event.",
        suggestionEl: "Ζητήστε από τον ασφαλιστή σας γραπτή επιβεβαίωση του ορίου.",
        suggestionEn: "Ask your insurer to confirm the limit in writing.",
    },
    {
        el: "Το όριο που αναγράφεται είναι χαμηλότερο από το σύνηθες για αντίστοιχα συμβόλαια.",
        en: "The stated limit is lower than is usual for comparable policies.",
        suggestionEl: "Συγκρίνετε το όριο με την τρέχουσα αξία που θέλετε να προστατεύσετε.",
        suggestionEn: "Compare the limit against the value you want protected.",
    },
    {
        el: "Η κάλυψη ισχύει με προϋποθέσεις που περιορίζουν πότε μπορείτε να την επικαλεστείτε.",
        en: "Cover applies under conditions that limit when you can rely on it.",
        suggestionEl: "Διαβάστε τους όρους εξαίρεσης πριν από την ανανέωση.",
        suggestionEn: "Read the exclusion terms before renewal.",
    },
    {
        el: "Προβλέπεται συμμετοχή δική σας στα έξοδα για κάθε περιστατικό.",
        en: "You contribute to the cost of each incident.",
        suggestionEl: "Υπολογίστε τη συμμετοχή σε ένα ρεαλιστικό σενάριο ζημιάς.",
        suggestionEn: "Work out that contribution against a realistic claim.",
    },
    {
        el: "Η περίοδος αναμονής καθυστερεί την έναρξη αυτής της παροχής.",
        en: "A waiting period delays when this benefit starts.",
        suggestionEl: "Σημειώστε την ημερομηνία από την οποία ισχύει η παροχή.",
        suggestionEn: "Note the date from which the benefit applies.",
    },
    {
        el: "Δεν καταγράφεται στο έγγραφο το στοιχείο που χρειάζεται για να επιβεβαιωθεί η κάλυψη.",
        en: "The document does not record the detail needed to confirm this cover.",
        suggestionEl: "Ζητήστε αντίγραφο του πίνακα παροχών από τον ασφαλιστή σας.",
        suggestionEn: "Request the benefits schedule from your insurer.",
    },
]

export async function applyPortfolioState(db: any, ownerEmail: string, state: PortfolioState): Promise<string[]> {
    if (/cquudefwfwrmvpftuhyl/.test(process.env.DATABASE_URL || "") || /cquudefwfwrmvpftuhyl/.test(process.env.DIRECT_URL || "")) {
        throw new Error("applyPortfolioState: refusing to run against the PRODUCTION database")
    }
    const owner = await db.user.findUnique({ where: { email: ownerEmail }, select: { id: true } })
    if (!owner) throw new Error(`applyPortfolioState: ${ownerEmail} not provisioned — run global-setup first`)

    // Clear the WHOLE wallet, not just this fixture family.
    //
    // This deleted only `ΣΥΜΒ-2026-*` while the household spec writes
    // `WH-VARIED-*` to the SAME dedicated account and clears only ITS families.
    // Neither removed the other's rows, so `WH-VARIED-*` accumulated and was
    // never cleared by anyone: run both specs in one invocation and the DOM
    // showed 10 rows while each test expected its own 3 or 7. Both then failed
    // with "stale render or leftover policies?" — their own error message
    // naming the cause, on every run where they were invoked together.
    //
    // A whole-wallet clear is the documented intent, not a widening:
    // playwright.config.ts gives this matrix its own account precisely because
    // "portfolio state is a property of the user's whole wallet".
    await db.policy.deleteMany({ where: { ownerUserId: owner.id } })

    const specs = policiesFor(state)
    const created: string[] = []

    for (const spec of specs) {
        const end = utcMidnight(spec.endInDays)
        const start = utcMidnight(spec.endInDays - 365)
        const analyzedAt = spec.analyzed ? new Date(Date.now() - 5 * DAY) : null

        const policy = await db.policy.create({
            data: {
                ownerUserId: owner.id,
                createdByUserId: owner.id,
                policyNumber: spec.policyNumber,
                insurerName: spec.insurerName,
                lineOfBusiness: spec.lineOfBusiness,
                status: spec.analyzing ? "analyzing" : "active",
                startDate: start,
                endDate: end,
                coverageEndDate: end,
                premiumAmount: spec.premiumAmount,
                premiumCurrency: "EUR",
                coverageSummary: spec.analyzed ? SUMMARY_EL : null,
                lastAnalyzedAt: analyzedAt,
                acordData: {
                    _version: 3,
                    policy: {
                        insurerName: spec.insurerName,
                        policyNumber: spec.policyNumber,
                        lineOfBusiness: spec.lineOfBusiness,
                        effectiveDate: start.toISOString().slice(0, 10),
                        expirationDate: end.toISOString().slice(0, 10),
                        premium: spec.premiumAmount === null ? {} : { amount: spec.premiumAmount, currency: "EUR" },
                    },
                    extraction: {
                        source: "fixture",
                        extractedAt: new Date().toISOString(),
                        reviewState: "unconfirmed",
                        summaryLanguage: spec.analyzed ? "el" : null,
                    },
                    ...(spec.failedRun
                        ? {
                              processingError: {
                                  code: "TRANSIENT_FAILURE",
                                  message: "Your project has exceeded its monthly spending cap.",
                                  retryable: true,
                                  occurredAt: new Date(Date.now() - 2 * DAY).toISOString(),
                              },
                          }
                        : {}),
                },
            },
            select: { id: true },
        })
        created.push(policy.id)

        if (spec.analyzed) {
            await db.policyAnalysisRun.create({
                data: {
                    policyId: policy.id,
                    userId: owner.id,
                    provider: "fixture",
                    model: "fixture",
                    status: "completed",
                    overallSuccessPct: 100,
                    startedAt: analyzedAt!,
                    finishedAt: analyzedAt!,
                },
            })
            if (spec.failedRun) {
                const failedAt = new Date(Date.now() - 2 * DAY)
                await db.policyAnalysisRun.create({
                    data: {
                        policyId: policy.id,
                        userId: owner.id,
                        provider: "fixture",
                        model: "fixture",
                        status: "failed",
                        failureCode: "TRANSIENT_FAILURE",
                        failureMessage: "Your project has exceeded its monthly spending cap.",
                        startedAt: failedAt,
                        finishedAt: failedAt,
                    },
                })
            }
        }

        // Open gaps from the AUTHORED catalogue, severity copied from the
        // definition — the same value the rule engine writes. Nothing here
        // decides detection or severity (lib/gap-detection.ts owns both).
        if (spec.gaps && spec.gaps > 0) {
            const defs = await db.gapDefinition.findMany({
                where: { isActive: true, lineOfBusiness: spec.lineOfBusiness },
                take: spec.gaps,
                select: { id: true, severity: true, ruleId: true },
            })
            for (const [gapIndex, def] of defs.entries()) {
                // TOLERANT OF A SUPERSEDED FIXTURE. Playwright retries the whole
                // test, and a retry's `deleteMany` at the top of this function can
                // remove the policies a previous attempt is still attaching gaps
                // to — the previous attempt then fails on
                // `gap_instances_policy_id_fkey`, which reads like a data bug and
                // is a lifecycle one. If the policy has gone, this attempt is
                // obsolete and its gaps are not wanted.
                await db.gapInstance.create({
                    data: {
                        policyId: policy.id,
                        userId: owner.id,
                        gapDefinitionId: def.id,
                        severity: def.severity,
                        status: "detected",
                        validationState: "probable",
                        ruleId: def.ruleId,
                        engineVersion: "fixture",
                        ruleInputs: { fixture: true },
                        aiExplanationEl: FIXTURE_GAP_PROSE[gapIndex % FIXTURE_GAP_PROSE.length].el,
                        aiExplanation: FIXTURE_GAP_PROSE[gapIndex % FIXTURE_GAP_PROSE.length].en,
                        aiSuggestionEl: FIXTURE_GAP_PROSE[gapIndex % FIXTURE_GAP_PROSE.length].suggestionEl,
                        aiSuggestion: FIXTURE_GAP_PROSE[gapIndex % FIXTURE_GAP_PROSE.length].suggestionEn,
                    },
                }).catch((error: any) => {
                    // P2003 foreign key (policy deleted by a retry), P2002 unique
                    // (another attempt got there first). Both mean "someone else
                    // owns this fixture now".
                    if (error?.code !== "P2003" && error?.code !== "P2002") throw error
                })
            }
        }
    }

    return created
}

// ─────────────────────────────────────────────────────────────────────────────
// T-012 additions — degraded conditions the portfolio-state matrix above could
// not produce, because they are properties of the ACCOUNT rather than of any
// one policy: notification delivery rows, and the advisor relationship.
// ─────────────────────────────────────────────────────────────────────────────

const PROD_GUARD =
    /cquudefwfwrmvpftuhyl/.test(process.env.DATABASE_URL || "") || /cquudefwfwrmvpftuhyl/.test(process.env.DIRECT_URL || "")

/**
 * Channel-duplicated notifications, for the dedup grouping fix.
 *
 * `emit()` (lib/notifications/dispatch.ts:322) writes ONE ROW PER CHANNEL, all
 * sharing the SAME `dedupeKey` — by the time it runs, the orchestrator has
 * already appended the recipient kind (`${base}:${recipient.kind}`,
 * lib/notifications/orchestrator.ts:354), so the value stored here is that
 * FINAL key, not the base. `@@unique([userId, dedupeKey, channel])` is what
 * makes one-row-per-channel possible without collision.
 *
 * Two conditions, both required:
 *
 *  (a) email + push rows sharing ONE final dedupeKey — a single renewal-
 *      reminder event delivered on two channels. A grouping fix must collapse
 *      these into one card.
 *  (b) two in_app rows with `dedupeKey: null`, for TWO DIFFERENT events. Null
 *      is the shape of every row written before dedupeKey existed, and of any
 *      emitter that sends none today. A fix that groups on a GUESS (same
 *      channel, close timestamps, same eventType-family) rather than strictly
 *      on a non-null dedupeKey match would wrongly merge these two unrelated
 *      rows — this is the fixture that catches that guess.
 *
 * Idempotent: each row is looked up by its own identifying tuple before
 * create, since a null dedupeKey is not constrained by the unique index
 * (Postgres treats every NULL as distinct) and would otherwise duplicate on a
 * second run.
 */
export async function applyNotificationDuplicateFixture(db: any, ownerEmail: string): Promise<void> {
    if (PROD_GUARD) {
        throw new Error("applyNotificationDuplicateFixture: refusing to run against the PRODUCTION database")
    }
    const owner = await db.user.findUnique({ where: { email: ownerEmail }, select: { id: true } })
    if (!owner) throw new Error(`applyNotificationDuplicateFixture: ${ownerEmail} not provisioned — run global-setup first`)

    const sharedDedupeKey = "e2e-fixture-renewal-reminder:pol-fixture:owner"

    const rows: Array<{
        eventType: string
        channel: string
        dedupeKey: string | null
        title: string
        message: string
    }> = [
        {
            eventType: "policy_renewal_reminder",
            channel: "email",
            dedupeKey: sharedDedupeKey,
            title: "Η ανανέωση του συμβολαίου σας πλησιάζει",
            message: "Το συμβόλαιό σας λήγει σε 15 ημέρες. Ελέγξτε τις επιλογές ανανέωσης.",
        },
        {
            eventType: "policy_renewal_reminder",
            channel: "push",
            dedupeKey: sharedDedupeKey,
            title: "Η ανανέωση του συμβολαίου σας πλησιάζει",
            message: "Το συμβόλαιό σας λήγει σε 15 ημέρες. Ελέγξτε τις επιλογές ανανέωσης.",
        },
        // Unkeyed, and each a DIFFERENT event — deliberately similar enough
        // (same channel, same recency) that a heuristic grouping fix could be
        // tempted to merge them; only an exact non-null dedupeKey match may.
        {
            eventType: "document_requested",
            channel: "in_app",
            dedupeKey: null,
            title: "Ο σύμβουλός σας ζήτησε ένα έγγραφο",
            message: "Ανεβάστε το έγγραφο για να συνεχίσει ο σύμβουλός σας.",
        },
        {
            eventType: "questionnaire_sent",
            channel: "in_app",
            dedupeKey: null,
            title: "Νέο ερωτηματολόγιο από τον σύμβουλό σας",
            message: "Απαντήστε το για να εντοπίσουμε κενά στην κάλυψή σας.",
        },
    ]

    for (const row of rows) {
        const existing = await db.notificationEvent.findFirst({
            where: { userId: owner.id, eventType: row.eventType, channel: row.channel, dedupeKey: row.dedupeKey },
            select: { id: true },
        })
        if (existing) continue
        await db.notificationEvent.create({
            data: {
                userId: owner.id,
                eventType: row.eventType,
                channel: row.channel,
                status: "sent",
                priority: "normal",
                title: row.title,
                message: row.message,
                dedupeKey: row.dedupeKey,
                sentAt: new Date(),
            },
        })
    }
}

/** The advisor's display name (`User.name`) is the fixture — see below. */
const LONG_ADVISOR_EMAIL = "e2e-advisor-longname@policywallet.test"
const LONG_ADVISOR_NAME = "Παναγιώτης-Ευστράτιος Οικονομόπουλος-Παπαδημητρίου"

/**
 * A very long advisor display name, connected to the dashboard account via an
 * ACTIVE `CustomerRelationship`.
 *
 * `PolicyholderHome.tsx` renders `customerRelationship.agent.name ||
 * .agent.email` verbatim as the advisor's name (line 657) inside
 * `AdvisorSupportRow` — a sentence-level interpolation with no truncation of
 * its own, on the same page as the D7 long-insurer-name fixture above. The
 * query that finds the relationship (line 128) requires literal
 * `status: "active"` — not "pending_activation", the column's default — so
 * that is what this writes.
 *
 * No `AgentProfile` row: nothing on this render path reads one. Idempotent:
 * upserts the advisor by email, then the relationship by its unique
 * (agentUserId, policyholderUserId) pair.
 */
export async function applyLongAdvisorFixture(db: any, ownerEmail: string): Promise<void> {
    if (PROD_GUARD) {
        throw new Error("applyLongAdvisorFixture: refusing to run against the PRODUCTION database")
    }
    const owner = await db.user.findUnique({ where: { email: ownerEmail }, select: { id: true } })
    if (!owner) throw new Error(`applyLongAdvisorFixture: ${ownerEmail} not provisioned — run global-setup first`)

    const advisor = await db.user.upsert({
        where: { email: LONG_ADVISOR_EMAIL },
        update: { name: LONG_ADVISOR_NAME, roles: "agent" },
        create: {
            email: LONG_ADVISOR_EMAIL,
            name: LONG_ADVISOR_NAME,
            roles: "agent",
            preferredLanguage: "el",
        },
        select: { id: true },
    })

    const existingRelationship = await db.customerRelationship.findFirst({
        where: { agentUserId: advisor.id, policyholderUserId: owner.id },
        select: { id: true },
    })
    if (existingRelationship) {
        // Idempotent no-op on a re-run where it is already "active"; harmless
        // to write the same value again.
        await db.customerRelationship.update({ where: { id: existingRelationship.id }, data: { status: "active" } })
    } else {
        await db.customerRelationship.create({
            data: { agentUserId: advisor.id, policyholderUserId: owner.id, status: "active" },
        })
    }
}

/** Policy-number prefix, deliberately NOT `ΣΥΜΒ-2026-` — see the doc comment below. */
const UNKNOWN_HOUSEHOLD_PREFIX = "E2E-DASH-UNK-MOT-"

/**
 * V2-P0-FIX addition, CORRECTED (2026-08-24): a household that has told us it
 * owns vehicles, everything else unanswered, holding real motor cover whose
 * coverage data cannot be read.
 *
 * ORIGINAL DEFECT (left here because it is the whole lesson): the first cut of
 * this fixture blanked `vehiclesCount` to 0 along with every other factor, to
 * build the most "zero-information" profile possible. That tests the wrong
 * axis. `RISK_CATALOG.motor_liability.applies = (ctx) => ctx.vehiclesCount > 0`
 * (lib/services/gap-engine/risk-catalog.ts:464) is gated on the "vehicles"
 * factor being KNOWN before it is even consulted — `assessRisk`
 * (lib/services/gap-engine/risk-assessment.ts) checks `missingFactors` first
 * and returns `applicability: "needs_review"` whenever it is not — and
 * `bindRisksToGraph` (lib/services/risk-graph/protection.ts:504) drops every
 * risk that is not `applicability === "applicable"` before the graph is even
 * built. A blanked `vehiclesCount` therefore makes `motor_liability` vanish
 * from the graph entirely; it can never reach `unknown`, because it is never
 * bound at all. «Άγνωστο» is a ROLL-UP of per-dimension adequacy verdicts on
 * an APPLICABLE, BOUND risk (protection.ts:373 — `unknown` fires when every
 * non-period dimension is `unevaluable`), not a synonym for "we know nothing
 * about the customer".
 *
 * THE FIX: leave every other factor blank (unanswered), but make `vehicles`
 * the one KNOWN factor — `vehiclesCount: count` plus `"vehiclesCount"` in
 * `answeredFields` — so `assessRisk` clears step 1, `ctx.vehiclesCount > 0`
 * clears step 2 (`risk.applies`), and the held motor policies clear step 3
 * (`already_covered`), landing `applicability: "applicable"`. `bindRisksToGraph`
 * then binds it and evaluates dimensions against the held policies' `acordData`
 * — which this fixture already wrote (below) without a `coverage.perils` or
 * `coverage.sumInsured` key. `readCoverageFacts` (lib/services/risk-graph/
 * service.ts:44) returns `perils: null, sumInsured: null` for exactly that
 * shape — never zero, because an unreadable figure is not a declaration of
 * absence — which is what pushes both the peril and the limit dimension to
 * `unevaluable` (protection.ts's `assessPeril`/`assessLimit`, "declared.size
 * === 0" / "readable.length === 0" branches). Territory is never added at all
 * (`hasTerritoryData` is false with no `territories` on the policy), and period
 * is `satisfied` because every policy's `endDate` is 200+ days out. So the
 * adequacy set is exactly `[peril: unevaluable, limit: unevaluable]`, and
 * `rollUpState` (protection.ts:373) returns `"unknown"` — «Άγνωστο».
 *
 * Real field names, read from prisma/schema.prisma's `PolicyholderProfile`
 * and confirmed against lib/services/gap-engine/profile-gap-rules.ts's
 * `ProfileFields`: `dependentsCount` (Int, default 0) and `annualIncome`
 * (Decimal?, default null) are the two the original brief named;
 * `employmentStatus`, `hasPets`, `cyberExposure` stay reset alongside them so
 * every factor OTHER than vehicles is genuinely unanswered — not a row with
 * two fields blank and the rest coincidentally answered. `answeredFields` is
 * now an explicit one-element array (`["vehiclesCount"]`), not
 * `Prisma.JsonNull`, so a second run over a row a DIFFERENT fixture had
 * touched still ends up with exactly "vehicles known, nothing else" —
 * required for the "provision twice, row counts match" idempotence rule,
 * since a stale `answeredFields` array would silently change which factors
 * `isFactorKnown` reports as known.
 *
 * VERIFIED 2026-08-24 by calling the real functions directly against this
 * exact corrected shape (vehicles-known profile + 22 active, analysed motor
 * policies, acordData with no `coverage` key) — not assumed. See the
 * per-risk `state` values recorded in the run report; the summary:
 *
 *   assessRisks(ctx, policies).find(r => r.riskId === "motor_liability")
 *     → { applicability: "applicable", status: "already_covered" }
 *
 *   assembleRiskGraph(profile, policies).risks.find(r => r.riskId ===
 *   "motor_liability") → { state: "unknown", dimensions: [
 *       { dimension: "peril", verdict: "unevaluable" },
 *       { dimension: "limit", verdict: "unevaluable" },
 *       { dimension: "period", verdict: "satisfied" } ] }
 *
 *   → "Οδήγηση χωρίς υποχρεωτική κάλυψη · ΑΓΝΩΣΤΟ" DOES reproduce as a bound,
 *     rendered RiskGraphPanel row once `motor_liability` is allowed through
 *     `bindRisksToGraph`'s applicability gate.
 *
 *   customerHealthIndex(...) still reads `index: null, band: "unknown"` —
 *     one known factor out of ~20 is still a zero-information household for
 *     the health index, so the §2.13 guilt-copy / zero-score candidates this
 *     fixture also feeds are unaffected by the correction.
 *
 * ISOLATION NOTE for whoever wires the capture spec: this function only
 * touches `PolicyholderProfile` and its own `E2E-DASH-UNK-MOT-`-prefixed
 * policies — it never deletes another prefix. `applyPortfolioState`'s
 * rebuild only clears `ΣΥΜΒ-2026-*`, so the two compose safely on the same
 * account in either order, but a `PortfolioState` capture run AFTER this
 * fixture will show this account's policy count plus this fixture's 22,
 * not the portfolio state's count alone. Use a dedicated account, or call
 * `applyPortfolioState(db, email, "empty")` immediately before capturing
 * this fixture's state, if that matters to the capture.
 */
export async function applyUnknownHouseholdFixture(db: any, ownerEmail: string, count = 22): Promise<string[]> {
    if (PROD_GUARD) {
        throw new Error("applyUnknownHouseholdFixture: refusing to run against the PRODUCTION database")
    }
    const owner = await db.user.findUnique({ where: { email: ownerEmail }, select: { id: true } })
    if (!owner) throw new Error(`applyUnknownHouseholdFixture: ${ownerEmail} not provisioned — run global-setup first`)

    // The profile half — every factor UNANSWERED except vehicles, which must
    // be KNOWN (not merely non-zero — see `isFactorKnown` /
    // `DEFAULTED_COLUMNS.vehiclesCount`, lib/services/gap-engine/
    // life-context.ts) for `motor_liability` to ever reach the graph. `count`
    // matches the held motor-policy count so `whyItApplies`'s "you told us you
    // have N vehicles" is internally consistent with the wallet.
    const blankProfile = {
        dependentsCount: 0,
        childrenCount: 0,
        employmentStatus: null,
        annualIncome: null,
        hasPets: false,
        petsCount: null,
        vehiclesCount: count,
        cyberExposure: null,
        answeredFields: ["vehiclesCount"],
    }
    const existingProfile = await db.policyholderProfile.findUnique({ where: { userId: owner.id }, select: { id: true } })
    if (existingProfile) {
        await db.policyholderProfile.update({ where: { userId: owner.id }, data: blankProfile })
    } else {
        await db.policyholderProfile.create({ data: { userId: owner.id, ...blankProfile } })
    }

    // The wallet half — `count` real, active, analysed motor policies,
    // never read by the profile-driven assessment above. That gap is the
    // fixture.
    const created: string[] = []
    for (let i = 1; i <= count; i++) {
        const policyNumber = `${UNKNOWN_HOUSEHOLD_PREFIX}${String(i).padStart(3, "0")}`
        const end = utcMidnight(200 + i)
        const start = utcMidnight(200 + i - 365)
        const analyzedAt = new Date(Date.now() - 5 * DAY)
        const premiumAmount = 250 + i

        const data = {
            ownerUserId: owner.id,
            createdByUserId: owner.id,
            policyNumber,
            insurerName: "Interamerican",
            lineOfBusiness: "motor",
            status: "active",
            startDate: start,
            endDate: end,
            coverageEndDate: end,
            premiumAmount,
            premiumCurrency: "EUR",
            coverageSummary: SUMMARY_EL,
            lastAnalyzedAt: analyzedAt,
            acordData: {
                _version: 3,
                policy: {
                    insurerName: "Interamerican",
                    policyNumber,
                    lineOfBusiness: "motor",
                    effectiveDate: start.toISOString().slice(0, 10),
                    expirationDate: end.toISOString().slice(0, 10),
                    premium: { amount: premiumAmount, currency: "EUR" },
                },
                extraction: {
                    source: "fixture",
                    extractedAt: new Date().toISOString(),
                    reviewState: "unconfirmed",
                    summaryLanguage: "el",
                },
            },
        }

        let policy = await db.policy.findFirst({ where: { ownerUserId: owner.id, policyNumber }, select: { id: true } })
        if (policy) {
            await db.policy.update({ where: { id: policy.id }, data })
        } else {
            policy = await db.policy.create({ data, select: { id: true } })
        }
        created.push(policy.id)

        const run = await db.policyAnalysisRun.findFirst({ where: { policyId: policy.id }, select: { id: true } })
        if (!run) {
            await db.policyAnalysisRun.create({
                data: {
                    policyId: policy.id,
                    userId: owner.id,
                    provider: "fixture",
                    model: "fixture",
                    status: "completed",
                    overallSuccessPct: 100,
                    startedAt: analyzedAt,
                    finishedAt: analyzedAt,
                },
            })
        }
    }

    return created
}

// ─────────────────────────────────────────────────────────────────────────────
// P5-wallet-01a additions — two fixtures for the `duplicateIdentityRows()`
// metric (metrics.ts) that neither the heavy 29-policy account nor the
// `PortfolioState` matrix above could produce, because both are the wrong
// shape for what D-034's reopen trigger actually asks for:
//
//   1. VARIED-HOUSEHOLD — a REALISTIC mixed portfolio (2 vehicles, 1 property,
//      2-3 health, 1 life; mixed insurers, mixed renewal dates), to test
//      whether ordinary household variety already avoids the duplicate-row
//      problem the heavy fixture showed, or whether it survives at realistic
//      size.
//   2. SINGLE-LINE-CONCENTRATION — 5+ motor policies, ONE insurer, ONE
//      renewal date, all active. This is the fixture that isolates a future
//      identifier-based fix (adding `vehicle.plateNumber` to the row):
//      holding insurer/line/date/status constant means an identifier is the
//      ONLY field left that could ever distinguish these rows.
//
// Identifier availability by line, checked directly against
// lib/schemas/acord-data.ts before building either fixture:
//
//   motor     vehicle.plateNumber, vehicle.vin        available
//   property  property.address                        available
//   pet       pet.name                                 available
//   travel    travel.destinationScope only              no dates in the schema
//   health    NONE — insuredPersons is a crew/class schedule (role,
//             classLabel, count, benefits), not a list of named people
//   life      NONE — beneficiaries.name names the BENEFICIARY, not the
//             insured
//
// So health and life rows CANNOT be disambiguated by adding an identifier
// field, because none exists. VARIED-HOUSEHOLD deliberately includes two
// health policies sharing insurer + renewal date + status (a plausible real
// case — two family members on the same insurer's family health scheme,
// renewing together) specifically so this unresolvable case is visible in a
// realistic fixture, not just the synthetic single-line one. No field was
// invented to make them distinct; per the item's instruction, they are
// EXPECTED to collide.
//
// Both write real line-specific identifiers (plate/VIN/address) into
// `acordData` even though the CURRENT `duplicateIdentityRows()` definition
// never reads them (by design — see metrics.ts's doc comment: the policy
// number/identifier is deliberately excluded from the four-field identity
// string). They are there for the fixture's SECOND life: whatever P5-wallet-01
// builds to render an identifier on the row can point at this same fixture
// and expect the motor/property rows (but not health/life) to stop
// colliding.
// ─────────────────────────────────────────────────────────────────────────────

interface IdentityFixturePolicySpec {
    policyNumber: string
    lineOfBusiness: "motor" | "home" | "health" | "life"
    insurerName: string
    /** days from now; kept positive (active) for both fixtures — the metric
     *  under test is identity collision, not lifecycle state. */
    endInDays: number
    premiumAmount: number
    /** Written into acordData.vehicle — NOT read by the current metric. */
    vehicle?: { plateNumber: string; vin: string }
    /** Written into acordData.property — NOT read by the current metric. */
    property?: { address: string }
    /** Why this row is here, when it is not just filler. */
    note?: string
}

/**
 * Shared row-writer for both P5-wallet-01a fixtures below. Deliberately NOT
 * `applyPortfolioState`: that function owns the `ΣΥΜΒ-2026-` prefix and a
 * fixed set of PolicySpec shapes with no room for per-line identifiers
 * (plate/VIN/address) — forking the acordData shape into a second function
 * is less risk than teaching one function two incompatible schemas.
 * Idempotent by upsert-on-(ownerId, policyNumber), matching
 * `applyUnknownHouseholdFixture`'s pattern above.
 */
async function createIdentityFixturePolicy(db: any, ownerId: string, spec: IdentityFixturePolicySpec): Promise<string> {
    const end = utcMidnight(spec.endInDays)
    const start = utcMidnight(spec.endInDays - 365)
    const analyzedAt = new Date(Date.now() - 5 * DAY)

    const acordData: Record<string, unknown> = {
        _version: 3,
        policy: {
            insurerName: spec.insurerName,
            policyNumber: spec.policyNumber,
            lineOfBusiness: spec.lineOfBusiness,
            effectiveDate: start.toISOString().slice(0, 10),
            expirationDate: end.toISOString().slice(0, 10),
            premium: { amount: spec.premiumAmount, currency: "EUR" },
        },
        extraction: {
            source: "fixture",
            extractedAt: new Date().toISOString(),
            reviewState: "unconfirmed",
            summaryLanguage: "el",
        },
    }
    if (spec.vehicle) acordData.vehicle = spec.vehicle
    if (spec.property) acordData.property = spec.property

    const data = {
        ownerUserId: ownerId,
        createdByUserId: ownerId,
        policyNumber: spec.policyNumber,
        insurerName: spec.insurerName,
        lineOfBusiness: spec.lineOfBusiness,
        status: "active",
        startDate: start,
        endDate: end,
        coverageEndDate: end,
        premiumAmount: spec.premiumAmount,
        premiumCurrency: "EUR",
        coverageSummary: SUMMARY_EL,
        lastAnalyzedAt: analyzedAt,
        acordData,
    }

    let policy = await db.policy.findFirst({ where: { ownerUserId: ownerId, policyNumber: spec.policyNumber }, select: { id: true } })
    if (policy) {
        await db.policy.update({ where: { id: policy.id }, data })
    } else {
        policy = await db.policy.create({ data, select: { id: true } })
    }

    const run = await db.policyAnalysisRun.findFirst({ where: { policyId: policy.id }, select: { id: true } })
    if (!run) {
        await db.policyAnalysisRun.create({
            data: {
                policyId: policy.id,
                userId: ownerId,
                provider: "fixture",
                model: "fixture",
                status: "completed",
                overallSuccessPct: 100,
                startedAt: analyzedAt,
                finishedAt: analyzedAt,
            },
        })
    }
    return policy.id
}

/** Policy-number prefix — isolates this fixture's rows from every other prefix on the account. */
export const VARIED_HOUSEHOLD_PREFIX = "WH-VARIED-"

/**
 * 2 vehicles (distinct plates/VINs, mixed insurers/dates) + 1 property +
 * 3 health (2 deliberately colliding, 1 distinct) + 1 life = 7 policies.
 */
export function variedHouseholdPolicies(): IdentityFixturePolicySpec[] {
    return [
        {
            policyNumber: `${VARIED_HOUSEHOLD_PREFIX}MOT1`,
            lineOfBusiness: "motor",
            insurerName: "Interamerican",
            endInDays: 210,
            premiumAmount: 340,
            vehicle: { plateNumber: "ΙΖΤ-1234", vin: "WVWZZZ1KZAW000001" },
        },
        {
            policyNumber: `${VARIED_HOUSEHOLD_PREFIX}MOT2`,
            lineOfBusiness: "motor",
            insurerName: "Ergo",
            endInDays: 55,
            premiumAmount: 290,
            vehicle: { plateNumber: "ΝΞΗ-7890", vin: "WVWZZZ1KZAW000002" },
        },
        {
            policyNumber: `${VARIED_HOUSEHOLD_PREFIX}HOME1`,
            lineOfBusiness: "home",
            insurerName: "Generali",
            endInDays: 300,
            premiumAmount: 220,
            property: { address: "Λεωφόρος Κηφισίας 123, Αθήνα 115 23" },
        },
        {
            policyNumber: `${VARIED_HOUSEHOLD_PREFIX}HLT1`,
            lineOfBusiness: "health",
            insurerName: "Εθνική Ασφαλιστική",
            endInDays: 40,
            premiumAmount: 950,
            note: "family health scheme, member A — DELIBERATELY shares insurer+date+status with HLT2 (no insured-party field exists to distinguish them, see comment above)",
        },
        {
            policyNumber: `${VARIED_HOUSEHOLD_PREFIX}HLT2`,
            lineOfBusiness: "health",
            insurerName: "Εθνική Ασφαλιστική",
            endInDays: 40,
            premiumAmount: 1100,
            note: "family health scheme, member B — the unresolvable twin of HLT1",
        },
        {
            policyNumber: `${VARIED_HOUSEHOLD_PREFIX}HLT3`,
            lineOfBusiness: "health",
            insurerName: "Interamerican",
            endInDays: 200,
            premiumAmount: 480,
            note: "a third, DISTINCT health policy — different insurer and date, so the household is not ALL colliding health rows",
        },
        {
            policyNumber: `${VARIED_HOUSEHOLD_PREFIX}LIFE1`,
            lineOfBusiness: "life",
            insurerName: "NN Hellas",
            endInDays: 400,
            premiumAmount: 500,
        },
    ]
}

export async function applyVariedHouseholdFixture(db: any, ownerEmail: string): Promise<string[]> {
    if (PROD_GUARD) {
        throw new Error("applyVariedHouseholdFixture: refusing to run against the PRODUCTION database")
    }
    const owner = await db.user.findUnique({ where: { email: ownerEmail }, select: { id: true } })
    if (!owner) throw new Error(`applyVariedHouseholdFixture: ${ownerEmail} not provisioned — run global-setup first`)

    // Own-prefix-only delete, matching applyPortfolioState's isolation rule —
    // never touches another fixture family's rows on the same account.
    // Both identity fixtures clear BOTH prefixes, not just their own.
    //
    // Own-prefix-only isolation is right for fixtures that coexist; these two
    // cannot. They are mutually exclusive portfolio SHAPES — a wallet is either
    // a varied household or a single-line concentration — and they render into
    // the same list, so leaving the other in place measures their union. That
    // is what happened: applying one on top of the other produced a 13-row
    // wallet and an identity count of 8/6 that described neither fixture. The
    // spec's row-count assertion caught it rather than publishing the number.
    await db.policy.deleteMany({ where: { ownerUserId: owner.id, policyNumber: { startsWith: VARIED_HOUSEHOLD_PREFIX } } })
    // Both identity fixtures clear BOTH prefixes, not just their own.
    //
    // Own-prefix-only isolation is right for fixtures that coexist; these two
    // cannot. They are mutually exclusive portfolio SHAPES — a wallet is either
    // a varied household or a single-line concentration — and they render into
    // the same list, so leaving the other in place measures their union. That
    // is what happened: applying one on top of the other produced a 13-row
    // wallet and an identity count of 8/6 that described neither fixture. The
    // spec's row-count assertion caught it rather than publishing the number.
    await db.policy.deleteMany({ where: { ownerUserId: owner.id, policyNumber: { startsWith: SINGLE_LINE_CONCENTRATION_PREFIX } } })
    await db.policy.deleteMany({ where: { ownerUserId: owner.id, policyNumber: { startsWith: VARIED_HOUSEHOLD_PREFIX } } })

    const created: string[] = []
    for (const spec of variedHouseholdPolicies()) {
        created.push(await createIdentityFixturePolicy(db, owner.id, spec))
    }
    return created
}

/** Policy-number prefix — isolates this fixture's rows from every other prefix on the account. */
export const SINGLE_LINE_CONCENTRATION_PREFIX = "WH-CONC-"

/**
 * 6 motor policies, ONE insurer, ONE renewal date, all active — line,
 * insurer, status and date held constant on purpose. Distinct plates/VINs
 * ARE written (unlike the collision this produces today) so a future
 * identifier-based fix has something real to render.
 */
export function singleLineConcentrationPolicies(): IdentityFixturePolicySpec[] {
    const insurer = "Interamerican"
    const sharedEndInDays = 180
    return Array.from({ length: 6 }, (_, i) => ({
        policyNumber: `${SINGLE_LINE_CONCENTRATION_PREFIX}MOT${i + 1}`,
        lineOfBusiness: "motor" as const,
        insurerName: insurer,
        endInDays: sharedEndInDays,
        premiumAmount: 300 + i * 5,
        vehicle: { plateNumber: `ΙΝΤ-000${i + 1}`, vin: `WVWZZZ1KZAW10000${i + 1}` },
    }))
}

export async function applySingleLineConcentrationFixture(db: any, ownerEmail: string): Promise<string[]> {
    if (PROD_GUARD) {
        throw new Error("applySingleLineConcentrationFixture: refusing to run against the PRODUCTION database")
    }
    const owner = await db.user.findUnique({ where: { email: ownerEmail }, select: { id: true } })
    if (!owner) throw new Error(`applySingleLineConcentrationFixture: ${ownerEmail} not provisioned — run global-setup first`)

    // Both identity fixtures clear BOTH prefixes, not just their own — see the
    // matching comment on applyVariedHouseholdFixture above. This function was
    // found missing the VARIED_HOUSEHOLD_PREFIX half of the clear during
    // P5-wallet-01a-FINISH: applyVariedHouseholdFixture already cleared both,
    // but this direction did not, so a varied-household capture followed by a
    // single-line-concentration capture would have unioned 7 WH-VARIED- rows
    // onto the 6 WH-CONC- rows — the exact 13-row contamination this pair of
    // fixtures already hit once, just approached from the other fixture.
    await db.policy.deleteMany({ where: { ownerUserId: owner.id, policyNumber: { startsWith: VARIED_HOUSEHOLD_PREFIX } } })
    await db.policy.deleteMany({ where: { ownerUserId: owner.id, policyNumber: { startsWith: SINGLE_LINE_CONCENTRATION_PREFIX } } })

    const created: string[] = []
    for (const spec of singleLineConcentrationPolicies()) {
        created.push(await createIdentityFixturePolicy(db, owner.id, spec))
    }
    return created
}
