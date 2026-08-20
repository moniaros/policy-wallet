import { describe, expect, it } from 'vitest'

import { AcordDataSchema, LIMIT_BASES } from '@/lib/schemas/acord-data'

/**
 * ACORD v3 — additive structure for the money terms that decide a claim.
 *
 * Two things are being protected here. First, that v3 does not break v2: every
 * `acordData` blob already in the database was written against the older shape,
 * and a schema change that invalidated them would blank the coverage panel for
 * the entire existing book. Second, that the new structures can actually hold
 * what real Greek schedules say — the fixtures below are the shapes taken from
 * the supplied policy documents, not invented examples.
 */
describe('AcordData v3 — backward compatibility with stored v2 documents', () => {
    /** A representative v2 blob: free-text limits, no structure, `_version: 2`. */
    const V2_DOCUMENT = {
        _version: 2,
        policy: {
            insurerName: 'Η ΕΘΝΙΚΗ',
            policyNumber: '1668177',
            lineOfBusiness: 'health',
            sumInsured: 1500000,
            premium: { amount: 666.01 },
        },
        health: { annualLimit: 1500000, hospitalClass: 'Α' },
        coverages: [
            { name: 'Έξοδα Νοσοκομειακής Περίθαλψης', limit: '1.500.000 €', deductible: '750 €' },
        ],
        exclusions: ['Προϋπάρχουσες παθήσεις'],
    }

    it('parses a stored v2 document unchanged', () => {
        const parsed = AcordDataSchema.parse(V2_DOCUMENT)
        expect(parsed.policy?.policyNumber).toBe('1668177')
        expect(parsed.coverages?.[0].limit).toBe('1.500.000 €')
        // The explicit stored version is preserved, not silently rewritten —
        // the default only applies where the field is absent.
        expect(parsed._version).toBe(2)
    })

    it('defaults to v3 when no version is stored', () => {
        expect(AcordDataSchema.parse({})._version).toBe(3)
    })

    it('leaves every v3 field optional', () => {
        const parsed = AcordDataSchema.parse(V2_DOCUMENT)
        expect(parsed.conditions).toBeUndefined()
        expect(parsed.insuredItems).toBeUndefined()
        expect(parsed.namedClauses).toBeUndefined()
        expect(parsed.marineVessel).toBeUndefined()
        expect(parsed.termBasis).toBeUndefined()
    })
})

describe('AcordData v3 — multi-dimensional limits', () => {
    /**
     * Greek recreational-craft liability runs three parallel towers plus a
     * fourth for marine pollution, all under one policy ceiling. In v2 this
     * collapsed to a single string and the shape was unrecoverable.
     */
    it('holds per-person, per-event and period-aggregate towers side by side', () => {
        const parsed = AcordDataSchema.parse({
            coverages: [{
                name: 'Αστική Ευθύνη — Σωματικές Βλάβες',
                limit: '150.000 € ανά πρόσωπο / 700.000 € ανά συμβάν / 2.100.000 € συνολικά',
                limits: [
                    { basis: 'per_person', amount: 150000, currency: 'EUR' },
                    { basis: 'per_event', amount: 700000, currency: 'EUR' },
                    { basis: 'per_period_aggregate', amount: 2100000, currency: 'EUR' },
                ],
            }],
        })
        const limits = parsed.coverages![0].limits!
        expect(limits).toHaveLength(3)
        expect(limits.map((l) => l.basis)).toEqual(['per_person', 'per_event', 'per_period_aggregate'])
        // The v2 string survives alongside it, so nothing that renders today changes.
        expect(parsed.coverages![0].limit).toContain('150.000')
    })

    it('distinguishes an unlimited benefit from an unknown one', () => {
        const parsed = AcordDataSchema.parse({
            coverages: [{
                name: 'Αεροδιακομιδή',
                limits: [{ basis: 'per_event', unlimited: true }],
            }, {
                name: 'Κάλυψη χωρίς αναγραφόμενο όριο',
                limits: [{ basis: 'per_event' }],
            }],
        })
        expect(parsed.coverages![0].limits![0].unlimited).toBe(true)
        expect(parsed.coverages![0].limits![0].amount).toBeUndefined()
        // No amount and no unlimited flag means "we did not find one" — the two
        // must not be conflated, or an unstated limit reads as no limit.
        //
        // `undefined`, not `false`. This asserted `false` while the schema carried
        // `.default(false)`, and the AI SDK materialises Zod defaults into the
        // returned object — so every limit the extractor never determined was
        // STORED as an explicit "not unlimited". That is indistinguishable from the
        // model actually saying so, and a future `is_false` rule (which requires an
        // explicit false, precisely to ignore silence) would have fired on it.
        // Optional keeps all three states apart: undefined / false / true.
        expect(parsed.coverages![1].limits![0].unlimited).toBeUndefined()
        expect(parsed.coverages![1].limits![0].amount).toBeUndefined()
    })

    it('carries a per-safe sub-limit with what it applies to', () => {
        const parsed = AcordDataSchema.parse({
            coverages: [{
                name: 'Ασφάλιση Χρηματοκιβωτίου',
                limits: [
                    { basis: 'per_event', amount: 200000, currency: 'EUR', appliesTo: 'ανά χρηματοκιβώτιο' },
                    { basis: 'per_event', amount: 1500, currency: 'EUR', appliesTo: 'υλικές ζημιές χρηματοκιβωτίου' },
                ],
            }],
        })
        expect(parsed.coverages![0].limits!.map((l) => l.appliesTo)).toEqual([
            'ανά χρηματοκιβώτιο',
            'υλικές ζημιές χρηματοκιβωτίου',
        ])
    })

    it('keeps LIMIT_BASES closed so two policies stay comparable', () => {
        expect(LIMIT_BASES).toContain('per_period_aggregate')
        expect(() =>
            AcordDataSchema.parse({ coverages: [{ name: 'x', limits: [{ basis: 'per_fortnight' }] }] })
        ).toThrow()
    })
})

describe('AcordData v3 — deductible ladders', () => {
    /**
     * A yacht hull schedule sets six deductibles by type of damage and then
     * states which one wins. Without `deductibleResolution` the ladder is
     * ambiguous and any adequacy calculation over it is guesswork.
     */
    it('holds a ladder plus the rule that resolves it', () => {
        const parsed = AcordDataSchema.parse({
            deductibleResolution: 'largest_applies',
            coverages: [{
                name: 'Ίδιες Ζημιές Σκάφους',
                deductibles: [
                    { basis: 'per_event', amount: 10000, currency: 'EUR', appliesTo: 'κάθε ζημία' },
                    { basis: 'per_event', amount: 20000, currency: 'EUR', appliesTo: 'μηχανικές βλάβες' },
                    { basis: 'per_event', amount: 500, currency: 'EUR', appliesTo: 'βοηθητικές λέμβοι και εξοπλισμός' },
                    { basis: 'per_event', amount: 0, currency: 'EUR', appliesTo: 'αστική ευθύνη προς τρίτους' },
                ],
            }],
        })
        expect(parsed.deductibleResolution).toBe('largest_applies')
        expect(parsed.coverages![0].deductibles).toHaveLength(4)
        // A nil deductible is a real, stated term — not a missing value.
        expect(parsed.coverages![0].deductibles![3].amount).toBe(0)
    })

    it('holds a percentage deductible with its floor', () => {
        // «% επί του ποσού κάθε υλικής ζημίας, ελάχιστο όριο 350 €»
        const parsed = AcordDataSchema.parse({
            coverages: [{
                name: 'Υλικές Ζημιές Τρίτων',
                deductibles: [{ basis: 'per_event', percentOf: 'κάθε υλική ζημία', minimum: 350, currency: 'EUR' }],
            }],
        })
        const deductible = parsed.coverages![0].deductibles![0]
        expect(deductible.minimum).toBe(350)
        expect(deductible.amount).toBeUndefined()
    })

    it('separates a deductible that varies by setting', () => {
        // €750 with an overnight stay, €375 without, nil in a public hospital.
        const parsed = AcordDataSchema.parse({
            coverages: [{
                name: 'Νοσοκομειακή Περίθαλψη',
                coinsurancePercent: 10,
                deductibles: [
                    { basis: 'per_claim', amount: 750, appliesTo: 'νοσηλεία με διανυκτέρευση' },
                    { basis: 'per_claim', amount: 375, appliesTo: 'νοσηλεία χωρίς διανυκτέρευση' },
                    { basis: 'per_claim', amount: 0, appliesTo: 'δημόσιο νοσοκομείο' },
                ],
            }],
        })
        expect(parsed.coverages![0].deductibles!.map((d) => d.amount)).toEqual([750, 375, 0])
        expect(parsed.coverages![0].coinsurancePercent).toBe(10)
    })
})

describe('AcordData v3 — conditions and warranties', () => {
    it('records what breaching a warranty does, and defaults to unknown', () => {
        const parsed = AcordDataSchema.parse({
            conditions: [
                {
                    kind: 'maintenance',
                    text: 'WARRANTED THAT ANNUAL SERVICING WILL BE CARRIED OUT IN ACCORDANCE WITH MAKER’S INSTRUCTIONS',
                    recurrence: 'annual',
                    breachEffect: 'voids_cover',
                    verifiable: true,
                },
                { kind: 'other', text: 'Κάτι που δεν ξεκαθαρίζει τι συνεπάγεται' },
            ],
        })
        expect(parsed.conditions![0].breachEffect).toBe('voids_cover')
        expect(parsed.conditions![0].recurrence).toBe('annual')
        // Saying "unknown" is the honest default; assuming a breach voids cover
        // would overstate the risk, assuming it does nothing would hide it.
        expect(parsed.conditions![1].breachEffect).toBe('unknown')
        expect(parsed.conditions![1].verifiable).toBe(false)
    })

    it('captures a cross-policy dependency as a first-class field', () => {
        // Greek money and fidelity wordings require a property policy in force
        // for the same address — the lapse of one contract undermines another.
        const parsed = AcordDataSchema.parse({
            conditions: [{
                kind: 'condition_precedent',
                text: 'Να υπάρχει σε ισχύ ασφαλιστήριο Περιουσίας για την παραπάνω διεύθυνση κινδύνου',
                dependsOnOtherPolicy: 'home',
                breachEffect: 'voids_cover',
            }],
        })
        expect(parsed.conditions![0].dependsOnOtherPolicy).toBe('home')
    })

    it('holds a security requirement that doubles as a prevention action', () => {
        const parsed = AcordDataSchema.parse({
            conditions: [{
                kind: 'security_requirement',
                text: 'Ύπαρξη συστήματος συναγερμού συνδεδεμένου με Κέντρο Λήψης Σημάτων',
                recurrence: 'continuous',
                verifiable: true,
            }],
        })
        expect(parsed.conditions![0].kind).toBe('security_requirement')
        expect(parsed.conditions![0].recurrence).toBe('continuous')
    })
})

describe('AcordData v3 — scheduled items, persons and clause sets', () => {
    it('holds individually scheduled items at agreed values', () => {
        const parsed = AcordDataSchema.parse({
            insuredItems: [
                { description: 'Πίνακας — Γυναίκα και Γαϊδούρι', category: 'artwork', agreedValue: 15000, currency: 'EUR' },
                { description: 'Πίνακας — Αφηρημένος', category: 'artwork', agreedValue: 12000, currency: 'EUR' },
            ],
        })
        expect(parsed.insuredItems).toHaveLength(2)
        expect(parsed.insuredItems!.reduce((sum, i) => sum + (i.agreedValue ?? 0), 0)).toBe(27000)
    })

    it('stores insured persons as roles and counts, never as names', () => {
        const parsed = AcordDataSchema.parse({
            insuredPersons: [{
                role: 'Πλοίαρχος και Α Μηχανικός',
                count: 2,
                benefits: [
                    { name: 'Θάνατος από ατύχημα', amount: 12000, currency: 'USD' },
                    { name: 'Νοσοκομειακές δαπάνες', amount: 5000, currency: 'USD' },
                ],
            }],
        })
        const person = parsed.insuredPersons![0]
        expect(person.count).toBe(2)
        expect(person.benefits![0].currency).toBe('USD')
        // There is deliberately no field a name could be written into.
        expect(Object.keys(person)).not.toContain('name')
    })

    it('records the clause set by code and what it does', () => {
        const parsed = AcordDataSchema.parse({
            namedClauses: [
                { code: 'INSTITUTE CARGO CLAUSES (C) 1.1.09', family: 'institute_cargo', effect: 'grants' },
                { code: 'INFECTIOUS DISEASE / COVID-19 EXCLUSION', effect: 'excludes' },
                { code: 'MARINE CYBER ENDORSEMENT 11.11.19' },
            ],
        })
        expect(parsed.namedClauses![0].family).toBe('institute_cargo')
        expect(parsed.namedClauses![1].effect).toBe('excludes')
        expect(parsed.namedClauses![2].effect).toBe('unknown')
    })
})

describe('AcordData v3 — term basis and currency', () => {
    it('marks a single transit so renewal logic can stay away from it', () => {
        const parsed = AcordDataSchema.parse({
            termBasis: 'single_transit',
            transit: {
                from: 'Μελίσσια Αττικής',
                to: 'Σπάτα',
                mode: 'road',
                packing: 'Επαγγελματική συσκευασία και ασφαλής πρόσδεση (lashing and securing)',
                valuationBasis: 'Τρέχουσα εμπορική αξία τη στιγμή της ζημίας',
            },
        })
        expect(parsed.termBasis).toBe('single_transit')
        expect(parsed.transit?.mode).toBe('road')
    })

    it('carries a non-EUR premium currency', () => {
        const parsed = AcordDataSchema.parse({
            policy: { premium: { amount: 710.44 }, currency: 'USD' },
            termBasis: 'short_period',
        })
        expect(parsed.policy?.currency).toBe('USD')
    })

    it('rejects a currency that is not a three-letter code', () => {
        expect(() => AcordDataSchema.parse({ policy: { currency: 'euros' } })).toThrow()
    })
})

describe('AcordData v3 — marine vessel section', () => {
    it('holds the vessel facts and the berthing condition together', () => {
        const parsed = AcordDataSchema.parse({
            marineVessel: {
                name: 'STADARD',
                vesselType: 'yacht',
                flag: 'Malta',
                registryNumber: 'VALLETTA 21038',
                hullValue: 717207,
                currency: 'EUR',
                berthingRequirement: 'Οργανωμένες μαρίνες ή λιμάνια εντός Ελλάδος· εξαιρείται ο μόνιμος ελλιμενισμός με αρόδο',
                skipperLicenceRequired: true,
            },
        })
        expect(parsed.marineVessel?.hullValue).toBe(717207)
        expect(parsed.marineVessel?.skipperLicenceRequired).toBe(true)
    })
})
