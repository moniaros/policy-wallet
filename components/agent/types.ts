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
    /**
     * What tells this policy apart from the client's other one on the same
     * line — plate, address, insured person, or policy number. Resolved
     * server-side by `policyRowIdentity`.
     */
    assetLabel?: string
    /** @deprecated never populated by the read path — use `assetLabel`. */
    carPlate?: string
    startDate: string
    endDate: string
    status: 'active' | 'expiring_soon' | 'expired' | 'unknown_duration' | 'action_needed' | 'cancelled' | 'analyzing' | 'incomplete'
    /** True when the viewing agent created (manages) this policy. */
    managedByAgent?: boolean
    /** True when the policy has at least one completed analysis run (branded report available). */
    hasAnalysis?: boolean
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
    /** Legacy three-way pill, kept for compatibility. Derived from the raw
     *  relationship status alone, so it says "invited" for a customer the
     *  agent merely added and never invited. Prefer the two raw fields below. */
    activationStatus: ActivationStatus
    /** Raw CustomerRelationship.status: pending_activation | active | inactive | terminated. */
    relationshipStatus?: string
    /** Raw CustomerRelationship.activationStatus: no_policies | not_invited |
     *  invited | activated | active — the value the pill should be derived from. */
    relationshipActivationStatus?: string
    /**
     * The customer has NO email: `email` is the synthetic, non-deliverable
     * placeholder (lib/identity/synthetic-email.ts). Never render it as an
     * address, never offer mailto/invite on it — offer «add an email» instead.
     */
    contactEmailMissing?: boolean
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
    /** «Αποστολή πρόσκλησης» on a customer who was added but never invited. */
    onInvite?: (customerId: string) => void
    /** «Προσθέστε email για να τον προσκαλέσετε» on a customer who has no email. */
    onAddEmail?: (customerId: string) => void
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

// Only the two item types the dashboard actually produces (page.tsx):
// expiring policies and clients with no linked policy. Dead types
// (unsigned_document / unanswered_request / inbound_lead /
// scheduled_followup) were removed to kill unreachable render branches.
export type ActionQueueItemType =
    | "expiring_policy"
    | "incomplete_profile"

export type OneTapAction =
    | "renew"
    | "complete_profile"

export interface ActionQueueItem {
    id: string
    type: ActionQueueItemType
    clientId: string
    clientName: string
    /**
     * Server-built English fallback ("motor expires 25/5/2027"). It used to be
     * rendered directly, so the Greek-default agent dashboard showed its primary
     * work queue in English with raw database enum values. The card now builds
     * the line from `type` + the fields below; this is only a last resort.
     */
    description: string
    /** Raw lob key for an expiring policy — localized client-side. */
    lineOfBusiness?: string
    dueDate: string
    urgency: "low" | "medium" | "high"
    oneTapAction: OneTapAction
    policyId?: string
    /**
     * Agent commission at stake if this renewal lapses — renewal premium ×
     * the agent's per-line commission rate. Only set for expiring-policy items
     * with a plausible priced premium; undefined otherwise (no fabrication).
     */
    revenueAtRisk?: number
    metadata?: Record<string, unknown>
}

/** A persisted cross-sell opportunity surfaced on the dashboard (Pro+). */
export interface CrossSellOpportunityItem {
    id: string
    customerId: string
    customerName: string
    /** Suggested missing line of business (raw lob key, localized client-side). */
    lineOfBusiness: string
    /** Estimated agent commission for the suggested line (> 0). */
    estimatedCommission: number
}

/** A real pending task assigned to the agent (due today or overdue). */
export interface AgentTaskItem {
    id: string
    title: string
    dueDate: string | null
    /** True when the due date is before today (past-due), false when due today. */
    overdue: boolean
    priority: "low" | "medium" | "high"
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
    /** MEDIC qualification health over the open pipeline (blueprint §F tile). */
    qualification?: {
        pipelineCount: number
        pipelineEur: number
        qualifiedEur: number
        missingEb: number
        unconfirmedPain: number
    }
}

export interface ClientCardData {
    id: string
    relationshipId: string
    name: string
    surname: string
    email: string
    avatar?: string
    policyCount: number
    urgencyTier: UrgencyTier
    nextActionDue?: string | null
    nextActionLabel?: string | null
    activationStatus: ActivationStatus
    /** Number of detected coverage gaps */
    gapCount?: number
    underReviewCount?: number
    /** B1.5: policies in a branch with no authored check — never counted as assessed, and said so. */
    unassessedPolicyCount?: number
}

export interface AgentDashboardData {
    actionQueue: ActionQueueItem[]
    /** Sum of revenueAtRisk across the action queue — "€X in renewals at risk". */
    revenueAtRiskTotal: number
    revenue: RevenueMetrics
    portfolioHealth: PortfolioHealth
    clientsByUrgency: {
        needs_attention: ClientCardData[]
        on_track: ClientCardData[]
        inactive: ClientCardData[]
    }
    /** Real pending UserTasks assigned to the agent (due today + overdue). */
    pendingTasks: AgentTaskItem[]
    /**
     * Top persisted cross-sell opportunities by estimated commission (Pro+).
     * Empty for below-Pro tiers — the data is withheld server-side.
     */
    crossSellOpportunities: CrossSellOpportunityItem[]
    gapsSummary?: GapsSummary | null
    /** B2B portal KPI strip data (book-of-business metrics). */
    portalStats?: import("@/lib/services/agent-portal.service").AgentPortalStats | null
}
