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

/**
 * Bump when extraction changes in a way that should invalidate stored results:
 * a different model, a changed prompt, new or renamed extracted fields, a fix
 * to how a field is parsed.
 *
 * The cache was keyed on document CONTENT alone. Since the same file always
 * hashes the same, a bad first extraction was served back forever (or until the
 * 24h TTL) — and re-uploading the identical file to "try again" returned the
 * identical wrong answer, which is exactly what a user does when the insurer or
 * premium on screen is wrong. Worse, improving the pipeline changed nothing for
 * any document already cached.
 *
 * Entries written before versioning have no marker and are treated as stale:
 * one extra extraction per document, once, in exchange for never serving a
 * result produced by logic that no longer exists.
 */
export const EXTRACTOR_VERSION = 1

/** Stored shape: the extraction plus the version that produced it. */
type VersionedCacheEntry = {
    __extractorVersion?: number
    data?: AIPolicyExtractionResponse
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
    opts: { bypass?: boolean } = {}
): Promise<AIPolicyExtractionResponse | null> {
    // Explicit "analyse this again from scratch". Without a way to bypass, a
    // user faced with a wrong extraction had no action that could change it.
    if (opts.bypass) {
        logger("info", "Extraction cache bypassed on request", { policyId })
        return null
    }
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

        // Check TTL
        const age = Date.now() - doc.extractedAt.getTime()
        if (age > CACHE_TTL_MS) {
            logger("info", "Extraction cache expired", {
                policyId,
                ageHours: Math.round(age / (60 * 60 * 1000)),
            })
            return null
        }

        const entry = doc.extractionCache as unknown as VersionedCacheEntry
        if (entry?.__extractorVersion !== EXTRACTOR_VERSION || !entry.data) {
            logger("info", "Extraction cache stale: produced by a different extractor", {
                policyId,
                cachedVersion: entry?.__extractorVersion ?? null,
                currentVersion: EXTRACTOR_VERSION,
            })
            return null
        }

        logger("info", "Extraction cache hit", {
            policyId,
            documentHash: documentHash.slice(0, 12),
            ageMinutes: Math.round(age / (60 * 1000)),
        })

        return entry.data
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
                extractionCache: {
                    __extractorVersion: EXTRACTOR_VERSION,
                    data: extraction,
                } as any,
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
