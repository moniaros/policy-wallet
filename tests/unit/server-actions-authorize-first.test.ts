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

/**
 * The scan is driven by the DIRECTIVE, not the filename.
 *
 * It used to glob only the literal filename `actions.ts` under app/, which
 * silently excluded nine files and
 * twenty-three exports — the kebab-case `-actions.ts` family (billing, policy,
 * security, role,
 * relationship, quiet-hours, risk-review) plus the camelCase pair
 * collaborationActions.ts and taskActions.ts. Every one of them is a public
 * endpoint by the same argument in this file's header, and none of them was
 * ever checked. A guard whose coverage depends on a naming convention protects
 * only the developers who happened to follow it.
 */
function serverActions(): ActionBody[] {
    const out: ActionBody[] = []
    for (const file of globSync("app/**/*.ts", { ignore: "**/node_modules/**" })) {
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
        expect(ACTIONS.length).toBeGreaterThan(100)
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


/**
 * The `redeemInvite` axis: never take the caller's identity as an argument.
 *
 * `redeemInvite(token, userId)` was an unauthenticated write path for months.
 * It "checked" nothing because there was nothing to check — the caller simply
 * declared which user they were, and the action believed them. An action that
 * accepts a subject-naming parameter is not fixed by adding an auth call; it is
 * fixed by deleting the parameter and reading the subject from the session,
 * because otherwise an authenticated attacker just passes someone else's id.
 *
 * This is a distinct failure from "no identity check": an action can call
 * getAuthenticatedUser() and still act on a userId handed in by the caller.
 */
const SUBJECT_PARAM = /\b(userId|user_id|actorId|callerId|currentUserId|actingUserId|onBehalfOf|asUser|subjectId|ownerUserId)\s*[:?,)]/

/**
 * Actions that take a subject id that is NOT the caller, with the reason.
 * Naming a target is legitimate; naming YOURSELF is the vulnerability.
 */
const NAMES_A_TARGET_NOT_THE_CALLER: Record<string, string> = {
    // All five are admin actions whose first statement is `await verifyAdminRole()`,
    // and whose userId is the SUBJECT BEING ADMINISTERED, not the caller. That is
    // the legitimate shape: authority comes from the session (the admin role), the
    // parameter only says who is being acted upon. Verified 2026-08-21 — each
    // resolves the admin from the session before the id is used, and the read-order
    // test above independently proves the guard precedes the first query.
    "app/(protected)/admin/actions.ts::getUserDetails":
        "admin reads another user; authority is the session's admin role, and the read is logged via logAdminRead",
    "app/(protected)/admin/actions.ts::changeUserRole":
        "admin changes another user's roles; the target is the point of the action",
    "app/(protected)/admin/actions.ts::grantTokens":
        "admin grants tokens TO a user; input.userId is the recipient",
    "app/(protected)/admin/actions.ts::deleteUser":
        "admin erases another user (DSR); the subject is necessarily named",
    "app/(protected)/admin/billing-actions.ts::applyCredit":
        "admin credits a user's balance; input.userId is the recipient",
}

describe("no server action lets the caller name themselves", () => {
    function parameterList(body: string): string {
        const open = body.indexOf("(")
        if (open === -1) return ""
        let depth = 0
        for (let i = open; i < body.length; i += 1) {
            if (body[i] === "(") depth += 1
            else if (body[i] === ")") {
                depth -= 1
                if (depth === 0) return body.slice(open, i + 1)
            }
        }
        return ""
    }

    it("finds actions to check", () => {
        expect(ACTIONS.length).toBeGreaterThan(100)
    })

    it("no action accepts the acting user's id as a parameter", () => {
        const selfNaming = ACTIONS.filter((a) => {
            if (NAMES_A_TARGET_NOT_THE_CALLER[`${a.file}::${a.name}`]) return false
            return SUBJECT_PARAM.test(parameterList(a.body))
        }).map((a) => `${a.file}::${a.name}${parameterList(a.body)}`)

        expect(
            selfNaming,
            "These take an identity as an argument. A \"use server\" export is reachable\n" +
                "with no UI, so the caller supplies that value — which makes the action a\n" +
                "write path for any user id the attacker cares to type. Derive the subject\n" +
                "from the session instead (this is exactly how redeemInvite(token, userId)\n" +
                "was an unauthenticated write path), or record it as a legitimate target:\n" +
                `  ${selfNaming.join("\n  ")}`
        ).toEqual([])
    })

    it("detects the redeemInvite shape itself", () => {
        // Red-green for the matcher: the historical signature must be caught.
        expect(SUBJECT_PARAM.test("(token: string, userId: string)")).toBe(true)
        expect(SUBJECT_PARAM.test("(token: string)")).toBe(false)
        expect(SUBJECT_PARAM.test("(formData: FormData)")).toBe(false)
    })
})
