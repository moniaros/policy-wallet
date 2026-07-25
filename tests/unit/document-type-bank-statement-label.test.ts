import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * DOCUMENT_TYPE_TAXONOMY drives the document an advisor asks a client to upload.
 * `bank_statement` shipped en: "Bank Statement" / el: "Τελευταίος Λογαριασμός" —
 * but «Τελευταίος Λογαριασμός» ("latest bill/account") is what a Greek reader
 * associates with a UTILITY bill («λογαριασμός ΔΕΗ»), not a record of bank
 * transactions. The two languages requested different documents: the advisor
 * asks for a bank statement, the client sees "latest bill" and could upload the
 * wrong thing. The precise Greek term for a bank statement is «(Αντίγραφο)
 * Κίνησης Λογαριασμού».
 *
 * lint:i18n-changed can't catch a wrong-but-bilingual label; this pins the fix.
 */
const SRC = readFileSync('components/collaboration/types.ts', 'utf-8')

function docLabelEl(key: string): string | null {
    // e.g. bank_statement: { en: "Bank Statement", el: "…" },
    const re = new RegExp(`${key}:\\s*\\{[^}]*\\bel:\\s*"([^"]*)"`)
    const m = SRC.match(re)
    return m ? m[1] : null
}

describe('bank_statement document type is labelled as a bank statement in Greek', () => {
    it('the Greek label denotes account movements (Κίνηση), not a generic bill', () => {
        const el = docLabelEl('bank_statement')
        expect(el, 'bank_statement el label not found in DOCUMENT_TYPE_TAXONOMY').toBeTruthy()
        // «Κίνηση (Λογαριασμού)» is the disambiguating term for a bank statement.
        expect(
            el,
            `bank_statement Greek label "${el}" must denote a bank statement ` +
            `(«Κίνηση Λογαριασμού»), not a generic/utility bill`,
        ).toMatch(/Κίνηση/)
    })

    it('does not use the ambiguous «Τελευταίος Λογαριασμός» (reads as a utility bill)', () => {
        const el = docLabelEl('bank_statement')
        expect(el).not.toContain('Τελευταίος Λογαριασμός')
    })
})
