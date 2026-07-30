import { NextResponse } from "next/server"
import { getAIService } from "@/lib/services/ai/ai-service.factory"
import { MAX_UPLOAD_SIZE_BYTES } from "@/lib/constants/time"
import { validateUploadFile, REJECTION_MESSAGES } from "@/lib/security/file-upload"
import { withApiGuard } from "@/lib/api-guard"
import { canUserAddPolicy } from "@/lib/subscription-limits"
import { recordConversionEvent } from "@/lib/journey/conversion-events"

// Policy PDF extraction (the "parse"). This is the single paid-AI operation a
// free/Starter user may run — the source of their basic summary — so it is
// gated by the policy allowance (free = 1) rather than blocked outright, plus
// rate-limited. Deep AI analysis is gated separately at the orchestrator.
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

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "AI service unavailable" }, { status: 503 })
        }

        // Route the upload preview through the SAME extraction path the analysis
        // pipeline uses — one prompt (buildExtractionPrompt), one schema, one
        // JSON-mode contract — instead of a divergent inline prompt. No userId is
        // passed, so this preview stays unmetered exactly as before; the
        // orchestrator meters its own extraction later.
        const arrayBuffer = await file.arrayBuffer()
        const base64Data = Buffer.from(arrayBuffer).toString("base64")

        const data = await getAIService("gemini").extractPolicyData({
            data: base64Data,
            mimeType: file.type === "application/pdf" ? "application/pdf" : file.type,
            fileName: file.name,
        })

        return NextResponse.json({ success: true, data })

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
