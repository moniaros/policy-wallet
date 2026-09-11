import { z } from 'zod'

import { RULE_READ_FIELDS } from '@/lib/gaps/rule-read-fields'

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

/** The identity, date and premium fields — mirrors the confidence field set. */
export const IDENTITY_CITATION_FIELDS = [
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
 * Fields eligible for citations: the identity set, then EVERY `acordData` path
 * an active authored rule reads (PW-PROVENANCE-01 W1-01), keyed as the model
 * returns them — `acordData.<path>`. Until W1-01 not one field a rule fired on
 * carried a citation, so every finding quoted a figure nobody could follow to
 * a page. `tests/unit/citation-fields-cover-rule-reads.test.ts` fails when a
 * rule reads a field this list does not name.
 */
export const CITATION_FIELDS: readonly string[] = [
    ...IDENTITY_CITATION_FIELDS,
    ...RULE_READ_FIELDS.map((path) => `acordData.${path}`),
]

/** The `acordData.<path>` citation key for a rule-read path. */
export const citationKeyForAcordPath = (path: string): string => `acordData.${path}`

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
        'Only include fields whose value you actually located in the document.'
    )

/** Prompt section appended when the flag is on. */
export const CITATIONS_PROMPT_SECTION = `
CITATIONS:
For each of these fields, when you find its value in the document, also return an entry in "extractionSources", keyed exactly as listed:
${IDENTITY_CITATION_FIELDS.join(', ')}
and, for the acordData fields the coverage checks read, keyed "acordData.<path>":
${RULE_READ_FIELDS.map((path) => `acordData.${path}`).join(', ')}
Each entry: { "page": <1-based page number>, "snippet": "<short VERBATIM quote from the document, max 30 words, original language>" }
Never invent a snippet — omit the entry if you cannot quote the document.`

/**
 * Keep only known fields, clamp snippet length, drop empty/invalid entries.
 * Defensive — the model may cite unknown fields or return junk pages.
 */
export function sanitizeExtractionSources(raw: unknown): ExtractionSources | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

    const allowed = new Set<string>(CITATION_FIELDS)
    const result: ExtractionSources = {}

    for (const [field, value] of Object.entries(raw as Record<string, unknown>)) {
        if (!allowed.has(field) || !value || typeof value !== 'object') continue
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
