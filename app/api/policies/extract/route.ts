import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { env } from "@/lib/env"
import { enrichExtractionPayload } from "@/lib/services/ai/extraction-enrichment"
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

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
        const model = genAI.getGenerativeModel({
            model: env.GEMINI_MODEL_EXTRACTION,
            generationConfig: { responseMimeType: "application/json" }
        })

        const arrayBuffer = await file.arrayBuffer()
        const base64Data = Buffer.from(arrayBuffer).toString("base64")

        const prompt = `
        Analyze this insurance policy document and extract the following information.
        
        Fields:
        - insurerName (string): The insurance company name
        - policyNumber (string): The policy number
        - lineOfBusiness (one of: motor, health, home, life, travel, liability)
        - startDate (YYYY-MM-DD format)
        - endDate (YYYY-MM-DD format)
        - premiumAmount (number): Annual premium amount
        - coverageSummary (string): Brief summary of main coverages (max 200 chars)
        - exclusions (array of strings): top exclusions/limitations found in the text
        - extractionConfidence (object): {
            overall: 0-100,
            requiresReview: boolean,
            fields: {
              insurerName: 0-100,
              policyNumber: 0-100,
              lineOfBusiness: 0-100,
              startDate: 0-100,
              endDate: 0-100,
              premiumAmount: 0-100
            }
          }
        
        If a field cannot be determined, use null.
        `

        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType: file.type === "application/pdf" ? "application/pdf" : file.type,
            },
        }

        const result = await model.generateContent([prompt, imagePart])
        const response = await result.response
        const text = response.text()

        // Clean up markdown code blocks if present (just in case model ignores responseMimeType)
        const cleanText = text.replace(/```json\n?|\n?```/g, '').trim()

        // Extract JSON
        let extracted;
        try {
            extracted = JSON.parse(cleanText);
        } catch (e) {
            const jsonMatch = cleanText.match(/\{[\s\S]*\}/)
            if (!jsonMatch) {
                console.error("Failed to parse AI response:", text)
                return NextResponse.json({
                    error: "Could not extract policy data from document"
                }, { status: 422 })
            }
            extracted = JSON.parse(jsonMatch[0])
        }
        const enriched = enrichExtractionPayload(extracted, undefined, 'gemini')

        return NextResponse.json({
            success: true,
            data: {
                insurerName: extracted.insurerName || "Unknown Insurer",
                policyNumber: extracted.policyNumber || `TEMP-${Date.now()}`,
                lineOfBusiness: extracted.lineOfBusiness || "motor",
                // Missing dates stay empty — no fabricated 'today' (data integrity).
            startDate: extracted.startDate || '',
                endDate: extracted.endDate || '',
                premiumAmount: extracted.premiumAmount || null,
                coverageSummary: extracted.coverageSummary || null,
                exclusions: enriched.exclusions,
                extractionMeta: enriched.extractionMeta,
                acordData: enriched.acordData
            }
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
