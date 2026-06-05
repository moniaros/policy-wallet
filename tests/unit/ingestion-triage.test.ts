import { describe, it, expect } from "vitest"
import {
  classifyTriage,
  MIN_CHARS_PER_TEXT_PAGE,
  MIN_TOTAL_CHARS,
  type PageText,
} from "@/lib/services/ingestion/triage"

// Build a synthetic page with `chars` characters of text.
function page(pageNumber: number, chars: number): PageText {
  return { pageNumber, text: "x".repeat(chars), charCount: chars }
}

describe("classifyTriage", () => {
  it("treats an empty document as scanned (nothing to extract)", () => {
    const r = classifyTriage([])
    expect(r.source).toBe("scanned")
    expect(r.pageCount).toBe(0)
    expect(r.totalChars).toBe(0)
    expect(r.avgCharsPerPage).toBe(0)
    expect(r.textLayerPageRatio).toBe(0)
  })

  it("classifies a multi-page text PDF as text-layer", () => {
    const r = classifyTriage([page(1, 500), page(2, 500), page(3, 500)])
    expect(r.source).toBe("text-layer")
    expect(r.textLayerPageRatio).toBe(1)
    expect(r.totalChars).toBe(1500)
    expect(r.avgCharsPerPage).toBe(500)
  })

  it("classifies an image-only scan (no text layer) as scanned", () => {
    const r = classifyTriage([page(1, 0), page(2, 0), page(3, 0)])
    expect(r.source).toBe("scanned")
    expect(r.textLayerPageRatio).toBe(0)
  })

  it("takes the text path when the coverage table is text even amid blank/scanned pages (ratio >= 0.5)", () => {
    const r = classifyTriage([page(1, 500), page(2, 0)])
    expect(r.textLayerPageRatio).toBe(0.5)
    expect(r.source).toBe("text-layer")
  })

  it("stays scanned when ratio is below 0.5 (mostly image pages)", () => {
    const r = classifyTriage([page(1, 500), page(2, 0), page(3, 0)])
    expect(r.textLayerPageRatio).toBeCloseTo(1 / 3)
    expect(r.source).toBe("scanned")
  })

  it("guards a single short page below the total-chars floor as scanned", () => {
    // ratio would be 1, but total chars < MIN_TOTAL_CHARS → still scanned.
    const chars = MIN_TOTAL_CHARS - 50
    const r = classifyTriage([page(1, chars)])
    expect(r.textLayerPageRatio).toBe(1)
    expect(r.totalChars).toBeLessThan(MIN_TOTAL_CHARS)
    expect(r.source).toBe("scanned")
  })

  it("counts a page at exactly the per-page threshold as a text page", () => {
    // Two pages at exactly MIN_CHARS_PER_TEXT_PAGE → both text, total well over floor.
    const r = classifyTriage([
      page(1, MIN_CHARS_PER_TEXT_PAGE),
      page(2, MIN_CHARS_PER_TEXT_PAGE),
    ])
    expect(r.textLayerPageRatio).toBe(1)
    expect(r.source).toBe("text-layer")
  })

  it("does not count a page one char below the per-page threshold", () => {
    const r = classifyTriage([page(1, MIN_CHARS_PER_TEXT_PAGE - 1), page(2, 0)])
    expect(r.textLayerPageRatio).toBe(0)
    expect(r.source).toBe("scanned")
  })
})
