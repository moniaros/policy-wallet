import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"

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
 * before it existed.
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
                functionBody(source, name),
                `${name} reads ${why} and must call logAdminRead. If it no longer reads ` +
                    `personal data, remove it from AUDITED_READS with that reason.`
            ).toContain("logAdminRead(")
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

describe("the vestigial break-glass column is gone", () => {
    it("is absent from the schema", () => {
        // It had one writer (a user's own deletion request — not an emergency
        // override of anyone's data) and zero readers. A column whose name
        // implies a control that does not exist reads as evidence of one.
        expect(SCHEMA).not.toContain("isBreakGlass")
        expect(SCHEMA).not.toContain("is_break_glass")
    })
})
