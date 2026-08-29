import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { RiskProfileSchema } from '@/lib/validations/risk-profile'
import { NEEDS_QUESTIONS } from '@/lib/needs/questions'

/**
 * The same three profile fields are described in FOUR places, and they had
 * drifted in every direction.
 *
 * `employmentStatus`, `maritalStatus` and `residenceType` are offered by the
 * public needs check, by the authenticated `RiskProfileWizard` select, and by
 * the questionnaire's option list — and every one of those writes through
 * `riskProfileUpdateSchema`. Measured when this guard was written:
 *
 *   - `student` was a valid value in `profile-mapping.ts` (both its enum and
 *     its rendered options) and was REJECTED by the Zod schema. Anyone who
 *     picked "Student" in the questionnaire had their save refused, and the
 *     only place that would have shown up is a failed PATCH.
 *   - `partnered` was accepted by Zod and by the questionnaire, and the wizard's
 *     own <select> never offered it — so the authenticated form could not
 *     express a value the product stores.
 *   - `company` was accepted by Zod and offered by the wizard, and the public
 *     needs check never offered it.
 *   - Nothing anywhere offered an "other", so a visitor whose situation was not
 *     on the list could not answer — and the needs check REQUIRES every
 *     single-choice question before it will advance a step. It was a dead end,
 *     not a compromise.
 *
 * THE RULE: the Zod schema is the contract, and every UI that writes to it must
 * offer only values it accepts. The reverse is not required — a schema may
 * accept a legacy value nothing offers any more — so this asserts a SUBSET, and
 * separately reports anything the schema accepts that no surface offers, since
 * that is usually a UI that forgot rather than deliberate legacy.
 *
 * UNIVERSE: the option lists are parsed out of the two source files rather than
 * duplicated here. Duplicating them would make this a fifth description of the
 * same three fields, which is the bug.
 */

const FIELDS = ['employmentStatus', 'maritalStatus', 'residenceType'] as const

/** What the contract accepts, read from the Zod schema itself (Zod 4). */
function accepted(field: string): string[] {
    let node: any = (RiskProfileSchema as any).shape?.[field]
    while (node && typeof node.unwrap === 'function' && !node.options) node = node.unwrap()
    return [...(node?.options ?? [])].map(String).sort()
}

/** `<option value="x">` under a given `<select id="...">`, from the wizard source. */
function wizardOptions(source: string, selectId: string): string[] {
    const start = source.indexOf(`<select id="${selectId}"`)
    if (start < 0) return []
    const end = source.indexOf('</select>', start)
    return [...source.slice(start, end).matchAll(/<option value="([^"]*)"/g)]
        .map((m) => m[1])
        .filter(Boolean) // the empty "Select…" placeholder is not a value
        .sort()
}

const WIZARD = readFileSync('components/coverage/RiskProfileWizard.tsx', 'utf8')
const MAPPING = readFileSync('lib/services/questionnaire/profile-mapping.ts', 'utf8')

/** The needs check's own choices, from the real exported model. */
function needsChoices(questionId: string): string[] {
    const q = NEEDS_QUESTIONS.find((x) => x.id === (questionId as any))
    return q ? q.choices.map((c) => String(c.value)).sort() : []
}

describe('every surface offers only values the contract accepts', () => {
    it('the schema reader actually resolves the enums — a silent [] would pass everything', () => {
        for (const field of FIELDS) {
            expect(accepted(field).length, `${field} enum could not be read from the Zod schema`).toBeGreaterThan(3)
        }
    })

    it.each([
        ['employmentStatus', 'employmentStatus'],
        ['maritalStatus', 'maritalStatus'],
        ['residenceType', 'residenceType'],
    ])('the authenticated wizard select for %s offers nothing the schema rejects', (field, selectId) => {
        const offered = wizardOptions(WIZARD, selectId)
        expect(offered.length, `no <select id="${selectId}"> found — the parser has gone stale`).toBeGreaterThan(2)
        const rejected = offered.filter((v) => !accepted(field).includes(v))
        expect(rejected, `${field}: the wizard offers ${rejected.join(', ')}, which the API refuses`).toEqual([])
    })

    it.each([
        ['work', 'employmentStatus'],
        ['marital', 'maritalStatus'],
        ['residence', 'residenceType'],
    ])('the public needs check question %s offers nothing the schema rejects', (questionId, field) => {
        const offered = needsChoices(questionId)
        expect(offered.length, `needs question ${questionId} not found`).toBeGreaterThan(2)
        const rejected = offered.filter((v) => !accepted(field).includes(v))
        expect(rejected, `${questionId}: offers ${rejected.join(', ')}, which the API refuses`).toEqual([])
    })

    it('the questionnaire mapping enum offers nothing the schema rejects', () => {
        for (const [field, re] of [
            ['employmentStatus', /employmentStatus:\s*\{\s*kind:\s*"enum",\s*values:\s*\[([^\]]*)\]/],
            ['maritalStatus', /maritalStatus:\s*\{\s*kind:\s*"enum",\s*values:\s*\[([^\]]*)\]/],
        ] as const) {
            const m = MAPPING.match(re)
            expect(m, `${field} enum not found in profile-mapping.ts`).toBeTruthy()
            const offered = [...m![1].matchAll(/"([^"]+)"/g)].map((x) => x[1])
            const rejected = offered.filter((v) => !accepted(field).includes(v))
            expect(rejected, `${field}: profile-mapping offers ${rejected.join(', ')}, which the API refuses`).toEqual([])
        }
    })

    it('every required single-choice question has a way out for someone who fits none of the options', () => {
        // The needs check refuses to advance a step until every single-choice
        // question is answered (`isStepComplete`). A question whose options do
        // not cover the visitor is therefore a dead end, not a compromise —
        // which is what "where do you live / how do you work / what is your
        // family situation" were before an `other` existed. Numeric questions
        // are exempt: "none" and "three or more" already span the range, and
        // booleans are exhaustive by construction.
        const NUMERIC_OR_BOOLEAN = new Set(['properties', 'children', 'vehicles', 'loan', 'retirement', 'cyber'])
        const missing = NEEDS_QUESTIONS.filter(
            (q) =>
                q.kind === 'single' &&
                !NUMERIC_OR_BOOLEAN.has(q.id as string) &&
                !q.choices.some((c) => String(c.value) === 'other')
        ).map((q) => q.id)
        expect(
            missing,
            `these single-choice questions are required and have no "other", so a visitor they do not describe cannot advance: ${missing.join(', ')}`
        ).toEqual([])
    })
})
