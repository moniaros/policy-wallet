"use server"

import { hasPasswordCredential, passwordPresence } from "@/lib/services/credential-signals"
import { storedDocumentLabel } from "@/lib/wallet/document-label"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { emit } from "@/lib/notifications/dispatch"
import { notifyCounterparty } from "@/lib/notifications"
import { normalizeBranch } from "@/lib/insurance/taxonomy"
import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { redirect } from "next/navigation"
import {
    ActivationStatus,
    AccessScope,
    InteractionType,
    OpportunityStatus,
    Priority,
    Customer,
    DashboardSummary,
    Permission
} from "@/components/agent/types"



import { AIServiceFactory, getAIService } from "@/lib/services/ai/ai-service.factory";
import { CustomerService } from "@/lib/services/customer.service";
import { customerResolutionService } from "@/lib/services/customer-resolution.service";
import { normalizeTaxId } from "@/lib/identity/tax-id";
import { collaborationService } from "@/lib/services/collaboration.service";
import { sendPolicyInviteEmail, sendAiConsentRequestEmail } from "@/lib/email/invite-emails";
import { absoluteUrl } from "@/lib/seo/site";
import { getTranslations } from "@/lib/i18n";
import { daysFromNow, INVITE_EXPIRY_DAYS } from "@/lib/constants/time";
import { isAgentRole } from "@/lib/auth/require-agent";
import { hasAnyRole } from "@/lib/api-auth";
import { validateUploadFile, sanitizeDisplayName, REJECTION_MESSAGES } from "@/lib/security/file-upload";
import { buildCloseFields, recordStageTransition } from "@/lib/agent/opportunity-lifecycle";
import { normalizeEmail } from "@/lib/identity/normalize-email";
import { isSyntheticNoEmailAddress } from "@/lib/identity/synthetic-email";
import { isPhantomCustomer } from "@/lib/agent-consent";
import { ENDED_RELATIONSHIP_STATUSES } from "@/lib/agent-visibility";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
    AddCustomerManuallyInput,
    AddPolicyForCustomerInput,
    AgentInviteInput,
    AgentPolicyInput,
    CommitDecisionInput,
    UpdateCustomerContactInput,
    customerEmailIdentity,
    validationFailure,
} from "@/lib/validations/agent-intake";

import type { Prisma } from "@prisma/client"
import { validateDocumentForIngestion, documentKindFor } from "@/lib/ingestion/document-gate"
import { ingestPolicyDocument } from "@/lib/ingestion/ingest-policy-document"
import { toValidatedAIDocument } from "@/lib/ingestion/validated-document"
import { FAMILY_DEFAULT_BRANCH, USER_RESOLVABLE_REVIEW_REASONS } from "@/lib/ingestion/types"
import { resolveUserLanguage } from "@/lib/i18n/resolve-language"
const customerService = new CustomerService(db);

/**
 * Every failure an action swallows is reported here — Sentry (tagged by
 * action + agent, ids in `extra`) and the structured logger. A bare
 * `console.error(e)` in a server action is invisible in production: the
 * catches in this file used to be exactly that, so a storage outage or a
 * Prisma error surfaced only as "Failed to add policy" in a modal.
 * Not exported: a "use server" export is a public endpoint.
 */
async function reportActionFailure(
    action: string,
    error: unknown,
    context: { agentId?: string; policyId?: string; customerId?: string; opportunityId?: string } = {},
) {
    logger("error", `[agent/actions] ${action} failed`, {
        action,
        ...context,
        error: error instanceof Error ? error.message : String(error),
    })
    try {
        const Sentry = await import("@sentry/nextjs")
        Sentry.captureException(error, {
            tags: { action, agentId: context.agentId ?? "anonymous" },
            extra: {
                policyId: context.policyId,
                customerId: context.customerId,
                opportunityId: context.opportunityId,
            },
        })
    } catch (reportError) {
        // Reporting must never mask the failure being reported.
        logger("warn", "[agent/actions] Sentry capture failed", {
            action,
            error: reportError instanceof Error ? reportError.message : String(reportError),
        })
    }
}

/**
 * What happened to the analysis when an agent added a policy with a document.
 * Decided BEFORE the action answers — never a promise the deferred run may
 * break. `queued` is the only value under which a surface may say the
 * analysis is running.
 */
type AnalysisOutcome = 'queued' | 'blocked_quota' | 'blocked_consent' | 'none'

/**
 * Stamp a just-added policy the way the pipeline stamps a run its token gate
 * refused (orchestrator createRun / policy.service markAnalysisIncomplete):
 * `action_needed`, a retryable TOKEN_LIMIT_BLOCKED processingError the
 * wallet localises, and the document out of its pending spinner. The policy
 * itself stays — KEEP-AND-INFORM, never delete on a quota block.
 * Not exported: a "use server" export is a public endpoint.
 */
async function markPolicyAnalysisBlockedByQuota(policyId: string, reason: string) {
    const current = await db.policy.findUnique({
        where: { id: policyId },
        select: { acordData: true },
    })
    await db.policy.update({
        where: { id: policyId },
        data: {
            status: 'action_needed',
            acordData: {
                ...((current?.acordData as Record<string, unknown> | null) || {}),
                processingError: {
                    code: 'TOKEN_LIMIT_BLOCKED',
                    message: `Policy analysis did not start: ${reason}`,
                    retryable: true,
                    occurredAt: new Date().toISOString(),
                },
            },
        },
    })
    await db.policyDocument.updateMany({
        where: { policyId },
        data: { processingStatus: 'failed' },
    })
}

/**
 * AGENT DASHBOARD ACTIONS
 */

export async function getDashboardData() {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return null
    if (!isAgentRole(authResult.dbUser.roles)) return null

    const agentId = authResult.dbUser.id

    const [stats, priorities] = await Promise.all([
        customerService.getDashboardStats(agentId),
        customerService.getAgentPriorities(agentId)
    ]);

    return {
        summary: stats.summary,
        priorities: priorities
    }
}

/**
 * CUSTOMER MANAGEMENT
 */

export async function getCustomers(query?: string): Promise<Customer[]> {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return []
    if (!isAgentRole(authResult.dbUser.roles)) return []

    const agentId = authResult.dbUser.id

    // Use a large limit for now to mimic "all" without changing UI signature yet
    const result = await customerService.getCustomers(agentId, {
        search: query,
        status: undefined,
        limit: 100
    })

    return result.data.map((c: any) => {
        const nameParts = (c.name || 'Unknown').split(' ')
        const firstName = nameParts[0]
        const lastName = nameParts.slice(1).join(' ') || ''

        return {
            id: c.id,
            relationshipId: c.relationshipId,
            name: firstName,
            surname: lastName,
            email: c.email || '',
            // The address above is a synthetic placeholder when this is true
            // (D3) — the list shows «Χωρίς email» and offers to add one.
            contactEmailMissing: c.contactEmailMissing === true,
            phone: c.phoneNumber || '',
            activationStatus: (c.status === 'pending_activation' ? 'invited' : c.status === 'active' ? 'activated' : 'inactive') as ActivationStatus,
            // The raw pair the pill should really be derived from: a
            // pending_activation row is "invited" only when an invite went
            // out (activationStatus 'invited'), not merely because the agent
            // added the customer ('no_policies' / 'not_invited').
            relationshipStatus: c.status,
            relationshipActivationStatus: c.activationStatus,
            accessScope: 'portfolio' as AccessScope,
            permissions: ['view', 'upload'] as any,
            policyCount: c.policyCount || 0,
            openGapsCount: c.openOpportunities || 0, // Approximate using open ops
            lastInteractionDate: c.lastInteraction ? new Date(c.lastInteraction).toISOString() : new Date(c.joinedAt).toISOString(),
            createdAt: new Date(c.joinedAt).toISOString()
        }
    })
}

export async function getCustomerProfile(customerId: string): Promise<Customer | null> {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return null
    if (!isAgentRole(authResult.dbUser.roles)) return null
    // A missing id must be "not found", never "whichever customer sorts
    // first" — the service refuses it too, but refuse here before the read.
    if (typeof customerId !== "string" || customerId.length === 0) return null

    try {
        const profile = await customerService.getCustomerProfile(authResult.dbUser.id, customerId)

        const nameParts = (profile.customer.name || 'Unknown').split(' ')

        // Build real interaction timeline from collaboration messages + invite events
        const [messages, invites] = await Promise.all([
            db.collaborationMessage.findMany({
                where: {
                    thread: { relationshipId: profile.relationship.id },
                },
                orderBy: { createdAt: 'desc' },
                take: 10,
                select: { id: true, messageType: true, body: true, createdAt: true },
            }),
            db.invite.findMany({
                where: {
                    inviterUserId: authResult.dbUser.id,
                    inviteeEmail: profile.customer.email ?? undefined,
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: { id: true, createdAt: true, consumedAt: true },
            }),
        ])

        const interactions: Array<{ id: string; type: InteractionType; message: string; timestamp: string }> = []

        for (const inv of invites) {
            interactions.push({
                id: inv.id,
                type: 'invite_sent',
                message: inv.consumedAt ? 'Invitation accepted.' : 'Digital wallet invitation dispatched.',
                timestamp: inv.createdAt.toISOString(),
            })
        }

        for (const msg of messages) {
            interactions.push({
                id: msg.id,
                type: msg.messageType === 'note' ? 'note_added' : 'message_sent',
                message: msg.body.length > 80 ? msg.body.slice(0, 80) + '...' : msg.body,
                timestamp: msg.createdAt.toISOString(),
            })
        }

        // Sort by most recent first
        interactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

        // Always include the relationship creation as the first event if no invites found
        if (invites.length === 0) {
            interactions.push({
                id: profile.relationship.id,
                type: 'relationship_created',
                message: 'Customer relationship established.',
                timestamp: profile.relationship.joinedAt.toISOString(),
            })
        }

        // Cross-sell analysis
        const { analyzePortfolioGaps, calculateCoverageScore } = await import("@/lib/services/cross-sell.service")
        const existingLines = [...new Set(profile.policies.map(p => (p.type || 'other').toLowerCase()))]
        const missingLines = analyzePortfolioGaps(existingLines)
        const coverageScore = calculateCoverageScore(existingLines)

        return {
            id: profile.customer.id,
            relationshipId: profile.relationship.id,
            name: nameParts[0],
            surname: nameParts.slice(1).join(' ') || '',
            email: profile.customer.email || '',
            contactEmailMissing: profile.customer.contactEmailMissing === true,
            phone: profile.customer.phone || '',
            activationStatus: (profile.relationship.status === 'pending_activation' ? 'invited' : profile.relationship.status === 'active' ? 'activated' : 'inactive') as ActivationStatus,
            relationshipStatus: profile.relationship.status,
            relationshipActivationStatus: profile.relationship.activationStatus,
            accessScope: 'portfolio',
            permissions: ['view', 'upload', 'suggest', 'message'],
            policyCount: profile.policies.length,
            openGapsCount: profile.policies.reduce((ts, p) => ts + p.gaps, 0),
            lastInteractionDate: profile.relationship.lastInteraction ? new Date(profile.relationship.lastInteraction).toISOString() : new Date(profile.relationship.joinedAt).toISOString(),
            createdAt: new Date(profile.relationship.joinedAt).toISOString(),
            crossSell: { existingLines, missingLines, coverageScore },
            policies: profile.policies.map(p => ({
                policyId: p.id,
                policyNumber: p.number,
                insurerName: p.insurer,
                lineOfBusiness: p.type as any,
                startDate: p.startDate ? new Date(p.startDate).toISOString() : new Date().toISOString(),
                endDate: new Date(p.expiresAt).toISOString(),
                // The service already returns the lifecycle status; this used
                // to hardcode 'active', so an expired policy showed as active
                // in the agent's client view.
                status: p.status as any,
                hasAnalysis: p.hasAnalysis,
                // Resolved by the service. Replaces `carPlate`, which this
                // mapper never set — so the plate line in ClientPoliciesTab
                // could not render for any client, on any policy.
                assetLabel: p.assetLabel ?? undefined,
                managedByAgent: p.createdByUserId === authResult.dbUser.id
            })),
            opportunities: (await (async () => {
                // Score all of this customer's opportunities in one batched pass.
                // Engagement + profile are per-customer, so per-opportunity
                // scoring re-fetched the same customer facts N times.
                let scores = new Map<string, { likelihood: "high" | "medium" | "low"; score: number }>()
                try {
                    const { scoreOpportunitiesBatch } = await import("@/lib/services/gap-engine/opportunity-scoring")
                    const scored = await scoreOpportunitiesBatch(profile.opportunities.map(o => o.id))
                    scores = new Map([...scored].map(([id, s]) => [id, { likelihood: s.likelihood, score: s.score }]))
                } catch (scoringError) {
                    // Best-effort enrichment: scoring is non-critical. On failure
                    // opportunities render without a conversion score.
                    logger("warn", "[agent/actions] opportunity scoring skipped", {
                        customerId,
                        error: scoringError instanceof Error ? scoringError.message : String(scoringError),
                    })
                }
                return profile.opportunities.map((o) => {
                    const scored = scores.get(o.id)
                    return {
                        opportunityId: o.id,
                        policyId: o.policyId || '',
                        gapId: o.gapInstanceId || '',
                        gapTitle: o.relatedGap || 'Coverage Gap',
                        severity: (o.severity || 'medium') as any,
                        status: o.status as OpportunityStatus,
                        nextActionDate: '',
                        notes: o.notes || '',
                        createdAt: new Date(o.createdAt).toISOString(),
                        conversionLikelihood: scored?.likelihood ?? null,
                        conversionScore: scored?.score ?? null,
                    }
                })
            })()),
            interactions
        }
    } catch (e) {
        // NOT_FOUND from the service is the normal "not your customer" outcome;
        // anything else is an incident that used to vanish into `return null`.
        if (!(e instanceof AppError && e.code === 'NOT_FOUND')) {
            await reportActionFailure("getCustomerProfile", e, { agentId: authResult.dbUser.id, customerId })
        }
        return null
    }
}

/**
 * ACTIONS
 */

/**
 * Log a discovery note against an opportunity (MEDIC blueprint §F/§K Now:
 * the note create-path). Writes CollaborationMessage{messageType:'note'} on the
 * opportunity's thread (lazily created), so the existing timeline renders it —
 * no new surface, no new table. AI qualification-suggest over notes is the
 * NEXT-slice item; this is only the honest capture path it will feed on.
 */
export async function logOpportunityNote(opportunityId: string, body: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "UNAUTHORIZED" }
    if (!isAgentRole(authResult.dbUser.roles)) return { error: "UNAUTHORIZED" }

    const trimmed = (body || "").trim()
    if (!trimmed) return { error: "NOTE_EMPTY" }
    if (trimmed.length > 4000) return { error: "NOTE_TOO_LONG" }

    const opp = await db.opportunity.findUnique({
        where: { id: opportunityId },
        select: {
            relationshipId: true,
            policyId: true,
            relationship: { select: { agentUserId: true } },
        },
    })
    if (!opp || opp.relationship?.agentUserId !== authResult.dbUser.id) {
        return { error: "OPPORTUNITY_NOT_FOUND" }
    }

    let thread = await db.collaborationThread.findFirst({
        where: { linkedOpportunityId: opportunityId },
        select: { id: true },
    })
    if (!thread) {
        thread = await db.collaborationThread.create({
            data: {
                relationshipId: opp.relationshipId,
                policyId: opp.policyId,
                subject: "Opportunity notes",
                category: "general",
                createdByUserId: authResult.dbUser.id,
                linkedOpportunityId: opportunityId,
            },
            select: { id: true },
        })
    }

    await db.collaborationMessage.create({
        data: {
            threadId: thread.id,
            senderUserId: authResult.dbUser.id,
            messageType: "note",
            body: trimmed,
            // Discovery notes are the agent's working record, not a message to
            // the customer.
            isPrivate: true,
        },
    })

    return { success: true }
}

/** Shared loader for the suggest/apply pair: the agent-owned opportunity's
 *  discovery notes (newest 20, oldest-first for reading order). */
async function loadOpportunityNotes(opportunityId: string, agentUserId: string) {
    const opp = await db.opportunity.findUnique({
        where: { id: opportunityId },
        select: {
            relationshipId: true,
            policyId: true,
            medic: true,
            relationship: { select: { agentUserId: true, policyholderUserId: true } },
            policy: {
                select: {
                    insurerName: true, policyNumber: true, lineOfBusiness: true,
                    startDate: true, endDate: true, premiumAmount: true, coverageSummary: true,
                },
            },
        },
    })
    if (!opp || opp.relationship?.agentUserId !== agentUserId) return null
    const thread = await db.collaborationThread.findFirst({
        where: { linkedOpportunityId: opportunityId },
        select: { id: true },
    })
    const notes = thread
        ? (
              await db.collaborationMessage.findMany({
                  where: { threadId: thread.id, messageType: 'note' },
                  select: { id: true, body: true },
                  orderBy: { createdAt: 'desc' },
                  take: 20,
              })
          ).reverse()
        : []
    return { opp, thread, notes }
}

/**
 * suggestQualification (MEDIC blueprint §I / §K Next): AI reads the logged
 * discovery notes and PROPOSES stakeholders/criteria/pain — each row carrying a
 * verbatim evidence snippet, mechanically dropped when the snippet is not in
 * the notes. Nothing is written here; the advisor accepts rows explicitly via
 * applyQualificationSuggestions.
 */
export async function suggestQualificationFromNotes(opportunityId: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "UNAUTHORIZED" }
    if (!isAgentRole(authResult.dbUser.roles)) return { error: "UNAUTHORIZED" }

    const loaded = await loadOpportunityNotes(opportunityId, authResult.dbUser.id)
    if (!loaded) return { error: "OPPORTUNITY_NOT_FOUND" }
    if (loaded.notes.length === 0) return { error: "NO_NOTES" }

    // Nothing reaches a model provider without AI-processing consent — on
    // every path. The notes are the agent's own text about a customer; the
    // agent's own recorded consent is the lawful basis for sending them
    // (D1). Checked before the prompt is built.
    if (!authResult.dbUser.aiProcessingConsentVersion) return { error: "AI_CONSENT_REQUIRED" }

    const { getAIService } = await import("@/lib/services/ai")
    const aiService = getAIService()
    if (!aiService.isAvailable()) return { error: "AI_NOT_CONFIGURED" }

    const { buildSuggestQualificationPrompt, parseSuggestions, filterByEvidence, estimateSuggestTokens } =
        await import("@/lib/medic/suggest")

    // Cap the notes payload — 20 notes × 4000 chars is already generous.
    const notes = loaded.notes.map((n) => ({ id: n.id, body: n.body.slice(0, 4000) }))
    const prompt = buildSuggestQualificationPrompt(notes)

    // Abuse/cost cap: this is a real, billable LLM call over up to 80K chars of
    // notes, and it can be re-run on the same opportunity forever. Same policy
    // as scanPolicyDocument — the button was previously unlimited.
    const { rateLimit } = await import("@/lib/rate-limit")
    const suggestLimit = await rateLimit(
        authResult.dbUser.id,
        20,
        60 * 60 * 1000,
        `medic-suggest:${authResult.dbUser.id}`
    )
    if (!suggestLimit.success) return { error: "RATE_LIMITED" }

    // Durable backstop. Production runs with RATELIMIT_ALLOW_LOCAL=1 and no
    // Upstash credentials, so the limiter above is per-instance in-memory and
    // multiplies by the instance count on Vercel. Counting our own audit rows
    // is instance-independent — the same trick the B2C Q&A daily limit uses.
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentSuggestions = await db.activityLog.count({
        where: {
            adminUserId: authResult.dbUser.id,
            actionType: "MEDIC_SUGGESTION_REQUESTED",
            timestamp: { gte: hourAgo },
        },
    })
    if (recentSuggestions >= 20) return { error: "RATE_LIMITED" }

    // Budget gate: reusing the metered askQuestion path RECORDS usage, it does
    // not GATE it — so without this an agent past their token budget kept
    // spending. Estimate from the real payload rather than a flat guess.
    const { canUserUseTokens } = await import("@/lib/token-tracking")
    const estimatedTokens = estimateSuggestTokens(prompt)
    const budget = await canUserUseTokens(authResult.dbUser.id, estimatedTokens)
    if (!budget.allowed && !hasAnyRole(authResult.dbUser.roles, ["admin"])) {
        return { error: "TOKEN_LIMIT_BLOCKED" }
    }

    // Reuse the metered Q&A path. Metadata comes from the linked policy when
    // present; placeholder metadata otherwise — the prompt is self-contained
    // and instructs the model to ignore the Q&A framing.
    const p = loaded.opp.policy
    const metadata = {
        insurerName: p?.insurerName ?? "—",
        policyNumber: p?.policyNumber ?? "—",
        lineOfBusiness: p?.lineOfBusiness ?? "other",
        startDate: p?.startDate ?? new Date(0),
        endDate: p?.endDate ?? new Date(0),
        premiumAmount: p?.premiumAmount ? Number(p.premiumAmount) : null,
        coverageSummary: p?.coverageSummary ?? null,
    }

    let raw: string
    try {
        raw = await aiService.askQuestion(null, metadata, prompt, { userId: authResult.dbUser.id })
    } catch (e) {
        await reportActionFailure("suggestQualificationFromNotes", e, { agentId: authResult.dbUser.id, opportunityId })
        return { error: "SUGGESTION_FAILED" }
    }

    // Auditable spend: without this the call was invisible — no activity row,
    // so "who ran this and how often" had no answer. userId only, no email
    // (GDPR audit M3: stop putting identifiers in log descriptions).
    try {
        await db.activityLog.create({
            data: {
                adminUserId: authResult.dbUser.id,
                adminEmail: "",
                actionType: "MEDIC_SUGGESTION_REQUESTED",
                description: `Qualification suggestion generated for opportunity ${opportunityId}`,
                targetUserId: loaded.opp.relationship?.policyholderUserId ?? null,
                metadata: { opportunityId, noteCount: notes.length, estimatedTokens },
            },
        })
    } catch (logError) {
        // Never fail the action on a logging error — but do not lose it either.
        logger("warn", "[agent/actions] MEDIC_SUGGESTION_REQUESTED audit row failed", {
            agentId: authResult.dbUser.id,
            error: logError instanceof Error ? logError.message : String(logError),
        })
    }

    const parsed = parseSuggestions(raw)
    if (!parsed) return { error: "SUGGESTION_UNPARSEABLE" }
    const notesText = notes.map((n) => n.body).join("\n")
    const suggestions = filterByEvidence(parsed, notesText)
    return { success: true, suggestions }
}

/**
 * Apply the rows the advisor ACCEPTED. The payload is untrusted client input:
 * re-validated by schema AND re-filtered against the actual notes server-side,
 * so a tampered payload cannot smuggle unevidenced rows in. Merge is
 * append-only and can never touch the pain validation ladder.
 */
export async function applyQualificationSuggestions(opportunityId: string, accepted: unknown) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "UNAUTHORIZED" }
    if (!isAgentRole(authResult.dbUser.roles)) return { error: "UNAUTHORIZED" }

    const loaded = await loadOpportunityNotes(opportunityId, authResult.dbUser.id)
    if (!loaded) return { error: "OPPORTUNITY_NOT_FOUND" }

    const { validateAcceptedSuggestions, filterByEvidence, mergeAcceptedSuggestions } =
        await import("@/lib/medic/suggest")
    const { casUpdateOpportunityMedic, medicIoFor } = await import("@/lib/medic/cas")

    const validated = validateAcceptedSuggestions(accepted)
    if (!validated) return { error: "INVALID_SUGGESTIONS" }
    const notesText = loaded.notes.map((n) => n.body).join("\n")
    const evidenced = filterByEvidence(validated, notesText)

    // CAS: merge against the freshest snapshot so a concurrent € patch or
    // confirm-sync between our read and write is never overwritten wholesale.
    const result = await casUpdateOpportunityMedic(medicIoFor(db), opportunityId, (medic) =>
        mergeAcceptedSuggestions(medic, evidenced)
    )
    if (result.status !== 'applied') return { error: "CONFLICT" }
    const { medic, medicScore } = result

    // Audit trail (§I): what was applied, on the opportunity's own thread.
    if (loaded.thread) {
        await db.collaborationMessage.create({
            data: {
                threadId: loaded.thread.id,
                senderUserId: authResult.dbUser.id,
                messageType: "system_event",
                isPrivate: true,
                body: `Qualification updated from notes: ${evidenced.stakeholders.length} stakeholder(s), ${evidenced.criteria.length} criteria${evidenced.pain ? ", pain summary" : ""}. Score → ${medicScore}.`,
            },
        })
    }

    return { success: true, medic, medicScore }
}

/**
 * Advisor edits to the two qualification fields no automation can honestly
 * supply (blueprint §F inline fields): the Metrics € value-at-risk and the
 * stakeholder map (add / mark identified). Whitelisted patch only — the pain
 * ladder, criteria, and process keep their own write paths.
 */
export async function patchOpportunityMedic(opportunityId: string, patch: unknown) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "UNAUTHORIZED" }
    if (!isAgentRole(authResult.dbUser.roles)) return { error: "UNAUTHORIZED" }

    const opp = await db.opportunity.findUnique({
        where: { id: opportunityId },
        select: { relationship: { select: { agentUserId: true } } },
    })
    if (!opp || opp.relationship?.agentUserId !== authResult.dbUser.id) {
        return { error: "OPPORTUNITY_NOT_FOUND" }
    }

    const { validateMedicPatch, applyMedicPatch } = await import("@/lib/medic/patch")
    const { casUpdateOpportunityMedic, medicIoFor } = await import("@/lib/medic/cas")

    const validated = validateMedicPatch(patch)
    if (!validated) return { error: "INVALID_PATCH" }

    // CAS: a concurrent writer (confirm-sync, apply-suggestions) between our
    // read and write would otherwise have its fields overwritten wholesale.
    const result = await casUpdateOpportunityMedic(medicIoFor(db), opportunityId, (medic) =>
        applyMedicPatch(medic, validated)
    )
    if (result.status !== 'applied') return { error: "CONFLICT" }
    return { success: true, medic: result.medic, medicScore: result.medicScore }
}

export async function updateOpportunityStatus(
    opportunityId: string,
    status: OpportunityStatus,
    notes?: string,
    nextActionDate?: string,
    outcome?: string,
    outcomeNotes?: string
) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "UNAUTHORIZED" }
    if (!isAgentRole(authResult.dbUser.roles)) return { error: "UNAUTHORIZED" }

    // Verify ownership
    const oppAuth = await db.opportunity.findUnique({
        where: { id: opportunityId },
        select: {
            relationshipId: true,
            status: true,
            relationship: { select: { agentUserId: true } }
        }
    })

    if (!oppAuth || oppAuth.relationship?.agentUserId !== authResult.dbUser.id) {
        return { error: "OPPORTUNITY_NOT_FOUND" }
    }

    const closeFields = buildCloseFields(status, outcome, outcomeNotes)

    // The status write and its history row must land together — a transition the
    // log missed is indistinguishable from one that never happened.
    await db.$transaction(async (tx) => {
        await tx.opportunity.update({
            where: { id: opportunityId },
            data: {
                status,
                notes,
                nextActionAt: nextActionDate ? new Date(nextActionDate) : undefined,
                ...closeFields,
            }
        })

        await recordStageTransition(tx, {
            opportunityId,
            fromStatus: oppAuth.status,
            toStatus: status,
            changedByUserId: authResult.dbUser.id,
            outcome: closeFields.outcome,
            // Snapshot the note as it stood at this transition; `notes` itself is
            // a live field the next edit will overwrite.
            note: notes ?? null,
        })
    })

    if (oppAuth.relationshipId) {
        await db.customerRelationship.update({
            where: { id: oppAuth.relationshipId },
            data: { lastInteractionAt: new Date() }
        })
    }

    revalidatePath("/customers")
    revalidatePath("/opportunities")
    return { success: true }
}

export async function inviteCustomer(formData: FormData) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { success: false, error: "UNAUTHORIZED" }
    if (!isAgentRole(authResult.dbUser.roles)) return { success: false, error: "UNAUTHORIZED" }

    const email = formData.get("email")
    if (typeof email !== "string" || email.trim().length === 0) {
        return { success: false, error: "VALIDATION_ERROR" }
    }

    return await createAgentInvite(email, "portfolio")
}

export async function createAgentInvite(email: string, scope: AccessScope) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { success: false, error: "UNAUTHORIZED" }
    if (!isAgentRole(authResult.dbUser.roles)) return { success: false, error: "UNAUTHORIZED" }
    const agentId = authResult.dbUser.id

    // A customer who has NO email (D3) carries a synthetic, non-deliverable
    // address: nothing can be sent to it, so there is nothing to invite with.
    // Refused before the parse (the schema would call the address invalid,
    // which is the wrong story) and before any write — the UI offers «add an
    // email» instead.
    if (isSyntheticNoEmailAddress(email)) {
        return { success: false, error: "CUSTOMER_NOT_CONTACTABLE" }
    }

    // Trim + lowercase + NFC and a format check BEFORE anything is written: an
    // unnormalised address here minted a phantom user that the customer's own
    // signup (which lowercases) could never find, so the relationship never
    // activated.
    const parsedInput = AgentInviteInput.safeParse({ email, scope })
    if (!parsedInput.success) return validationFailure(parsedInput.error)
    // The schema already normalised; restated on the key the lookup and the
    // write below actually use, so the single-path guard can see it here.
    const inviteeEmail = normalizeEmail(parsedInput.data.email)
    const inviteScope = parsedInput.data.scope

    // Sends an email — cap per agent so re-inviting an existing customer (which
    // doesn't consume the customer count) can't be used to email-bomb an address.
    const { rateLimit } = await import("@/lib/rate-limit")
    const inviteLimit = await rateLimit(agentId, 20, 60 * 60 * 1000, `agent-invite:${agentId}`)
    if (!inviteLimit.success) {
        return { success: false, error: "RATE_LIMITED" }
    }

    // Check customer limit
    const { canAgentAddCustomer } = await import("@/lib/subscription-entitlements")
    const customerCheck = await canAgentAddCustomer(agentId)
    if (!customerCheck.allowed) {
        return {
            success: false,
            error: "CUSTOMER_LIMIT_REACHED",
            reason: customerCheck.reason,
            current: customerCheck.current,
            limit: customerCheck.limit,
        }
    }

    // 1. Ensure User exists (Placeholder if new)
    let customer = await db.user.findUnique({
        where: { email: inviteeEmail }
    })

    if (!customer) {
        customer = await db.user.create({
            data: {
                email: inviteeEmail,
                name: inviteeEmail.split('@')[0], // Placeholder name
                roles: "policyholder"
            }
        })
    }

    // 2. Ensure Relationship exists — and never resurrect one that ended.
    // The upsert's update arm used to set the row back to pending_activation,
    // which silently re-opened the upload-visibility arm (lib/agent-visibility.ts)
    // that a termination had closed. Only the customer can reconnect.
    const existingRelationship = await db.customerRelationship.findUnique({
        where: {
            agentUserId_policyholderUserId: {
                agentUserId: agentId,
                policyholderUserId: customer.id
            }
        },
        select: { status: true, activationStatus: true },
    })
    if (existingRelationship?.status === 'terminated') {
        return { success: false, error: "RELATIONSHIP_TERMINATED" }
    }

    // An existing row keeps its status — the agent's invite is not the
    // customer's acceptance. Only the stage marker moves, and only forward
    // from "never invited" on a living relationship.
    const markInvited =
        existingRelationship !== null &&
        !(ENDED_RELATIONSHIP_STATUSES as readonly string[]).includes(existingRelationship.status) &&
        (existingRelationship.activationStatus === 'no_policies' || existingRelationship.activationStatus === 'not_invited')

    await db.customerRelationship.upsert({
        where: {
            agentUserId_policyholderUserId: {
                agentUserId: agentId,
                policyholderUserId: customer.id
            }
        },
        update: markInvited ? { activationStatus: 'invited' } : {},
        create: {
            agentUserId: agentId,
            policyholderUserId: customer.id,
            status: 'pending_activation',
            activationStatus: 'invited'
        }
    })

    // 3. Create Invite
    const invite = await db.invite.create({
        data: {
            inviterUserId: agentId,
            inviteeEmail,
            token: crypto.randomUUID().replace(/-/g, ''),
            inviteType: 'signup',
            relationshipType: 'agent_client',
            scope: inviteScope,
            expiresAt: daysFromNow(INVITE_EXPIRY_DAYS)
        }
    })

    // sendEmail returns {success:false} instead of throwing — a swallowed
    // failure here meant the invitee never got the link while the agent saw
    // "sent". Surface delivery state + a copyable fallback link instead.
    let emailDelivered = false
    try {
        const emailResult = await sendPolicyInviteEmail({
            to: inviteeEmail,
            token: invite.token,
            inviterName: authResult.dbUser.name || authResult.dbUser.email,
            language: resolveUserLanguage(authResult.dbUser.preferredLanguage),
        })
        emailDelivered = emailResult.success
    } catch (error) {
        await reportActionFailure("createAgentInvite.sendEmail", error, { agentId, customerId: customer.id })
    }

    revalidatePath("/dashboard/agent")
    revalidatePath("/customers")
    revalidatePath(`/customers/${customer.id}`)
    return {
        success: true,
        inviteId: invite.id,
        token: invite.token,
        emailDelivered,
        inviteLink: emailDelivered ? undefined : absoluteUrl(`/invite/${invite.token}`),
    }
}

export async function addCustomerManually(data: {
    name: string;
    surname: string;
    /** Optional (D3): without it a valid ΑΦΜ + Greek mobile identify the customer. */
    email?: string;
    phone: string;
    taxId?: string;
    policy?: {
        insurerName: string;
        policyNumber: string;
        lineOfBusiness: string;
        startDate: string;
        endDate: string;
        premiumAmount?: number;
    }
}) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { success: false, error: "UNAUTHORIZED" }
    if (!isAgentRole(authResult.dbUser.roles)) return { success: false, error: "UNAUTHORIZED" }

    const agentId = authResult.dbUser.id

    // Validate BEFORE any write. `new Date('')`, a NaN premium, a free-text
    // line of business and an address with no `@` all used to reach Prisma.
    const parsed = AddCustomerManuallyInput.safeParse(data)
    if (!parsed.success) return validationFailure(parsed.error)
    const input = parsed.data

    try {
        // 0. Subscription gate — same cap the invite/bulk paths enforce
        const { canAgentAddCustomer } = await import("@/lib/subscription-entitlements")
        const customerGate = await canAgentAddCustomer(agentId)
        if (!customerGate.allowed) {
            return {
                success: false,
                error: "CUSTOMER_LIMIT_REACHED",
                reason: customerGate.reason,
                current: customerGate.current,
                limit: customerGate.limit,
            }
        }

        // 1. Customer (+ phantom user), relationship, first policy and its
        // management grant land in ONE transaction. The service is bound to
        // the transaction client, so nothing inside queries the outer pool.
        // No email (D3): the row is keyed on the synthetic address the ΑΦΜ
        // derives and flagged, so nothing is ever sent to it.
        const contact = customerEmailIdentity(input)
        const committed = await db.$transaction(async (tx) => {
            const txCustomerService = new CustomerService(tx as unknown as typeof db)
            const relationship = await txCustomerService.createCustomer(agentId, {
                email: contact.email,
                contactEmailMissing: contact.contactEmailMissing,
                name: `${input.name} ${input.surname}`.trim(),
                phoneNumber: input.phone,
                taxId: input.taxId,
            })

            let policyId: string | undefined
            if (input.policy) {
                const created = await tx.policy.create({
                    data: {
                        ownerUserId: relationship.policyholderUserId,
                        createdByUserId: agentId,
                        insurerName: input.policy.insurerName,
                        policyNumber: input.policy.policyNumber,
                        lineOfBusiness: input.policy.lineOfBusiness,
                        startDate: new Date(input.policy.startDate),
                        endDate: new Date(input.policy.endDate),
                        coverageEndDate: new Date(input.policy.endDate),
                        premiumAmount: input.policy.premiumAmount,
                        status: 'active'
                    }
                })
                await tx.accessGrant.create({
                    data: {
                        granterUserId: relationship.policyholderUserId,
                        granteeUserId: agentId,
                        scope: `policy:${created.id}`,
                        permissions: 'manage',
                        status: 'active',
                    }
                })
                policyId = created.id
            }

            return {
                customerId: relationship.policyholderUserId,
                taxIdIgnored: relationship.taxIdIgnored === true,
                policyId,
            }
        })

        revalidatePath("/customers")
        return { success: true, ...committed }
    } catch (e) {
        // Expected conflicts (e.g. "customer already exists") are a normal user
        // outcome, not an incident — don't spam the error dashboards at scale.
        if (e instanceof AppError && e.code === 'CONFLICT') {
            return { success: false, error: "CUSTOMER_EXISTS" }
        }
        if (e instanceof AppError && e.code === 'VALIDATION') {
            return { success: false, error: "VALIDATION_ERROR" }
        }
        await reportActionFailure("addCustomerManually", e, { agentId })
        return { success: false, error: "ADD_CUSTOMER_FAILED" }
    }
}

export async function addPolicyForCustomer(data: {
    customerId: string;
    policy: {
        insurerName: string;
        policyNumber: string;
        lineOfBusiness: string;
        startDate: string;
        endDate: string;
        premiumAmount?: number;
        premiumCurrency?: string;
        carPlate?: string;
    };
    /** Agent affirms the customer consented to AI processing (phantom owners). */
    attestedAiConsent?: boolean;
    /** Agent saw the duplicate warning and chose to add the policy anyway. */
    confirmDuplicate?: boolean;
    /** The agent resolved the document gate's «confirm the type» hold on these same bytes. */
    branchConfirmed?: boolean;
}, documentFormData?: FormData) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { success: false, error: "UNAUTHORIZED" }
    if (!isAgentRole(authResult.dbUser.roles)) return { success: false, error: "UNAUTHORIZED" }

    const agentId = authResult.dbUser.id
    const agentUser = authResult.dbUser as { name?: string | null; email?: string | null }
    const language = resolveUserLanguage((authResult.dbUser as any).preferredLanguage)

    // Validate BEFORE any write — see addCustomerManually.
    const parsed = AddPolicyForCustomerInput.safeParse(data)
    if (!parsed.success) return validationFailure(parsed.error)
    const input = parsed.data
    const customerId = input.customerId

    try {
        // 1. Verify the agent has a usable relationship with this customer
        const relationship = await db.customerRelationship.findFirst({
            where: {
                agentUserId: agentId,
                policyholderUserId: customerId
            }
        })

        if (!relationship || (ENDED_RELATIONSHIP_STATUSES as readonly string[]).includes(relationship.status)) {
            return { success: false, error: "CUSTOMER_ACCESS_DENIED" }
        }

        // 2. Subscription gate: maxPoliciesPerCustomer for this tier
        const { canAgentAddPolicyForCustomer } = await import("@/lib/subscription-entitlements")
        const policyGate = await canAgentAddPolicyForCustomer(agentId, customerId)
        if (!policyGate.allowed) {
            return {
                success: false,
                error: "POLICY_PER_CUSTOMER_LIMIT",
                reason: policyGate.reason,
                current: policyGate.current,
                limit: policyGate.limit,
            }
        }

        // 3. Optional document from the AI scanner step. Validated in FULL by the
        // ingestion service below — bytes, then the document gate with the
        // branch the agent selected as the declared one — before any write.
        const candidate = documentFormData?.get("file")
        const file = candidate instanceof File && candidate.size > 0 ? candidate : null

        // 3b. Pre-add duplicate guard. The only other dedup runs post-analysis
        // and is skipped when analysis doesn't run (no consent/quota), so the
        // same policy could be added twice. Warn the agent BEFORE creating a
        // second row for the same customer + policy number + branch + start date
        // (startDate is the issue-date proxy — a genuine renewal has a different
        // term, so it's not flagged). The agent can "Add anyway" (confirmDuplicate).
        if (!input.confirmDuplicate) {
            const existing = await db.policy.findFirst({
                where: {
                    ownerUserId: customerId,
                    policyNumber: { equals: input.policy.policyNumber, mode: 'insensitive' },
                    lineOfBusiness: input.policy.lineOfBusiness,
                    startDate: new Date(input.policy.startDate),
                    NOT: { status: 'cancelled' },
                },
                select: { policyNumber: true, insurerName: true },
            })
            if (existing) {
                return {
                    success: false as const,
                    duplicate: true as const,
                    // Data minimization: this row may be a policy the customer
                    // uploaded themselves, which the agent holds no grant for —
                    // the match is on keys the agent just typed. Send only what
                    // the warning actually renders. The internal id in particular
                    // is a capability handle for id-taking endpoints and was
                    // never read by the client.
                    existing: {
                        policyNumber: existing.policyNumber,
                        insurerName: existing.insurerName,
                    },
                }
            }
        }

        // The auto-minted, owner-revocable management grant. No unique
        // constraint exists on (granter, grantee, scope) — idempotency is
        // enforced here. Committed in the SAME transaction as the policy.
        const grantManagement = async (tx: Prisma.TransactionClient, policyId: string) => {
            const existingGrant = await tx.accessGrant.findFirst({
                where: {
                    granterUserId: customerId,
                    granteeUserId: agentId,
                    scope: `policy:${policyId}`,
                    status: 'active',
                }
            })
            if (!existingGrant) {
                await tx.accessGrant.create({
                    data: {
                        granterUserId: customerId,
                        granteeUserId: agentId,
                        scope: `policy:${policyId}`,
                        permissions: 'manage',
                        status: 'active',
                    }
                })
            }
        }
        const carPlateData = input.policy.carPlate ? { vehicle: { plateNumber: input.policy.carPlate } } : undefined

        // 4–5. With a document: ONE door (lib/ingestion/ingest-policy-document.ts)
        // — the gate decides on the bytes and the agent's selected branch, then
        // storage, then policy + grant + stamped document in one transaction,
        // with the object deleted again if the commit fails. The policy row,
        // its grant and the customer's notification used to be committed
        // before anything had asked what the file was.
        let policy: { id: string; policyNumber: string }
        let hasDocument = false
        if (file) {
            const ingest = await ingestPolicyDocument({
                actorUserId: agentId,
                ownerUserId: customerId,
                createdByUserId: agentId,
                file,
                surface: 'agent_commit',
                mode: 'policy',
                declaredBranch: input.policy.lineOfBusiness,
                declaredBranchSource: 'user',
                branchConfirmed: input.branchConfirmed,
                // The scan step classified these bytes minutes ago; reuse its
                // model reading rather than paying for a second one.
                reusePriorVerdict: true,
                maxBytes: 10 * 1024 * 1024,
                typedMetadata: {
                    insurerName: input.policy.insurerName,
                    policyNumber: input.policy.policyNumber,
                    startDate: input.policy.startDate,
                    endDate: input.policy.endDate,
                    premiumAmount: input.policy.premiumAmount ?? null,
                    premiumCurrency: input.policy.premiumCurrency || 'EUR',
                },
                policyStatus: 'active',
                acordData: carPlateData,
                source: 'agent',
                processingStatus: 'pending',
                afterCreate: (tx, created) => grantManagement(tx, created.id),
            })
            if (!ingest.ok) {
                if (ingest.kind === 'upload_invalid') {
                    return { success: false, error: REJECTION_MESSAGES[ingest.reason], errorCode: ingest.reason }
                }
                return {
                    success: false as const,
                    error: "DOCUMENT_REJECTED",
                    errorCode: ingest.code,
                    gate: {
                        status: ingest.status,
                        code: ingest.code,
                        documentType: ingest.documentType,
                        documentKind: ingest.documentKind,
                        detectedBranch: ingest.detectedBranch,
                        declaredBranch: ingest.declaredBranch,
                        reviewReasons: ingest.reviewReasons,
                        resolvable: ingest.resolvable,
                    },
                }
            }
            policy = { id: ingest.policyId, policyNumber: input.policy.policyNumber }
            hasDocument = true
        } else {
            // No document: policy + grant only. Nothing to validate and
            // nothing to analyse.
            policy = await db.$transaction(async (tx) => {
                const created = await tx.policy.create({
                    data: {
                        ownerUserId: customerId,
                        createdByUserId: agentId,
                        insurerName: input.policy.insurerName,
                        policyNumber: input.policy.policyNumber,
                        lineOfBusiness: input.policy.lineOfBusiness,
                        startDate: new Date(input.policy.startDate),
                        endDate: new Date(input.policy.endDate),
                        coverageEndDate: new Date(input.policy.endDate),
                        premiumAmount: input.policy.premiumAmount,
                        premiumCurrency: input.policy.premiumCurrency || 'EUR',
                        status: 'active',
                        acordData: carPlateData,
                    }
                })
                await grantManagement(tx, created.id)
                return created
            })
        }

        // 6. Agent-attested AI consent for unactivated owners (D1 decision).
        if (input.attestedAiConsent) {
            const owner = await db.user.findUnique({
                where: { id: customerId },
                select: { aiProcessingConsentVersion: true, emailVerified: true, lastActiveAt: true },
            })
            // "Unactivated" MUST match the canonical activation check
            // (customer.service isActivatedAccount): password OR emailVerified
            // OR lastActiveAt. `password` is always null for real users (Supabase
            // holds the credential), so without lastActiveAt this collapsed to
            // "email-unverified" — letting an agent attest consent for a real,
            // logged-in account and run AI over their policy without genuine
            // consent (GDPR). A user who has EVER been active is a live account
            // and must be asked directly.
            const ownerHasPassword = owner ? await hasPasswordCredential(db, customerId) : false
            const isUnactivated = owner && !ownerHasPassword && !owner.emailVerified && !owner.lastActiveAt
            if (owner && !owner.aiProcessingConsentVersion && isUnactivated) {
                const { AGENT_ATTESTED_CONSENT_PREFIX } = await import("@/lib/ai-consent")
                await db.user.update({
                    where: { id: customerId },
                    data: { aiProcessingConsentVersion: `${AGENT_ATTESTED_CONSENT_PREFIX}${agentId}` },
                })
                await (db.activityLog as any).create({
                    data: {
                        adminUserId: agentId,
                        adminEmail: authResult.dbUser.email || "unknown",
                        actionType: "AI_CONSENT_AGENT_ATTESTED",
                        description: `Agent attested customer AI-processing consent for policy ${policy.policyNumber}`,
                        metadata: { policyId: policy.id, customerId },
                    }
                })
            }
        }

        // 7. Update relationship last interaction
        await db.customerRelationship.update({
            where: { id: relationship.id },
            data: { lastInteractionAt: new Date() }
        })

        // 8. Notify the customer — AFTER the commit, and say plainly what the
        // agent can now see. The agent's access is limited to THIS policy (the
        // auto-minted, owner-revocable grant above); it never extends to
        // policies the customer uploaded themselves.
        const agentLabel = agentUser?.name || agentUser?.email || 'Your agent'
        const addedBranch = normalizeBranch(input.policy.lineOfBusiness)
        await emit({
            event: 'policy_added',
            userId: customerId,
            title: {
                el: 'Προστέθηκε νέο ασφαλιστήριο',
                en: 'New Policy Added',
            },
            // Greek-default product, and this is the notification that tells
            // someone another party can now see their policy — it was
            // English-only, branch label included.
            message: {
                el: `Ο/Η ${agentLabel} πρόσθεσε ένα ασφαλιστήριο ${addedBranch.label.el} από ${input.policy.insurerName} στο wallet σας και μπορεί να το βλέπει και να το διαχειρίζεται. Μπορείτε να ανακαλέσετε αυτή την πρόσβαση οποτεδήποτε από «Ο σύμβουλός μου».`,
                en: `${agentLabel} added a ${addedBranch.label.en} policy from ${input.policy.insurerName} to your wallet and can view and manage that policy. You can revoke this access at any time from My Agent.`,
            },
            relatedObjectType: 'policy',
            relatedObjectId: policy.id,
        })

        // 9. Run analysis on the persisted document, attributed to the AGENT
        // (agent-plan run count + token budget).
        //
        // The verdict is decided HERE, before the action answers, with the
        // same gates the deferred run applies (H1). The token gate used to
        // run only inside after(): the modal had already said «εκτελείται
        // στο παρασκήνιο» when createRun refused — and on the free agent
        // tier it refused every time (a document run estimates at ~211k
        // tokens against a 150k monthly budget), leaving the policy stuck in
        // `analyzing`. A refused run is now stamped the way the pipeline
        // stamps one (`action_needed` + processingError TOKEN_LIMIT_BLOCKED,
        // retryable) and the modal says the policy was saved and what it
        // would take to read it. Never «εκτελείται» unless it is queued.
        let analysis: AnalysisOutcome = 'none'
        if (hasDocument) {
            const owner = await db.user.findUnique({
                where: { id: customerId },
                select: { aiProcessingConsentVersion: true },
            })
            if (!owner?.aiProcessingConsentVersion) {
                analysis = 'blocked_consent'
            } else {
                const { canAgentRunAnalysis } = await import("@/lib/subscription-entitlements")
                const analysisGate = await canAgentRunAnalysis(agentId)
                let quotaReason: string | null = analysisGate.allowed ? null : (analysisGate.reason || 'ai_analysis_limit')
                if (!quotaReason) {
                    const { preflightAnalysisTokenGate } = await import("@/lib/services/analysis/run-preflight")
                    const tokenGate = await preflightAnalysisTokenGate(agentId, {
                        lineOfBusiness: input.policy.lineOfBusiness,
                        hasDocument: true,
                    })
                    if (!tokenGate.allowed) quotaReason = tokenGate.reason
                }

                if (quotaReason) {
                    analysis = 'blocked_quota'
                    await markPolicyAnalysisBlockedByQuota(policy.id, quotaReason)
                } else {
                    await db.policy.update({
                        where: { id: policy.id },
                        data: { status: 'analyzing' }
                    })
                    // Defer with after(): the analysis takes ~90s and the agent
                    // must be able to close the dialog and keep working while it
                    // runs — the action used to await it, so the "Adding…"
                    // spinner blocked for the whole run and closing the modal
                    // lost the result.
                    analysis = 'queued'
                    const policyId = policy.id
                    after(async () => {
                        try {
                            const { PolicyService } = await import("@/lib/services/policy.service")
                            const policyService = new PolicyService()
                            await policyService.runBackgroundAnalysis(policyId, agentId, language)
                        } catch (e) {
                            await reportActionFailure("addPolicyForCustomer.backgroundAnalysis", e, { agentId, policyId, customerId })
                        }
                    })
                }
            }
        }

        revalidatePath(`/customers/${customerId}`)
        revalidatePath("/customers")
        revalidatePath("/wallet")
        return { success: true, policyId: policy.id, analysis }
    } catch (e) {
        await reportActionFailure("addPolicyForCustomer", e, { agentId, customerId })
        return { success: false, error: "ADD_POLICY_FAILED" }
    }
}

export async function parsePolicyPdfWithGemini(formData: FormData) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "UNAUTHORIZED" }
    if (!isAgentRole(authResult.dbUser.roles)) return { error: "UNAUTHORIZED" }

    // Consent BEFORE the body. The scan sends the document to a model
    // provider before any customer is resolved, so nobody's consent used to
    // be checked on this path at all (M2). Owner decision D1: the agent's own
    // recorded AI-processing consent plus an explicit, per-scan attestation
    // that they hold the customer's mandate is the lawful basis for the
    // extraction — the deep analysis still needs the customer's own consent
    // (addPolicyForCustomer, step 9). Both checks run before the file is read
    // so a refusal never touches the document.
    const agentConsentVersion = authResult.dbUser.aiProcessingConsentVersion
    if (!agentConsentVersion) return { success: false as const, error: "AI_CONSENT_REQUIRED" }
    if (formData.get("attested") !== "true") return { success: false as const, error: "AGENT_ATTESTATION_REQUIRED" }

    const file = formData.get("file") as File
    if (!file) return { error: "NO_FILE" }

    // Full validation (size, extension allowlist, content-type, magic bytes)
    // before the file is handed to the AI — don't feed a disguised payload in.
    const scanValidation = await validateUploadFile(file, { category: "policy", maxBytes: 10 * 1024 * 1024 })
    if (!scanValidation.ok) {
        // errorCode travels with the English prose so the client can localise it
        // — REJECTION_MESSAGES is English-only and also feeds API/log surfaces.
        return { error: REJECTION_MESSAGES[scanValidation.reason], errorCode: scanValidation.reason }
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0 || apiKey === 'undefined') {
        return { error: "AI_NOT_CONFIGURED" }
    }

    // ── The document gate ──────────────────────────────────────────────────
    // Local read of the bytes (pages, text, kind of document) BEFORE the
    // hourly scan cap is consumed and BEFORE any model sees the file. The
    // agent's own consent above is the lawful basis for the gate's cheap
    // classifier, exactly as for the extraction. No branch is declared yet —
    // the agent picks it on the form the scan pre-fills — so the branch check
    // happens at commit (addPolicyForCustomer), where the selection exists.
    const scanBytes = Buffer.from(await file.arrayBuffer())
    const gateVerdict = await validateDocumentForIngestion({
        bytes: scanBytes,
        canonicalMime: scanValidation.value.canonicalMime,
        declaredBranch: null,
        declaredBranchSource: "user",
        mode: "policy",
        surface: "agent_scan",
        actorUserId: authResult.dbUser.id,
        ownerUserId: authResult.dbUser.id,
        branchConfirmed: formData.get("branchConfirmed") === "true",
    })
    if (gateVerdict.status !== "validated") {
        return {
            success: false as const,
            error: "DOCUMENT_REJECTED",
            errorCode: gateVerdict.code ?? "DOCUMENT_NOT_RECOGNIZED",
            gate: {
                status: gateVerdict.status,
                code: gateVerdict.code ?? "DOCUMENT_NOT_RECOGNIZED",
                documentType: gateVerdict.documentType,
                documentKind: documentKindFor(gateVerdict.documentType),
                detectedBranch: gateVerdict.detectedBranch ? FAMILY_DEFAULT_BRANCH[gateVerdict.detectedBranch] : null,
                reviewReasons: gateVerdict.reviewReasons,
                resolvable:
                    gateVerdict.status === "requires_review" &&
                    gateVerdict.reviewReasons.length > 0 &&
                    gateVerdict.reviewReasons.every((reason) => USER_RESOLVABLE_REVIEW_REASONS.has(reason)),
            },
        }
    }

    // Abuse/cost cap: this is a real, billable AI extraction. Without a limit an
    // agent could scan unbounded PDFs and never create a policy, running up cost
    // outside the analysis-quota gate that addPolicyForCustomer enforces.
    //
    // The Redis 30/hr limiter is per-instance in production (RATELIMIT_ALLOW_LOCAL
    // with no Upstash), so the scan had no durable cap — STATUS.md flags it as the
    // live money exposure. enforceBillableCallPolicy adds a DB-backed backstop
    // (45/hr, instance-independent) that counts the AGENT_POLICY_SCANNED rows this
    // function writes, closing that hole.
    const { enforceBillableCallPolicy } = await import("@/lib/services/ai/guard")
    const scanGate = await enforceBillableCallPolicy({
        userId: authResult.dbUser.id,
        actionType: "AGENT_POLICY_SCANNED",
        redisBucket: `agent-scan:${authResult.dbUser.id}`,
        redisLimit: 30,
        redisWindowMs: 60 * 60 * 1000,
        dbLimit: 45,
        dbWindowMs: 60 * 60 * 1000,
    })
    if (!scanGate.allowed) {
        return { error: "SCAN_RATE_LIMITED" }
    }

    // Auditable spend, written BEFORE the billable call so every committed
    // attempt (success or failure) counts toward the DB backstop above. userId
    // only — no email, no customer identifiers in the row (GDPR audit M3).
    // The lawful basis travels with the row: the agent attested to the
    // customer's mandate, under the consent version they themselves hold.
    try {
        await db.activityLog.create({
            data: {
                adminUserId: authResult.dbUser.id,
                adminEmail: "",
                actionType: "AGENT_POLICY_SCANNED",
                description: "Agent scanned a policy PDF for extraction",
                metadata: { attested: true, agentConsentVersion },
            },
        })
    } catch (logError) {
        // Never fail the scan on a logging error — but do not lose it either.
        logger("warn", "[agent/actions] AGENT_POLICY_SCANNED audit row failed", {
            agentId: authResult.dbUser.id,
            error: logError instanceof Error ? logError.message : String(logError),
        })
    }

    try {
        const aiService = getAIService();

        // Built from the gate's verdict and the validated bytes — the only
        // constructor of an extraction input. The MIME is the one the
        // VALIDATOR established from the magic bytes, not `file.type`: a
        // phone's HEIC photo arrives with an empty browser-supplied type. No
        // file name at all — AIDocument has no such field.
        const result = await aiService.extractPolicyData(
            toValidatedAIDocument(gateVerdict, scanBytes, scanValidation.value.canonicalMime),
            // Attribute the token cost to the agent — the scan used to run
            // entirely off the books.
            { userId: authResult.dbUser.id },
        );

        return { success: true, data: result }
    } catch (e) {
        await reportActionFailure("parsePolicyPdfWithGemini", e, { agentId: authResult.dbUser.id })
        return { error: "SCAN_FAILED" }
    }
}

/**
 * SMART UPLOAD — scan a policy document, then resolve the extracted
 * policyholder identity against the agent's existing customers.
 *
 * Reuses parsePolicyPdfWithGemini for extraction so the billable scan runs
 * exactly once on the shared 30/hr `agent-scan:` rate-limit bucket; the commit
 * step (commitScannedPolicy) never re-extracts.
 */
export async function scanPolicyForResolution(formData: FormData) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { success: false as const, error: "UNAUTHORIZED" }
    if (!isAgentRole(authResult.dbUser.roles)) return { success: false as const, error: "UNAUTHORIZED" }
    const agentId = authResult.dbUser.id

    const parsed = await parsePolicyPdfWithGemini(formData)
    if (!('data' in parsed) || !parsed.data) {
        return {
            success: false as const,
            error: ('error' in parsed && parsed.error) || "SCAN_FAILED",
            // Forward the rejection code so the modal can localise it.
            errorCode: ('errorCode' in parsed && parsed.errorCode) || undefined,
            // The document gate's verdict, when it refused or held the file.
            gate: ('gate' in parsed && parsed.gate) || undefined,
        }
    }

    const data = parsed.data
    const fullName = [data.customerName, data.customerSurname].filter(Boolean).join(' ').trim()

    const resolution = await customerResolutionService.resolveCustomerCandidates(agentId, {
        taxId: data.customerTaxId,
        email: data.customerEmail,
        name: fullName || undefined,
        phone: data.customerPhone,
    })

    return { success: true as const, extraction: data, resolution }
}

/**
 * Backfill a customer's ΑΦΜ only when the record has none — never overwrite —
 * and only onto a PHANTOM (no password, never email-verified). An activated
 * account's tax id is the customer's to set; an agent who knows the email
 * must not be able to annotate it.
 */
async function backfillCustomerTaxId(customerId: string, rawTaxId?: string | null) {
    const taxId = normalizeTaxId(rawTaxId)
    if (!taxId) return
    const user = await db.user.findUnique({
        where: { id: customerId },
        select: { taxId: true, emailVerified: true },
    })
    if (user && !user.taxId && isPhantomCustomer({ hasPassword: await hasPasswordCredential(db, customerId), emailVerified: user.emailVerified })) {
        await db.user.update({ where: { id: customerId }, data: { taxId } })
    }
}

type CommitPolicyInput = {
    insurerName: string
    policyNumber: string
    lineOfBusiness: string
    startDate: string
    endDate: string
    premiumAmount?: number
    premiumCurrency?: string
    carPlate?: string
}

type CommitDecision =
    | { mode: 'attach'; customerId: string; taxId?: string }
    /** `email` optional under D3: a valid ΑΦΜ + Greek mobile identify the customer. */
    | { mode: 'create_new'; customer: { name: string; surname?: string; email?: string; phone?: string; taxId?: string } }

/**
 * SMART UPLOAD — commit the agent's resolution decision, then converge on the
 * existing addPolicyForCustomer core (policy + grant + document + deferred
 * analysis + agent-attested consent). For a new customer we create the
 * phantom + relationship first so the core's relationship gate is satisfied
 * without relaxing it.
 */
export async function commitScannedPolicy(
    decision: CommitDecision,
    policy: CommitPolicyInput,
    attestedAiConsent?: boolean,
    documentFormData?: FormData,
    confirmDuplicate?: boolean,
    /** The agent resolved the document gate's «confirm the type» hold on these same bytes. */
    branchConfirmed?: boolean,
) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { success: false, error: "UNAUTHORIZED" }
    if (!isAgentRole(authResult.dbUser.roles)) return { success: false, error: "UNAUTHORIZED" }
    const agentId = authResult.dbUser.id

    // Validate BOTH halves before any write — the extraction is model output
    // the agent may have edited, and neither is trusted.
    const parsedDecision = CommitDecisionInput.safeParse(decision)
    if (!parsedDecision.success) return validationFailure(parsedDecision.error)
    const parsedPolicy = AgentPolicyInput.safeParse(policy)
    if (!parsedPolicy.success) return validationFailure(parsedPolicy.error)
    const input = parsedDecision.data

    try {
        let customerId: string
        let created = false

        if (input.mode === 'create_new') {
            // createCustomer does not self-gate — enforce the customer cap here,
            // matching addCustomerManually.
            const { canAgentAddCustomer } = await import("@/lib/subscription-entitlements")
            const gate = await canAgentAddCustomer(agentId)
            if (!gate.allowed) {
                return {
                    success: false,
                    error: "CUSTOMER_LIMIT_REACHED",
                    reason: gate.reason,
                    current: gate.current,
                    limit: gate.limit,
                }
            }

            const name = [input.customer.name, input.customer.surname].filter(Boolean).join(' ').trim()
            // No email (D3): keyed on the synthetic address the ΑΦΜ derives, and
            // flagged so nothing is ever sent to it.
            const contact = customerEmailIdentity(input.customer)
            try {
                const relationship = await customerService.createCustomer(agentId, {
                    email: contact.email,
                    contactEmailMissing: contact.contactEmailMissing,
                    name,
                    phoneNumber: input.customer.phone,
                    taxId: input.customer.taxId,
                })
                customerId = relationship.policyholderUserId
                created = true
            } catch (e: any) {
                // The agent already has this customer (email already maps to a
                // relationship) — attach to the existing customer instead of
                // failing. createCustomer already backfilled the ΑΦΜ if null.
                if (e?.code === 'CONFLICT') {
                    const existing = await db.user.findUnique({
                        where: { email: normalizeEmail(contact.email) },
                        select: { id: true },
                    })
                    if (!existing) throw e
                    customerId = existing.id
                } else {
                    throw e
                }
            }
        } else {
            customerId = input.customerId
        }

        const result = await addPolicyForCustomer(
            { customerId, policy: parsedPolicy.data, attestedAiConsent, confirmDuplicate, branchConfirmed },
            documentFormData,
        )

        // Backfill the ΑΦΜ only AFTER addPolicyForCustomer has verified the
        // agent↔customer relationship. Doing it in the attach branch above let
        // an agent write a tax ID onto ANY account (arbitrary decision.customerId)
        // before the relationship gate ran. create_new already backfilled via
        // createCustomer, so this covers the attach path only.
        if (result?.success && input.mode === "attach") {
            await backfillCustomerTaxId(customerId, input.taxId)
        }

        return { ...result, customerId, created }
    } catch (e) {
        await reportActionFailure("commitScannedPolicy", e, { agentId })
        return { success: false, error: "ADD_POLICY_FAILED" }
    }
}

/**
 * QUESTIONNAIRE ACTIONS
 */

export async function getQuestionnaireTemplates() {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) throw new Error("Unauthorized")
    if (!isAgentRole(authResult.dbUser.roles)) throw new Error("Unauthorized")

    // Same visibility rule as the questionnaire manager: system templates
    // plus the caller's own — never other agents' custom templates.
    return await db.questionnaireTemplate.findMany({
        where: {
            isActive: true,
            OR: [{ isSystem: true }, { createdByUserId: authResult.dbUser.id }],
        },
        orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    })
}

export async function sendQuestionnaire(relationshipId: string, templateId: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) throw new Error("Unauthorized")
    if (!isAgentRole(authResult.dbUser.roles)) throw new Error("Unauthorized")

    // Sends an email + in-app notification — cap per agent (same policy as
    // createAgentInvite) so it can't be used to spam an address.
    const { rateLimit } = await import("@/lib/rate-limit")
    const sendLimit = await rateLimit(authResult.dbUser.id, 20, 60 * 60 * 1000, `agent-questionnaire:${authResult.dbUser.id}`)
    if (!sendLimit.success) {
        throw new Error("Too many questionnaires sent. Please wait a bit and try again.")
    }

    const relationship = await db.customerRelationship.findUnique({
        where: { id: relationshipId },
        select: { policyholderUserId: true, agentUserId: true, status: true }
    })

    if (!relationship || relationship.agentUserId !== authResult.dbUser.id) {
        throw new Error("Relationship not found")
    }
    // Mirror the other collaboration flows (proposals / document-requests /
    // createThread): never message someone who hasn't accepted the relationship.
    if (relationship.status !== "active") {
        throw new Error("The customer has not accepted this relationship yet")
    }

    // Same visibility rule as getQuestionnaireTemplates: only a system template
    // or the agent's OWN — never another agent's private template (its id could
    // be guessed, disclosing its questions).
    const template = await db.questionnaireTemplate.findFirst({
        where: {
            id: templateId,
            isActive: true,
            OR: [{ isSystem: true }, { createdByUserId: authResult.dbUser.id }],
        },
        select: { id: true },
    })
    if (!template) {
        throw new Error("Template not found")
    }

    const instance = await db.questionnaireInstance.create({
        data: {
            relationshipId,
            templateId,
            sentByUserId: authResult.dbUser.id,
            sentToUserId: relationship.policyholderUserId,
            status: 'pending'
        }
    })

    await collaborationService.ensureAutomationThread(authResult.dbUser.id, {
        relationshipId,
        category: "questionnaire",
        priority: "medium",
        linkedQuestionnaireInstanceId: instance.id,
        subject: "Questionnaire requested",
        initialMessage: "A questionnaire has been sent. Use this thread for follow-up and clarifications.",
    })

    // Update last interaction
    await db.customerRelationship.update({
        where: { id: relationshipId },
        data: { lastInteractionAt: new Date() }
    })

    // Tell the customer a questionnaire is waiting — previously sending one
    // notified nobody (no bell, no email), so it was invisible unless they
    // guessed the /tasks/[id] URL. Deep-links to the answer page (email via
    // notificationActionPath, bell via NotificationBell's questionnaire case).
    await notifyCounterparty({
        userId: relationship.policyholderUserId,
        eventType: "questionnaire_received",
        title: {
            el: "Νέο ερωτηματολόγιο από τον σύμβουλό σας",
            en: "New questionnaire from your advisor",
        },
        message: {
            el: "Ο σύμβουλός σας σάς έστειλε ένα ερωτηματολόγιο. Απαντήστε το για να εντοπίσουμε κενά στην κάλυψή σας.",
            en: "Your advisor sent you a questionnaire. Answer it so we can spot gaps in your coverage.",
        },
        relatedObjectType: "questionnaire",
        relatedObjectId: instance.id,
    })

    revalidatePath(`/customers/${relationship.policyholderUserId}`)
    return instance
}

export async function updateAgentProfile(data: {
    agencyName?: string;
    licenseNumber?: string;
    commissionRates?: Record<string, number>;
}) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "UNAUTHORIZED" }
    if (!isAgentRole(authResult.dbUser.roles)) return { error: "UNAUTHORIZED" }

    const agentId = authResult.dbUser.id

    try {
        const updateData: Record<string, unknown> = {
            updatedAt: new Date(),
        }
        if (data.agencyName !== undefined) updateData.agencyName = data.agencyName
        if (data.licenseNumber !== undefined) updateData.licenseNumber = data.licenseNumber
        if (data.commissionRates !== undefined) updateData.commissionRates = data.commissionRates

        await db.agentProfile.upsert({
            where: { userId: agentId },
            update: updateData,
            create: {
                userId: agentId,
                agencyName: data.agencyName,
                licenseNumber: data.licenseNumber,
                commissionRates: data.commissionRates ?? undefined,
                verificationStatus: 'pending'
            }
        })

        revalidatePath("/agent/settings")
        return { success: true }
    } catch (e) {
        await reportActionFailure("updateAgentProfile", e, { agentId })
        return { error: "PROFILE_UPDATE_FAILED" }
    }
}

/**
 * Protection-score trend for one client (audit finding F-08).
 *
 * Gated on the SAME rule as every other agent read of this customer: the agent
 * must hold an active relationship AND at least one visible policy. A score
 * trend is a statement about someone's insurance position, so a bare
 * (unilaterally created) relationship must not reveal it.
 */
export async function getCustomerScoreTrend(customerId: string, limit = 12) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return null
    if (!isAgentRole(authResult.dbUser.roles)) return null

    const relationship = await db.customerRelationship.findFirst({
        where: {
            agentUserId: authResult.dbUser.id,
            policyholderUserId: customerId,
            status: { notIn: ["inactive", "terminated"] },
        },
        select: { id: true },
    })
    if (!relationship) return null

    // Reuse the visibility helper rather than trusting the relationship alone.
    const { getVisiblePolicyCountsByOwner } = await import("@/lib/agent-visibility")
    const counts = await getVisiblePolicyCountsByOwner(authResult.dbUser.id, [customerId])
    if ((counts.get(customerId) ?? 0) === 0) return null

    // Sourced from RiskProfileVersion, which is now the single score history.
    // `ProtectionScoreHistory` recorded the same thing in parallel, and two
    // histories of one number are two answers waiting to disagree in front of an
    // advisor. The versions table is the better source: it only writes when the
    // assessment MATERIALLY changed, so a flat stretch is implied by the gap
    // between points rather than by 365 identical rows.
    const versions = await db.riskProfileVersion.findMany({
        where: { userId: customerId },
        orderBy: { computedAt: "desc" },
        take: Math.min(Math.max(1, limit), 60),
        select: {
            overallScore: true,
            categoryScores: true,
            computedAt: true,
            openFindingCount: true,
            indeterminate: true,
        },
    })

    // An indeterminate score was never shown to anyone as a number, so plotting
    // it would draw a movement that never happened.
    const scored = versions.filter((v) => !v.indeterminate)

    // `previousScore` is not stored — it IS the next row's score, since these
    // come back newest-first.
    const rows = scored.map((v, i) => ({
        overallScore: v.overallScore,
        previousScore: scored[i + 1]?.overallScore ?? null,
        gapCount: v.openFindingCount,
        categoryScores: v.categoryScores,
        computedAt: v.computedAt,
    }))

    const { summariseScoreTrend, categoryMovements } = await import(
        "@/lib/services/gap-engine/score-trend"
    )
    const summary = summariseScoreTrend(rows)

    return {
        current: summary.current,
        earliest: summary.earliest,
        delta: summary.delta,
        direction: summary.direction,
        points: summary.points.map((p) => ({
            overallScore: p.overallScore,
            gapCount: p.gapCount,
            computedAt: p.computedAt.toISOString(),
        })),
        movements: categoryMovements(rows).slice(0, 3),
    }
}

/**
 * CROSS-SELL INTELLIGENCE
 */

export async function getCustomerCrossSell(customerId: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return null
    if (!isAgentRole(authResult.dbUser.roles)) return null
    // Cross-sell intelligence is a Pro+ feature (crossSellIntelligence).
    const { canAgentUseFeature } = await import("@/lib/subscription-entitlements")
    if (!(await canAgentUseFeature(authResult.dbUser.id, "crossSellIntelligence"))) return null

    const { runCrossSellForCustomer } = await import("@/lib/services/cross-sell.service")
    return runCrossSellForCustomer(authResult.dbUser.id, customerId, false)
}

export async function createCrossSellOpportunities(customerId: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "UNAUTHORIZED" }
    if (!isAgentRole(authResult.dbUser.roles)) return { error: "UNAUTHORIZED" }
    const { canAgentUseFeature } = await import("@/lib/subscription-entitlements")
    if (!(await canAgentUseFeature(authResult.dbUser.id, "crossSellIntelligence"))) {
        return { error: "UPGRADE_REQUIRED" }
    }

    const { runCrossSellForCustomer } = await import("@/lib/services/cross-sell.service")
    const result = await runCrossSellForCustomer(authResult.dbUser.id, customerId, true)

    revalidatePath(`/customers/${customerId}`)
    return { success: true, opportunitiesCreated: result.opportunitiesCreated }
}

/**
 * Run cross-sell across the WHOLE book (audit finding F-06).
 *
 * `runBulkCrossSell` has existed and worked for months with zero UI callers, so
 * a top-3 advisor revenue feature shipped no value at all. Exposing it needs
 * three things the service itself does not do: the same Pro+ fence the
 * per-customer path uses, a per-agent rate limit (it walks every relationship
 * and writes opportunities — cheap per row, unbounded across a book), and a
 * cap so one click cannot sit on a connection for an entire agency's portfolio.
 */
export async function runBookCrossSell() {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "UNAUTHORIZED" as const }
    if (!isAgentRole(authResult.dbUser.roles)) return { error: "UNAUTHORIZED" as const }

    const { canAgentUseFeature } = await import("@/lib/subscription-entitlements")
    if (!(await canAgentUseFeature(authResult.dbUser.id, "crossSellIntelligence"))) {
        return { error: "UPGRADE_REQUIRED" as const }
    }

    // Rule-based, not billable AI — so the cap is about database work and
    // duplicate opportunity churn, not spend. Four runs an hour is plenty:
    // the result only changes when the book changes.
    const { rateLimit } = await import("@/lib/rate-limit")
    const limit = await rateLimit(
        authResult.dbUser.id,
        4,
        60 * 60 * 1000,
        `agent-bulk-crosssell:${authResult.dbUser.id}`
    )
    if (!limit.success) return { error: "RATE_LIMITED" as const }

    const { runBulkCrossSell } = await import("@/lib/services/cross-sell.service")
    const result = await runBulkCrossSell(authResult.dbUser.id)

    revalidatePath("/opportunities")
    revalidatePath("/customers")
    revalidatePath("/dashboard/agent")

    return {
        success: true as const,
        customersAnalyzed: result.customersAnalyzed,
        totalMissingLines: result.totalMissingLines,
        opportunitiesCreated: result.opportunitiesCreated,
        /** The cap stopped before the end of the book — run again to continue. */
        truncated: result.truncated,
    }
}


/**
 * GDPR consent request: an agent cannot consent on the data subject's behalf,
 * but is never dead-ended — this asks the policy OWNER for AI-processing
 * consent. Account holders get an in-app notification + approval email;
 * customers without a usable account get a signup invite whose onboarding
 * captures consent at first upload.
 */
export async function requestAiConsent(policyId: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "UNAUTHORIZED" }
    if (!isAgentRole(authResult.dbUser.roles)) return { error: "UNAUTHORIZED" }

    // Sends an email/notification to the policy owner — cap per agent.
    const { rateLimit } = await import("@/lib/rate-limit")
    const consentLimit = await rateLimit(authResult.dbUser.id, 20, 60 * 60 * 1000, `agent-consent:${authResult.dbUser.id}`)
    if (!consentLimit.success) {
        return { error: "RATE_LIMITED" }
    }

    const policy = await db.policy.findUnique({ where: { id: policyId } })
    if (!policy) return { error: "POLICY_NOT_FOUND" }

    const hasGrant = await db.accessGrant.findFirst({
        where: {
            granterUserId: policy.ownerUserId,
            granteeUserId: authResult.dbUser.id,
            status: "active",
            // Scope the grant to THIS policy. Without it, a portfolio or
            // upload_only grant — or a grant on an entirely different policy of
            // the same owner — authorised acting on whichever policyId the
            // caller named. lib/policy-access.ts has always required the exact
            // `policy:<id>` scope; this check had not.
            scope: `policy:${policyId}`,
        },
    })
    const hasRelationship = hasGrant
        ? null
        : await db.customerRelationship.findFirst({
            where: {
                agentUserId: authResult.dbUser.id,
                policyholderUserId: policy.ownerUserId,
                // Only an ACCEPTED relationship may trigger consent emails —
                // pending/terminated ones are agent-created, not the owner's
                // choice, and this action emails the owner directly.
                status: "active",
            },
        })
    if (!hasGrant && !hasRelationship) return { error: "UNAUTHORIZED" }

    const owner = await db.user.findUnique({
        where: { id: policy.ownerUserId },
        select: {
            id: true, email: true, contactEmailMissing: true, preferredLanguage: true,
            emailVerified: true, lastActiveAt: true, aiProcessingConsentVersion: true,
        },
    })
    if (!owner) return { error: "POLICY_OWNER_NOT_FOUND" }
    if (owner.aiProcessingConsentVersion) return { success: true, mode: "already_consented" as const }
    // A customer with no email (D3) cannot be asked anything by email, and a
    // signup invite to the synthetic address would be a link nobody can use.
    // Refused before any invite row or notification is written.
    if (owner.contactEmailMissing || isSyntheticNoEmailAddress(owner.email)) {
        return { error: "CUSTOMER_NOT_CONTACTABLE" }
    }

    const language = resolveUserLanguage(owner.preferredLanguage)
    const t = getTranslations(language)
    const agentName = authResult.dbUser.name || authResult.dbUser.email || "PolicyWallet agent"

    const hasAccount = Boolean(owner.emailVerified || owner.lastActiveAt)
    if (hasAccount) {
        // Both language arms, from the same translation bundle — the bus
        // resolves the recipient's language once, at the store/deliver seam.
        const tEl = getTranslations("el")
        const tEn = getTranslations("en")
        await emit({
            event: "ai_consent_request",
            userId: owner.id,
            title: { el: tEl.common.aiConsentRequestTitle, en: tEn.common.aiConsentRequestTitle },
            message: {
                el: `${agentName}: ${tEl.common.aiConsentRequestMessage}`,
                en: `${agentName}: ${tEn.common.aiConsentRequestMessage}`,
            },
            relatedObjectType: "policy",
            relatedObjectId: policy.id,
            // One standing consent request per policy: an advisor clicking twice
            // must not put two identical asks in front of the customer.
            dedupeKey: `ai_consent:${policy.id}`,
        })
        let emailDelivered = false
        if (owner.email) {
            // Best-effort — the in-app notification is the durable request —
            // but report the email outcome instead of silently swallowing it.
            const emailResult = await sendAiConsentRequestEmail({ to: owner.email, agentName, language }).catch(() => null)
            emailDelivered = Boolean(emailResult?.success)
        }
        return { success: true, mode: "notification" as const, emailDelivered }
    }

    const invite = await db.invite.create({
        data: {
            inviterUserId: authResult.dbUser.id,
            inviteeEmail: owner.email,
            token: crypto.randomUUID().replace(/-/g, ""),
            inviteType: "signup",
            relationshipType: "agent_client",
            scope: `policy:${policy.id}`,
            expiresAt: daysFromNow(INVITE_EXPIRY_DAYS),
        },
    })
    const inviteEmailResult = await sendPolicyInviteEmail({
        to: owner.email,
        token: invite.token,
        inviterName: agentName,
        policyNumber: policy.policyNumber,
        language,
    }).catch(() => null)
    const inviteEmailDelivered = Boolean(inviteEmailResult?.success)
    return {
        success: true,
        mode: "invite" as const,
        emailDelivered: inviteEmailDelivered,
        inviteLink: inviteEmailDelivered ? undefined : absoluteUrl(`/invite/${invite.token}`),
    }
}

/**
 * A real email for a customer who was added WITHOUT one (owner decision D3).
 *
 * Replaces the synthetic placeholder and clears `contactEmailMissing`, so
 * the invite flow and every sender stop refusing them. Guarded three ways:
 * the agent holds a LIVING relationship with the customer; the account is a
 * phantom (no password, never verified — an activated account's address is
 * the customer's own to change, CUSTOMER_ACCOUNT_OWNED); and the address is
 * not already someone else's key (EMAIL_IN_USE) — `User.email` is unique and
 * a collision here would be a takeover of the other account's identity.
 */
export async function updateCustomerContact(data: { customerId: string; email: string }) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { success: false as const, error: "UNAUTHORIZED" }
    if (!isAgentRole(authResult.dbUser.roles)) return { success: false as const, error: "UNAUTHORIZED" }
    const agentId = authResult.dbUser.id

    // Validate BEFORE any read: the schema normalises the address and refuses
    // the synthetic domain, so a placeholder can never be written back.
    const parsed = UpdateCustomerContactInput.safeParse(data)
    if (!parsed.success) return validationFailure(parsed.error)
    const customerId = parsed.data.customerId
    // Restated on the key the lookup and the write use (single-path guard).
    const email = normalizeEmail(parsed.data.email)

    try {
        const relationship = await db.customerRelationship.findFirst({
            where: { agentUserId: agentId, policyholderUserId: customerId },
            select: { id: true, status: true },
        })
        if (!relationship || (ENDED_RELATIONSHIP_STATUSES as readonly string[]).includes(relationship.status)) {
            return { success: false as const, error: "CUSTOMER_ACCESS_DENIED" }
        }

        const customer = await db.user.findUnique({
            where: { id: customerId },
            select: { id: true, email: true, emailVerified: true, lastActiveAt: true },
        })
        if (!customer) return { success: false as const, error: "CUSTOMER_ACCESS_DENIED" }
        // Same "activated" rule as the consent attestation (addPolicyForCustomer
        // step 6): a password, a verified email OR any activity means a live
        // account, whose contact details only its owner may change.
        const customerHasPassword = await hasPasswordCredential(db, customerId)
        if (!isPhantomCustomer({ hasPassword: customerHasPassword, emailVerified: customer.emailVerified }) || customer.lastActiveAt) {
            return { success: false as const, error: "CUSTOMER_ACCOUNT_OWNED" }
        }

        const holder = await db.user.findUnique({ where: { email }, select: { id: true } })
        if (holder && holder.id !== customerId) {
            return { success: false as const, error: "EMAIL_IN_USE" }
        }

        await db.user.update({
            where: { id: customerId },
            data: { email, contactEmailMissing: false },
        })
        await db.activityLog.create({
            data: {
                adminUserId: agentId,
                adminEmail: "",
                actionType: "CUSTOMER_CONTACT_EMAIL_ADDED",
                description: "Agent added an email address to a customer who had none",
                targetUserId: customerId,
                metadata: { relationshipId: relationship.id },
            },
        })

        revalidatePath("/customers")
        revalidatePath(`/customers/${customerId}`)
        return { success: true as const, customerId, email }
    } catch (e) {
        await reportActionFailure("updateCustomerContact", e, { agentId, customerId })
        return { success: false as const, error: "PROFILE_UPDATE_FAILED" }
    }
}
