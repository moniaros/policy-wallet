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
    | 'message_sent'
    | 'note_added'
    | 'relationship_created'
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
    /** True when the viewing agent created (manages) this policy. */
    managedByAgent?: boolean
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
    /** Conversion likelihood from opportunity scoring (null if not computed) */
    conversionLikelihood?: "high" | "medium" | "low" | null
    /** Opportunity score 0-100 (null if not computed) */
    conversionScore?: number | null
}

export interface Interaction {
    id: string
    type: InteractionType
    message: string
    timestamp: string
}

export interface CrossSellLine {
    lob: string
    label: { en: string; el: string }
    essential: boolean
    reason: { en: string; el: string }
}

export interface CustomerCrossSell {
    existingLines: string[]
    missingLines: CrossSellLine[]
    coverageScore: number
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
    avatar?: string
    inviteStatus?: InviteStatus
    inviteSentDate?: string
    policies?: Policy[]
    opportunities?: Opportunity[]
    interactions?: Interaction[]
    crossSell?: CustomerCrossSell
    /** Per-client portal intelligence (health score, renewal, gaps, consent, next action). */
    intelligence?: import("@/lib/services/agent-portal.service").CustomerIntelligence
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
    onCustomerClick: (customerId: string) => void
    onAddCustomer?: () => void
    onCall?: (customerId: string) => void
    onEmail?: (customerId: string) => void
    onWhatsApp?: (customerId: string) => void
    onBulkAction?: (action: 'export' | 'email' | 'delete', ids: string[]) => void
}

export interface CustomerProfileProps {
    customer: Customer
    onUpdateOpportunityStatus?: (opportunityId: string, status: OpportunityStatus, notes?: string) => void
    onUploadPolicy?: (customerId: string) => void
    onSendQuestionnaire?: (customerId: string) => void
    onSendReminder?: (customerId: string, opportunityId?: string) => void
    onInviteCustomer?: (customerId: string, email: string) => void
    onViewPolicy?: (customerId: string, policyId: string) => void
    onBack?: () => void
}

export interface InviteModalProps {
    isOpen: boolean
    onClose?: () => void
    onSendInvite?: (email: string, accessScope: AccessScope) => void
}

// ── Agent Dashboard Types ─────────────────────────────────────────────

export type UrgencyTier = "needs_attention" | "on_track" | "inactive"

export type ActionQueueItemType =
    | "expiring_policy"
    | "unsigned_document"
    | "unanswered_request"
    | "incomplete_profile"
    | "inbound_lead"
    | "scheduled_followup"

export type OneTapAction =
    | "renew"
    | "follow_up"
    | "send_reminder"
    | "view_document"
    | "complete_profile"
    | "accept_lead"

export interface ActionQueueItem {
    id: string
    type: ActionQueueItemType
    clientId: string
    clientName: string
    description: string
    dueDate: string
    urgency: "low" | "medium" | "high"
    oneTapAction: OneTapAction
    policyId?: string
    metadata?: Record<string, unknown>
}

export interface GapsSummary {
    criticalClientsCount: number
    highClientsCount: number
    totalGapsCount: number
    topClients: Array<{
        clientId: string
        clientName: string
        criticalGaps: number
        highGaps: number
    }>
}

export interface RevenueMetrics {
    mrr: number
    renewalsDueThisMonth: number
    renewalsDueAmount: number
    commissionPipeline: number
    monthlyGrowthPercent: number
}

export interface PortfolioHealth {
    totalClients: number
    coverageGapPercent: number
    completeProfilePercent: number
    atRiskCount: number
}

export interface ClientCardData {
    id: string
    relationshipId: string
    name: string
    surname: string
    email: string
    avatar?: string
    policyCount: number
    healthScore: number
    urgencyTier: UrgencyTier
    nextActionDue?: string | null
    nextActionLabel?: string | null
    activationStatus: ActivationStatus
    /** Unified protection score (0-100) from gap engine. Null if not computed yet. */
    protectionScore?: number | null
    /** Number of detected coverage gaps */
    gapCount?: number
}

export interface AgentDashboardData {
    actionQueue: ActionQueueItem[]
    revenue: RevenueMetrics
    portfolioHealth: PortfolioHealth
    clientsByUrgency: {
        needs_attention: ClientCardData[]
        on_track: ClientCardData[]
        inactive: ClientCardData[]
    }
    todaysFollowUps: ActionQueueItem[]
    gapsSummary?: GapsSummary | null
    /** B2B portal KPI strip data (book-of-business metrics). */
    portalStats?: import("@/lib/services/agent-portal.service").AgentPortalStats | null
}
