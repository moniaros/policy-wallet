/**
 * Map an AI text answer onto its two language columns without inventing a
 * translation.
 *
 * Gap rows carry paired columns (`aiExplanation` / `aiExplanationEl`,
 * `aiSuggestion` / `aiSuggestionEl`). The pipeline normally returns
 * `{ en, el }`, but a provider can also return a single string — and the code
 * that handled that case wrote **the same string into both columns**. The row
 * then looked fully translated to any completeness check while a Greek reader
 * was served English text presented as Greek. That is the worst shape a
 * localisation bug can take: invisible to the data, visible only to the user.
 *
 * A single string is a single-language answer. We know which language was
 * requested, so it goes in that column and the other stays null — the renderers
 * already fall back to the gap definition's own localized description
 * (`recommendation-generator.ts`), which is genuinely in the right language.
 */
export type MaybeBilingual = string | { en?: string | null; el?: string | null } | null | undefined

export function bilingualFields<TBase extends string>(
    base: TBase,
    value: MaybeBilingual,
    language: "en" | "el"
): Record<string, string | null> {
    const enKey = base
    const elKey = `${base}El`

    if (value && typeof value === "object") {
        return {
            [enKey]: value.en?.trim() || null,
            [elKey]: value.el?.trim() || null,
        }
    }

    const text = typeof value === "string" ? value.trim() : ""
    if (!text) {
        return { [enKey]: null, [elKey]: null }
    }

    return language === "el" ? { [enKey]: null, [elKey]: text } : { [enKey]: text, [elKey]: null }
}
