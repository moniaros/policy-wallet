/**
 * The public header's language toggle must never link to a 404.
 *
 * It used to build `/en${path}` blindly, so /solutions/synergates and /perks
 * linked to English pages that do not exist, and the English partners page
 * lived on a Greek-tree URL (docs/audits/public-site-and-design-system-2026-10.md
 * A3/A4). The universe is enumerated from app/(public) on disk: every static
 * page in either tree, toggled to the other language, must land on a page.
 */
import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { englishCounterpart, greekCounterpart } from "@/lib/seo/locale-links"

const PUBLIC_DIR = path.join(process.cwd(), "app/(public)")

/** Route path of every static page.tsx (dynamic segments are content-driven; skipped). */
function staticRoutes(): string[] {
    const routes: string[] = []
    const walk = (dir: string) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name)
            if (entry.isDirectory()) {
                if (!entry.name.startsWith("[")) walk(full)
            } else if (entry.name === "page.tsx") {
                const rel = path.relative(PUBLIC_DIR, dir).split(path.sep).join("/")
                routes.push(rel === "" ? "/" : `/${rel}`)
            }
        }
    }
    walk(PUBLIC_DIR)
    return routes
}

const routes = staticRoutes()
const exists = new Set(routes)
const isEnglish = (r: string) => r === "/en" || r.startsWith("/en/")

/** Pages whose toggle target does not exist. */
function deadToggles(toEnglish: (elPath: string) => string): string[] {
    const dead: string[] = []
    for (const r of routes) {
        const target = isEnglish(r) ? greekCounterpart(r) : toEnglish(r)
        if (!exists.has(target)) dead.push(`${r} → ${target}`)
    }
    return dead
}

describe("language toggle targets", () => {
    it("enumerates both trees", () => {
        expect(routes.filter(isEnglish).length).toBeGreaterThan(20)
        expect(routes.filter((r) => !isEnglish(r)).length).toBeGreaterThan(20)
    })

    it("probe: the old blind `/en${path}` rule turns the guard red", () => {
        const naive = (p: string) => (p === "/" ? "/en" : `/en${p}`)
        expect(deadToggles(naive)).toEqual(expect.arrayContaining(["/solutions/synergates → /en/solutions/synergates"]))
    })

    it("every page's ΕΛ/EN toggle lands on an existing page", () => {
        expect(deadToggles(englishCounterpart)).toEqual([])
    })

    it("partners: the English page lives in the /en tree and pairs with the Greek slug", () => {
        expect(exists.has("/en/solutions/partners")).toBe(true)
        expect(englishCounterpart("/solutions/synergates")).toBe("/en/solutions/partners")
        expect(greekCounterpart("/en/solutions/partners")).toBe("/solutions/synergates")
    })
})
