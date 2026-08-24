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
    /** `null` reproduces T-012 item 7: a policy the extractor never priced, against pages that total premiums. */
    premiumAmount: number | null
    /** slugs of ACTIVE authored gap definitions to attach as open instances */
    gapSlugs: string[]
    /**
     * DEFECT-STATE fixtures (Goal 1 acceptance).
     *
     * The six matrix fixtures are healthy by construction, which is right for
     * measuring layout but proves nothing about a fix to a broken state. These
     * flags reproduce the exact conditions the Goal 0 baseline confirmed, so
     * the acceptance pass can assert the fixed behaviour rather than assume it:
     *
     *  - `englishSummary`  → B2: a stored summary in the wrong language, and
     *                        no language tag (the state every legacy row is in).
     *  - `unreadableValues`→ B10: extractor placeholders («XXXX») in a field
     *                        AND embedded in the composed summary sentence.
     *  - `failedLatestRun` → B5: a completed run followed by a FAILED one, with
     *                        the processingError the page reads.
     *
     * T-012 additions — degraded conditions the matrix could not yet produce:
     *
     *  - `unmappedGapSlug`     → a GapInstance attached to a GapDefinition whose
     *                            slug is not one the 29 authored rows use and does
     *                            not normalize to a `GAP_CONTENT_MAP` key —
     *                            the shape of an AI-minted definition
     *                            (`lib/gaps/authored-catalogue.ts`'s "the clarity
     *                            pipeline still emits slug VARIANTS that never
     *                            become rows"). Exercises `resolveGapContent`'s
     *                            unmapped-slug fallback (`lib/wallet/gap-report.ts`).
     *  - `placeholderIdentity` → BOTH identity columns hold the extractor's own
     *                            sentinels (`__PENDING_EXTRACTION__`,
     *                            `PENDING-<epoch>`) on a run that completed
     *                            successfully, AND the composed summary embeds
     *                            an unreadable-value marker of its own. See
     *                            `lib/wallet/policy-identity.ts` and
     *                            `lib/wallet/unreadable-value.ts` — two separate
     *                            modules, deliberately exercised together.
     *  - `rawEnumLimitBasis`   → a coverage limit's `basis` set to a value
     *                            outside `LIMIT_BASES`
     *                            (lib/schemas/acord-data.ts). Unlike
     *                            `StructuredCoverageTable`'s `statusLabel`
     *                            (which falls back to `null`), `basisLabel`
     *                            falls back to the RAW string
     *                            (`map[basis] ?? basis`) — this is the fixture
     *                            for that leak.
     *  - `noDocuments`         → an analysed policy with zero `PolicyDocument`
     *                            rows (every other fixture attaches exactly
     *                            one) — an unspecified empty state.
     *
     * `premiumAmount: null` on a spec (see the field above) is the other T-012
     * empty state: a policy the extractor never priced.
     */
    englishSummary?: boolean
    unreadableValues?: boolean
    failedLatestRun?: boolean
    unmappedGapSlug?: boolean
    placeholderIdentity?: boolean
    rawEnumLimitBasis?: boolean
    noDocuments?: boolean
}

export const FIXTURE_SPECS: FixtureSpec[] = [
    { key: "motor-active",   policyNumber: "ΣΥΜΒ-2025-MOT-ACT", lineOfBusiness: "motor",  state: "active",   insurerName: "Interamerican", premiumAmount: 312.4,  gapSlugs: ["no_own_damage_cover", "no_glass_breakage_cover"] },
    { key: "motor-expiring", policyNumber: "ΣΥΜΒ-2025-MOT-EXP", lineOfBusiness: "motor",  state: "expiring", insurerName: "Interamerican", premiumAmount: 298.1,  gapSlugs: ["no_own_damage_cover", "no_glass_breakage_cover"] },
    { key: "motor-expired",  policyNumber: "ΣΥΜΒ-2025-MOT-XPD", lineOfBusiness: "motor",  state: "expired",  insurerName: "Interamerican", premiumAmount: 287.55, gapSlugs: ["no_own_damage_cover", "no_glass_breakage_cover"] },
    { key: "health-active",   policyNumber: "ΣΥΜΒ-2025-HL-ACT", lineOfBusiness: "health", state: "active",   insurerName: "Εθνική Ασφαλιστική", premiumAmount: 1138.27, gapSlugs: ["no_direct_billing", "no_annual_checkup"] },
    { key: "health-expiring", policyNumber: "ΣΥΜΒ-2025-HL-EXP", lineOfBusiness: "health", state: "expiring", insurerName: "Εθνική Ασφαλιστική", premiumAmount: 1102.9,  gapSlugs: ["no_direct_billing", "no_annual_checkup"] },
    { key: "health-expired",  policyNumber: "ΣΥΜΒ-2025-HL-XPD", lineOfBusiness: "health", state: "expired",  insurerName: "Εθνική Ασφαλιστική", premiumAmount: 1064.3,  gapSlugs: ["no_direct_billing", "no_annual_checkup"] },
]

/**
 * Defect-state fixtures — NOT part of the 18-capture measurement matrix.
 * They exist so Goal 1 can prove each confirmed defect is actually fixed in
 * the state that produced it, at all three widths.
 */
export const DEFECT_SPECS: FixtureSpec[] = [
    {
        key: "defect-english-summary",
        policyNumber: "ΣΥΜΒ-2025-DEF-EN",
        lineOfBusiness: "motor",
        state: "active",
        insurerName: "Interamerican",
        premiumAmount: 94.07,
        gapSlugs: ["no_own_damage_cover"],
        englishSummary: true,
    },
    {
        key: "defect-unreadable",
        policyNumber: "ΣΥΜΒ-2025-DEF-XX",
        lineOfBusiness: "motor",
        state: "active",
        insurerName: "Interamerican",
        premiumAmount: 287.4,
        gapSlugs: ["no_glass_breakage_cover"],
        unreadableValues: true,
    },
    {
        key: "defect-failed-run",
        policyNumber: "ΣΥΜΒ-2025-DEF-FA",
        lineOfBusiness: "health",
        state: "active",
        insurerName: "Εθνική Ασφαλιστική",
        premiumAmount: 1138.27,
        gapSlugs: [],
        failedLatestRun: true,
    },
    // ── T-012 additions ──────────────────────────────────────────────────
    {
        key: "defect-unmapped-gap",
        policyNumber: "ΣΥΜΒ-2025-DEF-UG",
        lineOfBusiness: "motor",
        state: "active",
        insurerName: "Interamerican",
        premiumAmount: 301.0,
        // One ordinary authored gap alongside the rogue one, so the card is
        // not alone on the page — a single-gap policy proves nothing about
        // whether the unmapped one reads differently from its neighbours.
        gapSlugs: ["no_own_damage_cover"],
        unmappedGapSlug: true,
    },
    {
        key: "defect-placeholder-identity",
        // The identity column ITSELF is the fixture — see policyIdentity below.
        policyNumber: "PENDING-1700000000000",
        lineOfBusiness: "motor",
        state: "active",
        insurerName: "__PENDING_EXTRACTION__",
        premiumAmount: 250.0,
        gapSlugs: [],
        placeholderIdentity: true,
    },
    {
        key: "defect-raw-enum-basis",
        policyNumber: "ΣΥΜΒ-2025-DEF-RE",
        lineOfBusiness: "motor",
        state: "active",
        insurerName: "Interamerican",
        premiumAmount: 275.0,
        gapSlugs: ["no_own_damage_cover"],
        rawEnumLimitBasis: true,
    },
    {
        key: "defect-no-premium",
        policyNumber: "ΣΥΜΒ-2025-DEF-NP",
        lineOfBusiness: "motor",
        state: "active",
        insurerName: "Interamerican",
        premiumAmount: null,
        gapSlugs: ["no_own_damage_cover"],
    },
    {
        key: "defect-no-documents",
        policyNumber: "ΣΥΜΒ-2025-DEF-ND",
        lineOfBusiness: "health",
        state: "active",
        insurerName: "Εθνική Ασφαλιστική",
        premiumAmount: 500.0,
        gapSlugs: ["no_direct_billing"],
        noDocuments: true,
    },
    {
        key: "defect-long-insurer",
        lineOfBusiness: "motor",
        state: "active",
        // The longest REAL registered insurer legal name in the reference
        // catalogue (prisma/greek-insurers.json, id `deuteros-allilasfalistikos`,
        // 134 chars) — longer even than dashboard-fixtures.ts's LONG_INSURER,
        // because the policy-detail header renders the name at a narrower
        // column than the dashboard's policy row.
        insurerName:
            "Δεύτερος Αλληλασφαλιστικός Συνεταιρισμός Επαγγελματιών Ιδιοκτητών Αυτοκινήτων Δημόσιας Χρήσεως Βορείου Ελλάδος και Θεσσαλίας ΣΥΝ. Π.Ε.",
        policyNumber: "ΣΥΜΒ-2025-DEF-LI",
        premiumAmount: 340.0,
        gapSlugs: ["no_own_damage_cover", "no_glass_breakage_cover"],
    },
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
            // null premiumAmount (defect-no-premium) means "not recorded", not
            // zero — omit the field entirely rather than writing amount: null,
            // matching how dashboard-fixtures.ts's applyPortfolioState handles
            // the same case.
            premium: spec.premiumAmount == null ? {} : { amount: spec.premiumAmount, currency: "EUR" },
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
            // null premiumAmount (defect-no-premium) means "not recorded", not
            // zero — omit the field entirely rather than writing amount: null,
            // matching how dashboard-fixtures.ts's applyPortfolioState handles
            // the same case.
            premium: spec.premiumAmount == null ? {} : { amount: spec.premiumAmount, currency: "EUR" },
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

/** B2 reproduction: composed in English, exactly as the providers returned it. */
const ENGLISH_SUMMARY =
    "The policy concerns the insurance of the Toyota Yaris vehicle for the 2025-2026 period. It provides mandatory third-party liability, coverage for natural disasters (flood), forest fire, damages caused by an uninsured vehicle, and roadside assistance."

/** B10 reproduction: an extractor placeholder embedded in the model's sentence. */
const UNREADABLE_SUMMARY =
    "Το συμβόλαιο αφορά την ασφάλιση του οχήματος με αριθμό κυκλοφορίας (XXXX) για την περίοδο 2025-2026. Καλύπτει αστική ευθύνη προς τρίτους, πυρκαγιά και φυσικά φαινόμενα."

/**
 * T-012 item 3 reproduction: both identity columns hold a sentinel (see
 * `placeholderIdentity` on the spec) AND the composed summary embeds its own
 * unreadable-value marker — the "(????)" shape, distinct from B10's "(XXXX)"
 * above.
 *
 * MUST be bracketed. Verified directly against
 * `containsUnreadableMarker` (lib/wallet/unreadable-value.ts): its embedded-
 * marker regex only matches a bracketed run of `x`/`X`/`Χ`/`χ`/`?`
 * (`[([]...[)\]]`) OR a BARE run of 4+ `x`/`X`/`Χ`/`χ` — bare `?` runs are
 * excluded from the unbracketed branch, so a mid-sentence "????" with no
 * parentheses is invisible to it (`containsUnreadableMarker("... ???? ...")`
 * === false, confirmed). `(????)` matches; a bare run would silently fail to
 * reproduce the defect at all.
 */
const IDENTITY_PLACEHOLDER_SUMMARY =
    "Το συμβόλαιο αφορά ασφάλιση οχήματος με αριθμό κυκλοφορίας (????) για την περίοδο 2025-2026. Καλύπτει αστική ευθύνη τρίτων και πυρκαγιά."

const SUMMARY: Record<string, string> = {
    motor:
        "Το συμβόλαιο καλύπτει την αστική ευθύνη προς τρίτους έως €1.300.000, πυρκαγιά και φυσικά φαινόμενα για το Toyota Yaris. Περιλαμβάνει οδική βοήθεια 24/7. Δεν καλύπτει ίδιες ζημιές και θραύση κρυστάλλων — και η ζημιά πρέπει να δηλωθεί εντός 8 εργάσιμων ημερών.",
    health:
        "Το πρόγραμμα καλύπτει νοσοκομειακή περίθαλψη με ετήσιο όριο €1.500.000 και απαλλαγή €1.500 ανά περιστατικό, διαγνωστικές εξετάσεις έως €2.000 τον χρόνο και έξοδα από ατύχημα. Δεν περιλαμβάνει εξωνοσοκομειακή περίθαλψη και δεν προβλέπει απευθείας κάλυψη χωρίς προέγκριση.",
}

/**
 * The FREE-tier fixture set.
 *
 * Deliberately small and deliberately GAPPY: the free surfaces are all
 * boundaries — the gap report locks after FREE_GAP_PREVIEW_COUNT (3), so a
 * policy needs MORE than three findings for the lock and its €3 unlock CTA to
 * render at all. Two gaps would show a complete report and prove nothing.
 */
export const FREE_SPECS: FixtureSpec[] = [
    {
        key: "free-motor-active",
        policyNumber: "E2E-PDF-MOT-ACT",
        lineOfBusiness: "motor",
        state: "active",
        insurerName: "Interamerican",
        premiumAmount: 312.4,
        // Five > FREE_GAP_PREVIEW_COUNT, so the paywall boundary is visible.
        gapSlugs: [
            "no_own_damage_cover",
            "no_glass_breakage_cover",
            "no_roadside_assistance",
            "missing_accident_declaration_phone",
            "green_card_expiring",
        ],
    },
    {
        key: "free-health-expiring",
        policyNumber: "E2E-PDF-HL-EXP",
        lineOfBusiness: "health",
        state: "expiring",
        insurerName: "Εθνική Ασφαλιστική",
        premiumAmount: 1102.9,
        gapSlugs: ["no_direct_billing", "no_annual_checkup", "missing_hospital_class", "missing_coordination_centre"],
    },
]

/**
 * Idempotent provisioning. Prisma client is injected (the spec loads it the
 * same way global-setup does). Refuses the production project outright.
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

export async function provisionMatrixFixtures(
    db: any,
    ownerEmail: string,
    specs: FixtureSpec[] = [...FIXTURE_SPECS, ...DEFECT_SPECS]
): Promise<Record<string, string>> {
    if (/cquudefwfwrmvpftuhyl/.test(process.env.DATABASE_URL || "") || /cquudefwfwrmvpftuhyl/.test(process.env.DIRECT_URL || "")) {
        throw new Error("provisionMatrixFixtures: refusing to run against the PRODUCTION database")
    }
    const owner = await db.user.findUnique({ where: { email: ownerEmail }, select: { id: true } })
    if (!owner) throw new Error(`provisionMatrixFixtures: owner ${ownerEmail} not provisioned — run global-setup first`)

    const now = new Date()
    const ids: Record<string, string> = {}

    for (const spec of specs) {
        const { start, end } = fixtureDates(spec.state, now)
        const acord: any = spec.lineOfBusiness === "motor" ? motorAcord(spec, start, end) : healthAcord(spec, start, end)
        const analyzedAt = new Date(start.getTime() + 2 * 86_400_000)
        let summary = SUMMARY[spec.lineOfBusiness]

        // ── Defect states (Goal 1 acceptance) ───────────────────────────────
        if (spec.englishSummary) {
            // A summary composed in English and stored with NO language tag —
            // the state of every row written before the tag existed, and the
            // exact shape of production policy 64504715.
            summary = ENGLISH_SUMMARY
            delete acord.extraction.summaryLanguage
        }
        if (spec.unreadableValues) {
            // The extractor's own placeholders, stored verbatim: one whole
            // field, one embedded in the composed sentence.
            acord.vehicle.plateNumber = "XXXX"
            summary = UNREADABLE_SUMMARY
        }
        if (spec.failedLatestRun) {
            // What the page reads to decide "the last analysis failed".
            acord.processingError = {
                code: "TRANSIENT_FAILURE",
                message: "Your project has exceeded its monthly spending cap.",
                retryable: true,
                occurredAt: new Date(now.getTime() - 3 * 86_400_000).toISOString(),
            }
        }
        if (spec.placeholderIdentity) {
            // insurerName/policyNumber are already the sentinels — set directly
            // on the spec (see DEFECT_SPECS) — this half just embeds a SECOND,
            // independent placeholder in the composed summary sentence, the
            // same "two placeholders, two modules" shape as `unreadableValues`
            // above (lib/wallet/policy-identity.ts vs lib/wallet/unreadable-value.ts).
            summary = IDENTITY_PLACEHOLDER_SUMMARY
        }
        if (spec.rawEnumLimitBasis) {
            // A `basis` value StructuredCoverageTable's map does not know.
            // Unlike `statusLabel` (falls back to null, hides the field),
            // `basisLabel` falls back to the RAW string — `map[basis] ?? basis`
            // — so this reaches the customer verbatim instead of a translated
            // label ("per_incident" instead of "Ανά περιστατικό").
            if (acord.coverages?.[0]?.limits?.[0]) {
                acord.coverages[0].limits[0].basis = "per_incident"
            }
        }

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
            coverageSummary: summary,
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

        // One generated-label document row (same rule as production labels) —
        // UNLESS this spec is `noDocuments` (T-012 item 7): an analysed policy
        // with zero uploaded documents, an unspecified empty state every other
        // fixture papers over by always attaching exactly one.
        if (!spec.noDocuments) {
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
        } else {
            // Idempotency for a spec that FLIPS to noDocuments after already
            // having provisioned one (defensive; this key has never had the
            // flag off, but a future edit could reorder fields) — clean up any
            // document a previous run attached under the generated label.
            const label = `Ασφαλιστήριο ${spec.lineOfBusiness === "motor" ? "Αυτοκίνητο" : "Υγεία"} · ${spec.policyNumber}`
            await db.policyDocument.deleteMany({ where: { policyId: policy.id, fileName: label } })
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
            // B5: a FAILED run AFTER the completed one — the real shape, where
            // the page body renders the last good extraction while the newest
            // run is the broken one.
            if (spec.failedLatestRun) {
                const failedAt = new Date(now.getTime() - 3 * 86_400_000)
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

        // Open gap instances from ACTIVE authored definitions. Severity is
        // copied from the definition — the same value the rule engine writes;
        // no severity is invented here (fixture mirrors decideGapsForPolicy's
        // write shape, it does not re-decide anything).
        for (const [gapIndex, slug] of spec.gapSlugs.entries()) {
            const def = await db.gapDefinition.findFirst({ where: { slug, isActive: true }, select: { id: true, severity: true, ruleId: true } })
            if (!def) continue
            const existing = await db.gapInstance.findFirst({ where: { policyId: policy.id, gapDefinitionId: def.id }, select: { id: true } })
            if (existing) {
                // REFRESH the prose on a row that already exists. The original
                // `if (!existing)` skip meant a fixture-text change never reached
                // an already-seeded account — which is why the placeholder string
                // kept rendering on `e2e-ph` long after the fixture was corrected.
                await db.gapInstance.update({
                    where: { id: existing.id },
                    data: {
                        aiExplanationEl: FIXTURE_GAP_PROSE[gapIndex % FIXTURE_GAP_PROSE.length].el,
                        aiExplanation: FIXTURE_GAP_PROSE[gapIndex % FIXTURE_GAP_PROSE.length].en,
                        aiSuggestionEl: FIXTURE_GAP_PROSE[gapIndex % FIXTURE_GAP_PROSE.length].suggestionEl,
                        aiSuggestion: FIXTURE_GAP_PROSE[gapIndex % FIXTURE_GAP_PROSE.length].suggestionEn,
                    },
                })
            } else {
                // RACE-SAFE. find-then-create is not atomic, and Playwright runs
                // these specs on two workers against ONE account: both looked,
                // both found nothing, both created, and the second hit the
                // database's unique index on (policy_id, gap_definition_id).
                //
                // Note the index is enforced by the DATABASE but is NOT declared
                // on the Prisma model — there is no `@@unique([policyId,
                // gapDefinitionId])` — so `upsert` cannot address it and the
                // violation only shows up at runtime. Recorded in GOAL1R.md.
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
                    // Another worker won the race. Its row is equivalent — the
                    // prose comes from the same pool at the same index — so the
                    // fixture is satisfied either way.
                    if (error?.code !== "P2002") throw error
                })
            }
        }

        if (spec.unmappedGapSlug) {
            // A GapDefinition the authored catalogue never wrote — the shape of
            // an AI-minted row (lib/gaps/authored-catalogue.ts's "the clarity
            // pipeline still emits slug VARIANTS that never become rows"; the
            // Aug-2026 production incident CLAUDE.md records: 41 rows with
            // `rule_id` `ai_*` and `detectionLogic: { source:
            // "ai_clarity_pipeline" }`). This is a TEST FIXTURE reproducing
            // that unauthored state — never sourced from authored-catalogue.ts,
            // and never written by application code.
            //
            // Slug chosen to survive `normalizeGapSlug` (lib/wallet/gap-report.ts:
            // underscores → hyphens) into "no-glass-cover-variant", confirmed
            // NOT a GAP_CONTENT_MAP key. "no-glass-coverage" (the variant named
            // in the T-012 brief) was checked directly against GAP_CONTENT_MAP
            // and already aliases to the authored "glass-breakage" concept —
            // using it would not reproduce this defect at all.
            const rogueSlug = "no_glass_cover_variant"
            let rogueDef = await db.gapDefinition.findFirst({
                where: { slug: rogueSlug },
                select: { id: true, severity: true, ruleId: true },
            })
            if (!rogueDef) {
                rogueDef = await db.gapDefinition
                    .create({
                        data: {
                            slug: rogueSlug,
                            name: "AI-minted glass cover variant (fixture)",
                            title: "Θραύση κρυστάλλων — παραλλαγή όρου (fixture)",
                            description:
                                "Fixture-only definition mirroring an unauthored, AI-minted slug variant — never sourced from lib/gaps/authored-catalogue.ts.",
                            lineOfBusiness: spec.lineOfBusiness,
                            severity: "medium",
                            defaultSeverity: "medium",
                            ruleId: "ai_clarity_pipeline",
                            detectionLogic: { source: "ai_clarity_pipeline" },
                            isActive: true,
                        },
                        select: { id: true, severity: true, ruleId: true },
                    })
                    .catch(async (error: any) => {
                        // Another worker/run created it first (slug is @unique).
                        if (error?.code !== "P2002") throw error
                        const found = await db.gapDefinition.findFirst({
                            where: { slug: rogueSlug },
                            select: { id: true, severity: true, ruleId: true },
                        })
                        if (!found) throw error
                        return found
                    })
            }

            const existingRogue = await db.gapInstance.findFirst({
                where: { policyId: policy.id, gapDefinitionId: rogueDef.id },
                select: { id: true },
            })
            if (!existingRogue) {
                await db.gapInstance
                    .create({
                        data: {
                            policyId: policy.id,
                            userId: owner.id,
                            gapDefinitionId: rogueDef.id,
                            severity: rogueDef.severity,
                            status: "detected",
                            validationState: "probable",
                            ruleId: rogueDef.ruleId,
                            engineVersion: "fixture",
                            ruleInputs: { fixture: true },
                            // The model's own prose — what `resolveGapContent`
                            // used to promote into the card's HEADING for an
                            // unmapped slug, before the fix moved unmapped
                            // titles to a generic label and kept the prose as
                            // BODY text. Shown here as body only; the fixture's
                            // job is to make the unmapped path reachable, not
                            // to assert which rendering behaviour is current.
                            aiExplanationEl:
                                "Το ασφαλιστήριο δεν αναφέρει ρητά κάλυψη θραύσης κρυστάλλων για αυτή την παραλλαγή όρου — πιθανή έλλειψη.",
                            aiExplanation:
                                "The policy does not explicitly state glass-breakage cover for this clause variant — a possible gap.",
                            aiSuggestionEl: "Ζητήστε από τον ασφαλιστή σας διευκρίνιση για αυτή τη ρήτρα.",
                            aiSuggestion: "Ask your insurer to clarify this clause.",
                        },
                    })
                    .catch((error: any) => {
                        if (error?.code !== "P2002") throw error
                    })
            }
        }
    }
    return ids
}

// ─────────────────────────────────────────────────────────────────────────────
// V2-P0-FIX addition — a degraded PROFILE, not a degraded policy. Every
// fixture above varies what one policy's own data looks like; the risk
// graph and the /branches gap tiles also read `PolicyholderProfile`, which
// nothing above ever touches. Without it, invariant §2.2 cannot be
// reproduced on this account at all — see the verification note below.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Invariant §2.2 reproduction: "the product claims exposure for products a
 * customer does not own."
 *
 * Confirmed rendering sources:
 *   - components/coverage/RiskGraphPanel.tsx:71 — RiskState "unprotected"
 *     renders «Απροστάτευτο» (CSS-uppercased).
 *   - lib/i18n/translations/el.ts:1541 — `t.branches.statusGap` is
 *     «Πιθανό κενό», painted by /branches for a `deriveBranchState` "gap"
 *     tile (lib/insurance/branch-page.ts).
 *
 * WHY THIS NEEDS A DECLARED PROFILE, NOT JUST AN INCOMPLETE WALLET.
 * lib/services/gap-engine/risk-catalog.ts gates `pet_costs` on
 * `ctx.hasPets`, `cyber_fraud` on `ctx.cyberExposure === "moderate" |
 * "high"`, and `life_dependents` on `totalDependents(ctx) > 0 &&
 * isEarning(ctx)` — and every one of those deciding factors must also be
 * KNOWN (lib/services/gap-engine/life-context.ts's `known` map) before the
 * risk counts as `applicable`. A risk whose facts are unknown resolves to
 * `needs_review`, and `bindRisksToGraph`
 * (lib/services/risk-graph/protection.ts:504, `if (assessment.applicability
 * !== "applicable") continue`) drops it before it ever reaches the graph —
 * so a wallet simply missing pet/cyber/life policies, against a profile
 * that has never answered those questions, renders NOTHING for those
 * lines, not a false "unprotected". Reproducing §2.2 needs a profile that
 * has ANSWERED yes to an exposure it holds no matching policy for. This
 * account (`e2e-ph@policywallet.test`) already holds only motor and health
 * from `provisionMatrixFixtures`'s FIXTURE_SPECS/DEFECT_SPECS — this
 * function supplies the profile half so pet, cyber and life are genuinely
 * unowned lines with a genuinely declared exposure behind each.
 *
 * `childrenCount` is deliberately in `answeredFields` alongside
 * `dependentsCount`: `life_dependents.requires` lists BOTH `dependents` AND
 * `children`, and every listed factor must be known for the risk to become
 * `applicable` — omitting `childrenCount` (checked directly) left
 * `life_dependents` silently absent from the graph rather than merely
 * unprotected, which would have been a second, quieter way to fail to
 * reproduce the invariant.
 *
 * VERIFIED 2026-08-24 by calling the real render-layer functions directly
 * against this exact shape (this profile + one active motor policy + one
 * active health policy, no acordData) — not assumed:
 *
 *   assembleRiskGraph(profile, policies).views:
 *     cyber_fraud     (cyber)  → unprotected
 *     life_dependents (life)   → unprotected
 *     pet_costs       (pet)    → unprotected
 *     motor_liability (motor)  → unknown   (HELD line — see note below)
 *     health_access_delay (health) → unknown
 *
 *   buildBranchOverview(policies, calculateScoreFromAssessments(...).expectedLines):
 *     motor: covered · health: covered · pet: gap · cyber: gap · life: gap
 *
 * §2.2 CONFIRMED REPRODUCING on both surfaces: three lines the customer
 * holds no policy for (pet, cyber, life) render "Απροστάτευτο" on the risk
 * graph and "Πιθανό κενό" on /branches, driven by a profile that told the
 * engine it has pets, moderate cyber exposure and dependants.
 *
 * INCIDENTAL FINDING, not this invariant, left alone here: even the HELD
 * motor line renders `unknown` rather than `protected`, because a fixture
 * policy's `acordData` carries no readable perils or sum insured, so every
 * dimension `bindRisksToGraph` can evaluate comes back `unevaluable`. That
 * is the honest behaviour of unreadable extraction, not an unowned-line
 * claim about a line the customer does hold.
 */
export async function applyUnownedLinesProfileFixture(db: any, ownerEmail: string): Promise<void> {
    if (/cquudefwfwrmvpftuhyl/.test(process.env.DATABASE_URL || "") || /cquudefwfwrmvpftuhyl/.test(process.env.DIRECT_URL || "")) {
        throw new Error("applyUnownedLinesProfileFixture: refusing to run against the PRODUCTION database")
    }
    const owner = await db.user.findUnique({ where: { email: ownerEmail }, select: { id: true } })
    if (!owner) throw new Error(`applyUnownedLinesProfileFixture: owner ${ownerEmail} not provisioned — run global-setup first`)

    const data = {
        dependentsCount: 2,
        childrenCount: 0,
        employmentStatus: "employed",
        hasPets: true,
        petsCount: 2,
        cyberExposure: "moderate",
        vehiclesCount: 1,
        annualIncome: 32000,
        answeredFields: [
            "dependentsCount",
            "childrenCount",
            "employmentStatus",
            "hasPets",
            "petsCount",
            "cyberExposure",
            "vehiclesCount",
            "annualIncome",
        ],
    }

    const existing = await db.policyholderProfile.findUnique({ where: { userId: owner.id }, select: { id: true } })
    if (existing) {
        await db.policyholderProfile.update({ where: { userId: owner.id }, data })
    } else {
        await db.policyholderProfile.create({ data: { userId: owner.id, ...data } })
    }
}
