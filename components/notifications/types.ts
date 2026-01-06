// =============================================================================
// Data Types for UI Components (Milestone 8)
// =============================================================================

export interface User {
    user_id: string
    email: string
    preferred_language: 'el' | 'en'
    role: string
    created_at: string
}

export interface Policy {
    policy_id: string
    owner_user_id: string
    policy_number: string
    insurer_name: string
    line_of_business: 'motor' | 'health' | 'home'
    end_date: string
    status: 'active' | 'expiring' | 'expired'
}

export interface CustomerRelationship {
    relationship_id: string
    agent_user_id: string
    policyholder_user_id: string
    status: 'active' | 'revoked'
    created_at: string
}

export interface NotificationEvent {
    event_id: string
    user_id: string
    event_type: string
    event_category: 'system_confirmation' | 'reminder' | 'intelligence' | 'agent_action'
    channel: 'email' | 'push' | 'whatsapp' | 'viber'
    status: 'sent' | 'failed' | 'queued'
    subject: string
    message: string
    related_policy_id: string | null
    related_policy_name: string | null
    related_customer_relationship_id: string | null
    related_customer_name?: string | null
    failure_reason?: string
    sent_at: string | null
    created_at: string
}

export interface NotificationPreference {
    preference_id: string
    user_id: string
    role: 'policyholder' | 'agent' | 'admin'
    event_category: 'system_confirmation' | 'reminder' | 'intelligence'
    event_type: string
    channel_email: boolean
    channel_push: boolean
    always_sent: boolean
    updated_at: string
}

export interface EventTypeConfig {
    event_type: string
    label: string
    description: string
    always_sent: boolean
}

export interface PreferenceCategory {
    category: 'system_confirmation' | 'reminder' | 'intelligence'
    label: string
    description: string
    event_types: EventTypeConfig[]
}

// =============================================================================
// Component Props
// =============================================================================

export interface NotificationHistoryProps {
    /** The current user viewing the history */
    currentUser: User
    /** List of notification events to display */
    notificationEvents: NotificationEvent[]
    /** Available policies for filtering */
    policies: Policy[]
    /** Available customer relationships for filtering (agent view) */
    customerRelationships: CustomerRelationship[]
    /** Currently active filter (policy, customer, or event type) */
    activeFilter?: {
        type: 'policy' | 'customer' | 'event_type'
        value: string
    }
    /** Called when user clicks on a notification to navigate to related object */
    onNavigateToRelatedObject?: (objectType: 'policy' | 'customer', objectId: string) => void
    /** Called when user changes the filter */
    onFilterChange?: (filterType: 'policy' | 'customer' | 'event_type', value: string | null) => void
    /** Called when user clears all filters */
    onClearFilters?: () => void
}

export interface NotificationPreferencesProps {
    /** The current user managing preferences */
    currentUser: User
    /** Current user's active role (for dual-role users) */
    activeRole: 'policyholder' | 'agent'
    /** Current notification preferences for the active role */
    preferences: NotificationPreference[]
    /** Preference categories with event types */
    preferenceCategories: PreferenceCategory[]
    /** Called when user toggles a channel for an event type */
    onToggleChannel?: (eventType: string, channel: 'email' | 'push', enabled: boolean) => void
    /** Called when user switches active role (dual-role users only) */
    onSwitchRole?: (role: 'policyholder' | 'agent') => void
}
