/**
 * Cost + safety controls on the billable Q&A path (askPolicyQuestion).
 *
 * The Q&A action previously had NO input length cap, NO injection guard, and NO
 * rate limit — only a daily tier count and a flat token estimate. These gates
 * are pinned at source level (the MEDIC pattern) so a future edit that drops the
 * guard or the backstop fails this suite rather than silently reopening the
 * spend or the injection surface.
 */

import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const source = readFileSync(join(process.cwd(), "app/(protected)/wallet/actions.ts"), "utf8")

/** The askPolicyQuestion body, up to the next exported function. */
function askBody(): string {
    const start = source.indexOf("export async function askPolicyQuestion")
    expect(start, "askPolicyQuestion not found — test is stale").toBeGreaterThan(-1)
    const rest = source.slice(start + 1)
    const end = rest.indexOf("\nexport async function ")
    return end === -1 ? rest : rest.slice(0, end)
}

describe("askPolicyQuestion cost + safety controls", () => {
    it("guards the free-text question before any AI call", () => {
        const body = askBody()
        expect(body).toMatch(/guardUserText\(/)
        expect(body).toMatch(/INPUT_REJECTED/)
        expect(body).toMatch(/QUESTION_TOO_LONG/)
    })

    it("has a rate limit + durable DB backstop", () => {
        const body = askBody()
        expect(body).toMatch(/enforceBillableCallPolicy\(/)
        expect(body).toMatch(/policy-qa:/)
        expect(body).toMatch(/POLICY_QUESTION_ASKED/)
    })

    it("runs the guard and the backstop BEFORE the AI call, not after", () => {
        const body = askBody()
        const call = body.indexOf("aiService.askQuestion(")
        expect(call, "askQuestion call site not found — test is stale").toBeGreaterThan(-1)
        expect(body.indexOf("guardUserText(")).toBeLessThan(call)
        expect(body.indexOf("enforceBillableCallPolicy(")).toBeLessThan(call)
    })

    it("sends the sanitized question to the model, not the raw input", () => {
        const body = askBody()
        // The sanitized value from the guard is what reaches the provider.
        expect(body).toMatch(/const safeQuestion = guard\.sanitized/)
        expect(body).toMatch(/\n\s*safeQuestion,/)
    })

    it("writes no email into the injection-block audit row (GDPR audit M3)", () => {
        const body = askBody()
        const rejectRow = body.indexOf("AI_INPUT_REJECTED")
        expect(rejectRow, "AI_INPUT_REJECTED audit row not found").toBeGreaterThan(-1)
        // The block above the row sets adminEmail to an empty string.
        expect(body).toMatch(/AI_INPUT_REJECTED/)
        expect(body).not.toMatch(/adminEmail:\s*authResult\.dbUser\.email[\s\S]*AI_INPUT_REJECTED/)
    })
})
