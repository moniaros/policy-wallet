/**
 * Text matching for coverage taxonomies.
 *
 * Extracted policy text is inconsistently accented and inconsistently cased —
 * «ΣΕΙΣΜΟΣ», «Σεισμός» and «σεισμου» are the same cover. A taxonomy that only
 * matches one form reports absent cover that is plainly present, which is the
 * worst failure this family of modules can have.
 *
 * One shared implementation because the home, health and motor taxonomies all
 * need exactly the same semantics: NFD-decompose, strip combining diacritics,
 * lowercase, then plain substring matching. No `\b` anywhere — JavaScript word
 * boundaries are ASCII-only and match nothing in Greek.
 */

/** Lowercase and strip Greek (and any other) combining diacritics. */
export function normaliseCoverageText(text: string): string {
    return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
}

/** Join extracted coverage strings into one searchable, normalised haystack. */
export function buildCoverageHaystack(coverageTexts: string[]): string {
    return normaliseCoverageText(coverageTexts.join(" | "))
}

/** Whether any alias appears in the (already normalised) haystack. */
export function haystackHasAlias(haystack: string, aliases: string[]): boolean {
    return aliases.some((alias) => haystack.includes(normaliseCoverageText(alias)))
}
