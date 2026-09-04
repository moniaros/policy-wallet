import { describe, it, expect } from 'vitest'
import {
    hasIdentityColumns,
    mapCustomerHeader,
    normalizeHeader,
    parseCsv,
    parseCustomerCsv,
    sniffDelimiter,
} from '@/lib/csv/parse-csv'
import { AgentCustomerInput, customerEmailIdentity } from '@/lib/validations/agent-intake'

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

    /**
     * Owner decision D3: ΑΦΜ + phone are a full identity, so a file needs an
     * email column OR both a tax-id column and a phone column. One with
     * neither can identify nobody and is refused as `no_identity_columns`.
     */
    it('accepts a file with ΑΦΜ and phone columns and no email column at all', () => {
        const parsed = parseCustomerCsv('Όνομα;Επώνυμο;ΑΦΜ;Τηλέφωνο\nΚώστας;Δήμου;123456783;6912345678\nΜαρία;Ιωάννου;123456783;+30 691 000 0000')
        expect(parsed.error).toBeNull()
        expect(parsed.headerRecognised).toBe(true)
        expect(parsed.columns.email).toBeNull()
        expect(hasIdentityColumns(parsed.columns)).toBe(true)
        expect(parsed.rows[0]).toEqual({ line: 2, name: 'Κώστας', surname: 'Δήμου', email: '', phone: '6912345678', taxId: '123456783' })
    })

    it('refuses a file with neither an email column nor ΑΦΜ + phone columns', () => {
        for (const text of [
            'Όνομα;Επώνυμο;Διεύθυνση\nΜαρία;Παπαδοπούλου;Αθήνα',
            // ΑΦΜ alone, phone alone — half an identity is none.
            'Όνομα;ΑΦΜ\nΜαρία;123456783',
            'Όνομα;Τηλέφωνο\nΜαρία;6912345678',
        ]) {
            const parsed = parseCustomerCsv(text)
            expect(parsed.error, text).toBe('no_identity_columns')
            expect(parsed.rows).toEqual([])
            expect(hasIdentityColumns(parsed.columns)).toBe(false)
        }
    })

    it('rows of an ΑΦΜ + phone file go through the same synthetic-address branch as the single doors', () => {
        const parsed = parseCustomerCsv('Όνομα;ΑΦΜ;Τηλέφωνο\nΚώστας;123456783;6912345678')
        const row = parsed.rows[0]
        const input = AgentCustomerInput.safeParse({ name: row.name, surname: row.surname, email: row.email, phone: row.phone, taxId: row.taxId })
        expect(input.success).toBe(true)
        expect(customerEmailIdentity(input.data!)).toEqual({
            email: 'noemail+123456783@customers.policywallet.invalid',
            contactEmailMissing: true,
        })
        // A row that fails the identity rule fails on the email path, like every other door.
        const bad = parseCustomerCsv('Όνομα;ΑΦΜ;Τηλέφωνο\nΚώστας;123456783;2101234567').rows[0]
        const refused = AgentCustomerInput.safeParse({ name: bad.name, email: bad.email, phone: bad.phone, taxId: bad.taxId })
        expect(refused.success).toBe(false)
        expect(refused.error?.issues.some((i) => i.path.join('.') === 'email' && i.message === 'contact_required')).toBe(true)
    })

    it('reports an empty file, and a header with no rows under it', () => {
        expect(parseCustomerCsv('').error).toBe('empty')
        expect(parseCustomerCsv('name,surname,email,phone\n').error).toBe('empty')
    })
})
