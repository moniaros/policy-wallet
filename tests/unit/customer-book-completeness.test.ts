/**
 * WP-18 — an agent's customer list must not end where the first page ends.
 *
 * getCustomers requested a single page of 100 "to mimic all", then returned
 * only that page. An agent with 150 clients saw 100 and nothing anywhere said
 * the other 50 existed — the book simply stopped. That is a correctness defect
 * long before it is a scale one, and it is invisible until someone counts.
 *
 * The replacement pages through. Its safety cap LOGS when crossed rather than
 * truncating quietly: the failure being fixed was silence, so a cap that
 * repeated the silence would be no fix.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const getCustomersPage = vi.fn()
const logger = vi.fn()

vi.mock("@/lib/auth-helpers", () => ({
    getAuthenticatedUserOrNull: vi.fn(async () => ({
        dbUser: { id: "agent-1", roles: "agent" },
    })),
}))
vi.mock("@/lib/auth/require-agent", () => ({ isAgentRole: () => true }))
vi.mock("@/lib/logger", () => ({ logger: (...a: unknown[]) => logger(...a) }))
vi.mock("@/lib/services/customer.service", () => ({
    CustomerService: class {
        getCustomers = (...a: unknown[]) => getCustomersPage(...a)
    },
}))
vi.mock("@/lib/db", () => ({ db: {} }))

// agent/actions pulls in the AI factory, which imports lib/env and parses the
// real process.env at module load. The suite carries none of those secrets.
vi.mock("@/lib/env", () => ({
    env: {
        GEMINI_MODEL_CLARITY_ANALYSIS: "gemini-test",
        GEMINI_MODEL_EXTRACTION: "gemini-test",
        GEMINI_MODEL_GAP_ANALYSIS: "gemini-test",
        GEMINI_MODEL_QA: "gemini-test",
        GEMINI_MODEL_FALLBACK: "gemini-test",
        CLAUDE_MODEL_EXTRACTION: "claude-test",
        CLAUDE_MODEL_GAP_ANALYSIS: "claude-test",
        CLAUDE_MODEL_CLARITY_ANALYSIS: "claude-test",
        CLAUDE_MODEL_QA: "claude-test",
        FF_AI_FAILOVER_OPENAI: "false",
        FF_AI_DEGRADED_COMPLETION: "true",
    },
}))

/** A book of `total` customers served in pages of `pageSize`. */
function bookOf(total: number, pageSize = 100) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    getCustomersPage.mockImplementation(async (_agent: string, filters: any) => {
        const page = filters.page ?? 1
        const start = (page - 1) * pageSize
        const data = Array.from({ length: Math.max(0, Math.min(pageSize, total - start)) }, (_, i) => ({
            id: `c${start + i}`,
            relationshipId: `r${start + i}`,
            name: `Customer ${start + i}`,
            email: `c${start + i}@example.gr`,
            status: "active",
            joinedAt: new Date(),
        }))
        return { data, meta: { total, page, limit: pageSize, totalPages } }
    })
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe("getCustomers", () => {
    it("returns a book that fits in one page unchanged", async () => {
        bookOf(42)
        const { getCustomers } = await import("@/app/(protected)/agent/actions")

        expect(await getCustomers()).toHaveLength(42)
    })

    it("returns EVERY customer when the book exceeds one page", async () => {
        // The exact regression: 150 clients used to come back as 100.
        bookOf(150)
        const { getCustomers } = await import("@/app/(protected)/agent/actions")

        expect(await getCustomers()).toHaveLength(150)
    })

    it("returns the whole book across many pages", async () => {
        bookOf(1000)
        const { getCustomers } = await import("@/app/(protected)/agent/actions")

        const customers = await getCustomers()
        expect(customers).toHaveLength(1000)
        // No duplicates — a paging bug that re-reads page 1 would double rows.
        expect(new Set(customers.map((c) => c.id)).size).toBe(1000)
    })

    it("stops at the page cap and SAYS SO rather than truncating in silence", async () => {
        bookOf(100_000)
        const { getCustomers } = await import("@/app/(protected)/agent/actions")

        await getCustomers()

        expect(logger).toHaveBeenCalledWith(
            "warn",
            expect.stringContaining("page cap"),
            expect.objectContaining({ agentId: "agent-1" })
        )
    })

    it("asks for successive pages rather than the same one repeatedly", async () => {
        bookOf(250)
        const { getCustomers } = await import("@/app/(protected)/agent/actions")
        await getCustomers()

        const pages = getCustomersPage.mock.calls.map((c) => c[1].page)
        expect(pages).toEqual([1, 2, 3])
    })
})
