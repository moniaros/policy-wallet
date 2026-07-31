/**
 * Test fixture: an Εθνική Full Health policy.
 *
 * Structure derived from docs/policies/health_ethniki_1.pdf (gitignored, and
 * deliberately so). The IDENTITY is synthetic and always must be: the source
 * PDF is a real person's health-insurance policy, and this file is tracked —
 * committed once, it is in every clone, every CI log and the whole history.
 * Whoever gitignored the PDFs meant this not to be public; an earlier version
 * of this fixture carried the real name, surname, email and policy number
 * anyway, pinned by a test that described them as PII to preserve.
 *
 * What the fixture exists for is the SHAPE and the numbers — field mapping,
 * date formats, premium arithmetic, confidence metadata. None of that needs a
 * real identity, so none of it has one.
 *
 * Period: 22/05/2024 – 22/05/2025
 *
 * Premium breakdown:
 *   Hospital care          €812.66
 *   Diagnostics (AFFIDEA)  €134.00
 *   Accident expenses       €77.00
 *   Emergency assistance    €22.61
 *   Emergency incidents     €92.00
 *   ──────────────────────────────
 *   Total                €1,138.27
 */

import type {
    AIPolicyExtractionResponse,
    PolicyMetadata,
} from "@/lib/services/ai/ai-service.interface"

export const HEALTH_ETHNIKI_1: AIPolicyExtractionResponse = {
    // Required fields
    insurerName: "Η ΕΘΝΙΚΗ",
    policyNumber: "TEST-HEALTH-0001",
    lineOfBusiness: "health",
    startDate: "2024-05-22",
    endDate: "2025-05-22",
    premiumAmount: 1138.27,
    coverageSummary:
        "Full Health: hospital care (€1.5M annual limit, €1,500 deductible), diagnostics at AFFIDEA–Ευρωιατρική (€2,000/yr), accident expenses (€2,000/incident), emergency medical assistance, emergency incidents (€1,000/incident, max 3/yr)",

    // Customer identification — synthetic, see the file header.
    customerName: "ΜΑΡΙΑ",
    customerSurname: "ΠΑΠΑΔΟΠΟΥΛΟΥ",
    customerEmail: "maria.papadopoulou@example.com",

    // Policy exclusions / special conditions
    exclusions: ["10% co-pay for US hospitalisation"],

    // Extraction confidence metadata
    extractionMeta: {
        overallConfidence: 95,
        fieldConfidence: {
            insurerName: 99,
            policyNumber: 99,
            lineOfBusiness: 98,
            startDate: 99,
            endDate: 99,
            premiumAmount: 95,
            coverageSummary: 92,
            customerName: 99,
            customerSurname: 99,
            customerEmail: 97,
        },
        missingCriticalFields: [],
        requiresReview: false,
    },
}

/**
 * PolicyMetadata shape for gap engine consumption.
 *
 * Mirrors the inline mapper in lib/services/gap-engine/index.ts:
 *   insurerName:     p.insurerName || "Unknown"
 *   premiumAmount:   p.premiumAmount ? Number(p.premiumAmount) : null
 *   startDate/endDate: Date objects (not ISO strings)
 */
export const HEALTH_ETHNIKI_1_METADATA: PolicyMetadata = {
    insurerName: "Η ΕΘΝΙΚΗ",
    policyNumber: "TEST-HEALTH-0001",
    lineOfBusiness: "health",
    startDate: new Date("2024-05-22"),
    endDate: new Date("2025-05-22"),
    premiumAmount: 1138.27,
    coverageSummary:
        "Full Health: hospital care (€1.5M annual limit, €1,500 deductible), diagnostics at AFFIDEA–Ευρωιατρική (€2,000/yr), accident expenses (€2,000/incident), emergency medical assistance, emergency incidents (€1,000/incident, max 3/yr)",
}
