/**
 * Zod mirrors of the entitlement-limit interfaces.
 *
 * Shared by the plan-catalog loader (validate Plan.entitlements at read time,
 * fall back to plan-defaults on failure) and the /admin/plans action (reject
 * malformed input at write time). `.strict()` on purpose: an unknown key means
 * the row is NOT in canonical shape, and the read path must fail closed to the
 * code defaults rather than half-apply it.
 *
 * CLIENT-SAFE: zod only.
 */

import { z } from "zod"
import type {
    AgentEntitlementLimits,
    EntitlementLimits,
} from "@/types/subscription-entitlements"

/** Numeric limit: non-negative integer, null = unlimited. */
const limit = z.number().int().min(0).nullable()

export const EntitlementLimitsSchema = z
    .object({
        policies: limit,
        aiAnalysisPerMonth: limit,
        questionsPerDay: limit,
        gapAnalysisPerDay: limit,
        monthlyTokenBudget: limit,
        notifications: z.boolean(),
        advancedAnalytics: z.boolean(),
        agentCollaboration: z.boolean(),
        interactiveQA: z.boolean(),
        analysisComparison: z.boolean(),
        portfolioGapView: z.boolean(),
        priorityQueue: z.boolean(),
        savingsReportExport: z.boolean(),
    })
    .strict()

export const AgentEntitlementLimitsSchema = z
    .object({
        maxCustomers: limit,
        maxPoliciesPerCustomer: limit,
        aiAnalysesPerMonth: limit,
        monthlyTokenBudget: limit,
        collaborationThreads: z.boolean(),
        questionnaireTemplates: limit,
        brandedPortal: z.boolean(),
        pipelineAnalytics: z.boolean(),
        renewalAutomation: z.boolean(),
        commissionTracking: z.boolean(),
        bulkImportLimit: limit,
        apiAccess: z.boolean(),
        teamMembers: limit,
        portfolioGapView: z.boolean(),
        analysisComparison: z.boolean(),
        savingsReportExport: z.boolean(),
        brandedReport: z.boolean(),
        priorityQueue: z.boolean(),
        crossSellIntelligence: z.boolean(),
        proposalFlow: z.boolean(),
        documentRequestFlow: z.boolean(),
        sharedPolicyRoom: z.boolean(),
        asyncMessaging: z.boolean(),
        privateNotes: z.boolean(),
    })
    .strict()

// ── Compile-time parity: schema output ≡ TS interface (both directions).
// A field added to one side without the other fails type-check here.
type _B2cFromSchema = z.infer<typeof EntitlementLimitsSchema>
type _AgentFromSchema = z.infer<typeof AgentEntitlementLimitsSchema>
const _b2cCovers: EntitlementLimits = {} as _B2cFromSchema
const _b2cExact: _B2cFromSchema = {} as EntitlementLimits
const _agentCovers: AgentEntitlementLimits = {} as _AgentFromSchema
const _agentExact: _AgentFromSchema = {} as AgentEntitlementLimits
void _b2cCovers
void _b2cExact
void _agentCovers
void _agentExact
