/**
 * Batch Translator
 *
 * Translates an array of Greek strings to English in a single AI call
 * using the cheapest available model. Uses the translation cache to
 * skip already-translated strings.
 *
 * Expected savings: 25-35% of output tokens per AI call by generating
 * Greek-only from the main analysis and batch-translating afterward.
 */

import { generateObject } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { z } from "zod"
import { env } from "@/lib/env"
import { logger } from "@/lib/logger"
import {
    getCachedTranslations,
    setCachedTranslations,
} from "./translation-cache"

const BATCH_SIZE = 40

/**
 * Translates an array of Greek strings to English.
 * Returns an array of the same length with English translations.
 * Uses cache for previously translated strings.
 */
export async function batchTranslateToEnglish(
    greekTexts: string[]
): Promise<string[]> {
    if (greekTexts.length === 0) return []

    const results = new Array<string>(greekTexts.length)

    // Check cache for existing translations
    const cached = await getCachedTranslations(greekTexts, "el", "en")
    const uncachedIndices: number[] = []

    for (let i = 0; i < greekTexts.length; i++) {
        const hit = cached.get(i)
        if (hit !== undefined) {
            results[i] = hit
        } else {
            uncachedIndices.push(i)
        }
    }

    if (uncachedIndices.length === 0) {
        logger("info", "Batch translation fully served from cache", {
            total: greekTexts.length,
        })
        return results
    }

    // Translate uncached strings in batches
    for (let offset = 0; offset < uncachedIndices.length; offset += BATCH_SIZE) {
        const batchIndices = uncachedIndices.slice(offset, offset + BATCH_SIZE)
        const batchTexts = batchIndices.map((i) => greekTexts[i])

        try {
            const translations = await translateBatch(batchTexts)

            const cachePairs: Array<{ source: string; translated: string }> = []
            for (let j = 0; j < batchIndices.length; j++) {
                const translated = translations[j] || batchTexts[j]
                results[batchIndices[j]] = translated
                cachePairs.push({ source: batchTexts[j], translated })
            }

            // Cache in background — don't block the pipeline
            setCachedTranslations(cachePairs, "el", "en").catch((err) => {
                logger("warn", "Failed to cache batch translations", {
                    error: err instanceof Error ? err.message : String(err),
                })
            })
        } catch (error) {
            logger("error", "Batch translation failed, falling back to source text", {
                error: error instanceof Error ? error.message : String(error),
                batchSize: batchTexts.length,
            })
            // Graceful degradation: use Greek text as-is
            for (const idx of batchIndices) {
                results[idx] = greekTexts[idx]
            }
        }
    }

    logger("info", "Batch translation completed", {
        total: greekTexts.length,
        cached: cached.size,
        translated: uncachedIndices.length,
    })

    return results
}

async function translateBatch(texts: string[]): Promise<string[]> {
    if (!env.GEMINI_API_KEY) {
        throw new Error("No GEMINI_API_KEY available for batch translation")
    }

    const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY })

    const { object } = await generateObject({
        // Env-keyed: gemini-2.0-flash was hardcoded here and is marked for
        // shutdown by Google — the model now follows GEMINI_MODEL_TRANSLATION.
        model: google(env.GEMINI_MODEL_TRANSLATION),
        schema: z.object({
            translations: z.array(z.string()).describe(
                "English translations in the same order as the input array"
            ),
        }),
        system: `You are a professional insurance translator specializing in Greek-to-English translation.
Translate each Greek text to natural, professional English.
Preserve insurance terminology accurately (e.g., ασφαλιστήριο = policy, απαλλαγή = deductible/excess, ασφάλιστρο = premium, κάλυψη = coverage).
Return exactly the same number of translations in the same order.
Keep translations concise — do not add explanations.`,
        prompt: `Translate these ${texts.length} Greek insurance texts to English:\n\n${texts.map((t, i) => `[${i}] ${t}`).join("\n")}`,
    })

    if (object.translations.length !== texts.length) {
        logger("warn", "Translation count mismatch", {
            expected: texts.length,
            received: object.translations.length,
        })
        // Pad or trim to match
        while (object.translations.length < texts.length) {
            object.translations.push(texts[object.translations.length])
        }
    }

    return object.translations
}
