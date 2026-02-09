type PremiumPolicyLike = {
    id: string
    policyNumber?: string | null
    status?: string | null
    endDate?: string | Date | null
    premiumAmount?: number | null
}

/**
 * Footprint should reflect only currently active economic exposure:
 * - exclude analyzing policies
 * - exclude expired policies
 * - deduplicate same policy number uploads
 */
export function calculatePremiumFootprint(policies: PremiumPolicyLike[], now = new Date()): number {
    const seenPolicyNumbers = new Set<string>()

    return policies.reduce((sum, policy) => {
        if (!policy || (policy.status || '').toLowerCase() === 'analyzing') return sum

        if (policy.endDate) {
            const endDate = new Date(policy.endDate)
            if (!Number.isNaN(endDate.getTime()) && endDate < now) {
                return sum
            }
        }

        const normalizedPolicyNumber = (policy.policyNumber || '').trim().toLowerCase()
        if (normalizedPolicyNumber) {
            if (seenPolicyNumbers.has(normalizedPolicyNumber)) {
                return sum
            }
            seenPolicyNumbers.add(normalizedPolicyNumber)
        }

        return sum + Number(policy.premiumAmount || 0)
    }, 0)
}

