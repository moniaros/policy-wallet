/**
 * Phase 2 — Local Text Path ($0)
 *
 * For text-layer PDFs, assemble the per-page text that triage already extracted
 * (Phase 1) into a path-agnostic RawTextExtraction and locate the Greek coverage
 * table (Πίνακας Καλύψεων). Entirely local — NO model/vision/external calls.
 *
 * RawTextExtraction is the shared hand-off shape: Phase 3's scan path produces the
 * same structure (source='scanned') so Phase 4 has a single input type to parse.
 */

import type { DocumentSource } from "./contracts"
import type { PageText, TriageResult } from "./triage"

export interface RawTextExtraction {
  source: DocumentSource
  pageCount: number
  /** All page text, joined. */
  fullText: string
  /** 1-based pages whose text matches a coverage-table anchor (empty if none found). */
  coverageTablePages: number[]
  /** Text of the located coverage pages; falls back to fullText when none are found. */
  coverageText: string
  /** Per-page text (present for the text path; the scan path fills it post-OCR). */
  pages: PageText[]
}

// Greek anchors that mark the coverage table / sums-insured section. Matched after
// normalization (accent- and case-insensitive, final-sigma-folded), so they are
// written here in natural orthography.
export const COVERAGE_TABLE_ANCHORS: readonly string[] = [
  "πίνακας καλύψεων",
  "παρεχόμενες καλύψεις",
  "ασφαλιστικές καλύψεις",
  "ασφαλιζόμενες καλύψεις",
  "καλύψεις συμβολαίου",
  "ασφαλιζόμενα κεφάλαια",
  "ασφαλιζόμενο κεφάλαιο",
  "όρια ευθύνης",
  "όρια κάλυψης",
]

/**
 * Fold Greek text for anchor matching: lower-case, strip diacritics (tonos /
 * dialytika), and unify final sigma (ς → σ) so 'ΚΑΛΥΨΕΙΣ', 'Καλύψεις' and
 * 'καλυψεισ' all compare equal.
 */
// Built from char codes so this source stays pure-ASCII (no literal combining
// marks): U+0300-U+036F = combining diacritics; U+03C2 = final sigma, U+03C3 = sigma.
const COMBINING_DIACRITICS = new RegExp(
  "[" + String.fromCharCode(0x0300) + "-" + String.fromCharCode(0x036f) + "]",
  "g",
)
const FINAL_SIGMA = new RegExp(String.fromCharCode(0x03c2), "g")
const SIGMA = String.fromCharCode(0x03c3)

export function normalizeGreekForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "") // strip combining diacritics (tonos, dialytika)
    .replace(FINAL_SIGMA, SIGMA) // unify final sigma
    .replace(/\s+/g, " ")
    .trim()
}

const NORMALIZED_ANCHORS: readonly string[] = COVERAGE_TABLE_ANCHORS.map(
  normalizeGreekForMatch,
)

/** 1-based page numbers whose text contains a coverage-table anchor. Pure. */
export function locateCoverageTablePages(pages: PageText[]): number[] {
  const hits: number[] = []
  for (const p of pages) {
    const hay = normalizeGreekForMatch(p.text)
    if (NORMALIZED_ANCHORS.some((anchor) => hay.includes(anchor))) {
      hits.push(p.pageNumber)
    }
  }
  return hits
}

/**
 * Build the local ($0) raw extraction for a text-layer document. Throws if handed
 * a scanned document — that path belongs to Phase 3, and silently text-extracting
 * a scan would yield empty fields.
 */
export function extractLocalText(triage: TriageResult): RawTextExtraction {
  if (triage.source !== "text-layer") {
    throw new Error(
      `extractLocalText requires a text-layer document; got source='${triage.source}'. Route scans to the OCR path (Phase 3).`,
    )
  }

  const { pages, pageCount } = triage
  const fullText = pages
    .map((p) => p.text)
    .join("\n\n")
    .trim()

  const coverageTablePages = locateCoverageTablePages(pages)
  // Fall back to the whole document when no anchor is located, so a coverage table
  // with unrecognized headers is never dropped — Phase 4 can still parse from it.
  const coveragePages =
    coverageTablePages.length > 0
      ? pages.filter((p) => coverageTablePages.includes(p.pageNumber))
      : pages
  const coverageText = coveragePages
    .map((p) => p.text)
    .join("\n\n")
    .trim()

  return {
    source: "text-layer",
    pageCount,
    fullText,
    coverageTablePages,
    coverageText,
    pages,
  }
}
