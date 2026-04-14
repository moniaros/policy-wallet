/**
 * Test fixture: Εθνική Full Health policy #1651622
 *
 * Derived from docs/policies/health_ethniki_1.pdf.
 * Policyholder: ΚΟΚΚΑΛΙΑ ΑΡΤΕΜΙΣ
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
    policyNumber: "1651622",
    lineOfBusiness: "health",
    startDate: "2024-05-22",
    endDate: "2025-05-22",
    premiumAmount: 1138.27,
    coverageSummary:
        "Full Health: hospital care (€1.5M annual limit, €1,500 deductible), diagnostics at AFFIDEA–Ευρωιατρική (€2,000/yr), accident expenses (€2,000/incident), emergency medical assistance, emergency incidents (€1,000/incident, max 3/yr)",

    // Customer identification
    customerName: "ΑΡΤΕΜΙΣ",
    customerSurname: "ΚΟΚΚΑΛΙΑ",
    customerEmail: "artemiskohas@gmail.com",

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
    policyNumber: "1651622",
    lineOfBusiness: "health",
    startDate: new Date("2024-05-22"),
    endDate: new Date("2025-05-22"),
    premiumAmount: 1138.27,
    coverageSummary:
        "Full Health: hospital care (€1.5M annual limit, €1,500 deductible), diagnostics at AFFIDEA–Ευρωιατρική (€2,000/yr), accident expenses (€2,000/incident), emergency medical assistance, emergency incidents (€1,000/incident, max 3/yr)",
}
