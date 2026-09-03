import { readFileSync } from "node:fs"
import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * An upload must commit a policy WITH its document.
 *
 * `PolicyService.create()` validates each document's `name` against the
 * extension allowlist and stores a GENERATED label regardless. From 2026-08-21
 * `uploadAndParse` passed that generated Greek label («Ασφαλιστήριο …», no
 * extension) as the name, so the check rejected it, the row was committed
 * with zero documents, the analysis had nothing to read, and the uploaded
 * object sat in the bucket referenced by nothing — personal data no export
 * could reach. Production carried three such rows before this was caught by
 * the onboarding walk. CLAUDE.md already named this failure shape; this is
 * the guard it lacked.
 */
vi.mock("@/lib/security/file-upload", () => ({
    validateUploadFile: vi.fn(async () => ({ ok: true, value: { ext: ".pdf", canonicalMime: "application/pdf", displayName: "x.pdf" } })),
    sanitizeDisplayName: (s: string) => s,
}))
vi.mock("@/lib/storage", () => ({ uploadFile: vi.fn(async () => "https://storage.example/policies/abc.pdf"), deleteFile: vi.fn() }))
vi.mock("@/lib/services/policy-discard", () => ({ discardOrphanedUploads: vi.fn(), classifyAnalysisFailure: vi.fn(), discardFailedPolicy: vi.fn() }))
vi.mock("@/lib/notifications/dispatch", () => ({ emit: vi.fn() }))
vi.mock("@/lib/services/gap-engine", () => ({ refreshProtectionScore: vi.fn() }))
vi.mock("@/lib/journey/conversion-events", () => ({ recordConversionEvent: vi.fn() }))
vi.mock("@/lib/email/invite-emails", () => ({ sendPolicyInviteEmail: vi.fn(), sendPolicySharedAccessEmail: vi.fn() }))
vi.mock("@/lib/services/renewal.service", () => ({ closeSupersededRenewals: vi.fn() }))
vi.mock("@/lib/logger", () => ({ logger: vi.fn() }))
vi.mock("@/lib/db", () => ({ db: {} }))

import { PolicyService } from "@/lib/services/policy.service"

type Calls = Record<string, any[][]>
function prismaLike(calls: Calls) {
    const defaults: Record<string, unknown> = {
        create: { id: "pol_1", policyNumber: "PENDING-ABCD1234", insurerName: "AI Analyzing...", status: "analyzing", ownerUserId: "u1" },
        findUnique: { id: "u1", email: "owner@example.test" },
        findFirst: null, findMany: [], count: 0, update: {}, upsert: {}, deleteMany: { count: 0 }, updateMany: { count: 0 },
    }
    const model = (name: string) =>
        new Proxy({}, { get: (_t, method: string) => (...args: any[]) => {
            ;(calls[`${name}.${method}`] ??= []).push(args)
            return Promise.resolve(defaults[method] ?? {})
        } })
    const client: any = new Proxy({}, {
        get: (_t, name: string) => {
            if (name === "$transaction") return (fn: (tx: unknown) => Promise<unknown>) => fn(client)
            return model(name)
        },
    })
    return client
}

describe("an upload commits its document", () => {
    let calls: Calls
    let service: PolicyService
    beforeEach(() => {
        calls = {}
        service = new PolicyService(prismaLike(calls))
    })

    it("uploadAndParse creates the policy AND one document row pointing at the stored object", async () => {
        const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "whatever-the-user-called-it.pdf", { type: "application/pdf" })
        const result = await service.uploadAndParse("u1", file, "el")
        expect(result.policyId).toBe("pol_1")
        const docs = calls["policyDocument.create"] ?? []
        expect(docs, "policyDocument.create calls").toHaveLength(1)
        const data = docs[0][0].data
        expect(data.policyId).toBe("pol_1")
        expect(data.fileUrl).toBe("https://storage.example/policies/abc.pdf")
        // The stored label stays GENERATED — never the synthetic check-name, never the user's.
        expect(data.fileName).not.toMatch(/upload|whatever-the-user|\.pdf/i)
        expect(data.processingStatus).toBe("processing")
    })

    it("probe: a label without an extension is what the check rejects (the failure mode this guards)", async () => {
        await service.create("u1", {
            insurerName: "AI Analyzing...", policyNumber: "PENDING-X", lineOfBusiness: "other",
            startDate: new Date().toISOString(), endDate: new Date(Date.now() + 86_400_000).toISOString(), premiumAmount: 0, status: "analyzing",
            documents: [{ url: "https://storage.example/policies/abc.pdf", name: "Ασφαλιστήριο · σε επεξεργασία", size: 10 }],
        } as any, "el")
        expect(calls["policyDocument.create"] ?? []).toHaveLength(0)
    })

    it("source: uploadAndParse never hands the display label to the extension check", () => {
        const src = readFileSync("lib/services/policy.service.ts", "utf-8")
        const body = src.slice(src.indexOf("async uploadAndParse("), src.indexOf("async attachRenewalDocument("))
        expect(body).not.toMatch(/name:\s*storedDocumentLabel\(/)
        expect(body).toMatch(/name:\s*`upload\$\{validation\.value\.ext\}`/)
    })
})
