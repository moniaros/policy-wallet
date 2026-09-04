// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const activityLogCount = vi.fn(async (..._args: unknown[]) => 0)
const activityLogCreate = vi.fn(async (..._args: unknown[]) => ({}))
const policyDocumentFindFirst = vi.fn(async (..._args: unknown[]): Promise<{ policyId: string } | null> => null)
const userFindUnique = vi.fn(
    async (..._args: unknown[]): Promise<{ aiProcessingConsentVersion: string | null } | null> => ({
        aiProcessingConsentVersion: "v1",
    })
)

vi.mock("@/lib/db", () => ({
    db: {
        activityLog: {
            count: (...a: unknown[]) => activityLogCount(...a),
            create: (...a: unknown[]) => activityLogCreate(...a),
        },
        policyDocument: { findFirst: (...a: unknown[]) => policyDocumentFindFirst(...a) },
        user: { findUnique: (...a: unknown[]) => userFindUnique(...a) },
    },
}))
vi.mock("@/lib/logger", () => ({ logger: vi.fn() }))

import { validateDocumentForIngestion, GATE_ACTIVITY, REJECTION_BUDGET_PER_HOUR, type GateInput } from "@/lib/ingestion/document-gate"
import type { ModelClassifier, ModelClassificationOutcome } from "@/lib/ingestion/model-classifier"
import { MAX_DOCUMENT_PAGES } from "@/lib/ingestion/pdf-probe"
import {
    textPdf,
    imageOnlyPdf,
    ONE_PIXEL_PNG,
    ENGLISH_MOTOR_LINES,
    ENGLISH_HEALTH_LINES,
    ENGLISH_LIFE_LINES,
    RESTAURANT_MENU_LINES,
    BANK_STATEMENT_LINES,
    CV_LINES,
    LEASE_LINES,
    TERMS_BOOKLET_LINES,
    THIN_LINES,
    INJECTION_LINES,
} from "../../helpers/pdf-fixtures"

const baseInput = (bytes: Uint8Array, overrides: Partial<GateInput> = {}): GateInput => ({
    bytes,
    canonicalMime: "application/pdf",
    declaredBranch: "motor",
    declaredBranchSource: "user",
    mode: "policy",
    surface: "wallet_add",
    actorUserId: "user-1",
    ownerUserId: "user-1",
    ...overrides,
})

const modelSays = (outcome: Partial<ModelClassificationOutcome & { available: true }>): ModelClassifier =>
    vi.fn(async () => ({
        available: true as const,
        documentType: "insurance_policy" as const,
        isInsuranceDocument: true,
        insuranceConfidence: 0.9,
        detectedBranch: "motor" as const,
        branchConfidence: 0.9,
        readable: true,
        signals: ["policy number", "insurer", "premium"],
        tokens: 420,
        ...outcome,
    }))
const modelUnavailable: ModelClassifier = vi.fn(async () => ({ available: false as const, reason: "not_configured" as const }))

const lastActivity = () => (activityLogCreate.mock.calls.at(-1) as any)?.[0]?.data

beforeEach(() => {
    activityLogCount.mockClear().mockResolvedValue(0)
    activityLogCreate.mockClear()
    policyDocumentFindFirst.mockClear().mockResolvedValue(null)
    userFindUnique.mockClear().mockResolvedValue({ aiProcessingConsentVersion: "v1" })
})

describe("document gate — valid policies pass without a model", () => {
    it.each([
        { name: "motor", lines: ENGLISH_MOTOR_LINES, branch: "motor" as const },
        { name: "health", lines: ENGLISH_HEALTH_LINES, branch: "health" as const },
        { name: "life", lines: ENGLISH_LIFE_LINES, branch: "life" as const },
    ])("a $name schedule declared as $branch is validated deterministically", async ({ lines, branch }) => {
        const model = modelSays({})
        const result = await validateDocumentForIngestion(
            baseInput(await textPdf(lines), { declaredBranch: branch }),
            { classifyWithModel: model }
        )
        expect(result.status).toBe("validated")
        expect(result.documentType).toBe("insurance_policy")
        expect(result.branchConsistency).toBe("consistent")
        expect(result.detectedBranch).toBe(branch)
        expect(result.evidence.classifier).toBe("deterministic")
        expect(model).not.toHaveBeenCalled()
        expect(result.documentHash).toMatch(/^[0-9a-f]{64}$/)
        expect(lastActivity().actionType).toBe(GATE_ACTIVITY.validated)
        expect(lastActivity().metadata.tokensPrevented).toBe(0)
    })

    it("a motorbike or roadside declaration is consistent with a motor schedule (same family)", async () => {
        const bytes = await textPdf(ENGLISH_MOTOR_LINES)
        for (const declared of ["motorbike", "roadside"]) {
            const result = await validateDocumentForIngestion(baseInput(bytes, { declaredBranch: declared }), {
                classifyWithModel: modelUnavailable,
            })
            expect(result.status).toBe("validated")
            expect(result.branchConsistency).toBe("consistent")
        }
    })

    it("no declared branch (onboarding, bulk) is nothing to contradict", async () => {
        const result = await validateDocumentForIngestion(
            baseInput(await textPdf(ENGLISH_HEALTH_LINES), { declaredBranch: null, surface: "onboarding" }),
            { classifyWithModel: modelUnavailable }
        )
        expect(result).toMatchObject({ status: "validated", branchConsistency: "not_declared", detectedBranch: "health" })
    })

    it("declared «other» is consistent with anything", async () => {
        const result = await validateDocumentForIngestion(
            baseInput(await textPdf(ENGLISH_HEALTH_LINES), { declaredBranch: "other" }),
            { classifyWithModel: modelUnavailable }
        )
        expect(result).toMatchObject({ status: "validated", branchConsistency: "consistent" })
    })
})

describe("document gate — non-insurance documents are rejected before storage, before any model", () => {
    it.each([
        { name: "restaurant menu", lines: RESTAURANT_MENU_LINES },
        { name: "bank statement", lines: BANK_STATEMENT_LINES },
        { name: "CV", lines: CV_LINES },
        { name: "lease agreement", lines: LEASE_LINES },
        { name: "prompt injection wrapped around a menu", lines: INJECTION_LINES },
    ])("$name + Motor selected → NOT_AN_INSURANCE_DOCUMENT, no model call, one rejection row", async ({ lines }) => {
        const model = modelSays({})
        const result = await validateDocumentForIngestion(baseInput(await textPdf(lines)), { classifyWithModel: model })
        expect(result.status).toBe("rejected")
        expect(result.code).toBe("NOT_AN_INSURANCE_DOCUMENT")
        expect(result.documentType).toBe("non_insurance")
        expect(model).not.toHaveBeenCalled()
        expect(userFindUnique).not.toHaveBeenCalled() // consent is only read before a model call
        expect(activityLogCreate).toHaveBeenCalledTimes(1)
        expect(lastActivity().actionType).toBe(GATE_ACTIVITY.rejected)
        expect(lastActivity().metadata.tokensPrevented).toBeGreaterThan(100_000)
    })

    it("a Γενικοί Όροι booklet is insurance but cannot BECOME a policy", async () => {
        const model = modelSays({})
        const result = await validateDocumentForIngestion(baseInput(await textPdf(TERMS_BOOKLET_LINES)), {
            classifyWithModel: model,
        })
        expect(result).toMatchObject({ status: "rejected", code: "NOT_AN_INSURANCE_POLICY", documentType: "insurance_terms_or_guide" })
        expect(model).not.toHaveBeenCalled()
    })

    it("...but it may be ATTACHED to a policy that exists", async () => {
        const result = await validateDocumentForIngestion(
            baseInput(await textPdf(TERMS_BOOKLET_LINES), { mode: "attachment", surface: "attachment", declaredBranchSource: "policy", existingPolicyId: "p1" }),
            { classifyWithModel: modelUnavailable }
        )
        expect(result.status).toBe("validated")
        expect(result.documentType).toBe("insurance_terms_or_guide")
    })
})

describe("document gate — technical rejections", () => {
    it("corrupt bytes → FILE_UNREADABLE", async () => {
        const result = await validateDocumentForIngestion(baseInput(new Uint8Array(Buffer.from("%PDF-1.4 nonsense"))), {
            classifyWithModel: modelUnavailable,
        })
        expect(result).toMatchObject({ status: "rejected", code: "FILE_UNREADABLE" })
    })

    it("too many pages → TOO_MANY_PAGES, before any text is read", async () => {
        const result = await validateDocumentForIngestion(baseInput(await textPdf(["x"], MAX_DOCUMENT_PAGES + 1)), {
            classifyWithModel: modelUnavailable,
        })
        expect(result).toMatchObject({ status: "rejected", code: "TOO_MANY_PAGES" })
        expect(result.evidence.pageCount).toBe(MAX_DOCUMENT_PAGES + 1)
    })

    it("the same bytes already in the wallet → DUPLICATE_DOCUMENT naming the policy", async () => {
        policyDocumentFindFirst.mockResolvedValueOnce({ policyId: "existing-policy" })
        const result = await validateDocumentForIngestion(baseInput(await textPdf(ENGLISH_MOTOR_LINES)), {
            classifyWithModel: modelUnavailable,
        })
        expect(result).toMatchObject({ status: "rejected", code: "DUPLICATE_DOCUMENT", existingPolicyId: "existing-policy" })
    })

    it("too many rejections this hour → throttled without even opening the file", async () => {
        activityLogCount.mockResolvedValueOnce(REJECTION_BUDGET_PER_HOUR)
        const result = await validateDocumentForIngestion(baseInput(new Uint8Array(Buffer.from("%PDF garbage"))), {
            classifyWithModel: modelUnavailable,
        })
        expect(result).toMatchObject({ status: "rejected", code: "UPLOAD_REJECTIONS_THROTTLED" })
        expect(result.evidence.pageCount).toBe(0)
    })
})

describe("document gate — branch consistency is checked, and the hint never wins by itself", () => {
    it("a health schedule declared as Motor: lexicon says health, model agrees → BRANCH_MISMATCH naming health", async () => {
        const model = modelSays({ detectedBranch: "health", branchConfidence: 0.95 })
        const result = await validateDocumentForIngestion(baseInput(await textPdf(ENGLISH_HEALTH_LINES)), {
            classifyWithModel: model,
        })
        expect(result).toMatchObject({ status: "rejected", code: "BRANCH_MISMATCH", detectedBranch: "health", declaredBranch: "motor", branchConsistency: "mismatch" })
        expect(model).toHaveBeenCalledTimes(1)
        expect((model as any).mock.calls[0][0]).toMatchObject({ kind: "text", declaredBranch: "motor" })
    })

    it("...model disagrees or is unavailable → held for the person (BRANCH_UNCONFIRMED), never analysed as Motor", async () => {
        const bytes = await textPdf(ENGLISH_HEALTH_LINES)
        for (const model of [modelSays({ detectedBranch: "motor", branchConfidence: 0.6 }), modelUnavailable]) {
            const result = await validateDocumentForIngestion(baseInput(bytes), { classifyWithModel: model })
            expect(result).toMatchObject({ status: "requires_review", code: "BRANCH_UNCONFIRMED", reviewReasons: ["branch_unknown"] })
            expect(lastActivity().actionType).toBe(GATE_ACTIVITY.requires_review)
        }
    })

    it("...and the person's confirmation resolves BRANCH_UNCONFIRMED but never a mismatch two readers agreed on", async () => {
        const bytes = await textPdf(ENGLISH_HEALTH_LINES)
        const unconfirmed = await validateDocumentForIngestion(baseInput(bytes, { branchConfirmed: true }), {
            classifyWithModel: modelUnavailable,
        })
        expect(unconfirmed.status).toBe("validated")
        expect(unconfirmed.reviewReasons).toEqual(["branch_unknown"])

        const mismatch = await validateDocumentForIngestion(baseInput(bytes, { branchConfirmed: true }), {
            classifyWithModel: modelSays({ detectedBranch: "health", branchConfidence: 0.95 }),
        })
        expect(mismatch.status).toBe("rejected")
        expect(mismatch.code).toBe("BRANCH_MISMATCH")
    })

    it("a declared branch read off an analysed policy (renewal) rejects a confident cross-family read without a model", async () => {
        const model = modelSays({})
        const result = await validateDocumentForIngestion(
            baseInput(await textPdf(ENGLISH_HEALTH_LINES), { declaredBranchSource: "policy", surface: "renewal", existingPolicyId: "p1" }),
            { classifyWithModel: model }
        )
        expect(result).toMatchObject({ status: "rejected", code: "BRANCH_MISMATCH" })
        expect(model).not.toHaveBeenCalled()
    })
})

describe("document gate — the model band", () => {
    it("a thin page needs the model; consent is read first and its absence holds the document", async () => {
        userFindUnique.mockResolvedValueOnce({ aiProcessingConsentVersion: null })
        const model = modelSays({})
        const result = await validateDocumentForIngestion(baseInput(await textPdf(THIN_LINES)), { classifyWithModel: model })
        expect(result).toMatchObject({ status: "requires_review", code: "AI_CONSENT_REQUIRED", reviewReasons: ["consent_required_for_classification"] })
        expect(model).not.toHaveBeenCalled()
    })

    it("model resolves the band upward: confidently a policy → validated", async () => {
        const model = modelSays({ insuranceConfidence: 0.85 })
        const result = await validateDocumentForIngestion(baseInput(await textPdf(THIN_LINES)), { classifyWithModel: model })
        expect(result.status).toBe("validated")
        expect(result.evidence.classifier).toBe("model")
        expect(result.evidence.modelTokens).toBe(420)
        expect((model as any).mock.calls[0][0].text.length).toBeLessThanOrEqual(6_000)
    })

    it("model says not insurance → rejected", async () => {
        const result = await validateDocumentForIngestion(baseInput(await textPdf(THIN_LINES)), {
            classifyWithModel: modelSays({ isInsuranceDocument: false, insuranceConfidence: 0.1, documentType: "non_insurance" }),
        })
        expect(result).toMatchObject({ status: "rejected", code: "NOT_AN_INSURANCE_DOCUMENT" })
    })

    it("model says a quotation, confidently → not a policy", async () => {
        const result = await validateDocumentForIngestion(baseInput(await textPdf(THIN_LINES)), {
            classifyWithModel: modelSays({ documentType: "insurance_quotation", insuranceConfidence: 0.8 }),
        })
        expect(result).toMatchObject({ status: "rejected", code: "NOT_AN_INSURANCE_POLICY", documentType: "insurance_quotation" })
    })

    it("model unsure → held, resolvable by the person", async () => {
        const bytes = await textPdf(THIN_LINES)
        const held = await validateDocumentForIngestion(baseInput(bytes), { classifyWithModel: modelSays({ insuranceConfidence: 0.55 }) })
        expect(held).toMatchObject({ status: "requires_review", code: "DOCUMENT_REVIEW_REQUIRED" })
        expect(held.reviewReasons).toContain("medium_insurance_confidence")
        const confirmed = await validateDocumentForIngestion(baseInput(bytes, { branchConfirmed: true }), {
            classifyWithModel: modelSays({ insuranceConfidence: 0.55 }),
        })
        expect(confirmed.status).toBe("validated")
    })

    it("model unavailable → held with AI_UNAVAILABLE, and NOT resolvable by the person", async () => {
        const bytes = await textPdf(THIN_LINES)
        const result = await validateDocumentForIngestion(baseInput(bytes, { branchConfirmed: true }), { classifyWithModel: modelUnavailable })
        expect(result).toMatchObject({ status: "requires_review", code: "AI_UNAVAILABLE", reviewReasons: ["classifier_unavailable"] })
    })
})

describe("document gate — scans and photos go to the model as a document excerpt", () => {
    it("an image-only PDF: model confident with three signals → validated", async () => {
        const model = modelSays({})
        const result = await validateDocumentForIngestion(baseInput(await imageOnlyPdf(3)), { classifyWithModel: model })
        expect(result.status).toBe("validated")
        expect(result.evidence.imageOnly).toBe(true)
        expect((model as any).mock.calls[0][0]).toMatchObject({ kind: "document", mimeType: "application/pdf" })
    })

    it("a photo of a policy is a document request with the image's MIME", async () => {
        const model = modelSays({})
        const result = await validateDocumentForIngestion(
            baseInput(new Uint8Array(ONE_PIXEL_PNG), { canonicalMime: "image/png" }),
            { classifyWithModel: model }
        )
        expect(result.status).toBe("validated")
        expect((model as any).mock.calls[0][0]).toMatchObject({ kind: "document", mimeType: "image/png" })
    })

    it("a scan the model cannot read → FILE_UNREADABLE; a scan of a menu → rejected; an unsure scan → held", async () => {
        const bytes = await imageOnlyPdf(1)
        expect(
            await validateDocumentForIngestion(baseInput(bytes), { classifyWithModel: modelSays({ readable: false, isInsuranceDocument: false, insuranceConfidence: 0 }) })
        ).toMatchObject({ status: "rejected", code: "FILE_UNREADABLE" })
        expect(
            await validateDocumentForIngestion(baseInput(bytes), { classifyWithModel: modelSays({ isInsuranceDocument: false, insuranceConfidence: 0.05, documentType: "non_insurance" }) })
        ).toMatchObject({ status: "rejected", code: "NOT_AN_INSURANCE_DOCUMENT" })
        const held = await validateDocumentForIngestion(baseInput(bytes), { classifyWithModel: modelSays({ insuranceConfidence: 0.7, signals: ["a"] }) })
        expect(held).toMatchObject({ status: "requires_review", code: "DOCUMENT_REVIEW_REQUIRED" })
        expect(held.reviewReasons).toContain("scan_unclassified")
    })
})
