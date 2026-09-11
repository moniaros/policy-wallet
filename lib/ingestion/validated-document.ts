/**
 * The ONLY way to build the argument `extractPolicyData` accepts.
 *
 * `AIDocument` is a plain `{ data, mimeType }`. Anything with bytes could be
 * wrapped in one, and until Sept 2026 three call sites did exactly that with
 * whatever had been uploaded. `ValidatedAIDocument` is the same shape carrying
 * a brand only this module can mint, and the constructor mints it only for a
 * gate verdict of `validated`. The extraction signature takes the branded
 * type, so handing a model a document the gate did not pass is a type error —
 * and tests/unit/document-gate-before-model.test.ts fails on a cast that
 * forges the brand outside this directory.
 *
 * Deliberately NOT a runtime check inside the providers: a runtime check is
 * satisfied by a fake stamp literal, and the provider cannot know whether the
 * stamp is honest. The constructor can, because it is handed the verdict.
 */

import type { AIDocument } from "@/lib/services/ai/ai-service.interface"
import type { DocumentValidationResult, LocalDocumentText } from "./types"

declare const VALIDATED: unique symbol

/**
 * An AIDocument the document gate has passed. Structurally an AIDocument;
 * nominally more. `localText` is the probe's per-page read of the same bytes
 * (W0-02): present for a text PDF, absent for a scan or a photo. Providers
 * build their request from `data` and `mimeType` by name — a provider that
 * spread the whole object would ship it, and the source guard forbids that.
 */
export type ValidatedAIDocument = AIDocument & {
    readonly [VALIDATED]: true
    readonly localText?: LocalDocumentText
}

export class DocumentNotValidatedError extends Error {
    readonly code = "DOCUMENT_NOT_VALIDATED" as const
    readonly status: DocumentValidationResult["status"]
    readonly rejectionCode: string | null
    constructor(verdict: Pick<DocumentValidationResult, "status" | "code">) {
        super(`Document did not pass the validation gate: ${verdict.status}${verdict.code ? ` (${verdict.code})` : ""}`)
        this.name = "DocumentNotValidatedError"
        this.status = verdict.status
        this.rejectionCode = verdict.code ?? null
    }
}

/**
 * Build the model input from bytes the gate has validated.
 *
 * @throws DocumentNotValidatedError for any verdict other than `validated` —
 *   including `requires_review`, which only a resubmission with the person's
 *   confirmation (re-run through the gate) can turn into `validated`.
 */
export function toValidatedAIDocument(
    verdict: Pick<DocumentValidationResult, "status" | "code">,
    bytes: Buffer | Uint8Array,
    mimeType: string,
    localText: LocalDocumentText | null = null
): ValidatedAIDocument {
    if (verdict.status !== "validated") throw new DocumentNotValidatedError(verdict)
    const document: AIDocument & { localText?: LocalDocumentText } = {
        data: Buffer.from(bytes).toString("base64"),
        mimeType,
        ...(localText ? { localText } : {}),
    }
    return document as ValidatedAIDocument
}
