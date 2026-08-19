import { describe, it, expect } from "vitest"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

/**
 * One authorization path for policy-owned records, enforced.
 *
 * `lib/policy-access.ts` is the authority: owner, or an active grant scoped
 * exactly `policy:<id>`, or a managing agent with a living relationship. The
 * problem it was written to solve came back anyway, because nothing stopped a
 * new route from hand-rolling its own version — and by Aug 2026 there were four
 * copies of the rule, which had already drifted:
 *
 *   • lib/agent-visibility.ts matched Policy.createdByUserId with no
 *     relationship check, so a dismissed agent kept seeing every policy they
 *     had ever uploaded for that customer. Termination revokes grants; it
 *     cannot revoke immutable history.
 *   • the orchestrator accepted a bare CustomerRelationship as authority to
 *     read document bytes and spend tokens.
 *   • several routes checked ownerUserId only, silently denying a legitimate
 *     grant-holder — the same drift pointing the other way.
 *
 * Every one of those was invisible in a green test run. This file derives the
 * route list from the FILESYSTEM, so a route added tomorrow is covered by a
 * test written today: it is either on the single path, or it is named below
 * with a reason a human decided to write down.
 */

const API_ROOT = "app/api"

/** Prisma models whose rows belong to a policyholder. */
const OWNED_MODELS = [
    "policy",
    "policyDocument",
    "gapInstance",
    "policyAnalysisRun",
    "accessGrant",
]

function routeFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
        const full = join(dir, entry)
        if (statSync(full).isDirectory()) return routeFiles(full)
        return entry === "route.ts" ? [full] : []
    })
}

/** Reads a specific record chosen by the caller, rather than listing their own. */
function takesRecordIdFromCaller(path: string, source: string): boolean {
    // A dynamic segment in the path is the caller naming a record.
    if (/\[\w+\]/.test(path)) return true
    // …or an id arriving in the body/query and reaching a lookup.
    return /params\.(policyId|id)\b/.test(source)
}

function touchesOwnedModel(source: string): boolean {
    return OWNED_MODELS.some((model) =>
        new RegExp(`\\bdb\\.${model}\\.`).test(source)
    )
}

/**
 * A CALL, not a mention.
 *
 * This started as `source.includes("getPolicyAccess")` and a probe route slipped
 * through on the strength of a comment that named the function while doing the
 * opposite — which is precisely the kind of thing a guard is supposed to be
 * immune to.
 */
function callsPolicyAccess(source: string): boolean {
    return /\bgetPolicyAccess\s*\(/.test(source)
}

/**
 * Routes that legitimately do not call getPolicyAccess, each with the reason.
 *
 * Writing a name here is a decision on the record — which is the point. What
 * this test refuses to accept is a new route quietly inventing a fifth copy of
 * the rule.
 */
const SINGLE_PATH_EXEMPT: Record<string, string> = {
    // Self-scoped: the caller's own id is the only filter, and it comes from the
    // session. There is no record id to authorize.
    "app/api/v1/access-grants/route.ts":
        "lists grants the caller granted (granterUserId = session)",
    "app/api/v1/access-grants/[id]/route.ts":
        "acts on a grant the caller GRANTED; authority is granterUserId, not policy access",
    "app/api/v1/policies/share/route.ts":
        "mints/revokes grants as the policy OWNER; owner-only by design, and the grantee list is derived from the session",

    // Agent-facing surfaces authorize through lib/agent-visibility.ts, which
    // implements the same rule for the *set* of policies an agent may see
    // (getPolicyAccess answers for one policy at a time). Both now require a
    // living relationship for the upload arm; agent-visibility.test.ts pins it.
    "app/api/v1/agent/policies/[id]/branded-report/route.ts":
        "agent visibility set — isPolicyVisibleToAgent + getLiveCustomerUserIds",
    "app/api/v1/customers/protection-scores/route.ts":
        "agent visibility set — getAgentPolicyVisibilityWhere",

    // Deliberately NARROWER than getPolicyAccess: this opens a Stripe checkout
    // against the caller's own card to unlock their own report. An advisor with
    // a read grant may read the policy; that is not a reason to let them start
    // a payment on it. Owner-only is the correct rule here, not drift.
    "app/api/v1/policies/[id]/report-unlock/route.ts":
        "owner-only by design — starts a payment, and only the owner pays",
}

describe("policy-owned records have one authorization path", () => {
    const files = routeFiles(API_ROOT)
        .map((path) => ({ path, source: readFileSync(path, "utf-8") }))
        .filter(({ source }) => touchesOwnedModel(source))

    it("finds a meaningful number of routes to check", () => {
        // A broken matcher that finds nothing would make this file pass
        // vacuously — the failure mode of guards like this one.
        expect(files.length).toBeGreaterThan(10)
    })

    it("routes a caller-named record through getPolicyAccess, or says why not", () => {
        const bypassing = files
            .filter(({ path, source }) => takesRecordIdFromCaller(path, source))
            .filter(({ source }) => !callsPolicyAccess(source))
            .map(({ path }) => path)
            .filter((path) => !SINGLE_PATH_EXEMPT[path])
            .sort()

        expect(
            bypassing,
            "These routes let the caller name a policy-owned record but do not " +
                "authorize through lib/policy-access.ts. Route them through " +
                "getPolicyAccess, or add them to SINGLE_PATH_EXEMPT with the reason:\n  " +
                `${bypassing.join("\n  ")}`
        ).toEqual([])
    })

    it("keeps the exemption list honest — every entry still exists", () => {
        const stale = Object.keys(SINGLE_PATH_EXEMPT)
            .filter((path) => !files.some((f) => f.path === path))
            .sort()

        expect(
            stale,
            "Exempted routes that no longer touch a policy-owned record (or no " +
                "longer exist). Remove them so the list keeps meaning something:\n  " +
                `${stale.join("\n  ")}`
        ).toEqual([])
    })

    it("nobody re-implements the grant rule outside lib/policy-access.ts", () => {
        // The specific shape that drifted: a hand-rolled `scope: policy:<id>`
        // grant lookup used to make an access decision.
        const reimplementers = files
            .filter(({ source }) => /scope:\s*`policy:\$\{/.test(source))
            .filter(({ source }) => !callsPolicyAccess(source))
            .map(({ path }) => path)
            .filter((path) => !SINGLE_PATH_EXEMPT[path])
            .sort()

        expect(
            reimplementers,
            "These routes build their own `policy:<id>` grant check. That is the " +
                "copy that drifts — call getPolicyAccess instead:\n  " +
                `${reimplementers.join("\n  ")}`
        ).toEqual([])
    })
})
