import { z } from "zod";

/**
 * A field described this way stays in the stored shape (LOOP.md §4: additive only)
 * but is dropped from the JSON-mode prompt block, so the model is never asked for it.
 * `lib/services/ai/json-mode-schema.ts` keys on the prefix.
 */
export const DEPRECATED_PREFIX = "DEPRECATED"
const DEPRECATED_NAME = `${DEPRECATED_PREFIX} — never extracted, never asked for: a third party's name or identifier is not held (PW-PROVENANCE-01 W5-01). Leave absent.`

/**
 * ACORD Data Schema v3
 *
 * Unified Zod schema for structured insurance policy data extracted by AI.
 * Enriched with Greek-market-specific fields (ENFIA, coordination centres,
 * leishmaniasis, green card, etc.) and deeper per-section detail.
 *
 * This is the single source of truth — the TypeScript type is derived via z.infer.
 *
 * ── v3: why the money fields grew structure ──────────────────────────────
 *
 * Through v2 a coverage carried `limit` and `deductible` as free TEXT. That is
 * enough to show a customer a sentence and not enough to reason about anything,
 * which is why the protection score could only ever measure whether cover was
 * PRESENT and never whether it was ADEQUATE.
 *
 * Real schedules do not fit one number. A recreational-craft liability runs
 * three parallel towers — per person, per event, per period — with a fourth for
 * marine pollution under a single policy ceiling. A yacht hull carries six
 * deductibles by type of damage plus a rule saying the largest applies. A health
 * policy sets €750 with an overnight stay, €375 without, and nil in a public
 * hospital. None of that survives being flattened into a string.
 *
 * v3 is PURELY ADDITIVE. Every new field is optional, `_version` is bumped, and
 * the v2 `limit` / `deductible` strings stay populated as the human-readable
 * rendering — so every existing reader keeps working untouched and stored v2
 * documents remain valid.
 */

/** ISO-4217. Greek retail is EUR; marine and crew business is frequently USD. */
const CurrencySchema = z.string().length(3).describe("ISO-4217 code, e.g. EUR, USD, GBP");

/**
 * The dimension a monetary cap is measured on.
 *
 * Kept as a closed vocabulary because the whole point is to make two policies
 * comparable; free text would reintroduce the problem this replaces.
 */
export const LIMIT_BASES = [
    "per_claim",
    "per_event",
    "per_person",
    "per_item",
    "per_location",
    "per_period_aggregate",
    "daily",
    "monthly",
    "annual",
] as const;

const MonetaryLimitSchema = z.object({
    basis: z.enum(LIMIT_BASES),
    amount: z.number().optional().describe("Omit when unlimited is true"),
    currency: CurrencySchema.optional(),
    /**
     * «Απεριόριστο» — an assistance benefit with no cap is not the same as an unknown one.
     *
     * `.optional()`, NOT `.default(false)`. The AI SDK materialises Zod defaults into
     * the object it returns, so a default wrote `unlimited: false` — "there IS a cap" —
     * into every limit the extractor never determined. That is the same
     * unknown-becomes-absence error the gap rules were fixed to avoid, one rule away
     * from being load-bearing. Undefined means undetermined; read it as such.
     */
    unlimited: z.boolean().optional(),
    /** What the cap is measured against, when the basis alone is ambiguous ("per safe", "per crew member"). */
    appliesTo: z.string().optional(),
});

const DeductibleSchema = z.object({
    basis: z.enum(LIMIT_BASES),
    amount: z.number().optional(),
    /** Percentage deductibles state what they are a percentage OF ("each material damage"). */
    percentOf: z.string().optional(),
    percent: z.number().optional(),
    /** A percentage deductible is normally floored and sometimes capped. */
    minimum: z.number().optional(),
    maximum: z.number().optional(),
    currency: CurrencySchema.optional(),
    appliesTo: z.string().optional().describe("Which damage type or sub-cover this deductible attaches to"),
});

export const AcordDataSchema = z.object({
    _version: z.number().default(3),

    // ─── Motor & Liability ──────────────────────────────────────────────
    vehicle: z.object({
        make: z.string().optional(),
        model: z.string().optional(),
        year: z.number().optional(),
        plateNumber: z.string().optional(),
        vin: z.string().optional(),
        usage: z.string().optional().describe("e.g. personal, commercial, rideshare"),
        /** The vehicle value the SCHEDULE states, never a model estimate. */
        estimatedMarketValue: z.number().optional()
            .describe("The vehicle value stated on the schedule — «τρέχουσα εμπορική αξία» or «αγοραία αξία». Extract the number as printed; never estimate or infer a value."),
        /** What the vehicle is INSURED for (own-damage sum insured). */
        insuredValue: z.number().optional()
            .describe("The sum insured for own damage — «ασφαλιζόμενη αξία». On many schedules this and the market value are the same figure; extract BOTH when the document prints both, and neither when it prints neither."),
        deductible: z.number().optional(),
        hasRoadsideAssistance: z.boolean().optional(),
        roadsideAssistancePhone: z.string().optional(),
        /**
         * Additional drivers are COUNTED and characterised, never named
         * (PW-PROVENANCE-01 W5-01 — the `insuredPersons` principle). Names and
         * licence numbers are third-party personal data no rule reads. The two
         * keys stay in place, DEPRECATED, because LOOP.md §4 forbids narrowing a
         * stored shape; `schemaPromptBlock` drops a DEPRECATED field from what
         * the model is asked for, so nothing new is collected. Removing the keys
         * themselves is the owner's call. What cover actually turns on is
         * below: the count, and whether cover is restricted to them.
         */
        namedDrivers: z.array(z.object({
            name: z.string().optional().describe(DEPRECATED_NAME),
            licenseNumber: z.string().optional().describe(DEPRECATED_NAME),
            ageBand: z.string().optional().describe("e.g. under-25, 25-30, over-30 — never a date of birth"),
            yearsLicensed: z.number().optional(),
            relationshipToPolicyholder: z.string().optional().describe("spouse, child, employee, other — never a name"),
        })).optional().describe("One entry per ADDITIONAL named driver. NO names, NO licence numbers — the count and the bands only."),
        namedDriverCount: z.number().optional().describe("How many additional drivers the schedule names"),
        namedDriverRestriction: z.boolean().optional().describe("true when cover applies only to the named drivers"),
        greenCardExpiryDate: z.string().optional().describe("ISO date — Greek green card expiry"),
        coverageTier: z.string().optional().describe("e.g. third-party, third-party-fire-theft, comprehensive"),
        accidentDeclarationPhone: z.string().optional(),
        ownVehicleDamage: z.boolean().optional(),
        glassBreakage: z.boolean().optional(),
    }).optional(),

    // ─── Property & Home ────────────────────────────────────────────────
    property: z.object({
        /**
         * The RISK ADDRESS — the building the policy covers.
         *
         * This carried no `.describe()` while its siblings did, so the model saw
         * a bare key name and nothing telling it what to look for. Measured
         * 2026-08-28: populated in ZERO home policies across both databases,
         * which is why the wallet could not tell two home policies apart even
         * though `policyAssetIdentifier` has read this field all along.
         *
         * Greek schedules label it «Διεύθυνση κινδύνου» or «Ασφαλιζόμενο
         * ακίνητο», never "address" — the hint names both.
         */
        address: z.string().optional()
            .describe("Διεύθυνση κινδύνου / ασφαλιζόμενο ακίνητο — οδός, αριθμός, πόλη, Τ.Κ. as printed on the schedule"),
        type: z.string().optional().describe("e.g. apartment, house, office"),
        squareMeters: z.number().optional(),
        yearBuilt: z.number().optional(),
        estimatedRebuildCost: z.number().optional(),
        fireCoverageIncluded: z.boolean().optional(),
        earthquakeCoverageIncluded: z.boolean().optional(),
        floodCoverageIncluded: z.boolean().optional(),
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
        directBillingAvailable: z.boolean().optional(),
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
        leishmaniaCovered: z.boolean().optional().describe("Critical for Greek pet policies — Leishmania is endemic"),
        directVetPayment: z.boolean().optional(),
        breedSpecificDiseases: z.array(z.string()).optional(),
        preExistingConditionsExcluded: z.array(z.string()).default([]),
        waitingPeriods: z.array(z.object({
            type: z.string().optional(),
            durationDays: z.number().optional(),
            endDate: z.string().optional(),
        })).optional(),
    }).optional(),

    // ─── Travel ─────────────────────────────────────────────────────────
    /**
     * Added in Phase 7. Until then travel had no typed section, so nothing could
     * be asked of a travel policy that was not a guess: a rule could only check a
     * generic field that is blank on nearly every policy, or match free text.
     * A branch gets rules when the extractor has somewhere truthful to put the
     * answer — not before.
     *
     * Booleans here are three-state on purpose (`undefined` = the document did
     * not say). No `.default(false)`: a default would record "not covered" for
     * every policy nobody read, which is the error the gap rules exist to avoid.
     */
    travel: z.object({
        /** Headline medical cap. The figure a Schengen visa application asks for. */
        medicalExpensesLimit: z.number().optional(),
        repatriationCovered: z.boolean().optional().describe("Medical repatriation / επαναπατρισμός — typically the largest single exposure on a travel policy"),
        cancellationCovered: z.boolean().optional().describe("Trip cancellation / ακύρωση ταξιδιού"),
        baggageLimit: z.number().optional(),
        personalLiabilityLimit: z.number().optional(),
        winterSportsCovered: z.boolean().optional(),
        preExistingConditionsCovered: z.boolean().optional(),
        /** The 24-hour number. Travel policies print one; it is the whole product at 3am. */
        emergencyAssistancePhone: z.string().optional(),
        destinationScope: z.string().optional().describe("e.g. schengen, europe, worldwide, worldwide-excl-usa-canada"),
        tripDurationDays: z.number().optional(),
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
        sumInsured: z.number().nullable().optional().describe("Generic sum insured, for a line of business with no dedicated section of its own. Motor uses vehicle.insuredValue and property uses property.insuredValue — do not duplicate those here."),
        premium: z.object({
            amount: z.number().nullable().optional(),
        }).optional(),
        /**
         * Currency of the premium and of any amount in this envelope. Defaults
         * to EUR at the read layer; stated explicitly because crew and hull
         * business in the Greek market is routinely written in USD, and a
         * benefit table read as euros overstates the cover by roughly a tenth.
         */
        currency: CurrencySchema.nullable().optional(),
    }).optional(),

    beneficiaries: z.array(z.object({
        name: z.string().optional(),
        relationship: z.string().optional(),
        percentage: z.number().optional(),
    })).optional(),

    coverages: z.array(z.object({
        name: z.string(),
        type: z.string().optional(),
        /** v2 human-readable rendering. Still populated — every existing reader uses it. */
        limit: z.string().optional(),
        /** v2 human-readable rendering. Still populated — every existing reader uses it. */
        deductible: z.string().optional(),
        description: z.string().optional(),
        explanation: z.object({
            en: z.string(),
            el: z.string(),
        }).optional(),

        // ── v3 structure ────────────────────────────────────────────────
        /**
         * Every cap that applies to this cover. A liability section commonly has
         * three (per person, per event, per period) and they are not
         * interchangeable: an accident with several injured parties exhausts the
         * per-event tower while the per-person one is barely touched.
         */
        limits: z.array(MonetaryLimitSchema).optional(),
        deductibles: z.array(DeductibleSchema).optional(),
        /** Percentage of recognised cost the insured carries (health «συμμετοχή»). */
        coinsurancePercent: z.number().optional(),
        waitingPeriodDays: z.number().optional(),
        /**
         * Whether the cover is actually ON. Optional covers that were offered and
         * NOT taken are the quiet cause of "but I have all-risks" — earthquake is
         * routinely optional on a Greek fine-art or property schedule.
         */
        status: z.enum([
            "included",
            "optional_taken",
            "optional_not_taken",
            "excluded",
        ]).optional(),
    })).optional(),

    /**
     * How the schedule resolves overlapping deductibles. Stated explicitly on
     * marine hull wordings ("where more than one applies, the largest single
     * deductible applies") and materially changes what a claim returns.
     */
    deductibleResolution: z.enum(["largest_applies", "cumulative", "unknown"]).optional(),

    exclusions: z.array(z.string()).optional(),

    /**
     * Warranties and conditions of cover — the highest-value addition in v3.
     *
     * These are the terms that decide whether cover responds at all, and in v2
     * they had nowhere to live but free text. Greek schedules carry them under
     * «ΑΠΑΡΑΒΑΤΟΙ ΟΡΟΙ», «ΠΡΟΫΠΟΘΕΣΕΙΣ ΚΑΛΥΨΗΣ» and «ΕΙΔΙΚΕΣ ΣΥΜΦΩΝΙΕΣ»:
     * an alarm linked to a monitoring centre, keys held off-premises out of
     * hours, annual servicing to the maker's instructions, certificates valid
     * throughout, a skipper licensed and aboard.
     *
     * Modelling them makes three things possible that were not: a condition gap
     * (cover exists but rests on something the customer may not satisfy), a
     * prevention action (the control IS the mitigation), and a compliance
     * calendar (a recurring obligation has a due date).
     */
    conditions: z.array(z.object({
        kind: z.enum([
            "warranty",
            "condition_precedent",
            "security_requirement",
            "maintenance",
            "documentation",
            "reporting",
            "other",
        ]),
        text: z.string().describe("The condition as written, in the policy's own language"),
        summary: z.object({ en: z.string(), el: z.string() }).optional(),
        /** Continuous obligations differ from one-off ones: only some produce a reminder. */
        recurrence: z.enum(["once", "annual", "periodic", "continuous"]).optional(),
        dueBy: z.string().optional().describe("ISO date where the condition names one"),
        /**
         * What failing it does. Greek «απαράβατοι όροι» void cover outright;
         * softer conditions reduce a claim. Say `unknown` rather than guess.
         */
        breachEffect: z.enum([
            "voids_cover",
            "suspends_cover",
            "reduces_claim",
            "unknown",
        ]).default("unknown"),
        /** True when the customer could confirm it themselves (alarm active, service done). */
        verifiable: z.boolean().default(false),
        /**
         * Cross-policy dependency. Greek money and fidelity wordings routinely
         * require a property policy in force for the same risk address, so the
         * lapse of one contract silently undermines another.
         */
        dependsOnOtherPolicy: z.string().optional(),
        relatedCoverage: z.string().optional(),
    })).optional().describe("Warranties and conditions of cover — breach can remove cover entirely"),

    /**
     * Individually scheduled property at stated values: artworks, tenders and
     * outboards, equipment. A total sum insured cannot express six paintings at
     * six agreed values, and a set is normally settled piece by piece with
     * nothing added for the loss of the set.
     */
    insuredItems: z.array(z.object({
        description: z.string(),
        category: z.string().optional().describe("e.g. artwork, tender, outboard, equipment, machinery"),
        agreedValue: z.number().optional(),
        currency: CurrencySchema.optional(),
        valuationBasis: z.string().optional().describe("e.g. agreed value, market value at time of loss, replacement"),
        identifier: z.string().optional().describe("Serial, registry or inventory number where stated"),
        location: z.string().optional(),
    })).optional(),

    /**
     * Insured persons as a CLASS, never as named individuals.
     *
     * Fidelity and crew schedules list real people; PolicyWallet has no basis to
     * ingest a third party's name, so roles and counts are stored and the names
     * are deliberately dropped. The benefit table is what the reasoning needs.
     */
    insuredPersons: z.array(z.object({
        role: z.string().describe("Rank or function, e.g. master, chief engineer, cashier"),
        classLabel: z.string().optional().describe("Benefit class the schedule groups them under"),
        count: z.number().optional(),
        benefits: z.array(z.object({
            name: z.string(),
            amount: z.number().optional(),
            currency: CurrencySchema.optional(),
            basis: z.enum(LIMIT_BASES).optional(),
        })).optional(),
    })).optional().describe("Roles and counts only — never the names printed in the schedule"),

    /**
     * Market-standard clause sets cited by code.
     *
     * The single highest-value inference available in a cargo policy is which
     * Institute Cargo Clauses apply: (A) is all-risks, (C) is a short list of
     * major casualties that leaves theft, non-delivery, water damage and
     * handling damage outside. Two schedules can look identical and differ only
     * by that letter.
     */
    namedClauses: z.array(z.object({
        code: z.string().describe("As printed, e.g. 'Institute Cargo Clauses (C) 1.1.09', 'CL.311', 'LMA5403'"),
        title: z.string().optional(),
        family: z.enum([
            "institute_cargo",
            "institute_yacht",
            "institute_hulls",
            "institute_war_strikes",
            "lma",
            "greek_statutory",
            "other",
        ]).optional(),
        /** Whether citing it widens cover, narrows it, or removes a peril outright. */
        effect: z.enum(["grants", "restricts", "excludes", "unknown"]).default("unknown"),
    })).optional(),

    /** Where the cover applies, and where it stops. */
    territorialScope: z.object({
        description: z.string().optional().describe("e.g. Worldwide, Greek waters, Attica prefecture"),
        includes: z.array(z.string()).optional(),
        excludes: z.array(z.string()).optional(),
        /** True when a sanctions limitation clause is attached. */
        sanctionsClause: z.boolean().optional(),
        navigationLimits: z.string().optional().describe("Marine: the area the craft may not sail beyond"),
    }).optional(),

    /**
     * How the term is shaped. `annual` is the assumption everywhere else in the
     * product — renewal reminders, expiry warnings, the renewal pipeline — and
     * it is wrong for a three-month cargo transit or a 36-day crew period, which
     * would otherwise generate renewal nagging for cover that was never meant to
     * recur.
     */
    termBasis: z.enum([
        "annual",
        "short_period",
        "voyage",
        "single_transit",
        "multi_year",
    ]).optional(),

    /** Populated for voyage and single-transit cover. */
    transit: z.object({
        from: z.string().optional(),
        to: z.string().optional(),
        mode: z.string().optional().describe("e.g. road, sea, air, rail, multimodal"),
        conveyance: z.string().optional().describe("The named vessel or vehicle, where stated"),
        packing: z.string().optional().describe("Packing and stowage as described in the schedule"),
        valuationBasis: z.string().optional(),
    }).optional(),

    /**
     * The insured object for marine risks — the one place v3 adds a typed
     * section, because a vessel is genuinely not a vehicle or a property.
     * Money, fidelity and fine art need no section of their own: they are fully
     * described by `insuredItems`, `insuredPersons` and structured `coverages`.
     */
    marineVessel: z.object({
        name: z.string().optional(),
        vesselType: z.string().optional().describe("e.g. yacht, floating dock, bulk carrier"),
        flag: z.string().optional(),
        registryNumber: z.string().optional(),
        yearBuilt: z.number().optional(),
        lengthMetres: z.number().optional(),
        enginePowerHp: z.number().optional(),
        engineCount: z.number().optional(),
        deadweightTonnes: z.number().optional(),
        hullValue: z.number().optional(),
        currency: CurrencySchema.optional(),
        layUpPeriod: z.string().optional().describe("Lay-up terms as stated"),
        berthingRequirement: z.string().optional().describe("Where the craft must be kept for cover to apply"),
        skipperLicenceRequired: z.boolean().optional(),
    }).optional(),

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
            "claim_deadline", "notification_obligation", "no_claims_bonus",
            // v3 additions. Widening a z.enum is read-compatible: stored v2
            // documents never carry these values, and nothing narrows.
            "warranty", "condition_precedent", "security_requirement",
            // Fidelity cover turns on when a loss is DISCOVERED, and the window
            // keeps running for months after the employee leaves.
            "discovery_period",
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
        // W5-01: same minimisation as the canonical section — the name keys stay, deprecated, never asked for.
        namedDrivers: z.array(z.object({
            name: z.string().optional().describe(DEPRECATED_NAME),
            licenseNumber: z.string().optional().describe(DEPRECATED_NAME),
            ageBand: z.string().optional(),
            yearsLicensed: z.number().optional(),
            relationshipToPolicyholder: z.string().optional(),
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

/**
 * The shape BEFORE defaults are applied — what a caller writes, and what the AI
 * emits. Differs from `AcordData` wherever a field has a `.default()`: `effect`
 * and `breachEffect` are required on the parsed type and optional here. Helpers
 * that only read a subset should accept this, so they work on raw extraction
 * output as well as on stored, parsed data.
 */
export type AcordDataInput = z.input<typeof AcordDataSchema>;
