import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"

import { storedDocumentLabel } from "@/lib/wallet/document-label"
import { isPdfFile, isAcceptedImageFile } from "@/lib/security/file-upload"

/**
 * The add-policy flow validates a document's extension. It must read that
 * extension off the SERVER-MINTED STORAGE KEY, never off the display label.
 *
 * These two changes were made in different sessions and were individually
 * correct:
 *   1. documents get a GENERATED label instead of the user's file name
 *   2. the extension is validated against that same `fileName` variable
 *
 * Together they broke the flow completely: a generated label has no extension,
 * so every document failed validation, every one was skipped, and the policy
 * committed with ZERO documents and status 'active' instead of 'analyzing'.
 * Nothing errored — the customer just got a policy that was never analysed.
 */
describe("the document extension check", () => {
    it("cannot be satisfied by a generated label (the label has no extension)", () => {
        const label = storedDocumentLabel({})
        expect(isPdfFile(label)).toBe(false)
        expect(isAcceptedImageFile(label)).toBe(false)

        const namedLabel = storedDocumentLabel({ lineOfBusiness: "motor", policyNumber: "64504715" })
        expect(isPdfFile(namedLabel)).toBe(false)
        expect(isAcceptedImageFile(namedLabel)).toBe(false)
    })

    it("accepts the storage keys the server actually mints", () => {
        expect(isPdfFile("ae1c5683-7466-4c09-934c-c541a7100fa6.pdf")).toBe(true)
        expect(isAcceptedImageFile("ae1c5683-7466-4c09-934c-c541a7100fa6.heic")).toBe(true)
        expect(isAcceptedImageFile("ae1c5683-7466-4c09-934c-c541a7100fa6.jpg")).toBe(true)
    })

    it("the add-policy action no longer judges a document by any name or key: it hands the bytes to the ingestion service", () => {
        // The browser→storage path is gone (Sept 2026). The file travels IN the
        // action and lib/ingestion/ingest-policy-document.ts validates its
        // CONTENT (magic bytes, then the document gate) before anything is
        // stored — so there is no extension check left here to get wrong.
        const src = readFileSync("app/(protected)/wallet/actions.ts", "utf-8")
        expect(src).toMatch(/ingestPolicyDocument\(/)
        expect(src).not.toMatch(/const hasValidExt = /)
        expect(src).not.toMatch(/documentUrls/)
        const ingest = readFileSync("lib/ingestion/ingest-policy-document.ts", "utf-8")
        expect(ingest).toMatch(/validateUploadFile\(input\.file/)
    })
})
