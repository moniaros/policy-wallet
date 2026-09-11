// @vitest-environment node
// pdf.js needs Node's own TextDecoder/Uint8Array — jsdom's shims make it fail
// to parse a perfectly good file.
import { describe, it, expect, vi, afterEach } from "vitest"
import { PDFDocument, StandardFonts } from "pdf-lib"
import {
    probePdf,
    MAX_DOCUMENT_PAGES,
    PROBE_SAMPLE_PAGES,
    IMAGE_ONLY_TEXT_THRESHOLD,
} from "@/lib/ingestion/pdf-probe"
import { normalizeDocumentText } from "@/lib/ingestion/normalize-text"

import { textPdf, imageOnlyPdf, pagedTextPdf } from "../../helpers/pdf-fixtures"

/** Well-formed and empty: a catalogue whose page tree has zero kids. */
const ZERO_PAGE_PDF = Buffer.from(
    "%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [] /Count 0 >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n",
    "latin1"
)

describe("normalizeDocumentText", () => {
    it("folds case, tonos and final sigma so one lexicon entry matches every spelling", () => {
        expect(normalizeDocumentText("ΑΣΦΑΛΙΣΤΉΡΙΟ  Συμβόλαιο\nΑσφαλισμένος")).toBe("ασφαλιστηριο συμβολαιο ασφαλισμενοσ")
        expect(normalizeDocumentText("Policy  Number:\tMT-2026")).toBe("policy number: mt-2026")
    })
})

describe("probePdf — the cheap local read", () => {
    it("reads the page count and the normalised text of a text PDF", async () => {
        const bytes = await textPdf([
            "MOTOR INSURANCE POLICY SCHEDULE",
            "Policy Number: MT-2026-0001234",
            "Total premium: EUR 412.50",
        ])
        const result = await probePdf(bytes)
        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.pageCount).toBe(1)
        expect(result.sampledPages).toBe(1)
        expect(result.imageOnly).toBe(false)
        expect(result.text).toContain("policy number: mt-2026-0001234")
        expect(result.text).toContain("total premium: eur 412.50")
        expect(result.textChars).toBeGreaterThan(IMAGE_ONLY_TEXT_THRESHOLD)
    })

    it("keeps each sampled page's RAW text beside the folded text — pages[i] is page i + 1, case and accents intact", async () => {
        const bytes = await pagedTextPdf([
            ["Insurance Policy Schedule", "Policy number MT-2026-0001"],
            ["Insured: Maria Papadopoulou", "Vehicle IZT-1234"],
            ["Premium EUR 420.00", "Period 01/01/2026 - 31/12/2026"],
        ])
        const result = await probePdf(bytes)
        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.pages).toHaveLength(3)
        expect(result.sampledPages).toBe(3)
        // Raw: the capital letters survive here and are folded in `text`.
        expect(result.pages[0]).toContain("Insurance Policy Schedule")
        expect(result.text).toContain("insurance policy schedule")
        expect(result.text).not.toContain("Insurance Policy Schedule")
        // No page is joined into another: the second page's line is on page 2 only.
        expect(result.pages[1]).toContain("Insured: Maria Papadopoulou")
        expect(result.pages[0]).not.toContain("Maria")
        // `text` is unchanged by the addition: still the folded join of the same parts.
        expect(result.text).toBe(normalizeDocumentText(result.pages.join("\n")))
    })

    it("flags a blank page and an image-only page as image-only rather than failing", async () => {
        const blank = await PDFDocument.create()
        blank.addPage()
        const blankResult = await probePdf(await blank.save())
        expect(blankResult).toMatchObject({ ok: true, pageCount: 1, imageOnly: true, textChars: 0 })

        const scan = await probePdf(await imageOnlyPdf(2))
        expect(scan).toMatchObject({ ok: true, pageCount: 2, imageOnly: true })
    })

    it("refuses an over-cap document by page count BEFORE reading any text", async () => {
        const bytes = await textPdf(["page"], MAX_DOCUMENT_PAGES + 1)
        const result = await probePdf(bytes)
        expect(result).toEqual({ ok: false, failure: "too_many_pages", pageCount: MAX_DOCUMENT_PAGES + 1 })
    })

    it("reads only the first PROBE_SAMPLE_PAGES pages", async () => {
        // Text only on the LAST page of a document longer than the sample.
        const doc = await PDFDocument.create()
        const font = await doc.embedFont(StandardFonts.Helvetica)
        for (let p = 0; p < PROBE_SAMPLE_PAGES + 3; p++) doc.addPage()
        doc.getPage(PROBE_SAMPLE_PAGES + 2).drawText("LATE PAGE SECRET", { x: 40, y: 800, size: 11, font })
        const result = await probePdf(await doc.save())
        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.sampledPages).toBe(PROBE_SAMPLE_PAGES)
        expect(result.text).not.toContain("late page secret")
    })

    it("names garbage and truncated files unreadable", async () => {
        expect(await probePdf(new Uint8Array(Buffer.from("%PDF-1.4 this is not a pdf at all")))).toEqual({
            ok: false,
            failure: "unreadable",
        })
        const good = await textPdf(["hello"])
        expect(await probePdf(good.slice(0, 60))).toEqual({ ok: false, failure: "unreadable" })
        expect(await probePdf(new Uint8Array(Buffer.from("MZ\x90\x00 an exe renamed", "latin1")))).toEqual({
            ok: false,
            failure: "unreadable",
        })
    })

    it("names a zero-page PDF as having no pages", async () => {
        const result = await probePdf(new Uint8Array(ZERO_PAGE_PDF))
        expect(result).toEqual({ ok: false, failure: "no_pages", pageCount: 0 })
    })

    it("does not consume the caller's buffer", async () => {
        const bytes = await textPdf(["still here"])
        const before = Buffer.from(bytes).toString("base64")
        await probePdf(bytes)
        expect(Buffer.from(bytes).toString("base64")).toBe(before)
    })

    it("gives up on the budget instead of waiting forever", async () => {
        const bytes = await textPdf(["slow"], 3)
        const result = await probePdf(bytes, { budgetMs: 0 })
        expect(result).toEqual({ ok: false, failure: "budget_exceeded" })
    })
})

describe("probePdf — password-protected files", () => {
    afterEach(() => {
        vi.doUnmock("unpdf")
        vi.resetModules()
    })

    it("maps pdf.js's PasswordException to password_protected", async () => {
        // The static import above already cached the module with the real
        // unpdf; reset first so the dynamic import below sees the mock.
        vi.resetModules()
        vi.doMock("unpdf", () => ({
            getDocumentProxy: vi.fn(async () => {
                const error = new Error("No password given")
                error.name = "PasswordException"
                throw error
            }),
        }))
        const { probePdf: probe } = await import("@/lib/ingestion/pdf-probe")
        expect(await probe(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toEqual({
            ok: false,
            failure: "password_protected",
        })
    })
})
