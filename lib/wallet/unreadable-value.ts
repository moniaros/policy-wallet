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
 * THE enumerated list of placeholder forms (P1-11). Every detector in this
 * module is COMPOSED from these fragments — never restate one as a second
 * regex, here or in a guard: a form added to this list reaches the whole-value
 * check and the embedded-marker check at once, which is the property that was
 * lost when the bare branch below forgot `?` and a summary shipped «Αριθμός
 * κυκλοφορίας ????» to a customer as data.
 *
 * Shapes seen in stored data and in provider output:
 *   `XXXX`  `(XXXX)`  `XXX-XXXX`  `xxxxx`  `????`  `N/A`  `n/a`  `---`  `…`
 *
 * Latin AND Greek capital chi are both matched: the providers emit whichever
 * script they were last writing in, and «ΧΧΧΧ» (U+03A7) is visually identical
 * to `XXXX` (U+0058) while comparing unequal. `?` is part of the same mask
 * alphabet — the providers use it interchangeably with `X`.
 */
const MASK_CHAR = "[xXΧχ?]"

export const UNREADABLE_VALUE_FORMS: Readonly<Record<string, string>> = {
    /** XXXX · ???? · XXX-XXXX — runs of mask characters, optionally grouped. */
    maskRun: `${MASK_CHAR}{3,}(?:[\\s\\-–—_./]+${MASK_CHAR}{1,})*`,
    dashRun: "-{3,}",
    underscoreRun: "_{3,}",
    dotRun: "[.…]{3,}",
    notAvailable: "n\\s*\\/\\s*a|N\\s*\\/\\s*A|Ν\\/Α",
}

const PLACEHOLDER_SHAPE = new RegExp(
    `^[\\s([]*(?:${Object.values(UNREADABLE_VALUE_FORMS).join("|")})[\\s)\\]]*$`
)

/**
 * Embedded forms, composed from the same mask alphabet: brackets license a run
 * of 3+, a bare run needs 4+ so «???» in ordinary prose is never swept up.
 */
const BRACKETED_MASK_RUN = `[([]\\s*${MASK_CHAR}{3,}\\s*[)\\]]`
const BARE_MASK_RUN = `(?:^|\\s)${MASK_CHAR}{4,}(?=$|[\\s.,;:)])`
const EMBEDDED_MARKER = new RegExp(`${BRACKETED_MASK_RUN}|${BARE_MASK_RUN}`)

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
    return EMBEDDED_MARKER.test(value)
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
