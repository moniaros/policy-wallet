import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"

import {
    AnalysisPipelineSchema,
    ENVELOPE_WRITERS,
    ExtractionEnvelopeSchema,
    ProcessingErrorSchema,
    StoredAcordDataSchema,
} from "@/lib/schemas/acord-envelope"
import { enrichExtractionPayload } from "@/lib/services/ai/extraction-enrichment"
import { AcordDataSchema } from "@/lib/schemas/acord-data"

/**
 * PW-PROVENANCE-01 W0-04. `StoredAcordDataSchema` declares the envelope the
 * pipeline writes beside `AcordDataSchema`. Three things keep it honest:
 *
 *   1. what the enrichment WRITES parses under it, strictly — a new key on the
 *      envelope fails here until it is declared;
 *   2. every key a writer sets under an envelope root, read from the writer's
 *      source, is declared — the orchestrator cannot be run in a unit test, so
 *      its literals are read instead;
 *   3. the rows that EXIST parse — a fixture in the exact key sets a
 *      `jsonb_object_keys` SELECT returned on production and dev on 2026-09-11,
 *      legacy shapes included. The schema cannot narrow past the data.
 */

const FULL_PAYLOAD = {
    insurerName: "Ethniki",
    policyNumber: "POL-123",
    lineOfBusiness: "motor",
    startDate: "2026-01-01",
    endDate: "2027-01-01",
    premiumAmount: 420,
    issueDate: "2025-12-15",
    premiumFrequency: "annual",
    renewalDate: "2027-01-01",
    coverageSummary: "Ασφάλιση αυτοκινήτου με αστική ευθύνη και οδική βοήθεια.",
    customerName: "Maria",
    customerSurname: "Papadopoulou",
    customerEmail: "maria@example.test",
    customerPhone: "+30 690 000 0000",
    customerTaxId: "123456789",
    extractionSources: { insurerName: { page: 1, snippet: "Ethniki Asfalistiki" } },
    extractionConfidence: {
        overall: 90,
        requiresReview: false,
        fields: { insurerName: 95, policyNumber: 92, lineOfBusiness: 90, startDate: 88, endDate: 88, premiumAmount: 91 },
    },
    acordData: { vehicle: { make: "Toyota", model: "Yaris", insuredValue: 9000 } },
}

// ── 1. What the enrichment writes parses, strictly ────────────────────────────

describe("what the enrichment writes parses under the stored schema", () => {
    it("a fresh enrichment: extraction, policy, policyholder and insured all declared", () => {
        const { acordData } = enrichExtractionPayload(FULL_PAYLOAD as any, undefined, "gemini")
        const parsed = StoredAcordDataSchema.safeParse(acordData)
        expect(parsed.success, JSON.stringify(parsed.error?.issues ?? [], null, 1)).toBe(true)
        if (!parsed.success) return
        expect(parsed.data.extraction?.source).toBe("gemini")
        expect(parsed.data.extraction?.sources?.insurerName?.page).toBe(1)
        expect(parsed.data.policyholder?.taxId).toBe("123456789")
        expect(parsed.data.insured?.name).toBe("Maria Papadopoulou")
        expect(parsed.data.vehicle?.insuredValue).toBe(9000)
    })

    it("a re-enrichment over an existing row keeps the envelope parseable", () => {
        const first = enrichExtractionPayload(FULL_PAYLOAD as any, undefined, "gemini").acordData
        const second = enrichExtractionPayload({ ...FULL_PAYLOAD, coverageSummary: "" } as any, first, "openai").acordData
        const parsed = StoredAcordDataSchema.safeParse(second)
        expect(parsed.success, JSON.stringify(parsed.error?.issues ?? [], null, 1)).toBe(true)
    })
})

// ── 2. Every key a writer sets is declared ────────────────────────────────────

/** The top-level keys of every `<label>: {` object literal in a source, nested braces skipped. */
export function literalKeysUnder(source: string, label: string): string[] {
    const keys = new Set<string>()
    const re = new RegExp(`\\b${label}\\s*:\\s*\\{`, "g")
    for (const m of source.matchAll(re)) {
        let i = m.index! + m[0].length
        let depth = 1
        let flat = ""
        for (; i < source.length && depth > 0; i++) {
            const c = source[i]
            if (c === "{") depth++
            else if (c === "}") depth--
            if (depth === 1) flat += c
        }
        // A key starts the literal, follows a comma, or starts a line. The ES6
        // shorthand (`provider,`) carries no colon and is not read — stated.
        for (const k of flat.matchAll(/(?:^|,|\n)\s*([A-Za-z_]\w*)\s*:/g)) keys.add(k[1])
    }
    return [...keys].sort()
}

const shapeKeys = (schema: { shape: Record<string, unknown> }) => Object.keys(schema.shape).sort()

describe("every key a writer sets under an envelope root is declared", () => {
    const orchestrator = readFileSync("lib/services/analysis/policy-analysis-orchestrator.service.ts", "utf-8")
    const enrichment = readFileSync("lib/services/ai/extraction-enrichment.ts", "utf-8")

    it("the writer files named for each root still exist and still write it", () => {
        for (const [root, writers] of Object.entries(ENVELOPE_WRITERS)) {
            for (const writer of writers) {
                const src = readFileSync(writer, "utf-8")
                // `root: value` or the ES6 shorthand `root,` on its own line (policy-merge.service.ts).
                const writes = new RegExp(`(?<![\\w$])${root}\\s*(?::|,\\s*$)`, "m").test(src)
                expect(writes, `${writer} no longer writes \`${root}\``).toBe(true)
            }
        }
    })

    it("analysis.pipeline: the orchestrator's literals set only declared keys", () => {
        const written = literalKeysUnder(orchestrator, "pipeline")
        expect(written.length).toBeGreaterThan(3)
        const undeclared = written.filter((k) => !shapeKeys(AnalysisPipelineSchema).includes(k))
        expect(undeclared, `declare in AnalysisPipelineSchema: ${undeclared.join(", ")}`).toEqual([])
    })

    it("processingError: the orchestrator's literals set only declared keys", () => {
        const written = literalKeysUnder(orchestrator, "processingError")
        expect(written.length).toBeGreaterThan(2)
        const undeclared = written.filter((k) => !shapeKeys(ProcessingErrorSchema).includes(k))
        expect(undeclared, `declare in ProcessingErrorSchema: ${undeclared.join(", ")}`).toEqual([])
    })

    it("extraction: the enrichment's and the orchestrator's literals set only declared keys", () => {
        const written = [...new Set([...literalKeysUnder(enrichment, "extraction"), ...literalKeysUnder(orchestrator, "extraction")])].sort()
        expect(written).toContain("reviewState")
        const undeclared = written.filter((k) => !shapeKeys(ExtractionEnvelopeSchema).includes(k))
        expect(undeclared, `declare in ExtractionEnvelopeSchema: ${undeclared.join(", ")}`).toEqual([])
    })

    it("the matcher is proven against a probe", () => {
        expect(literalKeysUnder(`x = { pipeline: { runId: r, nested: { deep: 1 }, status: "s" } }`, "pipeline")).toEqual(["nested", "runId", "status"])
        expect(literalKeysUnder(`x = { pipeline: { ...spread, provider } }`, "pipeline")).toEqual([])
    })
})

// ── 3. The rows that exist parse ──────────────────────────────────────────────

describe("the rows on both databases parse — the schema cannot narrow past the data", () => {
    /** Production, 2026-09-11: every key jsonb_object_keys returned under each root, in one row. */
    const PRODUCTION_ROW = {
        _version: 3,
        policy: { insurerName: "Η ΕΘΝΙΚΗ", policyNumber: "1668177", lineOfBusiness: "health", currency: "EUR", premium: { amount: 666.01 } },
        health: { annualLimit: 1500000, hospitalClass: "Α" },
        extraction: {
            confidence: { overall: 88, fields: { insurerName: 95 } },
            confirmedAt: null,
            dateParse: { startDate: "ok", endDate: "ok", issueDate: "missing", renewalDate: "failed" },
            extractedAt: "2026-08-21T10:00:00.000Z",
            flaggedAt: null,
            missingCriticalFields: [],
            requiresReview: false,
            reviewState: "unconfirmed",
            source: "gemini",
            sources: { policyNumber: { page: 1, snippet: "1668177" } },
            summaryLanguage: "el",
        },
        analysis: {
            clarity: {
                checklistScores: [],
                coverageSnapshot: { covered: [], notCovered: [], limits: [], deductibles: [], exclusions: [] },
                generatedAt: "2026-08-21T10:01:00.000Z",
                plainLanguageSummary: { en: "…", el: "…" },
                priorityActions: [],
                savingsOpportunities: [],
            },
            pipeline: {
                completedAt: "2026-08-21T10:02:00.000Z",
                lastFailureAt: null,
                lastFailureCode: null,
                missingSections: [],
                provider: "gemini",
                runId: "run_1",
                status: "completed",
            },
        },
        processingError: { code: "TOKEN_LIMIT_BLOCKED", message: "blocked", occurredAt: "2026-08-21T10:03:00.000Z", retryable: true },
        policyholder: { email: "x@example.test", name: "X", phone: null, taxId: null },
        insured: { email: "x@example.test", name: "X", phone: null, taxId: null },
    }

    /** Dev, 2026-09-11: the confirmation keys, and a legacy renewalHistory entry (`endDate`, `source`). */
    const DEV_ROW = {
        policy: { insurerName: "Interamerican", policyNumber: "MT-1", lineOfBusiness: "motor", premium: { amount: 420 } },
        extraction: {
            source: "gemini",
            extractedAt: "2026-07-13T10:00:00.000Z",
            confidence: { overall: 70, fields: {} },
            missingCriticalFields: [],
            requiresReview: true,
            reviewState: "confirmed",
            confirmedAt: "2026-07-14T10:00:00.000Z",
            confirmedBy: "policyholder",
            confirmedByUserId: "user_1",
            flaggedAt: null,
            dateParse: { startDate: "ok", endDate: "ok" },
        },
        renewalHistory: [{ endDate: "2026-01-01T00:00:00.000Z", source: "renewal_upload" }],
    }

    it("a production row with every observed key parses", () => {
        const parsed = StoredAcordDataSchema.safeParse(PRODUCTION_ROW)
        expect(parsed.success, JSON.stringify(parsed.error?.issues ?? [], null, 1)).toBe(true)
    })

    it("a dev row with the confirmation keys and a legacy renewal entry parses", () => {
        const parsed = StoredAcordDataSchema.safeParse(DEV_ROW)
        expect(parsed.success, JSON.stringify(parsed.error?.issues ?? [], null, 1)).toBe(true)
    })

    it("a v2 row with no envelope at all still parses — the envelope is optional everywhere", () => {
        const parsed = StoredAcordDataSchema.safeParse({ _version: 2, policy: { policyNumber: "1" }, coverages: [] })
        expect(parsed.success).toBe(true)
    })

    it("the extraction schema is untouched: what the model is asked for has not grown", () => {
        expect(Object.keys(AcordDataSchema.shape)).not.toContain("extraction")
        expect(Object.keys(AcordDataSchema.shape)).not.toContain("policyholder")
    })
})

// ── Probes ────────────────────────────────────────────────────────────────────

describe("probe — the guard turns red on the shapes it exists to catch", () => {
    it("an envelope key nobody declared fails the strict parse", () => {
        const parsed = StoredAcordDataSchema.safeParse({ extraction: { source: "gemini", nobodyDeclaredThis: 1 } })
        expect(parsed.success).toBe(false)
    })

    it("a wrong-typed envelope value fails", () => {
        const parsed = StoredAcordDataSchema.safeParse({ processingError: { code: 42 } })
        expect(parsed.success).toBe(false)
    })

    it("a writer key outside the schema is reported by the literal scan", () => {
        const written = literalKeysUnder(`data: { pipeline: { runId: "r", brandNew: true } }`, "pipeline")
        const undeclared = written.filter((k) => !shapeKeys(AnalysisPipelineSchema).includes(k))
        expect(undeclared).toEqual(["brandNew"])
    })
})
