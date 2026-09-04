import { describe, it, expect } from "vitest"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { normalizeEmail } from "@/lib/identity/normalize-email"

/**
 * One normaliser for the email identity key, on every writer and lookup.
 *
 * Auth lowercased before it looked a row up (app/auth/actions.ts,
 * app/auth/callback/route.ts). The agent paths — createCustomer,
 * createAgentInvite, bulk import — never did. So an agent typing `John@X.gr`
 * created a phantom under that spelling, the customer later signed up as
 * `john@x.gr`, auth found no row and created a second one, and the
 * relationship the agent had built pointed at the phantom forever. Two users,
 * one person, a relationship that never activated.
 *
 * The site list is derived from the FILESYSTEM (every `user.create(` and every
 * `user.<lookup>({ where: { email` under app/ and lib/), and each site must
 * call `normalizeEmail(` in the SAME function — an import elsewhere in the
 * file proves nothing about the value that reached the write. Probes at the
 * bottom prove the matcher red and green.
 */

const repoRoot = join(__dirname, "..", "..")

function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
        const full = join(dir, entry)
        if (entry === "node_modules" || entry.startsWith(".")) return []
        if (statSync(full).isDirectory()) return sourceFiles(full)
        return /\.(ts|tsx)$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry) ? [full] : []
    })
}

function stripComments(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
}

/** A site that creates a User or looks one up by email. */
const SITE = /\buser\.(?:create(?:Many(?:AndReturn)?)?\(|(?:findUnique|findFirst|update|upsert|delete)\(\s*\{\s*where:\s*\{\s*email\b)/g

/** Where a function begins — declarations, class methods, `const f = (`. */
const FUNCTION_START =
    /^(?:[ \t]*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\b|[ \t]*(?:export\s+)?const\s+\w+\s*=\s*(?:async\s*)?(?:\([^)]*\)|\w+)\s*(?::[^=]*)?=>|[ \t]{2,}(?:(?:private|protected|public|static|async)\s+)*(?!if\b|for\b|while\b|switch\b|catch\b|return\b)\w+\s*\([^)]*\)\s*(?::[^{]*)?\{[ \t]*$)/gm

function enclosingFunction(code: string, index: number): string {
    let start = 0
    let end = code.length
    for (const m of code.matchAll(FUNCTION_START)) {
        if (m.index! <= index) start = m.index!
        else { end = m.index!; break }
    }
    return code.slice(start, end)
}

/** Every site in `source` whose enclosing function never calls normalizeEmail. */
export function unnormalizedEmailSites(file: string, source: string): string[] {
    const code = stripComments(source)
    const offenders: string[] = []
    for (const m of code.matchAll(SITE)) {
        const fn = enclosingFunction(code, m.index!)
        if (!/\bnormalizeEmail\(/.test(fn)) {
            const line = code.slice(0, m.index!).split("\n").length
            offenders.push(`${file}:${line} :: ${m[0].split("\n")[0]}`)
        }
    }
    return offenders
}

describe("normalizeEmail", () => {
    it("trims, lowercases and NFC-normalises", () => {
        expect(normalizeEmail("  John@X.GR ")).toBe("john@x.gr")
        // A decomposed accent (e + combining acute) becomes the composed form.
        expect(normalizeEmail("josé@x.gr")).toBe("josé@x.gr")
    })

    it("is idempotent and total", () => {
        expect(normalizeEmail(normalizeEmail("A@B.C"))).toBe("a@b.c")
        expect(normalizeEmail(null)).toBe("")
        expect(normalizeEmail(undefined)).toBe("")
        expect(normalizeEmail(42 as unknown as string)).toBe("")
    })

    it("does not strip dots or plus tags — those are provider-specific", () => {
        expect(normalizeEmail("First.Last+tag@Gmail.com")).toBe("first.last+tag@gmail.com")
    })
})

describe("every email-keyed User writer and lookup goes through normalizeEmail", () => {
    const files = [...sourceFiles(join(repoRoot, "app")), ...sourceFiles(join(repoRoot, "lib"))]

    it("enumerates the sites it is supposed to guard", () => {
        const sites = files.flatMap((f) => {
            const code = stripComments(readFileSync(f, "utf8"))
            return [...code.matchAll(SITE)].map(() => f)
        })
        // The agent intake writers, auth, and the wallet lookups — at least.
        expect(sites.length).toBeGreaterThanOrEqual(8)
        for (const expected of [
            "lib/services/customer.service.ts",
            "app/(protected)/agent/actions.ts",
            "app/api/v1/customers/bulk-import/route.ts",
            "app/auth/actions.ts",
        ]) {
            expect(sites.some((s) => s.endsWith(expected)), expected).toBe(true)
        }
    })

    it("names every site whose function never normalises", () => {
        const offenders = files.flatMap((f) =>
            unnormalizedEmailSites(f.slice(repoRoot.length + 1), readFileSync(f, "utf8"))
        )
        expect(
            offenders,
            "A User row is created or looked up by an email that never went through " +
                "normalizeEmail() in the same function. Mixed-case input here creates a second " +
                "user for the same person:\n  " + offenders.join("\n  ")
        ).toEqual([])
    })
})

describe("the site matcher is proven against committed probes", () => {
    const probe = (name: string) =>
        readFileSync(join(repoRoot, "tests/fixtures/guard-probes", name), "utf8")

    it("flags a raw writer", () => {
        expect(unnormalizedEmailSites("probe", probe("email-writer-raw.ts.txt")).length).toBe(2)
    })

    it("flags a writer whose normalisation happens in another function", () => {
        expect(unnormalizedEmailSites("probe", probe("email-writer-normalized-elsewhere.ts.txt")).length).toBe(1)
    })

    it("passes a writer that normalises in the same function", () => {
        expect(unnormalizedEmailSites("probe", probe("email-writer-normalized.ts.txt"))).toEqual([])
    })
})
