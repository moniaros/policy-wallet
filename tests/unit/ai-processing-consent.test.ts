import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the Prisma singleton so the consent helper can be exercised without a DB.
const mockUserFindUnique = vi.fn()
const mockUserUpdate = vi.fn()
const mockConsentAuditCreate = vi.fn()

vi.mock('@/lib/db', () => ({
    db: {
        user: {
            findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
            update: (...a: unknown[]) => mockUserUpdate(...a),
        },
        consentAudit: {
            create: (...a: unknown[]) => mockConsentAuditCreate(...a),
        },
    },
}))

import {
    userHasAiProcessingConsent,
    recordAiProcessingConsent,
    AI_PROCESSING_CONSENT_VERSION,
} from '@/lib/compliance/ai-processing-consent'

describe('AI-processing consent gate (GDPR Art. 9)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('reports NO consent when the user has never accepted', async () => {
        mockUserFindUnique.mockResolvedValue({ aiProcessingConsentVersion: null })
        await expect(userHasAiProcessingConsent('user-1')).resolves.toBe(false)
        expect(mockUserFindUnique).toHaveBeenCalledWith({
            where: { id: 'user-1' },
            select: { aiProcessingConsentVersion: true },
        })
    })

    it('reports NO consent when the user row is missing', async () => {
        mockUserFindUnique.mockResolvedValue(null)
        await expect(userHasAiProcessingConsent('ghost')).resolves.toBe(false)
    })

    it('reports consent once a version is on record', async () => {
        mockUserFindUnique.mockResolvedValue({ aiProcessingConsentVersion: '2026-03' })
        await expect(userHasAiProcessingConsent('user-2')).resolves.toBe(true)
    })

    it('records consent: writes an audit row and stamps the user version', async () => {
        mockConsentAuditCreate.mockResolvedValue({})
        mockUserUpdate.mockResolvedValue({})

        await recordAiProcessingConsent({
            userId: 'user-3',
            locale: 'el',
            source: 'wallet-upload',
            ipAddress: '1.2.3.4',
            userAgent: 'jest',
        })

        expect(mockConsentAuditCreate).toHaveBeenCalledTimes(1)
        const auditArg = mockConsentAuditCreate.mock.calls[0][0]
        expect(auditArg.data).toMatchObject({
            userId: 'user-3',
            consentType: 'ai_processing',
            policyVersion: AI_PROCESSING_CONSENT_VERSION,
            locale: 'el',
            source: 'wallet-upload',
            accepted: true,
            ipAddress: '1.2.3.4',
            userAgent: 'jest',
        })

        expect(mockUserUpdate).toHaveBeenCalledTimes(1)
        const updateArg = mockUserUpdate.mock.calls[0][0]
        expect(updateArg.where).toEqual({ id: 'user-3' })
        expect(updateArg.data).toMatchObject({
            aiProcessingConsentVersion: AI_PROCESSING_CONSENT_VERSION,
            consentLocale: 'el',
        })
    })

    it('defaults locale to el and source to web when omitted', async () => {
        mockConsentAuditCreate.mockResolvedValue({})
        mockUserUpdate.mockResolvedValue({})

        await recordAiProcessingConsent({ userId: 'user-4' })

        const auditArg = mockConsentAuditCreate.mock.calls[0][0]
        expect(auditArg.data).toMatchObject({ locale: 'el', source: 'web' })
    })
})
