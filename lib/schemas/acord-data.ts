import { z } from "zod";

/**
 * ACORD Data Schema v2
 *
 * Unified Zod schema for structured insurance policy data extracted by AI.
 * Enriched with Greek-market-specific fields (ENFIA, coordination centres,
 * leishmaniasis, green card, etc.) and deeper per-section detail.
 *
 * This is the single source of truth — the TypeScript type is derived via z.infer.
 */
export const AcordDataSchema = z.object({
    _version: z.number().default(2),

    // ─── Motor & Liability ──────────────────────────────────────────────
    vehicle: z.object({
        make: z.string().optional(),
        model: z.string().optional(),
        year: z.number().optional(),
        plateNumber: z.string().optional(),
        vin: z.string().optional(),
        usage: z.string().optional().describe("e.g. personal, commercial, rideshare"),
        estimatedMarketValue: z.number().optional(),
        deductible: z.number().optional(),
        hasRoadsideAssistance: z.boolean().default(false),
        roadsideAssistancePhone: z.string().optional(),
        namedDrivers: z.array(z.object({
            name: z.string(),
            licenseNumber: z.string().optional(),
        })).optional(),
        greenCardExpiryDate: z.string().optional().describe("ISO date — Greek green card expiry"),
        coverageTier: z.string().optional().describe("e.g. third-party, third-party-fire-theft, comprehensive"),
        accidentDeclarationPhone: z.string().optional(),
        ownVehicleDamage: z.boolean().optional(),
        glassBreakage: z.boolean().optional(),
    }).optional(),

    // ─── Property & Home ────────────────────────────────────────────────
    property: z.object({
        address: z.string().optional(),
        type: z.string().optional().describe("e.g. apartment, house, office"),
        squareMeters: z.number().optional(),
        yearBuilt: z.number().optional(),
        estimatedRebuildCost: z.number().optional(),
        fireCoverageIncluded: z.boolean().default(false),
        earthquakeCoverageIncluded: z.boolean().default(false),
        floodCoverageIncluded: z.boolean().default(false),
        // Greek-market specific
        enfiaEligible: z.boolean().optional().describe("True if fire, earthquake AND flood are all covered — the condition for the ENFIA property-tax discount. ENFIA is a tax, not an insurance requirement; it mandates no cover."),
        mortgageeBank: z.string().optional(),
        technicalAssistancePhone: z.string().optional(),
        theftCoverageLimit: z.number().optional(),
        insuredValue: z.number().optional(),
        replacementValue: z.number().optional(),
        contentsVsStructure: z.string().optional().describe("e.g. structure-only, contents-only, both"),
    }).optional(),

    // ─── Health ─────────────────────────────────────────────────────────
    health: z.object({
        annualLimit: z.number().optional(),
        roomAndBoardLimit: z.number().optional(),
        outOfPocketMax: z.number().optional(),
        hospitalClass: z.string().optional().describe("e.g. A, B, C or private, semi-private"),
        // Greek-market specific
        coordinationCentre: z.object({
            name: z.string().optional(),
            phone: z.string().optional(),
        }).optional().describe("Greek health insurance coordination centre"),
        coordinationCentreName: z.string().optional().describe("Deprecated — use coordinationCentre.name"),
        directBillingAvailable: z.boolean().default(false),
        annualCheckupIncluded: z.boolean().optional(),
        waitingPeriods: z.array(z.object({
            type: z.string().optional(),
            durationDays: z.number().optional(),
            endDate: z.string().optional(),
        })).optional(),
        outpatientLimit: z.number().optional(),
        deductiblePerClaim: z.number().optional(),
    }).optional(),

    // ─── Life & Investment ──────────────────────────────────────────────
    lifeAndInvestment: z.object({
        deathBenefit: z.number().optional(),
        cashValue: z.number().optional(),
        maturityDate: z.string().optional(),
        beneficiaries: z.array(z.string()).optional(),
        // Greek-market enrichment
        currentFundValue: z.number().optional(),
        ytdGrowth: z.number().optional().describe("Year-to-date growth percentage"),
        taxFreeAtMaturity: z.boolean().optional(),
        guaranteedPercentage: z.number().optional(),
        unitLinkedPercentage: z.number().optional(),
        surrenderValue: z.number().optional(),
        lastPremiumDate: z.string().optional(),
        lastPremiumAmount: z.number().optional(),
    }).optional(),

    // ─── Pet ────────────────────────────────────────────────────────────
    pet: z.object({
        name: z.string().optional(),
        species: z.enum(["Dog", "Cat", "Other", "UNKNOWN"]).default("UNKNOWN"),
        breed: z.string().optional(),
        age: z.number().optional(),
        annualLimit: z.number().optional(),
        annualLimitTotal: z.number().optional().describe("Legacy alias for annualLimit"),
        annualLimitUsed: z.number().optional(),
        microchipNumber: z.string().optional(),
        leishmaniaCovered: z.boolean().default(false).describe("Critical for Greek pet policies — Leishmania is endemic"),
        directVetPayment: z.boolean().optional(),
        breedSpecificDiseases: z.array(z.string()).optional(),
        preExistingConditionsExcluded: z.array(z.string()).default([]),
        waitingPeriods: z.array(z.object({
            type: z.string().optional(),
            durationDays: z.number().optional(),
            endDate: z.string().optional(),
        })).optional(),
    }).optional(),

    // ─── Cross-section fields ───────────────────────────────────────────
    // Canonical policy envelope — extraction enrichment normalizes provider
    // output into this shape; the review screen reads/writes it.
    policy: z.object({
        insurerName: z.string().nullable().optional(),
        policyNumber: z.string().nullable().optional(),
        lineOfBusiness: z.string().nullable().optional(),
        effectiveDate: z.string().nullable().optional(),
        expirationDate: z.string().nullable().optional(),
        issueDate: z.string().nullable().optional().describe("Policy issue/signature date, ISO"),
        renewalDate: z.string().nullable().optional().describe("Renewal date, ISO"),
        premiumFrequency: z.enum(["annual", "semiannual", "quarterly", "monthly", "one_off"]).nullable().optional(),
        sumInsured: z.number().nullable().optional().describe("Generic sum insured for LOBs without a dedicated section"),
        premium: z.object({
            amount: z.number().nullable().optional(),
        }).optional(),
    }).optional(),

    beneficiaries: z.array(z.object({
        name: z.string().optional(),
        relationship: z.string().optional(),
        percentage: z.number().optional(),
    })).optional(),

    coverages: z.array(z.object({
        name: z.string(),
        type: z.string().optional(),
        limit: z.string().optional(),
        deductible: z.string().optional(),
        description: z.string().optional(),
        explanation: z.object({
            en: z.string(),
            el: z.string(),
        }).optional(),
    })).optional(),

    exclusions: z.array(z.string()).optional(),

    finePrintClauses: z.array(z.object({
        clause: z.string().describe("Actual clause text or summary from the General Terms / Special Conditions"),
        section: z.string().describe("e.g. General Terms, Special Conditions, Appendix, Ειδικοί Όροι"),
        riskLevel: z.enum(["info", "warning", "critical"]).describe("critical = likely to cause claim denial"),
        impactSummary: z.object({
            en: z.string(),
            el: z.string(),
        }).describe("Plain-language explanation of why this clause matters to the policyholder"),
        relatedCoverage: z.string().optional().describe("Which coverage this clause restricts"),
    })).optional().describe("Hidden restrictions, sub-limits, and gotchas that most consumers would NOT expect"),

    perksAndBenefits: z.array(z.object({
        perkType: z.enum([
            "free_service", "assistance", "discount", "prevention",
            "loyalty_bonus", "digital_tool", "gift", "legal_aid"
        ]),
        name: z.object({ en: z.string(), el: z.string() }),
        description: z.object({ en: z.string(), el: z.string() }),
        contactPhone: z.string().optional().describe("Direct phone number for the service"),
        contactUrl: z.string().optional(),
        usageLimit: z.string().optional().describe("e.g. '1x per year', 'unlimited', '3 incidents'"),
        expiresWithPolicy: z.boolean().default(true),
        reminderRecommended: z.boolean().default(false).describe("True for perks users often forget to use"),
    })).optional().describe("Free services, prevention programs, assistance hotlines, gifts, loyalty bonuses"),

    notableConditions: z.array(z.object({
        conditionType: z.enum([
            "waiting_period", "auto_renewal", "cancellation_penalty",
            "sub_limit", "co_payment", "age_limit", "geographic_restriction",
            "claim_deadline", "notification_obligation", "no_claims_bonus"
        ]),
        summary: z.object({ en: z.string(), el: z.string() }),
        value: z.string().optional().describe("e.g. '90 days', '€200/day', '72 hours'"),
        deadline: z.string().optional().describe("ISO date if applicable"),
        userActionRequired: z.boolean().default(false),
    })).optional().describe("Waiting periods, auto-renewal traps, claim deadlines, sub-limits, bonus rules"),

    // ─── Legacy aliases for backward compatibility with UI components ───
    // These map to the canonical section names above. AI extraction should
    // populate the canonical sections; these exist only so that stored data
    // with the old key names still type-checks.
    motor: z.object({
        coverageTier: z.string().optional(),
        greenCardExpiry: z.string().optional(),
        namedDrivers: z.array(z.object({
            name: z.string().optional(),
            licenseNumber: z.string().optional(),
        })).optional(),
        accidentDeclarationPhone: z.string().optional(),
        roadsideAssistancePhone: z.string().optional(),
        ownVehicleDamage: z.boolean().optional(),
        glassBreakage: z.boolean().optional(),
    }).optional(),

    home: z.object({
        enfiaEligible: z.boolean().optional(),
        catastropheCoverage: z.object({
            fire: z.boolean().optional(),
            earthquake: z.boolean().optional(),
            flood: z.boolean().optional(),
        }).optional(),
        mortgageeBank: z.string().optional(),
        technicalAssistancePhone: z.string().optional(),
        theftCoverageLimit: z.number().optional(),
        insuredValue: z.number().optional(),
        replacementValue: z.number().optional(),
        contentsVsStructure: z.string().optional(),
    }).optional(),

    life: z.object({
        currentFundValue: z.number().optional(),
        ytdGrowth: z.number().optional(),
        taxFreeAtMaturity: z.boolean().optional(),
        guaranteedPercentage: z.number().optional(),
        unitLinkedPercentage: z.number().optional(),
        surrenderValue: z.number().optional(),
        lastPremiumDate: z.string().optional(),
        lastPremiumAmount: z.number().optional(),
    }).optional(),
});

export type AcordData = z.infer<typeof AcordDataSchema>;
