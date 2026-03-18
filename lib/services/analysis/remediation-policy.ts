import type { PolicyAnalysisStepKey } from "./token-budget-estimator"

const CRITICAL_STEPS = new Set<PolicyAnalysisStepKey>([
    "document_load_and_validation",
    "metadata_extraction_and_verification",
    "persistence_and_finalize",
])

const DEGRADABLE_STEPS = new Set<PolicyAnalysisStepKey>([
    "plain_language_translation",
    "coverage_mapping",
    "gap_detection",
    "savings_detection",
    "checklist_scoring_and_actions",
])

function parseFlag(value: string | undefined, defaultValue = false): boolean {
    if (!value) return defaultValue
    const normalized = value.trim().toLowerCase()
    return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on"
}

function hashUserToPercent(userId: string): number {
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
        hash = (hash * 31 + userId.charCodeAt(i)) % 10000
    }
    return hash % 100
}

function isInternalUser(roles: string | undefined): boolean {
    if (!roles) return false
    return roles
        .split(",")
        .map((r) => r.trim().toLowerCase())
        .some((r) => r === "admin" || r === "internal")
}

function resolveCanaryPercent(mode: string | undefined): number {
    const normalized = (mode || "off").trim().toLowerCase()
    if (normalized === "100" || normalized === "all") return 100
    if (normalized === "50") return 50
    if (normalized === "10") return 10
    if (normalized === "internal") return -1
    return 0
}

function isInCanary(userId: string, roles: string | undefined, mode: string | undefined): boolean {
    const percent = resolveCanaryPercent(mode)
    if (percent === 0) return false
    if (percent === -1) return isInternalUser(roles)
    return hashUserToPercent(userId) < percent
}

export function isCriticalStep(step: PolicyAnalysisStepKey): boolean {
    return CRITICAL_STEPS.has(step)
}

export function isDegradableStep(step: PolicyAnalysisStepKey): boolean {
    return DEGRADABLE_STEPS.has(step)
}

export function isOpenAIFailoverEnabled(userId: string, roles: string | undefined): boolean {
    if (!parseFlag(process.env.FF_AI_FAILOVER_OPENAI, false)) return false
    return isInCanary(userId, roles, process.env.FF_AI_REMEDIATION_CANARY_MODE)
}

export function isDegradedCompletionEnabled(userId: string, roles: string | undefined): boolean {
    if (!parseFlag(process.env.FF_AI_DEGRADED_COMPLETION, true)) return false
    return isInCanary(userId, roles, process.env.FF_AI_REMEDIATION_CANARY_MODE)
}

export function isRemediationAlertingEnabled(userId: string, roles: string | undefined): boolean {
    if (!parseFlag(process.env.FF_AI_REMEDIATION_ALERTS, false)) return false
    return isInCanary(userId, roles, process.env.FF_AI_REMEDIATION_CANARY_MODE)
}

export function isFullFailoverAllowed(userId: string, roles: string | undefined): boolean {
    if (!isInCanary(userId, roles, process.env.FF_AI_REMEDIATION_CANARY_MODE)) return false
    return parseFlag(process.env.AI_ALLOW_FULL_FAILOVER, true)
}
