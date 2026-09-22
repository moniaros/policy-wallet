import { describe, expect, it } from 'vitest'
import { classifyLexically } from '@/lib/ingestion/lexical-classifier'
import { normalizeDocumentText } from '@/lib/ingestion/normalize-text'
const classify = (s: string) => classifyLexically(normalizeDocumentText(s))
const schedule = 'Ασφαλιστική εταιρεία Ασφαλισμένος Παράδειγμα Αριθμός ασφαλιστηρίου TEST-123 Περίοδος ασφάλισης 01.01.2026 - 31.12.2026 Ολικά ασφάλιστρα 100 ευρώ Κάλυψη και απαλλαγή.'
describe('schedule identity before bundled boilerplate', () => {
    it('does not classify a marine schedule as an endorsement or claim because its conditions discuss them', () => {
        const r = classify('MARINE HULL DEPT POLICY ' + schedule + ' '.repeat(5) + 'Ασφαλιστική κάλυψη. '.repeat(100) + 'Πρόσθετη πράξη endorsement claim form αποζημίωση γενικοί όροι')
        expect(r.documentType).toBe('insurance_policy')
        expect(r.branch.family).toBe('marine')
    })
    it.each(['ΚΛΟΠΗΣ ΧΡΗΜΑΤΩΝ', 'ΜΕΤΑΦΟΡΑΣ ΧΡΗΜΑΤΩΝ', 'ΕΜΠΙΣΤΟΣΥΝΗΣ ΥΠΑΛΛΗΛΩΝ'])('recognizes a commercial renewal titled %s with a legacy NUMBER label', title => {
        const r = classify(`ΑΝΑΝΕΩΤΗΡΙΟ ΑΣΦΑΛΙΣΤΗΡΙΟΥ ${title} ΑΣΦΑΛΙΖΟΜΕΝΟΣ ΠΑΡΑΔΕΙΓΜΑ ΑΡΙΘΜΟΣ 1234567 Περίοδος ασφάλισης 01.01.2026 - 31.12.2026 Ολικά ασφάλιστρα 100 ευρώ Κάλυψη και απαλλαγή.`)
        expect(r.documentType).toBe('insurance_renewal')
        expect(r.branch.family).toBe('business')
    })
    it('normalizes the PDF phi glyph before matching Greek insurance terms', () => {
        expect(normalizeDocumentText('Ασϕαλιστήριο')).toBe(normalizeDocumentText('Ασφαλιστήριο'))
    })
    it('does not turn a generic coverage booklet into a named policy', () => {
        expect(classify('Γενικοί όροι ασφάλισης υγείας. Ασφαλιστική εταιρεία. Πίνακας καλύψεων. Νοσηλεία αποζημίωση ορισμοί.').documentType).toBe('insurance_terms_or_guide')
    })
})
