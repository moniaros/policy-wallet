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

/** The same records reached through raw SQL — `db.$queryRaw` over these tables
 *  never mentions `db.policy.` and was INVISIBLE to this guard until
 *  2026-08-20, when the first raw-SQL server action taking a policyId shipped
 *  and passed the scan without being read. */
const OWNED_TABLES = [
    "policies",
    "policy_documents",
    "gap_instances",
    "policy_analysis_runs",
    "access_grants",
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
    const code = stripCommentsAndStrings(source)
    const withSql = stripComments(source)
    if (OWNED_MODELS.some((model) => new RegExp(`\\bdb\\.${model}\\.`).test(code))) {
        return true
    }
    // Raw SQL over the same tables is the same access.
    return (
        /\$(query|execute)Raw/.test(withSql) &&
        OWNED_TABLES.some((table) => new RegExp(`\\b${table}\\b`).test(withSql))
    )
}

/**
 * Strip comments and string/template literals before matching.
 *
 * Without this, every matcher in this file can be satisfied by *talking about*
 * the thing instead of doing it. A route containing only
 *
 *     // remember to call getPolicyAccess(policyId) here
 *
 * passed `callsPolicyAccess` until 2026-08-21 — the guard was reading prose as
 * proof. The same hole applied to the raw-SQL table matcher, where the word
 * "policies" inside any comment or message string counted as touching the
 * table. tests/fixtures/guard-probes/ holds the red probes; they are files in
 * the repo rather than a claim in a commit message, so the red-green is
 * re-runnable by anyone.
 *
 * This is deliberately a lexer, not a parser: it walks the source once and
 * tracks which construct it is inside. Regex-replacing comments would corrupt
 * a URL like "https://…" (the `//` starts a "comment" that eats the line).
 *
 * TWO strippers, because the two questions are opposites:
 *
 *   • "does this CALL getPolicyAccess?" — literal content is prose. Strip it.
 *   • "does this raw SQL touch an owned TABLE?" — literal content IS the SQL.
 *     Keep it, strip only comments. Getting this backwards silently un-guards
 *     every `db.$queryRaw` in the codebase, because the table name lives in the
 *     template body and nowhere else.
 */
export function stripComments(source: string): string {
    return lex(source, { keepLiteralText: true })
}

export function stripCommentsAndStrings(source: string): string {
    return lex(source, { keepLiteralText: false })
}

function lex(source: string, { keepLiteralText }: { keepLiteralText: boolean }): string {
    let out = ""
    let i = 0
    const n = source.length

    while (i < n) {
        const c = source[i]
        const next = source[i + 1]

        // Line comment — keep the newline so line-based reporting stays sane.
        if (c === "/" && next === "/") {
            while (i < n && source[i] !== "\n") i++
            continue
        }

        // Block comment.
        if (c === "/" && next === "*") {
            i += 2
            while (i < n && !(source[i] === "*" && source[i + 1] === "/")) i++
            i += 2
            continue
        }

        // String or template literal. Template literals keep their ${...}
        // interpolations, because `db.$queryRaw` builds real SQL in there.
        if (c === '"' || c === "'" || c === "`") {
            const quote = c
            i++
            while (i < n) {
                if (source[i] === "\\") {
                    i += 2
                    continue
                }
                if (quote === "`" && source[i] === "$" && source[i + 1] === "{") {
                    let depth = 1
                    i += 2
                    const start = i
                    while (i < n && depth > 0) {
                        if (source[i] === "{") depth++
                        else if (source[i] === "}") depth--
                        if (depth > 0) i++
                    }
                    out += source.slice(start, i)
                    i++
                    continue
                }
                if (source[i] === quote) {
                    i++
                    break
                }
                if (keepLiteralText) out += source[i]
                i++
            }
            out += " "
            continue
        }

        out += c
        i++
    }

    return out
}

/**
 * A CALL, not a mention.
 *
 * This started as `source.includes("getPolicyAccess")` and a probe route slipped
 * through on the strength of a comment that named the function while doing the
 * opposite — which is precisely the kind of thing a guard is supposed to be
 * immune to. Narrowing it to `getPolicyAccess(` did not fix that: a comment
 * containing the call syntax still passed. Only stripping the prose does.
 */
function callsPolicyAccess(source: string): boolean {
    return /\bgetPolicyAccess\s*\(/.test(stripCommentsAndStrings(source))
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

// ─────────────────────────────────────────────────────────────────────────────
// Blind spot 1: the checks above match a FILE. A route file exports several
// HTTP handlers, and one compliant handler used to vouch for all of them.
//
// Found by that gap: the DELETE in policies/[id]/documents/[docId] hand-rolled
// `policy: { ownerUserId }` while the GET beside it called getPolicyAccess — so
// the file passed and the fifth copy of the rule sat there unread. It happened
// to be narrower than getPolicyAccess rather than laxer, which is luck, not
// design. Now every handler answers for itself.
// ─────────────────────────────────────────────────────────────────────────────

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const

/** Split a route module into its exported HTTP handlers, in source order. */
function handlerBodies(source: string): { method: string; body: string }[] {
    const marks: { method: string; at: number }[] = []
    for (const method of HTTP_METHODS) {
        // Both `export async function GET(` and `export const GET = withApiGuard(`.
        const re = new RegExp(
            `export\\s+(?:async\\s+)?(?:function\\s+${method}\\b|const\\s+${method}\\s*=)`,
            "g"
        )
        let m: RegExpExecArray | null
        while ((m = re.exec(source))) marks.push({ method, at: m.index })
    }
    marks.sort((a, b) => a.at - b.at)
    return marks.map((mark, i) => ({
        method: mark.method,
        body: source.slice(mark.at, i + 1 < marks.length ? marks[i + 1].at : source.length),
    }))
}

describe("every HTTP handler answers for itself, not for its file", () => {
    const files = routeFiles(API_ROOT)
        .map((path) => ({ path, source: readFileSync(path, "utf-8") }))
        .filter(({ path, source }) => takesRecordIdFromCaller(path, source))
        .filter((f) => !SINGLE_PATH_EXEMPT[f.path])

    it("splits route modules into handlers (the matcher is not vacuous)", () => {
        const total = files.reduce((n, f) => n + handlerBodies(f.source).length, 0)
        expect(total).toBeGreaterThan(10)
    })

    it("no single handler touches an owned model without authorizing", () => {
        const bypassing: string[] = []
        for (const { path, source } of files) {
            for (const { method, body } of handlerBodies(source)) {
                if (!touchesOwnedModel(body)) continue
                if (callsPolicyAccess(body)) continue
                bypassing.push(`${path} [${method}]`)
            }
        }
        bypassing.sort()

        expect(
            bypassing,
            "These HTTP handlers read or write a policy-owned record without going " +
                "through lib/policy-access.ts. A sibling handler in the same file " +
                "calling getPolicyAccess does not authorize this one:\n  " +
                `${bypassing.join("\n  ")}`
        ).toEqual([])
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// Blind spot 2: everything above scans `app/api`. Server actions were never
// looked at — and **every export of a "use server" file is a callable endpoint**,
// reachable with no UI. That is the same surface `redeemInvite(token, userId)`
// was found on, taking the acting user's id as a parameter.
//
// Auditing them (2026-08-20) found no live hole: all authorize, and several are
// deliberately NARROWER than getPolicyAccess. But nothing was stopping the next
// one from being wrong, which is the entire point of a guard.
// ─────────────────────────────────────────────────────────────────────────────

const ACTION_ROOT = "app"

function actionFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
        const full = join(dir, entry)
        if (statSync(full).isDirectory()) {
            if (entry === "node_modules" || entry === ".next") return []
            return actionFiles(full)
        }
        return entry === "actions.ts" || entry.endsWith("-actions.ts") ? [full] : []
    })
}

/** Exported async functions of a module, each with its parameter list and body. */
function exportedActions(source: string): { name: string; params: string; body: string }[] {
    const re = /export\s+async\s+function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/g
    const hits: { name: string; params: string; at: number }[] = []
    let m: RegExpExecArray | null
    while ((m = re.exec(source))) hits.push({ name: m[1], params: m[2], at: m.index })
    return hits.map((h, i) => ({
        name: h.name,
        params: h.params,
        body: source.slice(h.at, i + 1 < hits.length ? hits[i + 1].at : source.length),
    }))
}

/** A caller-supplied id naming someone's record — not a self-scoped list. */
function takesRecordIdParam(params: string): boolean {
    return /\b(policyId|documentId|docId|gapId|runId|analysisRunId|grantId|instanceId)\b/.test(
        params
    )
}

/**
 * Server actions that legitimately do not call getPolicyAccess.
 *
 * Every entry was read and verified on 2026-08-20. Most are deliberately
 * NARROWER than the single path — which is a decision, not drift, so it is
 * written down here rather than left to be rediscovered.
 */
const ACTION_EXEMPT: Record<string, string> = {
    // Admin authority, not policy access. These are gated by verifyAdminRole()
    // and audited via logAdminRead/logAdminAction (see admin-reads-are-audited).
    "requeuePolicy": "admin authority — verifyAdminRole(), not a policy-access decision",
    "deletePolicy": "admin authority — verifyAdminRole()",
    "updatePolicyFields": "admin authority — verifyAdminRole()",

    // Owner-only BY DESIGN. getPolicyAccess would also admit a grant-holder;
    // for these actions that would be wrong, not merely broader.
    "updateGapStatus":
        "owner-only by design — dismissing your own gap is not an advisor's call",
    "notifyAgentAboutGap":
        "owner-only by design — the relationship is looked up with the CALLER as " +
        "policyholder; a grant-holder would mint the Opportunity in the wrong relationship",
    "sharePolicy": "acts as the policy OWNER to mint a grant; owner-only is the rule",
    "getPolicyReviewData": "owner-scoped read (ownerUserId = session)",
    "getPolicyAnalysisStatus":
        "owner-scoped read (JOIN users ON owner_user_id, email = session) — the " +
        "lightweight status poll; raw SQL so it returns ~200 bytes instead of acordData",
    "requestRenewalQuote": "owner-scoped read (ownerUserId = session)",
    "retryPolicyAnalysis": "owner-scoped read (ownerUserId = session)",
    "triggerOnboardingAnalysis": "owner-scoped read (ownerUserId = session)",

    // Self-scoped: authority is the caller's own row, not a policy.
    "getPolicyShares": "lists grants the caller GRANTED (granterUserId = session)",
    "revokeShare": "revokes a grant the caller GRANTED (granterUserId = session)",

    // Parallel authorities that implement the same rule for a different subject.
    "requestAiConsent":
        "agent-side: requires an exact `policy:<id>` grant OR an ACTIVE relationship. " +
        "Deliberately a different arm set from getPolicyAccess's managing-agent carve-out " +
        "(which additionally requires createdByUserId) — emailing an owner for consent is " +
        "not the same permission as reading their policy",
    "analyzeQuestionnaireResponse":
        "caller must be the questionnaire SENDER (sentByUserId = session); the policy read " +
        "is scoped by lib/agent-visibility.ts, the set-equivalent of the single path",
}

describe("server actions are on the single path, or say why not", () => {
    const actions = actionFiles(ACTION_ROOT)
        .map((path) => ({ path, source: readFileSync(path, "utf-8") }))
        .filter(({ source }) => touchesOwnedModel(source))
        .flatMap(({ path, source }) =>
            exportedActions(source).map((fn) => ({ path, ...fn }))
        )
        .filter(({ body }) => touchesOwnedModel(body))
        .filter(({ params }) => takesRecordIdParam(params))

    it("finds the server-action surface (the matcher is not vacuous)", () => {
        // If this drops to zero, the walker or the matchers broke — not the
        // codebase suddenly having no policy-touching actions.
        expect(actions.length).toBeGreaterThan(8)
    })

    it("authorizes a caller-named record, or is exempt with a reason", () => {
        const bypassing = actions
            .filter(({ body }) => !callsPolicyAccess(body))
            .filter(({ name }) => !ACTION_EXEMPT[name])
            .map(({ path, name }) => `${path} :: ${name}()`)
            .sort()

        expect(
            bypassing,
            "Every export of a \"use server\" file is a public endpoint, callable with " +
                "no UI. These take a caller-named record id and touch a policy-owned " +
                "model without going through lib/policy-access.ts. Route them through " +
                "getPolicyAccess, or add them to ACTION_EXEMPT with the reason:\n  " +
                `${bypassing.join("\n  ")}`
        ).toEqual([])
    })

    it("keeps the action exemption list honest — every entry still exists", () => {
        const known = new Set(actions.map((a) => a.name))
        const stale = Object.keys(ACTION_EXEMPT)
            .filter((name) => !known.has(name))
            .sort()

        expect(
            stale,
            "Exempted server actions that no longer exist, no longer take a record id, " +
                "or no longer touch an owned model. Remove them so the list keeps " +
                "meaning something:\n  " +
                `${stale.join("\n  ")}`
        ).toEqual([])
    })
})

/**
 * The guard's own red-green, as files rather than prose.
 *
 * A guard that nobody has watched fail is a guard nobody knows works. These two
 * fixtures are byte-identical in shape and differ only in whether the
 * authorization call is code or commentary — so if `stripCommentsAndStrings`
 * ever regresses, the negative probe goes green and this test goes red.
 */
describe("the guard reads code, not prose", () => {
    const probe = (name: string) =>
        readFileSync(join("tests/fixtures/guard-probes", name), "utf8")

    it("does not accept a comment or string that merely names getPolicyAccess", () => {
        const source = probe("mentions-only-route.ts.txt")

        // The raw text does contain the call syntax — three times over.
        expect(/\bgetPolicyAccess\s*\(/.test(source)).toBe(true)

        // But not once as code.
        expect(callsPolicyAccess(source)).toBe(false)
    })

    it("still accepts a real call", () => {
        expect(callsPolicyAccess(probe("real-call-route.ts.txt"))).toBe(true)
    })

    it("sees the raw-SQL read in both probes, so the bypass is genuinely detected", () => {
        for (const name of ["mentions-only-route.ts.txt", "real-call-route.ts.txt"]) {
            expect(takesRecordIdFromCaller("app/api/x/[id]/route.ts", probe(name))).toBe(true)
        }
    })

    it("strips line comments without eating a URL", () => {
        const stripped = stripCommentsAndStrings('const u = "https://x.dev/a"; // gone\nconst k = 1')
        expect(stripped).not.toContain("gone")
        expect(stripped).toContain("const k = 1")
    })

    it("keeps SQL text for the table matcher and drops it for the call matcher", () => {
        const raw = "db.$queryRaw`SELECT * FROM policies WHERE id = ${policyId}`"

        // The table name lives in the template BODY. Strip it and every raw-SQL
        // read in the codebase becomes invisible to this guard — which is the
        // regression this test exists to prevent.
        expect(stripComments(raw)).toContain("policies")
        expect(stripComments(raw)).toContain("policyId")

        // The call matcher wants the opposite: prose must not count as a call.
        expect(stripCommentsAndStrings(raw)).not.toContain("SELECT")
        expect(stripCommentsAndStrings(raw)).toContain("policyId")
    })

    it("still detects a raw-SQL read of an owned table (the regression probe)", () => {
        const source = probe("mentions-only-route.ts.txt")
        expect(stripComments(source)).toContain("policy_documents")
        expect(takesRecordIdFromCaller("app/api/x/[id]/route.ts", source)).toBe(true)
    })
})
