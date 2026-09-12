import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const getUserMock = vi.hoisted(() => vi.fn())
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { getUser: getUserMock } }) }))
vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn(async () => ({ success: true })) }))

import { STEP_UP_COOKIE, issueStepUpToken } from "@/lib/auth/step-up"
import { ROUTE_OWNERSHIP, proxy, stepUpRequired } from "@/proxy"

/**
 * PW-PROVENANCE-01 R-01 — the second factor is enforced in ONE place, for
 * EVERY protected route. The universe is the proxy's own ROUTE_OWNERSHIP table
 * (a concrete path per pattern, wildcards filled), not a list kept here: a
 * route added to the table is inside the gate the moment it is added. The
 * real proxy() runs end to end with a mocked session.
 *
 * Asserted: with the flag on and the enrolment claim set, every such path
 * without a valid step-up cookie is sent to /auth/step-up with its callback;
 * a valid cookie passes; a forged, foreign or expired one does not; the flag
 * off, or no claim, enforces nothing; /auth/* and /api/auth/* stay reachable —
 * they are how the person gets the cookie.
 */

const SUPABASE_USER_ID = "sb-user-1"
const PROTECTED_PATHS = ROUTE_OWNERSHIP.map(([pattern]) => "/" + pattern.split("/").filter(Boolean).map((s) => (s === "*" ? "x" : s)).join("/"))

function session(overrides: { passkeys?: number; role?: string } = {}) {
    getUserMock.mockResolvedValue({
        data: {
            user: {
                id: SUPABASE_USER_ID,
                email: "u@example.com",
                user_metadata: { role: overrides.role ?? "policyholder" },
                app_metadata: { passkeys: overrides.passkeys ?? 1 },
            },
        },
    })
}

const run = (path: string, cookie?: string) => {
    const req = new NextRequest(`http://localhost:3000${path}`, cookie ? { headers: { cookie: `${STEP_UP_COOKIE}=${cookie}` } } : undefined)
    return proxy(req)
}
const location = (res: Response) => res.headers.get("location") ?? ""

beforeEach(() => {
    getUserMock.mockReset()
    process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-secret-for-step-up"
    process.env.PASSKEYS_ENABLED = "1"
})

describe("the step-up gate covers every route the ownership table names", () => {
    it("enumerates a non-trivial universe", () => {
        expect(PROTECTED_PATHS.length).toBeGreaterThan(10)
        expect(PROTECTED_PATHS).toContain("/wallet")
        expect(PROTECTED_PATHS).toContain("/admin")
    })

    for (const path of PROTECTED_PATHS) {
        it(`${path}: no cookie → /auth/step-up with the callback; a valid cookie → through`, async () => {
            session()
            const blocked = await run(path)
            expect(blocked.status, `${path} without cookie`).toBe(307)
            expect(location(blocked)).toContain("/auth/step-up?callbackUrl=" + encodeURIComponent(path))
            const passed = await run(path, await issueStepUpToken(SUPABASE_USER_ID))
            expect(location(passed), `${path} with cookie`).not.toContain("/auth/step-up")
        })
    }
})

describe("what does not count as proof", () => {
    it("a forged, foreign or expired cookie is refused", async () => {
        session()
        const good = await issueStepUpToken(SUPABASE_USER_ID)
        expect(location(await run("/wallet", good.replace(/\.[^.]+$/, ".forged")))).toContain("/auth/step-up")
        expect(location(await run("/wallet", await issueStepUpToken("someone-else")))).toContain("/auth/step-up")
        const expired = await issueStepUpToken(SUPABASE_USER_ID, new Date(Date.now() - 13 * 60 * 60 * 1000))
        expect(location(await run("/wallet", expired))).toContain("/auth/step-up")
    })
})

describe("when nothing is enforced", () => {
    it("no enrolment claim → no gate; flag off → no gate even with the claim", async () => {
        session({ passkeys: 0 })
        expect(location(await run("/wallet"))).not.toContain("/auth/step-up")
        process.env.PASSKEYS_ENABLED = "0"
        session({ passkeys: 2 })
        expect(location(await run("/wallet"))).not.toContain("/auth/step-up")
    })

    it("the routes that GRANT the proof stay reachable: /auth/step-up and /api/auth/passkeys/*", async () => {
        session()
        expect(location(await run("/api/auth/passkeys/challenge"))).not.toContain("/auth/step-up")
        // A signed-in person on /auth/* is sent to their dashboard by the existing rule, never to step-up first.
        expect(location(await run("/auth/step-up?callbackUrl=%2Fwallet"))).not.toContain("/auth/step-up?callbackUrl=%2Fauth")
    })

    it("probe — stepUpRequired is what the gate consults: claim + no cookie is true, claim + cookie is false", async () => {
        const user = { id: SUPABASE_USER_ID, app_metadata: { passkeys: 1 } }
        expect(await stepUpRequired(new NextRequest("http://localhost:3000/wallet"), user)).toBe(true)
        const req = new NextRequest("http://localhost:3000/wallet", { headers: { cookie: `${STEP_UP_COOKIE}=${await issueStepUpToken(SUPABASE_USER_ID)}` } })
        expect(await stepUpRequired(req, user)).toBe(false)
    })
})
