/**
 * One normalisation for every string the document gate compares.
 *
 * Extracted PDF text arrives in every casing and with Greek tonos on some words
 * and not others (ΑΣΦΑΛΙΣΤΉΡΙΟ, ασφαλιστήριο, Ασφαλιστηριο). The lexicon is
 * written once, in this normalised form, and the text is folded into the same
 * form before matching — so a lexicon entry never has to enumerate accents or
 * case, and a match is a match on the letters alone.
 *
 * Same recipe as lib/wallet/insurer-registry.ts `normalizeInsurerKey` (NFD,
 * strip combining marks, lowercase, final sigma folded), kept separate because
 * that key also strips punctuation and digits, which the gate needs to keep:
 * a policy number or a date IS evidence.
 */
export function normalizeDocumentText(raw: string): string {
    return String(raw || "")
        .normalize("NFD")
        // Combining marks: Greek tonos/dialytika and Latin accents.
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/ς/g, "σ")
        .replace(/\s+/g, " ")
        .trim()
}
