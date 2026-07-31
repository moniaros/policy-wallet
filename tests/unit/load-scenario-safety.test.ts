/**
 * WP-24 — the authenticated load scenario, and the ways one goes wrong.
 *
 * k6 is not installed here and staging does not exist yet, so this cannot prove
 * the run meets its targets. It can prove the three things that decide whether
 * the run is worth trusting when someone finally executes it — all of which are
 * properties of the script, not of the environment:
 *
 *  1. **It hits routes that exist.** A load test pointed at a path that 404s
 *     reports excellent latency and a clean error rate, because a 404 is fast
 *     and is not a 5xx. Every path below is checked against the route inventory
 *     the CI auth audit already maintains.
 *  2. **It cannot pass while measuring nothing.** With no authenticated user
 *     every request 401s — uniform, fast, under any threshold that only counts
 *     server errors. The scenario aborts in setup() instead.
 *  3. **It cannot be aimed at production, and cannot quietly spend the AI
 *     budget.** Both are one env-var mistake away, and neither is undone by
 *     noticing afterwards.
 */
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const SCENARIO = readFileSync("scripts/load/authed-journey.js", "utf-8")
const INVENTORY = JSON.parse(readFileSync("scripts/api-route-policy-inventory.json", "utf-8"))

/** Every API path the inventory knows, as a request path with [id] segments. */
function knownRoutes(): { path: string; methods: string[] }[] {
    return INVENTORY.routes.map((r: { route: string; methods: string[] }) => ({
        path: "/api/" + r.route.replace(/\/route\.ts$/, ""),
        methods: r.methods ?? [],
    }))
}

/** Turns `/api/v1/policies/${first.id}/gaps` into the inventory's `[id]` form. */
function toRoutePattern(templated: string): string {
    return templated.replace(/\$\{[^}]+\}/g, "[id]")
}

/** API paths the scenario requests, with the method it uses. */
function requestedPaths(): { path: string; method: string }[] {
    const found: { path: string; method: string }[] = []
    // http.get(`${BASE}/api/...`) and http.post(`${BASE}/api/...`), plus the
    // authedGet('/api/...') helper.
    for (const m of SCENARIO.matchAll(/http\.(get|post)\(\s*`\$\{BASE\}(\/api\/[^`]*)`/g)) {
        found.push({ path: toRoutePattern(m[2]), method: m[1].toUpperCase() })
    }
    for (const m of SCENARIO.matchAll(/authedGet\(\s*[`'"](\/api\/[^`'"]*)[`'"]/g)) {
        found.push({ path: toRoutePattern(m[1]), method: "GET" })
    }
    return found
}

describe("the paths the scenario hits", () => {
    it("finds a real set of requests to check", () => {
        // Vacuity floor: a rewrite that changed how requests are written would
        // otherwise leave nothing to verify and pass silently.
        expect(requestedPaths().length).toBeGreaterThanOrEqual(5)
        expect(knownRoutes().length).toBeGreaterThan(50)
    })

    it("requests only routes that exist, with methods those routes accept", () => {
        // A 404 under load is fast and is not a 5xx: the run would look
        // excellent and mean nothing.
        const routes = knownRoutes()
        const unknown: string[] = []

        for (const req of requestedPaths()) {
            const match = routes.find((r) => r.path === req.path)
            if (!match) unknown.push(`${req.method} ${req.path} — no such route`)
            else if (!match.methods.includes(req.method)) {
                unknown.push(`${req.method} ${req.path} — route accepts ${match.methods.join("/")}`)
            }
        }

        expect(unknown, "The load scenario would measure 404s or 405s").toEqual([])
    })
})

describe("the run cannot pass while measuring nothing", () => {
    it("aborts when no user authenticated", () => {
        expect(SCENARIO).toMatch(/tokens\.length === 0/)
        expect(SCENARIO.split("tokens.length === 0")[1].slice(0, 300)).toContain("fail(")
    })

    it("accepts only 200 on reads, not 'anything below 500'", () => {
        // `< 500` would count the 401s this exists to avoid measuring, and a
        // 429 on a read is a limiter misconfiguration — a finding, not a pass.
        expect(SCENARIO).toContain("r.status === 200")
        expect(SCENARIO).not.toMatch(/status\s*<\s*500/)
    })

    it("reads the policy id from the response instead of hardcoding one", () => {
        // A hardcoded id 404s for every user but the one it belonged to.
        expect(SCENARIO).toContain("policies.json(")
        expect(SCENARIO).toMatch(/first\.id/)
    })

    it("measures reads and the enqueue against separate thresholds", () => {
        // One global p95 lets fast reads hide a slow enqueue — the thing most
        // likely to break first under this profile.
        expect(SCENARIO).toMatch(/read_latency:\s*\['p\(95\)<500'\]/)
        expect(SCENARIO).toMatch(/enqueue_latency:\s*\['p\(95\)<2000'\]/)
        expect(SCENARIO).toMatch(/failed_requests:\s*\['rate<0\.01'\]/)
    })
})

describe("the run cannot damage anything", () => {
    it("refuses to point at production without a deliberate override", () => {
        expect(SCENARIO).toContain("PRODUCTION_HOSTS")
        expect(SCENARIO).toContain("policywallet.gr")
        expect(SCENARIO).toContain("I_KNOW_THIS_IS_PRODUCTION")
    })

    it("keeps analysis enqueue behind an explicit opt-in", () => {
        expect(SCENARIO).toContain("ENABLE_ANALYSIS === '1'")
        // ...and the enqueue block is inside that guard, not merely near it.
        const enqueueBlock = SCENARIO.split("if (ENABLE_ANALYSIS) {")[1] ?? ""
        expect(enqueueBlock).toContain("analysis enqueue")
    })

    it("refuses to enqueue against a real AI provider, or an unknown one", () => {
        // Unknown is not safe: the point is not to find out from the invoice.
        expect(SCENARIO).toContain("aiProviderIsMock")
        expect(SCENARIO).toMatch(/isMock === false/)
        expect(SCENARIO).toMatch(/typeof isMock !== "boolean"|typeof isMock !== 'boolean'/)
    })
})

describe("the health endpoint it relies on", () => {
    const HEALTH = readFileSync("app/api/health/route.ts", "utf-8")

    it("reports whether analyses on this deployment cost money", () => {
        expect(HEALTH).toContain("aiProviderIsMock")
        expect(HEALTH).toContain("getActiveAIProvider")
    })

    it("does not name the provider on a public endpoint", () => {
        // The scenario needs one bit — would this bill a real vendor — and the
        // endpoint is unauthenticated. The vendor's name adds disclosure and no
        // use. (Checked on the response shape, not on the imported helper's
        // own name.)
        const payload = HEALTH.split("services: {")[1]?.split("}")[0] ?? ""
        expect(payload.length).toBeGreaterThan(0)
        for (const vendor of ["gemini", "anthropic", "openai"]) {
            expect(payload.toLowerCase()).not.toContain(vendor)
        }
    })
})
