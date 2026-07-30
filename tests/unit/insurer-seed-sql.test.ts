import { describe, it, expect } from 'vitest'

import {
    buildInsurerSeedStatements,
    LEGACY_MERGES,
    type GreekInsurerRecord,
} from '@/scripts/gen-insurer-seed-sql'
import dataset from '@/prisma/greek-insurers.json'

const records = dataset.insurers as unknown as GreekInsurerRecord[]
const statements = buildInsurerSeedStatements(records)
const inserts = statements.filter((s) => s.startsWith('INSERT INTO insurers'))

describe('buildInsurerSeedStatements on the real dataset', () => {
    it('emits exactly 27 slug-keyed upserts and skips the 2 historic records', () => {
        expect(inserts).toHaveLength(27)
        expect(inserts.every((s) => s.includes('ON CONFLICT (slug) DO UPDATE SET'))).toBe(true)
        const all = statements.join('\n')
        // quoted literals: 'allianz-europaiki-pisti' legitimately contains the
        // bare substring 'europaiki-pisti'
        expect(all).not.toContain("'axa-asfalistiki'")
        expect(all).not.toContain("'europaiki-pisti'")
        expect(all).not.toContain('seed_axa-asfalistiki')
        expect(all).not.toContain('seed_europaiki-pisti')
    })

    it('emits a claim per imported record and 5 guarded renames ahead of the inserts', () => {
        const claims = statements.filter(
            (s) => s.startsWith('UPDATE insurers SET slug =') && !s.includes(', name =')
        )
        const renames = statements.filter(
            (s) => s.startsWith('UPDATE insurers SET slug =') && s.includes(', name =')
        )
        // one claim per imported record — absorbs pre-existing rows that
        // already carry a canonical name (prod had «Εθνική Ασφαλιστική»)
        expect(claims).toHaveLength(27)
        // Interamerican's legacy name IS the canonical name — Pass A covers it,
        // so only the five real renames appear, each collision-guarded.
        expect(renames).toHaveLength(5)
        expect(renames.every((s) => s.includes('AND NOT EXISTS'))).toBe(true)
        const firstInsert = statements.findIndex((s) => s.startsWith('INSERT'))
        expect(statements.slice(0, firstInsert)).toEqual([...claims, ...renames])
    })

    it('touches is_active exactly once — the legacy AXA deactivation — and never in an upsert', () => {
        const deactivations = statements.filter((s) => s.includes('is_active = false'))
        expect(deactivations).toHaveLength(1)
        expect(deactivations[0]).toContain("name = 'AXA' AND slug IS NULL")
        for (const insert of inserts) {
            const doUpdate = insert.slice(insert.indexOf('DO UPDATE SET'))
            expect(doUpdate).not.toContain('is_active')
            expect(doUpdate).not.toContain('logo_url')
        }
    })

    it('preserves admin-corrected fields on re-import instead of clobbering them', () => {
        // Real prod case that motivated this: an admin filled in AIG's missing
        // contact email, logo and postcode; a naive re-run would erase them.
        const doUpdate = inserts[0].slice(inserts[0].indexOf('DO UPDATE SET'))
        for (const column of [
            'name',
            'contact_email',
            'hq_address',
            'call_center',
            'lines_of_business',
            'notes',
        ]) {
            expect(doUpdate, `${column} must respect an admin_edited stamp`).toContain(
                `${column} = CASE WHEN insurers.field_confidence->>`
            )
        }
        // No dataset-owned column may still assign EXCLUDED unconditionally.
        expect(doUpdate).not.toMatch(/(^|[\s,])[a-z_]+ = EXCLUDED\./)
        // The admin_edited stamps themselves survive the merge, so they keep
        // protecting their fields on every subsequent run.
        expect(doUpdate).toContain("WHERE value = 'admin_edited'")
    })

    it('uses deterministic seed_<slug> ids', () => {
        for (const record of records.filter((r) => r.status !== 'merged')) {
            const insert = inserts.find((s) => s.includes(`'seed_${record.id}'`))
            expect(insert, record.id).toBeDefined()
        }
    })

    it('escapes apostrophes in notes', () => {
        const interamerican = inserts.find((s) => s.includes("'seed_interamerican'"))!
        expect(interamerican).toContain("Europ Assistance Greece''s fleet")
    })

    it('maps hq_address to camelCase keys and drops nulls', () => {
        const ethniki = inserts.find((s) => s.includes("'seed_ethniki-asfalistiki'"))!
        expect(ethniki).toContain('"postalCode":"117 45"')
        expect(ethniki).not.toContain('postal_code')
        // atlantiki-enosis has postal_code: null — the key must be absent, not null
        const atlantiki = inserts.find((s) => s.includes("'seed_atlantiki-enosis'"))!
        expect(atlantiki).not.toContain('postalCode')
    })

    it('maps field_confidence keys to the camelCase Prisma field names', () => {
        const ethniki = inserts.find((s) => s.includes("'seed_ethniki-asfalistiki'"))!
        expect(ethniki).toContain('"callCenter":"verified_2026"')
        expect(ethniki).toContain('"roadsideAssistanceProvider":"stale"')
        expect(ethniki).not.toContain('"call_center"')
    })

    it('renames map onto real dataset records', () => {
        for (const merge of LEGACY_MERGES) {
            expect(records.some((r) => r.id === merge.slug)).toBe(true)
        }
    })
})

describe('buildInsurerSeedStatements escaping', () => {
    it("round-trips O'Brien through the SQL literal", () => {
        const probe: GreekInsurerRecord = {
            id: 'probe',
            name_el: "O'Brien Insurance",
            name_en: null,
            legal_name_el: null,
            status: 'active',
            group_parent: null,
            website: null,
            call_center: null,
            claims_phone: null,
            roadside_phone: null,
            payment_gateway_url: null,
            contact_email: null,
            hq_address: null,
            roadside_assistance_provider: null,
            lines_of_business: [],
            field_confidence: null,
            notes: "the agent's note",
        }
        const [insert] = buildInsurerSeedStatements([probe]).filter((s) => s.startsWith('INSERT'))
        expect(insert).toContain("'O''Brien Insurance'")
        expect(insert).toContain("'the agent''s note'")
        expect(insert).toContain("'{}'::text[]")
    })
})
