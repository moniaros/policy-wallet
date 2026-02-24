import { z } from "zod";

// The definitive contract for UI visualization components
export const AcordDataSchema = z.object({
    // Section 6: Motor & Liability (Market Value Meters)
    vehicle: z.object({
        make: z.string().optional(),
        model: z.string().optional(),
        year: z.number().optional(),
        estimatedMarketValue: z.number().optional(), // Drives Market Value Meter UI
        deductible: z.number().optional(),
        hasRoadsideAssistance: z.boolean().default(false),
        namedDrivers: z.array(z.string()).optional(),
        greenCardExpiryDate: z.string().optional(),
    }).optional(),

    // Section 7: Property & Home (Replacement Cost Sliders)
    property: z.object({
        address: z.string().optional(),
        squareMeters: z.number().optional(),
        yearBuilt: z.number().optional(),
        estimatedRebuildCost: z.number().optional(), // Drives Replacement Cost Slider UI
        fireCoverageIncluded: z.boolean().default(false), // Required for ENFIA checklist
        earthquakeCoverageIncluded: z.boolean().default(false),
        floodCoverageIncluded: z.boolean().default(false),
    }).optional(),

    // Section 8: Health & Life (Timeline Projections & Radial Charts)
    health: z.object({
        annualLimit: z.number().optional(),
        roomAndBoardLimit: z.number().optional(),
        outOfPocketMax: z.number().optional(), // Drives Health Radial Charts
        coordinationCentreName: z.string().optional(), // Greek market specific
        directBillingAvailable: z.boolean().default(false), // Greek market specific
    }).optional(),

    lifeAndInvestment: z.object({
        deathBenefit: z.number().optional(),
        cashValue: z.number().optional(), // Drives Investment Goal Timelines
        maturityDate: z.string().optional(),
        beneficiaries: z.array(z.string()).optional(),
    }).optional(),

    // Pet Specific (Breed Condition Radar Charts)
    pet: z.object({
        name: z.string().optional(),
        species: z.enum(["Dog", "Cat", "Other", "UNKNOWN"]).default("UNKNOWN"),
        breed: z.string().optional(),
        age: z.number().optional(),
        annualLimit: z.number().optional(),
        leishmaniaCovered: z.boolean().default(false), // Critical for Greek pet policies
        preExistingConditionsExcluded: z.array(z.string()).default([]), // Drives Radar Chart weaknesses
    }).optional(),
});

export type AcordData = z.infer<typeof AcordDataSchema>;
