import { Policy, ProtectionProfile__EXT, PartyAttributes, ShareLink__EXT } from '@/components/agent-rise/types'

// Mock Customer: John Doe (Organization - Family Office)
export const mockParty: PartyAttributes = {
    id: 'pty_123456789',
    type: 'Organization', // Testing Organization branch
    displayName: 'Doe Family Office Ltd.',
    primaryEmail: 'john.doe@familyoffice.com',
    gdprConsentStatus: 'granted',
    communications: [
        { id: 'c1', type: 'email', value: 'john.doe@familyoffice.com', isPrimary: true, lastValidatedAt: '2024-01-15T09:30:00Z' },
        { id: 'c2', type: 'mobile', value: '+30 691 234 5678', isPrimary: false, lastValidatedAt: '2023-11-20T14:15:00Z' },
        { id: 'c3', type: 'phone', value: '+30 210 123 4567', isPrimary: false, lastValidatedAt: '2023-10-05T11:00:00Z' }
    ],
    auditLog: [
        { id: 'l1', action: 'Login Success', actor: 'John Doe', timestamp: '2024-02-03T08:15:00Z' },
        { id: 'l2', action: 'Policy Download (POL-888)', actor: 'Agent Admin', timestamp: '2024-02-02T16:45:00Z' },
        { id: 'l3', action: 'Address Update', actor: 'John Doe', timestamp: '2024-01-28T10:30:00Z' }
    ],
    affiliatedPersons: [
        { id: 'p1', name: 'John Doe', role: 'Director' },
        { id: 'p2', name: 'Jane Doe', role: 'Beneficiary' }
    ]
}

// Mock Policies
export const mockPolicies: Policy[] = [
    {
        id: 'pol_1',
        policyNumber: 'MOT-2024-888',
        insurerRef: { id: 'ins_1', name: 'Allianz', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Allianz_logo.svg/2048px-Allianz_logo.svg.png' },
        premium: { gross: { amount: 1250, currencyCode: 'EUR' } },
        status: 'active',
        lineOfBusiness: 'Motor Fleet',
        effectiveDate: '2024-01-01',
        expirationDate: '2025-01-01',
        _link: '/policies/pol_1'
    },
    {
        id: 'pol_2',
        policyNumber: 'PROP-2023-456',
        insurerRef: { id: 'ins_2', name: 'AXA', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/AXA_Logo.svg/1200px-AXA_Logo.svg.png' },
        premium: { gross: { amount: 3400, currencyCode: 'EUR' } },
        status: 'renewal_window', // Needs attention
        renewalDate: '2024-02-14', // ~11 days away
        lineOfBusiness: 'Commercial Property',
        effectiveDate: '2023-02-14',
        expirationDate: '2024-02-14',
        _link: '/policies/pol_2'
    },
    {
        id: 'pol_3',
        policyNumber: 'LIAB-2022-999',
        insurerRef: { id: 'ins_3', name: 'Generali', logoUrl: '' },
        premium: { gross: { amount: 850, currencyCode: 'EUR' } },
        status: 'lapsed',
        lineOfBusiness: 'Public Liability',
        effectiveDate: '2022-01-01',
        expirationDate: '2023-01-01',
        _link: '/policies/pol_3'
    },
    {
        id: 'pol_4',
        policyNumber: 'CYBER-2024-001',
        insurerRef: { id: 'ins_4', name: 'Chubb', logoUrl: '' },
        premium: { gross: { amount: 5600, currencyCode: 'USD' } },
        status: 'active',
        lineOfBusiness: 'Cyber Risk',
        effectiveDate: '2024-01-01',
        expirationDate: '2025-01-01',
        _link: '/policies/pol_4'
    }
]

// Mock Protection Profile (Underinsured)
export const mockProfile: ProtectionProfile__EXT = {
    id: 'prof_1',
    policyId: 'pol_2',
    protectionScore: 0.72, // Triggers Red Alert
    gaps: [
        {
            id: 'gap_1',
            coverageType: 'Building Structure',
            currentLimit: 500000,
            recommendedLimit: 850000,
            gapSeverity: 'critical'
        },
        {
            id: 'gap_2',
            coverageType: 'Business Interruption',
            currentLimit: 12, // months
            recommendedLimit: 24,
            gapSeverity: 'moderate'
        },
        {
            id: 'gap_3',
            coverageType: 'General Liability',
            currentLimit: 1000000,
            recommendedLimit: 1000000,
            gapSeverity: 'low'
        }
    ],
    aiInsights: {
        generatedAt: '2024-02-03T10:00:00Z',
        automatedAnalysis: `**Analysis:** The property valuation has increased by **40%** due to recent market shifts in the chaotic zone. Current coverage leaves a **€350k exposure**. \n\n**Recommendation:** Trigger an immediate endorsement quote for Building Structure limit increase.`,
        agentCommentary: `I discussed this with the client last week. They are waiting for the updated appraisal report before committing to the premium hike.`
    }
}

// Mock Share Links
export const mockShareLinks: ShareLink__EXT[] = [
    {
        uuid: 'link_a1b2c3d4',
        policyId: 'pol_2',
        scope: { schedule: true, endorsements: false, fullVault: false },
        security: { expiresAt: '2024-02-10', oneTimeView: true, requiresOtp: true },
        metrics: { accessCount: 3, lastAccessedByIP: '192.168.1.55', lastAccessedAt: '2024-02-03T09:00:00Z' },
        status: 'active',
        createdAt: '2024-02-01T10:00:00Z'
    },
    {
        uuid: 'link_x9y8z7',
        policyId: 'pol_2',
        scope: { schedule: true, endorsements: true, fullVault: true, claimsHistory: true },
        security: { expiresAt: '2024-03-01', oneTimeView: false, requiresOtp: false },
        metrics: { accessCount: 12, lastAccessedByIP: '10.0.0.4', lastAccessedAt: '2024-02-02T15:30:00Z' },
        status: 'active',
        createdAt: '2024-01-15T14:30:00Z'
    }
]
