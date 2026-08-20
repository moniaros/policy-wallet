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
import { withTimeoutAndRetry, parseUsage } from "@/lib/services/ai/shared-utils"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { z } from "zod"
import { env } from "@/lib/env"
import { logger } from "@/lib/logger"
import { trackTokenUsage } from "@/lib/token-tracking"
import {
    getCachedTranslations,
    setCachedTranslations,
} from "./translation-cache"

const BATCH_SIZE = 40

/**
 * Optional metering context. When provided, each translation batch records a
 * TokenUsage row against the user — otherwise the post-analysis translation
 * pass (a real, billable Gemini call) spends provider money off the books.
 */
export interface TranslationTracking {
    userId: string
    policyId?: string
}

/**
 * Translates an array of Greek strings to English.
 * Returns an array of the same length with English translations.
 * Uses cache for previously translated strings.
 */
export async function batchTranslateToEnglish(
    greekTexts: string[],
    tracking?: TranslationTracking
): Promise<string[]> {
    if (greekTexts.length === 0) return []

    const results = new Array<string>(greekTexts.length)

    // Check cache for existing translations
    const cached = await getCachedTranslations(greekTexts, "el", "en")
    const uncachedIndices: number[] = []

    for (let i = 0; i < greekTexts.length; i++) {
        // Nothing to translate: empty entries (a coerced non-string field, a
        // blank note) pass through as-is. Sending them wastes prompt slots and
        // used to send literal "[object Object]" lines the model answered
        // with "N/A".
        if (typeof greekTexts[i] !== "string" || greekTexts[i].trim() === "") {
            results[i] = typeof greekTexts[i] === "string" ? greekTexts[i] : ""
            continue
        }
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
            const translations = await translateBatch(batchTexts, tracking)

            const cachePairs: Array<{ source: string; translated: string }> = []
            for (let j = 0; j < batchIndices.length; j++) {
                const candidate = translations[j]
                // A junk answer ("N/A", empty, whitespace) means the model had
                // nothing real to say — fall back to the Greek source and,
                // critically, DO NOT cache it: a cached "N/A" would poison
                // every future run containing that phrase.
                const junk =
                    typeof candidate !== "string" ||
                    candidate.trim() === "" ||
                    /^n\/?a$/i.test(candidate.trim())
                const translated = junk ? batchTexts[j] : candidate
                results[batchIndices[j]] = translated
                if (!junk) {
                    cachePairs.push({ source: batchTexts[j], translated })
                }
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

async function translateBatch(texts: string[], tracking?: TranslationTracking): Promise<string[]> {
    if (!env.GEMINI_API_KEY) {
        throw new Error("No GEMINI_API_KEY available for batch translation")
    }

    const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY })

    // Admin runtime override for the translate operation. The translator is
    // hardwired to the google() SDK, so only a gemini-provider pin can change
    // the model here (save-time validation restricts the translate row to
    // auto | gemini | mock).
    const { getAiRuntimeOverrides } = await import("@/lib/services/ai/runtime-config")
    const overrides = await getAiRuntimeOverrides()
    const translateOverride = overrides.operations?.translate
    const translationModel =
        translateOverride?.provider === "gemini" ? translateOverride.model : env.GEMINI_MODEL_TRANSLATION

    // Same timeout/abort/retry-ownership hygiene as every other AI call site —
    // this was the one bare generateObject with no abort path (a hung
    // connection ate the whole serverless budget) and SDK-internal retries.
    const { object, usage } = await withTimeoutAndRetry(
        (signal) => generateObject({
        abortSignal: signal,
        maxRetries: 0,
        // Env-keyed with an admin override: gemini-2.0-flash was hardcoded here
        // and is marked for shutdown by Google — the model follows
        // GEMINI_MODEL_TRANSLATION unless /admin/ai/settings pins another.
        model: google(translationModel),
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
        }),
        'Gemini batch translation'
    )

    // Meter the spend when a user context is supplied. trackTokenUsage never
    // throws (it logs + Sentry on failure), so metering can't break translation.
    if (tracking?.userId) {
        const parsed = parseUsage(usage, translationModel, 'gemini')
        await trackTokenUsage({
            userId: tracking.userId,
            operationType: 'other',
            policyId: tracking.policyId,
            inputTokens: parsed.inputTokens,
            outputTokens: parsed.outputTokens,
            model: translationModel as Parameters<typeof trackTokenUsage>[0]['model'],
        })
    }

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
