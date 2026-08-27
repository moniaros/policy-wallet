import React from "react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

/**
 * AddDocumentCard — the two entry points for attaching a document to a policy
 * the customer already holds, inside <section id="documents">.
 *
 * What this suite pins, and why each matters:
 *
 *  1. The renewal entry point exists ONLY when the server-resolved lifecycle
 *     status says the policy is expired / expiring soon. The status is a PROP
 *     from resolvePolicyLifecycle — the component must never re-derive a day
 *     count client-side (the Athens-midnight rule in CLAUDE.md).
 *
 *  2. The booklet path claims NO analysis. Nothing analyses a document
 *     attached through the REST route, so the copy says "stored for
 *     reference" — never "we're analysing it". The truthful copy is asserted
 *     verbatim, and the success path must be the STORED message, not the
 *     renewal path's "analysis is running again".
 *
 *  3. A rejected file surfaces the SHARED localised rejection copy
 *     (t.uploadRejection via uploadRejectionMessage), whether the rejection
 *     happens at the client pre-flight or comes back from the server with a
 *     machine-readable reason.
 *
 *  4. Each entry point calls its own server path: booklet → POST
 *     /api/v1/policies/[id]/documents (no analysis), renewal →
 *     addRenewalDocument server action (re-runs analysis).
 */

// The renewal arm calls the server action via dynamic import; its real module
// pulls auth/db at import time, which jsdom must never do.
vi.mock("@/app/(protected)/wallet/actions", () => ({
    addRenewalDocument: vi.fn(),
}))

// Override the global setup's router mock: this component calls
// router.refresh() after a successful upload so DocumentsCard re-reads.
vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }),
    useSearchParams: () => ({ get: vi.fn() }),
    usePathname: () => "",
}))

import { addRenewalDocument } from "@/app/(protected)/wallet/actions"
import { AddDocumentCard } from "@/components/wallet/policy-detail/AddDocumentCard"
import { getTranslations } from "@/lib/i18n"
import { MAX_UPLOAD_SIZE_BYTES } from "@/lib/security/file-upload"
import { uploadRejectionMessage } from "@/lib/i18n/upload-errors"

const t = getTranslations("el")
const dc = t.wallet.policyDetailsPage

const copy = {
    title: dc.addDocumentTitle,
    note: dc.addDocumentNote,
    kindLabel: dc.addDocumentKindLabel,
    kindLabels: t.wallet.documentKindLabels,
    dropTitle: dc.addDocumentDropTitle,
    dropHint: dc.addDocumentDropHint,
    uploading: dc.addDocumentUploading,
    stored: dc.addDocumentStored,
    failed: dc.addDocumentFailed,
    limitReached: dc.addDocumentLimitReached,
    renewalTitle: dc.renewalUploadTitle,
    renewalNote: dc.renewalUploadNote,
    renewalDropTitle: dc.renewalUploadDropTitle,
    renewalUploading: dc.renewalUploading,
    renewalUploaded: dc.renewalUploaded,
    renewalFailed: dc.renewalUploadFailed,
}

function renderCard(lifecycleStatus: string | null) {
    return render(
        <AddDocumentCard policyId="pol-1" lifecycleStatus={lifecycleStatus} t={t} copy={copy} />
    )
}

function pdfFile(size = 256): File {
    const bytes = new Uint8Array(size)
    bytes.set([0x25, 0x50, 0x44, 0x46], 0) // %PDF
    return new File([bytes], "upload.pdf", { type: "application/pdf" })
}

/** A File whose reported size exceeds the ceiling without allocating 15 MB. */
function oversizedFile(): File {
    const file = pdfFile()
    Object.defineProperty(file, "size", { value: MAX_UPLOAD_SIZE_BYTES + 1 })
    return file
}

const fetchMock = vi.fn()

beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
    vi.unstubAllGlobals()
})

describe("AddDocumentCard — the renewal entry point follows the SERVER's lifecycle status", () => {
    it("is absent on an active policy", () => {
        renderCard("active")
        // The always-available booklet entry is there…
        expect(screen.getByText(copy.title)).toBeTruthy()
        expect(screen.getByTestId("add-document-input")).toBeTruthy()
        // …the renewal one is not.
        expect(screen.queryByText(copy.renewalTitle)).toBeNull()
        expect(screen.queryByTestId("add-renewal-input")).toBeNull()
    })

    it("is absent when the server could not resolve a lifecycle at all", () => {
        renderCard(null)
        expect(screen.queryByText(copy.renewalTitle)).toBeNull()
    })

    for (const status of ["expired", "expiring_soon"] as const) {
        it(`is present on a policy the server resolved as ${status}`, () => {
            renderCard(status)
            expect(screen.getByText(copy.renewalTitle)).toBeTruthy()
            expect(screen.getByTestId("add-renewal-input")).toBeTruthy()
        })
    }
})

describe("AddDocumentCard — the booklet path claims no analysis", () => {
    it("states up front that the document is stored for reference, not analysed", () => {
        renderCard("active")
        expect(screen.getByText(copy.note)).toBeTruthy()
    })

    it("a successful upload reports STORED — and posts to the REST route, which runs no analysis", async () => {
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ({ data: { id: "doc-1" } }),
        })
        renderCard("active")

        fireEvent.change(screen.getByTestId("add-document-input"), {
            target: { files: [pdfFile()] },
        })

        // The success message is the truthful one: stored, NOT analysed.
        await screen.findByText(copy.stored)
        // Never the renewal path's "analysis is running again".
        expect(screen.queryByText(copy.renewalUploaded)).toBeNull()

        expect(fetchMock).toHaveBeenCalledTimes(1)
        const [url, init] = fetchMock.mock.calls[0]
        expect(url).toBe("/api/v1/policies/pol-1/documents")
        expect(init.method).toBe("POST")
        // The chosen kind travels with the file; 'other' is the default.
        expect((init.body as FormData).get("documentKind")).toBe("other")
        // The booklet path never touches the analysis-running server action.
        expect(addRenewalDocument).not.toHaveBeenCalled()
    })

    it("sends the kind the customer picked", async () => {
        fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: { id: "doc-1" } }) })
        renderCard("active")

        fireEvent.change(screen.getByLabelText(copy.kindLabel), { target: { value: "invoice" } })
        fireEvent.change(screen.getByTestId("add-document-input"), {
            target: { files: [pdfFile()] },
        })

        await screen.findByText(copy.stored)
        expect((fetchMock.mock.calls[0][1].body as FormData).get("documentKind")).toBe("invoice")
    })
})

describe("AddDocumentCard — a rejected file surfaces the shared rejection copy", () => {
    it("an oversized file is refused at the pre-flight with the localised {maxMb} message", async () => {
        renderCard("active")

        fireEvent.change(screen.getByTestId("add-document-input"), {
            target: { files: [oversizedFile()] },
        })

        // The SHARED copy — t.uploadRejection.too_large with {maxMb} resolved —
        // not a hand-written string.
        await screen.findByText(uploadRejectionMessage(t, "too_large"))
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it("a server rejection localises off the machine-readable reason in error.details", async () => {
        fetchMock.mockResolvedValue({
            ok: false,
            json: async () => ({
                data: null,
                error: {
                    code: "BAD_REQUEST",
                    message: "File content does not match a supported format",
                    details: { reason: "content_mismatch" },
                    status: 400,
                },
            }),
        })
        renderCard("active")

        fireEvent.change(screen.getByTestId("add-document-input"), {
            target: { files: [pdfFile()] },
        })

        await screen.findByText(uploadRejectionMessage(t, "content_mismatch"))
    })

    it("the per-policy document cap gets its own localised message", async () => {
        fetchMock.mockResolvedValue({
            ok: false,
            json: async () => ({
                data: null,
                error: {
                    code: "BAD_REQUEST",
                    message: "Document limit reached for this policy",
                    details: { reason: "document_limit" },
                    status: 400,
                },
            }),
        })
        renderCard("active")

        fireEvent.change(screen.getByTestId("add-document-input"), {
            target: { files: [pdfFile()] },
        })

        await screen.findByText(copy.limitReached)
    })
})

describe("AddDocumentCard — the renewal path calls the server action that re-runs analysis", () => {
    it("hands the file to addRenewalDocument and reports the analysis re-run", async () => {
        vi.mocked(addRenewalDocument).mockResolvedValue({
            success: true,
            policyId: "pol-1",
            documentId: "doc-1",
        } as any)
        renderCard("expired")

        fireEvent.change(screen.getByTestId("add-renewal-input"), {
            target: { files: [pdfFile()] },
        })

        // This path DOES re-run analysis, so its copy is allowed to say so.
        await screen.findByText(copy.renewalUploaded)

        expect(addRenewalDocument).toHaveBeenCalledTimes(1)
        const [policyId, formData] = vi.mocked(addRenewalDocument).mock.calls[0]
        expect(policyId).toBe("pol-1")
        expect((formData as FormData).get("file")).toBeInstanceOf(File)
        // The renewal path never posts to the REST route.
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it("a failed renewal upload reports failure without claiming an analysis ran", async () => {
        vi.mocked(addRenewalDocument).mockResolvedValue({ error: "NOT_FOUND" } as any)
        renderCard("expired")

        fireEvent.change(screen.getByTestId("add-renewal-input"), {
            target: { files: [pdfFile()] },
        })

        await screen.findByText(copy.renewalFailed)
        expect(screen.queryByText(copy.renewalUploaded)).toBeNull()
    })

    it("pre-flights the renewal file size with the same shared copy", async () => {
        renderCard("expired")

        fireEvent.change(screen.getByTestId("add-renewal-input"), {
            target: { files: [oversizedFile()] },
        })

        await screen.findByText(uploadRejectionMessage(t, "too_large"))
        expect(addRenewalDocument).not.toHaveBeenCalled()
    })
})
