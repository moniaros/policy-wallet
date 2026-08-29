import { z } from 'zod'

/**
 * Extraction source citations — Wave 9 of the branch product system.
 *
 * When ENABLED the extraction prompt asks the model for a short verbatim
 * snippet (and page number) per critical field, giving the review screen
 * and detail page "where in the document did this come from" provenance.
 *
 * FLAG-GATED (default OFF): the feature changes the extraction contract on
 * the money path, so it rolls out behind EXTRACTION_CITATIONS=1 —
 * Gemini-first in prod (the active provider), same wiring on all
 * providers. With the flag off, prompts and schemas are byte-identical to
 * the pre-citation behavior.
 */

/**
 * Scalar fields eligible for citations — mirrors the confidence field set.
 *
 * These are top-level values with one occurrence each, so the field name is a
 * sufficient key. Array members need an index; see CITABLE_ARRAYS below.
 */
export const CITATION_FIELDS = [
    'insurerName',
    'policyNumber',
    'lineOfBusiness',
    'startDate',
    'endDate',
    'premiumAmount',
    'issueDate',
    'premiumFrequency',
    'renewalDate',
] as const

/**
 * The member-key convention lives in `citation-keys.ts`, which shipped ahead of
 * this branch precisely because it carries no production effect. This file holds
 * the half that does: the PROMPT every extraction receives and the SANITIZER
 * that decides what the pipeline stores.
 */
export {
    CITABLE_ARRAYS,
    arrayCitationKey,
    parseArrayCitationKey,
    type CitableArray,
} from './citation-keys'
import { CITABLE_ARRAYS, parseArrayCitationKey } from './citation-keys'

/** Is this a key the citation set accepts at all? */
export function isCitableKey(key: string): boolean {
    return (CITATION_FIELDS as readonly string[]).includes(key) || parseArrayCitationKey(key) !== null
}

const MAX_SNIPPET_LENGTH = 240

export interface ExtractionSource {
    /** 1-based page number in the source document, when identifiable. */
    page?: number
    /** Short verbatim quote from the document supporting the value. */
    snippet?: string
}

export type ExtractionSources = Record<string, ExtractionSource>

export function extractionCitationsEnabled(): boolean {
    return process.env.EXTRACTION_CITATIONS === '1'
}

/** Response-schema fragment the providers add when the flag is on. */
export const ExtractionSourcesSchema = z
    .record(
        z.string(),
        z.object({
            page: z.number().optional().describe('1-based page number where the value was found'),
            snippet: z
                .string()
                .optional()
                .describe('Short VERBATIM quote (max ~30 words) from the document containing the value'),
        })
    )
    .optional()
    .describe(
        `Per-field source citations for: ${CITATION_FIELDS.join(', ')}. ` +
        `Array members may also be cited as name[index], for: ${CITABLE_ARRAYS.join(', ')} ` +
        '(e.g. "conditions[0]"). Only include fields whose value you actually located in the document.'
    )

/** Prompt section appended when the flag is on. */
export const CITATIONS_PROMPT_SECTION = `
CITATIONS:
For each of these fields, when you find its value in the document, also return an entry in "extractionSources":
${CITATION_FIELDS.join(', ')}
Each entry: { "page": <1-based page number>, "snippet": "<short VERBATIM quote from the document, max 30 words, original language>" }

You may also cite an INDIVIDUAL MEMBER of these arrays, keyed "name[index]" using the same 0-based index you used in the array itself:
${CITABLE_ARRAYS.join(', ')}
For example "conditions[0]" cites the wording behind the first condition you returned. Cite a member only when you can quote the sentence it came from.
Never invent a snippet — omit the entry if you cannot quote the document.`

/**
 * Keep only known fields, clamp snippet length, drop empty/invalid entries.
 * Defensive — the model may cite unknown fields or return junk pages.
 */
export function sanitizeExtractionSources(raw: unknown): ExtractionSources | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

    const result: ExtractionSources = {}

    for (const [field, value] of Object.entries(raw as Record<string, unknown>)) {
        // Membership, not equality: a key is acceptable if it is a known scalar
        // OR a well-formed `array[index]`. An exact Set cannot express the second.
        if (!isCitableKey(field) || !value || typeof value !== 'object') continue
        const entry = value as Record<string, unknown>

        const source: ExtractionSource = {}
        const page = Number(entry.page)
        if (Number.isInteger(page) && page >= 1 && page <= 2000) {
            source.page = page
        }
        if (typeof entry.snippet === 'string') {
            const snippet = entry.snippet.trim().slice(0, MAX_SNIPPET_LENGTH)
            if (snippet.length > 0) source.snippet = snippet
        }

        if (source.page !== undefined || source.snippet !== undefined) {
            result[field] = source
        }
    }

    return Object.keys(result).length > 0 ? result : null
}
