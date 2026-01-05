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
    lineOfBusiness: 'motor' | 'health' | 'home'
    status: 'active' | 'expiring_soon' | 'incomplete' | 'action_needed'
    startDate: string | null
    endDate: string | null
    lastUpdated: string
    sharedWithAgents: SharedAgent[]
    coverageHighlights: string[]
    documents: PolicyDocument[]
}

export interface PolicyWalletProps {
    policies: Policy[]
    onViewPolicy?: (policyId: string) => void
    onAddManually?: () => void
    onUploadDocument?: () => void
    onShareWithAgent?: (policyId: string) => void
    onAddToWallet?: (policyId: string) => void
    onViewDocuments?: (policyId: string) => void
    onEditPolicy?: (policyId: string) => void
}
