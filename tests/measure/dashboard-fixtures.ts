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
                    policyNumber: "E2E-DASH-S1",
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
                { policyNumber: "E2E-DASH-T1", lineOfBusiness: "motor", insurerName: "Interamerican", endInDays: 210, premiumAmount: 312.4, analyzed: true, gaps: 2 },
                { policyNumber: "E2E-DASH-T2", lineOfBusiness: "health", insurerName: "Εθνική Ασφαλιστική", endInDays: 18, premiumAmount: 1138.27, analyzed: true, gaps: 1 },
                {
                    policyNumber: "E2E-DASH-T3",
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
                    policyNumber: "E2E-DASH-H1",
                    lineOfBusiness: "motor",
                    insurerName: LONG_INSURER,
                    endInDays: 164,
                    premiumAmount: 420,
                    analyzed: true,
                    gaps: 2,
                    reproduces: "D7 — the longest real insurer name, at 320px",
                },
                {
                    policyNumber: "E2E-DASH-H2",
                    lineOfBusiness: "motor",
                    insurerName: "Interamerican",
                    endInDays: 164,
                    premiumAmount: 380,
                    analyzed: true,
                    gaps: 2,
                    reproduces: "D11 — display values identical to H3 (same branch, same days, same insurer, same gap count)",
                },
                {
                    policyNumber: "E2E-DASH-H3",
                    lineOfBusiness: "motor",
                    insurerName: "Interamerican",
                    endInDays: 164,
                    premiumAmount: 380,
                    analyzed: true,
                    gaps: 2,
                    reproduces: "D11 — the twin of H2",
                },
                {
                    policyNumber: "E2E-DASH-H4",
                    lineOfBusiness: "health",
                    insurerName: LONG_INSURER_2,
                    endInDays: 12,
                    premiumAmount: null,
                    analyzed: true,
                    gaps: 3,
                    reproduces: "D4 — a policy with NO premium, against a page that totals premiums",
                },
                { policyNumber: "E2E-DASH-H5", lineOfBusiness: "home", insurerName: "Generali", endInDays: 30, premiumAmount: 240, analyzed: true, gaps: 1 },
                { policyNumber: "E2E-DASH-H6", lineOfBusiness: "life", insurerName: "NN Hellas", endInDays: 400, premiumAmount: 600, analyzed: true, gaps: 1 },
                { policyNumber: "E2E-DASH-H7", lineOfBusiness: "travel", insurerName: "Europ Assistance", endInDays: 45, premiumAmount: 60, analyzed: true },
                { policyNumber: "E2E-DASH-H8", lineOfBusiness: "pet", insurerName: "Interamerican", endInDays: 90, premiumAmount: 120, analyzed: true, gaps: 1 },
                {
                    policyNumber: "E2E-DASH-H9",
                    lineOfBusiness: "motor",
                    insurerName: "Ergo",
                    endInDays: 250,
                    premiumAmount: 290,
                    analyzed: false,
                    reproduces: "an UNANALYSED policy inside a scored portfolio",
                },
                {
                    policyNumber: "E2E-DASH-H10",
                    lineOfBusiness: "health",
                    insurerName: "Generali",
                    endInDays: 300,
                    premiumAmount: 900,
                    analyzed: true,
                    failedRun: true,
                    reproduces: "D1 — a failed run the score cannot see",
                },
                { policyNumber: "E2E-DASH-H11", lineOfBusiness: "home", insurerName: "Ydrogios", endInDays: -20, premiumAmount: 180, analyzed: true, gaps: 1, reproduces: "an EXPIRED policy inside a live portfolio" },
                { policyNumber: "E2E-DASH-H12", lineOfBusiness: "motor", insurerName: "Hellas Direct", endInDays: 500, premiumAmount: 210, analyzed: true },
            ]

        case "all-expired":
            // The score's honesty is most testable here: every policy is past
            // its end date, so the wallet provides no cover at all. A positive
            // verdict over this portfolio is a false statement about a
            // customer's protection (invariant 2).
            return [
                { policyNumber: "E2E-DASH-X1", lineOfBusiness: "motor", insurerName: "Interamerican", endInDays: -400, premiumAmount: 312.4, analyzed: true, gaps: 2 },
                { policyNumber: "E2E-DASH-X2", lineOfBusiness: "health", insurerName: LONG_INSURER, endInDays: -200, premiumAmount: 1138.27, analyzed: true, gaps: 1 },
                { policyNumber: "E2E-DASH-X3", lineOfBusiness: "home", insurerName: "Generali", endInDays: -90, premiumAmount: 240, analyzed: true, gaps: 1 },
                { policyNumber: "E2E-DASH-X4", lineOfBusiness: "life", insurerName: "NN Hellas", endInDays: -30, premiumAmount: 600, analyzed: true },
            ]
    }
}

const SUMMARY_EL =
    "Το συμβόλαιο καλύπτει την αστική ευθύνη προς τρίτους, πυρκαγιά και φυσικά φαινόμενα. Περιλαμβάνει οδική βοήθεια 24/7."

/**
 * Rebuild the dashboard account's wallet into `state`.
 *
 * Destructive by design and scoped by the `E2E-DASH-` prefix, so it can never
 * touch a policy another fixture set owns. Gap instances and analysis runs
 * cascade from the policy delete.
 */
export async function applyPortfolioState(db: any, ownerEmail: string, state: PortfolioState): Promise<string[]> {
    if (/cquudefwfwrmvpftuhyl/.test(process.env.DATABASE_URL || "") || /cquudefwfwrmvpftuhyl/.test(process.env.DIRECT_URL || "")) {
        throw new Error("applyPortfolioState: refusing to run against the PRODUCTION database")
    }
    const owner = await db.user.findUnique({ where: { email: ownerEmail }, select: { id: true } })
    if (!owner) throw new Error(`applyPortfolioState: ${ownerEmail} not provisioned — run global-setup first`)

    // Clear only THIS fixture family's policies.
    await db.policy.deleteMany({
        where: { ownerUserId: owner.id, policyNumber: { startsWith: "E2E-DASH-" } },
    })

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
            for (const def of defs) {
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
                        aiExplanationEl: "Σημείο για έλεγχο βάσει των στοιχείων του εγγράφου (δοκιμαστικό περιεχόμενο).",
                        aiSuggestionEl: "Συζητήστε το με τον ασφαλιστικό σας σύμβουλο (δοκιμαστικό περιεχόμενο).",
                    },
                })
            }
        }
    }

    return created
}
