/**
 * Test fixture: an Εθνική basic (third-party tier) motor policy.
 *
 * Provenance: extracted LIVE by the real pipeline (Gemini provider,
 * scripts/verify-pipeline-live.ts) from a real uploaded policy document during
 * the 2026-08 per-branch verification. The document's CID fonts carry no
 * usable ToUnicode map, so unlike the liability fixture the values were not
 * independently re-decoded locally; they are the real model's reading of the
 * real document, internally coherent and owner-confirmable against the paper.
 *
 * The IDENTITY is synthetic and always must be (fixture-pii guard). What is
 * real is the SHAPE: a basic policy whose covered list is liability + nature
 * perils + uninsured-vehicle — and NO theft, glass, legal, own damage — which
 * is exactly the profile the motor taxonomy's documented gaps target.
 */

import type { AIPolicyExtractionResponse } from "@/lib/services/ai/ai-service.interface"

export const MOTOR_ETHNIKI_2: AIPolicyExtractionResponse = {
    insurerName: "Η ΕΘΝΙΚΗ",
    policyNumber: "TEST-MOTOR-0002",
    lineOfBusiness: "motor",
    startDate: "2025-10-06",
    endDate: "2026-10-06",
    premiumAmount: 94.07,
    coverageSummary:
        "Βασική ασφάλιση οχήματος: αστική ευθύνη έναντι τρίτων, φυσικά φαινόμενα, " +
        "δασική πυρκαγιά, ζημιές από ανασφάλιστο όχημα. Δεν περιλαμβάνονται κλοπή, " +
        "θραύση κρυστάλλων, νομική προστασία, ίδιες ζημίες.",

    // Synthetic identity — see the file header.
    customerName: "ΝΙΚΟΛΑΟΣ",
    customerSurname: "ΑΝΤΩΝΙΟΥ",
    customerEmail: "nikolaos.antoniou@example.com",

    exclusions: [],

    extractionMeta: {
        overallConfidence: 92,
        fieldConfidence: {
            insurerName: 98,
            policyNumber: 98,
            lineOfBusiness: 97,
            startDate: 96,
            endDate: 96,
            premiumAmount: 94,
        },
        missingCriticalFields: [],
        requiresReview: false,
    },
}

/** What the clarity pass enumerated as covered, verbatim in kind. */
export const MOTOR_ETHNIKI_2_COVERED = [
    "Αστική ευθύνη έναντι τρίτων",
    "Φυσικά φαινόμενα",
    "Δασική πυρκαγιά",
    "Ζημιές από ανασφάλιστο όχημα",
]

/** The slugs the AI clarity pass reported for this document, live. */
export const MOTOR_ETHNIKI_2_AI_GAP_SLUGS = [
    "motor-glass-breakage",
    "motor-theft-fire",
    "motor-legal-protection",
    "motor-personal-accident",
    "motor-own-damage",
    "no-collision-coverage",
    "no-glass-breakage",
]
