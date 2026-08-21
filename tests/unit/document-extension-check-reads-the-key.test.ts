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

    it("is wired to the storage key in the add-policy action, not to fileName", () => {
        const src = readFileSync("app/(protected)/wallet/actions.ts", "utf-8")
        const call = /const hasValidExt = ([^\n]+)/.exec(src)
        expect(call, "the extension check moved or was renamed").not.toBeNull()
        expect(call![1]).toMatch(/storageKey/)
        expect(
            call![1],
            "validating fileName means validating a generated label, which never has an extension"
        ).not.toMatch(/\bfileName\b/)
    })
})
