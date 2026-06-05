import { describe, it, expect } from "vitest"
import {
  normalizeGreekForMatch,
  locateCoverageTablePages,
  extractLocalText,
} from "@/lib/services/ingestion/text-extraction"
import type { PageText, TriageResult } from "@/lib/services/ingestion/triage"

function page(pageNumber: number, text: string): PageText {
  return { pageNumber, text, charCount: text.length }
}

function textLayerTriage(pages: PageText[]): TriageResult {
  return {
    source: "text-layer",
    pageCount: pages.length,
    totalChars: pages.reduce((s, p) => s + p.charCount, 0),
    avgCharsPerPage: 0,
    textLayerPageRatio: 1,
    pages,
  }
}

describe("normalizeGreekForMatch", () => {
  it("folds case, accents and final sigma so coverage headers compare equal", () => {
    // 'ΚΑΛΥΨΕΙΣ' (caps, final-Σ) and 'Καλύψεις' (accented, final-ς) must match.
    expect(normalizeGreekForMatch("ΚΑΛΥΨΕΙΣ")).toBe(
      normalizeGreekForMatch("Καλύψεις"),
    )
    expect(normalizeGreekForMatch("Πίνακας Καλύψεων")).toBe(
      normalizeGreekForMatch("ΠΙΝΑΚΑΣ ΚΑΛΥΨΕΩΝ"),
    )
  })

  it("collapses whitespace", () => {
    expect(normalizeGreekForMatch("  Πίνακας   Καλύψεων  ")).toBe(
      normalizeGreekForMatch("Πίνακας Καλύψεων"),
    )
  })
})

describe("locateCoverageTablePages", () => {
  it("finds the coverage-table page regardless of case/accents", () => {
    const pages = [
      page(1, "Ασφαλιστήριο Συμβόλαιο"),
      page(2, "ΠΙΝΑΚΑΣ ΚΑΛΥΨΕΩΝ\nΑστική Ευθύνη 1.300.000"),
      page(3, "Γενικοί Όροι"),
    ]
    expect(locateCoverageTablePages(pages)).toEqual([2])
  })

  it("matches alternative anchors (όρια ευθύνης / ασφαλιζόμενα κεφάλαια)", () => {
    const pages = [
      page(1, "Όρια Ευθύνης ανά συμβάν"),
      page(2, "no anchor here"),
      page(3, "ΑΣΦΑΛΙΖΟΜΕΝΑ ΚΕΦΑΛΑΙΑ"),
    ]
    expect(locateCoverageTablePages(pages)).toEqual([1, 3])
  })

  it("returns empty when no anchor is present", () => {
    expect(locateCoverageTablePages([page(1, "Γενικοί Όροι Ασφάλισης")])).toEqual([])
  })
})

describe("extractLocalText", () => {
  it("assembles full text and slices the located coverage pages", () => {
    const pages = [
      page(1, "Εξώφυλλο"),
      page(2, "Πίνακας Καλύψεων: Πυρκαγιά 50.000"),
      page(3, "Όροι"),
    ]
    const r = extractLocalText(textLayerTriage(pages))
    expect(r.source).toBe("text-layer")
    expect(r.pageCount).toBe(3)
    expect(r.coverageTablePages).toEqual([2])
    expect(r.coverageText).toContain("Πυρκαγιά 50.000")
    expect(r.coverageText).not.toContain("Εξώφυλλο")
    expect(r.fullText).toContain("Εξώφυλλο")
  })

  it("falls back to the full document when no coverage anchor is found", () => {
    const pages = [page(1, "Γενικοί Όροι"), page(2, "Συνέχεια όρων")]
    const r = extractLocalText(textLayerTriage(pages))
    expect(r.coverageTablePages).toEqual([])
    expect(r.coverageText).toBe(r.fullText)
  })

  it("refuses a scanned document (that path belongs to Phase 3)", () => {
    const scanned: TriageResult = {
      source: "scanned",
      pageCount: 1,
      totalChars: 0,
      avgCharsPerPage: 0,
      textLayerPageRatio: 0,
      pages: [page(1, "")],
    }
    expect(() => extractLocalText(scanned)).toThrow(/text-layer/)
  })
})
