import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const SERVICE = strip(readFileSync('lib/services/compliance.service.ts', 'utf-8'))
const SCHEMA = readFileSync('prisma/schema.prisma', 'utf-8')

/** Every scalar field the risk wizard can write to PolicyholderProfile. */
function profileFields(): string[] {
    const block = SCHEMA.slice(SCHEMA.indexOf('model PolicyholderProfile'))
    const body = block.slice(0, block.indexOf('\n}'))
    const fields: string[] = []
    for (const line of body.split('\n').slice(1)) {
        const m = line.match(/^\s{2}([a-zA-Z][a-zA-Z0-9]*)\s+\S/)
        if (!m) continue
        const name = m[1]
        if (['id', 'userId', 'user'].includes(name)) continue
        if (/@relation/.test(line)) continue
        fields.push(name)
    }
    return fields
}

/**
 * GDPR Art. 15(1) entitles a data subject to a copy of the personal data
 * undergoing processing. The export selected `preferences`, `createdAt` and
 * `updatedAt` from PolicyholderProfile — so a subject access request returned
 * everything EXCEPT what the person had actually told the product.
 *
 * That omitted their date of birth, income, mortgage and loans, occupation and
 * driving record, and every special-category field the risk wizard collects
 * under Art. 9: chronic conditions, family medical history, height, weight,
 * smoking status, activity level, gender. Those are exactly the data someone
 * exercises this right over.
 */
describe('the subject-access export includes the risk profile', () => {
    it('the profile really does hold special-category data', () => {
        const fields = profileFields()
        for (const sensitive of ['chronicConditions', 'familyMedicalHistory', 'smokingStatus', 'heightCm', 'weightKg']) {
            expect(fields, `${sensitive} is no longer on the model`).toContain(sensitive)
        }
    })

    it('exports every field the model carries — no silent omissions', () => {
        const selectBlock = SERVICE.slice(
            SERVICE.indexOf('policyholderProfile: {'),
            SERVICE.indexOf('agentProfile: {')
        )
        const missing = profileFields().filter((f) => !new RegExp(`\\b${f}: true`).test(selectBlock))
        expect(missing, `absent from the Art. 15 export:\n${missing.join('\n')}`).toEqual([])
    })

    it('names the health fields explicitly', () => {
        for (const f of ['chronicConditions', 'familyMedicalHistory', 'smokingStatus', 'gender']) {
            expect(SERVICE).toMatch(new RegExp(`${f}: true`))
        }
    })
})

/**
 * Art. 15 covers what is INFERRED about someone, not only what they submitted.
 * The product holds assessments (detected gaps), a profiling output (the
 * protection score), generated recommendations, and relationship records saying
 * which advisor is linked to them and who they have shared policies with. None
 * of it was in the export.
 */
describe('the export includes what the product concluded about the person', () => {
    it.each([
        ['detectedGaps', 'gapInstance'],
        ['protectionScore', 'protectionScore'],
        ['recommendations', 'recommendationInstance'],
        ['advisorRelationships', 'customerRelationship'],
        ['accessGrants', 'accessGrant'],
    ])('%s is queried and returned', (key, model) => {
        // `\.find` alone matched a renamed `findManyX` — the query has to be a
        // real one, and its result has to reach the payload.
        // Gap rows are read through the ONE accessor since R3: the export uses its
        // history door (readGapHistory), which is the unfiltered read it needs.
        expect(SERVICE).toMatch(model === 'gapInstance' ? /readGapHistory\(/ : new RegExp(`db\\.${model}\\.find(Many|Unique)\\(`))
        expect(SERVICE).toMatch(new RegExp(`^\\s*${key}:`, 'm'))
    })

    it('the score is a profiling output, so its inputs travel with it', () => {
        const block = SERVICE.slice(SERVICE.indexOf('db.protectionScore.findUnique'))
        expect(block.slice(0, 400)).toMatch(/categoryScores: true/)
        expect(block.slice(0, 400)).toMatch(/expectedLines: true/)
        expect(block.slice(0, 400)).toMatch(/actualLines: true/)
    })

    it('gaps carry the explanation the person was shown, not just a code', () => {
        const block = SERVICE.slice(SERVICE.indexOf('readGapHistory('))
        expect(block.slice(0, 400)).toMatch(/aiExplanation: true/)
        expect(block.slice(0, 400)).toMatch(/aiSuggestion: true/)
    })
})
