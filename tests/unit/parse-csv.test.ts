import { describe, it, expect } from 'vitest'
import {
    mapCustomerHeader,
    normalizeHeader,
    parseCsv,
    parseCustomerCsv,
    sniffDelimiter,
} from '@/lib/csv/parse-csv'

/**
 * S4 — the bulk-import modal parsed CSV with `line.split(',')`. A Greek-locale
 * Excel export (`;`-delimited, BOM-prefixed, Greek headers) produced one cell
 * per row and every customer was «Λείπουν υποχρεωτικά πεδία»; a quoted name
 * with a comma shifted every later column. These pin the reader against the
 * files agents actually export.
 */
describe('sniffDelimiter', () => {
    it('picks the semicolon a Greek-locale Excel writes', () => {
        expect(sniffDelimiter('Όνομα;Επώνυμο;Email;Τηλέφωνο\nΜαρία;Παπαδοπούλου;m@x.gr;69')).toBe(';')
    })

    it('keeps the comma for the documented English layout', () => {
        expect(sniffDelimiter('name,surname,email,phone\nJohn,Doe,j@x.gr,69')).toBe(',')
    })

    it('recognises a tab-separated export', () => {
        expect(sniffDelimiter('name\tsurname\temail\nJohn\tDoe\tj@x.gr')).toBe('\t')
    })

    it('ignores delimiters inside quotes when counting', () => {
        // Two commas inside the quoted cell, three semicolons outside it.
        expect(sniffDelimiter('"Παπαδοπούλου, Μαρία, Ελένη";m@x.gr;69;123')).toBe(';')
    })

    it('does not trip on a BOM before the first header', () => {
        expect(sniffDelimiter('\uFEFFΌνομα;Email\nΜαρία;m@x.gr')).toBe(';')
    })
})

describe('parseCsv — RFC 4180', () => {
    it('reads a semicolon file with Greek headers into cells', () => {
        const rows = parseCsv('Όνομα;Επώνυμο;Email;Τηλέφωνο\nΜαρία;Παπαδοπούλου;maria@example.gr;+306912345678\n')
        expect(rows).toEqual([
            ['Όνομα', 'Επώνυμο', 'Email', 'Τηλέφωνο'],
            ['Μαρία', 'Παπαδοπούλου', 'maria@example.gr', '+306912345678'],
        ])
    })

    it('keeps a comma inside a quoted field, and unescapes doubled quotes', () => {
        const rows = parseCsv('name,surname,email\n"Παπαδοπούλου, Μαρία","O""Neil",m@x.gr')
        expect(rows[1]).toEqual(['Παπαδοπούλου, Μαρία', 'O"Neil', 'm@x.gr'])
    })

    it('keeps a newline inside a quoted field as part of the cell', () => {
        const rows = parseCsv('name,email\n"Μαρία\nΠαπαδοπούλου",m@x.gr')
        expect(rows).toHaveLength(2)
        expect(rows[1][0]).toBe('Μαρία\nΠαπαδοπούλου')
    })

    it('strips the BOM, and accepts CRLF and CR line endings', () => {
        expect(parseCsv('\uFEFFname,email\r\nA,a@x.gr\r\nB,b@x.gr')).toEqual([
            ['name', 'email'],
            ['A', 'a@x.gr'],
            ['B', 'b@x.gr'],
        ])
        expect(parseCsv('name,email\rA,a@x.gr')).toHaveLength(2)
    })

    it('drops blank lines and trims cells', () => {
        const rows = parseCsv('name , email \n\n A , a@x.gr \n   \n')
        expect(rows).toEqual([
            ['name', 'email'],
            ['A', 'a@x.gr'],
        ])
    })

    it('returns nothing for empty input', () => {
        expect(parseCsv('')).toEqual([])
        expect(parseCsv('\uFEFF')).toEqual([])
    })
})

describe('header mapping — Greek and English, accents and case ignored', () => {
    it('normalises accents, case and punctuation', () => {
        expect(normalizeHeader('\uFEFFΌνομα')).toBe('ονομα')
        expect(normalizeHeader('E-mail')).toBe('email')
        expect(normalizeHeader('Α.Φ.Μ.')).toBe('αφμ')
        expect(normalizeHeader('Tax ID')).toBe('taxid')
    })

    it.each([
        ['Όνομα', 'name'],
        ['ΟΝΟΜΑ', 'name'],
        ['Name', 'name'],
        ['First name', 'name'],
        ['Επώνυμο', 'surname'],
        ['Surname', 'surname'],
        ['Last Name', 'surname'],
        ['Email', 'email'],
        ['E-mail', 'email'],
        ['Τηλέφωνο', 'phone'],
        ['Κινητό', 'phone'],
        ['Phone', 'phone'],
        ['ΑΦΜ', 'taxId'],
        ['Α.Φ.Μ.', 'taxId'],
        ['VAT', 'taxId'],
        ['TaxId', 'taxId'],
    ])('maps «%s» to %s', (header, column) => {
        expect(mapCustomerHeader(header)).toBe(column)
    })

    it('leaves an unknown header unmapped', () => {
        expect(mapCustomerHeader('Διεύθυνση')).toBeNull()
        expect(mapCustomerHeader('')).toBeNull()
    })
})

describe('parseCustomerCsv — the file an agent actually exports', () => {
    it('reads a Greek-locale Excel export: BOM, semicolons, Greek headers, any column order', () => {
        const text = '\uFEFFEmail;Επώνυμο;Όνομα;ΑΦΜ;Τηλέφωνο\r\nmaria@example.gr;Παπαδοπούλου;Μαρία;123456789;+306912345678\r\n'
        const parsed = parseCustomerCsv(text)
        expect(parsed.error).toBeNull()
        expect(parsed.delimiter).toBe(';')
        expect(parsed.headerRecognised).toBe(true)
        expect(parsed.rows).toEqual([
            { line: 2, name: 'Μαρία', surname: 'Παπαδοπούλου', email: 'maria@example.gr', phone: '+306912345678', taxId: '123456789' },
        ])
    })

    it('reads the documented English layout unchanged', () => {
        const parsed = parseCustomerCsv('name,surname,email,phone\nJohn,Doe,john@example.com,+306912345678')
        expect(parsed.rows).toEqual([
            { line: 2, name: 'John', surname: 'Doe', email: 'john@example.com', phone: '+306912345678', taxId: '' },
        ])
    })

    it('a quoted surname with a comma does not shift the email column', () => {
        const parsed = parseCustomerCsv('name,surname,email\nΜαρία,"Παπαδοπούλου, Ελένη",maria@example.gr')
        expect(parsed.rows[0].surname).toBe('Παπαδοπούλου, Ελένη')
        expect(parsed.rows[0].email).toBe('maria@example.gr')
    })

    it('a file with no header row is read positionally and its first line is data', () => {
        const parsed = parseCustomerCsv('Μαρία;Παπαδοπούλου;maria@example.gr;69\nΝίκος;Δήμου;nikos@example.gr;69')
        expect(parsed.headerRecognised).toBe(false)
        expect(parsed.rows.map((r) => r.email)).toEqual(['maria@example.gr', 'nikos@example.gr'])
        expect(parsed.rows.map((r) => r.line)).toEqual([1, 2])
    })

    it('a missing optional column reads as empty, never shifts', () => {
        const parsed = parseCustomerCsv('Όνομα;Email\nΜαρία;maria@example.gr')
        expect(parsed.rows[0]).toEqual({ line: 2, name: 'Μαρία', surname: '', email: 'maria@example.gr', phone: '', taxId: '' })
    })

    it('refuses a header row with no email column', () => {
        const parsed = parseCustomerCsv('Όνομα;Επώνυμο;Διεύθυνση\nΜαρία;Παπαδοπούλου;Αθήνα')
        expect(parsed.error).toBe('no_email_column')
        expect(parsed.rows).toEqual([])
    })

    it('reports an empty file, and a header with no rows under it', () => {
        expect(parseCustomerCsv('').error).toBe('empty')
        expect(parseCustomerCsv('name,surname,email,phone\n').error).toBe('empty')
    })
})
