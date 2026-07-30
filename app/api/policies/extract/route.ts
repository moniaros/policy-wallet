import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAIService } from "@/lib/services/ai"
import { enforceBillableCallPolicy } from "@/lib/services/ai/guard"
import { MAX_UPLOAD_SIZE_BYTES } from "@/lib/constants/time"
import { validateUploadFile, REJECTION_MESSAGES, sanitizeDisplayName } from "@/lib/security/file-upload"
import { withApiGuard } from "@/lib/api-guard"
import { canUserAddPolicy } from "@/lib/subscription-limits"
import { recordConversionEvent } from "@/lib/journey/conversion-events"

// Policy PDF extraction (the "parse"). This is the single paid-AI operation a
// free/Starter user may run — the source of their basic summary — so it is
// gated by the policy allowance (free = 1) rather than blocked outright, plus
// rate-limited. Deep AI analysis is gated separately at the orchestrator.
//
// This route used to hand-roll a raw @google/generative-ai call with its own
// prompt, no timeout/retry, no token metering, and a regex JSON rescue. It now
// runs through the shared IAIService abstraction (getAIService().extractPolicyData),
// which brings the 3-min timeout + retry ladder, the canonical extraction
// prompt, capability checks, and token metering — closing an off-the-books
// spend hole. The response shape is preserved for the batch-upload client.
export const POST = withApiGuard(
    {
        auth: { mode: "user" },
        rateLimit: {
            limit: 6,
            windowMs: 60 * 1000,
            key: ({ auth }) => `policy:extract:${auth?.dbUser.id || "anonymous"}`,
        },
    },
    async ({ req, auth }) => {
        const authResult = auth!

        // Cap the AI parse to what the user can actually save: once they are at
        // their policy limit, block the (paid) extraction and surface upgrade.
        const canAdd = await canUserAddPolicy(authResult.dbUser.id)
        if (!canAdd.allowed) {
            await recordConversionEvent(authResult.dbUser.id, "free_ai_call_blocked", {
                kind: "policy_parse",
                source: "policy_extract",
            })
            return NextResponse.json(
                { error: "POLICY_LIMIT_REACHED", code: "POLICY_LIMIT_REACHED" },
                { status: 403 }
            )
        }

        try {
            const formData = await req.formData()
            const file = formData.get('file')

            if (!(file instanceof File)) {
                return NextResponse.json({ error: "No file provided" }, { status: 400 })
            }

            // Validate size, extension allowlist, content-type, and magic bytes
            // before spending a billable AI call on the (possibly disguised) file.
            const validation = await validateUploadFile(file, { category: "policy", maxBytes: MAX_UPLOAD_SIZE_BYTES })
            if (!validation.ok) {
                return NextResponse.json({ error: REJECTION_MESSAGES[validation.reason] }, { status: 400 })
            }

            // Instance-independent daily backstop. The withApiGuard limiter above
            // is 6/min but per-instance in production (RATELIMIT_ALLOW_LOCAL, no
            // Upstash); this DB-backed 30/day cap counts the POLICY_EXTRACT_REQUESTED
            // rows written below and holds across serverless instances.
            const gate = await enforceBillableCallPolicy({
                userId: authResult.dbUser.id,
                actionType: "POLICY_EXTRACT_REQUESTED",
                redisBucket: `policy-extract-day:${authResult.dbUser.id}`,
                redisLimit: 30,
                redisWindowMs: 24 * 60 * 60 * 1000,
                dbLimit: 30,
                dbWindowMs: 24 * 60 * 60 * 1000,
            })
            if (!gate.allowed) {
                return NextResponse.json({ error: "RATE_LIMITED", code: "RATE_LIMITED" }, { status: 429 })
            }

            const aiService = getAIService()
            if (!aiService.isAvailable()) {
                return NextResponse.json({ error: "AI service unavailable" }, { status: 503 })
            }

            // Auditable spend, written before the billable call so every committed
            // attempt counts toward the DB backstop. userId only — no email, no
            // customer identifiers in the row (GDPR audit M3).
            try {
                await db.activityLog.create({
                    data: {
                        adminUserId: authResult.dbUser.id,
                        adminEmail: "",
                        actionType: "POLICY_EXTRACT_REQUESTED",
                        description: "Policy PDF quick-extract",
                    },
                })
            } catch { /* never fail the parse on a logging error */ }

            const arrayBuffer = await file.arrayBuffer()
            const base64Data = Buffer.from(arrayBuffer).toString("base64")

            const result = await aiService.extractPolicyData(
                {
                    data: base64Data,
                    mimeType: file.type,
                    // Sanitized — the raw client filename (often the customer's
                    // name) must not reach the third-party AI provider.
                    fileName: sanitizeDisplayName(file.name),
                },
                { userId: authResult.dbUser.id },
            )

            return NextResponse.json({
                success: true,
                data: {
                    insurerName: result.insurerName || "Unknown Insurer",
                    policyNumber: result.policyNumber || `TEMP-${Date.now()}`,
                    lineOfBusiness: result.lineOfBusiness || "motor",
                    // Missing dates stay empty — no fabricated 'today' (data integrity).
                    startDate: result.startDate || '',
                    endDate: result.endDate || '',
                    premiumAmount: result.premiumAmount ?? null,
                    coverageSummary: result.coverageSummary || null,
                    exclusions: result.exclusions ?? [],
                    extractionMeta: result.extractionMeta,
                    acordData: result.acordData,
                },
            })
        } catch (error) {
            // Log the real error server-side; never echo internals (AI provider /
            // parser detail) to the client.
            console.error("Policy extraction error:", error)
            return NextResponse.json({
                error: "Failed to extract policy data"
            }, { status: 500 })
        }
    }
)
