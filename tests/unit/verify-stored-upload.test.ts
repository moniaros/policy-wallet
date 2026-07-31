/**
 * WP-12 — bytes the browser uploaded must be validated before they become a
 * persisted policy document.
 *
 * The B2C path posts straight from the browser to the Supabase `policies`
 * bucket and hands createPolicy only a URL, so it bypassed all three controls
 * the server-side path enforces: the magic-byte/extension cross-check, the
 * malware-scan chokepoint, and the server-side size cap. `isOwnedStorageUrl`
 * proved only that the URL pointed at our bucket — never what was inside it.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const downloadPolicyDocument = vi.fn()
const scanUploadBuffer = vi.fn()

vi.mock("@/lib/supabase/storage-download", () => ({
    downloadPolicyDocument: (...a: unknown[]) => downloadPolicyDocument(...a),
}))
vi.mock("@/lib/security/malware-scan", () => ({
    scanUploadBuffer: (...a: unknown[]) => scanUploadBuffer(...a),
}))
vi.mock("@/lib/logger", () => ({ logger: vi.fn() }))

const PDF = Buffer.concat([Buffer.from("%PDF-1.7"), Buffer.alloc(2048, 0x20)])
/** A Windows executable renamed to .pdf — the case extension checks miss. */
const EXE = Buffer.concat([Buffer.from("MZ\x90\x00"), Buffer.alloc(2048, 0x00)])

beforeEach(() => {
    vi.clearAllMocks()
    scanUploadBuffer.mockResolvedValue({ verdict: "skipped" })
})

describe("verifyStoredUpload", () => {
    it("accepts a real PDF and reports its measured size", async () => {
        downloadPolicyDocument.mockResolvedValue(PDF)
        const { verifyStoredUpload } = await import("@/lib/security/verify-stored-upload")

        const result = await verifyStoredUpload("https://x/storage/policies/a.pdf", "policy.pdf")

        expect(result.ok).toBe(true)
        if (result.ok) expect(result.sizeBytes).toBe(PDF.byteLength)
    })

    it("rejects an executable renamed to .pdf", async () => {
        // The whole reason byte-level validation exists: the name says PDF.
        downloadPolicyDocument.mockResolvedValue(EXE)
        const { verifyStoredUpload } = await import("@/lib/security/verify-stored-upload")

        const result = await verifyStoredUpload("https://x/storage/policies/a.pdf", "policy.pdf")
        expect(result.ok).toBe(false)
    })

    it("rejects an object larger than the server-side cap", async () => {
        downloadPolicyDocument.mockResolvedValue(PDF)
        const { verifyStoredUpload } = await import("@/lib/security/verify-stored-upload")

        const result = await verifyStoredUpload("https://x/a.pdf", "policy.pdf", { maxBytes: 100 })

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.reason).toBe("too_large")
    })

    it("rejects an empty object", async () => {
        downloadPolicyDocument.mockResolvedValue(Buffer.alloc(0))
        const { verifyStoredUpload } = await import("@/lib/security/verify-stored-upload")

        const result = await verifyStoredUpload("https://x/a.pdf", "policy.pdf")
        expect(result.ok).toBe(false)
    })

    it("rejects when the malware scanner reports an infection", async () => {
        downloadPolicyDocument.mockResolvedValue(PDF)
        scanUploadBuffer.mockResolvedValue({ verdict: "infected" })
        const { verifyStoredUpload } = await import("@/lib/security/verify-stored-upload")

        const result = await verifyStoredUpload("https://x/a.pdf", "policy.pdf")

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.reason).toBe("infected")
    })

    it("fails CLOSED when the scanner is configured but errors", async () => {
        // A scanner outage must not become an open door.
        downloadPolicyDocument.mockResolvedValue(PDF)
        scanUploadBuffer.mockResolvedValue({ verdict: "error" })
        const { verifyStoredUpload } = await import("@/lib/security/verify-stored-upload")

        const result = await verifyStoredUpload("https://x/a.pdf", "policy.pdf")
        expect(result.ok).toBe(false)
    })

    it("fails CLOSED when the object cannot be read back", async () => {
        downloadPolicyDocument.mockRejectedValue(new Error("storage down"))
        const { verifyStoredUpload } = await import("@/lib/security/verify-stored-upload")

        const result = await verifyStoredUpload("https://x/a.pdf", "policy.pdf")

        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.reason).toBe("unreadable")
    })

    it("still scans a file that passed the signature check", async () => {
        downloadPolicyDocument.mockResolvedValue(PDF)
        const { verifyStoredUpload } = await import("@/lib/security/verify-stored-upload")

        await verifyStoredUpload("https://x/a.pdf", "policy.pdf")
        expect(scanUploadBuffer).toHaveBeenCalledTimes(1)
    })
})
