/**
 * suggestQualification — AI over the advisor's logged notes (blueprint §I).
 *
 * Contract: AI SUGGESTS, the advisor DECIDES. This module is the deterministic
 * spine around the model call:
 *   - a strict, self-contained prompt (JSON-only output, evidence required);
 *   - zod parsing that rejects malformed output wholesale;
 *   - the anti-hallucination gate: every suggestion must carry an
 *     evidenceSnippet that appears VERBATIM (whitespace-normalized) in the
 *     notes it was derived from — a stakeholder the notes never mention is
 *     dropped mechanically, not debated;
 *   - hard caps so a runaway response cannot flood the UI.
 * Nothing here writes: the caller returns suggestions to the UI, and only the
 * rows the advisor accepts are merged (applyQualificationSuggestions).
 */

import { z } from 'zod'
import type { MedicData } from '@/lib/medic/types'

export const MAX_STAKEHOLDER_SUGGESTIONS = 8
export const MAX_CRITERIA_SUGGESTIONS = 10

const stanceSchema = z.enum(['economic_buyer', 'champion', 'influencer', 'blocker'])

const suggestionsSchema = z.object({
    stakeholders: z
        .array(
            z.object({
                name: z.string().min(1).max(120),
                party: z.string().max(120).optional(),
                stance: stanceSchema,
                evidenceSnippet: z.string().min(3).max(500),
            })
        )
        .default([]),
    criteria: z
        .array(
            z.object({
                key: z.string().min(1).max(60),
                label: z.string().min(1).max(200),
                compliance: z.boolean().optional(),
                evidenceSnippet: z.string().min(3).max(500),
            })
        )
        .default([]),
    pain: z
        .object({
            summary: z.string().min(3).max(500),
            evidenceSnippet: z.string().min(3).max(500),
        })
        .nullish(),
})

export type QualificationSuggestions = z.infer<typeof suggestionsSchema>

/** Validate an accepted-suggestions payload from the client (untrusted). */
export function validateAcceptedSuggestions(input: unknown): QualificationSuggestions | null {
    const result = suggestionsSchema.safeParse(input)
    return result.success ? result.data : null
}

/** Strict, self-contained instruction — overrides any surrounding Q&A framing. */
export function buildSuggestQualificationPrompt(notes: Array<{ id: string; body: string }>): string {
    const notesBlock = notes
        .map((n, i) => `--- NOTE ${i + 1} (id ${n.id}) ---\n${n.body}`)
        .join('\n\n')
    return [
        'IGNORE any policy-question framing above. Your ONLY task is the extraction below.',
        '',
        'You are given an insurance advisor\'s discovery notes about one sales opportunity',
        '(Greek and/or English). Extract qualification facts STRICTLY supported by the notes:',
        '',
        '- stakeholders: people mentioned with a role in the decision. stance is one of',
        '  economic_buyer (decides/pays), champion (pushes internally), influencer, blocker.',
        '- criteria: decision criteria the customer cares about (price, deductible, claims',
        '  service, IDD/GDPR requirements...). key is a short snake_case id.',
        '- pain: one-sentence summary of the customer\'s insurance need, if the notes state one.',
        '',
        'RULES:',
        '1. Every item MUST include evidenceSnippet: an EXACT, VERBATIM quote copied from the',
        '   notes (max ~30 words) that supports it. No quote → do not output the item.',
        '2. Never invent people, needs, or criteria not present in the notes.',
        '3. Output ONLY a JSON object, no prose, matching:',
        '   {"stakeholders":[{"name","party?","stance","evidenceSnippet"}],',
        '    "criteria":[{"key","label","compliance?","evidenceSnippet"}],',
        '    "pain":{"summary","evidenceSnippet"} | null}',
        '4. If the notes support nothing, output {"stakeholders":[],"criteria":[],"pain":null}.',
        '',
        'NOTES:',
        notesBlock,
    ].join('\n')
}

/** Parse the raw model output. Tolerates code fences; rejects anything else. */
export function parseSuggestions(raw: string): QualificationSuggestions | null {
    const stripped = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    const start = stripped.indexOf('{')
    const end = stripped.lastIndexOf('}')
    if (start === -1 || end <= start) return null
    let parsed: unknown
    try {
        parsed = JSON.parse(stripped.slice(start, end + 1))
    } catch {
        return null
    }
    const result = suggestionsSchema.safeParse(parsed)
    return result.success ? result.data : null
}

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

/**
 * The mechanical anti-hallucination gate: drop every suggestion whose evidence
 * snippet is not literally present in the notes (whitespace-normalized,
 * case-insensitive). Also enforces the caps.
 */
export function filterByEvidence(
    suggestions: QualificationSuggestions,
    notesText: string
): QualificationSuggestions {
    const haystack = normalize(notesText)
    const supported = (snippet: string) => haystack.includes(normalize(snippet))
    return {
        stakeholders: suggestions.stakeholders
            .filter((s) => supported(s.evidenceSnippet))
            .slice(0, MAX_STAKEHOLDER_SUGGESTIONS),
        criteria: suggestions.criteria
            .filter((c) => supported(c.evidenceSnippet))
            .slice(0, MAX_CRITERIA_SUGGESTIONS),
        pain: suggestions.pain && supported(suggestions.pain.evidenceSnippet) ? suggestions.pain : null,
    }
}

/**
 * Merge ACCEPTED suggestions into the medic snapshot. Append-only and
 * deduplicated; the AI can never touch the pain validation ladder — that is
 * owned by the gap workflow (confirmGap / proposals). Suggested stakeholders
 * enter UNIDENTIFIED: acceptance means "worth tracking", not "confirmed EB".
 */
export function mergeAcceptedSuggestions(
    medic: MedicData | null | undefined,
    accepted: QualificationSuggestions
): MedicData {
    const base: MedicData = medic ? { ...medic } : {}

    const stakeholders = [...(base.stakeholders ?? [])]
    for (const s of accepted.stakeholders) {
        const exists = stakeholders.some(
            (e) => normalize(e.name) === normalize(s.name) && e.stance === s.stance
        )
        if (!exists) {
            stakeholders.push({
                name: s.name,
                party: s.party,
                stance: s.stance,
                identified: false,
                evidenceRef: `note:${s.evidenceSnippet.slice(0, 80)}`,
            })
        }
    }
    if (stakeholders.length > 0) base.stakeholders = stakeholders

    const criteria = [...(base.criteria ?? [])]
    for (const c of accepted.criteria) {
        if (!criteria.some((e) => e.key === c.key)) {
            criteria.push({ key: c.key, label: c.label, compliance: c.compliance, met: false })
        }
    }
    if (criteria.length > 0) base.criteria = criteria

    if (accepted.pain?.summary) {
        base.pain = {
            ...(base.pain ?? {}),
            // Only fill what is absent — a gap-seeded summary/category wins.
            category: base.pain?.category ?? 'other',
            summary: base.pain?.summary ?? accepted.pain.summary,
            // validationState untouched by design.
            validationState: base.pain?.validationState ?? 'probable',
        }
    }

    return base
}

/**
 * Token estimate for the budget gate. The suggest call is billable and its
 * size is driven by the advisor's own notes (up to 20 × 4000 chars), so a flat
 * guess would either under-gate a huge payload or block a tiny one. ~4 chars
 * per token plus a fixed allowance for the model's JSON reply.
 */
export const SUGGEST_OUTPUT_TOKEN_ALLOWANCE = 4000

export function estimateSuggestTokens(prompt: string): number {
    return Math.ceil(prompt.length / 4) + SUGGEST_OUTPUT_TOKEN_ALLOWANCE
}
