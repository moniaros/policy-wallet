/**
 * Extraction eval case — reuses the Εθνική Full Health fixture and pins the
 * structured fields the extractor must recover. Amounts are scored within a 1%
 * tolerance; free-text summary is presence-only.
 */

import { HEALTH_ETHNIKI_1 } from "@/tests/fixtures/health-ethniki-1"
import type { ExpectedExtraction } from "../../scorers/extraction-scorer"
import { SPECIALTY_EXTRACTION_CASES } from "./specialty-lines"

export interface ExtractionEvalCase {
    id: string
    /** The document to feed the extractor (base64 PDF/image). */
    document: { data: string; mimeType: string; fileName: string }
    expected: ExpectedExtraction
}

/**
 * SYNTHETIC policy-schedule document, generated from the fixture's own scored
 * fields so real-provider extraction runs measure something real (the previous
 * placeholder was a 1x1 transparent PNG — a paid run scored extraction from a
 * blank pixel). Plain text because Gemini accepts inline text/plain documents
 * and hand-rolled PDFs cannot carry Greek without font embedding; the mock
 * provider ignores document bytes either way, so eval:ci is unaffected.
 *
 * The policyholder identity is deliberately FAKE («ΔΕΙΓΜΑ ΣΥΝΘΕΤΙΚΟ») — the
 * scorer never checks identity fields, and the real fixture's person must not
 * be propagated into new artifacts.
 */
const SYNTHETIC_DOCUMENT_TEXT = `Η ΕΘΝΙΚΗ — ΑΝΩΝΥΜΟΣ ΕΛΛΗΝΙΚΗ ΕΤΑΙΡΙΑ ΓΕΝΙΚΩΝ ΑΣΦΑΛΕΙΩΝ
ΑΣΦΑΛΙΣΤΗΡΙΟ ΣΥΜΒΟΛΑΙΟ ΥΓΕΙΑΣ — FULL HEALTH
(Συνθετικό δείγμα αξιολόγησης — δεν αποτελεί πραγματικό συμβόλαιο)

Αριθμός Συμβολαίου: 1651622
Λήπτης της Ασφάλισης: ΔΕΙΓΜΑ ΣΥΝΘΕΤΙΚΟ
Κλάδος: Υγείας (health)

Διάρκεια Ασφάλισης
Έναρξη: 22/05/2024
Λήξη: 22/05/2025

Καλύψεις
- Νοσοκομειακή περίθαλψη: ετήσιο όριο €1.500.000, απαλλαγή €1.500
- Διαγνωστικές εξετάσεις (AFFIDEA — Ευρωιατρική): έως €2.000 ετησίως
- Έξοδα από ατύχημα: έως €2.000 ανά περιστατικό
- Άμεση ιατρική βοήθεια
- Επείγοντα περιστατικά: έως €1.000 ανά περιστατικό, μέγιστο 3 ετησίως

Ειδικοί Όροι
- Συμμετοχή 10% σε νοσηλεία εντός Η.Π.Α.

Ανάλυση Ασφαλίστρων
Νοσοκομειακή περίθαλψη            €812,66
Διαγνωστικές εξετάσεις (AFFIDEA)  €134,00
Έξοδα ατυχήματος                   €77,00
Άμεση βοήθεια                      €22,61
Επείγοντα περιστατικά              €92,00
──────────────────────────────────────────
Ολικά Ασφάλιστρα (Πληρωτέο Ποσό) €1.138,27
`

export const EXTRACTION_HEALTH_ETHNIKI_1: ExtractionEvalCase = {
    id: "extraction/health-ethniki-1",
    document: {
        data: Buffer.from(SYNTHETIC_DOCUMENT_TEXT, "utf8").toString("base64"),
        mimeType: "text/plain",
        fileName: "health-ethniki-1-synthetic.txt",
    },
    expected: {
        insurerName: HEALTH_ETHNIKI_1.insurerName,
        policyNumber: HEALTH_ETHNIKI_1.policyNumber,
        lineOfBusiness: HEALTH_ETHNIKI_1.lineOfBusiness,
        startDate: HEALTH_ETHNIKI_1.startDate,
        endDate: HEALTH_ETHNIKI_1.endDate,
        premiumAmount: HEALTH_ETHNIKI_1.premiumAmount,
        hasCoverageSummary: true,
    },
}

/**
 * Every extraction case the harness runs.
 *
 * The specialty cases live in their own module because they exist for a
 * different reason: health is the accuracy baseline, they are the CLASSIFICATION
 * baseline. Each carries a line the extractor's vocabulary had no word for
 * before the expansion, and each puts a sum insured next to a premium so the
 * confusion the prompt warns about has somewhere to show up.
 */
export const EXTRACTION_CASES: ExtractionEvalCase[] = [
    EXTRACTION_HEALTH_ETHNIKI_1,
    ...SPECIALTY_EXTRACTION_CASES,
]
