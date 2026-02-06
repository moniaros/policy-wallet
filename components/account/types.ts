// =============================================================================
// Data Types
// =============================================================================

export interface User {
    user_id: string
    name: string | null
    email: string
    phone_number?: string | null
    preferred_language: 'el' | 'en'
    role: string
    image?: string | null
    created_at: string
}

export interface NotificationPreference {
    preference_id: string
    event_type: string
    channel: string
    enabled: boolean
}

export interface PlanEntitlements {
    policy_storage?: 'unlimited' | number
    ai_analyses_per_month: 'unlimited' | number
    notifications?: 'basic' | 'advanced'
    priority_processing?: boolean
    full_history?: boolean
    priority_support?: boolean
    customer_limit?: 'unlimited' | number
    crm_features?: 'basic' | 'advanced'
    opportunity_tracking?: boolean
    analytics?: boolean
    white_label?: boolean
}

export interface Plan {
    plan_id: string
    plan_type: 'policyholder' | 'agent'
    name: string
    price: number
    currency: string
    billing_interval: 'month' | 'year'
    entitlements: PlanEntitlements
}

export interface Subscription {
    subscription_id: string
    user_id: string
    plan_id: string
    status: 'active' | 'cancelled' | 'expired'
    current_period_start: string
    current_period_end: string
    next_billing_date: string | null
    created_at: string
}

export interface CreditTransaction {
    transaction_id: string
    user_id: string
    amount: number
    transaction_type: 'earn' | 'spend' | 'expire'
    balance_after: number
    referral_id: string | null
    description: string
    created_at: string
}

export interface EntitlementUsage {
    usage_id: string
    user_id: string
    subscription_id: string
    usage_type: 'ai_analysis' | 'customer_count' | 'customer_invite'
    amount_used: number
    amount_limit: 'unlimited' | number
    reset_date: string | null
    period_start: string
}

export interface Referral {
    referral_id: string
    referrer_user_id: string
    referred_user_id: string | null
    referred_email: string
    referred_subscription_id: string | null
    status: 'pending' | 'credited'
    credited_at: string | null
    created_at: string
}

export interface Invoice {
    invoice_id: string
    user_id: string
    subscription_id: string
    invoice_number: string
    amount_subtotal: number
    amount_tax: number
    amount_total: number
    currency: string
    status: 'upcoming' | 'paid' | 'failed' | 'void'
    billing_reason: 'subscription_create' | 'subscription_cycle' | 'subscription_update'
    credits_applied?: number
    period_start: string
    period_end: string
    issued_at: string | null
    paid_at: string | null
    pdf_url: string | null
}

export interface PaymentMethod {
    payment_method_id: string
    user_id: string
    type: 'card' | 'bank_account'
    card_brand?: 'visa' | 'mastercard' | 'amex' | 'discover'
    card_last4?: string
    card_exp_month?: number
    card_exp_year?: number
    is_default: boolean
    created_at: string
}

export interface ActiveSession {
    session_id: string
    user_id: string
    device_name: string
    device_type: 'desktop' | 'mobile' | 'tablet'
    ip_address: string
    location: string
    is_current: boolean
    last_active_at: string
    created_at: string
}

export interface SecurityEvent {
    event_id: string
    user_id: string
    event_type: 'login' | 'login_failed' | 'logout' | 'password_change' | 'email_change'
    device_name: string
    ip_address: string
    location: string
    success: boolean
    created_at: string
}

// =============================================================================
// Component Props
// =============================================================================

export interface AccountOverviewProps {
    /** The current user */
    currentUser: User
    /** Available plans for the user's current role */
    availablePlans: Plan[]
    /** User's current subscription */
    currentSubscription: Subscription
    /** Current plan details */
    currentPlan: Plan
    /** Usage metrics for current subscription */
    usageMetrics: EntitlementUsage[]
    /** Current referral credit balance */
    creditBalance: number
    /** Called when user wants to view plan details */
    onViewPlan?: (planId: string) => void
    /** Called when user wants to upgrade to a different plan */
    onUpgrade?: (planId: string) => void
    /** Called when user wants to switch active role (for dual-role users) */
    onSwitchRole?: (role: 'policyholder' | 'agent') => void
}

export interface BillingProps {
    /** The current user */
    currentUser: User
    /** User's current subscription */
    currentSubscription: Subscription
    /** Current plan details */
    currentPlan: Plan
    /** User's payment methods */
    paymentMethods: PaymentMethod[]
    /** Billing history */
    invoices: Invoice[]
    /** Called when user wants to download an invoice */
    onDownloadInvoice?: (invoiceId: string) => void
    /** Called when user wants to add a new payment method */
    onAddPaymentMethod?: () => void
    /** Called when user wants to update their payment method */
    onUpdatePaymentMethod?: (paymentMethodId: string) => void
    /** Called when user wants to downgrade their plan */
    onDowngrade?: (planId: string) => void
    /** Called when user wants to cancel their subscription */
    onCancel?: () => void
}

export interface ReferralsProps {
    /** The current user */
    currentUser: User
    /** User's referral link */
    referralLink: string
    /** User's referral history */
    referrals: Referral[]
    /** Credit transaction ledger */
    creditTransactions: CreditTransaction[]
    /** Current credit balance */
    creditBalance: number
    /** Called when user wants to share referral link via email */
    onShareEmail?: () => void
    /** Called when user wants to share referral link via WhatsApp */
    onShareWhatsApp?: () => void
    /** Called when user wants to copy referral link */
    onCopyLink?: () => void
}

export interface SettingsProps {
    /** The current user */
    currentUser: User
    /** User's active sessions */
    activeSessions: ActiveSession[]
    /** User's security event history */
    securityEvents: SecurityEvent[]
    notificationPreferences: NotificationPreference[]
    /** Called when user wants to update their profile (name, etc) */
    onUpdateProfile?: (data: { name?: string; phone?: string }) => void
    /** Called when user wants to update their email */
    onUpdateEmail?: (newEmail: string) => void
    /** Called when user wants to change their password */
    onChangePassword?: (newPassword?: string) => void
    /** Called when user wants to update their language preference */
    onUpdateLanguage?: (language: 'el' | 'en') => void
    /** Called when user wants to toggle a notification preference */
    onToggleNotification?: (eventType: string, channel: string, enabled: boolean) => void
    /** Called when user wants to log out from a specific session */
    onLogoutSession?: (sessionId: string) => void
    /** Called when user wants to log out from all devices */
    onLogoutAllSessions?: () => void
}
