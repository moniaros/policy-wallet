export type CurrencyAmount = {
    amount: number
    currencyCode: 'EUR' | 'USD'
}

export type PolicyStatus = 'active' | 'renewal_window' | 'lapsed' | 'cancelled' | 'quote'

export interface Policy {
    id: string
    policyNumber: string
    insurerRef: {
        id: string
        logoUrl: string
        name: string
    }
    premium: {
        gross: CurrencyAmount
    }
    status: PolicyStatus
    effectiveDate: string
    expirationDate: string
    lineOfBusiness: string
    renewalDate?: string // Specific calculation for renewal window
    _link: string // Self link
}

export interface ProtectionProfile__EXT {
    id: string
    policyId: string
    protectionScore: number // 0.0 to 1.0
    gaps: Array<{
        id: string
        coverageType: string
        currentLimit: number
        recommendedLimit: number
        gapSeverity: 'critical' | 'moderate' | 'low'
    }>
    aiInsights: {
        generatedAt: string
        automatedAnalysis: string // Markdown
        agentCommentary?: string // Markdown
    }
}

export type CommunicationType = 'email' | 'phone' | 'mobile' | 'postal'

export interface Communication {
    id: string
    type: CommunicationType
    value: string
    isPrimary: boolean
    lastValidatedAt: string // ISO Date
}

export interface PartyAttributes {
    id: string
    type: 'Person' | 'Organization'
    displayName: string
    primaryEmail: string
    gdprConsentStatus: 'granted' | 'revoked' | 'pending'
    communications: Communication[]
    auditLog: Array<{
        id: string
        timestamp: string
        action: string
        actor: string
    }>
    // For Organization
    affiliatedPersons?: Array<{
        id: string
        name: string
        role: string
    }>
    // For Person
    householdMembers?: Array<{
        id: string
        name: string
        relationship: string
    }>
}

export interface ShareLink__EXT {
    uuid: string
    policyId: string
    scope: {
        schedule: boolean
        endorsements: boolean
        fullVault: boolean
        claimsHistory?: boolean
    }
    security: {
        expiresAt: string
        oneTimeView: boolean
        requiresOtp: boolean
    }
    metrics: {
        accessCount: number
        lastAccessedByIP?: string
        lastAccessedAt?: string
    }
    status: 'active' | 'revoked' | 'expired'
    createdAt: string
}
