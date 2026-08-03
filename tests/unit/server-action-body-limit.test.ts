import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { MAX_UPLOAD_SIZE_BYTES } from "@/lib/constants/time"
import { preflightUploadSize } from "@/lib/security/file-upload"

/**
 * Regression guard for Sentry POLICYWALLET-V.
 *
 * Policy PDFs are uploaded through Server Actions, so TWO independent ceilings
 * apply: Next's `serverActions.bodySizeLimit` (enforced by the runtime, BEFORE
 * the action body runs) and the app's own `validateUploadFile` maxBytes. When
 * the runtime ceiling is the lower of the two, every file in the gap is killed
 * before the action executes — the app's size-rejection message can never fire
 * and the client only sees Next's opaque "An unexpected response was received
 * from the server." That is exactly what shipped: no bodySizeLimit was set, so
 * the 1 MB default silently capped a 10-15 MB contract.
 *
 * The config is read as text rather than imported: next.config.ts pulls in the
 * PWA and Sentry wrappers, which are not loadable in the jsdom test env.
 */
const CONFIG_SOURCE = readFileSync(join(process.cwd(), "next.config.ts"), "utf8")

/** Mirrors `bytes.parse` for the units Next accepts in bodySizeLimit. */
function parseSizeToBytes(value: string): number {
    const match = /^([\d.]+)\s*(b|kb|mb|gb)$/i.exec(value.trim())
    if (!match) throw new Error(`Unparseable size: ${value}`)
    const scale = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 }
    return Number(match[1]) * scale[match[2].toLowerCase() as keyof typeof scale]
}

function configuredBodyLimitBytes(): number {
    const match = /bodySizeLimit:\s*["']([^"']+)["']/.exec(CONFIG_SOURCE)
    if (!match) {
        throw new Error(
            "next.config.ts does not set experimental.serverActions.bodySizeLimit. " +
                "Next then defaults to 1 MB, which is BELOW the app's own upload ceiling — " +
                "uploads fail at the transport layer before the action runs (POLICYWALLET-V)."
        )
    }
    return parseSizeToBytes(match[1])
}

describe("Server Action body limit vs. the upload validation contract", () => {
    it("is configured explicitly rather than relying on Next's 1 MB default", () => {
        expect(configuredBodyLimitBytes()).toBeGreaterThan(1024 * 1024)
    })

    it("exceeds MAX_UPLOAD_SIZE_BYTES, so the app's validator is the binding limit", () => {
        // Strictly greater: at parity the multipart envelope and sibling form
        // fields would push a maximum-size file over the runtime ceiling.
        expect(configuredBodyLimitBytes()).toBeGreaterThan(MAX_UPLOAD_SIZE_BYTES)
    })

    it("leaves real headroom for the multipart envelope, not just one byte", () => {
        expect(configuredBodyLimitBytes() - MAX_UPLOAD_SIZE_BYTES).toBeGreaterThanOrEqual(512 * 1024)
    })

    it("covers the 10 MB ceiling the agent scan/commit actions validate with", () => {
        expect(configuredBodyLimitBytes()).toBeGreaterThan(10 * 1024 * 1024)
    })
})

describe("preflightUploadSize", () => {
    it("rejects an empty file", () => {
        expect(preflightUploadSize(0)).toBe("empty")
    })

    it("rejects a file over the ceiling", () => {
        expect(preflightUploadSize(MAX_UPLOAD_SIZE_BYTES + 1)).toBe("too_large")
    })

    it("accepts a file exactly at the ceiling", () => {
        expect(preflightUploadSize(MAX_UPLOAD_SIZE_BYTES)).toBeNull()
    })

    it("honours a caller-supplied ceiling below the global one", () => {
        const tenMb = 10 * 1024 * 1024
        expect(preflightUploadSize(tenMb + 1, tenMb)).toBe("too_large")
        expect(preflightUploadSize(tenMb, tenMb)).toBeNull()
    })

    it("catches the sizes that used to die at the transport layer", () => {
        // 1 MB < size <= 10 MB: rejected by the runtime pre-fix, and NOT caught
        // by any client check. Now the pre-flight passes them and the raised
        // body limit lets them through to the action's own validation.
        const twoMb = 2 * 1024 * 1024
        expect(preflightUploadSize(twoMb, 10 * 1024 * 1024)).toBeNull()
        expect(configuredBodyLimitBytes()).toBeGreaterThan(twoMb)
    })
})
