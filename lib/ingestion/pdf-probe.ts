/**
 * The cheap, local look at a PDF that runs BEFORE anything is persisted or
 * sent to a model.
 *
 * Until Sept 2026 nothing in this codebase opened a PDF: the only reader was
 * the extraction model, so the first question anyone could answer about an
 * upload — "is there a policy in here?" — was answered AFTER the whole file
 * had been base64'd to a provider (~85k estimated tokens). This module reads
 * the page count, the first pages' text and whether there is any text at all,
 * in ~100 ms, with no bytes leaving the boundary.
 *
 * Order matters and is deliberate:
 *   1. `numPages` is read FIRST and an over-cap document is refused before any
 *      text is extracted. pdf.js has no cancellation, so a `Promise.race`
 *      budget alone would leave a hostile file parsing in the background.
 *   2. Only the first `samplePages` pages are read. A schedule states its
 *      identity, period, cover and premium on its first pages; page 90 of the
 *      terms booklet adds nothing the gate needs and everything an attacker
 *      would want it to spend time on.
 *
 * `unpdf` (pinned 0.12.x) bundles a serverless build of pdf.js with no DOM or
 * worker requirements; it is the only PDF reader in the codebase and the
 * version is pinned because 1.x requires Node 22 while .nvmrc is 20.20.2
 * (verified: text, page count and corrupt-file detection all work on 20.20.2).
 */

import { getDocumentProxy } from "unpdf"
import { normalizeDocumentText } from "./normalize-text"

/** Hard ceiling on pages. Real policies are tens of pages; 200 leaves headroom for bound terms. */
export const MAX_DOCUMENT_PAGES = 200
/** Pages whose text is read for classification. */
export const PROBE_SAMPLE_PAGES = 12
/** Wall-clock budget for the whole probe. */
export const PROBE_BUDGET_MS = 8_000
/**
 * Below this many characters across the sampled pages a PDF is treated as
 * image-only (a scan). A blank page yields 0; a scanned page with a stray OCR
 * layer or a header yields a handful; a text page yields hundreds.
 */
export const IMAGE_ONLY_TEXT_THRESHOLD = 40

export type PdfProbeFailure =
    /** pdf.js asked for a password: encrypted with a user password. */
    | "password_protected"
    /** pdf.js could not build a document from the bytes: corrupt or not a PDF. */
    | "unreadable"
    /** A well-formed PDF with zero pages. */
    | "no_pages"
    /** More pages than MAX_DOCUMENT_PAGES — refused before any text is read. */
    | "too_many_pages"
    /** The probe did not finish inside PROBE_BUDGET_MS. */
    | "budget_exceeded"

export type PdfProbeResult =
    | {
          ok: true
          pageCount: number
          /** How many pages were actually read (≤ PROBE_SAMPLE_PAGES). */
          sampledPages: number
          /** Normalised text of the sampled pages (normalize-text.ts). */
          text: string
          textChars: number
          /** No usable text layer in the sampled pages — a scan or a blank. */
          imageOnly: boolean
      }
    | { ok: false; failure: PdfProbeFailure; pageCount?: number }

export interface PdfProbeOptions {
    maxPages?: number
    samplePages?: number
    budgetMs?: number
}

function classifyOpenError(error: unknown): PdfProbeFailure {
    const name = (error as { name?: unknown } | null)?.name
    if (name === "PasswordException") return "password_protected"
    return "unreadable"
}

/**
 * Race a promise against the probe deadline. pdf.js keeps working after the
 * race is lost, which is why the page cap is enforced BEFORE any text read —
 * this only bounds how long the caller waits, not how long pdf.js runs.
 */
function withDeadline<T>(promise: Promise<T>, deadline: number): Promise<T> {
    const remaining = deadline - Date.now()
    if (remaining <= 0) return Promise.reject(new ProbeBudgetExceeded())
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new ProbeBudgetExceeded()), remaining)
        promise.then(
            (value) => {
                clearTimeout(timer)
                resolve(value)
            },
            (error) => {
                clearTimeout(timer)
                reject(error)
            }
        )
    })
}

class ProbeBudgetExceeded extends Error {
    constructor() {
        super("PDF probe budget exceeded")
        this.name = "ProbeBudgetExceeded"
    }
}

export async function probePdf(bytes: Uint8Array, opts: PdfProbeOptions = {}): Promise<PdfProbeResult> {
    const maxPages = opts.maxPages ?? MAX_DOCUMENT_PAGES
    const samplePages = opts.samplePages ?? PROBE_SAMPLE_PAGES
    const deadline = Date.now() + (opts.budgetMs ?? PROBE_BUDGET_MS)

    let pdf: Awaited<ReturnType<typeof getDocumentProxy>>
    try {
        // A copy: pdf.js takes ownership of the buffer it is handed and may
        // detach it, and the caller still needs the bytes for hashing/storage.
        pdf = await withDeadline(getDocumentProxy(new Uint8Array(bytes)), deadline)
    } catch (error) {
        if (error instanceof ProbeBudgetExceeded) return { ok: false, failure: "budget_exceeded" }
        return { ok: false, failure: classifyOpenError(error) }
    }

    try {
        const pageCount = pdf.numPages
        if (!Number.isFinite(pageCount) || pageCount <= 0) return { ok: false, failure: "no_pages", pageCount: 0 }
        if (pageCount > maxPages) return { ok: false, failure: "too_many_pages", pageCount }

        const sampledPages = Math.min(pageCount, samplePages)
        const parts: string[] = []
        for (let pageNumber = 1; pageNumber <= sampledPages; pageNumber++) {
            let pageText: string
            try {
                const page = await withDeadline(pdf.getPage(pageNumber), deadline)
                const content = await withDeadline(page.getTextContent(), deadline)
                pageText = content.items
                    .map((item) => ("str" in item ? String(item.str) : ""))
                    .join(" ")
            } catch (error) {
                if (error instanceof ProbeBudgetExceeded) return { ok: false, failure: "budget_exceeded", pageCount }
                // One broken page is not an unreadable document; the other
                // sampled pages still count as evidence.
                pageText = ""
            }
            parts.push(pageText)
        }

        const text = normalizeDocumentText(parts.join("\n"))
        const textChars = text.replace(/\s+/g, "").length
        return {
            ok: true,
            pageCount,
            sampledPages,
            text,
            textChars,
            imageOnly: textChars < IMAGE_ONLY_TEXT_THRESHOLD,
        }
    } finally {
        try {
            await pdf.destroy()
        } catch {
            /* nothing to release */
        }
    }
}
