export type ActivationStatus = 'invited' | 'activated' | 'inactive'
export type AccessScope = 'portfolio' | 'upload_only'
export type Permission = 'view' | 'upload' | 'suggest' | 'message'
export type OpportunityStatus = 'open' | 'contacted' | 'won' | 'lost'
export type GapSeverity = 'low' | 'medium' | 'high' | 'critical'
export type InviteStatus = 'sent' | 'opened' | 'activated'
export type InteractionType =
    | 'invite_sent'
    | 'invite_opened'
    | 'policy_uploaded'
    | 'questionnaire_sent'
    | 'opportunity_contacted'
    | 'reminder_sent'
export type PriorityType = 'follow_up' | 'open_opportunity' | 'pending_invite'

export interface Policy {
    policyId: string
    policyNumber: string
    insurerName: string
    lineOfBusiness: 'motor' | 'health' | 'home' | 'life' | 'travel'
    carPlate?: string
    startDate: string
    endDate: string
    status: 'active' | 'expiring_soon' | 'expired' | 'incomplete'
}

export interface Opportunity {
    opportunityId: string
    policyId: string
    gapId: string
    gapTitle: string
    severity: GapSeverity
    status: OpportunityStatus
    nextActionDate: string
    notes: string
    createdAt: string
}

export interface Interaction {
    id: string
    type: InteractionType
    message: string
    timestamp: string
}

export interface Customer {
    id: string
    relationshipId: string
    name: string
    surname: string
    email: string
    phone: string
    activationStatus: ActivationStatus
    accessScope: AccessScope
    permissions: Permission[]
    policyCount: number
    openGapsCount: number
    lastInteractionDate: string
    createdAt: string
    inviteStatus?: InviteStatus
    inviteSentDate?: string
    policies?: Policy[]
    opportunities?: Opportunity[]
    interactions?: Interaction[]
}

export interface DashboardSummary {
    invited: number
    activated: number
    inactive: number
}

export interface Priority {
    id: string
    type: PriorityType
    customerId: string
    customerName: string
    message: string
    priority: number
}

export interface Invite {
    inviteId: string
    inviteeEmail: string
    accessScope: AccessScope
    permissions: Permission[]
    status: InviteStatus
    sentDate: string
    openedDate?: string
    expiresAt: string
}

export interface DashboardProps {
    summary: DashboardSummary
    priorities: Priority[]
    onPriorityClick?: (customerId: string) => void
    onInviteCustomer?: () => void
}

export interface CustomerListProps {
    customers: Customer[]
    isLoading?: boolean
    onSearch?: (query: string) => void
    onCustomerClick?: (customerId: string) => void
    onAddCustomer?: () => void
}

export interface CustomerProfileProps {
    customer: Customer
    onUpdateOpportunityStatus?: (opportunityId: string, status: OpportunityStatus, notes?: string) => void
    onUploadPolicy?: (customerId: string) => void
    onSendQuestionnaire?: (customerId: string) => void
    onSendReminder?: (customerId: string, opportunityId?: string) => void
    onInviteCustomer?: (customerId: string, email: string) => void
    onBack?: () => void
}

export interface InviteModalProps {
    isOpen: boolean
    onClose?: () => void
    onSendInvite?: (email: string, accessScope: AccessScope) => void
}
