/**
 * Test fixture: an Εθνική personal cyber policy («Α.Ε.Ε.Γ.Α. Η ΕΘΝΙΚΗ»).
 *
 * Provenance: extracted LIVE by the real pipeline (Gemini provider,
 * scripts/verify-pipeline-live.ts) from a real uploaded policy document during
 * the 2026-08 per-branch verification. The document's multi-font CID encoding
 * defeated full local re-decoding, so the values are the real model's reading
 * of the real document — internally coherent (calendar-year term, a ~€32
 * personal-cyber premium, identity-theft / cyber-fraud / online-purchase
 * covers) and owner-confirmable against the paper.
 *
 * The IDENTITY is synthetic and always must be (fixture-pii guard). The cyber
 * branch has NO coverage taxonomy — deliberately — so this fixture also pins
 * the backstop's silence for it.
 */

import type { AIPolicyExtractionResponse } from "@/lib/services/ai/ai-service.interface"

export const CYBER_ETHNIKI_1: AIPolicyExtractionResponse = {
    insurerName: "Α.Ε.Ε.Γ.Α. Η ΕΘΝΙΚΗ",
    policyNumber: "TEST-CYBER-0001",
    lineOfBusiness: "cyber",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    premiumAmount: 32.0,
    coverageSummary:
        "Προσωπική κυβερνοασφάλιση: κλοπή ψηφιακής ταυτότητας, απάτη στον " +
        "κυβερνοχώρο, διαδικτυακές αγορές.",

    // Synthetic identity — see the file header.
    customerName: "ΕΛΕΝΗ",
    customerSurname: "ΝΙΚΟΛΑΟΥ",
    customerEmail: "eleni.nikolaou@example.com",

    exclusions: [
        "Cryptojacking",
        "Επιχειρηματική δραστηριότητα",
        "Αστοχία υποδομής τρίτων",
    ],

    extractionMeta: {
        overallConfidence: 91,
        fieldConfidence: {
            insurerName: 97,
            policyNumber: 97,
            lineOfBusiness: 96,
            startDate: 95,
            endDate: 95,
            premiumAmount: 93,
        },
        missingCriticalFields: [],
        requiresReview: false,
    },
}

export const CYBER_ETHNIKI_1_COVERED = [
    "Κλοπή ψηφιακής ταυτότητας",
    "Απάτη στον κυβερνοχώρο",
    "Διαδικτυακές αγορές",
]
