/**
 * The single owner of "is this stored summary in the language we are about to
 * render it in?".
 *
 * `Policy.coverageSummary` is COMPOSED by the model, not copied out of the
 * document — so unlike the plain string fields (which the prompt tells the
 * model to leave in the document's own language) it has a language of its own,
 * and nothing ever pinned it. The extraction schema asked only for a "brief
 * summary of main coverages", so a Greek motor schedule routinely produced an
 * English sentence, which the wallet then rendered verbatim under the heading
 * «Το ασφαλιστήριό σας σε απλά ελληνικά». Confirmed in production data
 * (policy 64504715: "The policy concerns the insurance of the Mercedes-Benz…").
 *
 * Two halves, both required:
 *
 *  1. WRITE — the schema now asks for Greek explicitly and
 *     `enrichExtractionPayload` records which language was asked for, as
 *     `acordData.extraction.summaryLanguage`. A tagged summary is
 *     self-describing from then on.
 *  2. READ — {@link resolveStoredSummary} refuses to display a summary whose
 *     language does not match the view. Rows written before the tag existed
 *     carry no tag at all, so the language is inferred from the script: this
 *     is the only reason script detection exists here, and it is deliberately
 *     conservative (see {@link detectSummaryLanguage}).
 *
 * A mismatch is NOT silently regenerated. Regeneration is a metered AI call
 * that spends the customer's allowance, so the resolver reports the mismatch
 * and the UI points at the re-analysis affordance that already exists — the
 * wrong-language text simply never renders.
 */

export type SummaryLanguage = "el" | "en"

/**
 * Which language a summary string is written in, or `null` when the text does
 * not carry enough evidence to say.
 *
 * Greek and Latin script are disjoint alphabets, which makes this reliable in
 * the one direction that matters. A Greek summary legitimately contains Latin
 * runs (insurer names, "Toyota Yaris", "24/7"), so the test is not "contains
 * Latin" but "which script carries the prose": the ratio of Greek to Latin
 * letters. Below the evidence floor the answer is `null` — never a guess, and
 * a `null` renders (an untagged legacy row that we cannot read is not proof of
 * a defect, and hiding it would be a worse failure than showing it).
 */
export function detectSummaryLanguage(text: string | null | undefined): SummaryLanguage | null {
    const value = String(text ?? "")
    const greek = (value.match(/\p{Script=Greek}/gu) || []).length
    const latin = (value.match(/\p{Script=Latin}/gu) || []).length
    const letters = greek + latin
    // Too little alphabetic content to judge (a number, a code, an empty string).
    if (letters < 24) return null
    if (greek / letters >= 0.5) return "el"
    if (latin / letters >= 0.8) return "en"
    return null
}

/** The language tag written at extraction time, when the row carries one. */
export function storedSummaryLanguage(acordData: unknown): SummaryLanguage | null {
    const tag = (acordData as { extraction?: { summaryLanguage?: unknown } } | null | undefined)
        ?.extraction?.summaryLanguage
    return tag === "el" || tag === "en" ? tag : null
}

export interface StoredSummaryResolution {
    /** The summary to render, or `null` when nothing may be rendered. */
    text: string | null
    /**
     * `ok`                — display it.
     * `absent`            — the policy has no stored summary at all.
     * `language_mismatch` — a summary exists but is in the wrong language;
     *                       show the mismatch state and offer re-analysis.
     */
    state: "ok" | "absent" | "language_mismatch"
    /** What language the stored text turned out to be (for logging / copy). */
    storedLanguage: SummaryLanguage | null
}

/**
 * Decide whether a stored summary may be rendered to a reader in `viewLanguage`.
 *
 * The tag wins when present; otherwise the script is inspected. Only a
 * CONFIDENT disagreement blocks rendering — an unreadable or untaggable
 * summary is shown, because refusing to render a summary we merely cannot
 * classify would hide good content.
 */
export function resolveStoredSummary(input: {
    summary: string | null | undefined
    acordData?: unknown
    viewLanguage: SummaryLanguage
}): StoredSummaryResolution {
    const text = String(input.summary ?? "").trim()
    if (!text) return { text: null, state: "absent", storedLanguage: null }

    const stored = storedSummaryLanguage(input.acordData) ?? detectSummaryLanguage(text)
    if (stored && stored !== input.viewLanguage) {
        assertSummaryLanguageInDev(stored, input.viewLanguage, text)
        return { text: null, state: "language_mismatch", storedLanguage: stored }
    }
    return { text, state: "ok", storedLanguage: stored }
}

let warnedOnce = false

/**
 * Dev-only assertion. A wrong-language summary is a pipeline defect, not a
 * display accident, and it is invisible to anyone who reads only Greek — so
 * outside production it is made loud. It does NOT throw: the page must still
 * render (the resolver has already suppressed the offending text), and a
 * thrown error here would turn a copy defect into a blank policy page.
 */
export function assertSummaryLanguageInDev(
    stored: SummaryLanguage,
    view: SummaryLanguage,
    sample: string
): void {
    if (process.env.NODE_ENV === "production") return
    if (warnedOnce) return
    warnedOnce = true
    console.error(
        `[summary-language] stored coverageSummary is "${stored}" but the view is "${view}" — ` +
            `the extraction did not honour the pinned language. Sample: ${sample.slice(0, 120)}`
    )
}
