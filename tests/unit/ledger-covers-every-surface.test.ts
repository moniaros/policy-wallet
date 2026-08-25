import { describe, it, expect, vi } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

// proxy.ts transitively imports lib/rate-limit → lib/env, whose zod schema
// wants production secrets this test never touches. Same stub the other
// proxy-classifier guards use; `resolveRouteOwner` itself is pure.
vi.mock("@/lib/rate-limit", () => ({
    rateLimit: vi.fn(async () => ({ success: true })),
}))

import { resolveRouteOwner } from "@/proxy"

/**
 * The capability ledger's universe comes from the filesystem, not from a list.
 *
 * `LEDGER.md` declares "LEDGER STATUS: 20 of 20 surfaces + 7 overlays
 * enumerated." That denominator was hand-written, so the claim was true of the
 * list and not of the product: `/branches/[branch]` — 392 lines of per-branch
 * policies, renewals, recommendations and actions — had no rows at all, and was
 * found only because Phase 2 went to delete its parent.
 *
 * This is the same failure the guards kept having (D-005), reaching the artifact
 * that is supposed to catch it. §12 says no capability is removed, merged or
 * relocated without a ledger row — a protection worth exactly as much as the
 * ledger's coverage, because a capability with NO row can be deleted and the
 * rule reports no violation. Nothing was measuring the coverage.
 *
 * Ownership is resolved through `resolveRouteOwner` from proxy.ts rather than a
 * hardcoded B2B list, so the two cannot drift: `/wallet/*​/review` is
 * agent-owned there, which is why its absence from the ledger is correct rather
 * than a miss.
 */
const APP = "app/(protected)"
const LEDGER = readFileSync("docs/transformation/LEDGER.md", "utf-8")

/**
 * Enumerated means it has a SECTION or a TABLE ROW — not that the file happens
 * to mention it. Prose caught this out immediately: writing D-028's correction,
 * which names `/branches/[branch]` as the surface that had no rows, made the
 * route look enumerated to a plain substring test. A mention is not coverage.
 */
function isEnumerated(route: string): boolean {
    const needle = `\`${route}\``
    return LEDGER.split("\n").some(
        (line) => (line.startsWith("## ") || line.startsWith("|")) && line.includes(needle)
    )
}

/** Every route under (protected) that actually renders a page. */
function routes(dir = APP, prefix = ""): string[] {
    const out: string[] = []
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry)
        if (!statSync(full).isDirectory()) continue
        // Route groups `(x)` do not contribute a segment.
        const seg = entry.startsWith("(") ? "" : `/${entry}`
        const here = prefix + seg
        if (readdirSync(full).includes("page.tsx")) out.push(here || "/")
        out.push(...routes(full, here))
    }
    return out.sort()
}

/** `[id]` → a concrete segment, so proxy patterns like `/wallet/*​/review` match. */
const concrete = (r: string) => r.replace(/\[([^\]]+)\]/g, "x")

/**
 * Routes the ledger covers under a collective heading rather than by name.
 * D-022: each names the heading, and the heading is asserted to still say so.
 */
const COVERED_COLLECTIVELY: Record<string, string> = {
    "/account/profile": "Ρυθμίσεις — `/account` + 5 subpages",
    "/account/privacy": "Ρυθμίσεις — `/account` + 5 subpages",
    "/account/security": "Ρυθμίσεις — `/account` + 5 subpages",
    "/account/plan": "Ρυθμίσεις — `/account` + 5 subpages",
    "/account/notifications": "Ρυθμίσεις — `/account` + 5 subpages",
}

/**
 * Known gaps, each with the item that will close it. This list may only SHRINK.
 * A new surface must get rows, not an entry here.
 */
const UNENUMERATED: Record<string, string> = {
    "/branches/[branch]": "V2-P2-01 — 392 lines, absorbed into /protection; rows to follow from that item",
    "/collaboration/threads/[id]": "not in Phase 2's path; rows owed before anything relocates it",
}

describe("every B2C surface has ledger rows", () => {
    const all = routes()
    // B2C = everything the proxy does NOT hand to a staff role. `null` means
    // no role gate, which a customer can reach, so it stays in.
    const STAFF = new Set(["agent", "admin"])
    const b2c = all.filter((r) => !STAFF.has(resolveRouteOwner(concrete(r)) ?? ""))

    it("enumerates a real universe", () => {
        expect(all.length).toBeGreaterThan(30)
        expect(b2c.length).toBeGreaterThan(20)
        // Sanity on the classifier: a known agent route must be excluded, and a
        // known customer route included.
        expect(b2c).not.toContain("/customers")
        expect(b2c).not.toContain("/admin")
        expect(b2c).toContain("/wallet")
    })

    it("resolves ownership through proxy.ts, so the two cannot drift", () => {
        expect(resolveRouteOwner("/wallet/x/review")).toBe("agent")
        expect(resolveRouteOwner("/wallet")).toBe("policyholder")
    })

    it("every collective heading it points at still exists", () => {
        for (const heading of new Set(Object.values(COVERED_COLLECTIVELY))) {
            expect(LEDGER, `the heading "${heading}" moved — re-point or itemise`).toContain(heading)
        }
    })

    it("names every B2C surface, or records it as a known gap", () => {
        const unnamed = b2c
            .filter((r) => !isEnumerated(r))
            .filter((r) => !COVERED_COLLECTIVELY[r])
            .filter((r) => !UNENUMERATED[r])
        expect(unnamed).toEqual([])
    })

    it("the known-gap list only shrinks, and carries no stale entry", () => {
        for (const [route, reason] of Object.entries(UNENUMERATED)) {
            expect(b2c, `${route} is no longer a B2C route — drop its entry`).toContain(route)
            expect(
                isEnumerated(route),
                `${route} now has ledger rows — delete its UNENUMERATED entry (${reason})`
            ).toBe(false)
        }
    })
})
