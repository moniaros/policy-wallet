/**
 * Test fixture: an Εθνική general third-party liability policy
 * («ΑΣΦΑΛΙΣΤΗΡΙΟ ΑΣΤΙΚΗΣ ΕΥΘΥΝΗΣ ΠΡΟΣ ΤΡΙΤΟΥΣ», κατηγορία ΓΕΝΙΚΗ ΑΣΤΙΚΗ
 * ΕΥΘΥΝΗ — building common-areas manager cover).
 *
 * Structure decoded from a real policy document during the 2026-08 live
 * pipeline verification. The IDENTITY is synthetic and always must be — the
 * source document is a real person's policy and this file is tracked; the
 * fixture-pii guard (tests/unit/fixture-pii.test.ts) enforces it. What is real
 * here is the SHAPE and the numbers: the limits table, the premium breakdown
 * that sums exactly, the dotted date format the insurer prints, the deductible
 * floor, and the named exclusions.
 *
 * Premium breakdown (real, sums to the printed total):
 *   Net premium        €75.62
 *   Charges            €11.34
 *   Taxes              €13.04
 *   ────────────────────────
 *   Total             €100.00
 *
 * Limits (real):
 *   Death / bodily injury      €50,000 per person / €100,000 per event
 *   Third-party property       €50,000
 *   Aggregate                 €150,000 («ΕΚΑΤΟΝ ΠΕΝΗΝΤΑ ΧΙΛΙΑΔΕΣ ΕΥΡΩ»)
 *   Property-damage deductible: percentage per claim, floor €350
 */

import type { AIPolicyExtractionResponse } from "@/lib/services/ai/ai-service.interface"

export const LIABILITY_ETHNIKI_1: AIPolicyExtractionResponse = {
    insurerName: "Η ΕΘΝΙΚΗ",
    policyNumber: "TEST-LIABILITY-0001",
    lineOfBusiness: "liability",
    // As printed on the document: annual term, dotted dd.MM.yyyy.
    startDate: "30.06.2026",
    endDate: "29.06.2027",
    premiumAmount: 100.0,
    coverageSummary:
        "Γενική αστική ευθύνη λειτουργίας κοινόχρηστων χώρων οικιών. " +
        "Θάνατος/σωματικές βλάβες 50.000 € ανά άτομο και 100.000 € ανά γεγονός, " +
        "υλικές ζημίες τρίτων 50.000 €, ανώτατο συνολικό όριο ευθύνης 150.000 €. " +
        "Αφαιρετέα απαλλαγή επί κάθε υλικής ζημίας με ελάχιστο όριο 350 €.",

    // Synthetic identity — see the file header.
    customerName: "ΓΕΩΡΓΙΟΣ",
    customerSurname: "ΔΗΜΗΤΡΙΟΥ",
    customerEmail: "georgios.dimitriou@example.com",

    exclusions: [
        "Κίνδυνοι κυβερνοχώρου (περιοριστική ρήτρα)",
        "Οικονομικές και εμπορικές κυρώσεις",
        "Βλάβες υγείας από προϊόντα καπνού",
    ],

    extractionMeta: {
        overallConfidence: 93,
        fieldConfidence: {
            insurerName: 99,
            policyNumber: 99,
            lineOfBusiness: 95,
            startDate: 97,
            endDate: 97,
            premiumAmount: 96,
            coverageSummary: 90,
        },
        missingCriticalFields: [],
        requiresReview: false,
    },
}

/** The real premium components, kept separately so tests can pin the sum. */
export const LIABILITY_ETHNIKI_1_PREMIUM_BREAKDOWN = {
    net: 75.62,
    charges: 11.34,
    taxes: 13.04,
    total: 100.0,
}

/** The clarity-style coverage enumeration this document supports. */
export const LIABILITY_ETHNIKI_1_COVERED = [
    "Αστική ευθύνη λειτουργίας κοινόχρηστων χώρων οικιών",
    "Θάνατος / σωματικές βλάβες τρίτων",
    "Υλικές ζημίες τρίτων",
]
