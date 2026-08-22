import { describe, it, expect } from "vitest"
import { execSync } from "node:child_process"
import { readFileSync } from "node:fs"

/**
 * No tracked file carries a real credential.
 *
 * `.env.example` ended with a live PRODUCTION connection string — password and
 * all — appended by accident. It was tracked, so it shipped to everyone who
 * cloned the repo, and `.env.local` is seeded from it, which is how local
 * tooling got pointed at production twice. Nothing caught it: `.env*` is
 * gitignored, so the eye skips the whole family, and `.env.example` is the one
 * member that is deliberately committed.
 *
 * The password has since been rotated, so that value is dead. This exists so
 * the next one is caught the day it is written rather than in an audit.
 *
 * WHAT THIS DOES NOT FLAG, deliberately. A project ref in a HOSTNAME is not a
 * credential — `db.<ref>.supabase.co` and
 * `https://<ref>.supabase.co/storage/v1/...` appear legitimately in audit prose
 * and in test fixtures for URL parsing, and failing on those trains people to
 * add exemptions until the guard means nothing. What matters is a ref TOGETHER
 * WITH a password, which is the shape that grants access. Fixtures that pair a
 * short obviously-fake ref with a fake password (`postgres.abcdef:pw@…`) are
 * therefore invisible here, which is correct: they cannot open anything.
 */

const ALLOWED = new Set([
    "tests/unit/no-credentials-in-tracked-files.test.ts", // the patterns live here
])

/** A Supabase project ref is exactly 20 lowercase letters. */
const REF = "[a-z]{20}"
/** Not an obvious placeholder. */
const NOT_PLACEHOLDER = String.raw`(?!<|\$\{|password\b|YOUR|your-|\.\.\.)`

/** Pooler credential: postgres.<real ref>:<password>@ */
const POOLER_CREDENTIAL = new RegExp(
    String.raw`postgres\.${REF}:${NOT_PLACEHOLDER}[^\s"'@]{4,}@`
)
/** Direct credential: ://<user>:<password>@db.<real ref>.supabase.co */
const DIRECT_CREDENTIAL = new RegExp(
    String.raw`://[^\s"':/]+:${NOT_PLACEHOLDER}[^\s"'@]{4,}@db\.${REF}\.supabase\.co`
)
/** A signed JWT — anon/service keys and access tokens all have this shape. */
const JWT = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/
/** Live Stripe keys and webhook secrets. Test keys are deliberately not here:
 *  they cannot move real money, and the one place a `sk_test_` appears is an
 *  audit quoting Stripe's own PUBLIC documentation key as the subject of a
 *  finding. */
const STRIPE_LIVE = /\b(?:sk|rk)_live_[A-Za-z0-9]{20,}/
const WEBHOOK = /\bwhsec_[A-Za-z0-9]{20,}/

const PATTERNS: Array<[string, RegExp]> = [
    ["supabase pooler credential (ref + password)", POOLER_CREDENTIAL],
    ["supabase direct credential (ref + password)", DIRECT_CREDENTIAL],
    ["JWT / API key", JWT],
    ["stripe LIVE key", STRIPE_LIVE],
    ["stripe webhook secret", WEBHOOK],
]

const NUL = String.fromCharCode(0)

function trackedTextFiles(): string[] {
    return execSync("git ls-files", { encoding: "utf-8", maxBuffer: 32 * 1024 * 1024 })
        .split("\n")
        .filter(Boolean)
        .filter((f) => !/\.(png|jpe?g|gif|webp|heic|ico|pdf|woff2?|ttf|zip|lock)$/i.test(f))
        .filter((f) => !f.endsWith("package-lock.json"))
        .filter((f) => !ALLOWED.has(f))
}

describe("no tracked file carries a real credential", () => {
    const files = trackedTextFiles()

    it("finds a meaningful number of tracked files (the scan is not vacuous)", () => {
        expect(files.length).toBeGreaterThan(500)
    })

    it("fires on the line that was actually in .env.example", () => {
        // A guard never shown to fail is not a guard. This is the real shape of
        // the leaked line, with the ref and password swapped for equivalents —
        // the STRUCTURE is what has to match.
        const leaked =
            'DIRECT_URL="postgresql://postgres.abcdefghijklmnopqrst:hunter2hunter2@aws-0-eu-west-3.pooler.supabase.com:5432/postgres"'
        expect(POOLER_CREDENTIAL.test(leaked)).toBe(true)

        const direct =
            'postgresql://postgres:hunter2hunter2@db.abcdefghijklmnopqrst.supabase.co:5432/postgres'
        expect(DIRECT_CREDENTIAL.test(direct)).toBe(true)
    })

    it("does not fire on the placeholder that replaced it, or on a hostname alone", () => {
        // If it flagged these, the fix for the leak would itself fail the guard.
        const placeholder =
            'DIRECT_URL="postgresql://postgres.<your-dev-project-ref>:<password>@<region>.pooler.supabase.com:5432/postgres"'
        expect(POOLER_CREDENTIAL.test(placeholder)).toBe(false)

        // A ref in a hostname, with no password: audit prose and URL fixtures.
        const hostOnly = "https://abcdefghijklmnopqrst.supabase.co/storage/v1/object/policies/x.pdf"
        expect(POOLER_CREDENTIAL.test(hostOnly)).toBe(false)
        expect(DIRECT_CREDENTIAL.test(hostOnly)).toBe(false)

        // A fixture pairing a short fake ref with a fake password opens nothing.
        const fixture = "postgresql://postgres.abcdef:pw@aws-1-eu-west-3.pooler.supabase.com:6543/postgres"
        expect(POOLER_CREDENTIAL.test(fixture)).toBe(false)
    })

    it("no tracked file matches any credential pattern", () => {
        const offenders: string[] = []
        for (const file of files) {
            let src: string
            try {
                src = readFileSync(file, "utf-8")
            } catch {
                continue
            }
            if (src.includes(NUL)) continue // binary
            for (const [label, pattern] of PATTERNS) {
                const m = pattern.exec(src)
                if (!m) continue
                const line = src.slice(0, m.index).split("\n").length
                offenders.push(`${file}:${line} — ${label}`)
            }
        }
        expect(
            offenders,
            "These tracked files carry a real credential. ROTATE the value first, " +
                "then replace it with a placeholder — scrubbing the file alone " +
                "leaves the secret in git history:\n  " +
                offenders.join("\n  ")
        ).toEqual([])
    })
})
