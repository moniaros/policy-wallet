/** Policy-specific sections require an exact source. A shared branch is not provenance. */
export function recommendationsForPolicy<T extends { sourcePolicyId?: string | null }>(
    recommendations: readonly T[], policyId: string,
): T[] {
    return policyId ? recommendations.filter(item => item.sourcePolicyId === policyId) : []
}
