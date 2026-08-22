import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"

import { stripCommentsAndStrings } from "./policy-authorization-single-path.test"

/**
 * Does this body CALL logAdminRead, as opposed to mentioning it?
 *
 * `toContain("logAdminRead(")` was the original check, and it is satisfied by a
 * comment saying "TODO: call logAdminRead(...)". That is the same mention-vs-use
 * hole the authorization guard was built to close, so it borrows the same
 * proven lexer rather than growing a second one.
 */
function callsLogAdminRead(body: string): boolean {
    return /\blogAdminRead\s*\(/.test(stripCommentsAndStrings(body))
}

/**
 * An admin read of someone else's data leaves a trace.
 *
 * Every MUTATING admin action logged. Reads did not — the audit trail had grown
 * up around "what was changed" rather than "what was seen", and for a data
 * subject the second question is the one that matters. The sharpest case was
 * `getUserDetails`, which pulled the whole `policyholderProfile` — chronic
 * conditions, family medical history, income, mortgage — for any customer, and
 * wrote nothing at all. It was also pure over-fetch: its only caller renders
 * none of those fields.
 *
 * That is the order this file enforces: do not read what you do not need, and
 * log what you do read.
 *
 * Like the erasure guard, this derives its subjects from the source rather than
 * from a hand-kept list, so a new admin read is covered by a test written
 * before it existed. That was written before it was true — AUDITED_READS below
 * is six names typed by hand. The derived scan further down is the claim made
 * good: it walks every exported admin function, and a pure read of another
 * person's data that logs nothing fails whether or not anyone remembered to
 * list it.
 */

const ADMIN_ACTIONS = readFileSync("app/(protected)/admin/actions.ts", "utf-8")
const POLICY_ACTIONS = readFileSync("app/(protected)/admin/policy-actions.ts", "utf-8")
const SUBMISSIONS_PAGE = readFileSync("app/(protected)/admin/submissions/page.tsx", "utf-8")
const TOKEN_USAGE = readFileSync("app/api/admin/tokens/usage/route.ts", "utf-8")
const PLAYBOOK = readFileSync("lib/services/gap-engine/agent-playbook.ts", "utf-8")
const SCHEMA = readFileSync("prisma/schema.prisma", "utf-8")
const GUARD = readFileSync("lib/admin/admin-guard.ts", "utf-8")

/** Body of a named exported function, up to the next top-level export. */
function functionBody(source: string, name: string): string {
    const start = source.indexOf(`export async function ${name}(`)
    if (start === -1) throw new Error(`${name} not found — rename or delete this expectation`)
    const rest = source.slice(start + 1)
    const end = rest.indexOf("\nexport ")
    return end === -1 ? rest : rest.slice(0, end)
}

/** Admin reads that expose another person's data, and must be audited. */
const AUDITED_READS: { name: string; source: string; why: string }[] = [
    { name: "getUserDetails", source: ADMIN_ACTIONS, why: "the whole account record of one customer" },
    { name: "getUsers", source: ADMIN_ACTIONS, why: "names, emails and phone numbers, paginated" },
    { name: "getPendingAgents", source: ADMIN_ACTIONS, why: "applicant names, emails, phone numbers" },
    { name: "getDsrQueue", source: ADMIN_ACTIONS, why: "every DSR requester's identity" },
    { name: "getExtractionFlagQueue", source: ADMIN_ACTIONS, why: "identities plus extracted document content" },
    { name: "getPoliciesForAdmin", source: POLICY_ACTIONS, why: "policies and owner emails across all owners" },
]

describe("admin reads of other people's data are audited", () => {
    for (const { name, source, why } of AUDITED_READS) {
        it(`${name} writes an audit row — it reads ${why}`, () => {
            expect(
                callsLogAdminRead(functionBody(source, name)),
                `${name} reads ${why} and must call logAdminRead. If it no longer reads ` +
                    `personal data, remove it from AUDITED_READS with that reason.`
            ).toBe(true)
        })
    }

    it("the admin submissions page audits its read", () => {
        // A page component, not an action — same rule: it lists the name, email,
        // phone and message of everyone who ever used the contact form.
        expect(SUBMISSIONS_PAGE).toContain("logAdminRead(")
    })

    it("the token-usage API audits its read", () => {
        // Takes ?userId=, so it can target one person's AI history by id.
        expect(TOKEN_USAGE).toContain("logAdminRead(")
        expect(TOKEN_USAGE).toContain("targetUserId")
    })
})

describe("special-category reads are distinguishable in the trail", () => {
    it("the advisor playbook records that it read the client's health profile", () => {
        // toLifeContext consumes chronicConditions and familyMedicalHistory, so
        // this read genuinely touches Art. 9 data and cannot be minimised away.
        expect(PLAYBOOK).toContain("AGENT_READ_CLIENT_PROFILE")
        expect(PLAYBOOK).toContain("specialCategory: true")
    })

    it("the admin DSAR execution records that the payload held special-category data", () => {
        expect(ADMIN_ACTIONS).toContain("specialCategory: true")
    })

    it("logAdminRead carries the subject and the field scope, not the values", () => {
        expect(GUARD).toContain("targetUserId")
        expect(GUARD).toContain("scope")
        expect(GUARD).toContain("specialCategory")
    })
})

describe("minimisation: the admin user page does not load a health record", () => {
    it("getUserDetails does not include the policyholder profile", () => {
        const body = functionBody(ADMIN_ACTIONS, "getUserDetails")
        // A bare relation include pulls every Art. 9 column. Its only caller
        // renders none of them. If a field here is ever genuinely needed, add a
        // named `select` — never the whole relation.
        expect(body).not.toContain("policyholderProfile: true")
        expect(body).not.toContain("agentProfile: true")
        expect(body).not.toContain("adminProfile: true")
    })
})

/**
 * Models whose rows describe a PERSON other than the admin reading them.
 * Derived membership, not a list of function names — that is the difference
 * between a guard and an inventory.
 */
const PERSONAL_MODEL =
    /\bdb\.(user|policyholderProfile|agentProfile|policy|policyDocument|dataSubjectRequest|contactSubmission|extractionFlag|activityLog|tokenBalance|subscription)\b/
const READS = /\.(findMany|findUnique|findFirst)\s*\(/
const WRITES = /\.(create|createMany|update|updateMany|delete|deleteMany|upsert)\s*\(/
const LOGS_ACTION = /\blogAdminAction\s*\(/

/**
 * Pure reads that legitimately write no read-audit row, each with its reason.
 * A name here is a decision on the record; an unlisted one fails.
 */
const READ_AUDIT_EXEMPT: Record<string, string> = {
    getDashboardMetrics:
        "aggregate counts only — no row is attributable to a person, so there is no subject to record",
    getActivityLogs:
        "reads the audit trail itself. Logging a read of the log with another log row is circular; " +
        "note that descriptions in that table do name other people, so this exemption is a real " +
        "trade-off rather than an obvious one",
}

/** Every exported admin function, with its stripped body. */
function exportedFunctions(source: string): Array<{ name: string; body: string }> {
    const src = stripCommentsAndStrings(source)
    const starts = [...src.matchAll(/export\s+async\s+function\s+(\w+)\s*\(/g)]
    return starts.map((m, i) => ({
        name: m[1],
        body: src.slice(m.index!, i + 1 < starts.length ? starts[i + 1].index! : src.length),
    }))
}

describe("a NEW admin read is covered before it is written", () => {
    // The docstring at the top of this file claimed subjects were derived from
    // source "so a new admin read is covered by a test written before it
    // existed". They were not — AUDITED_READS is six names typed by hand, and a
    // seventh read added tomorrow would have been invisible. This is that claim,
    // made true.
    const admin = exportedFunctions(ADMIN_ACTIONS)
    const policy = exportedFunctions(POLICY_ACTIONS)
    const all = [...admin, ...policy]

    const personalReads = all.filter((f) => PERSONAL_MODEL.test(f.body) && READS.test(f.body))
    // A mutation that reads first is covered by the mutation rule, which is
    // logAdminAction. Only PURE reads owe a read-audit row.
    const pureReads = personalReads.filter(
        (f) => !WRITES.test(f.body) && !LOGS_ACTION.test(f.body)
    )

    it("discovers the admin surface (the scan is not vacuous)", () => {
        expect(all.length).toBeGreaterThan(20)
        expect(personalReads.length).toBeGreaterThan(10)
        expect(pureReads.length).toBeGreaterThan(0)
    })

    it("every mutation that reads personal data still logs the ACTION", () => {
        const mutations = personalReads.filter((f) => WRITES.test(f.body))
        const silent = mutations.filter((f) => !LOGS_ACTION.test(f.body)).map((f) => f.name)
        expect(
            silent,
            "These change another person's record and record nothing:\n  " + silent.join("\n  ")
        ).toEqual([])
    })

    it("every pure read of personal data logs the READ, or is exempt with a reason", () => {
        const offenders = pureReads
            .filter((f) => !callsLogAdminRead(f.body) && !(f.name in READ_AUDIT_EXEMPT))
            .map((f) => f.name)
        expect(
            offenders,
            "These read another person's data and leave no trace. Call logAdminRead, " +
                "or add the name to READ_AUDIT_EXEMPT with the reason:\n  " + offenders.join("\n  ")
        ).toEqual([])
    })

    it("keeps the exemption list honest — every exempt name still exists and is still a pure read", () => {
        const names = new Set(pureReads.map((f) => f.name))
        const stale = Object.keys(READ_AUDIT_EXEMPT).filter((n) => !names.has(n))
        expect(
            stale,
            "These are exempted but are no longer pure reads of personal data — delete the entry:\n  " +
                stale.join("\n  ")
        ).toEqual([])
    })

    it("a comment naming logAdminRead does not satisfy the check", () => {
        // The probe the original check would have accepted.
        const mentionsOnly = `
            export async function getSomeonesRecord(id: string) {
                // TODO: call logAdminRead(admin, "READ", "...") before returning.
                // See lib/admin/admin-guard.ts — logAdminRead(...) is the single path.
                return db.user.findUnique({ where: { id } })
            }
        `
        expect(/\blogAdminRead\s*\(/.test(mentionsOnly)).toBe(true) // raw text matches
        expect(callsLogAdminRead(mentionsOnly)).toBe(false) // but not as code

        const realCall = `
            export async function getSomeonesRecord(id: string) {
                await logAdminRead(admin, "READ", "one customer", { targetUserId: id })
                return db.user.findUnique({ where: { id } })
            }
        `
        expect(callsLogAdminRead(realCall)).toBe(true)
    })
})

describe("the vestigial break-glass column is gone", () => {
    it("is absent from the schema", () => {
        // It had one writer (a user's own deletion request — not an emergency
        // override of anyone's data) and zero readers. A column whose name
        // implies a control that does not exist reads as evidence of one.
        expect(SCHEMA).not.toContain("isBreakGlass")
        expect(SCHEMA).not.toContain("is_break_glass")
    })
})
