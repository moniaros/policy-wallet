/**
 * Cost controls on the billable agent PDF scan (parsePolicyPdfWithGemini).
 *
 * STATUS.md flagged this as the live money exposure: a real billable AI
 * extraction whose only cap was a per-instance Redis limit and which wrote no
 * audit row to count. These assertions pin the instance-independent DB backstop
 * and the audit row at source level so the hole cannot silently reopen.
 */

import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const source = readFileSync(join(process.cwd(), "app/(protected)/agent/actions.ts"), "utf8")

/** The parsePolicyPdfWithGemini body, up to the next exported function. */
function scanBody(): string {
    const start = source.indexOf("export async function parsePolicyPdfWithGemini")
    expect(start, "parsePolicyPdfWithGemini not found — test is stale").toBeGreaterThan(-1)
    const rest = source.slice(start + 1)
    const end = rest.indexOf("\nexport async function ")
    return end === -1 ? rest : rest.slice(0, end)
}

describe("parsePolicyPdfWithGemini cost controls", () => {
    it("has a rate limit + durable DB backstop, not Redis alone", () => {
        const body = scanBody()
        expect(body).toMatch(/enforceBillableCallPolicy\(/)
        expect(body).toMatch(/agent-scan:/)
        expect(body).toMatch(/AGENT_POLICY_SCANNED/)
    })

    it("writes an auditable spend row the backstop can count", () => {
        const body = scanBody()
        expect(body).toMatch(/activityLog\.create\(/)
        expect(body).toMatch(/AGENT_POLICY_SCANNED/)
    })

    it("gates + audits BEFORE the billable extraction call", () => {
        const body = scanBody()
        const call = body.indexOf("aiService.extractPolicyData(")
        expect(call, "extractPolicyData call site not found — test is stale").toBeGreaterThan(-1)
        expect(body.indexOf("enforceBillableCallPolicy(")).toBeLessThan(call)
        expect(body.indexOf("AGENT_POLICY_SCANNED")).toBeLessThan(call)
    })

    it("does not write an email into the audit row (GDPR audit M3)", () => {
        const body = scanBody()
        expect(body).not.toMatch(/adminEmail:\s*authResult\.dbUser\.email/)
    })

    it("sends the provider the MIME type the validator established, not file.type", () => {
        // `file.type` is whatever the browser supplied — empty for a phone's
        // HEIC photo — and the provider rejected it. The validator has already
        // read the magic bytes; its canonical type is the only honest one.
        const body = scanBody()
        // The extraction input is built by toValidatedAIDocument(verdict, bytes,
        // mime) — the document gate's constructor — so the canonical type is
        // its third argument rather than an object-literal field.
        expect(body).toMatch(/toValidatedAIDocument\([^)]*scanValidation\.value\.canonicalMime/)
        expect(body).not.toMatch(/mimeType:\s*file\.type/)
    })
})
