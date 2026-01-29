/**
 * Domain Enumerations
 * 
 * Type-safe enums for all domain concepts in the application
 */

// Lines of Business
export const LINES_OF_BUSINESS = [
    'motor',
    'health',
    'home',
    'life',
    'travel',
    'liability',
    'pet',
    'breakdown',
    'legal_expenses',
    'income_protection',
    'gadget',
    'bicycle',
    'business',
    'cyber',
    'motorbike',
    'public_liability',
    'renters',
    'other'
] as const

export type LineOfBusiness = typeof LINES_OF_BUSINESS[number]

export function isLineOfBusiness(value: string): value is LineOfBusiness {
    return LINES_OF_BUSINESS.includes(value as LineOfBusiness)
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
