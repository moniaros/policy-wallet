import { describe, it, expect } from "vitest"
import {
  planOcrScope,
  extractScannedText,
  SHORT_SCAN_PAGE_LIMIT,
  OCR_MAX_EDGE_HQ,
  OCR_MAX_EDGE_LOCATE,
  type PdfPageRenderer,
  type Preprocessor,
  type OcrFn,
} from "@/lib/services/ingestion/scan-extraction"
import type { TriageResult } from "@/lib/services/ingestion/triage"

function scannedTriage(pageCount: number): TriageResult {
  return {
    source: "scanned",
    pageCount,
    totalChars: 0,
    avgCharsPerPage: 0,
    textLayerPageRatio: 0,
    pages: [],
  }
}

// Mock adapters that thread the page number + downscale edge through to the OCR
// call so a test can assert which pages were OCR'd at which resolution.
function makeDeps(pageTexts: Record<number, string>) {
  const ocrCalls: Array<{ page: number; edge: number }> = []
  const renderer: PdfPageRenderer = {
    render: async (n) => Buffer.from(`P${n}`),
    destroy: async () => {},
  }
  const preprocess: Preprocessor = async (img, edge) =>
    Buffer.from(`${img.toString()}|${edge}`)
  const ocr: OcrFn = async (img) => {
    const [tag, edge] = img.toString().split("|")
    const page = Number(tag.replace("P", ""))
    ocrCalls.push({ page, edge: Number(edge) })
    return pageTexts[page] ?? "γενικοι οροι"
  }
  return { deps: { renderer, preprocess, ocr }, ocrCalls }
}

describe("planOcrScope", () => {
  it("OCRs all pages for a short scan", () => {
    const plan = planOcrScope(4)
    expect(plan.mode).toBe("ocr-all")
    expect(plan.pages).toEqual([1, 2, 3, 4])
  })

  it(`stays ocr-all up to the limit (${SHORT_SCAN_PAGE_LIMIT})`, () => {
    expect(planOcrScope(SHORT_SCAN_PAGE_LIMIT).mode).toBe("ocr-all")
    expect(planOcrScope(SHORT_SCAN_PAGE_LIMIT + 1).mode).toBe("locate-then-target")
  })

  it("handles a zero-page document without error", () => {
    expect(planOcrScope(0)).toEqual({ mode: "ocr-all", pages: [] })
  })
})

describe("extractScannedText — ocr-all (short scan)", () => {
  it("OCRs every page at HQ and locates the coverage table", async () => {
    const { deps, ocrCalls } = makeDeps({ 2: "ΠΙΝΑΚΑΣ ΚΑΛΥΨΕΩΝ Πυρκαγιά 50.000" })
    const r = await extractScannedText(scannedTriage(4), deps)

    expect(r.source).toBe("scanned")
    expect(r.coverageTablePages).toEqual([2])
    expect(r.coverageText).toContain("Πυρκαγιά 50.000")
    // every page OCR'd exactly once, at HQ resolution
    expect(ocrCalls).toHaveLength(4)
    expect(ocrCalls.every((c) => c.edge === OCR_MAX_EDGE_HQ)).toBe(true)
  })
})

describe("extractScannedText — locate-then-target (long scan)", () => {
  it("does a cheap locate pass over all pages, then HQ-OCRs ONLY the coverage page", async () => {
    const { deps, ocrCalls } = makeDeps({ 5: "Πίνακας Καλύψεων ..." })
    const r = await extractScannedText(scannedTriage(10), deps)

    expect(r.coverageTablePages).toEqual([5])

    // Every page got a cheap locate-resolution OCR...
    for (let p = 1; p <= 10; p++) {
      expect(ocrCalls).toContainEqual({ page: p, edge: OCR_MAX_EDGE_LOCATE })
    }
    // ...but ONLY page 5 was re-OCR'd at HQ (guardrail: no HQ OCR off the table).
    const hq = ocrCalls.filter((c) => c.edge === OCR_MAX_EDGE_HQ)
    expect(hq).toEqual([{ page: 5, edge: OCR_MAX_EDGE_HQ }])
  })

  it("falls back to page 1 at HQ when no anchor is found", async () => {
    const { deps, ocrCalls } = makeDeps({}) // no page has an anchor
    const r = await extractScannedText(scannedTriage(12), deps)

    expect(r.coverageTablePages).toEqual([1])
    const hq = ocrCalls.filter((c) => c.edge === OCR_MAX_EDGE_HQ)
    expect(hq).toEqual([{ page: 1, edge: OCR_MAX_EDGE_HQ }])
  })
})

describe("extractScannedText — guards", () => {
  it("refuses a text-layer document (that path belongs to Phase 2)", async () => {
    const { deps } = makeDeps({})
    const textLayer: TriageResult = { ...scannedTriage(3), source: "text-layer" }
    await expect(extractScannedText(textLayer, deps)).rejects.toThrow(/scanned/)
  })
})

describe("extractScannedText — cost guardrail: downscale BEFORE OCR", () => {
  it("preprocesses (downscales) each page immediately before OCRing it", async () => {
    const order: string[] = []
    const deps = {
      renderer: { render: async (n: number) => Buffer.from(`P${n}`), destroy: async () => {} },
      preprocess: async (img: Buffer, edge: number) => {
        order.push(`preprocess:${edge}`)
        return img
      },
      ocr: async () => {
        order.push("ocr")
        return "γενικοι οροι"
      },
    }

    await extractScannedText(scannedTriage(2), deps)

    // Two pages OCR'd, and every OCR is immediately preceded by a downscale step.
    expect(order.filter((o) => o === "ocr")).toHaveLength(2)
    order.forEach((entry, i) => {
      if (entry === "ocr") expect(order[i - 1]).toMatch(/^preprocess:\d+$/)
    })
    // ...never OCR on a non-downscaled (raw) image.
    expect(order.every((o) => o === "ocr" || /^preprocess:\d+$/.test(o))).toBe(true)
  })
})
