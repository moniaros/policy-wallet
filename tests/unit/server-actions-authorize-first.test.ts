import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { globSync } from "glob"

/**
 * A `"use server"` export is a public HTTP endpoint.
 *
 * It does not matter that the only button calling it lives behind an admin
 * layout — the action is reachable by anyone who can make a request with a
 * session cookie. So every action must establish WHO is calling before it does
 * anything, and an admin action must establish it before it reads.
 *
 * The concrete bug: `updateGapDefinitionFromForm` queried `gapDefinition` and
 * threw "Gap definition not found", then called a helper that checked the admin
 * role. The write was safe, but any signed-in user could tell a real gap
 * definition id from an invented one by which error came back — and the
 * ordering only held because a function three files away happened to check.
 */

// Every way this codebase establishes identity. Kept explicit rather than a
// loose /auth/i so that a variable merely NAMED `auth` cannot pass as a check.
const AUTH_CALLS = [
    "verifyAdminRole",
    "requireAdmin",
    "getAuthenticatedUser",
    "getAuthenticatedUserOrNull",
    "requireApiUser",
    "requireAgent",
    "requireUser",
    "supabase.auth.getUser",
    "createClient", // followed by supabase.auth.getUser in the same body
]

/**
 * Actions that legitimately run before anyone is signed in, with the reason.
 * The auth flow itself cannot require auth.
 */
const PRE_AUTH_BY_DESIGN: Record<string, string> = {
    "app/auth/actions.ts": "sign-up, sign-in, password reset — all pre-session",
    "app/auth/verify-email/actions.ts": "verifies a token, not a session",
}

/** Reference data with no personal content and no writes. */
const PUBLIC_REFERENCE_DATA = new Set(["getInsurers", "getInsuranceTypes"])

interface ActionBody {
    file: string
    name: string
    body: string
}

function serverActions(): ActionBody[] {
    const out: ActionBody[] = []
    for (const file of globSync("app/**/actions.ts", { ignore: "**/node_modules/**" })) {
        const src = readFileSync(file, "utf-8")
        if (!/^\s*["']use server["']/m.test(src)) continue
        if (PRE_AUTH_BY_DESIGN[file]) continue

        const starts = [...src.matchAll(/export\s+async\s+function\s+(\w+)\s*\(/g)]
        for (let i = 0; i < starts.length; i += 1) {
            const from = starts[i].index!
            const to = i + 1 < starts.length ? starts[i + 1].index! : src.length
            out.push({ file, name: starts[i][1], body: src.slice(from, to) })
        }
    }
    return out
}

const ACTIONS = serverActions()

describe("every server action establishes who is calling", () => {
    it("scans a realistic number of actions", () => {
        // A broken matcher finding nothing would make the checks below pass
        // vacuously — the usual way a guard like this stops guarding.
        expect(ACTIONS.length).toBeGreaterThan(80)
    })

    it("no action touches data without an identity check", () => {
        const unguarded = ACTIONS.filter((a) => {
            if (PUBLIC_REFERENCE_DATA.has(a.name)) return false
            return !AUTH_CALLS.some((call) => a.body.includes(call))
        }).map((a) => `${a.file}::${a.name}`)

        expect(
            unguarded,
            "A \"use server\" export is a public endpoint. These establish no caller\n" +
                "identity — add one of the auth helpers, or record why it is pre-auth:\n" +
                `  ${unguarded.join("\n  ")}`
        ).toEqual([])
    })
})

describe("admin actions authorize before they read", () => {
    const ADMIN_ACTIONS = ACTIONS.filter((a) => a.file.includes("/admin/"))

    it("finds the admin actions", () => {
        expect(ADMIN_ACTIONS.length).toBeGreaterThan(10)
    })

    it("no admin action queries the database ahead of its role check", () => {
        const lateGuard = ADMIN_ACTIONS.filter((a) => {
            const guardAt = a.body.search(/\b(?:verifyAdminRole|requireAdmin)\s*\(/)
            // No role check at all is a finding for the previous test, not a
            // pass here — but only if some OTHER identity check is present.
            // Otherwise a deleted guard would vanish from both tests.
            if (guardAt === -1) return false
            const readAt = a.body.search(/\b(?:db|tx)\.\w+\.\w+\(/)
            if (readAt === -1) return false
            return readAt < guardAt
        }).map((a) => `${a.file}::${a.name}`)

        expect(
            lateGuard,
            "These read the database before checking the admin role, which makes them\n" +
                "an existence oracle for any signed-in user. Move the guard to the top:\n" +
                `  ${lateGuard.join("\n  ")}`
        ).toEqual([])
    })

    it("the gap-definition form action guards first", () => {
        // The specific regression that prompted this file.
        const src = readFileSync("app/(protected)/admin/gaps/actions.ts", "utf-8")
        const guardAt = src.indexOf("await verifyAdminRole()")
        const readAt = src.indexOf("db.gapDefinition")

        // Assert presence before order: `indexOf` returns -1 when absent, and
        // -1 < anything, so an order-only assertion passes LOUDEST exactly when
        // the guard has been deleted. That is the vacuous pass this codebase's
        // other guards are written to avoid.
        expect(guardAt, "the admin role check has been removed").toBeGreaterThan(-1)
        expect(readAt, "the gapDefinition read has moved or been renamed").toBeGreaterThan(-1)
        expect(guardAt).toBeLessThan(readAt)
    })
})
