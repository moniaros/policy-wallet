import { describe, expect, it } from 'vitest'

import {
    formatDocumentDate,
    isSameDocumentDate,
    parseDocumentDate,
    toIsoDateString,
} from '@/lib/dates/document-date'

const iso = (raw: unknown) => toIsoDateString(parseDocumentDate(raw))

describe('parseDocumentDate — the exact strings from policy 1651622', () => {
    it('parses the extracted DD-MM-YYYY values', () => {
        expect(iso('22-05-2024')).toBe('2024-05-22')
        expect(iso('22-05-2025')).toBe('2025-05-22')
    })

    it('parses the document source quotes (embedded Greek month phrases)', () => {
        expect(iso('Έναρξη Ασφάλισης 22 ΜΑΪΟΥ 2024')).toBe('2024-05-22')
        expect(iso('Λήξη Ασφάλισης 22 ΜΑΪΟΥ 2025')).toBe('2025-05-22')
        expect(iso('Αθήνα, 22 ΜΑΪΟΥ 2024')).toBe('2024-05-22')
    })
})

describe('parseDocumentDate — all 12 Greek months, genitive + nominative', () => {
    const MONTHS: Array<[number, string, string]> = [
        [1, 'ΙΑΝΟΥΑΡΙΟΥ', 'ΙΑΝΟΥΑΡΙΟΣ'],
        [2, 'ΦΕΒΡΟΥΑΡΙΟΥ', 'ΦΕΒΡΟΥΑΡΙΟΣ'],
        [3, 'ΜΑΡΤΙΟΥ', 'ΜΑΡΤΙΟΣ'],
        [4, 'ΑΠΡΙΛΙΟΥ', 'ΑΠΡΙΛΙΟΣ'],
        [5, 'ΜΑΪΟΥ', 'ΜΑΪΟΣ'],
        [6, 'ΙΟΥΝΙΟΥ', 'ΙΟΥΝΙΟΣ'],
        [7, 'ΙΟΥΛΙΟΥ', 'ΙΟΥΛΙΟΣ'],
        [8, 'ΑΥΓΟΥΣΤΟΥ', 'ΑΥΓΟΥΣΤΟΣ'],
        [9, 'ΣΕΠΤΕΜΒΡΙΟΥ', 'ΣΕΠΤΕΜΒΡΙΟΣ'],
        [10, 'ΟΚΤΩΒΡΙΟΥ', 'ΟΚΤΩΒΡΙΟΣ'],
        [11, 'ΝΟΕΜΒΡΙΟΥ', 'ΝΟΕΜΒΡΙΟΣ'],
        [12, 'ΔΕΚΕΜΒΡΙΟΥ', 'ΔΕΚΕΜΒΡΙΟΣ'],
    ]
    const mm = (m: number) => String(m).padStart(2, '0')

    it.each(MONTHS)('month %i — genitive', (num, genitive) => {
        expect(iso(`15 ${genitive} 2024`)).toBe(`2024-${mm(num)}-15`)
    })

    it.each(MONTHS)('month %i — nominative', (num, _g, nominative) => {
        expect(iso(`15 ${nominative} 2024`)).toBe(`2024-${mm(num)}-15`)
    })

    it('handles lowercase, mixed case and accented forms (Μαΐου diaeresis+tonos)', () => {
        expect(iso('22 Μαΐου 2024')).toBe('2024-05-22')
        expect(iso('22 μαΐου 2024')).toBe('2024-05-22')
        expect(iso('22 ΜΑΙΟΥ 2024')).toBe('2024-05-22')
        expect(iso('3 Ιανουαρίου 2025')).toBe('2025-01-03')
        expect(iso('1η Αυγούστου 2024')).toBe('2024-08-01')
    })
})

describe('parseDocumentDate — numeric formats', () => {
    it.each([
        ['22-05-2024', '2024-05-22'],
        ['22/05/2024', '2024-05-22'],
        ['22.05.2024', '2024-05-22'],
        ['2.5.2024', '2024-05-02'],
        ['2024-05-22', '2024-05-22'],
        ['2024-05-22T00:00:00.000Z', '2024-05-22'],
    ])('%s → %s', (input, expected) => {
        expect(iso(input)).toBe(expected)
    })
})

describe('parseDocumentDate — hard rule: failed parse is null, never today', () => {
    it.each([
        '',
        null,
        undefined,
        'not a date',
        '__PENDING_EXTRACTION__',
        '32-05-2024', // impossible day
        '22-13-2024', // impossible month
        '31-02-2024', // overflow (Feb 31)
        '22 ΜΑΡΣΙΑΝΟΥ 2024', // fake month
        '15-05-1024', // implausible year
    ])('%s → null', (input) => {
        expect(parseDocumentDate(input as any)).toBeNull()
    })

    it('never returns the current date for garbage input', () => {
        const today = new Date().toISOString().slice(0, 10)
        for (const garbage of ['xx-yy-zzzz', 'TBD', 'Varies']) {
            expect(iso(garbage)).not.toBe(today)
            expect(parseDocumentDate(garbage)).toBeNull()
        }
    })
})

describe('helpers', () => {
    it('formatDocumentDate is null-safe and never renders "Invalid Date"', () => {
        expect(formatDocumentDate('22-05-2024', 'el-GR')).toBe('22/5/2024')
        expect(formatDocumentDate('garbage', 'el-GR')).toBeNull()
        expect(formatDocumentDate(null, 'el-GR')).toBeNull()
    })

    it('isSameDocumentDate cross-checks value against quote', () => {
        expect(isSameDocumentDate('22-05-2024', 'Έναρξη Ασφάλισης 22 ΜΑΪΟΥ 2024')).toBe(true)
        expect(isSameDocumentDate('23-05-2024', 'Έναρξη Ασφάλισης 22 ΜΑΪΟΥ 2024')).toBe(false)
        expect(isSameDocumentDate('garbage', '22 ΜΑΪΟΥ 2024')).toBe(false)
    })
})
