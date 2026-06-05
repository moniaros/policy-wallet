/**
 * Phase 3 — Scan Path (OCR)
 *
 * For scanned/image PDFs only. Renders pages, downscales + grayscales them with
 * sharp (~1500-2000px longest edge) BEFORE OCR, and OCRs with tesseract.js (Greek).
 *
 * Hybrid scoping (the cost guardrail "NEVER OCR pages outside the coverage table
 * once it is locatable"):
 *   - Short scans (<= SHORT_SCAN_PAGE_LIMIT pages): OCR every page at high quality.
 *   - Longer scans: a cheap low-res OCR pass over all pages locates the coverage
 *     table (a scan has no text layer to anchor on otherwise), then ONLY those
 *     pages are re-OCR'd at high quality. Non-coverage pages keep their cheap text
 *     and are never re-OCR'd.
 *
 * Emits the same RawTextExtraction shape as the local text path (Phase 2), so Phase
 * 4 parses one input type. Orchestration is pure over injected adapters and unit-
 * tested with mocks; the sharp/pdfjs/tesseract adapters are validated end-to-end
 * against real scans.
 */

import os from "os"
import sharp from "sharp"
import { createCanvas } from "@napi-rs/canvas"
import { createWorker, type Worker } from "tesseract.js"
import type { TriageResult, PageText } from "./triage"
import { locateCoverageTablePages, type RawTextExtraction } from "./text-extraction"

// ── Tuning ───────────────────────────────────────────────────────────────────
export const SHORT_SCAN_PAGE_LIMIT = 8
export const OCR_MAX_EDGE_HQ = 1800 // ~1500-2000px longest edge (prompt)
export const OCR_MAX_EDGE_LOCATE = 1000 // cheap locate pass
export const RENDER_SCALE = 2.0 // pdfjs render scale before sharp downscaling
// Greek only. The combined "ell+eng" string triggers a flaky language-load
// corruption in this tesseract.js build; the Greek model reads Latin digits and
// policy numbers adequately. Revisit a properly-configured multi-lang worker if
// mixed-script accuracy proves insufficient.
export const OCR_LANGS = "ell"

// ── Pure scope planning (unit-tested) ────────────────────────────────────────
export type OcrMode = "ocr-all" | "locate-then-target"
export interface OcrScopePlan {
  mode: OcrMode
  /** 1-based page numbers in scope (all pages either way; mode drives HQ targeting). */
  pages: number[]
}

export function planOcrScope(pageCount: number): OcrScopePlan {
  const pages = Array.from({ length: Math.max(0, pageCount) }, (_, i) => i + 1)
  return pageCount <= SHORT_SCAN_PAGE_LIMIT
    ? { mode: "ocr-all", pages }
    : { mode: "locate-then-target", pages }
}

function cleanOcrText(raw: string): string {
  return raw.replace(/\s+/g, " ").trim()
}

// ── Injectable adapters (real impls below; mocked in tests) ───────────────────
export interface PdfPageRenderer {
  /** Render a 1-based page to a raster PNG buffer. */
  render(pageNumber: number): Promise<Buffer>
  destroy(): Promise<void>
}
/** Downscale (longest edge -> maxEdge) + grayscale before OCR. */
export type Preprocessor = (image: Buffer, maxEdge: number) => Promise<Buffer>
/** OCR a preprocessed image to text. */
export type OcrFn = (image: Buffer) => Promise<string>

export interface ScanExtractionDeps {
  renderer: PdfPageRenderer
  preprocess: Preprocessor
  ocr: OcrFn
}

/**
 * Pure-ish orchestration over injected adapters. Decides the hybrid scope, OCRs
 * accordingly, locates the coverage table, and assembles a RawTextExtraction.
 */
export async function extractScannedText(
  triage: TriageResult,
  deps: ScanExtractionDeps,
): Promise<RawTextExtraction> {
  if (triage.source !== "scanned") {
    throw new Error(
      `extractScannedText requires a scanned document; got source='${triage.source}'. Route text-layer PDFs to the local path (Phase 2).`,
    )
  }

  const pageCount = triage.pageCount
  const plan = planOcrScope(pageCount)

  const ocrPage = async (pageNumber: number, maxEdge: number): Promise<PageText> => {
    const image = await deps.preprocess(await deps.renderer.render(pageNumber), maxEdge)
    const text = cleanOcrText(await deps.ocr(image))
    return { pageNumber, text, charCount: text.length }
  }

  let pages: PageText[]
  let coverageTablePages: number[]

  if (plan.mode === "ocr-all") {
    pages = []
    for (const n of plan.pages) pages.push(await ocrPage(n, OCR_MAX_EDGE_HQ))
    coverageTablePages = locateCoverageTablePages(pages)
  } else {
    // 1) Cheap low-res pass over all pages — the minimum needed to make the
    //    coverage table locatable on a text-layer-less scan.
    const rough: PageText[] = []
    for (const n of plan.pages) rough.push(await ocrPage(n, OCR_MAX_EDGE_LOCATE))
    coverageTablePages = locateCoverageTablePages(rough)

    // 2) High-quality OCR ONLY on located pages (fallback: page 1 if none found).
    const targets = new Set(coverageTablePages.length > 0 ? coverageTablePages : [1])
    pages = []
    for (const r of rough) {
      pages.push(targets.has(r.pageNumber) ? await ocrPage(r.pageNumber, OCR_MAX_EDGE_HQ) : r)
    }
    if (coverageTablePages.length === 0) coverageTablePages = [...targets]
  }

  const fullText = pages
    .map((p) => p.text)
    .join("\n\n")
    .trim()
  const coveragePages =
    coverageTablePages.length > 0
      ? pages.filter((p) => coverageTablePages.includes(p.pageNumber))
      : pages
  const coverageText = coveragePages
    .map((p) => p.text)
    .join("\n\n")
    .trim()

  return { source: "scanned", pageCount, fullText, coverageTablePages, coverageText, pages }
}

// ── Real adapters ─────────────────────────────────────────────────────────────

// Minimal CanvasFactory pdfjs needs in Node, backed by @napi-rs/canvas.
class NodeCanvasFactory {
  create(width: number, height: number) {
    const canvas = createCanvas(Math.ceil(width), Math.ceil(height))
    return { canvas, context: canvas.getContext("2d") }
  }
  reset(
    canvasAndContext: { canvas: { width: number; height: number } },
    width: number,
    height: number,
  ): void {
    canvasAndContext.canvas.width = Math.ceil(width)
    canvasAndContext.canvas.height = Math.ceil(height)
  }
  destroy(canvasAndContext: { canvas: { width: number; height: number } }): void {
    canvasAndContext.canvas.width = 0
    canvasAndContext.canvas.height = 0
  }
}

/** pdfjs + @napi-rs/canvas page renderer. Caller must destroy() it. */
export async function createPdfPageRenderer(pdfBuffer: Buffer): Promise<PdfPageRenderer> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
  const canvasFactory = new NodeCanvasFactory()
  // pdfjs's public types omit `canvasFactory`, but it is a valid runtime param that
  // lets pdfjs allocate canvases via @napi-rs/canvas in Node (proven against real
  // scans). Cast through unknown to pass it without tripping excess-property checks.
  // NB: do NOT set isEvalSupported:false here. With eval disabled pdfjs renders
  // glyphs via Path2D, which @napi-rs/canvas rejects (paintChar throws "Value is
  // none of these types String, Path"). Eval-compiled glyph drawing is required for
  // native-canvas rendering; this is server-side rendering of our own uploads.
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer),
    canvasFactory,
  } as unknown as Parameters<typeof pdfjs.getDocument>[0])
  const doc = await loadingTask.promise

  return {
    async render(pageNumber: number): Promise<Buffer> {
      const page = await doc.getPage(pageNumber)
      try {
        const viewport = page.getViewport({ scale: RENDER_SCALE })
        const { canvas, context } = canvasFactory.create(viewport.width, viewport.height)
        await page.render({
          canvasContext: context,
          viewport,
          canvasFactory,
        } as unknown as Parameters<typeof page.render>[0]).promise
        return canvas.toBuffer("image/png")
      } finally {
        page.cleanup()
      }
    },
    async destroy(): Promise<void> {
      await doc.cleanup()
      await loadingTask.destroy()
    },
  }
}

/** sharp downscale (longest edge -> maxEdge) + grayscale + contrast normalize. */
export const sharpPreprocess: Preprocessor = (image, maxEdge) =>
  sharp(image)
    .grayscale()
    .resize({ width: maxEdge, height: maxEdge, fit: "inside", withoutEnlargement: true })
    .normalize()
    .png()
    .toBuffer()

/** tesseract.js OCR worker (Greek + English). Caller must terminate(). */
export async function createTesseractOcr(
  langs: string = OCR_LANGS,
): Promise<{ ocr: OcrFn; terminate: () => Promise<void> }> {
  // Cache traineddata under the OS temp dir, not the process CWD (the tesseract.js
  // default) — CWD is read-only in many serverless runtimes and pollutes the repo.
  const worker: Worker = await createWorker(langs, undefined, {
    cachePath: os.tmpdir(),
  })
  return {
    ocr: async (image: Buffer) => {
      const { data } = await worker.recognize(image)
      return data.text
    },
    terminate: async (): Promise<void> => {
      await worker.terminate()
    },
  }
}

/**
 * Convenience: wire the real adapters, run the scan path, and clean up. This is the
 * function the pipeline calls; the OCR worker and renderer are always released.
 */
export async function extractScannedTextFromPdf(
  pdfBuffer: Buffer,
  triage: TriageResult,
): Promise<RawTextExtraction> {
  // Initialize sequentially, not via Promise.all: concurrent pdfjs + tesseract
  // worker startup collides ("Worker task was terminated" → render fails).
  // Nested try/finally so the renderer is released even if OCR init throws.
  const renderer = await createPdfPageRenderer(pdfBuffer)
  try {
    const tesseract = await createTesseractOcr()
    try {
      return await extractScannedText(triage, {
        renderer,
        preprocess: sharpPreprocess,
        ocr: tesseract.ocr,
      })
    } finally {
      await tesseract.terminate()
    }
  } finally {
    await renderer.destroy()
  }
}
