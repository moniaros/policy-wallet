import { describe, it, expect } from 'vitest'

import {
    InsurerInputSchema,
    applyAdminEditsToConfidence,
    parseInsurerCreateForm,
    parseInsurerForm,
} from '@/lib/insurers/validation'
import dataset from '@/prisma/greek-insurers.json'

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

function validInsurer(overrides: Record<string, string | string[]> = {}) {
    return formOf({
        name: 'Εθνική Ασφαλιστική',
        nameEn: 'Ethniki Insurance',
        legalNameEl: 'Η ΕΘΝΙΚΗ Α.Ε.Ε.Γ.Α.',
        status: 'active',
        groupParent: 'Piraeus Financial Holdings',
        website: 'https://www.ethniki-asfalistiki.gr',
        contactEmail: 'contact@ethnikiasfalistiki.gr',
        callCenter: '+30 210 909 9000',
        claimsPhone: '18189',
        roadsidePhone: '+30 210 909 9999',
        hqStreet: 'Λ. Συγγρού 103-105',
        hqCity: 'Αθήνα',
        hqPostalCode: '117 45',
        hqCountry: 'GR',
        roadsideAssistanceProvider: 'Mondial Assistance (Allianz Partners)',
        linesOfBusiness: ['motor', 'health', 'life'],
        notes: 'Market leader by GWP.',
        isActive: 'on',
        ...overrides,
    })
}

describe('parseInsurerForm', () => {
    it('accepts a full valid form with Greek values intact', () => {
        const insurer = parseInsurerForm(validInsurer())
        expect(insurer.name).toBe('Εθνική Ασφαλιστική')
        expect(insurer.claimsPhone).toBe('18189')
        expect(insurer.hqAddress).toEqual({
            street: 'Λ. Συγγρού 103-105',
            city: 'Αθήνα',
            postalCode: '117 45',
            country: 'GR',
        })
        expect(insurer.linesOfBusiness).toEqual(['motor', 'health', 'life'])
        expect(insurer.isActive).toBe(true)
        expect(insurer.logoUrl).toBeNull()
        expect(insurer.paymentGatewayUrl).toBeNull()
    })

    it('accepts the awkward real-world values the dataset carries', () => {
        const insurer = parseInsurerForm(
            validInsurer({
                roadsidePhone: '1158 (from Greece) / +30 210 946 1333 (from abroad)',
                website: 'http://2alsyn.gr', // http-only site — must not be rejected
            })
        )
        expect(insurer.roadsidePhone).toContain('from abroad')
        expect(insurer.website).toBe('http://2alsyn.gr')
    })

    it('returns a null hqAddress when all four address inputs are empty', () => {
        const insurer = parseInsurerForm(
            validInsurer({ hqStreet: '', hqCity: '', hqPostalCode: '', hqCountry: '' })
        )
        expect(insurer.hqAddress).toBeNull()
    })

    it('rejects unknown lines of business, unknown status, bad email and short names', () => {
        expect(() => parseInsurerForm(validInsurer({ linesOfBusiness: ['spaceships'] }))).toThrow(/linesOfBusiness/i)
        expect(() => parseInsurerForm(validInsurer({ status: 'zombie' }))).toThrow(/status/i)
        expect(() => parseInsurerForm(validInsurer({ contactEmail: 'not-an-email' }))).toThrow(/contactEmail/i)
        expect(() => parseInsurerForm(validInsurer({ name: 'X' }))).toThrow(/name/i)
    })
})

describe('parseInsurerCreateForm', () => {
    it('parses the minimal create form', () => {
        const input = parseInsurerCreateForm(
            formOf({ name: 'Νέα Ασφαλιστική', nameEn: 'New Insurance', isActive: 'on' })
        )
        expect(input).toEqual({ name: 'Νέα Ασφαλιστική', nameEn: 'New Insurance', isActive: true })
    })

    it('treats a missing checkbox as inactive and missing nameEn as null', () => {
        const input = parseInsurerCreateForm(formOf({ name: 'Νέα Ασφαλιστική' }))
        expect(input.isActive).toBe(false)
        expect(input.nameEn).toBeNull()
    })
})

describe('applyAdminEditsToConfidence', () => {
    const existing = { callCenter: 'stale', website: 'verified_2026', hqAddress: 'stale' }

    it('stamps admin_edited only onto fields whose value actually changed', () => {
        const next = applyAdminEditsToConfidence(
            existing,
            { callCenter: '+30 210 111 1111', website: 'https://a.gr' },
            { callCenter: '+30 210 222 2222', website: 'https://a.gr' }
        )
        expect(next).toEqual({ callCenter: 'admin_edited', website: 'verified_2026', hqAddress: 'stale' })
    })

    it('treats a reordered linesOfBusiness array as unchanged', () => {
        const next = applyAdminEditsToConfidence(
            { linesOfBusiness: 'stale' },
            { linesOfBusiness: ['motor', 'health'] },
            { linesOfBusiness: ['health', 'motor'] }
        )
        expect(next).toEqual({ linesOfBusiness: 'stale' })
    })

    it('deep-compares hqAddress and flags real changes', () => {
        const next = applyAdminEditsToConfidence(
            existing,
            { hqAddress: { street: 'A', city: 'Αθήνα', postalCode: '111 11', country: 'GR' } },
            { hqAddress: { street: 'B', city: 'Αθήνα', postalCode: '111 11', country: 'GR' } }
        )
        expect(next?.hqAddress).toBe('admin_edited')
    })

    it('leaves admin-created rows (no confidence map) without one, even on change', () => {
        expect(applyAdminEditsToConfidence(null, { name: 'A' }, { name: 'B' })).toBeNull()
    })
})

describe('dataset conformance — every imported record is re-savable from the admin form', () => {
    const imported = dataset.insurers.filter((record) => record.status !== 'merged')

    it('covers 27 of the 29 records', () => {
        expect(dataset.insurers).toHaveLength(29)
        expect(imported).toHaveLength(27)
    })

    it.each(imported.map((record) => [record.id, record] as const))(
        '%s parses under InsurerInputSchema',
        (_id, record) => {
            const address = record.hq_address
            const result = InsurerInputSchema.safeParse({
                name: record.name_el,
                nameEn: record.name_en,
                legalNameEl: record.legal_name_el,
                status: record.status,
                groupParent: record.group_parent,
                logoUrl: null,
                website: record.website,
                callCenter: record.call_center,
                claimsPhone: record.claims_phone,
                roadsidePhone: record.roadside_phone,
                paymentGatewayUrl: record.payment_gateway_url,
                contactEmail: record.contact_email,
                hqAddress: address
                    ? {
                          street: address.street ?? null,
                          city: address.city ?? null,
                          postalCode: address.postal_code ?? null,
                          country: address.country ?? null,
                      }
                    : null,
                roadsideAssistanceProvider: record.roadside_assistance_provider,
                linesOfBusiness: record.lines_of_business,
                notes: record.notes,
                isActive: true,
            })
            if (!result.success) {
                throw new Error(`${record.id}: ${result.error.issues[0].path.join('.')} — ${result.error.issues[0].message}`)
            }
        }
    )
})
