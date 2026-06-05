/**
 * Phase 1 — Triage Router
 *
 * Decides whether a PDF carries a real text layer (→ the $0 local path, Phase 2)
 * or is a scan/image (→ the OCR path, Phase 3), and returns the per-page text so a
 * text-layer PDF is parsed exactly once and reused downstream.
 *
 * Extraction here is FREE — pure local compute, no model/vision/external calls.
 * This is the gate that enforces the cost guardrail "NEVER send a text-layer PDF
 * to a vision model": only `source === 'scanned'` is ever allowed onto the OCR path.
 *
 * pdfjs-dist runs on the main thread (no worker) in the Node server runtime.
 */

import type { DocumentSource } from "./contracts"

export interface PageText {
  /** 1-based page number. */
  pageNumber: number
  text: string
  charCount: number
}

export interface TriageSummary {
  source: DocumentSource
  pageCount: number
  totalChars: number
  avgCharsPerPage: number
  /** Fraction of pages carrying a meaningful text layer (0..1). */
  textLayerPageRatio: number
}

export interface TriageResult extends TriageSummary {
  /** Per-page text. For a scanned doc these are near-empty; Phase 3 OCRs instead. */
  pages: PageText[]
}

// Heuristics: a real policy/coverage page carries hundreds of characters, whereas
// an un-OCR'd scan yields ~0. Thresholds are deliberately conservative so a mostly
// scanned doc that still exposes its coverage table as text takes the $0 path.
export const MIN_CHARS_PER_TEXT_PAGE = 100
export const MIN_TEXT_LAYER_PAGE_RATIO = 0.5
export const MIN_TOTAL_CHARS = 200

/**
 * Pure classification of per-page text into a triage decision. No I/O — unit-tested
 * directly, and the single source of truth for the text-layer-vs-scanned rule.
 */
export function classifyTriage(pages: PageText[]): TriageSummary {
  const pageCount = pages.length
  const totalChars = pages.reduce((sum, p) => sum + p.charCount, 0)
  const avgCharsPerPage = pageCount > 0 ? totalChars / pageCount : 0
  const textPages = pages.filter((p) => p.charCount >= MIN_CHARS_PER_TEXT_PAGE).length
  const textLayerPageRatio = pageCount > 0 ? textPages / pageCount : 0

  const isTextLayer =
    totalChars >= MIN_TOTAL_CHARS && textLayerPageRatio >= MIN_TEXT_LAYER_PAGE_RATIO

  return {
    source: isTextLayer ? "text-layer" : "scanned",
    pageCount,
    totalChars,
    avgCharsPerPage,
    textLayerPageRatio,
  }
}

/** Triage a PDF buffer: extract per-page text locally, then classify. */
export async function triagePdf(buffer: Buffer): Promise<TriageResult> {
  const pages = await extractPerPageText(buffer)
  return { ...classifyTriage(pages), pages }
}

async function extractPerPageText(buffer: Buffer): Promise<PageText[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
    useSystemFonts: false,
    // Text extraction is unaffected by fonts; disabling avoids noisy Node warnings.
    disableFontFace: true,
  })

  // Outer finally guarantees the loading task is destroyed even if `promise`
  // rejects on a corrupt/non-PDF upload — otherwise the pdfjs transport leaks.
  try {
    const doc = await loadingTask.promise
    try {
      const pages: PageText[] = []
      for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
        const page = await doc.getPage(pageNumber)
        try {
          const content = await page.getTextContent()
          const text = content.items
            .map((item) => ("str" in item ? item.str ?? "" : ""))
            .join(" ")
            .replace(/\s+/g, " ")
            .trim()
          pages.push({ pageNumber, text, charCount: text.length })
        } finally {
          page.cleanup()
        }
      }
      return pages
    } finally {
      await doc.cleanup()
    }
  } finally {
    await loadingTask.destroy()
  }
}
