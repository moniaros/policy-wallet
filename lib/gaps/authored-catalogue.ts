/**
 * The gap definitions a HUMAN wrote, with rules a machine can evaluate.
 *
 * This is the live catalogue. It is the single source for three consumers that
 * had no way to agree with each other before:
 *
 *   • prisma/seed.ts, which writes it to the database
 *   • tests/unit/gap-rule-catalogue-trace.test.ts, which traces every rule
 *   • scripts/gen-severity-review-packet.ts, which asks an underwriter to read it
 *
 * WHAT BELONGS HERE: a definition whose `detectionLogic` names fields and an
 * operator, so `decideGapsForPolicy` can evaluate it against extracted AcordData.
 *
 * WHAT DOES NOT: anything shaped `{ check: "does the policy...?" }`. Those are
 * prompts, not rules — `hasEvaluableRule()` rejects them, and a catalogue entry
 * that can never fire is a capability claimed and not delivered. The AI-authored
 * ones from before Phase 3 stay in seed.ts, deactivated, as a record.
 *
 * SEVERITY IS A PROPOSAL. Every `severity` below is awaiting underwriter sign-off
 * (Gate 3b). Detection — what the rule asks of the document — is a question of
 * fact and is authored here. Severity is a judgement about risk and is not.
 * `gap_definitions.severity_validated_at` is what records whether anyone
 * qualified has agreed; specificity here is not agreement.
 *
 * See docs/audits/phase7-rule-catalogue-and-gate3b-2026-08.md.
 */
import type { Prisma } from "@prisma/client"

export interface AuthoredGapDefinition {
    slug: string
    name: string
    title: string
    description: string
    lineOfBusiness: string
    severity: string
    defaultSeverity: string
    ruleId: string
    detectionLogic: Prisma.InputJsonValue
    isActive: boolean
}

export const AUTHORED_GAP_DEFINITIONS: AuthoredGapDefinition[] = [
    {
        slug: 'missing_enfia_components',
        name: 'ENFIA Coverage Components',
        title: 'Not eligible for the ENFIA discount',
        // ENFIA is Greece's unified property-ownership TAX; there is no such
        // thing as "ENFIA insurance" and it requires no cover at all. What
        // exists is a tax DISCOUNT for homes insured against all three perils
        // — which lib/guides/content.ts has stated correctly all along.
        description: 'Insuring a home against fire, earthquake AND flood qualifies it for a reduction in ENFIA property tax. One or more of the three is missing from this policy.',
        lineOfBusiness: 'home',
        severity: 'high',
        defaultSeverity: 'high',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [
                {
                    type: 'acord_field_check',
                    field: 'property',
                    operator: 'all_false',
                    fields: [
                        'property.fireCoverageIncluded',
                        'property.earthquakeCoverageIncluded',
                        'property.floodCoverageIncluded'
                    ]
                }
            ],
            operator: 'AND'
        },
        isActive: true
    },
    {
        slug: 'missing_coordination_centre',
        name: 'Coordination Centre',
        title: 'No coordination centre recorded',
        // The rule tests whether a phone number was EXTRACTED. That is not the
        // same as the policy not having one, so the finding says what is
        // actually known: no coordination centre is recorded.
        description: 'No coordination centre (κέντρο συντονισμού) phone number is recorded for this policy. Greek health policies normally give one for pre-authorising hospital admissions — check your policy documents and add it, so it is to hand when you need it.',
        lineOfBusiness: 'health',
        severity: 'medium',
        defaultSeverity: 'medium',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [
                {
                    type: 'acord_field_check',
                    field: 'health.coordinationCentre.phone',
                    operator: 'missing'
                }
            ],
            operator: 'AND'
        },
        isActive: true
    },
    {
        slug: 'missing_leishmaniasis',
        name: 'Leishmaniasis Coverage',
        title: 'No Leishmaniasis Protection',
        description: 'Leishmaniasis (Λεϊσμανίαση) is endemic in Greece. Pet insurance without leishmaniasis coverage leaves a critical gap for dogs.',
        lineOfBusiness: 'pet',
        severity: 'high',
        defaultSeverity: 'high',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [
                {
                    type: 'acord_field_check',
                    field: 'pet.leishmaniaCovered',
                    operator: 'is_false'
                }
            ],
            operator: 'AND'
        },
        isActive: true
    },
    {
        slug: 'green_card_expiring',
        name: 'Green Card Expiry',
        title: 'Green Card Expiring Soon',
        description: 'Your international motor insurance certificate (Green Card / Πράσινη Κάρτα) expires within 30 days. Renew before traveling abroad.',
        lineOfBusiness: 'motor',
        severity: 'medium',
        defaultSeverity: 'medium',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [
                {
                    type: 'date_within_days',
                    field: 'vehicle.greenCardExpiryDate',
                    withinDays: 30
                }
            ],
            operator: 'AND'
        },
        isActive: true
    },

    // ─────────────────────────────────────────────────────────────────
    // Human-authored detection rules — Phase 7 (2026-08-20).
    // docs/audits/phase7-rule-catalogue-and-gate3b-2026-08.md
    //
    // DETECTION here is factual: each rule asks a question about what the
    // document says. SEVERITY is NOT. Every `severity` below is a PROPOSAL
    // awaiting underwriter sign-off (Gate 3b) — the column is NOT NULL, so a
    // value has to be written, and `severityValidatedAt` on the row is what
    // says whether anyone qualified has agreed with it. Do not read these as
    // validated because they are specific.
    //
    // Authoring rule: prefer `is_false` (the document SAID the cover is
    // absent) over `missing` (the document was silent, which is the normal
    // state for most fields). The three `missing` rules below are justified
    // one by one, and each is worded "not recorded", never "not covered".
    // ─────────────────────────────────────────────────────────────────

    // ── Motor ────────────────────────────────────────────────────────
    {
        slug: 'no_own_damage_cover',
        name: 'Own Damage Cover',
        title: 'Own-damage cover not included',
        description: 'This policy states that damage to your own vehicle (ίδιες ζημιές) is not covered. However the other party is dealt with, repairs to your own car after an at-fault accident would be paid by you.',
        lineOfBusiness: 'motor',
        severity: 'high',
        defaultSeverity: 'high',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'vehicle.ownVehicleDamage', operator: 'is_false' }],
            operator: 'AND'
        },
        isActive: true
    },
    {
        slug: 'no_glass_breakage_cover',
        name: 'Glass Breakage',
        title: 'Glass breakage not covered',
        description: 'Θραύση κρυστάλλων is not included in this policy. A windscreen is among the most common motor claims in Greece, and replacing one would be at your own cost.',
        lineOfBusiness: 'motor',
        severity: 'medium',
        defaultSeverity: 'medium',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'vehicle.glassBreakage', operator: 'is_false' }],
            operator: 'AND'
        },
        isActive: true
    },
    {
        slug: 'no_roadside_assistance',
        name: 'Roadside Assistance',
        title: 'Roadside assistance not included',
        description: 'Οδική βοήθεια is not part of this policy. A breakdown or tow would be arranged and paid for by you, unless you hold roadside assistance separately.',
        lineOfBusiness: 'motor',
        severity: 'medium',
        defaultSeverity: 'medium',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'vehicle.hasRoadsideAssistance', operator: 'is_false' }],
            operator: 'AND'
        },
        isActive: true
    },
    {
        // `missing` justified: Greek motor policies routinely print the
        // accident-declaration number, so its absence from the document is
        // informative rather than merely unread.
        slug: 'missing_accident_declaration_phone',
        name: 'Accident Declaration Number',
        title: 'Accident declaration number not recorded',
        description: 'No accident-declaration telephone number (φιλικός διακανονισμός) is recorded for this policy. Greek motor policies normally print one — check your documents and add it, so it is to hand at the roadside rather than looked for afterwards.',
        lineOfBusiness: 'motor',
        severity: 'low',
        defaultSeverity: 'low',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'vehicle.accidentDeclarationPhone', operator: 'missing' }],
            operator: 'AND'
        },
        isActive: true
    },

    // ── Home ─────────────────────────────────────────────────────────
    {
        // Distinct from missing_enfia_components, which asks whether the
        // policy qualifies for a TAX DISCOUNT. This asks the coverage
        // question on its own, and is the example the product's own guides
        // have used all along while no rule existed for it.
        slug: 'no_earthquake_cover',
        name: 'Earthquake Cover',
        title: 'Earthquake cover not included',
        description: 'This policy states that earthquake (σεισμός) is not covered. Greece is the most seismically active country in Europe, and earthquake is excluded from a standard fire policy unless it is bought explicitly.',
        lineOfBusiness: 'home',
        severity: 'high',
        defaultSeverity: 'high',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'property.earthquakeCoverageIncluded', operator: 'is_false' }],
            operator: 'AND'
        },
        isActive: true
    },
    {
        slug: 'no_flood_cover',
        name: 'Flood Cover',
        title: 'Flood cover not included',
        description: 'This policy states that flood (πλημμύρα) is not covered.',
        lineOfBusiness: 'home',
        severity: 'high',
        defaultSeverity: 'high',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'property.floodCoverageIncluded', operator: 'is_false' }],
            operator: 'AND'
        },
        isActive: true
    },
    {
        slug: 'no_fire_cover',
        name: 'Fire Cover',
        title: 'Fire cover not included',
        description: 'This policy states that fire (πυρκαγιά) is not covered. Fire is the base peril of a Greek home policy, and a mortgage lender normally requires it.',
        lineOfBusiness: 'home',
        severity: 'high',
        defaultSeverity: 'high',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'property.fireCoverageIncluded', operator: 'is_false' }],
            operator: 'AND'
        },
        isActive: true
    },

    // ── Health ───────────────────────────────────────────────────────
    {
        slug: 'no_direct_billing',
        name: 'Direct Settlement',
        title: 'Direct settlement with the hospital not available',
        description: 'This policy does not offer απευθείας εξόφληση. You would pay the hospital yourself and claim the money back afterwards, which means having the funds available at the time.',
        lineOfBusiness: 'health',
        severity: 'medium',
        defaultSeverity: 'medium',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'health.directBillingAvailable', operator: 'is_false' }],
            operator: 'AND'
        },
        isActive: true
    },
    {
        slug: 'no_annual_checkup',
        name: 'Annual Check-up',
        title: 'Annual check-up not included',
        description: 'Ο ετήσιος προληπτικός έλεγχος is not part of this policy.',
        lineOfBusiness: 'health',
        severity: 'low',
        defaultSeverity: 'low',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'health.annualCheckupIncluded', operator: 'is_false' }],
            operator: 'AND'
        },
        isActive: true
    },
    {
        // `missing` justified: Greek health policies state the room class —
        // it is what the premium is priced on.
        slug: 'missing_hospital_class',
        name: 'Hospital Room Class',
        title: 'Hospital room class not recorded',
        description: 'No room class (θέση νοσηλείας) is recorded for this policy. Greek health policies state it, and it decides which room you are entitled to on admission — check your documents and add it.',
        lineOfBusiness: 'health',
        severity: 'low',
        defaultSeverity: 'low',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'health.hospitalClass', operator: 'missing' }],
            operator: 'AND'
        },
        isActive: true
    },

    // ── Pet ──────────────────────────────────────────────────────────
    {
        slug: 'no_direct_vet_payment',
        name: 'Direct Vet Payment',
        title: 'Direct payment to the vet not available',
        description: 'This policy does not pay the veterinary clinic directly. You would settle the bill yourself and claim it back afterwards.',
        lineOfBusiness: 'pet',
        severity: 'medium',
        defaultSeverity: 'medium',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'pet.directVetPayment', operator: 'is_false' }],
            operator: 'AND'
        },
        isActive: true
    },
    {
        // `missing` justified: microchipping is a legal requirement for dogs
        // in Greece, and insurers record the number as the animal's identity.
        slug: 'missing_microchip_number',
        name: 'Microchip Number',
        title: 'Microchip number not recorded',
        description: 'No microchip number is recorded for this policy. Microchipping is a legal requirement for dogs in Greece and insurers normally record the number as the animal’s identity — check your documents and add it.',
        lineOfBusiness: 'pet',
        severity: 'low',
        defaultSeverity: 'low',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'pet.microchipNumber', operator: 'missing' }],
            operator: 'AND'
        },
        isActive: true
    },

    // ── Life ─────────────────────────────────────────────────────────
    {
        // `all_missing`, not `missing`: beneficiaries arrive by either path
        // depending on the document, and checking one alone would report "no
        // beneficiary" for a policy that plainly names one. An EMPTY array
        // counts as absent — a list with nobody on it names nobody.
        slug: 'no_beneficiaries_recorded',
        name: 'Beneficiaries',
        title: 'No beneficiary recorded',
        description: 'No beneficiary (δικαιούχος) is recorded on this policy. With nobody named, the benefit is settled through the estate rather than paid directly — which takes longer, and may not follow what you intended.',
        lineOfBusiness: 'life',
        severity: 'high',
        defaultSeverity: 'high',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [
                {
                    type: 'acord_field_check',
                    field: 'beneficiaries',
                    operator: 'all_missing',
                    fields: ['beneficiaries', 'lifeAndInvestment.beneficiaries']
                }
            ],
            operator: 'AND'
        },
        isActive: true
    },
]
