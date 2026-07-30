/**
 * The quick-extract route (POST /api/policies/extract) — the free/Starter parse.
 *
 * It used to hand-roll a raw @google/generative-ai call with no timeout/retry,
 * no token metering, and a regex JSON rescue. These assertions pin that it now
 * runs through the shared IAIService abstraction (so it inherits timeout/retry,
 * the canonical prompt, capability checks, and metering) and carries a DB-backed
 * backstop + audit row — and that the raw-SDK path is gone.
 */

import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const source = readFileSync(join(process.cwd(), "app/api/policies/extract/route.ts"), "utf8")

describe("policies/extract route metering + migration", () => {
    it("no longer imports or instantiates the raw @google/generative-ai SDK", () => {
        // Target the import + instantiation specifically (a prose comment may
        // still name the SDK it was migrated off).
        expect(source).not.toMatch(/from ["']@google\/generative-ai["']/)
        expect(source).not.toMatch(/new GoogleGenerativeAI\(/)
        expect(source).not.toMatch(/getGenerativeModel\(/)
    })

    it("routes extraction through the shared AI service with a userId (metered)", () => {
        expect(source).toMatch(/getAIService\(\)/)
        expect(source).toMatch(/\.extractPolicyData\(/)
        expect(source).toMatch(/userId:\s*authResult\.dbUser\.id/)
    })

    it("has a durable DB backstop + auditable spend row", () => {
        expect(source).toMatch(/enforceBillableCallPolicy\(/)
        expect(source).toMatch(/POLICY_EXTRACT_REQUESTED/)
        expect(source).toMatch(/activityLog\.create\(/)
    })

    it("gates + audits BEFORE the billable extraction call", () => {
        const call = source.indexOf(".extractPolicyData(")
        expect(call, "extractPolicyData call site not found — test is stale").toBeGreaterThan(-1)
        expect(source.indexOf("enforceBillableCallPolicy(")).toBeLessThan(call)
        expect(source.indexOf("POLICY_EXTRACT_REQUESTED")).toBeLessThan(call)
    })

    it("sanitizes the filename before it reaches the provider", () => {
        expect(source).toMatch(/sanitizeDisplayName\(file\.name\)/)
    })
})
