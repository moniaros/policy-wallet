import { describe, it, expect } from 'vitest'

import {
    parseOfferForm,
    parseVendorForm,
} from '@/lib/partner-offers/validation'

function formOf(entries: Record<string, string | string[]>) {
    const map = new Map<string, string[]>()
    for (const [key, value] of Object.entries(entries)) {
        map.set(key, Array.isArray(value) ? value : [value])
    }
    return {
        get: (name: string) => map.get(name)?.[0] ?? null,
        getAll: (name: string) => map.get(name) ?? [],
    }
}

function validVendor(overrides: Record<string, string | string[]> = {}) {
    return formOf({
        slug: 'affidea',
        name: 'Affidea',
        descriptionEl: 'Διαγνωστικά κέντρα',
        descriptionEn: 'Diagnostics centers',
        websiteUrl: 'https://affidea.gr',
        category: 'health',
        isActive: 'on',
        sortOrder: '0',
        ...overrides,
    })
}

function validOffer(overrides: Record<string, string | string[]> = {}) {
    return formOf({
        slug: 'free-checkup',
        titleEl: 'Δωρεάν check-up',
        titleEn: 'Free check-up',
        descriptionEl: 'Ετήσιο βασικό check-up',
        descriptionEn: 'Annual basic check-up',
        offerType: 'free_service',
        redemptionMethod: 'link',
        redemptionUrl: 'https://affidea.gr/redeem',
        includedInTiers: ['pro'],
        profileTags: ['has_dependents'],
        linesOfBusiness: ['health'],
        sortOrder: '0',
        ...overrides,
    })
}

describe('parseVendorForm', () => {
    it('accepts a valid vendor', () => {
        const vendor = parseVendorForm(validVendor())
        expect(vendor.slug).toBe('affidea')
        expect(vendor.isActive).toBe(true)
        expect(vendor.logoUrl).toBeNull()
    })

    it('rejects bad slugs and non-https URLs', () => {
        expect(() => parseVendorForm(validVendor({ slug: 'Bad Slug!' }))).toThrow(/slug/i)
        expect(() => parseVendorForm(validVendor({ websiteUrl: 'http://insecure.gr' }))).toThrow(
            /websiteUrl/i
        )
    })

    it('rejects an unknown category', () => {
        expect(() => parseVendorForm(validVendor({ category: 'crypto' }))).toThrow(/category/i)
    })

    it('unchecked isActive parses as false (safe default)', () => {
        const vendor = parseVendorForm(validVendor({ isActive: [] }))
        expect(vendor.isActive).toBe(false)
    })
})

describe('parseOfferForm', () => {
    it('accepts a valid link offer', () => {
        const offer = parseOfferForm(validOffer())
        expect(offer.redemptionMethod).toBe('link')
        expect(offer.includedInTiers).toEqual(['pro'])
    })

    it('enforces redemption-method consistency', () => {
        expect(() => parseOfferForm(validOffer({ redemptionUrl: [] }))).toThrow(/redemptionUrl/i)
        expect(() =>
            parseOfferForm(validOffer({ redemptionMethod: 'code', redemptionUrl: [] }))
        ).toThrow(/redemptionCode/i)
        const codeOffer = parseOfferForm(
            validOffer({ redemptionMethod: 'code', redemptionCode: 'PW-2026', redemptionUrl: [] })
        )
        expect(codeOffer.redemptionCode).toBe('PW-2026')
        expect(() =>
            parseOfferForm(validOffer({ redemptionMethod: 'phone', redemptionUrl: [] }))
        ).toThrow(/redemptionPhone/i)
    })

    it('requires at least one tier and rejects unknown tier keys', () => {
        expect(() => parseOfferForm(validOffer({ includedInTiers: [] }))).toThrow(
            /includedInTiers/i
        )
        expect(() => parseOfferForm(validOffer({ includedInTiers: ['platinum'] }))).toThrow(
            /includedInTiers/i
        )
    })

    it('rejects profile tags outside the deriveProfileTags vocabulary', () => {
        expect(() => parseOfferForm(validOffer({ profileTags: ['rich'] }))).toThrow(
            /profileTags/i
        )
    })

    it('rejects lines of business outside the taxonomy', () => {
        expect(() => parseOfferForm(validOffer({ linesOfBusiness: ['spaceships'] }))).toThrow(
            /linesOfBusiness/i
        )
    })

    it('rejects an inverted validity window', () => {
        expect(() =>
            parseOfferForm(validOffer({ validFrom: '2026-08-01', validUntil: '2026-07-01' }))
        ).toThrow(/validUntil/i)
    })

    it('empty targeting arrays are allowed (offer for everyone)', () => {
        const offer = parseOfferForm(validOffer({ profileTags: [], linesOfBusiness: [] }))
        expect(offer.profileTags).toEqual([])
        expect(offer.linesOfBusiness).toEqual([])
    })
})
