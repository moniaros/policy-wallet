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

export async function setCachedTranslation(
    sourceText: string,
    translated: string,
    sourceLang = "el",
    targetLang = "en"
): Promise<void> {
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

    for (let i = 0; i < texts.length; i++) {
        const cached = await getCachedTranslation(texts[i], sourceLang, targetLang)
        if (cached !== null) {
            results.set(i, cached)
        }
    }

    return results
}

export async function setCachedTranslations(
    pairs: Array<{ source: string; translated: string }>,
    sourceLang = "el",
    targetLang = "en"
): Promise<void> {
    await Promise.all(
        pairs.map(({ source, translated }) =>
            setCachedTranslation(source, translated, sourceLang, targetLang)
        )
    )
}
