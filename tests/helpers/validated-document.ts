/**
 * Tests and evals that exercise a provider's extraction directly have no gate
 * verdict to hand `toValidatedAIDocument`. This cast exists ONLY here, under
 * tests/, so tests/unit/document-gate-before-model.test.ts can enumerate every
 * forged brand in app/ and lib/ and find none.
 */
import type { AIDocument } from "@/lib/services/ai/ai-service.interface"
import type { ValidatedAIDocument } from "@/lib/ingestion/validated-document"

export function asValidatedForTests(document: AIDocument): ValidatedAIDocument {
    return document as ValidatedAIDocument
}
