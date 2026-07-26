import { describe, it, expect } from 'vitest'
import {
    buildSuggestQualificationPrompt,
    parseSuggestions,
    filterByEvidence,
    mergeAcceptedSuggestions,
    MAX_STAKEHOLDER_SUGGESTIONS,
} from '@/lib/medic/suggest'

/**
 * suggestQualification's deterministic spine (blueprint §I). The model is
 * untrusted input; these tests pin the guarantees that make the feature safe:
 * malformed output rejected wholesale, hallucinations dropped mechanically,
 * the validation ladder untouchable by AI, caps enforced.
 */

const NOTES = 'Μίλησα με τη Μαρία — αποφασίζει ο σύζυγός της ο Νίκος για τα οικονομικά. Τη νοιάζει η απαλλαγή και η κάλυψη σεισμού. The accountant Mr. Pappas pushes for us internally.'

describe('parseSuggestions — model output is untrusted', () => {
    it('parses clean JSON and tolerates code fences', () => {
        const raw = '```json\n{"stakeholders":[{"name":"Νίκος","stance":"economic_buyer","evidenceSnippet":"αποφασίζει ο σύζυγός της ο Νίκος"}],"criteria":[],"pain":null}\n```'
        const parsed = parseSuggestions(raw)
        expect(parsed?.stakeholders).toHaveLength(1)
        expect(parsed?.stakeholders[0].stance).toBe('economic_buyer')
    })

    it('rejects prose, malformed JSON, and wrong shapes wholesale', () => {
        expect(parseSuggestions('I think the buyer is Nikos.')).toBeNull()
        expect(parseSuggestions('{"stakeholders": "Nikos"}')).toBeNull()
        expect(parseSuggestions('{"stakeholders":[{"name":"X","stance":"ceo","evidenceSnippet":"abc"}]}')).toBeNull()
    })
})

describe('filterByEvidence — the anti-hallucination gate', () => {
    it('keeps suggestions whose snippet appears verbatim in the notes', () => {
        const kept = filterByEvidence(
            {
                stakeholders: [
                    { name: 'Νίκος', stance: 'economic_buyer', evidenceSnippet: 'αποφασίζει ο σύζυγός της ο Νίκος' },
                    // Hallucinated: never in the notes.
                    { name: 'Γιώργος', stance: 'blocker', evidenceSnippet: 'ο Γιώργος διαφωνεί με την αγορά' },
                ],
                criteria: [{ key: 'deductible', label: 'Απαλλαγή', evidenceSnippet: 'Τη νοιάζει η απαλλαγή' }],
                pain: { summary: 'Χρειάζεται κάλυψη σεισμού', evidenceSnippet: 'η κάλυψη σεισμού' },
            },
            NOTES
        )
        expect(kept.stakeholders.map((s) => s.name)).toEqual(['Νίκος'])
        expect(kept.criteria).toHaveLength(1)
        expect(kept.pain).not.toBeNull()
    })

    it('is whitespace/case tolerant but never fuzzy', () => {
        const kept = filterByEvidence(
            {
                stakeholders: [
                    { name: 'Pappas', stance: 'champion', evidenceSnippet: 'the ACCOUNTANT   mr. pappas pushes' },
                    { name: 'Pappas2', stance: 'champion', evidenceSnippet: 'Pappas champions the deal' },
                ],
                criteria: [],
                pain: null,
            },
            NOTES
        )
        expect(kept.stakeholders.map((s) => s.name)).toEqual(['Pappas'])
    })

    it('enforces the caps', () => {
        const many = Array.from({ length: 20 }, (_, i) => ({
            name: `P${i}`,
            stance: 'influencer' as const,
            evidenceSnippet: 'Τη νοιάζει η απαλλαγή',
        }))
        const kept = filterByEvidence({ stakeholders: many, criteria: [], pain: null }, NOTES)
        expect(kept.stakeholders).toHaveLength(MAX_STAKEHOLDER_SUGGESTIONS)
    })
})

describe('mergeAcceptedSuggestions — AI can never escalate the ladder', () => {
    it('appends deduped stakeholders as UNidentified, keeps existing pain ladder', () => {
        const merged = mergeAcceptedSuggestions(
            {
                stakeholders: [{ name: 'Νίκος', stance: 'economic_buyer', identified: true }],
                pain: { category: 'coverage_gap', summary: 'Χωρίς σεισμό', validationState: 'confirmed' },
            },
            {
                stakeholders: [
                    { name: 'νίκος', stance: 'economic_buyer', evidenceSnippet: 'x' }, // dup (case)
                    { name: 'Pappas', stance: 'champion', evidenceSnippet: 'pushes for us internally' },
                ],
                criteria: [{ key: 'deductible', label: 'Απαλλαγή', evidenceSnippet: 'x' }],
                pain: { summary: 'AI rewrite attempt', evidenceSnippet: 'x' },
            }
        )
        expect(merged.stakeholders).toHaveLength(2)
        const pappas = merged.stakeholders!.find((s) => s.name === 'Pappas')!
        expect(pappas.identified).toBe(false) // acceptance ≠ confirmation
        // The existing (identified) EB row is untouched.
        expect(merged.stakeholders![0].identified).toBe(true)
        // Gap-seeded pain summary and LADDER survive the AI suggestion.
        expect(merged.pain?.summary).toBe('Χωρίς σεισμό')
        expect(merged.pain?.validationState).toBe('confirmed')
        expect(merged.criteria![0].met).toBe(false)
    })

    it('fills pain only when absent, entering at probable', () => {
        const merged = mergeAcceptedSuggestions(null, {
            stakeholders: [],
            criteria: [],
            pain: { summary: 'Needs earthquake cover', evidenceSnippet: 'x' },
        })
        expect(merged.pain?.summary).toBe('Needs earthquake cover')
        expect(merged.pain?.validationState).toBe('probable')
    })
})

describe('prompt', () => {
    it('demands verbatim evidence and JSON-only output, and embeds the notes', () => {
        const p = buildSuggestQualificationPrompt([{ id: 'n1', body: NOTES }])
        expect(p).toMatch(/VERBATIM quote/)
        expect(p).toMatch(/Output ONLY a JSON object/)
        expect(p).toContain(NOTES)
        expect(p).toMatch(/Never invent/)
    })
})
