/**
 * Extraction Cache
 *
 * Caches AI extraction results per document hash to avoid redundant
 * AI calls when re-analyzing the same document. Saves 80-90% of
 * tokens on re-analysis / Q&A for the same policy.
 *
 * Cache is stored on the PolicyDocument record alongside the document hash.
 * Cache is valid for 24 hours after extraction.
 */

import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import type { AIPolicyExtractionResponse } from "../ai/ai-service.interface"

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export async function hashDocumentBuffer(buffer: Buffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest(
        "SHA-256",
        new Uint8Array(buffer)
    )
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

/**
 * Check if a cached extraction exists for the given document.
 * Returns the cached result if valid, or null if expired/missing.
 */
export async function getCachedExtraction(
    policyId: string,
    documentHash: string
): Promise<AIPolicyExtractionResponse | null> {
    try {
        const doc = await db.policyDocument.findFirst({
            where: {
                policyId,
                documentHash,
                extractedAt: { not: null },
            },
            orderBy: { uploadedAt: "desc" },
            select: {
                extractionCache: true,
                extractedAt: true,
            },
        })

        if (!doc?.extractionCache || !doc.extractedAt) return null

        // Check TTL
        const age = Date.now() - doc.extractedAt.getTime()
        if (age > CACHE_TTL_MS) {
            logger("info", "Extraction cache expired", {
                policyId,
                ageHours: Math.round(age / (60 * 60 * 1000)),
            })
            return null
        }

        logger("info", "Extraction cache hit", {
            policyId,
            documentHash: documentHash.slice(0, 12),
            ageMinutes: Math.round(age / (60 * 1000)),
        })

        return doc.extractionCache as unknown as AIPolicyExtractionResponse
    } catch (error) {
        logger("warn", "Extraction cache lookup failed", {
            policyId,
            error: error instanceof Error ? error.message : String(error),
        })
        return null
    }
}

/**
 * Cache an extraction result on the PolicyDocument record.
 */
export async function setCachedExtraction(
    policyId: string,
    documentHash: string,
    extraction: AIPolicyExtractionResponse
): Promise<void> {
    try {
        await db.policyDocument.updateMany({
            where: {
                policyId,
                documentHash,
            },
            data: {
                extractionCache: extraction as any,
                extractedAt: new Date(),
            },
        })

        logger("info", "Extraction cached", {
            policyId,
            documentHash: documentHash.slice(0, 12),
        })
    } catch (error) {
        logger("warn", "Extraction cache write failed", {
            policyId,
            error: error instanceof Error ? error.message : String(error),
        })
    }
}

/**
 * Store the document hash on the PolicyDocument record during document loading.
 */
export async function setDocumentHash(
    documentId: string,
    hash: string
): Promise<void> {
    try {
        await db.policyDocument.update({
            where: { id: documentId },
            data: { documentHash: hash },
        })
    } catch (error) {
        logger("warn", "Failed to set document hash", {
            documentId,
            error: error instanceof Error ? error.message : String(error),
        })
    }
}
