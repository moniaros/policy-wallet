/**
 * app/grafi.css (generated from tokens/*.json) and app/globals.css must not
 * define the same custom property. globals.css loads after grafi.css, so a
 * shared name silently overrides Grafí: --surface-sunken rendered slate
 * #EDF1F5 on every Grafí `bg-surface-sunken` site while Grafí's contrast
 * matrix measured #E7F1EC (review 2026-10 DA1).
 */
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const declared = (css: string) => new Set([...css.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map((m) => m[1]))
const shared = (a: string, b: string) => [...declared(a)].filter((name) => declared(b).has(name))

describe("CSS token namespaces", () => {
    const grafi = readFileSync("app/grafi.css", "utf8")
    const globals = readFileSync("app/globals.css", "utf8")

    it("probe: a re-declared Grafí token is caught", () => {
        expect(shared(grafi, `${globals}\n  --surface-sunken: #EDF1F5;`)).toContain("--surface-sunken")
    })

    it("globals.css declares no custom property Grafí already owns", () => {
        expect(declared(grafi).size).toBeGreaterThan(30)
        expect(shared(grafi, globals)).toEqual([])
    })
})
