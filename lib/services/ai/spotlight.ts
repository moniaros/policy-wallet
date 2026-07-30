/**
 * Prompt spotlighting helpers — pure, dependency-free.
 *
 * Extraction output and typed questions are interpolated into downstream
 * prompts wrapped in <untrusted_policy_data>…</untrusted_policy_data> and
 * <user_question>…</user_question> envelopes. A poisoned PDF (or a crafted
 * question) could plant a literal closing tag to break out of the envelope, so
 * we strip those delimiters and chat-template markers from the data before it
 * is rendered. This lives in its own module (no db / rate-limit / env imports)
 * so the pure prompt builders in prompts.ts can use it without pulling server
 * infrastructure into the prompt-compliance unit tests.
 */

const SPOTLIGHT_FORGERY = /<\/?(untrusted_policy_data|user_question|system|user|assistant)>|<\|(im_start|im_end|system|user|assistant)\|>/gi

/** Neutralize forged spotlight delimiters in a single string. */
export function stripSpotlightDelimiters(text: string): string {
    return text.replace(SPOTLIGHT_FORGERY, " ")
}

/**
 * Recursively strip forged spotlight delimiters from extracted policy data.
 * Non-string leaves are returned untouched; structure is preserved.
 */
export function sanitizeStructuredContext<T>(value: T): T {
    if (typeof value === "string") {
        return stripSpotlightDelimiters(value) as unknown as T
    }
    if (Array.isArray(value)) {
        return value.map((v) => sanitizeStructuredContext(v)) as unknown as T
    }
    if (value && typeof value === "object") {
        const out: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
            out[k] = sanitizeStructuredContext(v)
        }
        return out as unknown as T
    }
    return value
}
