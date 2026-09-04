/**
 * The cheap model stage of the document gate — the ONLY model call the gate
 * may make, and only for the band the lexicon could not settle or for a scan
 * with no text to read.
 *
 * Bounded by construction:
 *   - text: the first MODEL_TEXT_CAP characters, no more;
 *   - a scan: the first SCAN_EXCERPT_PAGES pages copied into a new PDF with
 *     pdf-lib (the whole file only when it has ≤ SCAN_WHOLE_FILE_MAX_PAGES
 *     pages), refused above SCAN_EXCERPT_MAX_BYTES — a fifteen-megabyte scan
 *     never travels;
 *   - a photo: the image itself, under the same byte cap.
 *
 * Consent is the gate's job and is read immediately before this is called
 * (document-gate.ts consultModel). Provider selection, model, metering and the
 * untrusted-content framing live in lib/services/ai/document-classification.ts.
 */

import { PDFDocument } from "pdf-lib"
import type { AIClassificationInput } from "@/lib/services/ai/ai-service.interface"
import type { BranchFamily, DocumentType } from "./types"

/** What the gate hands the model: an excerpt, never the whole document. */
export type ModelClassificationInput =
    | {
          kind: "text"
          /** Normalised text of the first pages; capped here at MODEL_TEXT_CAP characters. */
          text: string
          declaredBranch: BranchFamily | null
          actorUserId: string
      }
    | {
          kind: "document"
          /** The validated bytes; the excerpt is cut here. */
          bytes: Uint8Array
          mimeType: string
          declaredBranch: BranchFamily | null
          actorUserId: string
      }

export interface ModelClassification {
    documentType: DocumentType
    isInsuranceDocument: boolean
    /** 0..1 */
    insuranceConfidence: number
    detectedBranch: BranchFamily | null
    /** 0..1 */
    branchConfidence: number
    /** False when the model could not read the excerpt at all. */
    readable: boolean
    /** Short phrases from the excerpt that justify the verdict. */
    signals: string[]
    tokens?: number
}

export type ModelClassificationOutcome =
    | ({ available: true } & ModelClassification)
    | { available: false; reason: "not_configured" | "error" | "timeout" | "excerpt_unavailable" }

export type ModelClassifier = (input: ModelClassificationInput) => Promise<ModelClassificationOutcome>

/** Characters of normalised text the model is shown. */
export const MODEL_TEXT_CAP = 6_000
/** Pages of a scan the model is shown. */
export const SCAN_EXCERPT_PAGES = 2
/** A scan this short travels whole (cheaper than re-encoding it). */
export const SCAN_WHOLE_FILE_MAX_PAGES = 3
/** Above this the excerpt is not sent; the gate holds the document for the person instead. */
export const SCAN_EXCERPT_MAX_BYTES = 4 * 1024 * 1024

/**
 * The first pages of a scanned PDF as a new PDF, or a photo as itself. Null
 * when an excerpt cannot be built within the byte cap — the caller maps that
 * to a hold, never to a pass.
 */
export async function buildScanExcerpt(
    bytes: Uint8Array,
    mimeType: string
): Promise<{ data: string; mimeType: string; pages: number } | null> {
    if (mimeType !== "application/pdf") {
        if (bytes.length > SCAN_EXCERPT_MAX_BYTES) return null
        return { data: Buffer.from(bytes).toString("base64"), mimeType, pages: 1 }
    }
    try {
        const source = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false })
        const pageCount = source.getPageCount()
        if (pageCount <= SCAN_WHOLE_FILE_MAX_PAGES) {
            if (bytes.length > SCAN_EXCERPT_MAX_BYTES) return null
            return { data: Buffer.from(bytes).toString("base64"), mimeType, pages: pageCount }
        }
        const excerpt = await PDFDocument.create()
        const indices = Array.from({ length: Math.min(SCAN_EXCERPT_PAGES, pageCount) }, (_, i) => i)
        const pages = await excerpt.copyPages(source, indices)
        for (const page of pages) excerpt.addPage(page)
        const out = await excerpt.save({ useObjectStreams: true })
        if (out.length > SCAN_EXCERPT_MAX_BYTES) return null
        return { data: Buffer.from(out).toString("base64"), mimeType: "application/pdf", pages: indices.length }
    } catch {
        return null
    }
}

export const classifyWithModel: ModelClassifier = async (input) => {
    // Lazy: the AI factory validates env at import, and the gate must stay
    // importable (and its deterministic stages testable) without a provider.
    const { getAIService } = await import("@/lib/services/ai")
    const service = getAIService()
    if (!service.isAvailable()) return { available: false, reason: "not_configured" }

    let aiInput: AIClassificationInput
    if (input.kind === "text") {
        aiInput = { kind: "text", text: input.text.slice(0, MODEL_TEXT_CAP), declaredBranch: input.declaredBranch }
    } else {
        const excerpt = await buildScanExcerpt(input.bytes, input.mimeType)
        if (!excerpt) return { available: false, reason: "excerpt_unavailable" }
        aiInput = { kind: "document", data: excerpt.data, mimeType: excerpt.mimeType, declaredBranch: input.declaredBranch }
    }

    try {
        const result = await service.classifyDocument(aiInput, { userId: input.actorUserId })
        return {
            available: true,
            documentType: result.documentType,
            isInsuranceDocument: result.isInsuranceDocument,
            insuranceConfidence: result.insuranceConfidence,
            detectedBranch: result.detectedBranch,
            branchConfidence: result.branchConfidence,
            readable: result.readable,
            signals: result.signals,
            tokens: result.usage ? (result.usage.inputTokens ?? 0) + (result.usage.outputTokens ?? 0) : undefined,
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { available: false, reason: /timeout|timed out|abort/i.test(message) ? "timeout" : "error" }
    }
}
