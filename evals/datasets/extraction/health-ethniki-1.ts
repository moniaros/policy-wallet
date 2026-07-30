/**
 * Extraction eval case — reuses the Εθνική Full Health fixture and pins the
 * structured fields the extractor must recover. Amounts are scored within a 1%
 * tolerance; free-text summary is presence-only.
 */

import { HEALTH_ETHNIKI_1 } from "@/tests/fixtures/health-ethniki-1"
import type { ExpectedExtraction } from "../../scorers/extraction-scorer"

export interface ExtractionEvalCase {
    id: string
    /** The document to feed the extractor (base64 PDF/image). */
    document: { data: string; mimeType: string; fileName: string }
    expected: ExpectedExtraction
}

export const EXTRACTION_HEALTH_ETHNIKI_1: ExtractionEvalCase = {
    id: "extraction/health-ethniki-1",
    // The real PDF isn't committed; the mock provider ignores document bytes and
    // returns deterministic fixtures. Real-provider runs should point this at a
    // redacted sample. A 1x1 transparent PNG stands in as a valid tiny payload.
    document: {
        data:
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        mimeType: "image/png",
        fileName: "health-ethniki-1.png",
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

export const EXTRACTION_CASES: ExtractionEvalCase[] = [EXTRACTION_HEALTH_ETHNIKI_1]
