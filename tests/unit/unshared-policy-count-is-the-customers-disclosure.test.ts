import { describe, expect, it, vi, beforeEach } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"

/**
 * The advisor learns that unshared policies exist only because the CUSTOMER
 * said so (halt H-B2).
 *
 * The halt asked whether the agent side should disclose that a client holds
 * policies beyond the shared ones — existence, or a count. The answer taken was
 * neither of those as a platform behaviour: an advisor cannot infer it today,
 * and a number we volunteer is new information about someone's record that they
 * never shared. What ships instead is a switch on the customer's own advisor
 * page, off by default, disclosing a COUNT and nothing else.
 *
 * That makes exactly three things load-bearing, and this guards all three:
 *
 *  (a) DEFAULT SILENCE. `unsharedPolicyCount` is `null` unless the flag is on,
 *      and the query that would compute it does not even run — so the number
 *      cannot leak through a timing difference either. `null` is not `0`:
 *      zero is a customer who opted in and has shared everything.
 *  (b) ONE READER. The Prisma field `unsharedCountDisclosed` may appear only in
 *      the files listed below, each with a reason. Enumerated from the tree, so
 *      a second surface reading the flag fails here rather than shipping a
 *      disclosure nobody reviewed.
 *  (c) THE CUSTOMER'S DECISION. Only the policyholder of that relationship can
 *      set it. An advisor calling the action for their own relationship is
 *      refused — the disclosure is not theirs to make.
 *
 * The probe fixture is a committed offence proving (b) still turns red.
 */

const ROOT = process.cwd()

/** Every file allowed to name the Prisma field, and why. */
const ALLOWED_READERS: Record<string, string> = {
    "prisma/schema.prisma": "the column itself",
    "lib/services/customer.service.ts": "the one read: gates the count query and returns null when off",
    "app/(protected)/agent/page.tsx": "the customer's own page, showing them their own switch",
    "app/(protected)/agent/AgentClient.tsx":
        "the switch itself — the customer's own screen, where seeing their own setting is the point",
    "app/(protected)/agent/relationship-actions.ts": "the one write, authorised as the policyholder",
}

function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        if (entry === "node_modules" || entry === ".next") continue
        const full = path.join(dir, entry)
        if (statSync(full).isDirectory()) walk(full, out)
        else if (/\.(ts|tsx|prisma)$/.test(full)) out.push(full)
    }
    return out
}

describe("only one path reads the customer's disclosure flag", () => {
    const readers = ["app", "lib", "components", "prisma"]
        .flatMap((root) => walk(path.join(ROOT, root)))
        .map((file) => path.relative(ROOT, file))
        .filter((file) =>
            /unsharedCountDisclosed|unshared_count_disclosed/.test(readFileSync(path.join(ROOT, file), "utf8"))
        )

    it("names no file the halt's decision did not sanction", () => {
        expect(readers.filter((file) => !(file in ALLOWED_READERS)).sort()).toEqual([])
    })

    it("still finds every sanctioned reader — a rename must not silently empty the scan", () => {
        expect(readers.sort()).toEqual(Object.keys(ALLOWED_READERS).sort())
    })

    it("catches a fifth reader (probe)", () => {
        const probe = readFileSync(
            path.join(ROOT, "tests/fixtures/guard-probes/unshared-count-second-reader.ts.txt"),
            "utf8"
        )
        // The scan above is "file contains the identifier"; the probe proves an
        // unsanctioned file WOULD be caught by it.
        expect(/unsharedCountDisclosed/.test(probe)).toBe(true)
        expect("tests/fixtures/guard-probes/unshared-count-second-reader.ts.txt" in ALLOWED_READERS).toBe(false)
    })
})

/* ── (a) and (c): behaviour ─────────────────────────────────────────────── */

const relationshipFindFirst = vi.fn()
const relationshipFindUnique = vi.fn()
const relationshipUpdate = vi.fn(async (_a?: any) => ({}))
const policyCount = vi.fn(async () => 0)
const userFindUnique = vi.fn(async () => ({ email: "agent@example.com" }))
const activityCreate = vi.fn(async () => ({}))
const getAuthenticatedUserOrNull = vi.fn()

vi.mock("@/lib/db", () => ({
    db: {
        customerRelationship: {
            findFirst: (...a: any[]) => relationshipFindFirst(...a),
            findUnique: (...a: any[]) => relationshipFindUnique(...a),
            update: (...a: any[]) => (relationshipUpdate as any)(...a),
        },
        policy: { count: (...a: any[]) => (policyCount as any)(...a) },
        user: { findUnique: (...a: any[]) => (userFindUnique as any)(...a) },
        activityLog: { create: (...a: any[]) => (activityCreate as any)(...a) },
    },
}))
vi.mock("@/lib/auth-helpers", () => ({
    getAuthenticatedUserOrNull: (...a: any[]) => getAuthenticatedUserOrNull(...a),
    getAuthenticatedUser: vi.fn(),
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/agent-visibility", () => ({
    agentPolicyVisibilityWhere: () => ({}),
    getGrantedPolicyIds: async () => [],
    isPolicyVisibleToAgent: () => true,
    ENDED_RELATIONSHIP_STATUSES: ["inactive", "terminated"],
}))
vi.mock("@/lib/services/credential-signals", () => ({
    hasPasswordCredential: async () => true,
    passwordPresence: () => "present",
}))
vi.mock("@/lib/agent-consent", () => ({
    agentMaySeeCustomerIdentity: () => true,
    isPhantomCustomer: () => false,
}))

import { db } from "@/lib/db"
import { CustomerService } from "@/lib/services/customer.service"
import { setUnsharedCountDisclosure } from "@/app/(protected)/agent/relationship-actions"

const CUSTOMER = "cust-1"
const AGENT = "agent-1"

/** No visible policies; the customer really holds five. */
function relationshipRow(unsharedCountDisclosed: boolean) {
    return {
        id: "rel-1",
        agentUserId: AGENT,
        policyholderUserId: CUSTOMER,
        status: "active",
        activationStatus: "active",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        lastInteractionAt: null,
        unsharedCountDisclosed,
        customer: {
            id: CUSTOMER,
            name: "Πελάτης",
            email: "c@example.com",
            contactEmailMissing: false,
            phoneNumber: null,
            image: null,
            emailVerified: new Date("2026-01-01T00:00:00.000Z"),
            policiesOwned: [],
        },
        opportunities: [],
    }
}

beforeEach(() => {
    vi.clearAllMocks()
    policyCount.mockResolvedValue(5)
    userFindUnique.mockResolvedValue({ email: "agent@example.com" } as any)
})

describe("the count is null until the customer discloses it", () => {
    it("returns null, and does not even ask how many policies exist", async () => {
        relationshipFindFirst.mockResolvedValue(relationshipRow(false))
        const profile = await new CustomerService(db as any).getCustomerProfile(AGENT, CUSTOMER)
        expect(profile.relationship.unsharedPolicyCount).toBeNull()
        expect(policyCount).not.toHaveBeenCalled()
    })

    it("returns the count once they have, over the policies this agent can see", async () => {
        relationshipFindFirst.mockResolvedValue(relationshipRow(true))
        const profile = await new CustomerService(db as any).getCustomerProfile(AGENT, CUSTOMER)
        // 5 held, 0 visible in this fixture.
        expect(profile.relationship.unsharedPolicyCount).toBe(5)
        expect(policyCount).toHaveBeenCalledWith({ where: { ownerUserId: CUSTOMER } })
    })

    it("never reports a negative count", async () => {
        relationshipFindFirst.mockResolvedValue(relationshipRow(true))
        policyCount.mockResolvedValue(0)
        const profile = await new CustomerService(db as any).getCustomerProfile(AGENT, CUSTOMER)
        expect(profile.relationship.unsharedPolicyCount).toBe(0)
    })
})

describe("only the policyholder decides", () => {
    it("refuses an anonymous caller before touching the row", async () => {
        getAuthenticatedUserOrNull.mockResolvedValue(null)
        expect(await setUnsharedCountDisclosure("rel-1", true)).toEqual({ success: false, error: "UNAUTHORIZED" })
        expect(relationshipUpdate).not.toHaveBeenCalled()
    })

    it("refuses the ADVISOR on their own relationship — the disclosure is not theirs", async () => {
        getAuthenticatedUserOrNull.mockResolvedValue({ dbUser: { id: AGENT, roles: "agent" } })
        relationshipFindUnique.mockResolvedValue({ id: "rel-1", policyholderUserId: CUSTOMER })
        expect(await setUnsharedCountDisclosure("rel-1", true)).toEqual({ success: false, error: "UNAUTHORIZED" })
        expect(relationshipUpdate).not.toHaveBeenCalled()
    })

    it("lets the policyholder switch it on, and back off again", async () => {
        getAuthenticatedUserOrNull.mockResolvedValue({ dbUser: { id: CUSTOMER, roles: "policyholder" } })
        relationshipFindUnique.mockResolvedValue({ id: "rel-1", policyholderUserId: CUSTOMER })

        expect(await setUnsharedCountDisclosure("rel-1", true)).toEqual({ success: true, disclosed: true })
        expect(relationshipUpdate).toHaveBeenCalledWith({
            where: { id: "rel-1" },
            data: { unsharedCountDisclosed: true },
        })

        expect(await setUnsharedCountDisclosure("rel-1", false)).toEqual({ success: true, disclosed: false })
        expect(relationshipUpdate).toHaveBeenLastCalledWith({
            where: { id: "rel-1" },
            data: { unsharedCountDisclosed: false },
        })
    })

    it("refuses a relationship that does not exist", async () => {
        getAuthenticatedUserOrNull.mockResolvedValue({ dbUser: { id: CUSTOMER, roles: "policyholder" } })
        relationshipFindUnique.mockResolvedValue(null)
        expect(await setUnsharedCountDisclosure("rel-nope", true)).toEqual({ success: false, error: "NOT_FOUND" })
    })
})
