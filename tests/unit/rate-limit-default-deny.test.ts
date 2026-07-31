/**
 * WP-14 — rate limiting is default-deny at the inventory level.
 *
 * 51 of 95 routes carried `rateLimit.required: false` simply because nobody had
 * decided otherwise — including AI-backed, billing and email-sending endpoints.
 * Absence of a limit is now only acceptable with a written justification, so an
 * omission is a reviewable decision instead of a silent default.
 *
 * A second measurement lesson is pinned here: 7 routes DID have a limiter in
 * code while the inventory claimed they had none. Counting from the inventory
 * alone overstated the exposure — so the audit must agree with the code.
 */
import { readFileSync, existsSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

type Route = {
    route: string
    methods: string[]
    policy: {
        auth: { mode: string }
        rateLimit?: { required?: boolean; profile?: string; justification?: string }
    }
}

const inventory = JSON.parse(
    readFileSync("scripts/api-route-policy-inventory.json", "utf-8")
) as { routes: Route[] }

const HAS_LIMIT = /rateLimit\s*\(|rateLimit\s*:\s*\{/

function sourceOf(route: string): string | null {
    const file = path.join("app/api", route)
    return existsSync(file) ? readFileSync(file, "utf-8") : null
}

describe("rate-limit inventory policy", () => {
    it("scans a meaningful number of routes", () => {
        // Vacuity floor: a glob or path change that silently matched nothing
        // would otherwise make every assertion below pass by finding no work.
        expect(inventory.routes.length).toBeGreaterThan(80)
    })

    it("requires a justification wherever a route opts out of rate limiting", () => {
        const unjustified = inventory.routes
            .filter((r) => r.policy.rateLimit?.required !== true)
            .filter((r) => (r.policy.rateLimit?.justification ?? "").trim().length < 15)
            .map((r) => r.route)

        expect(unjustified).toEqual([])
    })

    it("declares a limit for every route that actually implements one", () => {
        // The stale direction: code has a limiter, inventory says it does not.
        // That is how an endpoint looks unprotected in an audit while being
        // fine — and how a real regression hides in the noise.
        const understated = inventory.routes
            .filter((r) => r.policy.rateLimit?.required !== true)
            .filter((r) => {
                const src = sourceOf(r.route)
                return src !== null && HAS_LIMIT.test(src)
            })
            .map((r) => r.route)

        expect(understated).toEqual([])
    })

    it("implements a limiter for every route the inventory says is limited", () => {
        // The dangerous direction: inventory promises a limit the code lacks.
        const overstated = inventory.routes
            .filter((r) => r.policy.rateLimit?.required === true)
            .filter((r) => {
                const src = sourceOf(r.route)
                return src !== null && !HAS_LIMIT.test(src)
            })
            .map((r) => r.route)

        expect(overstated).toEqual([])
    })

    it("leaves no user-authenticated mutating route both unlimited and unexplained", () => {
        const exposed = inventory.routes
            .filter((r) => r.policy.auth.mode === "user")
            .filter((r) => r.methods.some((m) => ["POST", "PUT", "PATCH", "DELETE"].includes(m)))
            .filter((r) => r.policy.rateLimit?.required !== true)
            .filter((r) => !(r.policy.rateLimit?.justification ?? "").trim())
            .map((r) => r.route)

        expect(exposed).toEqual([])
    })
})
