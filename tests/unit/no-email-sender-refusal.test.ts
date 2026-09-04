import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { RECIPIENT_NOT_CONTACTABLE, sendEmail } from "@/lib/email/email-service"
import { emailAdapter } from "@/lib/notifications/channels/email"
import { syntheticNoEmailAddress } from "@/lib/identity/synthetic-email"

/**
 * A customer with NO email (owner decision D3) carries a synthetic address
 * under `customers.policywallet.invalid`. Nothing may ever be sent to it.
 *
 * The refusal lives in ONE place — `sendEmail` in lib/email/email-service.ts,
 * the only function in the repo that talks to the mail provider — so no
 * caller has to remember. That claim is only worth something if it is
 * enumerated: this file walks app/, lib/, components/ and scripts/ for
 * anything that constructs its own transport, and pins the list to exactly
 * that one file. The bus's email channel additionally records such an
 * address as "no_address" so the retry loop never re-attempts it.
 */

const repoRoot = join(__dirname, "..", "..")

function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
        const full = join(dir, entry)
        if (entry === "node_modules" || entry.startsWith(".")) return []
        if (statSync(full).isDirectory()) return sourceFiles(full)
        return /\.(ts|tsx|js|mjs)$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry) ? [full] : []
    })
}

function stripComments(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
}

/**
 * What "a mail transport" looks like in code: the provider's SMTP endpoint,
 * or any of the SDKs that would replace it. Comments are stripped first — the
 * dispatch guard's header quotes the endpoint URL in prose.
 */
const TRANSPORT = /api\.brevo\.com\/v3\/smtp|\bnodemailer\b|@sendgrid\/mail|from\s+["']resend["']|\bcreateTransport\(|\bsmtp:\/\//

export function mailTransportFiles(files: Array<{ path: string; source: string }>): string[] {
    return files.filter((f) => TRANSPORT.test(stripComments(f.source))).map((f) => f.path)
}

describe("the mail transport exists in exactly one file", () => {
    const roots = ["app", "lib", "components", "scripts"].map((r) => join(repoRoot, r))
    const files = roots.flatMap(sourceFiles).map((path) => ({
        path: path.slice(repoRoot.length + 1),
        source: readFileSync(path, "utf8"),
    }))

    it("walks a meaningful universe", () => {
        expect(files.length).toBeGreaterThan(200)
    })

    it("is lib/email/email-service.ts and nothing else", () => {
        expect(
            mailTransportFiles(files),
            "A second mail transport bypasses the no-email refusal in sendEmail. " +
                "Route the send through lib/email/email-service.ts instead.",
        ).toEqual(["lib/email/email-service.ts"])
    })

    it("every sendEmail caller imports the one transport", () => {
        const callers = files.filter((f) => /\bsendEmail\(/.test(stripComments(f.source)) && f.path !== "lib/email/email-service.ts")
        expect(callers.length).toBeGreaterThanOrEqual(8)
        // Static `import { sendEmail } from …` or the lazy
        // `const { sendEmail } = await import("…")` the admin actions use.
        const STATIC = /import\s*\{[^}]*\bsendEmail\b[^}]*\}\s*from\s*["']@\/lib\/email\/email-service["']/
        const LAZY = /\{[^}]*\bsendEmail\b[^}]*\}\s*=\s*await\s+import\(\s*["']@\/lib\/email\/email-service["']\s*\)/
        for (const f of callers) {
            expect(
                STATIC.test(f.source) || LAZY.test(f.source),
                `${f.path} calls sendEmail( but does not import it from @/lib/email/email-service`,
            ).toBe(true)
        }
    })

    it("the matcher is proven against a committed probe", () => {
        const probe = readFileSync(join(repoRoot, "tests/fixtures/guard-probes/email-transport-second.ts.txt"), "utf8")
        expect(mailTransportFiles([{ path: "probe", source: probe }])).toEqual(["probe"])
        // Only the comment mentions the endpoint → not a transport.
        expect(mailTransportFiles([{ path: "prose", source: "// fetch(https://api.brevo.com/v3/smtp/email)\nexport const x = 1\n" }])).toEqual([])
    })
})

describe("sendEmail refuses a no-email customer's synthetic address", () => {
    const originalFetch = globalThis.fetch
    const fetchSpy = vi.fn()
    beforeEach(() => { globalThis.fetch = fetchSpy as unknown as typeof fetch })
    afterEach(() => { globalThis.fetch = originalFetch; fetchSpy.mockReset() })

    it("returns the refusal without touching the network or the dispatch guard", async () => {
        // In a test run the dispatch guard THROWS on a real send attempt, so a
        // clean return here proves the refusal happened before it.
        const result = await sendEmail({
            to: syntheticNoEmailAddress("123456783"),
            subject: "Πρόσκληση",
            html: "<p>x</p>",
        })
        expect(result).toEqual({ success: false, error: RECIPIENT_NOT_CONTACTABLE })
        expect(fetchSpy).not.toHaveBeenCalled()
    })

    it("refuses the address whatever its case", async () => {
        const result = await sendEmail({ to: syntheticNoEmailAddress("123456783").toUpperCase(), subject: "x", html: "x" })
        expect(result.success).toBe(false)
        expect(result.error).toBe(RECIPIENT_NOT_CONTACTABLE)
    })
})

describe("the notification bus records a synthetic address as no address", () => {
    it("skips instead of failing, so the retry loop never re-attempts it", async () => {
        const outcome = await emailAdapter.send({
            userId: "u-1",
            email: syntheticNoEmailAddress("123456783"),
            title: "Νέο ασφαλιστήριο",
            message: "x",
            language: "el",
            relatedObjectType: null,
            relatedObjectId: null,
        })
        expect(outcome).toEqual({ status: "skipped", reason: "no_address" })
    })
})
