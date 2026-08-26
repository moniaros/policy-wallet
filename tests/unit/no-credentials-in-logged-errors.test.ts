/**
 * SEC-01 — no thrown error may carry a credential to a log sink.
 *
 * A Supabase session object reached the Vercel runtime logs eight times
 * (2026-08-23 ×7, 2026-08-26 ×1). The cookie bug in proxy.ts only made the
 * throw REACHABLE; the leak is that `_recoverAndRefresh` interpolates the whole
 * session into its message and nothing between that throw and the sink removed
 * it. Vercel runtime logs cannot be redacted or deleted after the fact, so the
 * only control that works is refusing to emit the payload in the first place.
 *
 * There are exactly two sinks an error can reach from this codebase:
 *
 *   1. Sentry — covered by `scrubEvent`/`scrubText`, which until now redacted
 *      email, IBAN, tax id and file names and would have passed an access token
 *      and a refresh token through untouched.
 *   2. The platform log, via an unhandled throw in middleware — which is the
 *      one that actually leaked, and which Sentry's beforeSend never sees.
 *
 * Both are asserted here.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "fs"
import { redactCredentials, scrubText } from "../../lib/observability/sentry-scrub"

const FIXTURE = "tests/fixtures/session-shaped-error-message.txt"
const leaked = () => readFileSync(FIXTURE, "utf8")

/** The synthetic secrets planted in the fixture. */
const SYNTHETIC_JWT_HEAD = "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9"
const SYNTHETIC_REFRESH = "fake9opaque2tok"

function stripComments(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")
}

describe("SEC-01 credential redaction", () => {
    it("PROBE: the fixture really does contain both credential shapes", () => {
        // Without this, every assertion below could pass against an empty file.
        // `toContain("")` is true of every document.
        const raw = leaked()
        expect(raw).toContain(SYNTHETIC_JWT_HEAD)
        expect(raw).toContain(SYNTHETIC_REFRESH)
        expect(raw).toMatch(/"refresh_token"\s*:/)
    })

    it("removes the JWT access token", () => {
        const out = redactCredentials(leaked())
        expect(out).not.toContain(SYNTHETIC_JWT_HEAD)
        expect(out).toContain("<redacted:")
    })

    it("removes the OPAQUE refresh token, which no value-shaped pattern can find", () => {
        // This is the arm that matters most: an access token dies of old age in
        // an hour, a refresh token mints new ones until it is revoked. It is
        // findable only by its JSON key.
        const out = redactCredentials(leaked())
        expect(out).not.toContain(SYNTHETIC_REFRESH)
    })

    it("leaves no eyJ-shaped token anywhere in the output", () => {
        expect(redactCredentials(leaked())).not.toMatch(/\beyJ[A-Za-z0-9_-]{5,}\./)
    })

    it("covers the Sentry sink too, not just the direct one", () => {
        const out = scrubText(leaked())
        expect(out).not.toContain(SYNTHETIC_JWT_HEAD)
        expect(out).not.toContain(SYNTHETIC_REFRESH)
    })

    it("PROBE: the pre-fix scrubber passed BOTH credentials through untouched", () => {
        // `scrubText` exactly as it stood before SEC-01 — the four PII patterns
        // and nothing else. Pinned here rather than described, so the claim
        // "credentials were not redacted" is reproducible instead of asserted.
        const legacyScrubText = (value: string) =>
            value
                .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "<redacted:email>")
                .replace(/\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g, "<redacted:iban>")
                .replace(/\b\d{9}\b/g, "<redacted:taxid>")
                .replace(/\b[\w .()-]{1,120}\.(?:pdf|jpe?g|png)\b/gi, "<redacted:filename>")

        const out = legacyScrubText(leaked())
        expect(out).toContain(SYNTHETIC_JWT_HEAD)
        expect(out).toContain(SYNTHETIC_REFRESH)
    })

    it("redacts a bearer header and a supabase secret key", () => {
        const out = redactCredentials(
            `Authorization: Bearer abcdef0123456789 and key sb_secret_abcdef012345`
        )
        expect(out).not.toContain("abcdef0123456789")
        expect(out).not.toContain("sb_secret_abcdef012345")
    })

    it("does not redact ordinary text, so an error stays debuggable", () => {
        const ordinary = "Cannot create property 'user' on string at _recoverAndRefresh"
        expect(redactCredentials(ordinary)).toBe(ordinary)
    })
})

describe("SEC-01 the middleware sink", () => {
    const proxy = () => stripComments(readFileSync("proxy.ts", "utf8"))

    it("never lets getUser() throw escape into the platform log", () => {
        const source = proxy()
        expect(source).toMatch(/auth\.getUser\s*\(/)
        // The call must sit inside a try, and the catch must redact.
        const guarded = /try\s*\{[\s\S]*?auth\.getUser\s*\([\s\S]*?\}\s*catch[\s\S]*?redactCredentials\s*\(/
        expect(source, "proxy.ts must catch the session throw and redact it").toMatch(guarded)
    })

    it("PROBE: an UNWRAPPED getUser does not satisfy the guard", () => {
        // proxy.ts as it shipped: the call bare, its throw free to reach the
        // platform log with the session still in the message.
        const before = stripComments(`
            const supabase = createServerClient(url, key, { cookies: {} })
            const {
                data: { user },
            } = await supabase.auth.getUser()
            const isLoggedIn = Boolean(user)
        `)
        const guarded = /try\s*\{[\s\S]*?auth\.getUser\s*\([\s\S]*?\}\s*catch[\s\S]*?redactCredentials\s*\(/
        expect(before).toMatch(/auth\.getUser\s*\(/)
        expect(before).not.toMatch(guarded)
    })

    it("PROBE: prose about the defect is not the defect", () => {
        // proxy.ts carries a tombstone comment naming getUser and the leak.
        // An absence check that reads comments finds the words describing the
        // problem and reports the problem. Fourth time in this run.
        const withCommentOnly = stripComments(`
            /* getUser() can throw; we used to let it escape, see redactCredentials */
            const r = await supabase.auth.getUser()
        `)
        expect(withCommentOnly).not.toMatch(/redactCredentials/)
    })
})
