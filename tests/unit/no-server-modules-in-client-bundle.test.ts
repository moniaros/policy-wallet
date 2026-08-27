import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

/**
 * The Prisma client must never reach the browser bundle.
 *
 * A `"use client"` module that imports — however indirectly — a module which
 * imports `@/lib/db` ships the whole Prisma client to the browser. Nothing
 * fails: Next compiles it, the page renders, and the only symptom is
 * `database: no connection string configured` in the visitor's console, from
 * lib/db.ts's own startup check running with no environment. That is exactly
 * how it shipped on /dashboard/agent and /customers — one client component
 * imported a tier-ordering constant from lib/subscription-entitlements.ts,
 * whose first line is the db import.
 *
 * So it is asserted structurally instead of hoped for. Walking imports is
 * enough because this is a bundling question, not a runtime one.
 */

const ROOT = path.resolve(__dirname, "../..")
const SOURCE_DIRS = ["app", "components", "contexts", "lib", "types"]
const EXTENSIONS = [".ts", ".tsx"]

/** Modules that must not be reachable from a client component. */
const FORBIDDEN = ["lib/db.ts"]

type ModuleInfo = {
    isClient: boolean
    /** "use server" (a server action — Next replaces it with an RPC stub in the
     *  client graph) or `import "server-only"` (build-time enforced boundary). */
    isServerBoundary: boolean
    imports: string[]
}

function walk(dir: string, out: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) walk(full, out)
        else if (EXTENSIONS.includes(path.extname(entry.name))) out.push(full)
    }
    return out
}

function resolveSpecifier(specifier: string, fromFile: string): string | null {
    let base: string
    if (specifier.startsWith("@/")) base = path.join(ROOT, specifier.slice(2))
    else if (specifier.startsWith(".")) base = path.resolve(path.dirname(fromFile), specifier)
    else return null // bare package specifier — not our source

    for (const ext of EXTENSIONS) {
        if (fs.existsSync(base + ext)) return base + ext
    }
    for (const ext of EXTENSIONS) {
        const indexFile = path.join(base, `index${ext}`)
        if (fs.existsSync(indexFile)) return indexFile
    }
    return null
}

/**
 * Value imports only. Three things are deliberately NOT counted, because the
 * emitted JavaScript does not contain them:
 *   - `import type { X } from "y"` / `export type { X } from "y"`
 *   - inline type positions: `foo?: import("y").X`  (matched by the trailing `.`)
 *   - the type-only members of a mixed import are irrelevant; the import itself
 *     is real, so it counts.
 */
function readImports(source: string, fromFile: string): string[] {
    const specifiers: string[] = []

    const staticImport = /(?:^|\n)\s*(?:import|export)\s+(type\s+)?([^;'"]*?)\bfrom\s*["']([^"']+)["']/g
    for (const match of source.matchAll(staticImport)) {
        const isTypeOnly = Boolean(match[1])
        if (!isTypeOnly) specifiers.push(match[3])
    }

    const sideEffectImport = /(?:^|\n)\s*import\s+["']([^"']+)["']/g
    for (const match of source.matchAll(sideEffectImport)) specifiers.push(match[1])

    // Dynamic import — a real one bundles (lazily); one followed by `.` is a
    // type reference the compiler erases.
    const dynamicImport = /\bimport\(\s*["']([^"']+)["']\s*\)(\s*\.)?/g
    for (const match of source.matchAll(dynamicImport)) {
        if (!match[2]) specifiers.push(match[1])
    }

    return specifiers
        .map((specifier) => resolveSpecifier(specifier, fromFile))
        .filter((resolved): resolved is string => resolved !== null)
}

function buildGraph(sourceDirs: string[] = SOURCE_DIRS): Map<string, ModuleInfo> {
    const graph = new Map<string, ModuleInfo>()

    for (const dir of sourceDirs) {
        const absolute = path.join(ROOT, dir)
        if (!fs.existsSync(absolute)) continue

        for (const file of walk(absolute)) {
            const source = fs.readFileSync(file, "utf8")
            const directivePrologue = source.slice(0, 400)
            graph.set(file, {
                isClient: /^\s*(["'])use client\1/m.test(directivePrologue),
                isServerBoundary:
                    /^\s*(["'])use server\1/m.test(directivePrologue) ||
                    /^\s*import\s+["']server-only["']/m.test(source),
                imports: readImports(source, file),
            })
        }
    }

    return graph
}

/** Every client module that reaches `target`, with the chain that got it there. */
function clientImportersOf(target: string, graph: Map<string, ModuleInfo>): string[][] {
    const importedBy = new Map<string, string[]>()
    for (const [file, info] of graph) {
        for (const imported of info.imports) {
            if (!importedBy.has(imported)) importedBy.set(imported, [])
            importedBy.get(imported)!.push(file)
        }
    }

    const cameFrom = new Map<string, string | null>([[target, null]])
    const queue = [target]
    const found: string[][] = []

    while (queue.length > 0) {
        const current = queue.shift()!
        const info = graph.get(current)
        if (!info) continue

        // A server action / server-only module is where the client graph stops.
        if (current !== target && info.isServerBoundary) continue

        if (info.isClient) {
            const chain: string[] = []
            for (let node: string | null = current; node; node = cameFrom.get(node) ?? null) {
                chain.push(path.relative(ROOT, node))
            }
            found.push(chain)
            continue
        }

        for (const importer of importedBy.get(current) ?? []) {
            if (cameFrom.has(importer)) continue
            cameFrom.set(importer, current)
            queue.push(importer)
        }
    }

    return found
}

describe("client bundle boundary", () => {
    const graph = buildGraph()

    it("indexes the source tree it is meant to police", () => {
        expect(graph.size).toBeGreaterThan(200)
        expect(graph.has(path.join(ROOT, "lib/db.ts"))).toBe(true)
        // A tripwire on the walker itself: if the "use client" detection breaks,
        // every assertion below passes vacuously.
        expect([...graph.values()].filter((info) => info.isClient).length).toBeGreaterThan(50)
    })

    for (const relativeTarget of FORBIDDEN) {
        it(`keeps ${relativeTarget} out of every client component's import graph`, () => {
            const chains = clientImportersOf(path.join(ROOT, relativeTarget), graph)
            const report = chains.map((chain) => chain.join("\n    ← ")).join("\n\n")
            expect(report, `${relativeTarget} is reachable from a client component:\n\n${report}`).toBe("")
        })
    }
})

/**
 * RED-PROOF (Phase 6 guard audit). The live test above can only ever pass or
 * fail on the REAL tree, so a silent walker bug — a resolver that returns null
 * for every alias, a "use client" regex that stops matching, a BFS that stops
 * one hop early — leaves it green over a shipped leak. The >50-client-modules
 * tripwire catches only total breakage of the client detector; it says nothing
 * about the resolver or the boundary logic.
 *
 * So the same machinery is run over a committed fixture graph that encodes the
 * AUTHENTIC defect (a "use client" component importing a tier-ordering
 * constant from a module whose first line imports the db — the exact shape
 * that shipped Prisma to the browser on /dashboard/agent), in both the
 * relative and the "@/" alias form, alongside the two shapes that must NOT be
 * reported: a chain through a "use server" boundary, and a type-only import.
 * Crippling any piece of the walker turns at least one assertion red.
 */
describe("the walker is proven on a committed fixture graph", () => {
    const FIXTURE = "tests/fixtures/guard-probes/client-bundle-graph"
    const graph = buildGraph([FIXTURE])
    const target = path.join(ROOT, FIXTURE, "db.ts")

    it("indexes all seven fixture modules", () => {
        expect(graph.size).toBe(7)
    })

    it("classifies the fixture's client and boundary modules", () => {
        expect(graph.get(path.join(ROOT, FIXTURE, "Widget.tsx"))?.isClient).toBe(true)
        expect(graph.get(path.join(ROOT, FIXTURE, "action.ts"))?.isServerBoundary).toBe(true)
        expect(graph.get(path.join(ROOT, FIXTURE, "entitlements.ts"))?.isClient).toBe(false)
    })

    it("finds the authentic defect chain in both import spellings", () => {
        const chains = clientImportersOf(target, graph)
        const heads = chains.map((chain) => chain[0])
        expect(heads).toContain(path.join(FIXTURE, "AliasWidget.tsx"))

        const viaConstant = chains.find((chain) => chain[0] === path.join(FIXTURE, "Widget.tsx"))
        expect(viaConstant, "the client → entitlements → db chain was not found").toEqual([
            path.join(FIXTURE, "Widget.tsx"),
            path.join(FIXTURE, "entitlements.ts"),
            path.join(FIXTURE, "db.ts"),
        ])
    })

    it("stops at the server-action boundary and ignores type-only imports", () => {
        const chains = clientImportersOf(target, graph)
        const heads = chains.map((chain) => chain[0])
        expect(heads).not.toContain(path.join(FIXTURE, "ClientViaAction.tsx"))
        expect(heads).not.toContain(path.join(FIXTURE, "TypesOnly.tsx"))
        // Exactly the two real leaks, nothing more.
        expect(chains).toHaveLength(2)
    })
})
