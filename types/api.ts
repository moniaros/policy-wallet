/**
 * API Request/Response Types
 * 
 * Types for API endpoints and server actions
 */

import type { LineOfBusiness } from './enums'

// ============================================================================
// Generic API Response Wrapper
// ============================================================================

export interface PaginationMeta {
    total: number
    page: number
    limit: number
    hasMore: boolean
}

export interface ApiResponse<T> {
    success: boolean
    data?: T
    error?: {
        code: string
        message: string
        details?: Record<string, string[]>
    }
    meta?: {
        pagination?: PaginationMeta
        timestamp: string
    }
}

// ============================================================================
// Action Results (for Server Actions)
// ============================================================================

export type ActionResult<T = void> =
    | { success: true; data?: T }
    | { success: false; error: string; code?: string; details?: Record<string, string[]> }

// ============================================================================
// Input Types for Forms and Actions
// ============================================================================

export interface FileInput {
    url: string
    name: string
    size: number
}

export interface CreatePolicyInput {
    insurerName: string
    policyNumber: string
    lineOfBusiness: LineOfBusiness
    startDate: string
    endDate: string
    premiumAmount?: number
    premiumCurrency?: string
    coverageSummary?: string
    documents?: FileInput[]
}

export interface UpdatePolicyInput {
    insurerName?: string
    policyNumber?: string
    lineOfBusiness?: LineOfBusiness
    startDate?: string
    endDate?: string
    premiumAmount?: number
    premiumCurrency?: string
    coverageSummary?: string
}

export interface SharePolicyInput {
    policyId: string
    agentEmail: string
}

export interface AddCustomerInput {
    email: string
    name: string
    phone?: string
}

export interface BulkCustomerInput {
    email: string
    name: string
    phone?: string
}

export interface BulkImportResult {
    total: number
    successful: number
    failed: number
    errors: Array<{
        row: number
        email: string
        error: string
    }>
}

export interface CreateOpportunityInput {
    customerId: string
    policyId?: string
    gapInstanceId?: string
    notes?: string
    nextActionAt?: string
}

export interface UpdateOpportunityInput {
    status?: string
    notes?: string
    nextActionAt?: string
}

export interface SendQuestionnaireInput {
    customerId: string
    templateId: string
}

export interface UpdateNotificationPreferencesInput {
    eventType: string
    channel: string
    enabled: boolean
}

// ============================================================================
// Query/Filter Types
// ============================================================================

export interface PaginationOptions {
    page?: number
    limit?: number
    cursor?: string
}

export interface PolicyFilters extends PaginationOptions {
    status?: string
    lineOfBusiness?: LineOfBusiness
    search?: string
    sortBy?: 'endDate' | 'createdAt' | 'insurerName'
    sortOrder?: 'asc' | 'desc'
}

export interface CustomerFilters extends PaginationOptions {
    status?: string
    activationStatus?: string
    search?: string
    sortBy?: 'name' | 'policyCount' | 'gapCount' | 'lastInteraction'
    sortOrder?: 'asc' | 'desc'
}

export interface GapFilters extends PaginationOptions {
    severity?: string
    status?: string
    lineOfBusiness?: LineOfBusiness
}

export interface OpportunityFilters extends PaginationOptions {
    status?: string
    customerId?: string
    sortBy?: 'nextActionAt' | 'createdAt'
    sortOrder?: 'asc' | 'desc'
}

// ============================================================================
// Search/Autocomplete Types
// ============================================================================

export interface SearchResult {
    id: string
    type: 'policy' | 'customer' | 'opportunity'
    title: string
    subtitle?: string
    metadata?: Record<string, unknown>
}

export interface AutocompleteOption {
    value: string
    label: string
    metadata?: Record<string, unknown>
}
