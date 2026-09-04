import { describe, it, expect, vi } from "vitest"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

/**
 * Next 16 hands a dynamic route's `params` to a server page as a PROMISE.
 *
 * `app/(protected)/customers/[id]/page.tsx` typed it as `{ id: string }` and
 * read `params.id` synchronously. That is `undefined` at runtime, and
 * `getCustomerProfile(undefined)` reached a Prisma `findFirst` with
 * `policyholderUserId: undefined` — a condition Prisma DROPS rather than
 * matches — so the page rendered whichever of the agent's customers sorted
 * first, and the per-customer upload on that page attached the policy to
 * that person. Nothing threw. TypeScript did not object either: the page's own
 * props interface said it was an object.
 *
 * The page list is derived from the FILESYSTEM: every `page.tsx` under a
 * `[segment]` directory in app/, so a route added tomorrow is covered today.
 * The matcher runs against committed probes at the bottom so its red/green is
 * re-runnable, not asserted.
 */

const repoRoot = join(__dirname, "..", "..")

function dynamicPageFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
        const full = join(dir, entry)
        if (statSync(full).isDirectory()) return dynamicPageFiles(full)
        if (entry !== "page.tsx") return []
        return /\[[^\]]+\]/.test(full) ? [full] : []
    })
}

function stripComments(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
}

/**
 * Returns the offending shape, or null when the file is clean.
 *
 * A client page (`"use client"`) is exempt by construction: `useParams()`
 * returns a synchronous object and `params` there is a local binding, not the
 * server props Promise. Every other page must reach the values through
 * `await params` (or React's `use(params)`), and once those are removed no
 * `params.x` / `= params` read may remain — a stale synchronous read after a
 * correct await is still a read of a Promise.
 */
export function syncParamsRead(source: string): string | null {
    const code = stripComments(source)
    if (/^\s*["']use client["']/m.test(code)) return null

    const withoutAwaits = code
        .replace(/await\s+params\b/g, "")
        .replace(/await\s+props\.params\b/g, "")
        .replace(/\buse\(\s*params\s*\)/g, "")
        .replace(/\buse\(\s*props\.params\s*\)/g, "")

    if (/\bparams\s*\.\s*[A-Za-z_$]/.test(withoutAwaits)) return "reads params.<key> without awaiting params"
    if (/\}\s*=\s*params\b/.test(withoutAwaits)) return "destructures params without awaiting it"
    if (/\bparams\s*\[/.test(withoutAwaits)) return "indexes params without awaiting it"
    return null
}

describe("dynamic route pages await params (Next 16)", () => {
    const pages = dynamicPageFiles(join(repoRoot, "app"))

    it("finds the dynamic pages it is supposed to guard", () => {
        expect(pages.length).toBeGreaterThan(10)
        expect(pages.some((p) => p.includes("customers/[id]/page.tsx"))).toBe(true)
    })

    it.each(pages.map((p) => [p.slice(repoRoot.length + 1), p] as const))(
        "%s",
        (_label, file) => {
            const offence = syncParamsRead(readFileSync(file, "utf8"))
            expect(
                offence,
                `${file}: ${offence}. On Next 16 \`params\` is a Promise — \`const { id } = await params\`. ` +
                    `Read synchronously it is undefined, and an undefined Prisma where-condition matches ANY row.`
            ).toBeNull()
        }
    )
})

describe("the params matcher is proven against committed probes", () => {
    const probe = (name: string) =>
        readFileSync(join(repoRoot, "tests/fixtures/guard-probes", name), "utf8")

    it("flags a synchronous params.<key> read", () => {
        expect(syncParamsRead(probe("dynamic-params-sync-read.tsx.txt"))).not.toBeNull()
    })

    it("flags a synchronous destructure of params", () => {
        expect(syncParamsRead(probe("dynamic-params-destructured-sync.tsx.txt"))).not.toBeNull()
    })

    it("passes an awaited params", () => {
        expect(syncParamsRead(probe("dynamic-params-awaited.tsx.txt"))).toBeNull()
    })

    it("passes a client page using useParams()", () => {
        expect(syncParamsRead(probe("dynamic-params-client-use-params.tsx.txt"))).toBeNull()
    })
})

/**
 * The service half of the same defect: even with the page fixed, the profile
 * read must refuse a missing id rather than let Prisma drop the condition.
 */
describe("CustomerService.getCustomerProfile refuses a missing id", () => {
    it("throws before touching the database when the id is undefined", async () => {
        const { CustomerService } = await import("@/lib/services/customer.service")
        const findFirst = vi.fn()
        const db = {
            customerRelationship: { findFirst },
            accessGrant: { findMany: vi.fn(async () => []) },
        }
        const svc = new CustomerService(db as any)

        await expect(svc.getCustomerProfile("agent-1", undefined as unknown as string)).rejects.toThrow()
        await expect(svc.getCustomerProfile("agent-1", "")).rejects.toThrow()
        expect(findFirst).not.toHaveBeenCalled()
    })
})
