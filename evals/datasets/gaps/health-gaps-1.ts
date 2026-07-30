/**
 * Gap-detection eval case — a health policy with a known set of gaps the
 * analyzer should flag. Scored on recall (missed gaps) and precision.
 */

import type { PolicyMetadata, GapDefinitionForAI } from "@/lib/services/ai/ai-service.interface"

export interface GapEvalCase {
    id: string
    metadata: PolicyMetadata
    gapDefinitions: GapDefinitionForAI[]
    /** Slugs that SHOULD be flagged as detected for this policy. */
    expectedDetectedSlugs: string[]
}

export const GAPS_HEALTH_1: GapEvalCase = {
    id: "gaps/health-1",
    metadata: {
        insurerName: "Η ΕΘΝΙΚΗ",
        policyNumber: "1651622",
        lineOfBusiness: "health",
        startDate: new Date("2024-05-22"),
        endDate: new Date("2025-05-22"),
        premiumAmount: 1138.27,
        coverageSummary: "Hospital care with a €1,500 deductible; no outpatient or dental cover.",
    },
    gapDefinitions: [
        { slug: "no-outpatient", name: "No outpatient cover", description: null, checkCriteria: "Policy does not cover outpatient/day-care treatment" },
        { slug: "no-dental", name: "No dental cover", description: null, checkCriteria: "Policy excludes dental treatment" },
        { slug: "high-deductible", name: "High deductible", description: null, checkCriteria: "Annual deductible above €1,000" },
        { slug: "has-hospital", name: "Hospital cover present", description: null, checkCriteria: "Policy covers in-hospital treatment" },
    ],
    // The summary states no outpatient/dental and a €1,500 deductible; hospital
    // cover IS present, so has-hospital should NOT be flagged as a gap.
    expectedDetectedSlugs: ["no-outpatient", "no-dental", "high-deductible"],
}

export const GAP_CASES: GapEvalCase[] = [GAPS_HEALTH_1]
