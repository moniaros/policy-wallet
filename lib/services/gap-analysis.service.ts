import { BaseService } from "./base.service"
import { db } from "@/lib/db"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { logger } from "@/lib/logger"
import path from "path"
import fs from "fs/promises"
import { Policy } from "@prisma/client"
import {
    GapSeverity,
    detectGapsForPolicy as legacyDetectGapsForPolicy,
    detectGapsForUser as legacyDetectGapsForUser
} from "@/lib/gap-detection" // We might need to adjust imports if we move things or keep using legacy logic

// Type Definitions
export interface GapAnalysisResult {
    success: boolean
    count?: number
    message?: string
    error?: string
}

export interface DetectedGap {
    gapDefinitionId: string
    policyId: string
    severity: GapSeverity
    title: string
    description: string
    detectedAt: Date
}

interface GapDefinition {
    id: string
    name: string
    slug: string
    description: string | null
    lineOfBusiness: string
    isActive: boolean
    defaultSeverity: string
    detectionLogic: any
}

// In-memory cache for definitions (simple optimization)
let gapDefinitionsCache: Record<string, GapDefinition[]> = {}
let lastCacheUpdate: number = 0

export class GapAnalysisService extends BaseService {

    /**
     * Analyzes a policy for coverage gaps using AI.
     * 
     * @param policyId - The ID of the policy to analyze
     * @param userId - The ID of the user requesting analysis
     */
    async analyzePolicy(policyId: string, userId: string): Promise<GapAnalysisResult> {
        // 1. Authorization
        const policy = await this.db.policy.findUnique({
            where: { id: policyId },
            include: { documents: true }
        })

        if (!policy) throw new Error("Policy not found")

        // Allow Owner OR Authorized Agent
        const isOwner = policy.ownerUserId === userId
        if (!isOwner) {
            const hasAccess = await this.db.accessGrant.findFirst({
                where: {
                    granterUserId: policy.ownerUserId,
                    granteeUserId: userId,
                    status: 'active'
                }
            })

            const hasRelationship = !hasAccess ? await this.db.customerRelationship.findFirst({
                where: {
                    agentUserId: userId,
                    policyholderUserId: policy.ownerUserId,
                }
            }) : null

            if (!hasAccess && !hasRelationship) throw new Error("Unauthorized access to this policy")
        }

        // 2. Fetch Gap Definitions
        const gaps = await this.getGapDefinitions(policy.lineOfBusiness)

        if (gaps.length === 0) return { success: true, count: 0, message: "No applicable gap definitions." }

        // Clear existing open gaps to re-analyze
        await this.db.gapInstance.deleteMany({
            where: {
                policyId,
                status: 'open' // Keep resolved/dismissed history? Original code deleted all. Let's stick to original behavior for now or improve.
                // Original code: await db.gapInstance.deleteMany({ where: { policyId } })
                // Let's stick to original for consistency unless we want to persist resolved ones. 
                // The prompt says "Clear existing gaps to re-analyze".
            }
        })
        // Wait, if we delete resolved ones, we lose history. But if we don't, we might duplicate.
        // The original code deleted ALL. Let's do that for now to avoid complexity, but noted for future improvement.
        await this.db.gapInstance.deleteMany({ where: { policyId } })

        if (!process.env.GEMINI_API_KEY) {
            throw new Error("AI Service Unavailable")
        }

        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            // Prepare Document if available
            let imagePart = null;
            if (policy.documents.length > 0) {
                const doc = policy.documents[0];
                try {
                    let buffer: Buffer;

                    if (doc.fileUrl.startsWith('http')) {
                        const response = await fetch(doc.fileUrl);
                        if (!response.ok) throw new Error(`Failed to fetch remote file: ${response.statusText}`);
                        const arrayBuffer = await response.arrayBuffer();
                        buffer = Buffer.from(arrayBuffer);
                    } else {
                        // Normalize fileUrl
                        let relativePath = doc.fileUrl.startsWith('/') ? doc.fileUrl.slice(1) : doc.fileUrl;
                        const filePath = path.join(process.cwd(), "public", relativePath);
                        buffer = await fs.readFile(filePath);
                    }

                    let mimeType = "application/pdf";
                    const lowerName = doc.fileName.toLowerCase();
                    if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) mimeType = "image/jpeg";
                    else if (lowerName.endsWith(".png")) mimeType = "image/png";
                    else if (lowerName.endsWith(".webp")) mimeType = "image/webp";

                    imagePart = {
                        inlineData: {
                            data: buffer.toString("base64"),
                            mimeType
                        }
                    };
                } catch (e: any) {
                    logger('error', 'Analysis: Document read failed', { error: e.message, fileUrl: doc.fileUrl });
                    // Continue without document if failed? Or fail? Original failed.
                    throw new Error(`Failed to read document: ${e.message}`)
                }
            }

            const prompt = `
            You are an expert insurance analyst. Your task is to analyze the provided policy document and database metadata.

            CRITICAL: The provided DOCUMENT is the ABSOLUTE SOURCE OF TRUTH. 
            The "Current Metadata" provided below may be incomplete or incorrect.
            You must FIRST extract the actual details from the document.

            Step 1: Data Verification
            - Extract Insurer, Policy Number, Dates, and Premium from the DOCUMENT.
            - If the document is missing or unreadable, fall back to the Current Metadata.

            Step 2: Gap Analysis
            - Using the VERIFIED data from Step 1, check for the following gaps.
            - Provide a clear explanation based on the document's clauses.

            Current Metadata (Reference Only):
            Insurer: ${policy.insurerName}
            Policy Number: ${policy.policyNumber}
            Type: ${policy.lineOfBusiness}
            Dates: ${policy.startDate.toISOString().split('T')[0]} to ${policy.endDate.toISOString().split('T')[0]}
            Premium: ${policy.premiumAmount}
            Summary: ${policy.coverageSummary || "N/A"}

            Potential Gaps to Check:
            ${gaps.map(g => `- Slug: ${g.slug} (${g.name}): ${(g.detectionLogic as any)?.check || g.description}`).join('\n')}

            IMPORTANT: Return ONLY a JSON object with this exact structure:
            {
                "verifiedMetadata": {
                    "insurerName": "string",
                    "policyNumber": "string",
                    "lineOfBusiness": "motor|health|home|life|travel|liability",
                    "startDate": "YYYY-MM-DD",
                    "endDate": "YYYY-MM-DD",
                    "premiumAmount": number,
                    "coverageSummary": "string"
                },
                "gapResults": [
                    {
                        "slug": "gap-slug",
                        "isDetected": boolean,
                        "explanation": { "en": "string", "el": "string" },
                        "suggestion": { "en": "string", "el": "string" }
                    }
                ],
                "acordData": {
                    "acordStandard": "V1.0",
                    "policy": { ... },
                    "vehicle": { ... },
                    "coverages": [ ... ]
                }
            }
            `;

            const parts: any[] = [prompt];
            if (imagePart) parts.push(imagePart);

            const result = await model.generateContent(parts);
            const response = await result.response;
            const text = response.text();

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("AI did not return a valid JSON object");
            const analysis = JSON.parse(jsonMatch[0]);

            const { verifiedMetadata, gapResults, acordData } = analysis;

            // Update Policy with verified data
            // We use 'any' cast here because strict types might clash or optional fields might be missing in partial update
            await (this.db.policy as any).update({
                where: { id: policyId },
                data: {
                    insurerName: verifiedMetadata.insurerName || policy.insurerName,
                    policyNumber: verifiedMetadata.policyNumber || policy.policyNumber,
                    lineOfBusiness: verifiedMetadata.lineOfBusiness || policy.lineOfBusiness,
                    startDate: this.parseAnalysisDate(verifiedMetadata.startDate) || policy.startDate,
                    endDate: this.parseAnalysisDate(verifiedMetadata.endDate) || policy.endDate,
                    premiumAmount: typeof verifiedMetadata.premiumAmount === 'number' ? verifiedMetadata.premiumAmount : policy.premiumAmount,
                    coverageSummary: verifiedMetadata.coverageSummary || policy.coverageSummary,
                    acordData: acordData || (policy as any).acordData || {},
                    lastAnalyzedAt: new Date()
                }
            })

            let detectedCount = 0;
            for (const item of gapResults) {
                if (item.isDetected) {
                    const def = gaps.find(g => g.slug === item.slug)
                    if (def) {
                        await this.db.gapInstance.create({
                            data: {
                                policyId: policyId,
                                gapDefinitionId: def.id,
                                severity: def.defaultSeverity || "medium",
                                status: "open",
                                aiExplanation: item.explanation?.en || item.explanation || "No explanation provided",
                                aiExplanationEl: item.explanation?.el || item.explanation || "Δεν δόθηκε εξήγηση",
                                aiSuggestion: item.suggestion?.en || item.suggestion || "No suggestion",
                                aiSuggestionEl: item.suggestion?.el || item.suggestion || "Καμία πρόταση",
                                detectedAt: new Date()
                            }
                        })
                        detectedCount++;
                    }
                }
            }

            await this.logActivity(
                userId,
                "POLICY_ANALYZED",
                `Analyzed and updated policy ${policyId} - ${detectedCount} gaps found`,
                { policyId, detectedCount, updated: true }
            )

            return { success: true, count: detectedCount }

        } catch (e: any) {
            console.error("AI Gap Analysis failed", e)
            return { success: false, error: `Analysis failed: ${e.message}` }
        }
    }

    /**
     * Detects gaps for all user policies using locally defined logic (legacy/hybrid).
     * 
     * @param userId - The user ID
     */
    async detectGapsForUser(userId: string): Promise<DetectedGap[]> {
        // Reuse logic from gap-detection.ts which already interacts with DB
        return legacyDetectGapsForUser(userId)
    }

    /**
     * Retrieves active gap definitions for a specific Line of Business.
     * Uses simple caching to reduce DB hits.
     * 
     * @param lineOfBusiness - The LOB to filter by (optional)
     */
    async getGapDefinitions(lineOfBusiness?: string): Promise<GapDefinition[]> {
        const now = Date.now()
        // Cache for 5 minutes
        if (now - lastCacheUpdate > 5 * 60 * 1000) {
            gapDefinitionsCache = {}
            lastCacheUpdate = now
        }

        const normalizedLOB = lineOfBusiness ? lineOfBusiness.toLowerCase().replace(' protection', '').trim() : 'all';

        if (gapDefinitionsCache[normalizedLOB]) {
            return gapDefinitionsCache[normalizedLOB]
        }

        const gaps = await this.db.gapDefinition.findMany({
            where: {
                // If LOB is provided, filter by it. If not, maybe return all?
                ...(lineOfBusiness ? {
                    lineOfBusiness: {
                        equals: normalizedLOB,
                        mode: 'insensitive'
                    }
                } : {}),
                isActive: true
            }
        })

        // Map Prisma result to our interface if needed, or cast
        // Assuming strict match for now.
        const mappedGaps = gaps.map(g => ({
            ...g,
            detectionLogic: g.detectionLogic ? (typeof g.detectionLogic === 'string' ? JSON.parse(g.detectionLogic) : g.detectionLogic) : {}
        })) as GapDefinition[]

        gapDefinitionsCache[normalizedLOB] = mappedGaps
        return mappedGaps
    }

    /**
     * Mark a gap as resolved.
     * 
     * @param gapInstanceId - The ID of the gap instance
     * @param userId - The user ID acting
     */
    async resolveGap(gapInstanceId: string, userId: string): Promise<void> {
        // Simple auth check: user owns the policy associated with this gap?
        const gap = await this.db.gapInstance.findUnique({
            where: { id: gapInstanceId },
            include: { policy: true }
        })

        if (!gap) throw new Error("Gap not found")
        if (gap.policy.ownerUserId !== userId) {
            // Check agents logic here if needed, simplified for now
            throw new Error("Unauthorized")
        }

        await this.db.gapInstance.update({
            where: { id: gapInstanceId },
            data: { status: 'resolved' }
        })

        await this.logActivity(userId, "GAP_RESOLVED", `Resolved gap ${gapInstanceId}`, { gapInstanceId })
    }

    /**
     * Mark a gap as dismissed.
     * 
     * @param gapInstanceId - The ID of the gap instance
     * @param userId - The user ID acting
     * @param reason - Reason for dismissal
     */
    async dismissGap(gapInstanceId: string, userId: string, reason: string): Promise<void> {
        const gap = await this.db.gapInstance.findUnique({
            where: { id: gapInstanceId },
            include: { policy: true }
        })

        if (!gap) throw new Error("Gap not found")
        if (gap.policy.ownerUserId !== userId) {
            throw new Error("Unauthorized")
        }

        await this.db.gapInstance.update({
            where: { id: gapInstanceId },
            data: {
                status: 'dismissed',
                // We might need a field for dismissal reason in schema? 
                // Previous implementation didn't specify one, so we just log it.
            }
        })

        await this.logActivity(userId, "GAP_DISMISSED", `Dismissed gap ${gapInstanceId}: ${reason}`, { gapInstanceId, reason })
    }

    private parseAnalysisDate(d: string | undefined): Date | undefined {
        if (!d) return undefined;
        const date = new Date(d);
        return isNaN(date.getTime()) ? undefined : date;
    }
}
