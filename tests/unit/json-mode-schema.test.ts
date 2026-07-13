import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import {
    cleanseNulls,
    coercedGreekString,
    schemaPromptBlock,
    validateJsonModeObject,
} from '@/lib/services/ai/json-mode-schema'

describe('json-mode-schema — cleanseNulls', () => {
    it('drops null properties recursively', () => {
        expect(cleanseNulls({ a: 1, b: null, c: { d: null, e: 'x' } })).toEqual({ a: 1, c: { e: 'x' } })
    })

    it('filters null array entries and cleanses items', () => {
        expect(cleanseNulls([{ a: null, b: 2 }, null, 3])).toEqual([{ b: 2 }, 3])
    })

    it('passes primitives through', () => {
        expect(cleanseNulls('x')).toBe('x')
        expect(cleanseNulls(0)).toBe(0)
        expect(cleanseNulls(false)).toBe(false)
    })
})

describe('json-mode-schema — coercedGreekString', () => {
    it('accepts plain strings', () => {
        expect(coercedGreekString.parse('Κάλυψη κλοπής')).toBe('Κάλυψη κλοπής')
    })

    it('coerces bilingual objects to the Greek text', () => {
        expect(coercedGreekString.parse({ el: 'Ελληνικά', en: 'English' })).toBe('Ελληνικά')
        expect(coercedGreekString.parse({ en: 'English only' })).toBe('English only')
    })

    it('rejects non-coercible values', () => {
        expect(coercedGreekString.safeParse(42).success).toBe(false)
        expect(coercedGreekString.safeParse({ foo: 'bar' }).success).toBe(false)
    })
})

describe('json-mode-schema — validateJsonModeObject', () => {
    const schema = z.object({
        name: z.string(),
        limit: z.number().optional(),
    })

    it('returns parsed data for valid input', () => {
        expect(validateJsonModeObject(schema, { name: 'a', limit: 5 }, 'test')).toEqual({ name: 'a', limit: 5 })
    })

    it('cleanses nulls so optional fields parse (JSON-mode emits explicit nulls)', () => {
        expect(validateJsonModeObject(schema, { name: 'a', limit: null }, 'test')).toEqual({ name: 'a' })
    })

    it('falls back to the cleansed raw object when strict parsing fails', () => {
        const raw = { name: 123, extra: null }
        expect(validateJsonModeObject(schema, raw, 'test')).toEqual({ name: 123 })
    })
})

describe('json-mode-schema — schemaPromptBlock', () => {
    it('embeds the JSON schema with descriptions and the no-null instruction', () => {
        const block = schemaPromptBlock(z.object({ field: z.string().describe('the described field') }))
        expect(block).toContain('JSON SCHEMA:')
        expect(block).toContain('the described field')
        expect(block).toContain('do not output null')
    })
})
