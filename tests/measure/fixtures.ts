/**
 * The six type×state fixture policies for the policy-detail evidence matrix
 * (docs/evidence/policy-detail-mobile): motor & health × active, expiring
 * (inside the 30-day renewal window) and expired. Provisioned idempotently
 * for the E2E policyholder in the LOCAL-DEV database only — the same account
 * and refusal-to-touch-prod guard as tests/global-setup.ts.
 *
 * These are LOCAL TEST FIXTURES: no production data, no records outside the
 * dev database the E2E suite already provisions into. Content is realistic
 * Greek-market data modelled on the shapes real extractions produce
 * (lib/schemas/acord-data.ts, v3: coverages[].status + structured limits).
 *
 * Dates are computed relative to "today" at provisioning time so the states
 * stay true whenever the matrix is re-run:
 *   active   → end +165 days   expiring → end +15 days   expired → end −110 days
 */

export interface FixtureSpec {
    /** matrix key, e.g. "motor-active" */
    key: string
    policyNumber: string
    lineOfBusiness: "motor" | "health"
    state: "active" | "expiring" | "expired"
    insurerName: string
    premiumAmount: number
    /** slugs of ACTIVE authored gap definitions to attach as open instances */
    gapSlugs: string[]
}

export const FIXTURE_SPECS: FixtureSpec[] = [
    { key: "motor-active",   policyNumber: "E2E-PDM-MOT-ACT", lineOfBusiness: "motor",  state: "active",   insurerName: "Interamerican", premiumAmount: 312.4,  gapSlugs: ["no_own_damage_cover", "no_glass_breakage_cover"] },
    { key: "motor-expiring", policyNumber: "E2E-PDM-MOT-EXP", lineOfBusiness: "motor",  state: "expiring", insurerName: "Interamerican", premiumAmount: 298.1,  gapSlugs: ["no_own_damage_cover", "no_glass_breakage_cover"] },
    { key: "motor-expired",  policyNumber: "E2E-PDM-MOT-XPD", lineOfBusiness: "motor",  state: "expired",  insurerName: "Interamerican", premiumAmount: 287.55, gapSlugs: ["no_own_damage_cover", "no_glass_breakage_cover"] },
    { key: "health-active",   policyNumber: "E2E-PDM-HL-ACT", lineOfBusiness: "health", state: "active",   insurerName: "Εθνική Ασφαλιστική", premiumAmount: 1138.27, gapSlugs: ["no_direct_billing", "no_annual_checkup"] },
    { key: "health-expiring", policyNumber: "E2E-PDM-HL-EXP", lineOfBusiness: "health", state: "expiring", insurerName: "Εθνική Ασφαλιστική", premiumAmount: 1102.9,  gapSlugs: ["no_direct_billing", "no_annual_checkup"] },
    { key: "health-expired",  policyNumber: "E2E-PDM-HL-XPD", lineOfBusiness: "health", state: "expired",  insurerName: "Εθνική Ασφαλιστική", premiumAmount: 1064.3,  gapSlugs: ["no_direct_billing", "no_annual_checkup"] },
]

const DAY = 86_400_000

export function fixtureDates(state: FixtureSpec["state"], now = new Date()): { start: Date; end: Date } {
    const at = (days: number) => {
        const d = new Date(now.getTime() + days * DAY)
        // policy end dates are stored at UTC midnight in the real book
        return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    }
    switch (state) {
        case "active":   return { start: at(-200), end: at(165) }
        case "expiring": return { start: at(-350), end: at(15) }
        case "expired":  return { start: at(-475), end: at(-110) }
    }
}

const iso = (d: Date) => d.toISOString().slice(0, 10)

function motorAcord(spec: FixtureSpec, start: Date, end: Date) {
    return {
        _version: 3,
        policy: {
            insurerName: spec.insurerName,
            policyNumber: spec.policyNumber,
            lineOfBusiness: "motor",
            effectiveDate: iso(start),
            expirationDate: iso(end),
            renewalDate: iso(end),
            issueDate: iso(start),
            premium: { amount: spec.premiumAmount, currency: "EUR" },
            premiumFrequency: "annual",
        },
        vehicle: {
            make: "Toyota",
            model: "Yaris",
            usage: "Ε.Ι.Χ.",
            plateNumber: "ΙΚΖ-4821",
            coverageTier: "third-party-fire",
            glassBreakage: false,
            ownVehicleDamage: false,
            hasRoadsideAssistance: true,
            roadsideAssistancePhone: "2109099999",
            accidentDeclarationPhone: "2109099999",
        },
        insureds: [{ name: "E2E Policyholder" }],
        coverages: [
            {
                name: "Σωματικές Βλάβες τρίτων",
                status: "included",
                limits: [{ basis: "per_person", amount: 1_300_000, currency: "EUR" }],
                explanation: { el: "Καλύπτει σωματικές βλάβες τρίτων ανά άτομο.", en: "Third-party bodily injury per person." },
            },
            {
                name: "Υλικές Ζημιές τρίτων",
                status: "included",
                limits: [{ basis: "per_event", amount: 1_300_000, currency: "EUR" }],
                explanation: { el: "Καλύπτει υλικές ζημιές τρίτων ανά ατύχημα.", en: "Third-party property damage per incident." },
            },
            {
                name: "Πυρκαγιά",
                status: "included",
                limits: [{ basis: "per_event", amount: 8_000, currency: "EUR" }],
                explanation: { el: "Ζημιές του οχήματος από πυρκαγιά.", en: "Own-vehicle fire damage." },
            },
            {
                name: "Φυσικά φαινόμενα",
                status: "included",
                limits: [{ basis: "per_event", amount: 8_000, currency: "EUR" }],
                explanation: { el: "Πλημμύρα, χαλάζι, καταιγίδα.", en: "Flood, hail, storm." },
            },
            {
                name: "Ίδιες ζημιές",
                status: "optional_not_taken",
                explanation: { el: "Προσφέρθηκε αλλά δεν επιλέχθηκε.", en: "Offered but not taken." },
            },
            {
                name: "Θραύση κρυστάλλων",
                status: "excluded",
                explanation: { el: "Δεν περιλαμβάνεται στο παρόν πρόγραμμα.", en: "Not included in this plan." },
            },
        ],
        exclusions: [
            "Οδήγηση υπό την επήρεια αλκοόλ ή τοξικών ουσιών",
            "Ζημιές από αγώνες, δοκιμές ταχύτητας ή επιδείξεις",
            "Οδηγός χωρίς ισχύουσα άδεια οδήγησης",
        ],
        notableConditions: [
            {
                conditionType: "claim_deadline",
                value: "8 εργάσιμες ημέρες",
                summary: { el: "Η ζημιά πρέπει να δηλωθεί εντός 8 εργάσιμων ημερών.", en: "Claims must be declared within 8 working days." },
            },
            {
                conditionType: "notification_obligation",
                value: "1 μήνας",
                summary: { el: "Δικαίωμα εναντίωσης εντός 1 μηνός εάν το συμβόλαιο παρεκκλίνει από την αίτηση.", en: "Right of objection within 1 month." },
            },
        ],
        finePrintClauses: [
            {
                clause: "Η Οδική Βοήθεια παρέχεται μέσω συνεργαζόμενης εταιρίας.",
                section: "Άρθρο 5",
                riskLevel: "info",
                impactSummary: { el: "Η οδική βοήθεια παρέχεται από εξωτερικό συνεργάτη.", en: "Roadside assistance is outsourced." },
            },
            {
                clause: "Σε περίπτωση μη γνωστοποίησης νέου οδηγού κάτω των 25, η αποζημίωση μειώνεται.",
                section: "Άρθρο 9",
                riskLevel: "warning",
                impactSummary: { el: "Νέος οδηγός που δεν έχει δηλωθεί μειώνει την αποζημίωση.", en: "Undeclared young driver reduces payout." },
            },
        ],
        perksAndBenefits: [
            {
                name: { el: "24ωρη Οδική Βοήθεια", en: "24h Roadside Assistance" },
                perkType: "assistance",
                description: { el: "Απεριόριστες κλήσεις εντός Ελλάδας.", en: "Unlimited callouts within Greece." },
                contactPhone: "2109099999",
                expiresWithPolicy: true,
                reminderRecommended: false,
            },
        ],
        extraction: {
            source: "fixture",
            extractedAt: new Date().toISOString(),
            reviewState: "unconfirmed",
            requiresReview: false,
            missingCriticalFields: [],
            confidence: { overall: 97, fields: { insurerName: 99, policyNumber: 99, endDate: 99, premiumAmount: 97 } },
            dateParse: { startDate: "ok", endDate: "ok", renewalDate: "ok", issueDate: "ok" },
        },
    }
}

function healthAcord(spec: FixtureSpec, start: Date, end: Date) {
    return {
        _version: 3,
        policy: {
            insurerName: spec.insurerName,
            policyNumber: spec.policyNumber,
            lineOfBusiness: "health",
            effectiveDate: iso(start),
            expirationDate: iso(end),
            renewalDate: iso(end),
            issueDate: iso(start),
            premium: { amount: spec.premiumAmount, currency: "EUR" },
            premiumFrequency: "annual",
        },
        health: {
            annualLimit: 1_500_000,
            roomAndBoardLimit: 400,
            hospitalClass: "Α",
            deductiblePerClaim: 1_500,
            outpatientLimit: 2_000,
            directBillingAvailable: false,
            annualCheckupIncluded: false,
            coordinationCentre: { name: "Συντονιστικό Κέντρο", phone: "2109099000" },
            waitingPeriods: [
                { type: "Προϋπάρχουσες παθήσεις", durationDays: 365 },
                { type: "Επεμβάσεις μη επείγουσες", durationDays: 180 },
            ],
        },
        insureds: [{ name: "E2E Policyholder" }, { name: "Μέλος Οικογένειας" }],
        coverages: [
            {
                name: "Νοσοκομειακή περίθαλψη",
                status: "included",
                limits: [{ basis: "per_period_aggregate", amount: 1_500_000, currency: "EUR" }],
                deductibles: [{ amount: 1_500, currency: "EUR" }],
                explanation: { el: "Κάλυψη νοσηλείας με ετήσιο όριο.", en: "Hospital care with annual limit." },
            },
            {
                name: "Διαγνωστικές εξετάσεις",
                status: "included",
                limits: [{ basis: "per_period_aggregate", amount: 2_000, currency: "EUR" }],
                explanation: { el: "Σε συμβεβλημένα διαγνωστικά κέντρα.", en: "At partner diagnostic centres." },
            },
            {
                name: "Έξοδα από ατύχημα",
                status: "included",
                limits: [{ basis: "per_event", amount: 2_000, currency: "EUR" }],
                explanation: { el: "Εξωνοσοκομειακά έξοδα συνεπεία ατυχήματος.", en: "Out-of-hospital accident expenses." },
            },
            {
                name: "Εξωνοσοκομειακή περίθαλψη",
                status: "optional_not_taken",
                explanation: { el: "Προσφέρθηκε αλλά δεν επιλέχθηκε.", en: "Offered but not taken." },
            },
        ],
        exclusions: [
            "Συμμετοχή 10% στα έξοδα νοσηλείας σε ΗΠΑ/Καναδά",
            "Προϋπάρχουσες παθήσεις που δεν δηλώθηκαν κατά την αίτηση",
        ],
        notableConditions: [
            {
                conditionType: "claim_deadline",
                value: "30 ημέρες",
                summary: { el: "Τα δικαιολογητικά νοσηλείας υποβάλλονται εντός 30 ημερών από την έξοδο.", en: "Hospital claim documents within 30 days of discharge." },
            },
            {
                conditionType: "co_payment",
                value: "10%",
                summary: { el: "Συμμετοχή 10% σε νοσηλεία εκτός συμβεβλημένων νοσοκομείων.", en: "10% co-payment outside partner hospitals." },
            },
        ],
        finePrintClauses: [
            {
                clause: "Η απευθείας κάλυψη προϋποθέτει προέγκριση από το Συντονιστικό Κέντρο.",
                section: "Όρος 12",
                riskLevel: "critical",
                impactSummary: { el: "Χωρίς προέγκριση, ο ασφαλισμένος προκαταβάλλει τα έξοδα.", en: "Without pre-approval the insured pays upfront." },
            },
        ],
        perksAndBenefits: [
            {
                name: { el: "Δεύτερη ιατρική γνώμη", en: "Second medical opinion" },
                perkType: "medical",
                description: { el: "Δωρεάν δεύτερη γνώμη για σοβαρές διαγνώσεις.", en: "Free second opinion for serious diagnoses." },
                contactPhone: "2109099000",
                expiresWithPolicy: true,
                reminderRecommended: true,
            },
        ],
        extraction: {
            source: "fixture",
            extractedAt: new Date().toISOString(),
            reviewState: "unconfirmed",
            requiresReview: false,
            missingCriticalFields: [],
            confidence: { overall: 95, fields: { insurerName: 99, policyNumber: 99, endDate: 99, premiumAmount: 95 } },
            dateParse: { startDate: "ok", endDate: "ok", renewalDate: "ok", issueDate: "ok" },
        },
    }
}

const SUMMARY: Record<string, string> = {
    motor:
        "Το συμβόλαιο καλύπτει την αστική ευθύνη προς τρίτους έως €1.300.000, πυρκαγιά και φυσικά φαινόμενα για το Toyota Yaris. Περιλαμβάνει οδική βοήθεια 24/7. Δεν καλύπτει ίδιες ζημιές και θραύση κρυστάλλων — και η ζημιά πρέπει να δηλωθεί εντός 8 εργάσιμων ημερών.",
    health:
        "Το πρόγραμμα καλύπτει νοσοκομειακή περίθαλψη με ετήσιο όριο €1.500.000 και απαλλαγή €1.500 ανά περιστατικό, διαγνωστικές εξετάσεις έως €2.000 τον χρόνο και έξοδα από ατύχημα. Δεν περιλαμβάνει εξωνοσοκομειακή περίθαλψη και δεν προβλέπει απευθείας κάλυψη χωρίς προέγκριση.",
}

/**
 * Idempotent provisioning. Prisma client is injected (the spec loads it the
 * same way global-setup does). Refuses the production project outright.
 */
export async function provisionMatrixFixtures(db: any, ownerEmail: string): Promise<Record<string, string>> {
    if (/cquudefwfwrmvpftuhyl/.test(process.env.DATABASE_URL || "") || /cquudefwfwrmvpftuhyl/.test(process.env.DIRECT_URL || "")) {
        throw new Error("provisionMatrixFixtures: refusing to run against the PRODUCTION database")
    }
    const owner = await db.user.findUnique({ where: { email: ownerEmail }, select: { id: true } })
    if (!owner) throw new Error(`provisionMatrixFixtures: owner ${ownerEmail} not provisioned — run global-setup first`)

    const now = new Date()
    const ids: Record<string, string> = {}

    for (const spec of FIXTURE_SPECS) {
        const { start, end } = fixtureDates(spec.state, now)
        const acord = spec.lineOfBusiness === "motor" ? motorAcord(spec, start, end) : healthAcord(spec, start, end)
        const analyzedAt = new Date(start.getTime() + 2 * 86_400_000)

        const data = {
            insurerName: spec.insurerName,
            lineOfBusiness: spec.lineOfBusiness,
            // stored ingestion status; the page derives the REAL lifecycle from dates
            status: "active",
            startDate: start,
            endDate: end,
            coverageEndDate: end,
            premiumAmount: spec.premiumAmount,
            premiumCurrency: "EUR",
            coverageSummary: SUMMARY[spec.lineOfBusiness],
            acordData: acord,
            lastAnalyzedAt: analyzedAt,
        }

        let policy = await db.policy.findFirst({ where: { ownerUserId: owner.id, policyNumber: spec.policyNumber }, select: { id: true } })
        if (policy) {
            await db.policy.update({ where: { id: policy.id }, data })
        } else {
            policy = await db.policy.create({
                data: { ownerUserId: owner.id, createdByUserId: owner.id, policyNumber: spec.policyNumber, ...data },
                select: { id: true },
            })
        }
        ids[spec.key] = policy.id

        // One generated-label document row (same rule as production labels).
        const label = `Ασφαλιστήριο ${spec.lineOfBusiness === "motor" ? "Αυτοκίνητο" : "Υγεία"} · ${spec.policyNumber}`
        const doc = await db.policyDocument.findFirst({ where: { policyId: policy.id, fileName: label }, select: { id: true } })
        if (!doc) {
            await db.policyDocument.create({
                data: {
                    policyId: policy.id,
                    fileUrl: "/e2e-fixtures/e2e-document.pdf",
                    fileName: label,
                    mimeType: "application/pdf",
                    fileSize: 24_576,
                    source: "policyholder",
                    processingStatus: "completed",
                    uploadedByUserId: owner.id,
                },
            })
        }

        // One COMPLETED analysis run so the coverage/analysis sections render
        // the analysed state, not the never-analysed absence copy.
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

        // Open gap instances from ACTIVE authored definitions. Severity is
        // copied from the definition — the same value the rule engine writes;
        // no severity is invented here (fixture mirrors decideGapsForPolicy's
        // write shape, it does not re-decide anything).
        for (const slug of spec.gapSlugs) {
            const def = await db.gapDefinition.findFirst({ where: { slug, isActive: true }, select: { id: true, severity: true, ruleId: true } })
            if (!def) continue
            const existing = await db.gapInstance.findFirst({ where: { policyId: policy.id, gapDefinitionId: def.id }, select: { id: true } })
            if (!existing) {
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
                        aiExplanation: "Fixture explanation for layout measurement.",
                        aiSuggestionEl: "Συζητήστε το με τον ασφαλιστικό σας σύμβουλο (δοκιμαστικό περιεχόμενο).",
                        aiSuggestion: "Fixture suggestion for layout measurement.",
                    },
                })
            }
        }
    }
    return ids
}
