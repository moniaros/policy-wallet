export interface PolicyDocument {
    id: string
    fileName: string
    uploadedAt: string
    uploadedBy: 'policyholder' | 'agent'
}

export interface SharedAgent {
    agentId: string
    agentName: string
}

export interface Policy {
    id: string
    policyNumber: string
    insurerName: string
    insurerLogo: string | null
    lineOfBusiness: 'motor' | 'health' | 'home' | 'life' | 'travel' | 'liability' | 'pet' | 'professional' | 'other' | 'breakdown' | 'legal_expenses' | 'income_protection' | 'gadget' | 'bicycle' | 'business' | 'cyber' | 'motorbike' | 'public_liability' | 'renters'
    status: 'active' | 'expiring_soon' | 'incomplete' | 'action_needed' | 'analyzing' | 'cancelled'
    startDate: string | null
    endDate: string | null
    lastUpdated: string
    sharedWithAgents: SharedAgent[]
    coverageHighlights: string[]
    documents: PolicyDocument[]
    userId?: string
    acordData?: any
    verified?: boolean
    premiumAmount?: number
    premiumCurrency?: string
    aiInsights?: {
        exclusions: string[]
        premiumBenchmark?: {
            current: number
            localAverage: number
            savingsPotential: number
        }
    }
    insuredItem?: {
        type: 'vehicle' | 'property' | 'person' | 'business' | 'other'
        title: string
        subtitle?: string
    }
}

export interface PolicyWalletProps {
    policies: Policy[]
    onViewPolicy?: (policyId: string) => void
    onAddManually?: () => void
    onUploadDocument?: () => void
    onBatchUpload?: () => void
    onShareWithAgent?: (policyId: string) => void
    onViewDocuments?: (policyId: string) => void
    onEditPolicy?: (policyId: string) => void
    user?: {
        name: string
    }
}

