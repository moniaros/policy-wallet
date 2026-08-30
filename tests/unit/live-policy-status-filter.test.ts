import { describe, it, expect } from 'vitest'
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"
import { NON_LIVE_POLICY_STATUSES } from '@/lib/policy-status'

/**
 * ONE definition of "the policies this person has".
 *
 * Policy.status is an INGESTION state that nothing recomputes: 'active',
 * 'expiring_soon', 'action_needed' and 'incomplete' are all real policies in
 * force, and nothing ever writes 'expired'. Filtering a Policy query on a bare
 * `status: "active"` is therefore wrong in both directions — it drops in-force
 * policies stored under the other live states AND keeps policies whose cover
 * has actually ended. The sanctioned shape for the ownership question is
 * `status: { notIn: [...NON_LIVE_POLICY_STATUSES] }`; lifecycle/expiry verdicts
 * are a DIFFERENT question answered by resolvePolicyLifecycle.
 *
 * History: this class has now bitten SIX times — renewal cron, weekly digest,
 * churn day-7 count (the original three), the day-7 drip tile (P1-02), the
 * engagement score's policy count and the admin stats tile (both found by this
 * guard's first full enumeration, P1-03). The previous version of this file
 * guarded a hardcoded list of four files, which is exactly why the fifth
 * offender sat unflagged in lib/services/engagement-scoring.ts while the four
 * listed files were fixed. Per CLAUDE.md ("guards must enumerate, not assume")
 * the universe is now derived from the filesystem, and the matcher is proven
 * against committed probe fixtures in tests/fixtures/guard-probes/.
 */
describe('NON_LIVE_POLICY_STATUSES', () => {
    it('excludes exactly the non-policy states', () => {
        expect([...NON_LIVE_POLICY_STATUSES].sort()).toEqual(['analyzing', 'cancelled', 'deleted'])
    })

    it('does NOT exclude any in-force or pending-review state', () => {
        const excluded = new Set<string>(NON_LIVE_POLICY_STATUSES)
        for (const live of ['active', 'expiring_soon', 'action_needed', 'incomplete']) {
            expect(excluded.has(live)).toBe(false)
        }
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// The scanner. Text-level, but structural: comments are stripped (so a mention
// in prose cannot satisfy or trip it — the authorization guard once passed on a
// comment), delimiters are balance-matched, and the `where` block is located at
// the TOP level of the options object so a nested include-where cannot stand in
// for the policy where.
//
// Known, accepted blind spots (documented so nobody mistakes silence for proof):
//   - `where` passed as a variable (`where: policyVisibilityWhere`) is opaque.
//   - raw SQL (`$queryRaw` over the policies table) is not parsed; the one
//     current site (app/(protected)/wallet/actions.ts) is id-scoped.
//   - a nested OTHER-model status inside a policy where could mask a missing
//     policy-status filter; no such shape exists in the tree today.
// ─────────────────────────────────────────────────────────────────────────────

/** Strip // and /* comments while respecting ' " ` strings and `${…}`. */
function stripComments(src: string): string {
    let out = ""
    let i = 0
    let mode: "code" | "line" | "block" | "squote" | "dquote" | "template" = "code"
    const templateDepth: number[] = []
    while (i < src.length) {
        const c = src[i]
        const c2 = src[i + 1]
        if (mode === "code") {
            if (c === "/" && c2 === "/") { mode = "line"; i += 2; continue }
            if (c === "/" && c2 === "*") { mode = "block"; i += 2; continue }
            if (c === "'") { mode = "squote"; out += c; i++; continue }
            if (c === '"') { mode = "dquote"; out += c; i++; continue }
            if (c === "`") { mode = "template"; out += c; i++; continue }
            if (c === "}" && templateDepth.length) {
                if (templateDepth[templateDepth.length - 1] === 0) {
                    templateDepth.pop(); mode = "template"; out += c; i++; continue
                }
                templateDepth[templateDepth.length - 1]--
            }
            if (c === "{" && templateDepth.length) templateDepth[templateDepth.length - 1]++
            out += c; i++; continue
        }
        if (mode === "line") { if (c === "\n") { mode = "code"; out += c } i++; continue }
        if (mode === "block") { if (c === "*" && c2 === "/") { mode = "code"; i += 2; continue } if (c === "\n") out += c; i++; continue }
        if (mode === "squote") { if (c === "\\") { out += c + (c2 ?? ""); i += 2; continue } if (c === "'" || c === "\n") mode = "code"; out += c; i++; continue }
        if (mode === "dquote") { if (c === "\\") { out += c + (c2 ?? ""); i += 2; continue } if (c === '"' || c === "\n") mode = "code"; out += c; i++; continue }
        // template
        if (c === "\\") { out += c + (c2 ?? ""); i += 2; continue }
        if (c === "`") { mode = "code"; out += c; i++; continue }
        if (c === "$" && c2 === "{") { templateDepth.push(0); mode = "code"; out += c + c2; i += 2; continue }
        out += c; i++; continue
    }
    return out
}

/** Balanced ( … ) or { … } span starting at src[open], strings skipped. */
function balancedSpan(src: string, open: number): string | null {
    const openCh = src[open]
    const closeCh = openCh === "(" ? ")" : openCh === "{" ? "}" : null
    if (!closeCh) return null
    let depth = 0
    for (let i = open; i < src.length; i++) {
        const c = src[i]
        if (c === "'" || c === '"' || c === "`") {
            const q = c
            i++
            while (i < src.length && src[i] !== q) { if (src[i] === "\\") i++; i++ }
            continue
        }
        if (c === openCh) depth++
        else if (c === closeCh) { depth--; if (depth === 0) return src.slice(open, i + 1) }
    }
    return null
}

/** Nesting depth ({[( alike) at every index of an object literal. */
function braceDepths(text: string): number[] {
    const depths = new Array<number>(text.length).fill(0)
    let depth = 0
    for (let i = 0; i < text.length; i++) {
        const c = text[i]
        if (c === "'" || c === '"' || c === "`") {
            const q = c
            depths[i] = depth
            i++
            while (i < text.length && text[i] !== q) { if (text[i] === "\\") { depths[i] = depth; i++ } depths[i] = depth; i++ }
            if (i < text.length) depths[i] = depth
            continue
        }
        if (c === "{" || c === "[" || c === "(") { depths[i] = depth; depth++; continue }
        if (c === "}" || c === "]" || c === ")") { depth--; depths[i] = depth; continue }
        depths[i] = depth
    }
    return depths
}

/** The `where: { … }` block at the TOP level of a Prisma options object. */
function topLevelWhereBlock(optionsObj: string): string | null {
    const depths = braceDepths(optionsObj)
    const re = /\bwhere\s*:\s*\{/g
    let m: RegExpExecArray | null
    while ((m = re.exec(optionsObj))) {
        if (depths[m.index] === 1) return balancedSpan(optionsObj, re.lastIndex - 1)
    }
    return null
}

// "status must equal exactly 'active'" in every spelling Prisma accepts.
const BARE_ACTIVE_RES = [
    /\bstatus\s*:\s*(["'`])active\1/,
    /\bstatus\s*:\s*\{\s*equals\s*:\s*(["'`])active\1/,
    /\bstatus\s*:\s*\{\s*in\s*:\s*\[\s*(["'`])active\1\s*,?\s*\]/,
]
const isBareActive = (w: string) => BARE_ACTIVE_RES.some((re) => re.test(w))
const hasStatusKey = (w: string) => /\bstatus\s*:/.test(w)
const hasNonLiveRef = (w: string) => /NON_LIVE_POLICY_STATUSES/.test(w)
const hasOwnerKey = (w: string) => /\bownerUserId\s*:/.test(w) || /[{,]\s*ownerUserId\s*[,}]/.test(w)
// Scoped to a specific record (`id: x`, `id: { in: … }`) — an authorization
// question, getPolicyAccess's business, not a portfolio-set question. The `not`
// exclusion lives INSIDE the lookahead: with an outer `\s*` before it, the
// regex backtracked past the whitespace and `id: { not: … }` (a SET query over
// the owner's other policies) slipped through as "id-scoped".
const isIdScoped = (w: string) => /(?<![\w.$])id\s*:(?!\s*\{\s*(?:not|notIn)\b)/.test(w)

const PRISMA_POLICY_CALL = /\.\s*policy\s*\.\s*(findMany|findFirst|findUnique|findFirstOrThrow|findUniqueOrThrow|count|groupBy|aggregate|updateMany|deleteMany|update|delete|upsert)\s*\(/g

type Violation = {
    line: number
    kind: "bare-active" | "unfiltered-ownership"
    snippet: string
}

function lineOf(src: string, idx: number): number {
    return src.slice(0, idx).split("\n").length
}

/** All live-policy-filter violations in one file's source. */
function scanSource(raw: string): { violations: Violation[]; policyCallSites: number } {
    const src = stripComments(raw)
    const violations: Violation[] = []
    const oneLine = (s: string) => s.replace(/\s+/g, " ").slice(0, 120)

    // 1) Direct Prisma calls on the Policy model.
    let m: RegExpExecArray | null
    PRISMA_POLICY_CALL.lastIndex = 0
    let policyCallSites = 0
    while ((m = PRISMA_POLICY_CALL.exec(src))) {
        policyCallSites++
        const args = balancedSpan(src, PRISMA_POLICY_CALL.lastIndex - 1)
        if (args == null) continue
        const objStart = args.indexOf("{")
        if (objStart === -1) continue
        const options = balancedSpan(args, objStart)
        if (options == null) continue
        const where = topLevelWhereBlock(options)
        if (where == null) continue
        const line = lineOf(src, m.index)
        if (isBareActive(where)) {
            violations.push({ line, kind: "bare-active", snippet: oneLine(where) })
        } else if (
            hasOwnerKey(where) && !isIdScoped(where) &&
            !hasStatusKey(where) && !hasNonLiveRef(where)
        ) {
            violations.push({ line, kind: "unfiltered-ownership", snippet: oneLine(where) })
        }
    }

    // 2) Relation form: `policy: { … ownerUserId … }` inside any where-block —
    //    another model's query reaching the Policy table (gap counts etc.).
    const whereRanges: Array<[number, number]> = []
    const whereRe = /\bwhere\s*:\s*\{/g
    while ((m = whereRe.exec(src))) {
        const block = balancedSpan(src, whereRe.lastIndex - 1)
        if (block) whereRanges.push([whereRe.lastIndex - 1, whereRe.lastIndex - 1 + block.length])
    }
    const relRe = /\bpolic(?:y|ies)\s*:\s*\{/g
    while ((m = relRe.exec(src))) {
        const open = relRe.lastIndex - 1
        if (!whereRanges.some(([a, b]) => open > a && open < b)) continue
        const block = balancedSpan(src, open)
        if (block == null) continue
        // Projections and type shapes, not where clauses.
        if (/^\{\s*(select|include|orderBy|take|skip)\b/.test(block)) continue
        if (/\bownerUserId\s*:\s*(string|true)\b/.test(block)) continue
        if (!/\bownerUserId\b/.test(block)) continue
        const line = lineOf(src, m.index)
        if (isBareActive(block)) {
            violations.push({ line, kind: "bare-active", snippet: oneLine(block) })
        } else if (!hasStatusKey(block) && !hasNonLiveRef(block) && !isIdScoped(block)) {
            violations.push({ line, kind: "unfiltered-ownership", snippet: oneLine(block) })
        }
    }

    return { violations, policyCallSites }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exemptions. Every entry is a CONSCIOUS decision with a reason — never a
// silent omission. Counts are exact in both directions: a new offender in an
// exempted file fails, and fixing an exempted site fails until the entry is
// ratcheted down. An entry whose reason starts with DEBT is a known defect this
// guard's first enumeration surfaced (P1-03) and a later task must fix.
// ─────────────────────────────────────────────────────────────────────────────

const BARE_ACTIVE_EXEMPTIONS: Record<string, { count: number; reason: string }> = {
    "app/(protected)/admin/actions.ts": {
        count: 1,
        reason:
            "DEBT (found by this guard's first enumeration, P1-03): the admin platform-stats " +
            "tile counts policies stored as exactly 'active', under-reporting live policies " +
            "the same way the six fixed sites did. Admin surfaces are fenced from run " +
            "PW-MOBILE-TRANSFORM-01 (S12.4); fix in an admin-scoped task, then delete this entry.",
    },
}

const UNFILTERED_OWNERSHIP_EXEMPTIONS: Record<string, { count: number; reason: string }> = {
    // ── Must reach EVERY row, by design ─────────────────────────────────────
    "lib/services/gdpr-erasure.service.ts": {
        count: 2,
        reason:
            "Erasure (Art. 17) must reach every stored row — deleted, analyzing and cancelled " +
            "included. A status filter here would orphan personal data.",
    },
    "lib/services/compliance.service.ts": {
        count: 2,
        reason:
            "Subject-access export (Art. 15) must list every stored row regardless of " +
            "ingestion status — the answer to 'what do you hold about me' is not 'what is live'.",
    },
    // ── Quota counts STORED uploads, not live cover ─────────────────────────
    "lib/subscription-limits.ts": {
        count: 2,
        reason:
            "Plan quota counts stored uploads: excluding 'analyzing' would let a user queue " +
            "unlimited uploads mid-analysis. Whether deleted/cancelled rows should keep " +
            "consuming quota is a separate product question, not this invariant.",
    },
    "app/(protected)/account/data.ts": {
        count: 1,
        reason:
            "'policiesStored' usage stat on the account page — same stored-uploads semantics " +
            "as lib/subscription-limits.ts, and the two must agree.",
    },
    // ── Classifies liveness per policy in code (the sanctioned alternative) ──
    "lib/services/gap-engine/index.ts": {
        count: 5,
        reason:
            "Fetches every row and derives liveness per policy in code — documented at the " +
            "call sites ('liveness is derived from the REAL end date') via " +
            "coverageEngineStatus / isPolicyCoverageActive from lib/policy-status.",
    },
    "lib/services/risk-graph/service.ts": {
        count: 1,
        reason:
            "Maps coverageEngineStatus over the fetched rows — per-policy lifecycle in code.",
    },
    "lib/gap-detection.ts": {
        count: 1,
        reason:
            "Fenced from run PW-MOBILE-TRANSFORM-01 (S12.4: do not touch gap-detection). The " +
            "engine evaluates coverage per policy; changing its input universe changes " +
            "detection semantics and needs its own task.",
    },
    // ── Agent-visibility set semantics (S12.4-fenced surfaces) ──────────────
    "lib/agent-visibility.ts": {
        count: 1,
        reason:
            "The single sanctioned path for the agent-facing SET question (CLAUDE.md). What " +
            "an agent MAY SEE is grant+relationship logic; whether non-live rows should also " +
            "be excluded is a separate decision for an agent-scoped task. S12.4-fenced.",
    },
    "lib/services/agent-portal.service.ts": {
        count: 2,
        reason: "Agent visibility set (spreads visibilityWhere). S12.4-fenced; see lib/agent-visibility.ts entry.",
    },
    "lib/services/cross-sell.service.ts": {
        count: 1,
        reason: "Agent visibility set (spreads getAgentPolicyVisibilityWhere). S12.4-fenced; see lib/agent-visibility.ts entry.",
    },
    "lib/services/gap-engine/agent-playbook.ts": {
        count: 1,
        reason: "Agent visibility set (spreads agentPolicyVisibilityWhere). S12.4-fenced; see lib/agent-visibility.ts entry.",
    },
    "app/(protected)/insights/actions.ts": {
        count: 2,
        reason: "Agent visibility set (spreads getAgentPolicyVisibilityWhere). S12.4-fenced; see lib/agent-visibility.ts entry.",
    },
    "app/(protected)/questionnaires/actions.ts": {
        count: 1,
        reason: "Agent visibility set (spreads getAgentPolicyVisibilityWhere). S12.4-fenced; see lib/agent-visibility.ts entry.",
    },
    "app/(protected)/dashboard/agent/page.tsx": {
        count: 1,
        reason: "Agent dashboard gap count scoped by gapsVisibilityWhere. S12.4-fenced; see lib/agent-visibility.ts entry.",
    },
    "app/api/v1/customers/protection-scores/route.ts": {
        count: 1,
        reason:
            "Existence probe — 'does the agent have ANY visible policy for this customer' — " +
            "used as a privacy gate, not a portfolio count. S12.4-fenced.",
    },
    // ── History and record-keeping: non-live rows are still the record ──────
    "lib/services/achievements.service.ts": {
        count: 3,
        reason:
            "Gamification counts all-time actions: a gap resolved on a policy later cancelled " +
            "was still resolved. Historical counters, not portfolio verdicts.",
    },
    "lib/services/timeline/service.ts": {
        count: 1,
        reason:
            "Timeline renders the portfolio's HISTORY — a since-cancelled policy is still a " +
            "past event, and excluding it would falsify the record.",
    },
    "app/(protected)/notifications/actions.ts": {
        count: 1,
        reason:
            "Resolves policy labels for the notification HISTORY list — a notification about " +
            "a since-cancelled policy still needs its label resolvable.",
    },
    "app/api/v1/collaboration/proposals/route.ts": {
        count: 1,
        reason:
            "Authorization check — does this client-supplied gapInstanceId belong to this " +
            "customer. A gap on any of the customer's rows is theirs, live or not.",
    },
    // ── Display surfaces that show non-live rows on purpose ─────────────────
    "app/(protected)/agent/page.tsx": {
        count: 1,
        reason:
            "Navigation context over the user's own uploads, same universe as the wallet — " +
            "per-policy display, not a portfolio verdict.",
    },
    "app/(protected)/dashboard/PolicyholderHome.tsx": {
        count: 1,
        reason:
            "Ratcheted 2→1 by V2-P1-11: the policy fetch now carries status ≠ 'deleted' " +
            "(and renders per-policy cards, 'analyzing' included by design). The remaining " +
            "query is the gap fetch, scoped by gap status and post-filtered through " +
            "gapsOnActiveCoverage.",
    },
    // ── DEBT: surfaced by this guard's first enumeration, deferred ──────────
    "lib/services/analysis/portfolio-gap-view.ts": {
        count: 1,
        reason:
            "DEBT (P1-03 enumeration): portfolio gap summary over all stored rows, so gaps on " +
            "cancelled policies count toward the summary. P1-03's fix scope was outbound " +
            "counts and scoring; this needs a per-surface decision.",
    },
}

// ─────────────────────────────────────────────────────────────────────────────
// The guard proper.
// ─────────────────────────────────────────────────────────────────────────────

describe('every Policy query uses the one definition of "the policies this person has"', () => {
    const files = [
        ...globSync("lib/**/*.{ts,tsx}"),
        ...globSync("app/**/*.{ts,tsx}"),
    ].filter((f) => !/\.(test|spec)\.[tj]sx?$/.test(f) && !f.endsWith(".d.ts")).sort()

    const scanned = files.map((file) => ({ file, ...scanSource(readFileSync(file, "utf-8")) }))
    const totalCallSites = scanned.reduce((n, s) => n + s.policyCallSites, 0)

    it('enumerates a real universe (a broken glob must fail loudly, not pass emptily)', () => {
        expect(files.length).toBeGreaterThan(500)
        expect(totalCallSites).toBeGreaterThan(80)
        for (const known of [
            'lib/services/renewal.service.ts',
            'lib/services/weekly-digest.service.ts',
            'lib/services/churn-prevention.service.ts',
            'lib/services/engagement-drip.service.ts',
            // The file the old hardcoded list missed — the reason this guard enumerates.
            'lib/services/engagement-scoring.ts',
        ]) {
            expect(files, `universe must include ${known}`).toContain(known)
        }
    })

    const byKind = (kind: Violation["kind"]) => {
        const map = new Map<string, Violation[]>()
        for (const { file, violations } of scanned) {
            const hits = violations.filter((v) => v.kind === kind)
            if (hits.length) map.set(file, hits)
        }
        return map
    }

    const enforce = (
        kind: Violation["kind"],
        exemptions: Record<string, { count: number; reason: string }>,
        label: string,
    ) => {
        const found = byKind(kind)
        const failures: string[] = []

        for (const [file, hits] of found) {
            const exemption = exemptions[file]
            const allowed = exemption?.count ?? 0
            if (hits.length > allowed) {
                const lines = hits.map((h) => `    ${file}:${h.line}  ${h.snippet}`).join("\n")
                failures.push(
                    `${file} has ${hits.length} ${label} Policy quer${hits.length === 1 ? "y" : "ies"} ` +
                    `(${allowed} exempted):\n${lines}\n` +
                    `  Fix: filter with status: { notIn: [...NON_LIVE_POLICY_STATUSES] } (lib/policy-status), ` +
                    `or add/extend an exemption WITH A WRITTEN REASON in this file.`
                )
            }
        }

        for (const [file, { count }] of Object.entries(exemptions)) {
            const actual = found.get(file)?.length ?? 0
            if (actual < count) {
                failures.push(
                    `Stale exemption: ${file} allows ${count} ${label} quer${count === 1 ? "y" : "ies"} but ` +
                    `${actual} remain${actual === 1 ? "s" : ""} — ratchet the entry down (or delete it) so the fix cannot regress.`
                )
            }
        }

        expect(failures, `\n${failures.join("\n\n")}\n`).toEqual([])
    }

    it('no Policy query requires status to equal exactly "active"', () => {
        enforce("bare-active", BARE_ACTIVE_EXEMPTIONS, 'bare-"active"')
    })

    it('no ownership SET query is missing a status decision', () => {
        enforce("unfiltered-ownership", UNFILTERED_OWNERSHIP_EXEMPTIONS, "unfiltered-ownership")
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// Probe fixtures: the matcher proven red AND proven honest, against committed
// files (CLAUDE.md: "a guard without a probe in the repo is not a guard").
// ─────────────────────────────────────────────────────────────────────────────

describe('the scanner is proven against committed probes', () => {
    const probe = (name: string) =>
        readFileSync(`tests/fixtures/guard-probes/${name}`, "utf-8")

    it('flags every spelling of a direct bare-"active" Policy query', () => {
        const { violations } = scanSource(probe("live-policy-bare-active-direct.ts.txt"))
        expect(violations.map((v) => v.kind)).toEqual(["bare-active", "bare-active", "bare-active"])
    })

    it('flags the relation form reaching Policy through another model', () => {
        const { violations } = scanSource(probe("live-policy-bare-active-relation.ts.txt"))
        expect(violations.map((v) => v.kind)).toEqual(["bare-active"])
    })

    it('flags ownership set queries with no status decision, direct and relation', () => {
        const { violations } = scanSource(probe("live-policy-unfiltered-ownership.ts.txt"))
        expect(violations.map((v) => v.kind)).toEqual(["unfiltered-ownership", "unfiltered-ownership"])
    })

    it('does NOT flag status:"active" on other models, id lookups, projections, or the sanctioned filter', () => {
        const src = probe("live-policy-compliant.ts.txt")
        // The fixture genuinely contains the dangerous token on OTHER models —
        // otherwise this test would prove nothing about discrimination.
        expect(src).toMatch(/status:\s*"active"/)
        expect(scanSource(src).violations).toEqual([])
    })

    it('ignores mentions inside comments (the authorization guard once passed on one)', () => {
        const commented = `
            // db.policy.findMany({ where: { ownerUserId: userId, status: "active" } })
            /* db.policy.count({ where: { ownerUserId: userId } }) */
            export {}
        `
        expect(scanSource(commented).violations).toEqual([])
    })
})
