import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"

/**
 * A request sent to an advisor reaches an advisor who can SEE the policy — and
 * the thread it opens is titled in Greek (PW-BRIDGE-01 D-03, D-04).
 *
 * Two defects, one seam. Every customer-to-advisor send picked its recipient
 * with `customerRelationship.findFirst({ status: "active" })`, which is not
 * policy-scoped (a customer with two advisors sent to whichever row Postgres
 * returned first) and contradicts every read path in `lib/agent-visibility.ts`
 * (`pending_activation` is the normal state before a customer accepts, so an
 * advisor who could already see the policy was skipped while the customer was
 * told the request was on its way). Meanwhile the thread those sends opened was
 * titled with a server-authored English literal — «Coverage gap clarification
 * requested» — which renders as a HEADING in a Greek customer's own timeline.
 *
 * WHAT THIS GUARDS, and why the shape is what it is:
 *
 *  (a) The UNIVERSE is every `ensureAutomationThread(` call site found by
 *      walking `app/` and `lib/`, never a hand-written list. A sixth thread
 *      opener added tomorrow is in scope the moment it exists. The floor below
 *      fails if the scan stops finding call sites, which is how a guard whose
 *      pattern silently stopped matching announces itself.
 *  (b) Every call site's `subject:` must come from a spec in
 *      `lib/insurance/content/agent-requests.ts` (`X.subject.el`). A string
 *      literal fails, in any language: the point is that the text is editorial
 *      content under review, not something typed at a call site.
 *  (c) Every call site's enclosing function must resolve its recipient through
 *      `resolvePolicyAdvisors`, unless it is EXEMPT with a stated reason — the
 *      two exemptions are actions that carry their own relationship because
 *      they create or act on it (a share, a questionnaire send), where there is
 *      nothing to resolve.
 *  (d) A non-exempt body may not reach for `customerRelationship.findFirst` at
 *      all. That is the exact call the repair removed, and the ratchet that
 *      stops it coming back one action at a time.
 *
 * The probe fixtures at the bottom are committed offences: they prove the three
 * rules can still turn red. A guard without a probe in the repo is not a guard.
 */

const ROOT = process.cwd()
const SCAN_ROOTS = ["app", "lib"]
/** Below this, assume the scan broke rather than that the code got cleaner. */
const CALL_SITE_FLOOR = 5

/**
 * Functions that legitimately do NOT resolve an advisor, with the reason.
 * Anything else must go through `resolvePolicyAdvisors`.
 */
const EXEMPT: Record<string, string> = {
    sharePolicy:
        "the customer is granting access in this very action — the relationship is its output, not something to resolve",
    sendQuestionnaire:
        "agent-initiated: the relationship is the action's own subject, supplied and authorised upstream",
}

function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        if (entry === "node_modules" || entry === ".next") continue
        const full = path.join(dir, entry)
        if (statSync(full).isDirectory()) walk(full, out)
        else if (full.endsWith(".ts") && !full.endsWith(".d.ts")) out.push(full)
    }
    return out
}

/** The balanced `{ … }` that begins at or after `from`, or null. Quote-aware. */
function bodyAfter(src: string, from: number): string | null {
    const open = src.indexOf("{", from)
    if (open < 0) return null
    let depth = 0
    for (let i = open; i < src.length; i++) {
        const c = src[i]
        if (c === '"' || c === "'" || c === "`") {
            const q = c
            i++
            while (i < src.length && src[i] !== q) {
                if (src[i] === "\\") i++
                i++
            }
            continue
        }
        if (c === "{") depth++
        else if (c === "}") {
            depth--
            if (depth === 0) return src.slice(open, i + 1)
        }
    }
    return null
}

/**
 * Control keywords read exactly like a method declaration to a regex — `if (…)
 * {`, `for (…) {`. Left in, they made the enclosing function of every guarded
 * call site come out as "if", which then failed the rule for a reason that had
 * nothing to do with the code.
 */
const NOT_A_FUNCTION = new Set(["if", "for", "while", "switch", "catch", "do", "else", "return", "function"])

/** The function whose body contains `index`, by nearest preceding declaration. */
function enclosingFunction(src: string, index: number): string {
    const head = src.slice(0, index)
    const decls = [...head.matchAll(/(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/g)]
    const methods = [...head.matchAll(/^\s{4}(?:async\s+)?([A-Za-z0-9_$]+)\s*\([^)]*\)\s*\{/gm)].filter(
        (m) => !NOT_A_FUNCTION.has(m[1])
    )
    const last = decls[decls.length - 1]
    const lastMethod = methods[methods.length - 1]
    if (last && (!lastMethod || last.index! > lastMethod.index!)) return last[1]
    if (lastMethod) return lastMethod[1]
    return "<module>"
}

function functionBodyOf(src: string, fn: string): string | null {
    const decl = new RegExp(`(?:export\\s+)?(?:async\\s+)?function\\s+${fn}\\s*\\(`).exec(src)
    if (decl) return bodyAfter(src, decl.index + decl[0].length)
    const method = new RegExp(`^\\s{4}(?:async\\s+)?${fn}\\s*\\(`, "m").exec(src)
    if (method) return bodyAfter(src, method.index + method[0].length)
    return null
}

interface Offence {
    rule: "subject-literal" | "unresolved-recipient" | "find-first-relationship"
    file: string
    fn: string
    detail: string
}

/**
 * The three rules, as one pure function over source text — so the same code
 * that scans the tree scans the probe fixtures.
 */
function scanSource(file: string, src: string): { callSites: number; offences: Offence[]; fns: string[] } {
    const offences: Offence[] = []
    const fns: string[] = []
    let callSites = 0

    for (const match of src.matchAll(/ensureAutomationThread\s*\(/g)) {
        const at = match.index!
        // The service's own declaration is not a call site.
        const before = src.slice(Math.max(0, at - 20), at)
        if (/async\s+$/.test(before)) continue
        callSites++

        const fn = enclosingFunction(src, at)
        fns.push(fn)
        const args = bodyAfter(src, at + match[0].length) ?? ""

        const subject = /subject\s*:\s*([^\n,]+)/.exec(args)
        if (!subject || !/\.subject\.el\b/.test(subject[1])) {
            offences.push({
                rule: "subject-literal",
                file,
                fn,
                detail: `subject: ${subject?.[1]?.trim() ?? "<missing>"}`,
            })
        }

        const body = functionBodyOf(src, fn) ?? src
        if (!(fn in EXEMPT) && !/resolvePolicyAdvisors\s*\(/.test(body)) {
            offences.push({ rule: "unresolved-recipient", file, fn, detail: "no resolvePolicyAdvisors call in body" })
        }
        if (!(fn in EXEMPT) && /customerRelationship\.findFirst\s*\(/.test(body)) {
            offences.push({ rule: "find-first-relationship", file, fn, detail: "customerRelationship.findFirst" })
        }
    }

    return { callSites, offences, fns }
}

const FILES = SCAN_ROOTS.flatMap((root) => walk(path.join(ROOT, root)))
const SCANNED = FILES.map((file) => ({
    file: path.relative(ROOT, file),
    ...scanSource(path.relative(ROOT, file), readFileSync(file, "utf8")),
})).filter((entry) => entry.callSites > 0)

const ALL_OFFENCES = SCANNED.flatMap((entry) => entry.offences)

describe("every advisor thread is opened by an enumerated call site", () => {
    it("finds at least the call sites that exist, so a broken scan fails loudly", () => {
        const total = SCANNED.reduce((sum, entry) => sum + entry.callSites, 0)
        expect(total).toBeGreaterThanOrEqual(CALL_SITE_FLOOR)
    })

    it("names the files it is guarding", () => {
        // Informational, and a tripwire: a file dropping out of this list means
        // its thread opener moved somewhere the scan does not look.
        expect(SCANNED.map((entry) => entry.file).sort()).toEqual([
            "app/(protected)/agent/actions.ts",
            "app/(protected)/wallet/actions.ts",
            "app/(protected)/wallet/collaborationActions.ts",
        ])
    })
})

describe("the thread's subject is editorial content, never a call-site literal", () => {
    it("has no subject typed at a call site", () => {
        expect(ALL_OFFENCES.filter((o) => o.rule === "subject-literal")).toEqual([])
    })
})

describe("the recipient is an advisor who can see the policy", () => {
    it("resolves every non-exempt send through resolvePolicyAdvisors", () => {
        expect(ALL_OFFENCES.filter((o) => o.rule === "unresolved-recipient")).toEqual([])
    })

    it("no non-exempt send reaches for customerRelationship.findFirst", () => {
        expect(ALL_OFFENCES.filter((o) => o.rule === "find-first-relationship")).toEqual([])
    })

    it("every exemption states its reason AND still names a live call site", () => {
        // An exemption for a function that no longer opens a thread is a hole
        // nobody is watching: it would silently excuse the next function that
        // happens to take the same name.
        const seen = new Set(SCANNED.flatMap((entry) => entry.fns))
        for (const [fn, reason] of Object.entries(EXEMPT)) {
            expect(reason.length, `${fn} needs a reason`).toBeGreaterThan(20)
            expect(seen, `${fn} is exempt but opens no thread`).toContain(fn)
        }
    })
})

describe("the probes still turn it red", () => {
    const probe = (name: string) => readFileSync(path.join(ROOT, "tests/fixtures/guard-probes", name), "utf8")

    it("catches an English subject typed at the call site", () => {
        const { offences } = scanSource("probe.ts", probe("advisor-thread-english-subject.ts.txt"))
        expect(offences.map((o) => o.rule)).toContain("subject-literal")
    })

    it("catches a recipient picked by findFirst on an active relationship", () => {
        const { offences } = scanSource("probe.ts", probe("advisor-thread-active-only.ts.txt"))
        expect(offences.map((o) => o.rule)).toContain("unresolved-recipient")
        expect(offences.map((o) => o.rule)).toContain("find-first-relationship")
    })
})
