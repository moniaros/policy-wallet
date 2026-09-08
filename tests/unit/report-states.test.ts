import { describe, expect, it } from "vitest"

import { generateSavingsReportHtml } from "@/lib/services/reports/savings-report"
import type { Composition } from "@/lib/gaps/composition"
import type { RecordStatusResult } from "@/lib/wallet/record-status"

/**
 * The report RENDERS what the app states — behaviourally, not by source match.
 *
 * `effects-on-a-record-are-told` pins the wiring; this pins the output. A report
 * that lists findings while saying nothing about what was checked, or about
 * whether a person has confirmed the record, implies a completeness the app
 * never claims — and an advisor hands this document to a customer
 * (PW-BRIDGE-01 C-03, C-04).
 */

const EMPTY_RESULT = { metadata: {}, gapResults: [] }
const AT = "2026-09-08T10:00:00.000Z"

function composition(over: Record<string, unknown> = {}): Composition {
    return {
        kind: "composition",
        lineOfBusiness: "motor",
        catalogueVersion: "test-version",
        stale: null,
        coverage: { checked: 6, covered: 4, notCovered: 1, indeterminate: 1, items: [] },
        recording: { checked: 3, recorded: 2, notRecorded: 1, items: [] },
        unclassified: [],
        undeclaredInputs: [],
        ...over,
    } as unknown as Composition
}

const render = (
    comp: Composition | null,
    recordStatus: RecordStatusResult | null,
    language: "el" | "en" = "el"
) => generateSavingsReportHtml(EMPTY_RESULT, AT, language, undefined, [], null, null, null, comp, recordStatus)

describe("the report renders the composition (C-04)", () => {
    it("states both denominators, and the parts beside them", () => {
        const html = render(composition(), null)
        expect(html).toContain('data-fact="composition.coverage"')
        expect(html).toContain('data-fact="composition.recording"')
        // The denominator first — a count never appears without what it is out of.
        expect(html).toContain("Ελέγξαμε 6 σημεία κάλυψης")
        expect(html).toContain("4 καλύπτονται")
        expect(html).toContain("1 δεν καλύπτονται")
        expect(html).toContain("1 δεν μπόρεσαν να ελεγχθούν")
        expect(html).toContain("ελέγξαμε αν καταγράφονται 3")
    })

    it("renders the app's «all indeterminate» sentence rather than a bare zero", () => {
        const html = render(
            composition({ coverage: { checked: 4, covered: 0, notCovered: 0, indeterminate: 4, items: [] } }),
            null
        )
        expect(html).toContain("κανένα από τα 4 δεν μπόρεσε να ελεγχθεί")
        expect(html).not.toContain("0 καλύπτονται")
    })

    it("carries the stale sentence once — from the composition, not twice", () => {
        const withStale = composition({
            stale: { runDateLabel: "1 Σεπτεμβρίου 2026", runVersion: "old", currentVersion: "new" },
        })
        const html = generateSavingsReportHtml(
            EMPTY_RESULT,
            AT,
            "el",
            undefined,
            [],
            null,
            null,
            // The standalone caveat a caller may still pass...
            { dateLabel: "1 Σεπτεμβρίου 2026" },
            // ...is suppressed when the composition already carries its own.
            withStale,
            null
        )
        expect(html.match(/data-composition-state="stale_catalogue"/g)).toHaveLength(1)
    })

    it("says nothing when there is no composition to state", () => {
        const html = render(null, null)
        expect(html).not.toContain('data-fact="composition.coverage"')
    })
})

describe("the report states the record's state (C-03)", () => {
    it("names the state and frames it as being about the RECORD", () => {
        const html = render(null, { status: "awaiting_confirmation", need: null, missingFields: [] })
        expect(html).toContain('data-fact="record.status"')
        expect(html).toContain('data-record-status="awaiting_confirmation"')
        expect(html).toContain("Προς επιβεβαίωση")
        // The sentence that stops a record's state reading as a verdict on the cover.
        expect(html).toContain("Η κατάσταση περιγράφει τον φάκελο, όχι την ασφάλισή σας.")
    })

    it("says who confirmed it, when a person has", () => {
        const html = render(null, { status: "confirmed", need: null, missingFields: [], confirmedBy: "agent" })
        expect(html).toContain("Επιβεβαίωση συμβούλου")
        expect(html).not.toContain("data-record-status=")
    })

    it("stays silent on a confirmed record with no named confirmer", () => {
        const html = render(null, { status: "confirmed", need: null, missingFields: [] })
        expect(html).not.toContain('data-fact="record.status"')
    })

    it("renders in English for an English reader", () => {
        const html = render(null, { status: "awaiting_confirmation", need: null, missingFields: [] }, "en")
        expect(html).toContain("Awaiting confirmation")
        expect(html).not.toContain("Προς επιβεβαίωση")
    })
})
