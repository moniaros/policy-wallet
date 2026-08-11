/**
 * Domain Enumerations
 * 
 * Type-safe enums for all domain concepts in the application
 */

import { INSURANCE_BRANCHES } from '@/lib/insurance/taxonomy'

/**
 * Lines of business accepted across the typed API surface.
 *
 * DERIVED from `lib/insurance/taxonomy.ts`, which is the single source of
 * truth. This list used to be a hand-maintained second taxonomy, and it had
 * drifted in both directions: it carried `breakdown` and `public_liability`,
 * which are ALIASES rather than branch ids, while missing `pension`, `boat`,
 * `roadside`, `personal_accident` and every `group_*` line — so the public API
 * rejected filters for branches the app could perfectly well store.
 *
 * The two legacy aliases stay accepted deliberately: they are live values in
 * older API clients and in i18n keys, and `normalizeBranch` resolves them
 * correctly. Removing them would be a breaking narrowing; keeping them costs
 * nothing because nothing writes them.
 */
const LEGACY_ACCEPTED_ALIASES = ['breakdown', 'public_liability'] as const

export const LINES_OF_BUSINESS = [
    ...INSURANCE_BRANCHES.map((branch) => branch.id),
    ...LEGACY_ACCEPTED_ALIASES,
] as const as readonly string[]

/**
 * The compile-time type stays a broad `string` rather than a literal union:
 * `Policy.lineOfBusiness` is a free-form column by design (the taxonomy is the
 * read-side adapter), and pinning a union here would make every DB row need a
 * cast. Runtime validation is `isLineOfBusiness`; the write-side literal union
 * lives in `lib/validations/policy.ts` as `WriteBranchId`.
 */
export type LineOfBusiness = string

const LINE_OF_BUSINESS_SET: ReadonlySet<string> = new Set(LINES_OF_BUSINESS)

export function isLineOfBusiness(value: string): value is LineOfBusiness {
    return LINE_OF_BUSINESS_SET.has(value)
}

// Policy Status
export const POLICY_STATUSES = [
    'active',
    'expiring_soon',
    'expired',
    'cancelled',
    'incomplete'
] as const

export type PolicyStatus = typeof POLICY_STATUSES[number]

export function isPolicyStatus(value: string): value is PolicyStatus {
    return POLICY_STATUSES.includes(value as PolicyStatus)
}

// Gap Severity
export const GAP_SEVERITIES = [
    'critical',
    'high',
    'medium',
    'low'
] as const

export type GapSeverity = typeof GAP_SEVERITIES[number]

export function isGapSeverity(value: string): value is GapSeverity {
    return GAP_SEVERITIES.includes(value as GapSeverity)
}

// Gap Status
export const GAP_STATUSES = [
    'open',
    'acknowledged',
    'resolved',
    'dismissed'
] as const

export type GapStatus = typeof GAP_STATUSES[number]

export function isGapStatus(value: string): value is GapStatus {
    return GAP_STATUSES.includes(value as GapStatus)
}

// User Roles
export const USER_ROLES = [
    'policyholder',
    'agent',
    'admin'
] as const

export type UserRole = typeof USER_ROLES[number]

export function isUserRole(value: string): value is UserRole {
    return USER_ROLES.includes(value as UserRole)
}

// Opportunity Status
export const OPPORTUNITY_STATUSES = [
    'open',
    'contacted',
    'quoted',
    'won',
    'lost',
    'on_hold'
] as const

export type OpportunityStatus = typeof OPPORTUNITY_STATUSES[number]

export function isOpportunityStatus(value: string): value is OpportunityStatus {
    return OPPORTUNITY_STATUSES.includes(value as OpportunityStatus)
}

// Terminal stages — a deal that reaches one of these is closed, and closing is
// what stamps `Opportunity.outcome` / `outcomeAt`.
export const TERMINAL_OPPORTUNITY_STATUSES = ['won', 'lost'] as const

export type TerminalOpportunityStatus = typeof TERMINAL_OPPORTUNITY_STATUSES[number]

export function isTerminalOpportunityStatus(value: string): value is TerminalOpportunityStatus {
    return TERMINAL_OPPORTUNITY_STATUSES.includes(value as TerminalOpportunityStatus)
}

// Why a deal was won.
export const OPPORTUNITY_WON_OUTCOMES = [
    'new_business',
    'cross_sell',
    'renewal',
    'proposal_accepted'
] as const

export type OpportunityWonOutcome = typeof OPPORTUNITY_WON_OUTCOMES[number]

// Why a deal was lost. The first four deliberately mirror the decline taxonomy
// the proposal-response UI already collects, so a client decline maps 1:1 onto
// a pipeline loss reason instead of being reduced to prose.
export const OPPORTUNITY_LOST_OUTCOMES = [
    'too_expensive',
    'not_needed',
    'prefer_different',
    'other',
    'competitor',
    'unresponsive'
] as const

export type OpportunityLostOutcome = typeof OPPORTUNITY_LOST_OUTCOMES[number]

export type OpportunityOutcome = OpportunityWonOutcome | OpportunityLostOutcome

/** Is `outcome` a valid reason for closing a deal at `status`? */
export function isOpportunityOutcomeFor(
    status: TerminalOpportunityStatus,
    outcome: string
): outcome is OpportunityOutcome {
    return status === 'won'
        ? OPPORTUNITY_WON_OUTCOMES.includes(outcome as OpportunityWonOutcome)
        : OPPORTUNITY_LOST_OUTCOMES.includes(outcome as OpportunityLostOutcome)
}

// Customer Relationship Status
export const RELATIONSHIP_STATUSES = [
    'pending_activation',
    'active',
    'inactive'
] as const

export type RelationshipStatus = typeof RELATIONSHIP_STATUSES[number]

export function isRelationshipStatus(value: string): value is RelationshipStatus {
    return RELATIONSHIP_STATUSES.includes(value as RelationshipStatus)
}

// Activation Status
export const ACTIVATION_STATUSES = [
    'no_policies',
    'pending_analysis',
    'active',
    'inactive'
] as const

export type ActivationStatus = typeof ACTIVATION_STATUSES[number]

export function isActivationStatus(value: string): value is ActivationStatus {
    return ACTIVATION_STATUSES.includes(value as ActivationStatus)
}

// Document Source
export const DOCUMENT_SOURCES = [
    'policyholder',
    'agent',
    'system'
] as const

export type DocumentSource = typeof DOCUMENT_SOURCES[number]

export function isDocumentSource(value: string): value is DocumentSource {
    return DOCUMENT_SOURCES.includes(value as DocumentSource)
}

// Processing Status
export const PROCESSING_STATUSES = [
    'pending',
    'processing',
    'completed',
    'failed'
] as const

export type ProcessingStatus = typeof PROCESSING_STATUSES[number]

export function isProcessingStatus(value: string): value is ProcessingStatus {
    return PROCESSING_STATUSES.includes(value as ProcessingStatus)
}

// Notification Channels
export const NOTIFICATION_CHANNELS = [
    'in_app',
    'email',
    'sms',
    'push'
] as const

export type NotificationChannel = typeof NOTIFICATION_CHANNELS[number]

export function isNotificationChannel(value: string): value is NotificationChannel {
    return NOTIFICATION_CHANNELS.includes(value as NotificationChannel)
}

// Notification Status
export const NOTIFICATION_STATUSES = [
    'queued',
    'sent',
    'failed',
    'read'
] as const

export type NotificationStatus = typeof NOTIFICATION_STATUSES[number]

export function isNotificationStatus(value: string): value is NotificationStatus {
    return NOTIFICATION_STATUSES.includes(value as NotificationStatus)
}

// Languages
export const LANGUAGES = ['en', 'el'] as const

export type Language = typeof LANGUAGES[number]

export function isLanguage(value: string): value is Language {
    return LANGUAGES.includes(value as Language)
}

// Currency
export const CURRENCIES = ['EUR', 'USD', 'GBP'] as const

export type Currency = typeof CURRENCIES[number]

export function isCurrency(value: string): value is Currency {
    return CURRENCIES.includes(value as Currency)
}
