// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const classifyDocument = vi.fn()
const isAvailable = vi.fn(() => true)
vi.mock("@/lib/services/ai", () => ({
    getAIService: vi.fn(() => ({ isAvailable: () => isAvailable(), getServiceName: () => "mock", classifyDocument: (...a: unknown[]) => classifyDocument(...a) })),
}))

import { getDocumentProxy } from "unpdf"
import {
    classifyWithModel,
    buildScanExcerpt,
    MODEL_TEXT_CAP,
    SCAN_EXCERPT_PAGES,
    SCAN_EXCERPT_MAX_BYTES,
} from "@/lib/ingestion/model-classifier"
import { textPdf, imageOnlyPdf, ONE_PIXEL_PNG } from "../../helpers/pdf-fixtures"

const verdict = {
    documentType: "insurance_policy",
    isInsuranceDocument: true,
    insuranceConfidence: 0.9,
    detectedBranch: "motor",
    branchConfidence: 0.9,
    readable: true,
    signals: ["a", "b", "c"],
    usage: { inputTokens: 300, outputTokens: 50, totalTokens: 350, model: "m" },
}

beforeEach(() => {
    classifyDocument.mockReset().mockResolvedValue(verdict)
    isAvailable.mockReset().mockReturnValue(true)
})

describe("buildScanExcerpt — the model never sees a whole scan", () => {
    it("copies only the first pages of a long PDF into a new document", async () => {
        const excerpt = await buildScanExcerpt(await imageOnlyPdf(12), "application/pdf")
        expect(excerpt).not.toBeNull()
        expect(excerpt!.pages).toBe(SCAN_EXCERPT_PAGES)
        const pdf = await getDocumentProxy(new Uint8Array(Buffer.from(excerpt!.data, "base64")))
        expect(pdf.numPages).toBe(SCAN_EXCERPT_PAGES)
    })

    it("sends a short PDF whole, and a photo as itself", async () => {
        const short = await textPdf(["x"], 2)
        const excerpt = await buildScanExcerpt(short, "application/pdf")
        expect(excerpt).toMatchObject({ pages: 2, mimeType: "application/pdf" })
        expect(Buffer.from(excerpt!.data, "base64").equals(Buffer.from(short))).toBe(true)

        const photo = await buildScanExcerpt(new Uint8Array(ONE_PIXEL_PNG), "image/png")
        expect(photo).toMatchObject({ pages: 1, mimeType: "image/png" })
    })

    it("refuses an excerpt above the byte cap and unreadable bytes", async () => {
        expect(await buildScanExcerpt(new Uint8Array(SCAN_EXCERPT_MAX_BYTES + 1), "image/png")).toBeNull()
        expect(await buildScanExcerpt(new Uint8Array(Buffer.from("%PDF-1.4 garbage")), "application/pdf")).toBeNull()
    })
})

describe("classifyWithModel — bounded input, honest outcomes", () => {
    it("caps text at MODEL_TEXT_CAP and forwards the declared family", async () => {
        const result = await classifyWithModel({ kind: "text", text: "a".repeat(MODEL_TEXT_CAP + 500), declaredBranch: "health", actorUserId: "u1" })
        expect(result).toMatchObject({ available: true, documentType: "insurance_policy", tokens: 350 })
        const [input, options] = classifyDocument.mock.calls[0] as any
        expect(input.kind).toBe("text")
        expect(input.text.length).toBe(MODEL_TEXT_CAP)
        expect(input.declaredBranch).toBe("health")
        expect(options).toEqual({ userId: "u1" })
    })

    it("sends a scan as an excerpt, not the whole file", async () => {
        const bytes = await imageOnlyPdf(10)
        const result = await classifyWithModel({ kind: "document", bytes, mimeType: "application/pdf", declaredBranch: null, actorUserId: "u1" })
        expect(result.available).toBe(true)
        const [input] = classifyDocument.mock.calls[0] as any
        expect(input.kind).toBe("document")
        expect(Buffer.from(input.data, "base64").length).toBeLessThan(bytes.length)
    })

    it("reports not_configured, excerpt_unavailable, error and timeout instead of guessing", async () => {
        isAvailable.mockReturnValue(false)
        expect(await classifyWithModel({ kind: "text", text: "x", declaredBranch: null, actorUserId: "u" })).toEqual({ available: false, reason: "not_configured" })
        isAvailable.mockReturnValue(true)

        expect(
            await classifyWithModel({ kind: "document", bytes: new Uint8Array(SCAN_EXCERPT_MAX_BYTES + 1), mimeType: "image/png", declaredBranch: null, actorUserId: "u" })
        ).toEqual({ available: false, reason: "excerpt_unavailable" })
        expect(classifyDocument).not.toHaveBeenCalled()

        classifyDocument.mockRejectedValueOnce(new Error("provider exploded"))
        expect(await classifyWithModel({ kind: "text", text: "x", declaredBranch: null, actorUserId: "u" })).toEqual({ available: false, reason: "error" })
        classifyDocument.mockRejectedValueOnce(new Error("Gemini document classification timed out"))
        expect(await classifyWithModel({ kind: "text", text: "x", declaredBranch: null, actorUserId: "u" })).toEqual({ available: false, reason: "timeout" })
    })
})
