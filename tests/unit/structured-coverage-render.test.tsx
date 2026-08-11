import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { PolicyConditionsCard } from '@/components/wallet/coverage-details/PolicyConditionsCard'
import { StructuredCoverageTable } from '@/components/wallet/coverage-details/StructuredCoverageTable'
import { AcordDataSchema } from '@/lib/schemas/acord-data'
import type { AcordData } from '@/types/domain'

/**
 * The two branch-agnostic panels, rendering the shapes v2 could not hold.
 *
 * Before these existed, a policy on a line with no hand-written panel — boat,
 * cyber, liability, and every new specialty line — showed nothing at all under
 * "What's covered" beyond a free-text list. These render for EVERY branch, which
 * is why they also improve motor, health and home.
 *
 * The fixture is the yacht schedule from the reference corpus, parsed through
 * the real schema rather than hand-built, so a schema change that broke the
 * shape would break this test too.
 */
const YACHT = AcordDataSchema.parse({
    deductibleResolution: 'largest_applies',
    coverages: [
        {
            name: 'Ίδιες Ζημιές Σκάφους',
            limits: [{ basis: 'per_event', amount: 717207, currency: 'EUR' }],
            deductibles: [
                { basis: 'per_event', amount: 10000, currency: 'EUR', appliesTo: 'κάθε ζημία' },
                { basis: 'per_event', amount: 20000, currency: 'EUR', appliesTo: 'μηχανικές βλάβες' },
            ],
        },
        {
            name: 'Αστική Ευθύνη προς Τρίτους',
            limits: [
                { basis: 'per_person', amount: 150000, currency: 'EUR' },
                { basis: 'per_event', amount: 700000, currency: 'EUR' },
                { basis: 'per_period_aggregate', amount: 2100000, currency: 'EUR' },
            ],
        },
        {
            name: 'Σεισμός',
            status: 'optional_not_taken',
            limits: [{ basis: 'per_event', amount: 46000, currency: 'EUR' }],
        },
        {
            name: 'Αεροδιακομιδή',
            limits: [{ basis: 'per_event', unlimited: true }],
        },
    ],
    conditions: [
        {
            kind: 'maintenance',
            text: 'Να διενεργείται η ετήσια συντήρηση σκάφους και μηχανής',
            recurrence: 'annual',
            breachEffect: 'voids_cover',
        },
        {
            kind: 'condition_precedent',
            text: 'Να υπάρχει σε ισχύ ασφαλιστήριο Περιουσίας για τη διεύθυνση κινδύνου',
            dependsOnOtherPolicy: 'home',
            breachEffect: 'voids_cover',
        },
    ],
}) as unknown as AcordData

describe('StructuredCoverageTable renders the towers a string could not hold', () => {
    it('shows all three liability towers, each labelled by its basis', () => {
        render(<StructuredCoverageTable acordData={YACHT} language="el" />)
        expect(screen.getByText(/ανά πρόσωπο/)).toBeTruthy()
        // getAllByText: several coverages carry a per-event limit, which is the
        // point — the bases repeat across sections and stay distinguishable.
        expect(screen.getAllByText(/ανά συμβάν/).length).toBeGreaterThan(1)
        expect(screen.getByText(/συνολικά για την περίοδο/)).toBeTruthy()
    })

    it('shows each rung of the deductible ladder with what it applies to', () => {
        render(<StructuredCoverageTable acordData={YACHT} language="el" />)
        expect(screen.getByText(/μηχανικές βλάβες/)).toBeTruthy()
        // And the rule that decides which one bites.
        expect(screen.getByText(/η μεγαλύτερη μεμονωμένη/)).toBeTruthy()
    })

    it('marks a cover that was offered and NOT taken', () => {
        // The quiet cause of "but I have all-risks": earthquake is routinely
        // optional on a Greek fine-art or property schedule.
        render(<StructuredCoverageTable acordData={YACHT} language="el" />)
        expect(screen.getByText(/δεν επιλέχθηκε/)).toBeTruthy()
    })

    it('renders an unlimited benefit as unlimited, not as a number', () => {
        render(<StructuredCoverageTable acordData={YACHT} language="el" />)
        expect(screen.getByText('Απεριόριστο')).toBeTruthy()
    })

    it('renders in English too', () => {
        render(<StructuredCoverageTable acordData={YACHT} language="en" />)
        expect(screen.getByText(/per person/)).toBeTruthy()
        expect(screen.getByText(/total for the period/)).toBeTruthy()
    })

    it('renders nothing when there is no structured data to show', () => {
        // A v2 policy already says everything this table would, in its free-text
        // list. An empty grid beside it would be noise.
        const v2 = AcordDataSchema.parse({
            coverages: [{ name: 'Νοσοκομειακή', limit: '1.500.000 € ανά έτος' }],
        }) as unknown as AcordData
        const { container } = render(<StructuredCoverageTable acordData={v2} language="el" />)
        expect(container.firstChild).toBeNull()
    })
})

describe('PolicyConditionsCard renders what the policy demands of its holder', () => {
    it('states what breaching a condition does', () => {
        render(<PolicyConditionsCard acordData={YACHT} language="el" />)
        expect(screen.getAllByText(/μπορεί να αναιρέσει την κάλυψη/).length).toBeGreaterThan(0)
    })

    it('shows the recurrence, because a yearly obligation is a diary entry', () => {
        render(<PolicyConditionsCard acordData={YACHT} language="el" />)
        expect(screen.getByText('Κάθε χρόνο')).toBeTruthy()
    })

    it('names the other policy a condition depends on, in the reader’s language', () => {
        // Invisible from inside the policy that carries it: nothing tells the
        // customer that letting the property cover lapse undermines this one.
        render(<PolicyConditionsCard acordData={YACHT} language="el" />)
        expect(screen.getByText(/Κατοικία/)).toBeTruthy()
    })

    it('renders nothing when the policy states no conditions', () => {
        const bare = AcordDataSchema.parse({}) as unknown as AcordData
        const { container } = render(<PolicyConditionsCard acordData={bare} language="el" />)
        expect(container.firstChild).toBeNull()
    })
})
