/**
 * GUARD: the outbound dispatch stub (§0.10, §11.2, §12.3).
 *
 * "No real email or push is dispatched at any point" is a run-halting invariant,
 * and before this guard existed it was held by luck: `sendEmail` short-circuited
 * only when `BREVO_API_KEY` was ABSENT, and that key is set in `.env.local`. Any
 * test or dev process that walked a send path reached api.brevo.com and mailed a
 * real person.
 *
 * This guard has two halves, and it needs both:
 *
 *  1. BEHAVIOUR — the transports throw in a test run rather than opening a socket.
 *  2. ENUMERATION — every outbound transport in the tree is wired to the guard.
 *     Half 1 alone would pass forever while someone adds a third transport that
 *     bypasses it, which is precisely the failure mode CLAUDE.md describes: a
 *     guard scoped to known locations guards those locations, not the invariant.
 */

import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

import { OutboundDispatchInTestError, outboundDispatchAllowed } from "@/lib/outbound/dispatch-guard"

const REPO_ROOT = process.cwd()

function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        if (entry === "node_modules" || entry.startsWith(".")) continue
        const full = join(dir, entry)
        if (statSync(full).isDirectory()) walk(full, out)
        else if (full.endsWith(".ts") && !full.endsWith(".d.ts")) out.push(full)
    }
    return out
}

/**
 * A file is an OUTBOUND TRANSPORT if it makes a network call to somewhere that
 * delivers a message to a human. Enumerated by signature from the filesystem, so
 * a newly added transport is discovered rather than assumed away.
 */
const TRANSPORT_SIGNATURES: { name: string; pattern: RegExp }[] = [
    { name: "Brevo transactional email", pattern: /api\.brevo\.com\/v3\/smtp\/email/ },
    { name: "Web Push (RFC 8291)", pattern: /Content-Encoding":\s*"aes128gcm"/ },
    { name: "FCM push", pattern: /fcm\.googleapis\.com\/v1\/projects/ },
]

function outboundTransportFiles(): { file: string; kinds: string[] }[] {
    const found: { file: string; kinds: string[] }[] = []
    for (const file of walk(join(REPO_ROOT, "lib"))) {
        const src = readFileSync(file, "utf-8")
        const kinds = TRANSPORT_SIGNATURES.filter((s) => s.pattern.test(src)).map((s) => s.name)
        if (kinds.length > 0) found.push({ file: file.slice(REPO_ROOT.length + 1), kinds })
    }
    return found
}

describe("outbound dispatch stub — behaviour", () => {
    it("throws rather than dispatching email from a test run", async () => {
        const { sendEmail } = await import("@/lib/email/email-service")
        await expect(
            sendEmail({ to: "someone@example.com", subject: "should never send", html: "<p>x</p>" })
        ).rejects.toBeInstanceOf(OutboundDispatchInTestError)
    })

    it("throws rather than dispatching push from a test run", async () => {
        const { sendWebPush } = await import("@/lib/push/web-push")
        await expect(
            sendWebPush(
                { endpoint: "https://fcm.googleapis.com/wp/abc", p256dh: "x", auth: "y" },
                { title: "t", body: "b", url: "/home" }
            )
        ).rejects.toBeInstanceOf(OutboundDispatchInTestError)
    })

    it("names the channel and never puts a raw address in the error", () => {
        try {
            outboundDispatchAllowed("email", "sha256:abcd1234")
            throw new Error("guard did not throw under vitest")
        } catch (error) {
            expect(error).toBeInstanceOf(OutboundDispatchInTestError)
            expect((error as Error).message).toContain("email")
            expect((error as Error).message).not.toMatch(/@/)
        }
    })
})

describe("outbound dispatch stub — enumeration", () => {
    it("finds at least the two transports we know exist", () => {
        const files = outboundTransportFiles()
        expect(files.length).toBeGreaterThanOrEqual(2)
    })

    it("keeps the stubbed-transport escape hatch out of product code", () => {
        // `withStubbedOutboundTransport` is the one sanctioned way past the
        // test-run throw. It exists so a transport's OWN tests (encryption,
        // header shape, 410 handling) can run against a replaced `fetch`. If it
        // ever appears outside tests/, the stub has a hole in it and this guard
        // is decorative.
        const offenders = walk(join(REPO_ROOT, "lib"))
            .concat(walk(join(REPO_ROOT, "app")))
            .filter((file) => {
                if (file.endsWith("lib/outbound/dispatch-guard.ts")) return false // the definition
                return readFileSync(file, "utf-8").includes("withStubbedOutboundTransport")
            })
            .map((f) => f.slice(REPO_ROOT.length + 1))

        expect(
            offenders,
            `withStubbedOutboundTransport is a TEST-ONLY escape hatch and must never appear in product code:\n` +
                offenders.map((f) => `  - ${f}`).join("\n")
        ).toEqual([])
    })

    it("wires EVERY outbound transport in lib/ to the dispatch guard", () => {
        const unguarded = outboundTransportFiles().filter(({ file }) => {
            const src = readFileSync(join(REPO_ROOT, file), "utf-8")
            return !src.includes("outboundDispatchAllowed")
        })

        expect(
            unguarded,
            unguarded.length === 0
                ? ""
                : `These files reach an outbound transport without calling outboundDispatchAllowed():\n` +
                  unguarded.map((u) => `  - ${u.file} (${u.kinds.join(", ")})`).join("\n") +
                  `\nWire them to lib/outbound/dispatch-guard.ts. Do not add an exemption here.`
        ).toEqual([])
    })
})
