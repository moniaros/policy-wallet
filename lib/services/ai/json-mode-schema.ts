import { zodSchema } from 'ai'
import { z } from 'zod'

import { logger } from '@/lib/logger'

/**
 * JSON-mode workaround for Gemini's structured-output constraint budget.
 *
 * Schemas embedding AcordDataSchema (~150 properties) are rejected by the
 * Gemini API with "the specified schema produces a constraint that has too
 * many states for serving" — on every current model. Instead of sending the
 * schema as response_schema, we embed it IN THE PROMPT (where no state
 * limit applies), request plain JSON output, and validate locally with the
 * exact same Zod schema.
 *
 * JSON-mode models emit explicit nulls where schema-constrained mode
 * omitted fields, so validation cleanses nulls first; if strict parsing
 * still fails, the cleansed object is used as-is (every acordData consumer
 * reads defensively) and the failure is logged for observability.
 */

/** Prompt block carrying the JSON schema (descriptions included — they guide the model). */
export function schemaPromptBlock(schema: z.ZodTypeAny): string {
    const wire = (zodSchema(schema) as { jsonSchema: unknown }).jsonSchema
    return `Output a single JSON object EXACTLY matching this JSON Schema. Omit fields you cannot find (do not output null for missing optional fields). Never invent values.
JSON SCHEMA:
${JSON.stringify(wire)}`
}

/**
 * String that tolerates JSON-mode creativity: without server-side schema
 * enforcement the model sometimes emits bilingual `{el, en}` objects where
 * a plain (Greek) string is expected — coerce those to the Greek text.
 */
export const coercedGreekString = z.preprocess((value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const record = value as Record<string, unknown>
        if (typeof record.el === 'string' || typeof record.en === 'string') {
            return (record.el as string) || (record.en as string)
        }
    }
    return value
}, z.string())

/** Recursively drop null properties and null array entries. */
export function cleanseNulls<T>(value: T): T {
    if (Array.isArray(value)) {
        return value
            .filter((item) => item !== null && item !== undefined)
            .map((item) => cleanseNulls(item)) as T
    }
    if (value && typeof value === 'object') {
        const out: Record<string, unknown> = {}
        for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
            if (entry === null || entry === undefined) continue
            out[key] = cleanseNulls(entry)
        }
        return out as T
    }
    return value
}

/**
 * Validate a JSON-mode result against the schema after null-cleansing.
 * Falls back to the cleansed raw object when strict parsing fails —
 * consumers of this data are defensive readers, and a partially-valid
 * extraction beats a failed one.
 */
export function validateJsonModeObject<S extends z.ZodTypeAny>(
    schema: S,
    raw: unknown,
    context: string
): z.infer<S> {
    const cleansed = cleanseNulls(raw)
    const parsed = schema.safeParse(cleansed)
    if (parsed.success) return parsed.data

    logger('warn', `JSON-mode result failed strict schema validation — using cleansed raw (${context})`, {
        issueCount: parsed.error.issues.length,
        firstIssues: parsed.error.issues.slice(0, 3).map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    })
    return cleansed as z.infer<S>
}

/**
 * Guarantee the clarity result's array shapes. Schema-constrained mode used
 * to guarantee these server-side; in JSON mode (with the lenient fallback
 * above) the model can omit coverageSnapshot arrays or whole sections, and
 * downstream steps read them with .length/.map — the coverage_mapping step
 * died on exactly this in prod.
 */
export function normalizeClarityShape<T extends Record<string, unknown>>(object: T): T {
    const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])
    const snapshot = (object.coverageSnapshot ?? {}) as Record<string, unknown>
    return {
        ...object,
        plainLanguageSummary: typeof object.plainLanguageSummary === 'string' ? object.plainLanguageSummary : '',
        coverageSnapshot: {
            covered: asArray(snapshot.covered),
            notCovered: asArray(snapshot.notCovered),
            limits: asArray(snapshot.limits),
            deductibles: asArray(snapshot.deductibles),
            exclusions: asArray(snapshot.exclusions),
        },
        savingsOpportunities: asArray(object.savingsOpportunities),
        coverageGaps: asArray(object.coverageGaps),
        checklistScores: asArray(object.checklistScores),
        priorityActions: asArray(object.priorityActions),
    }
}
