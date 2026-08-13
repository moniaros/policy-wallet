/**
 * What the analysis pipeline is allowed to do when a step fails.
 *
 * These five predicates used to read `process.env` directly. They now read the
 * feature-flag layer (lib/flags/config.ts), which resolves DB row → environment
 * variable → the default declared in lib/flags/registry.ts. With no row and no
 * database, every answer below is byte-for-byte what it was when these were env
 * reads — the flags table is an override layer, not a replacement.
 *
 * They are async for that reason. `getFlags()` is cached per request and never
 * throws, so the three calls the orchestrator makes in a row cost one query at
 * most, and a database outage degrades to environment variables rather than to
 * an exception on the remediation path.
 */

import { flagAppliesTo, getFlags, type FlagState } from "@/lib/flags/config"
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

export function isCriticalStep(step: PolicyAnalysisStepKey): boolean {
    return CRITICAL_STEPS.has(step)
}

export function isDegradableStep(step: PolicyAnalysisStepKey): boolean {
    return DEGRADABLE_STEPS.has(step)
}

/**
 * Every remediation behaviour is gated by BOTH its own switch and the shared
 * canary audience, which is why each predicate asks two questions. `off` on the
 * audience disables remediation wholesale regardless of the individual
 * switches — the single lever to pull when the failover path itself is the
 * problem.
 */
function gatedBy(
    flags: FlagState,
    key: string,
    userId: string,
    roles: string | undefined
): boolean {
    if (!flags.flags[key]?.enabled) return false
    return flagAppliesTo(flags, "ai.remediation_canary", userId, roles)
}

export async function isOpenAIFailoverEnabled(
    userId: string,
    roles: string | undefined
): Promise<boolean> {
    return gatedBy(await getFlags(), "ai.failover_openai", userId, roles)
}

export async function isAnthropicFailoverEnabled(
    userId: string,
    roles: string | undefined
): Promise<boolean> {
    // A credential, not a flag: no switch can conjure an API key, so this stays
    // an environment read and is deliberately absent from the registry.
    if (!process.env.ANTHROPIC_API_KEY) return false
    return flagAppliesTo(await getFlags(), "ai.remediation_canary", userId, roles)
}

export async function isDegradedCompletionEnabled(
    userId: string,
    roles: string | undefined
): Promise<boolean> {
    return gatedBy(await getFlags(), "ai.degraded_completion", userId, roles)
}

export async function isRemediationAlertingEnabled(
    userId: string,
    roles: string | undefined
): Promise<boolean> {
    return gatedBy(await getFlags(), "ai.remediation_alerts", userId, roles)
}

export async function isFullFailoverAllowed(
    userId: string,
    roles: string | undefined
): Promise<boolean> {
    return gatedBy(await getFlags(), "ai.full_failover", userId, roles)
}
