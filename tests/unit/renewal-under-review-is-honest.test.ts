/**
 * A renewal in hand but unread is neither "expired" nor "active".
 *
 * The customer uploads their ανανεωτήριο and the policy page goes on saying
 * «Το ασφαλιστήριο έχει λήξει. Δεν έχετε κάλυψη από αυτό.» That verdict is drawn
 * from the stored dates — the period they have just replaced — and it survives
 * because the analysis that would move those dates is deferred to `after()`,
 * lands after the revalidate, and used to invalidate nothing when it finished.
 *
 * This is the same defect shape the protection score and the monitoring card
 * already carry guards for: a check that has not run reported an outcome anyway.
 * Here the outcome happened to be the alarming one rather than the reassuring
 * one, which makes it no better — the page asserts an absence of cover it cannot
 * establish, over a document that may well disprove it.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolveAttention } from "../../lib/wallet/policy-attention"

const EXPIRED = { daysLeft: -12, analysisFailed: false, reviewItemCount: 0, unverified: false }

describe("renewal under review outranks the date verdicts", () => {
    it("an expired policy with a renewal under review does not claim to be expired", () => {
        expect(resolveAttention({ ...EXPIRED, renewalUnderReview: true }).kind).toBe("renewal_under_review")
    })

    it("...nor does it claim to be active — it claims neither", () => {
        const kind = resolveAttention({
            daysLeft: 200,
            analysisFailed: false,
            reviewItemCount: 0,
            unverified: false,
            renewalUnderReview: true,
        }).kind
        expect(kind).toBe("renewal_under_review")
        expect(kind).not.toBe("clear")
    })

    it("a policy expiring soon with a renewal under review stops counting down", () => {
        // The countdown is the thing the renewal is about to change. Continuing
        // to print «Λήγει σε 9 ημέρες» over a renewal we are reading invites the
        // customer to act on a deadline that may already be gone.
        expect(
            resolveAttention({ ...EXPIRED, daysLeft: 9, renewalUnderReview: true }).kind
        ).toBe("renewal_under_review")
    })

    it("without the flag, the expired verdict is unchanged", () => {
        // The fix must not soften the honest case: a genuinely lapsed policy
        // with nothing in flight still says so.
        expect(resolveAttention(EXPIRED).kind).toBe("expired")
    })

    it("a failed analysis still outranks it", () => {
        // Everything on the page may be stale after a failed run — that remains
        // the precondition for trusting any other line, including this one.
        expect(
            resolveAttention({ ...EXPIRED, analysisFailed: true, renewalUnderReview: true }).kind
        ).toBe("analysis_failed")
    })

    it("both locales carry the copy, and it asserts no coverage state", () => {
        for (const locale of ["el", "en"]) {
            const src = readFileSync(`lib/i18n/translations/${locale}.ts`, "utf-8")
            expect.soft(src, locale).toMatch(/renewal_under_review:/)
        }
        const el = readFileSync("lib/i18n/translations/el.ts", "utf-8")
        const line = el.split("\n").find((l) => l.includes("renewal_under_review:") && l.includes("Ανανεωτήριο"))
        expect(line, "the Greek under-review line").toBeTruthy()
        // It must not reuse the words of either verdict it replaces.
        expect(line).not.toMatch(/έχει λήξει|Δεν έχετε κάλυψη/)
    })
})

describe("the write that makes the state reachable", () => {
    const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")

    it("attachRenewalDocument marks the policy analyzing in the SAME write", () => {
        // Synchronously, before the caller's after() defers the run. Otherwise
        // the revalidate that follows can only ever flush the pre-renewal state,
        // and every surface keyed on `status === 'analyzing'` stays dark.
        const src = strip(readFileSync("lib/services/policy.service.ts", "utf8"))
        const fn = src.slice(src.indexOf("async attachRenewalDocument"))
        const body = fn.slice(0, fn.indexOf("discardOrphanedUploads"))
        expect(body).toMatch(/\$transaction/)
        expect(body).toMatch(/status:\s*'analyzing'/)
    })

    /**
     * Extract a balanced `after( ... )` argument list. Slicing to the next
     * `return` instead would swallow the revalidates that sit AFTER the
     * callback — which is exactly the pre-fix code — and the assertion would
     * pass against the bug it exists to catch. (It did, on the first attempt.)
     */
    const afterCallbackBody = (src: string): string => {
        const start = src.indexOf("after(")
        expect(start, "an after() call").toBeGreaterThan(-1)
        let depth = 0
        for (let i = src.indexOf("(", start); i < src.length; i++) {
            if (src[i] === "(") depth++
            else if (src[i] === ")") {
                depth--
                if (depth === 0) return src.slice(start, i + 1)
            }
        }
        throw new Error("unbalanced after() call")
    }

    it("the deferred run revalidates when it LANDS, not only when it is queued", () => {
        const src = strip(readFileSync("app/(protected)/wallet/actions.ts", "utf8"))
        const fn = src.slice(src.indexOf("export async function addRenewalDocument"))
        // The revalidate must be INSIDE the after() callback. Outside it only,
        // nothing invalidates when the analysis finishes, and the reader is left
        // refreshing by hand until the run happens to complete.
        expect(afterCallbackBody(fn)).toMatch(/revalidatePath/)
    })
})

/**
 * A renewal that names a DIFFERENT policy is refused, and the refusal is
 * explained. Nothing verifies the pairing today — the customer asserts it by
 * choosing the policy and attaching a file — so the wrong ανανεωτήριο would
 * rewrite the period of a contract it does not describe, silently, because a
 * renewal is trusted precisely to move dates.
 */
describe("a renewal that names another policy", () => {
    const MISMATCH = { expected: "1651622", found: "9999999" }

    it("outranks every date verdict, and the in-progress state", () => {
        expect(resolveAttention({ ...EXPIRED, renewalMismatch: MISMATCH }).kind).toBe("renewal_mismatch")
        expect(
            resolveAttention({ ...EXPIRED, renewalUnderReview: true, renewalMismatch: MISMATCH }).kind
        ).toBe("renewal_mismatch")
    })

    it("carries BOTH numbers, so the reader can compare two pieces of paper", () => {
        const a = resolveAttention({ ...EXPIRED, renewalMismatch: MISMATCH })
        expect(a.values).toEqual({ expected: "1651622", found: "9999999" })
    })

    it("points at the documents section, where the offending file is", () => {
        expect(resolveAttention({ ...EXPIRED, renewalMismatch: MISMATCH }).target).toBe("documents")
    })

    it("no mismatch means no change to the existing ordering", () => {
        expect(resolveAttention({ ...EXPIRED, renewalMismatch: null }).kind).toBe("expired")
    })

    it("both locales explain it with both numbers, and say the file was kept", () => {
        for (const locale of ["el", "en"]) {
            const src = readFileSync(`lib/i18n/translations/${locale}.ts`, "utf-8")
            const line = src.split("\n").find((l) => l.includes("renewal_mismatch:") && l.includes("{found}"))
            expect.soft(line, `${locale} mismatch copy`).toBeTruthy()
            expect.soft(line, `${locale} names both numbers`).toContain("{expected}")
        }
        // KEEP-AND-INFORM: the upload is never discarded over a mismatch.
        const el = readFileSync("lib/i18n/translations/el.ts", "utf-8")
        expect(el).toMatch(/renewal_mismatch:.*φυλάχθηκε/)
    })
})
