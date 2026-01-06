import type { Policy } from '@prisma/client'

export type PolicyStatus = 'active' | 'expiring_soon' | 'expired' | 'action_needed' | 'cancelled'

export interface PolicyWithStatus extends Policy {
    calculatedStatus: PolicyStatus
    daysUntilExpiry: number
}

/**
 * Calculate the status of a policy based on its dates and current status
 */
export function calculatePolicyStatus(policy: Policy): PolicyStatus {
    // If manually marked as cancelled, return that
    if (policy.status === 'cancelled') {
        return 'cancelled'
    }

    const today = new Date()
    const endDate = new Date(policy.endDate)
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    // Expired
    if (daysUntilExpiry < 0) {
        return 'expired'
    }

    // Expiring soon (within 30 days)
    if (daysUntilExpiry <= 30) {
        return 'expiring_soon'
    }

    // Action needed if missing critical information
    if (!policy.policyNumber || !policy.insurerName) {
        return 'action_needed'
    }

    // Active
    return 'active'
}

/**
 * Calculate days until expiry
 */
export function getDaysUntilExpiry(endDate: Date): number {
    const today = new Date()
    const end = new Date(endDate)
    return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Get status label for display
 */
export function getStatusLabel(status: PolicyStatus, language: 'el' | 'en' = 'el'): string {
    const labels = {
        el: {
            active: 'Ενεργή',
            expiring_soon: 'Λήγει Σύντομα',
            expired: 'Έχει Λήξει',
            action_needed: 'Απαιτείται Ενέργεια',
            cancelled: 'Ακυρωμένη',
        },
        en: {
            active: 'Active',
            expiring_soon: 'Expiring Soon',
            expired: 'Expired',
            action_needed: 'Action Needed',
            cancelled: 'Cancelled',
        },
    }

    return labels[language][status]
}

/**
 * Get status color for UI
 */
export function getStatusColor(status: PolicyStatus): {
    bg: string
    text: string
    border: string
} {
    const colors = {
        active: {
            bg: 'bg-green-50 dark:bg-green-900/20',
            text: 'text-green-700 dark:text-green-400',
            border: 'border-green-200 dark:border-green-800',
        },
        expiring_soon: {
            bg: 'bg-amber-50 dark:bg-amber-900/20',
            text: 'text-amber-700 dark:text-amber-400',
            border: 'border-amber-200 dark:border-amber-800',
        },
        expired: {
            bg: 'bg-red-50 dark:bg-red-900/20',
            text: 'text-red-700 dark:text-red-400',
            border: 'border-red-200 dark:border-red-800',
        },
        action_needed: {
            bg: 'bg-orange-50 dark:bg-orange-900/20',
            text: 'text-orange-700 dark:text-orange-400',
            border: 'border-orange-200 dark:border-orange-800',
        },
        cancelled: {
            bg: 'bg-stone-50 dark:bg-stone-900/20',
            text: 'text-stone-700 dark:text-stone-400',
            border: 'border-stone-200 dark:border-stone-800',
        },
    }

    return colors[status]
}

/**
 * Calculate portfolio summary statistics
 */
export interface PortfolioSummary {
    totalPolicies: number
    activeCount: number
    expiringSoonCount: number
    expiredCount: number
    actionNeededCount: number
    cancelledCount: number
    totalPremium: number
    upcomingRenewals: Array<{
        policyId: string
        policyNumber: string
        insurerName: string
        lineOfBusiness: string
        daysUntilExpiry: number
    }>
}

export function calculatePortfolioSummary(policies: Policy[]): PortfolioSummary {
    const summary: PortfolioSummary = {
        totalPolicies: policies.length,
        activeCount: 0,
        expiringSoonCount: 0,
        expiredCount: 0,
        actionNeededCount: 0,
        cancelledCount: 0,
        totalPremium: 0,
        upcomingRenewals: [],
    }

    policies.forEach((policy) => {
        const status = calculatePolicyStatus(policy)
        const daysUntilExpiry = getDaysUntilExpiry(policy.endDate)

        // Count by status
        switch (status) {
            case 'active':
                summary.activeCount++
                break
            case 'expiring_soon':
                summary.expiringSoonCount++
                summary.upcomingRenewals.push({
                    policyId: policy.id,
                    policyNumber: policy.policyNumber,
                    insurerName: policy.insurerName,
                    lineOfBusiness: policy.lineOfBusiness,
                    daysUntilExpiry,
                })
                break
            case 'expired':
                summary.expiredCount++
                break
            case 'action_needed':
                summary.actionNeededCount++
                break
            case 'cancelled':
                summary.cancelledCount++
                break
        }

        // Sum premiums (only for active and expiring soon)
        if ((status === 'active' || status === 'expiring_soon') && policy.premiumAmount) {
            summary.totalPremium += Number(policy.premiumAmount)
        }
    })

    // Sort upcoming renewals by days until expiry
    summary.upcomingRenewals.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)

    return summary
}
