// @vitest-environment node
/**
 * RESOURCE assertions for the one persistence path.
 *
 * A rejected document must leave NOTHING behind: no storage object, no Policy,
 * no PolicyDocument, no run — one ActivityLog line and nothing else. A
 * validated one lands as policy + stamped document in one transaction, and a
 * failed transaction removes the object it had just stored.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

const txPolicyCreate = vi.fn(async (..._a: unknown[]) => ({ id: "pol-1" }))
const txPolicyDocumentCreate = vi.fn(async (..._a: unknown[]) => ({ id: "doc-1" }))
const txPolicyUpdate = vi.fn(async (..._a: unknown[]) => ({}))
const dbTransaction = vi.fn(async (fn: (tx: unknown) => unknown) =>
    fn({ policy: { create: txPolicyCreate, update: txPolicyUpdate }, policyDocument: { create: txPolicyDocumentCreate } })
)
const activityLogCreate = vi.fn(async (..._a: unknown[]) => ({}))
const uploadFileDetailed = vi.fn(async (..._a: unknown[]) => ({
    url: "https://storage.example/policies/k1.pdf",
    bucket: "policies",
    key: "k1.pdf",
    mimeType: "application/pdf",
    size: 10,
}))
const discardOrphanedUploads = vi.fn(async (..._a: unknown[]) => ({ removed: 1 }))

vi.mock("@/lib/db", () => ({
    db: {
        $transaction: (...a: unknown[]) => dbTransaction(...(a as [any])),
        activityLog: { count: vi.fn(async () => 0), create: (...a: unknown[]) => activityLogCreate(...a) },
        policyDocument: { findFirst: vi.fn(async () => null) },
        policy: { findUnique: vi.fn(async () => ({ lineOfBusiness: "motor" })) },
        user: { findUnique: vi.fn(async () => ({ aiProcessingConsentVersion: "v1" })) },
    },
}))
vi.mock("@/lib/storage", () => ({ uploadFileDetailed: (...a: unknown[]) => uploadFileDetailed(...a) }))
vi.mock("@/lib/services/policy-discard", () => ({ discardOrphanedUploads: (...a: unknown[]) => discardOrphanedUploads(...a) }))
vi.mock("@/lib/logger", () => ({ logger: vi.fn() }))

import { ingestPolicyDocument } from "@/lib/ingestion/ingest-policy-document"
import { textPdf, ENGLISH_MOTOR_LINES, ENGLISH_HEALTH_LINES, RESTAURANT_MENU_LINES, TERMS_BOOKLET_LINES } from "../../helpers/pdf-fixtures"

const pdfFile = (bytes: Uint8Array, name = "policy.pdf") => new File([bytes as unknown as BlobPart], name, { type: "application/pdf" })

const base = (file: File) => ({
    actorUserId: "user-1",
    ownerUserId: "user-1",
    file,
    surface: "wallet_add" as const,
    mode: "policy" as const,
    declaredBranch: "motor",
    declaredBranchSource: "user" as const,
})

beforeEach(() => {
    vi.clearAllMocks()
    dbTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
        fn({ policy: { create: txPolicyCreate, update: txPolicyUpdate }, policyDocument: { create: txPolicyDocumentCreate } })
    )
})

describe("ingestPolicyDocument — a rejected document leaves nothing behind", () => {
    it("restaurant menu + Motor: no object, no policy, no document, one rejection row", async () => {
        const result = await ingestPolicyDocument(base(pdfFile(await textPdf(RESTAURANT_MENU_LINES))))
        expect(result.ok).toBe(false)
        if (result.ok) return
        expect(result).toMatchObject({ kind: "gate", status: "rejected", code: "NOT_AN_INSURANCE_DOCUMENT", documentType: "non_insurance" })
        expect(uploadFileDetailed).not.toHaveBeenCalled()
        expect(dbTransaction).not.toHaveBeenCalled()
        expect(txPolicyCreate).not.toHaveBeenCalled()
        expect(txPolicyDocumentCreate).not.toHaveBeenCalled()
        expect(activityLogCreate).toHaveBeenCalledTimes(1)
        expect((activityLogCreate.mock.calls[0] as any)[0].data.actionType).toBe("DOCUMENT_REJECTED")
    })

    it("a health schedule declared as Motor with no model available is HELD — and still stores nothing", async () => {
        const result = await ingestPolicyDocument(base(pdfFile(await textPdf(ENGLISH_HEALTH_LINES))))
        expect(result.ok).toBe(false)
        if (result.ok) return
        expect(result).toMatchObject({ kind: "gate", status: "requires_review", code: "BRANCH_UNCONFIRMED", detectedBranch: "health", declaredBranch: "motor" })
        expect(result.kind === "gate" && result.resolvable).toBe(true)
        expect(uploadFileDetailed).not.toHaveBeenCalled()
        expect(dbTransaction).not.toHaveBeenCalled()
    })

    it("a terms booklet cannot become a new policy — but attaches to an existing one", async () => {
        const booklet = pdfFile(await textPdf(TERMS_BOOKLET_LINES))
        const asPolicy = await ingestPolicyDocument(base(booklet))
        expect(asPolicy).toMatchObject({ ok: false, kind: "gate", code: "NOT_AN_INSURANCE_POLICY", documentKind: "terms_and_conditions" })
        expect(uploadFileDetailed).not.toHaveBeenCalled()

        const attached = await ingestPolicyDocument({
            ...base(booklet),
            mode: "attachment",
            surface: "attachment",
            existingPolicyId: "pol-existing",
            declaredBranchSource: "policy",
            processingStatus: "pending",
        })
        expect(attached).toMatchObject({ ok: true, policyId: "pol-existing", documentId: "doc-1", created: false })
        expect(txPolicyCreate).not.toHaveBeenCalled()
        expect(txPolicyDocumentCreate).toHaveBeenCalledTimes(1)
        const data = (txPolicyDocumentCreate.mock.calls[0] as any)[0].data
        expect(data).toMatchObject({ policyId: "pol-existing", documentKind: "terms_and_conditions", processingStatus: "pending", validationStatus: "validated" })
        expect(txPolicyUpdate).not.toHaveBeenCalled()
    })

    it("a disguised executable is refused by the byte gate before the document gate runs", async () => {
        const exe = new File([new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])], "policy.pdf", {
            type: "application/pdf",
        })
        const result = await ingestPolicyDocument(base(exe))
        expect(result).toMatchObject({ ok: false, kind: "upload_invalid", reason: "content_mismatch", code: "FILE_UNREADABLE" })
        expect(activityLogCreate).not.toHaveBeenCalled()
        expect(uploadFileDetailed).not.toHaveBeenCalled()
    })
})

describe("ingestPolicyDocument — a validated document lands as policy + stamped document, in that order", () => {
    it("motor schedule declared as Motor: upload, then ONE transaction with the placeholder identity and the stamp", async () => {
        const result = await ingestPolicyDocument(base(pdfFile(await textPdf(ENGLISH_MOTOR_LINES))))
        expect(result).toMatchObject({ ok: true, policyId: "pol-1", documentId: "doc-1", created: true, lineOfBusiness: "motor" })
        expect(uploadFileDetailed).toHaveBeenCalledTimes(1)
        expect(dbTransaction).toHaveBeenCalledTimes(1)
        expect(uploadFileDetailed.mock.invocationCallOrder[0]).toBeLessThan(dbTransaction.mock.invocationCallOrder[0])

        const policyData = (txPolicyCreate.mock.calls[0] as any)[0].data
        expect(policyData).toMatchObject({ ownerUserId: "user-1", createdByUserId: "user-1", lineOfBusiness: "motor", status: "analyzing" })
        // Server-minted placeholders, never client literals.
        expect(policyData.insurerName).toBe("__PENDING_EXTRACTION__")
        expect(policyData.policyNumber).toMatch(/^PENDING-[0-9A-F]{8}$/)

        const docData = (txPolicyDocumentCreate.mock.calls[0] as any)[0].data
        expect(docData).toMatchObject({
            policyId: "pol-1",
            storageKey: "k1.pdf",
            storageBucket: "policies",
            mimeType: "application/pdf",
            processingStatus: "processing",
            documentKind: "policy_schedule",
            validationStatus: "validated",
            source: "policyholder",
        })
        expect(docData.documentHash).toMatch(/^[0-9a-f]{64}$/)
        expect(docData.validationJson).toMatchObject({ status: "validated", documentType: "insurance_policy" })
        // The stored label is GENERATED — never the person's file name.
        expect(docData.fileName).not.toMatch(/policy\.pdf/)
        expect((activityLogCreate.mock.calls[0] as any)[0].data.actionType).toBe("DOCUMENT_VALIDATED")
    })

    it("typed metadata wins over the placeholders; a detected family fills an undeclared branch", async () => {
        const result = await ingestPolicyDocument({
            ...base(pdfFile(await textPdf(ENGLISH_HEALTH_LINES))),
            surface: "onboarding",
            declaredBranch: null,
            typedMetadata: { insurerName: "Example Health", policyNumber: "HL-1", premiumAmount: 1240 },
        })
        expect(result).toMatchObject({ ok: true, lineOfBusiness: "health" })
        const policyData = (txPolicyCreate.mock.calls[0] as any)[0].data
        expect(policyData).toMatchObject({ insurerName: "Example Health", policyNumber: "HL-1", premiumAmount: 1240, lineOfBusiness: "health" })
    })

    it("a failed transaction removes the just-stored object", async () => {
        dbTransaction.mockRejectedValueOnce(new Error("constraint"))
        await expect(ingestPolicyDocument(base(pdfFile(await textPdf(ENGLISH_MOTOR_LINES))))).rejects.toThrow("constraint")
        expect(discardOrphanedUploads).toHaveBeenCalledWith(["https://storage.example/policies/k1.pdf"], expect.objectContaining({ userId: "user-1" }))
    })

    it("a renewal attach marks the existing policy analysing in the same transaction and keeps the declared kind", async () => {
        const result = await ingestPolicyDocument({
            ...base(pdfFile(await textPdf(ENGLISH_MOTOR_LINES))),
            surface: "renewal",
            existingPolicyId: "pol-existing",
            declaredBranchSource: "policy",
            documentKind: "renewal_notice",
            trustDeclaredKind: true,
            markPolicyAnalyzing: true,
        })
        expect(result).toMatchObject({ ok: true, created: false, policyId: "pol-existing" })
        expect((txPolicyDocumentCreate.mock.calls[0] as any)[0].data.documentKind).toBe("renewal_notice")
        expect(txPolicyUpdate).toHaveBeenCalledWith({ where: { id: "pol-existing" }, data: { status: "analyzing" } })
    })
})
