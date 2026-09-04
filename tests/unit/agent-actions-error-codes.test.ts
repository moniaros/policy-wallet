import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { el } from "@/lib/i18n/translations/el"
import { en } from "@/lib/i18n/translations/en"

/**
 * Agent server actions fail with a CODE, and never swallow the cause.
 *
 * The actions used to return English (and some Greek) prose — "Failed to add
 * policy", "You don't have access to this customer", `Customer limit reached
 * (5/5). Upgrade your plan.` — which the modals rendered verbatim on a
 * Greek-default product, and their catches were bare `console.error(e)`,
 * invisible in production. So a storage outage surfaced as one English
 * sentence in a modal and nowhere else.
 *
 * Two rules, both derived from the source rather than a list:
 *   1. every `error: "…"` literal returned is an UPPER_SNAKE code;
 *   2. every `catch` block reports — through reportActionFailure (Sentry +
 *      logger), a direct captureException/logger call, or a rethrow that
 *      delegates to a catch that does.
 */

const repoRoot = join(__dirname, "..", "..")
const ACTIONS = "app/(protected)/agent/actions.ts"
const CODE = /^[A-Z][A-Z0-9_]*$/

function stripComments(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
}

/** Every string literal assigned to `error:` that is not an UPPER_SNAKE code. */
export function proseErrors(source: string): string[] {
    const code = stripComments(source)
    return [...code.matchAll(/\berror:\s*(["'`])((?:(?!\1)[\s\S])*)\1/g)]
        .map((m) => m[2])
        .filter((value) => !CODE.test(value))
}

/** The `{ … }` block starting at the first `{` at or after `from`. */
function blockAfter(code: string, from: number): string {
    const open = code.indexOf("{", from)
    let depth = 0
    for (let i = open; i < code.length; i++) {
        if (code[i] === "{") depth++
        else if (code[i] === "}") {
            depth--
            if (depth === 0) return code.slice(open, i + 1)
        }
    }
    return code.slice(open)
}

const REPORTS = /\breportActionFailure\(|\bcaptureException\(|\blogger\(|\bthrow\b/

/** Every catch block that neither reports nor rethrows. */
export function silentCatches(source: string): string[] {
    const code = stripComments(source)
    const out: string[] = []
    for (const m of code.matchAll(/\bcatch\s*(?:\([^)]*\))?\s*\{/g)) {
        const body = blockAfter(code, m.index! + m[0].length - 1)
        if (!REPORTS.test(body)) {
            const line = code.slice(0, m.index!).split("\n").length
            out.push(`line ${line}: ${body.replace(/\s+/g, " ").slice(0, 80)}`)
        }
    }
    return out
}

describe("agent/actions.ts returns codes, not prose", () => {
    const source = readFileSync(join(repoRoot, ACTIONS), "utf8")

    it("every returned error literal is an UPPER_SNAKE code", () => {
        expect(
            proseErrors(source),
            "These `error:` values are prose. Return a code and add apiErrors.<camelCode> to el + en."
        ).toEqual([])
    })

    it("every catch reports the cause", () => {
        expect(
            silentCatches(source),
            "These catch blocks neither report (reportActionFailure / captureException / logger) nor rethrow."
        ).toEqual([])
    })

    it("every new code has copy in both dictionaries", () => {
        // Codes introduced by the S2 fix, mapped by the same camelCase
        // convention the existing bulk-import codes use.
        const keys = [
            "validationError", "rateLimited", "scanRateLimited", "policyPerCustomerLimit",
            "relationshipTerminated", "customerAccessDenied", "customerExists", "addCustomerFailed",
            "addPolicyFailed", "noFile", "aiNotConfigured", "scanFailed", "noteEmpty", "noteTooLong",
            "opportunityNotFound", "upgradeRequired", "profileUpdateFailed", "policyNotFound",
            "policyOwnerNotFound", "customerLimitReached", "unauthorized",
        ] as const
        for (const key of keys) {
            expect(el.apiErrors[key], `el.apiErrors.${key}`).toBeTruthy()
            expect(en.apiErrors[key], `en.apiErrors.${key}`).toBeTruthy()
        }
    })

    it("the matchers are proven against committed probes", () => {
        const probe = (name: string) => readFileSync(join(repoRoot, "tests/fixtures/guard-probes", name), "utf8")
        expect(proseErrors(probe("action-error-prose.ts.txt"))).toEqual(["You don't have access to this customer"])
        expect(silentCatches(probe("action-catch-silent.ts.txt"))).toHaveLength(1)
        expect(proseErrors(probe("action-error-codes-clean.ts.txt"))).toEqual([])
        expect(silentCatches(probe("action-error-codes-clean.ts.txt"))).toEqual([])
    })
})
