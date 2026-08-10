import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import { globSync } from "glob"
import { scrubEvent, scrubText } from "@/lib/observability/sentry-scrub"
import { emailDomain, emailFingerprint, redactEmails } from "@/lib/observability/pii"

/**
 * Sentry is a processor outside the DSR export and erasure paths. Anything that
 * reaches it is not in the export a customer is entitled to and is not deleted
 * when they ask to be forgotten — so it must not contain them.
 */
describe("nothing personal reaches the error tracker", () => {
    it("redacts addresses, IBANs and Greek tax ids from any string", () => {
        expect(scrubText("bounced for maria@example.gr")).toBe("bounced for <redacted:email>")
        expect(scrubText("iban GR1601101250000000012300695")).toBe("iban <redacted:iban>")
        expect(scrubText("afm EL123456789 rejected")).toBe("afm <redacted:taxid> rejected")
    })

    it("scrubs the message, the tags and the exception value", () => {
        const event = scrubEvent({
            message: "Brevo send failed (400): invalid recipient nikos@example.gr",
            tags: { email_to: "nikos@example.gr", endpoint: "/api/v1/x" },
            exception: { values: [{ value: "could not reach nikos@example.gr" }] },
        } as any)

        expect(JSON.stringify(event)).not.toContain("nikos@example.gr")
        // Non-personal fields survive: scrubbing must not cost us the diagnosis.
        expect(event.tags.endpoint).toBe("/api/v1/x")
    })

    it("never throws away an error report to protect against a leak", () => {
        // A scrubber that can throw turns a reportable error into no report at
        // all, which is a worse failure than the one it guards.
        const weird: any = { message: 42, tags: "not-an-object", exception: { values: "nope" } }
        expect(() => scrubEvent(weird)).not.toThrow()
        expect(scrubEvent(weird)).toBe(weird)
    })

    it("keeps the operational signal that made the leak tempting", () => {
        // The reason call sites logged the address was to answer "same person
        // again?" and "whole domain down?". Both survive without the address.
        expect(emailDomain("Maria@Example.GR")).toBe("example.gr")
        expect(emailFingerprint("maria@example.gr")).toBe(emailFingerprint("MARIA@Example.gr "))
        expect(emailFingerprint("maria@example.gr")).not.toContain("maria")
        expect(redactEmails("failed for maria@example.gr")).toMatch(/^failed for <email:[0-9a-f]{12}>$/)
    })
})

describe("every live Sentry runtime is wired to the scrubber", () => {
    // Three runtimes, three inits. One of them silently not scrubbing is
    // exactly the shape of the bug this file was written for.
    const CONFIGS = ["sentry.server.config.ts", "sentry.edge.config.ts", "instrumentation-client.ts"]

    for (const file of CONFIGS) {
        it(`${file} sets beforeSend and sendDefaultPii:false`, () => {
            const source = readFileSync(file, "utf-8")
            expect(source, `${file} does not scrub outbound events`).toContain("beforeSend: scrubEvent")
            expect(source).toMatch(/sendDefaultPii:\s*false/)
        })
    }

    it("no dead Sentry config pretends to be configuration", () => {
        // `sentry.client.config.ts` was read by nothing under Next 16, so its
        // ignore-list and its development drop were inert while the docs told
        // engineers to edit it. A file that looks like config but is loaded by
        // nobody is worse than no file.
        expect(existsSync("sentry.client.config.ts")).toBe(false)
    })

    it("the client never reports a developer's own branch to production", () => {
        const source = readFileSync("instrumentation-client.ts", "utf-8")
        expect(source).toMatch(/enabled:\s*process\.env\.NODE_ENV === "production"/)
    })
})

describe("no call site hands a raw address to Sentry", () => {
    it("no Sentry tag is assigned a bare email field", () => {
        const files = globSync("{app,lib,components}/**/*.{ts,tsx}", { ignore: "**/node_modules/**" })
        const offenders: string[] = []

        for (const file of files) {
            const source = readFileSync(file, "utf-8")
            if (!source.includes("Sentry.capture")) continue

            // Look only inside the options object of a capture call.
            for (const match of source.matchAll(/Sentry\.capture\w+\([\s\S]{0,600}?\n\s*\}\)/g)) {
                const block = match[0]
                if (!/\btags\s*:/.test(block)) continue
                // `email_domain` / `emailFingerprint(...)` are the sanctioned
                // forms; a bare `email:`/`email_to:` value is the leak.
                if (/\b(?:email|email_to|to|recipient)\s*:\s*(?!.*(?:Fingerprint|Domain|redact))[\w.[\]]*\b(?:email|to)\b/i.test(block)) {
                    offenders.push(`${file}: ${block.slice(0, 120).replace(/\s+/g, " ")}`)
                }
            }
        }

        expect(offenders, `raw address passed to Sentry:\n${offenders.join("\n")}`).toEqual([])
    })
})
