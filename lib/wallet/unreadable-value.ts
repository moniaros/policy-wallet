/**
 * The single owner of "the extractor could not read this, and said so in the
 * value itself".
 *
 * PolicyWallet has NO redaction feature. Nothing in this repo masks a stored
 * value before display — the one masker that exists (`lib/identity/tax-id.ts`,
 * `••••••123`) runs on the agent-side customer list and never touches a policy
 * page. So when a masked-looking string appears on a policy — `(XXXX)` in a
 * summary, `XXXXXX` where the registration number should be — it is not a
 * privacy measure. It is the MODEL's own placeholder for something it could
 * not read off the document, stored verbatim and then rendered with exactly
 * the confidence of a real value.
 *
 * That is the defect this module closes. A reader cannot tell "we are hiding
 * this from you" from "we could not read this", because the page renders both
 * as the same grey string. This module names the second case so the UI can say
 * it, and point at the source document — which is the only place the true
 * value exists.
 *
 * It is deliberately narrow. It matches placeholder SHAPES (runs of X, runs of
 * ?, a lone ellipsis), never real content, so a genuine value that happens to
 * contain an X (a Greek plate «ΧΥΖ-1234», an insurer's product name) is
 * untouched. Anything it is unsure about is a real value: over-reporting
 * "could not read" on good data would be a worse failure than the defect.
 */

/**
 * A value the extractor emitted as a placeholder.
 *
 * Shapes seen in stored data and in provider output:
 *   `XXXX`  `(XXXX)`  `XXX-XXXX`  `xxxxx`  `????`  `N/A`  `n/a`  `---`  `…`
 *
 * Latin AND Greek capital chi are both matched: the providers emit whichever
 * script they were last writing in, and «ΧΧΧΧ» (U+03A7) is visually identical
 * to `XXXX` (U+0058) while comparing unequal.
 */
const PLACEHOLDER_SHAPE =
    /^[\s([]*(?:[xXΧχ]{3,}(?:[\s\-–—_./]+[xXΧχ]{1,})*|\?{3,}|-{3,}|_{3,}|[.…]{3,}|n\s*\/\s*a|N\s*\/\s*A|Ν\/Α)[\s)\]]*$/

/** Does this whole value read as an extractor placeholder rather than data? */
export function isUnreadableValue(value: string | null | undefined): boolean {
    const text = String(value ?? "").trim()
    if (!text) return false
    return PLACEHOLDER_SHAPE.test(text)
}

/**
 * Does a composed SENTENCE contain an embedded placeholder?
 *
 * Used for prose the customer reads as fact (the plain-language summary), where
 * the placeholder sits mid-sentence — "…for vehicle (XXXX) for the period…" —
 * and cannot be replaced without rewriting the model's sentence. The UI's
 * answer there is a note beside the prose, not a substitution, so all this has
 * to do is detect presence.
 *
 * Requires a bracketed or standalone run so ordinary words are never matched.
 */
export function containsUnreadableMarker(text: string | null | undefined): boolean {
    const value = String(text ?? "")
    if (!value) return false
    return /[([]\s*[xXΧχ?]{3,}\s*[)\]]|(?:^|\s)[xXΧχ]{4,}(?=$|[\s.,;:)])/.test(value)
}

/**
 * Render-ready view of a single extracted field.
 *
 * `readable: false` means the UI must NOT print `value` as though it were the
 * customer's data — it prints "could not be read from the document" and offers
 * the document itself.
 */
export interface ExtractedFieldView {
    readable: boolean
    /** Only set when readable. */
    value: string | null
}

export function extractedField(value: string | null | undefined): ExtractedFieldView {
    const text = String(value ?? "").trim()
    if (!text) return { readable: true, value: null }
    if (isUnreadableValue(text)) return { readable: false, value: null }
    return { readable: true, value: text }
}
