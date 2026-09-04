/**
 * An empty extraction never becomes an `active` policy.
 *
 * The defect this pins (Sept 2026, found by a browser walk): a one-line PDF
 * with no policy details went through the onboarding upload and came out as
 * a policy row with `status: "active"`, line «Άλλο» and a placeholder
 * identity — because `extractBasicSummary` wrote `active` over whatever
 * `buildMetadata` returned, and `buildMetadata` keeps the stored placeholders
 * when the evidence gate rejects a document. Three surfaces then lied from
 * the one row: the onboarding said «Το διαβάσαμε», the wallet said «1 δεν
 * έχει αναλυθεί», the coverage map painted «Άλλο: Καλυμμένο».
 *
 * Three layers are asserted here:
 *   1. behaviour — the real orchestrator over a mocked db: a sentinel
 *      identity with no period and no coverages → `needs_review`, the row
 *      stamped `action_needed` + EXTRACTION_EMPTY (retryable, timestamped),
 *      never `active`, the document KEPT;
 *   2. the disposition — EXTRACTION_EMPTY classifies as keep-and-inform,
 *      never discard, because a readable file that is not a policy is not a
 *      technical failure;
 *   3. a source guard — no file under lib/services that calls the extraction
 *      seam writes a policy `active` without asking lib/wallet/unread-policy
 *      (which asks lib/wallet/policy-identity). Enumerated from the
 *      filesystem, proven against committed probes.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

vi.mock("@/lib/db", () => ({
    db: {
        policy: { findUnique: vi.fn(), update: vi.fn(async () => ({})), delete: vi.fn() },
        policyDocument: { updateMany: vi.fn(async () => ({ count: 1 })), deleteMany: vi.fn() },
        policyAnalysisRun: { create: vi.fn(), update: vi.fn() },
        gapDefinition: { count: vi.fn() },
        user: { findUnique: vi.fn(), updateMany: vi.fn() },
        accessGrant: { findFirst: vi.fn(), findMany: vi.fn(async () => []) },
        customerRelationship: { findFirst: vi.fn() },
    },
}))
vi.mock("next/cache", async (importOriginal) => ({
    ...(await importOriginal<typeof import("next/cache")>()),
    revalidatePath: vi.fn(),
}))
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn(), captureMessage: vi.fn() }))
vi.mock("@/lib/env", () => ({
    env: {
        GEMINI_MODEL_CLARITY_ANALYSIS: "gemini-test",
        GEMINI_MODEL_EXTRACTION: "gemini-test",
        GEMINI_MODEL_GAP_ANALYSIS: "gemini-test",
        GEMINI_MODEL_QA: "gemini-test",
        GEMINI_MODEL_FALLBACK: "gemini-test",
        FF_AI_FAILOVER_OPENAI: "false",
        FF_AI_DEGRADED_COMPLETION: "true",
        FF_AI_REMEDIATION_ALERTS: "false",
        FF_AI_REMEDIATION_CANARY_MODE: "off",
        AI_ALLOW_FULL_FAILOVER: "true",
    },
}))
vi.mock("@/lib/logger", () => ({ logger: vi.fn() }))
vi.mock("@/lib/services/ai/runtime-config", () => ({ getAiRuntimeOverrides: vi.fn(async () => ({})) }))
vi.mock("@/lib/token-tracking", () => ({ canUserUseTokens: vi.fn(), reserveTokens: vi.fn(), releaseTokenReservation: vi.fn() }))
const extractPolicyData = vi.fn()
vi.mock("@/lib/services/ai", () => ({
    getAIService: vi.fn(() => ({ isAvailable: () => true, getServiceName: () => "mock", extractPolicyData })),
}))
vi.mock("@/lib/subscription-entitlements", () => ({
    resolveUserEntitlements: vi.fn(async () => ({ tier: "free", limits: {} })),
    resolveAgentEntitlements: vi.fn(async () => ({ tier: "agent_free", limits: {} })),
}))
const refreshProtectionScore = vi.fn()
vi.mock("@/lib/services/gap-engine", () => ({ refreshProtectionScore }))
const closeReviewsByPolicyEvidence = vi.fn()
vi.mock("@/lib/services/risk-review/service", () => ({ closeReviewsByPolicyEvidence }))

import { db } from "@/lib/db"
import { PolicyAnalysisOrchestratorService } from "@/lib/services/analysis/policy-analysis-orchestrator.service"
import { classifyAnalysisFailure } from "@/lib/services/policy-discard"
import { PLACEHOLDER_INSURER_NAMES, PLACEHOLDER_POLICY_NUMBER_PREFIX } from "@/lib/wallet/policy-identity"
import { EXTRACTION_EMPTY_CODE, isEmptyExtraction, isUnreadPolicy } from "@/lib/wallet/unread-policy"

// ── Fixtures — sentinels come from the single source, never retyped ────

const OWNER = "owner-1"
/** The upload-time placeholders (`PolicyService.uploadAndParse`). */
const STORED = { insurerName: PLACEHOLDER_INSURER_NAMES[1], policyNumber: `${PLACEHOLDER_POLICY_NUMBER_PREFIX}AB12CD34` }
/** What a provider returns for an empty document (`Unknown Insurer` / `PENDING-<epoch>`). */
const PROVIDER_EMPTY = {
    insurerName: PLACEHOLDER_INSURER_NAMES[2],
    policyNumber: `${PLACEHOLDER_POLICY_NUMBER_PREFIX}1786732800000`,
    lineOfBusiness: "",
    startDate: "",
    endDate: "",
    premiumAmount: 0,
    coverageSummary: "",
    documentKind: "other" as const,
    evidence: { sufficient: false as const, reason: "no_identifying_evidence" as const },
}

const policyRow = () => ({
    id: "pol-1",
    ownerUserId: OWNER,
    ...STORED,
    lineOfBusiness: "other",
    // The upload path stamps a synthetic period on every new row — which is
    // why emptiness is judged on the DOCUMENT's dates, never the stored ones.
    startDate: new Date("2026-09-03T00:00:00Z"),
    endDate: new Date("2026-09-04T00:00:00Z"),
    premiumAmount: null,
    coverageSummary: null,
    acordData: { extraction: { source: "upload" } },
    documents: [{ id: "doc-1", uploadedAt: new Date() }],
})

function orchestrator() {
    const svc = new PolicyAnalysisOrchestratorService()
    ;(svc as any).prepareDocument = vi.fn(async () => ({ document: { bytes: "x" }, documentId: "doc-1", documentHash: "h" }))
    return svc
}

const updates = () => vi.mocked(db.policy.update).mock.calls.map((c: any[]) => c[0])

beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.user.findUnique).mockResolvedValue({ aiProcessingConsentVersion: "2026-07" } as any)
    vi.mocked(db.policy.findUnique).mockResolvedValue(policyRow() as any)
})

// ── 1. Behaviour ────────────────────────────────────────────────────────

describe("the basic-summary path over a document that carries no policy", () => {
    it("answers needs_review, stamps action_needed + EXTRACTION_EMPTY, and never writes active", async () => {
        extractPolicyData.mockResolvedValue(PROVIDER_EMPTY)

        const result = await orchestrator().extractBasicSummary("pol-1", OWNER)

        expect(result).toEqual({ status: "needs_review", reason: "extraction_empty" })
        const writes = updates()
        expect(writes).toHaveLength(1)
        expect(writes[0].where).toEqual({ id: "pol-1" })
        expect(writes[0].data.status).toBe("action_needed")
        expect(writes.some((w) => w.data?.status === "active")).toBe(false)
        // The token-gate / markAnalysisIncomplete shape: code, message, retryable, occurredAt.
        const stamp = writes[0].data.acordData.processingError
        expect(stamp).toMatchObject({ code: EXTRACTION_EMPTY_CODE, retryable: true })
        expect(typeof stamp.message).toBe("string")
        expect(Number.isNaN(Date.parse(stamp.occurredAt))).toBe(false)
        // Stored acordData survives the stamp — merged, not replaced.
        expect(writes[0].data.acordData.extraction).toEqual({ source: "upload" })
        // The identity is not rewritten with the provider's placeholders.
        expect(writes[0].data).not.toHaveProperty("insurerName")
        expect(writes[0].data).not.toHaveProperty("policyNumber")
    })

    it("keeps the document — nothing is deleted, the row is not discarded, and no score or review is credited", async () => {
        extractPolicyData.mockResolvedValue(PROVIDER_EMPTY)

        await orchestrator().extractBasicSummary("pol-1", OWNER)

        expect(db.policy.delete).not.toHaveBeenCalled()
        expect(db.policyDocument.deleteMany).not.toHaveBeenCalled()
        // The document WAS processed; what it lacks is a policy.
        expect(vi.mocked(db.policyDocument.updateMany).mock.calls.map((c: any[]) => c[0].data.processingStatus)).toEqual(["completed"])
        // Absence of a detected problem is not evidence of no problem: nothing
        // recomputes a score or closes a review on a file that carries no policy.
        expect(refreshProtectionScore).not.toHaveBeenCalled()
        expect(closeReviewsByPolicyEvidence).not.toHaveBeenCalled()
    })

    it("a document that states a period, or an insurer, is not empty — it still activates", async () => {
        extractPolicyData.mockResolvedValue({ ...PROVIDER_EMPTY, startDate: "2026-01-01", endDate: "2027-01-01", evidence: { sufficient: true } })
        expect((await orchestrator().extractBasicSummary("pol-1", OWNER)).status).toBe("completed")
        expect(updates().at(-1)?.data.status).toBe("active")

        vi.clearAllMocks()
        vi.mocked(db.user.findUnique).mockResolvedValue({ aiProcessingConsentVersion: "2026-07" } as any)
        vi.mocked(db.policy.findUnique).mockResolvedValue(policyRow() as any)
        extractPolicyData.mockResolvedValue({ ...PROVIDER_EMPTY, insurerName: "ΕΘΝΙΚΗ", evidence: { sufficient: true } })
        expect((await orchestrator().extractBasicSummary("pol-1", OWNER)).status).toBe("completed")
        expect(updates().at(-1)?.data.status).toBe("active")
    })
})

describe("the predicates", () => {
    const empty = { insurerName: STORED.insurerName, policyNumber: STORED.policyNumber, extraction: { startDate: "", endDate: "" } }

    it("isEmptyExtraction: placeholder identity AND no period AND no coverages — any one of them rescues", () => {
        expect(isEmptyExtraction(empty)).toBe(true)
        expect(isEmptyExtraction({ ...empty, insurerName: "Interamerican" })).toBe(false)
        expect(isEmptyExtraction({ ...empty, policyNumber: "POL-42" })).toBe(false)
        expect(isEmptyExtraction({ ...empty, extraction: { startDate: "2026-01-01" } })).toBe(false)
        expect(isEmptyExtraction({ ...empty, extraction: { endDate: "2027-01-01" } })).toBe(false)
        expect(isEmptyExtraction({ ...empty, extraction: { acordData: { coverages: [{ name: "Third-party liability" }] } } })).toBe(false)
        // A nameless coverage entry is not a coverage.
        expect(isEmptyExtraction({ ...empty, extraction: { acordData: { coverages: [{ limit: 1 }] } } })).toBe(true)
        // Blank identity is a placeholder identity.
        expect(isEmptyExtraction({ insurerName: "", policyNumber: null, extraction: {} })).toBe(true)
    })

    it("isUnreadPolicy: a placeholder identity or the empty stamp — never a mere processingError on an identified policy", () => {
        expect(isUnreadPolicy({ ...STORED, acordData: null })).toBe(true)
        expect(isUnreadPolicy({ insurerName: "", policyNumber: "", acordData: null })).toBe(true)
        expect(isUnreadPolicy({ insurerName: "Interamerican", policyNumber: "POL-42", acordData: { processingError: { code: EXTRACTION_EMPTY_CODE } } })).toBe(true)
        // A blocked or failed re-read does not unmake an identified policy.
        expect(isUnreadPolicy({ insurerName: "Interamerican", policyNumber: "POL-42", acordData: { processingError: { code: "TOKEN_LIMIT_BLOCKED" } } })).toBe(false)
        expect(isUnreadPolicy({ insurerName: "Interamerican", policyNumber: "POL-42", acordData: { processingError: { code: "TIMEOUT" } } })).toBe(false)
        expect(isUnreadPolicy({ insurerName: "Interamerican", policyNumber: "POL-42", acordData: null })).toBe(false)
        // Half an identity is an identity: the PDF that never printed its number.
        expect(isUnreadPolicy({ insurerName: "Interamerican", policyNumber: STORED.policyNumber, acordData: null })).toBe(false)
    })
})

// ── 2. Disposition ──────────────────────────────────────────────────────

describe("EXTRACTION_EMPTY is keep-and-inform", () => {
    it("classifies as inform, retryable, by code — and the code must travel, because the message alone reads as a technical failure", () => {
        expect(classifyAnalysisFailure({ failureCode: EXTRACTION_EMPTY_CODE, message: "Analysis run did not complete: the document carries no policy" })).toEqual({
            kind: "inform",
            code: EXTRACTION_EMPTY_CODE,
            retryable: true,
        })
        // Why policy.service hands the run's failureCode to the classifier
        // instead of throwing the message into a catch that cannot see it.
        expect(classifyAnalysisFailure({ message: "Analysis run did not complete: the document carries no policy" }).kind).toBe("discard")
    })
})

// ── 3. Source guard ─────────────────────────────────────────────────────

const ROOT = "lib/services"
const EXTRACTION_SEAM = /\.extractPolicyData\(/
const ACTIVE_WRITE = /status:\s*["']active["']/
const CHECK = /\bisEmptyExtraction\(/

function stripComments(src: string): string {
    return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1")
}

function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
        const full = join(dir, name)
        if (statSync(full).isDirectory()) walk(full, out)
        else if (/\.ts$/.test(name) && !/\.test\.ts$/.test(name)) out.push(full)
    }
    return out
}

/**
 * A file that reaches the extraction seam and writes a policy `active` must
 * ask the one predicate. File-level on purpose: the seam callers are few and
 * the rule must not depend on how a method is laid out.
 */
export function unguardedActivationFindings(src: string, file: string): string[] {
    const clean = stripComments(src)
    if (!EXTRACTION_SEAM.test(clean)) return []
    if (!ACTIVE_WRITE.test(clean)) return []
    if (CHECK.test(clean)) return []
    return [`${file}: writes status "active" after extractPolicyData( without isEmptyExtraction(`]
}

/** The method's own line to the line before the next method at class-member indentation. */
function methodBody(src: string, name: string): string {
    const start = src.search(new RegExp(`^[ \\t]+(?:private[ \\t]+|public[ \\t]+)?async[ \\t]+${name}\\(`, "m"))
    if (start < 0) return ""
    const rest = src.slice(start)
    const next = rest.slice(1).search(/^[ \t]{4}(?:private[ \t]+|public[ \t]+)?async[ \t]+[a-zA-Z]+\(/m)
    return next < 0 ? rest : rest.slice(0, next + 1)
}

const ORCHESTRATOR = "lib/services/analysis/policy-analysis-orchestrator.service.ts"

describe("no extraction result becomes active without asking whether it is a policy", () => {
    const universe = walk(ROOT)

    it("enumerates a real universe that contains the orchestrator", () => {
        expect(universe.length).toBeGreaterThan(20)
        expect(universe).toContain(ORCHESTRATOR)
        expect(universe.filter((f) => EXTRACTION_SEAM.test(stripComments(readFileSync(f, "utf-8")))).length).toBeGreaterThan(0)
    })

    it("every seam caller under lib/services is guarded", () => {
        const findings = universe.flatMap((file) => unguardedActivationFindings(readFileSync(file, "utf-8"), file))
        expect(findings).toEqual([])
    })

    it("both orchestrator paths ask BEFORE anything can become active", () => {
        const clean = stripComments(readFileSync(ORCHESTRATOR, "utf-8"))
        const basic = methodBody(clean, "extractBasicSummary")
        expect(basic, "extractBasicSummary not found").not.toBe("")
        const basicCheck = basic.search(CHECK)
        const basicActive = basic.search(ACTIVE_WRITE)
        expect(basicCheck, "extractBasicSummary: no isEmptyExtraction(").toBeGreaterThan(-1)
        expect(basicActive, "extractBasicSummary: no active write").toBeGreaterThan(-1)
        expect(basicCheck).toBeLessThan(basicActive)

        const deep = methodBody(clean, "executePipelineAttempt")
        expect(deep, "executePipelineAttempt not found").not.toBe("")
        const metadataAt = deep.indexOf("buildMetadata(policy, extractionStep.result)")
        const deepCheck = deep.search(CHECK)
        const persistAt = deep.indexOf("persistAnalysisArtifacts(")
        expect(metadataAt).toBeGreaterThan(-1)
        expect(deepCheck, "executePipelineAttempt: no isEmptyExtraction(").toBeGreaterThan(metadataAt)
        expect(persistAt).toBeGreaterThan(deepCheck)
        // The deep path ends the run with the CODE, so policy.service can keep the row.
        expect(deep.slice(deepCheck)).toMatch(/code:\s*EXTRACTION_EMPTY_CODE/)
    })

    it("is proven against committed probes", () => {
        const probe = (name: string) => readFileSync(`tests/fixtures/guard-probes/${name}`, "utf-8")
        expect(unguardedActivationFindings(probe("extraction-active-unchecked.ts.txt"), "unchecked")).toEqual([
            'unchecked: writes status "active" after extractPolicyData( without isEmptyExtraction(',
        ])
        expect(unguardedActivationFindings(probe("extraction-active-checked.ts.txt"), "checked")).toEqual([])
        // A status write with no extraction in the file is nobody's business here.
        expect(unguardedActivationFindings(probe("live-policy-compliant.ts.txt"), "compliant")).toEqual([])
    })
})
