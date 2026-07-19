import { describe, it, expect } from 'vitest'

import {
    filterByValidity,
    partitionOffersForUser,
    type PartnerOfferView,
} from '@/lib/partner-offers/matching'

function offer(overrides: Partial<PartnerOfferView> = {}): PartnerOfferView {
    return {
        id: 'o1',
        slug: 'free-checkup',
        vendorSlug: 'affidea',
        vendorName: 'Affidea',
        vendorCategory: 'health',
        vendorLogoUrl: null,
        vendorWebsiteUrl: null,
        title: { el: 'Δωρεάν check-up', en: 'Free check-up' },
        description: { el: 'Ετήσιο', en: 'Annual' },
        offerType: 'free_service',
        redemptionMethod: 'link',
        redemptionUrl: 'https://example.com',
        redemptionCode: null,
        redemptionPhone: null,
        termsUrl: null,
        includedInTiers: ['pro'],
        profileTags: [],
        linesOfBusiness: [],
        validFrom: null,
        validUntil: null,
        sortOrder: 0,
        ...overrides,
    }
}

const NOW = new Date('2026-07-19T12:00:00Z')

describe('filterByValidity', () => {
    it('keeps unbounded offers and drops not-yet-started / expired ones', () => {
        const offers = [
            offer({ id: 'open' }),
            offer({ id: 'future', validFrom: '2026-08-01T00:00:00Z' }),
            offer({ id: 'expired', validUntil: '2026-07-01T00:00:00Z' }),
            offer({
                id: 'window',
                validFrom: '2026-07-01T00:00:00Z',
                validUntil: '2026-08-01T00:00:00Z',
            }),
        ]
        expect(filterByValidity(offers, NOW).map((o) => o.id)).toEqual(['open', 'window'])
    })
})

describe('partitionOffersForUser', () => {
    it('splits by tier membership', () => {
        const offers = [
            offer({ id: 'pro-only', includedInTiers: ['pro'] }),
            offer({ id: 'starter-too', slug: 'b', includedInTiers: ['plus', 'pro'] }),
        ]
        const free = partitionOffersForUser(offers, 'free', [])
        expect(free.unlocked).toHaveLength(0)
        expect(free.locked).toHaveLength(2)

        const starter = partitionOffersForUser(offers, 'plus', [])
        expect(starter.unlocked.map((o) => o.id)).toEqual(['starter-too'])
        expect(starter.locked.map((o) => o.id)).toEqual(['pro-only'])

        const plus = partitionOffersForUser(offers, 'pro', [])
        expect(plus.unlocked).toHaveLength(2)
        expect(plus.locked).toHaveLength(0)
    })

    it('ranks by profile-tag relevance, then sortOrder', () => {
        const offers = [
            offer({ id: 'generic', slug: 'a', sortOrder: 0, profileTags: [] }),
            offer({ id: 'pet', slug: 'b', sortOrder: 5, profileTags: ['has_pets'] }),
            offer({
                id: 'pet-home',
                slug: 'c',
                sortOrder: 9,
                profileTags: ['has_pets', 'homeowner'],
            }),
        ]
        const result = partitionOffersForUser(offers, 'pro', ['has_pets', 'homeowner'])
        expect(result.unlocked.map((o) => o.id)).toEqual(['pet-home', 'pet', 'generic'])
    })

    it('non-matching tags do not exclude an offer — targeting only ranks', () => {
        const offers = [offer({ id: 'pet', profileTags: ['has_pets'] })]
        const result = partitionOffersForUser(offers, 'pro', [])
        expect(result.unlocked).toHaveLength(1)
    })

    it('empty catalog partitions to empty (honesty rule end-state)', () => {
        const result = partitionOffersForUser([], 'pro', ['homeowner'])
        expect(result.unlocked).toEqual([])
        expect(result.locked).toEqual([])
    })
})
