/**
 * Domain Interfaces
 * 
 * Clean domain types for API responses and client-side use
 * Separate from Prisma types to maintain clean boundaries
 */

import type {
    LineOfBusiness,
    PolicyStatus,
    GapSeverity,
    GapStatus,
    UserRole,
    OpportunityStatus,
    DocumentSource,
    Language,
    Currency,
    RelationshipStatus,
    ActivationStatus
} from './enums'

// ============================================================================
// User Types
// ============================================================================

export interface UserSummary {
    id: string
    name: string
    email: string
    image?: string
}

export interface UserProfile extends UserSummary {
    phone?: string
    preferredLanguage: Language
    roles: UserRole[]
    createdAt: string
}

// ============================================================================
// Policy Types
// ============================================================================

export interface PolicyDocumentView {
    id: string
    fileName: string
    fileSize: number
    uploadedAt: string
    source: DocumentSource
}

export interface PolicyView {
    id: string
    policyNumber: string
    insurerName: string
    insurerLogo?: string
    lineOfBusiness: LineOfBusiness
    status: PolicyStatus
    startDate: string // ISO string
    endDate: string
    premiumAmount?: number
    premiumCurrency: Currency
    coverageSummary?: string
    lastUpdated: string
    documents: PolicyDocumentView[]
    gapCount?: number
}

export interface AcordData {
    acordStandard: string
    policy?: {
        insurer?: string
        number?: string
        type?: string
        premium?: {
            amount?: number
            currency?: string
        }
        effectiveDate?: string
        expirationDate?: string
    }
    vehicle?: {
        plateNumber?: string
        make?: string
        model?: string
        year?: number
    }
    coverages?: Array<{
        name: string
        limit?: string
        deductible?: string
        explanation?: {
            en: string
            el: string
        }
    }>
}

export interface PolicyDetailView extends PolicyView {
    owner: UserSummary
    sharedWith: UserSummary[]
    gaps: GapInstanceView[]
    acordData?: AcordData
}

// ============================================================================
// Gap Types
// ============================================================================

export interface GapDefinitionView {
    id: string
    slug: string
    name: string
    title: string
    description: string
    lineOfBusiness: LineOfBusiness
    severity: GapSeverity
}

export interface GapInstanceView {
    id: string
    severity: GapSeverity
    status: GapStatus
    title: string
    description: string
    explanation: string
    explanationEl: string
    suggestion: string
    suggestionEl: string
    detectedAt: string
    resolvedAt?: string
    definition: GapDefinitionView
}

export interface GapInstanceWithPolicy extends GapInstanceView {
    policy: {
        id: string
        policyNumber: string
        insurerName: string
        lineOfBusiness: LineOfBusiness
    }
}

// ============================================================================
// Customer/Agent Types
// ============================================================================

export interface AgentView extends UserSummary {
    agencyName?: string
    licenseNumber?: string
    verificationStatus: 'pending' | 'verified' | 'rejected'
}

export interface CustomerView {
    id: string
    user: UserSummary
    status: RelationshipStatus
    activationStatus: ActivationStatus
    policyCount: number
    gapCount: number
    lastInteraction?: string
    createdAt: string
}

export interface CustomerDetailView extends CustomerView {
    policies: PolicyView[]
    gaps: GapInstanceWithPolicy[]
    opportunities: OpportunityView[]
}

// ============================================================================
// Opportunity Types
// ============================================================================

export interface OpportunityView {
    id: string
    status: OpportunityStatus
    nextActionAt?: string
    notes?: string
    createdAt: string
    updatedAt: string
    customer: UserSummary
    policy?: {
        id: string
        policyNumber: string
        insurerName: string
    }
    gap?: {
        id: string
        title: string
        severity: GapSeverity
    }
}

// ============================================================================
// Notification Types
// ============================================================================

export interface NotificationView {
    id: string
    eventType: string
    title: string
    message: string
    createdAt: string
    sentAt?: string
    read: boolean
    relatedObject?: {
        type: string
        id: string
    }
}

// ============================================================================
// Dashboard/Stats Types
// ============================================================================

export interface PolicyholderStats {
    totalPolicies: number
    activePolicies: number
    expiringSoon: number
    totalGaps: number
    criticalGaps: number
    highGaps: number
}

export interface AgentStats {
    totalCustomers: number
    activeCustomers: number
    totalPolicies: number
    openOpportunities: number
    totalGaps: number
    criticalGaps: number
}

export interface DashboardActivity {
    id: string
    type: 'policy_created' | 'policy_shared' | 'gap_detected' | 'opportunity_created'
    description: string
    timestamp: string
    relatedObject?: {
        type: string
        id: string
    }
}

// ============================================================================
// Invite Types
// ============================================================================

export interface InviteView {
    id: string
    email: string
    type: string
    expiresAt: string
    createdAt: string
    inviter: UserSummary
}
