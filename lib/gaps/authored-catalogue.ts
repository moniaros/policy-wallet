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
import type { DocumentEvidence } from "./document-evidence"

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
    /**
     * The document evidence this definition needs before its finding is a GAP
     * (W2-02, lib/gaps/evidence-floor.ts). Omitted: derived from the logic —
     * a `missing` rule fires on silence and needs `policy_silent`; every other
     * rule asks the document and needs `policy_verified`. Declare it only to
     * override the derivation, and say why in a comment beside it.
     */
    evidenceFloor?: DocumentEvidence
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

    // ── Insured-value adequacy ───────────────────────────────────────
    //
    // A sum insured drifts from the asset it covers, and the two directions
    // hurt differently. Over-insurance quietly wastes premium — you cannot be
    // paid more than the loss. Under-insurance triggers the proportional
    // payout term (όρος αναλογίας): the insurer settles in the same ratio the
    // sum insured bears to the true value, so a home covered for half its
    // rebuild cost is paid half of a partial loss too.
    //
    // The reference value comes off the DOCUMENT — a declared market value, a
    // stated rebuild cost. There is deliberately no depreciation curve and no
    // market lookup here: a finding that quotes a euro figure has to be able
    // to say where the figure came from, and "your own policy says so" is the
    // only source that cannot be argued with. An age-based arm would need
    // Greek reference data this repository does not have; the operator
    // supports it the moment that data exists and is validated.
    //
    // WORDING: both are a prompt to review, never advice to act. PolicyWallet
    // is not an intermediary and does not recommend reducing cover, changing
    // insurer, or promise a saving. `tests/unit/insured-value-drift.test.ts`
    // scans the repo for the phrasings that would cross that line.
    {
        slug: 'insured_value_above_declared',
        name: 'Insured Value vs Declared Value',
        title: 'Το ασφαλισμένο ποσό είναι πολύ πάνω από τη δηλωμένη αξία',
        description: 'Η ασφαλισμένη αξία απέχει σημαντικά από την αξία που δηλώνει το ίδιο το ασφαλιστήριο για το όχημα. Δεν αποζημιώνεστε ποτέ πάνω από την πραγματική αξία, οπότε αξίζει να το συζητήσετε στην επόμενη ανανέωση.',
        lineOfBusiness: 'motor',
        severity: 'low',
        defaultSeverity: 'low',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{
                type: 'acord_field_check',
                field: 'vehicle.insuredValue',
                referenceField: 'vehicle.estimatedMarketValue',
                operator: 'value_drift',
                direction: 'above',
                thresholdPct: 20,
            }],
            operator: 'AND'
        },
        isActive: true
    },
    {
        slug: 'insured_value_below_rebuild_cost',
        name: 'Insured Value vs Rebuild Cost',
        title: 'Το ασφαλισμένο ποσό είναι κάτω από το κόστος ανακατασκευής',
        description: 'Η ασφαλισμένη αξία απέχει σημαντικά από το κόστος ανακατασκευής που αναφέρει το ίδιο το ασφαλιστήριο. Σε τέτοια περίπτωση μπορεί να ενεργοποιηθεί ο όρος αναλογίας, που μειώνει την αποζημίωση ακόμη και σε μερική ζημιά. Αξίζει να το συζητήσετε στην επόμενη ανανέωση.',
        lineOfBusiness: 'home',
        severity: 'high',
        defaultSeverity: 'high',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{
                type: 'acord_field_check',
                field: 'property.insuredValue',
                referenceField: 'property.estimatedRebuildCost',
                operator: 'value_drift',
                direction: 'below',
                thresholdPct: 20,
            }],
            operator: 'AND'
        },
        isActive: true
    },

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

    // ── Travel ───────────────────────────────────────────────────────
    // The section these read was added in the same phase (lib/schemas/acord-data.ts).
    // Policies analysed before that have no travel data, so these produce nothing
    // for them — silence, which is the correct output for "we never asked".
    //
    // NOT authored, deliberately: a rule on medicalExpensesLimit < 30000. The
    // €30,000 Schengen minimum is a real regulatory figure, but it is an EXTERNAL
    // fact this repository cannot verify, and a threshold in detection logic is a
    // severity verdict wearing a rule's clothes. It needs confirming before it
    // decides anything for anyone.
    {
        slug: 'no_repatriation_cover',
        name: 'Medical Repatriation',
        title: 'Medical repatriation not covered',
        description: 'This policy states that medical repatriation (επαναπατρισμός) is not covered. Bringing someone home by air ambulance is typically the largest single cost a travel policy meets, and it would fall to you.',
        lineOfBusiness: 'travel',
        severity: 'high',
        defaultSeverity: 'high',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'travel.repatriationCovered', operator: 'is_false' }],
            operator: 'AND'
        },
        isActive: true
    },
    {
        slug: 'no_trip_cancellation_cover',
        name: 'Trip Cancellation',
        title: 'Trip cancellation not covered',
        description: 'Ακύρωση ταξιδιού is not included in this policy. Flights and accommodation cancelled for a covered reason would not be reimbursed.',
        lineOfBusiness: 'travel',
        severity: 'medium',
        defaultSeverity: 'medium',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'travel.cancellationCovered', operator: 'is_false' }],
            operator: 'AND'
        },
        isActive: true
    },
    {
        // `missing` justified: a travel policy without a 24-hour assistance number
        // printed on it is unusual — that number is most of what the product is
        // at three in the morning in a country you do not live in.
        slug: 'missing_emergency_assistance_phone',
        name: 'Emergency Assistance Number',
        title: 'Emergency assistance number not recorded',
        description: 'No 24-hour emergency assistance number is recorded for this policy. Travel policies normally print one — check your documents and add it, so it is on your phone rather than in a drawer at home.',
        lineOfBusiness: 'travel',
        severity: 'medium',
        defaultSeverity: 'medium',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'travel.emergencyAssistancePhone', operator: 'missing' }],
            operator: 'AND'
        },
        isActive: true
    },

    // ── Group health ─────────────────────────────────────────────────
    // Group health is the ONE group branch with a typed section: it reuses
    // `AcordDataSchema.health` (lib/insurance/content/group-health.ts records
    // this). So the same coverage questions are askable of an employer plan —
    // but as SEPARATE definitions, because definitions are matched on an exact
    // lineOfBusiness, and because an underwriter may well rate the same finding
    // differently on a group contract than on an individual one. Gate 3b reviews
    // them independently, which is the point.
    {
        slug: 'group_missing_coordination_centre',
        name: 'Coordination Centre (Group)',
        title: 'No coordination centre recorded',
        description: 'No coordination centre (κέντρο συντονισμού) phone number is recorded for this group plan. Employer plans normally give one for pre-authorising hospital admissions — check your certificate of insurance and add it.',
        lineOfBusiness: 'group_health',
        severity: 'medium',
        defaultSeverity: 'medium',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'health.coordinationCentre.phone', operator: 'missing' }],
            operator: 'AND'
        },
        isActive: true
    },
    {
        slug: 'group_missing_hospital_class',
        name: 'Hospital Room Class (Group)',
        title: 'Hospital room class not recorded',
        description: 'No room class (θέση νοσηλείας) is recorded for this group plan. It decides which room you are entitled to on admission, and it is one of the things people most often assume is better than it is — check your certificate and add it.',
        lineOfBusiness: 'group_health',
        severity: 'low',
        defaultSeverity: 'low',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'health.hospitalClass', operator: 'missing' }],
            operator: 'AND'
        },
        isActive: true
    },
    {
        slug: 'group_no_direct_billing',
        name: 'Direct Settlement (Group)',
        title: 'Direct settlement with the hospital not available',
        description: 'This group plan does not offer απευθείας εξόφληση. You would pay the hospital yourself and claim the money back afterwards, which means having the funds available at the time.',
        lineOfBusiness: 'group_health',
        severity: 'medium',
        defaultSeverity: 'medium',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'health.directBillingAvailable', operator: 'is_false' }],
            operator: 'AND'
        },
        isActive: true
    },

    // ── Motorbike ────────────────────────────────────────────────────
    // A distinct canonical branch that DOES populate `acordData.vehicle`
    // (lib/insurance/content/motorbike.ts records this), so the vehicle rules
    // genuinely apply — as separate definitions, again, so severity can be rated
    // for a rider rather than inherited from a car.
    //
    // GLASS BREAKAGE IS DELIBERATELY ABSENT. The same content file records that
    // falling back to the motor bundle "told riders about glass breakage and
    // replacement vehicles while saying nothing about rider injury — actively
    // misleading". Copying all five motor rules across would have reproduced
    // exactly that. Rider, pillion and gear cover have no typed section, so
    // nothing is authored about them rather than guessed.
    {
        slug: 'moto_no_own_damage_cover',
        name: 'Own Damage Cover (Motorbike)',
        title: 'Own-damage cover not included',
        description: 'This policy states that damage to your own motorbike (ίδιες ζημιές) is not covered. However the other party is dealt with, repairs to your own machine after an at-fault accident would be paid by you.',
        lineOfBusiness: 'motorbike',
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
        slug: 'moto_no_roadside_assistance',
        name: 'Roadside Assistance (Motorbike)',
        title: 'Roadside assistance not included',
        description: 'Οδική βοήθεια is not part of this policy. A breakdown or a machine that will not start would be recovered at your own cost, unless you hold assistance separately.',
        lineOfBusiness: 'motorbike',
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
        slug: 'moto_missing_accident_declaration_phone',
        name: 'Accident Declaration Number (Motorbike)',
        title: 'Accident declaration number not recorded',
        description: 'No accident-declaration telephone number (φιλικός διακανονισμός) is recorded for this policy. Greek motor policies normally print one — check your documents and add it, so it is to hand at the roadside rather than looked for afterwards.',
        lineOfBusiness: 'motorbike',
        severity: 'low',
        defaultSeverity: 'low',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'vehicle.accidentDeclarationPhone', operator: 'missing' }],
            operator: 'AND'
        },
        isActive: true
    },
    {
        slug: 'moto_green_card_expiring',
        name: 'Green Card Expiry (Motorbike)',
        title: 'Green Card Expiring Soon',
        description: 'Your international motor insurance certificate (Green Card / Πράσινη Κάρτα) expires within 30 days. Renew before riding abroad.',
        lineOfBusiness: 'motorbike',
        severity: 'medium',
        defaultSeverity: 'medium',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'date_within_days', field: 'vehicle.greenCardExpiryDate', withinDays: 30 }],
            operator: 'AND'
        },
        isActive: true
    },
    // ── PW-CONTENT-01 Goal 5 — renters (new write branch) and the home contents questions ──
    {
        slug: 'renters_scope_not_recorded',
        name: 'Renters: cover scope not recorded',
        title: 'Δεν καταγράφεται αν η κάλυψη αφορά περιεχόμενο, κτίριο ή και τα δύο',
        description: 'Το ασφαλιστήριο ενοικιαστή δεν δηλώνει ρητά αν ασφαλίζει το περιεχόμενο, το κτίριο ή και τα δύο. Χωρίς αυτό δεν διαβάζεται τι ακριβώς προστατεύεται.',
        lineOfBusiness: 'renters',
        severity: 'low',
        defaultSeverity: 'low',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'property.contentsVsStructure', operator: 'missing' }],
            operator: 'AND'
        },
        isActive: true
    },
    {
        slug: 'renters_contents_sum_not_recorded',
        name: 'Renters: contents sum insured not recorded',
        title: 'Δεν καταγράφεται ασφαλισμένο κεφάλαιο περιεχομένου',
        description: 'Δεν καταγράφεται το ποσό για το οποίο ασφαλίζεται το περιεχόμενο. Είναι το πρώτο νούμερο που χρειάζεται μια δήλωση ζημιάς.',
        lineOfBusiness: 'renters',
        severity: 'low',
        defaultSeverity: 'low',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'property.insuredValue', operator: 'missing' }],
            operator: 'AND'
        },
        isActive: true
    },
    {
        slug: 'renters_no_fire_cover',
        name: 'Renters: fire cover not included',
        title: 'Δεν περιλαμβάνεται κάλυψη πυρκαγιάς',
        description: 'Το έγγραφο δηλώνει ότι το περιεχόμενο δεν καλύπτεται για πυρκαγιά.',
        lineOfBusiness: 'renters',
        severity: 'low',
        defaultSeverity: 'low',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'property.fireCoverageIncluded', operator: 'is_false' }],
            operator: 'AND'
        },
        isActive: true
    },
    {
        slug: 'renters_no_earthquake_cover',
        name: 'Renters: earthquake cover not included',
        title: 'Δεν περιλαμβάνεται κάλυψη σεισμού',
        description: 'Το έγγραφο δηλώνει ότι το περιεχόμενο δεν καλύπτεται για σεισμό.',
        lineOfBusiness: 'renters',
        severity: 'low',
        defaultSeverity: 'low',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'property.earthquakeCoverageIncluded', operator: 'is_false' }],
            operator: 'AND'
        },
        isActive: true
    },
    {
        slug: 'renters_no_flood_cover',
        name: 'Renters: flood cover not included',
        title: 'Δεν περιλαμβάνεται κάλυψη πλημμύρας',
        description: 'Το έγγραφο δηλώνει ότι το περιεχόμενο δεν καλύπτεται για πλημμύρα.',
        lineOfBusiness: 'renters',
        severity: 'low',
        defaultSeverity: 'low',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'property.floodCoverageIncluded', operator: 'is_false' }],
            operator: 'AND'
        },
        isActive: true
    },
    {
        slug: 'renters_theft_limit_not_recorded',
        name: 'Renters: theft limit not recorded',
        title: 'Δεν καταγράφεται όριο κάλυψης κλοπής',
        description: 'Δεν καταγράφεται όριο για την κάλυψη κλοπής περιεχομένου — δεν διαβάζεται μέχρι πού φτάνει η κάλυψη.',
        lineOfBusiness: 'renters',
        severity: 'low',
        defaultSeverity: 'low',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'property.theftCoverageLimit', operator: 'missing' }],
            operator: 'AND'
        },
        isActive: true
    },
    {
        slug: 'renters_valuables_not_itemised',
        name: 'Renters: valuables not itemised',
        title: 'Δεν καταγράφονται αντικείμενα αξίας ξεχωριστά',
        description: 'Το έγγραφο δεν απαριθμεί αντικείμενα αξίας με δική τους περιγραφή και αξία. Όπου υπάρχει όριο ανά αντικείμενο, αυτό μετρά.',
        lineOfBusiness: 'renters',
        severity: 'low',
        defaultSeverity: 'low',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'insuredItems', operator: 'missing' }],
            operator: 'AND'
        },
        isActive: true
    },
    {
        slug: 'renters_no_technical_assistance_phone',
        name: 'Renters: technical assistance number not recorded',
        title: 'Δεν καταγράφεται τηλέφωνο τεχνικής βοήθειας',
        description: 'Δεν καταγράφεται αριθμός τεχνικής βοήθειας για βλάβες και έκτακτα περιστατικά στην κατοικία.',
        lineOfBusiness: 'renters',
        severity: 'low',
        defaultSeverity: 'low',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'property.technicalAssistancePhone', operator: 'missing' }],
            operator: 'AND'
        },
        isActive: true
    },
    {
        slug: 'home_scope_not_recorded',
        name: 'Home: cover scope not recorded',
        title: 'Δεν καταγράφεται αν η κάλυψη αφορά κτίριο, περιεχόμενο ή και τα δύο',
        description: 'Το ασφαλιστήριο κατοικίας δεν δηλώνει ρητά αν ασφαλίζει το κτίριο, το περιεχόμενο ή και τα δύο.',
        lineOfBusiness: 'home',
        severity: 'low',
        defaultSeverity: 'low',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'property.contentsVsStructure', operator: 'missing' }],
            operator: 'AND'
        },
        isActive: true
    },
    {
        slug: 'home_insured_value_not_recorded',
        name: 'Home: sum insured not recorded',
        title: 'Δεν καταγράφεται ασφαλισμένο κεφάλαιο',
        description: 'Δεν καταγράφεται το ποσό για το οποίο ασφαλίζεται η κατοικία ή το περιεχόμενό της.',
        lineOfBusiness: 'home',
        severity: 'low',
        defaultSeverity: 'low',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'property.insuredValue', operator: 'missing' }],
            operator: 'AND'
        },
        isActive: true
    },
    {
        slug: 'home_valuables_not_itemised',
        name: 'Home: valuables not itemised',
        title: 'Δεν καταγράφονται αντικείμενα αξίας ξεχωριστά',
        description: 'Το έγγραφο δεν απαριθμεί αντικείμενα αξίας με δική τους περιγραφή και αξία.',
        lineOfBusiness: 'home',
        severity: 'low',
        defaultSeverity: 'low',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'insuredItems', operator: 'missing' }],
            operator: 'AND'
        },
        isActive: true
    },
    // ── PW-CONTENT-01 Goal 6 — personal accident, roadside, pension, income protection, group life ──
    {
        slug: 'pa_sum_insured_not_recorded',
        name: 'Personal accident: sum insured not recorded',
        title: 'Δεν καταγράφεται ασφαλισμένο κεφάλαιο',
        description: 'Το ασφαλιστήριο προσωπικού ατυχήματος δεν καταγράφει το κεφάλαιο που καταβάλλεται σε θάνατο ή μόνιμη αναπηρία από ατύχημα.',
        lineOfBusiness: 'personal_accident',
        severity: 'low',
        defaultSeverity: 'low',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'policy.sumInsured', operator: 'missing' }],
            operator: 'AND'
        },
        isActive: true
    },
    {
        slug: 'pa_no_beneficiaries_recorded',
        name: 'Personal accident: no beneficiary recorded',
        title: 'Δεν καταγράφεται δικαιούχος',
        description: 'Δεν καταγράφεται δικαιούχος για την παροχή θανάτου από ατύχημα — ούτε στο σχετικό πεδίο ούτε στην ενότητα ζωής.',
        lineOfBusiness: 'personal_accident',
        severity: 'low',
        defaultSeverity: 'low',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'beneficiaries', fields: ['beneficiaries', 'lifeAndInvestment.beneficiaries'], operator: 'all_missing' }],
            operator: 'AND'
        },
        isActive: true
    },
    {
        slug: 'roadside_assistance_phone_not_recorded',
        name: 'Roadside: assistance number not recorded',
        title: 'Δεν καταγράφεται τηλέφωνο οδικής βοήθειας',
        description: 'Ένα ασφαλιστήριο οδικής βοήθειας είναι πρώτα απ\u2019 όλα ένας αριθμός. Δεν καταγράφεται.',
        lineOfBusiness: 'roadside',
        severity: 'low',
        defaultSeverity: 'low',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'vehicle.roadsideAssistancePhone', operator: 'missing' }],
            operator: 'AND'
        },
        isActive: true
    },
    {
        slug: 'roadside_vehicle_not_recorded',
        name: 'Roadside: vehicle not recorded',
        title: 'Δεν καταγράφεται αριθμός κυκλοφορίας οχήματος',
        description: 'Δεν καταγράφεται ποιο όχημα καλύπτει το ασφαλιστήριο οδικής βοήθειας.',
        lineOfBusiness: 'roadside',
        severity: 'low',
        defaultSeverity: 'low',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'vehicle.plateNumber', operator: 'missing' }],
            operator: 'AND'
        },
        isActive: true
    },
    {
        slug: 'pension_maturity_date_not_recorded',
        name: 'Pension: maturity date not recorded',
        title: 'Δεν καταγράφεται ημερομηνία λήξης / ωρίμανσης',
        description: 'Δεν καταγράφεται πότε ωριμάζει το συνταξιοδοτικό πρόγραμμα — η ημερομηνία γύρω από την οποία οργανώνεται κάθε επιλογή.',
        lineOfBusiness: 'pension',
        severity: 'low',
        defaultSeverity: 'low',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'lifeAndInvestment.maturityDate', operator: 'missing' }],
            operator: 'AND'
        },
        isActive: true
    },
    {
        slug: 'pension_no_beneficiaries_recorded',
        name: 'Pension: no beneficiary recorded',
        title: 'Δεν καταγράφεται δικαιούχος',
        description: 'Δεν καταγράφεται δικαιούχος σε περίπτωση θανάτου πριν την ωρίμανση — ούτε στο σχετικό πεδίο ούτε στην ενότητα ζωής.',
        lineOfBusiness: 'pension',
        severity: 'low',
        defaultSeverity: 'low',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'beneficiaries', fields: ['beneficiaries', 'lifeAndInvestment.beneficiaries'], operator: 'all_missing' }],
            operator: 'AND'
        },
        isActive: true
    },
    {
        slug: 'income_protection_benefit_not_recorded',
        name: 'Income protection: benefit not recorded',
        title: 'Δεν καταγράφεται ποσό παροχής',
        description: 'Δεν καταγράφεται το ποσό που καταβάλλεται όσο διαρκεί η ανικανότητα για εργασία.',
        lineOfBusiness: 'income_protection',
        severity: 'low',
        defaultSeverity: 'low',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'policy.sumInsured', operator: 'missing' }],
            operator: 'AND'
        },
        isActive: true
    },
    {
        slug: 'group_life_death_benefit_not_recorded',
        name: 'Group life: death benefit not recorded',
        title: 'Δεν καταγράφεται ασφαλισμένο κεφάλαιο ζωής',
        description: 'Το ομαδικό ασφαλιστήριο ζωής δεν καταγράφει το κεφάλαιο θανάτου ανά ασφαλισμένο.',
        lineOfBusiness: 'group_life',
        severity: 'low',
        defaultSeverity: 'low',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'lifeAndInvestment.deathBenefit', operator: 'missing' }],
            operator: 'AND'
        },
        isActive: true
    },
    {
        slug: 'group_life_no_beneficiaries_recorded',
        name: 'Group life: no beneficiary recorded',
        title: 'Δεν καταγράφεται δικαιούχος',
        description: 'Δεν καταγράφεται δικαιούχος — ούτε στο σχετικό πεδίο ούτε στην ενότητα ζωής.',
        lineOfBusiness: 'group_life',
        severity: 'low',
        defaultSeverity: 'low',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'beneficiaries', fields: ['beneficiaries', 'lifeAndInvestment.beneficiaries'], operator: 'all_missing' }],
            operator: 'AND'
        },
        isActive: true
    },
    {
        slug: 'pension_sum_insured_not_recorded',
        name: 'Pension: guaranteed sum not recorded',
        title: 'Δεν καταγράφεται εγγυημένο κεφάλαιο ή ποσοστό',
        description: 'Δεν καταγράφεται τι μέρος του προγράμματος είναι εγγυημένο — το ποσοστό που ορίζει τι θα υπάρχει στη λήξη ό,τι κι αν κάνουν οι αγορές.',
        lineOfBusiness: 'pension',
        severity: 'low',
        defaultSeverity: 'low',
        ruleId: 'acord_deterministic',
        detectionLogic: {
            rules: [{ type: 'acord_field_check', field: 'lifeAndInvestment.guaranteedPercentage', operator: 'missing' }],
            operator: 'AND'
        },
        isActive: true
    }
]
