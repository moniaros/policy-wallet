/**
 * Extraction Cache
 *
 * Caches AI extraction results per document hash to avoid redundant
 * AI calls when re-analyzing the same document.
 *
 * Cache is stored on the PolicyDocument record alongside the document hash.
 * Validity follows the document and extraction contract, not its age.
 */

import { createHash } from "node:crypto"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import type { AIPolicyExtractionResponse } from "../ai/ai-service.interface"

// Bump when extraction schema, prompt, enrichment or citation semantics change.
export const EXTRACTION_ARTIFACT_VERSION = "agent-evidence-v1"
export async function getExtractionCacheVersion(): Promise<string | null> {
    try {
    const [{ getPromptOverrides }, { getAiRuntimeOverrides }] = await Promise.all([import("../ai/prompt-overrides"), import("../ai/runtime-config")])
    const [prompts, routing] = await Promise.all([getPromptOverrides(), getAiRuntimeOverrides()])
    const models = [process.env.AI_SERVICE_TYPE, process.env.GEMINI_MODEL_EXTRACTION, process.env.OPENAI_MODEL_EXTRACTION, process.env.CLAUDE_MODEL_EXTRACTION, process.env.EXTRACTION_TEXT_FIRST, process.env.EXTRACTION_CITATIONS]
    return createHash("sha256").update(JSON.stringify([EXTRACTION_ARTIFACT_VERSION, models, Object.entries(prompts).sort(), routing])).digest("hex")
    } catch { return null } // Config unavailable: miss safely, never mislabel an artifact.
}

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
 *
 * `documentId` scopes the lookup to the current document version.
 * Without it, a re-upload with the same hash would return a stale
 * cache from an older document record.
 */
export async function getCachedExtraction(
    policyId: string,
    documentHash: string,
    documentId?: string,
    version?: string | null
): Promise<AIPolicyExtractionResponse | null> {
    try {
        const doc = await db.policyDocument.findFirst({
            where: {
                policyId,
                documentHash,
                extractedAt: { not: null },
                // M2: Scope to current document version when documentId is provided
                ...(documentId ? { id: documentId } : {}),
            },
            orderBy: { uploadedAt: "desc" },
            select: {
                extractionCache: true,
                extractedAt: true,
            },
        })

        if (!doc?.extractionCache || !doc.extractedAt) return null

        const cached = doc.extractionCache as unknown as { version?: string; extraction?: AIPolicyExtractionResponse }
        const expectedVersion = version === undefined ? await getExtractionCacheVersion() : version
        if (!expectedVersion || cached.version !== expectedVersion || !cached.extraction) return null
        return cached.extraction
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
    extraction: AIPolicyExtractionResponse,
    version: string | null
): Promise<void> {
    if (!version) return
    try {
        await db.policyDocument.updateMany({
            where: {
                policyId,
                documentHash,
            },
            data: {
                extractionCache: { version, extraction } as any,
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
