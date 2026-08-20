/**
 * Translation Cache
 *
 * In-memory LRU cache backed by the database TranslationCache table.
 * Caches Greek→English translations to avoid redundant AI calls for
 * repeated insurance phrases.
 */

import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

const LRU_MAX_SIZE = 500

const lru = new Map<string, string>()

function lruGet(key: string): string | undefined {
    const value = lru.get(key)
    if (value !== undefined) {
        // Move to end (most recently used)
        lru.delete(key)
        lru.set(key, value)
    }
    return value
}

function lruSet(key: string, value: string): void {
    if (lru.has(key)) {
        lru.delete(key)
    } else if (lru.size >= LRU_MAX_SIZE) {
        // Evict oldest (first) entry
        const firstKey = lru.keys().next().value
        if (firstKey !== undefined) lru.delete(firstKey)
    }
    lru.set(key, value)
}

async function hashText(text: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(text)
    const hashBuffer = await crypto.subtle.digest("SHA-256", data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

export async function getCachedTranslation(
    sourceText: string,
    sourceLang = "el",
    targetLang = "en"
): Promise<string | null> {
    const hash = await hashText(`${sourceLang}:${targetLang}:${sourceText}`)

    // Check in-memory LRU first
    const cached = lruGet(hash)
    if (cached !== undefined) return cached

    // Check database
    try {
        const row = await db.translationCache.findUnique({
            where: { contentHash: hash },
        })
        if (row) {
            lruSet(hash, row.translated)
            return row.translated
        }
    } catch (error) {
        logger("warn", "Translation cache DB lookup failed", {
            error: error instanceof Error ? error.message : String(error),
        })
    }

    return null
}

/**
 * Only real string pairs may enter the cache. Objects reached this layer once
 * (double-wrapped `{el,en}` fields) and every such write died on the Prisma
 * string type — worse, all of them hashed the SAME key via implicit
 * "[object Object]" stringification, so even a "successful" write would have
 * poisoned one entry with arbitrary content.
 */
function isCacheableText(value: unknown): value is string {
    return typeof value === "string" && value.trim() !== ""
}

export async function setCachedTranslation(
    sourceText: string,
    translated: string,
    sourceLang = "el",
    targetLang = "en"
): Promise<void> {
    if (!isCacheableText(sourceText) || !isCacheableText(translated)) {
        logger("warn", "Refusing to cache a non-string or empty translation pair", {
            sourceType: typeof sourceText,
            translatedType: typeof translated,
        })
        return
    }
    const hash = await hashText(`${sourceLang}:${targetLang}:${sourceText}`)

    lruSet(hash, translated)

    try {
        await db.translationCache.upsert({
            where: { contentHash: hash },
            update: { translated },
            create: {
                contentHash: hash,
                sourceLang,
                targetLang,
                sourceText,
                translated,
            },
        })
    } catch (error) {
        logger("warn", "Translation cache DB write failed", {
            error: error instanceof Error ? error.message : String(error),
        })
    }
}

export async function getCachedTranslations(
    texts: string[],
    sourceLang = "el",
    targetLang = "en"
): Promise<Map<number, string>> {
    const results = new Map<number, string>()
    if (texts.length === 0) return results

    // One hash per text, ONE findMany for every LRU miss. The per-text
    // findUnique loop cost N sequential roundtrips per run (measured at
    // ~1.3s each against the remote dev DB — the loop alone was ~20s).
    const hashes = await Promise.all(
        texts.map((text) =>
            isCacheableText(text) ? hashText(`${sourceLang}:${targetLang}:${text}`) : null
        )
    )

    const missIndices: number[] = []
    for (let i = 0; i < texts.length; i++) {
        const hash = hashes[i]
        if (!hash) continue
        const cached = lruGet(hash)
        if (cached !== undefined) results.set(i, cached)
        else missIndices.push(i)
    }
    if (missIndices.length === 0) return results

    try {
        const rows = await db.translationCache.findMany({
            where: { contentHash: { in: missIndices.map((i) => hashes[i] as string) } },
        })
        const byHash = new Map(rows.map((row) => [row.contentHash, row.translated]))
        for (const i of missIndices) {
            const translated = byHash.get(hashes[i] as string)
            if (translated !== undefined) {
                lruSet(hashes[i] as string, translated)
                results.set(i, translated)
            }
        }
    } catch (error) {
        logger("warn", "Translation cache DB lookup failed", {
            error: error instanceof Error ? error.message : String(error),
        })
    }

    return results
}

export async function setCachedTranslations(
    pairs: Array<{ source: string; translated: string }>,
    sourceLang = "el",
    targetLang = "en"
): Promise<void> {
    const cacheable = pairs.filter(
        (p) => isCacheableText(p.source) && isCacheableText(p.translated)
    )
    if (cacheable.length === 0) return

    const entries = await Promise.all(
        cacheable.map(async ({ source, translated }) => ({
            contentHash: await hashText(`${sourceLang}:${targetLang}:${source}`),
            sourceLang,
            targetLang,
            sourceText: source,
            translated,
        }))
    )
    for (const entry of entries) lruSet(entry.contentHash, entry.translated)

    // ONE statement instead of N upserts. skipDuplicates: a cache never needs
    // to overwrite — first write wins, and concurrent runs cannot conflict.
    try {
        await db.translationCache.createMany({ data: entries, skipDuplicates: true })
    } catch (error) {
        logger("warn", "Translation cache DB write failed", {
            error: error instanceof Error ? error.message : String(error),
        })
    }
}
