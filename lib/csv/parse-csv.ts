/**
 * A small RFC-4180 reader for the customer bulk-import CSV.
 *
 * The modal used to do `line.split(',')`. Three real files broke it:
 *
 *   - Greek-locale Excel saves CSV with `;` as the delimiter (the list
 *     separator follows the locale, where `,` is the decimal mark), so every
 *     row became ONE cell and every customer was «Λείπουν υποχρεωτικά πεδία».
 *   - A quoted field with a comma inside («"Παπαδοπούλου, Μαρία"») split in the
 *     middle of the name and shifted every later column.
 *   - Excel prepends a UTF-8 BOM, so the first header read as `\uFEFFname`.
 *
 * This module sniffs the delimiter, honours quotes (with `""` escapes and
 * newlines inside a quoted field), strips the BOM, and maps headers in Greek
 * or English onto the customer columns. It is a plain function of the text so
 * it is unit-testable without a browser.
 */

export type CsvDelimiter = ',' | ';' | '\t'

export const CUSTOMER_CSV_COLUMNS = ['name', 'surname', 'email', 'phone', 'taxId'] as const
export type CustomerCsvColumn = (typeof CUSTOMER_CSV_COLUMNS)[number]

/**
 * Header spellings accepted per column, after `normalizeHeader` (lowercase,
 * accents stripped, only letters/digits kept). Greek and English, plus the
 * variants Excel and CRM exports commonly produce.
 */
const HEADER_ALIASES: Record<CustomerCsvColumn, readonly string[]> = {
    name: ['name', 'firstname', 'givenname', 'ονομα', 'μικροονομα'],
    surname: ['surname', 'lastname', 'familyname', 'επωνυμο', 'επιθετο'],
    email: ['email', 'emailaddress', 'mail', 'ηλεκτρονικοταχυδρομειο', 'ηλταχυδρομειο'],
    phone: ['phone', 'telephone', 'mobile', 'phonenumber', 'τηλεφωνο', 'κινητο', 'τηλ'],
    taxId: ['taxid', 'vat', 'vatid', 'vatnumber', 'afm', 'αφμ'],
}

/** The two header rows the instructions show — one per language. */
export const CUSTOMER_CSV_HEADER_EXAMPLES = {
    el: 'Όνομα;Επώνυμο;Email;Τηλέφωνο;ΑΦΜ',
    en: 'name,surname,email,phone,taxId',
} as const

/** Lowercase, accents removed, everything but letters and digits dropped. */
export function normalizeHeader(raw: string): string {
    return raw
        .replace(/^\uFEFF/, '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]/gu, '')
}

export function mapCustomerHeader(raw: string): CustomerCsvColumn | null {
    const key = normalizeHeader(raw)
    if (!key) return null
    for (const column of CUSTOMER_CSV_COLUMNS) {
        if (HEADER_ALIASES[column].includes(key)) return column
    }
    return null
}

/**
 * Pick the delimiter by counting candidates OUTSIDE quotes on the first
 * non-empty line. Ties go to the comma, so a plain English file keeps its
 * historical behaviour.
 */
export function sniffDelimiter(text: string): CsvDelimiter {
    const firstLine = text.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/).find((line) => line.trim()) ?? ''
    const counts: Record<CsvDelimiter, number> = { ',': 0, ';': 0, '\t': 0 }
    let inQuotes = false
    for (const ch of firstLine) {
        if (ch === '"') inQuotes = !inQuotes
        else if (!inQuotes && (ch === ',' || ch === ';' || ch === '\t')) counts[ch] += 1
    }
    let best: CsvDelimiter = ','
    for (const candidate of [';', '\t'] as const) {
        if (counts[candidate] > counts[best]) best = candidate
    }
    return best
}

/**
 * Parse CSV text into rows of cells. Handles quoted fields (with `""` escapes
 * and embedded newlines), CRLF/LF/CR line endings and a leading BOM. Blank
 * lines are dropped; cells are trimmed.
 */
export function parseCsv(text: string, delimiter: CsvDelimiter = sniffDelimiter(text)): string[][] {
    const src = text.replace(/^\uFEFF/, '')
    const rows: string[][] = []
    let row: string[] = []
    let cell = ''
    let inQuotes = false

    const endCell = () => {
        row.push(cell.trim())
        cell = ''
    }
    const endRow = () => {
        endCell()
        if (row.some((c) => c !== '')) rows.push(row)
        row = []
    }

    for (let i = 0; i < src.length; i++) {
        const ch = src[i]
        if (inQuotes) {
            if (ch === '"') {
                if (src[i + 1] === '"') {
                    cell += '"'
                    i++
                } else {
                    inQuotes = false
                }
            } else {
                cell += ch
            }
            continue
        }
        if (ch === '"') {
            inQuotes = true
        } else if (ch === delimiter) {
            endCell()
        } else if (ch === '\r') {
            if (src[i + 1] === '\n') i++
            endRow()
        } else if (ch === '\n') {
            endRow()
        } else {
            cell += ch
        }
    }
    // Flush the last row when the file has no trailing newline.
    if (cell !== '' || row.length > 0) endRow()

    return rows
}

export interface CustomerCsvRow {
    /** 1-based line in the file as the agent sees it in Excel (the header is line 1). */
    line: number
    name: string
    surname: string
    email: string
    phone: string
    taxId: string
}

export type CustomerCsvParseError = 'empty' | 'no_email_column'

export interface CustomerCsvParseResult {
    rows: CustomerCsvRow[]
    delimiter: CsvDelimiter
    /** Which column index each field was read from; null when the file has none. */
    columns: Record<CustomerCsvColumn, number | null>
    /** True when the first line was a recognised header, false when it was data. */
    headerRecognised: boolean
    error: CustomerCsvParseError | null
}

/** The legacy layout the instructions have always shown, for header-less files. */
const POSITIONAL: Record<CustomerCsvColumn, number | null> = { name: 0, surname: 1, email: 2, phone: 3, taxId: 4 }

/**
 * Parse a customer CSV: sniff the delimiter, read the header (Greek or
 * English, any order), and produce one record per data line.
 *
 * A file whose first line is NOT a recognised header is read positionally in
 * the documented order (name, surname, email, phone, ΑΦΜ) — and that first
 * line is treated as data when it holds an `@`, otherwise as an unknown header
 * and skipped, which is what the old parser always did.
 */
export function parseCustomerCsv(text: string): CustomerCsvParseResult {
    const delimiter = sniffDelimiter(text)
    const table = parseCsv(text, delimiter)
    const empty: Record<CustomerCsvColumn, number | null> = { name: null, surname: null, email: null, phone: null, taxId: null }

    if (table.length === 0) {
        return { rows: [], delimiter, columns: empty, headerRecognised: false, error: 'empty' }
    }

    const header = table[0]
    const mapped: Record<CustomerCsvColumn, number | null> = { ...empty }
    let recognised = 0
    header.forEach((cell, index) => {
        const column = mapCustomerHeader(cell)
        if (column && mapped[column] === null) {
            mapped[column] = index
            recognised += 1
        }
    })

    const headerRecognised = mapped.email !== null || recognised >= 2
    let columns: Record<CustomerCsvColumn, number | null>
    let dataStart: number
    if (headerRecognised) {
        columns = mapped
        dataStart = 1
    } else {
        columns = POSITIONAL
        // Header-less export: the first line is a customer when it carries an address.
        dataStart = header.some((cell) => cell.includes('@')) ? 0 : 1
    }

    if (columns.email === null) {
        return { rows: [], delimiter, columns, headerRecognised, error: 'no_email_column' }
    }

    const cellAt = (row: string[], index: number | null) => (index === null ? '' : (row[index] ?? '').trim())
    const rows: CustomerCsvRow[] = []
    for (let i = dataStart; i < table.length; i++) {
        const row = table[i]
        rows.push({
            line: i + 1,
            name: cellAt(row, columns.name),
            surname: cellAt(row, columns.surname),
            email: cellAt(row, columns.email),
            phone: cellAt(row, columns.phone),
            taxId: cellAt(row, columns.taxId),
        })
    }

    return { rows, delimiter, columns, headerRecognised, error: rows.length === 0 ? 'empty' : null }
}
