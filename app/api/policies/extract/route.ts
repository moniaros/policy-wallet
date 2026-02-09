import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { env } from "@/lib/env"

export async function POST(request: NextRequest) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 })
        }

        // Size limit (10MB)
        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json({ error: "File too large. Maximum 10MB." }, { status: 400 })
        }

        // Validate MIME type
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({
                error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}`
            }, { status: 400 })
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

        return NextResponse.json({
            success: true,
            data: {
                insurerName: extracted.insurerName || "Unknown Insurer",
                policyNumber: extracted.policyNumber || `TEMP-${Date.now()}`,
                lineOfBusiness: extracted.lineOfBusiness || "motor",
                startDate: extracted.startDate || new Date().toISOString().split('T')[0],
                endDate: extracted.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                premiumAmount: extracted.premiumAmount || null,
                coverageSummary: extracted.coverageSummary || null
            }
        })

    } catch (error) {
        console.error("Policy extraction error:", error)
        return NextResponse.json({
            error: error instanceof Error ? error.message : "Failed to extract policy data"
        }, { status: 500 })
    }
}
