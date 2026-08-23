import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync } from "fs"
import path from "path"
import { resolveSentryEnvironment } from "@/lib/observability/sentry-scrub"

/**
 * Every Sentry runtime reports the same `environment` for the same deployment.
 *
 * They did not. The server and edge runtimes let the SDK derive the tag from
 * `VERCEL_ENV` (`vercel-preview` / `vercel-production`); the client hardcoded
 * `process.env.NODE_ENV`, which is `"production"` on a PREVIEW build as well.
 *
 * The cost was a mis-triage, not an untidy tag. On 2026-08-22 POLICYWALLET-6
 * arrived tagged `production` while POLICYWALLET-5 — its server-side twin, same
 * request, same deployment — was tagged `vercel-preview`. Filtering on
 * `environment` to ask "is this hitting customers?" answered wrong in both
 * directions, and the only thing that revealed the truth was a raw deployment
 * hostname in the URL.
 *
 * The universe is enumerated from the FILESYSTEM: any file that calls
 * `Sentry.init` is covered, including one added after this test was written.
 * A list of the three that exist today would guard those three, not the rule.
 */
const ROOT = process.cwd()

function sentryInitFiles(): string[] {
    return readdirSync(ROOT)
        .filter((f) => /^(sentry\..*\.config\.ts|instrumentation-client\.ts)$/.test(f))
        .filter((f) => readFileSync(path.join(ROOT, f), "utf8").includes("Sentry.init("))
}

describe("every Sentry runtime tags the environment the same way", () => {
    const files = sentryInitFiles()

    it("finds the init files at all (a rename must not silently empty this guard)", () => {
        expect(files.length).toBeGreaterThanOrEqual(3)
        expect(files).toContain("instrumentation-client.ts")
        expect(files).toContain("sentry.server.config.ts")
    })

    it.each(sentryInitFiles())("%s derives the environment rather than hardcoding it", (file) => {
        const src = readFileSync(path.join(ROOT, file), "utf8")
        expect(src).toContain("resolveSentryEnvironment")
        // The specific mistake: NODE_ENV standing in for the deployment target.
        expect(src).not.toMatch(/environment:\s*process\.env\.NODE_ENV/)
    })

    it.each(sentryInitFiles())("%s drops a developer's own errors", (file) => {
        const src = readFileSync(path.join(ROOT, file), "utf8")
        expect(src).toMatch(/enabled:\s*process\.env\.NODE_ENV === "production"/)
    })
})

describe("resolveSentryEnvironment", () => {
    it("distinguishes a preview deployment from production — the whole point", () => {
        // Both are NODE_ENV=production. Only VERCEL_ENV separates them.
        expect(resolveSentryEnvironment({ vercelEnv: "preview", nodeEnv: "production" }))
            .toBe("vercel-preview")
        expect(resolveSentryEnvironment({ vercelEnv: "production", nodeEnv: "production" }))
            .toBe("vercel-production")
    })

    it("matches the vocabulary the server SDK already emits", () => {
        // Existing issues carry `vercel-production` / `vercel-preview`; changing
        // the prefix would split every issue's history in two.
        expect(resolveSentryEnvironment({ vercelEnv: "production" })).toMatch(/^vercel-/)
    })

    it("honours an explicit override above everything else", () => {
        expect(
            resolveSentryEnvironment({
                sentryEnvironment: "staging",
                vercelEnv: "preview",
                nodeEnv: "production",
            })
        ).toBe("staging")
    })

    it("falls back to the build mode off Vercel", () => {
        expect(resolveSentryEnvironment({ nodeEnv: "development" })).toBe("development")
        expect(resolveSentryEnvironment({ nodeEnv: "test" })).toBe("test")
    })

    it("never returns an empty tag", () => {
        expect(resolveSentryEnvironment({})).toBe("development")
        expect(resolveSentryEnvironment({ sentryEnvironment: "  ", vercelEnv: "  ", nodeEnv: "" }))
            .toBe("development")
    })
})
