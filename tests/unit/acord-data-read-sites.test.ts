import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"

import { StoredAcordDataSchema } from "@/lib/schemas/acord-envelope"

import { globSync } from "../helpers/glob"

/**
 * PW-PROVENANCE-01 W0-01 — the `acordData` read-site guard.
 *
 * `Policy.acordData` is a Prisma `Json?` column. Every reader casts it —
 * `(policy.acordData as any)?.vehicle?.insuredValue` — so `tsc` checks NOTHING
 * about the paths the app reads: rename a field in `AcordDataSchema`, and every
 * consumer keeps compiling and starts reading `undefined`, which the house rule
 * «unknown is not absence» then quietly turns into "no cover". Before any wave
 * of this series may change the stored shape (§4), the readers have to be
 * enumerable and checkable.
 *
 * The universe is DERIVED, twice: the paths from the STORED schema (Zod,
 * walked — `lib/schemas/acord-envelope.ts`, W0-04: the extraction schema plus
 * the envelope the pipeline writes beside it), and the read sites from the
 * source tree (every `.ts`/`.tsx` under app/, lib/, components/, comments and
 * string literals stripped). A read of a path the schema does not declare is a
 * violation unless it is listed in EXEMPT with a reason. A read beneath
 * `extraction`, `analysis`, `processingError`, `renewalHistory`, `renewalReview`,
 * `policyholder` or `insured` is checked like any other.
 *
 * What it follows: direct chains on the identifier `acordData` (through `as`
 * casts and `?.`), one-hop aliases declared from it in the same file
 * (`const d = policy.acordData as AcordData` → `d.vehicle…`), and destructuring
 * (`const { vehicle } = acordData`). What it does NOT follow, stated so a green
 * here is read correctly: a value passed into a function under another
 * parameter name, a typed alias assigned from a helper's return, and an alias
 * whose name is declared more than once in the file. A typed alias is what
 * `tsc` already checks; the untyped ones are what this exists for.
 */

// ── A stripper that keeps every newline, so a reported line is the real line ──
//
// The shared lexer in policy-authorization-single-path.test.ts drops the
// newlines inside block comments, and this file's whole output is
// `file:line chain` — a wrong line sends the reader to the wrong place.
// Comments and string literals become spaces (template interpolations are
// kept, because `${p.acordData.x}` is a read); everything else is untouched.

export function blankCommentsAndStrings(source: string): string {
    let out = ""
    let i = 0
    const n = source.length
    const blank = (from: number, to: number) => {
        for (let k = from; k < to; k++) out += source[k] === "\n" ? "\n" : " "
    }
    while (i < n) {
        const c = source[i]
        const next = source[i + 1]
        if (c === "/" && next === "/") {
            const start = i
            while (i < n && source[i] !== "\n") i++
            blank(start, i)
            continue
        }
        if (c === "/" && next === "*") {
            const start = i
            i += 2
            while (i < n && !(source[i] === "*" && source[i + 1] === "/")) i++
            i = Math.min(n, i + 2)
            blank(start, i)
            continue
        }
        if (c === '"' || c === "'" || c === "`") {
            const quote = c
            out += c
            i++
            while (i < n && source[i] !== quote) {
                if (source[i] === "\\") {
                    blank(i, i + 2)
                    i += 2
                    continue
                }
                if (quote === "`" && source[i] === "$" && source[i + 1] === "{") {
                    let depth = 1
                    const start = i
                    i += 2
                    while (i < n && depth > 0) {
                        if (source[i] === "{") depth++
                        else if (source[i] === "}") depth--
                        i++
                    }
                    // The interpolation is code — but it may hold a NESTED
                    // template literal (`${xs.map((x) => \`acordData.${x}\`)}`),
                    // whose literal text must be blanked like any other.
                    out += blankCommentsAndStrings(source.slice(start, i))
                    continue
                }
                out += source[i] === "\n" ? "\n" : " "
                i++
            }
            if (i < n) out += quote
            i++
            continue
        }
        out += c
        i++
    }
    return out
}

// ── The universe: every path the schema declares ──────────────────────────────

type ZodLike = { _zod?: { def: any }; def?: any }

function def(s: ZodLike): any {
    return s?._zod?.def ?? s?.def
}

/** Dotted paths, `[]` for an array hop, `*` for a record's keys. Zod 4 internals. */
export function schemaPaths(schema: ZodLike): Set<string> {
    const out = new Set<string>()
    const walk = (s: ZodLike, prefix: string, depth: number) => {
        if (!s || depth > 14) return
        const d = def(s)
        switch (d?.type) {
            case "optional":
            case "nullable":
            case "default":
            case "readonly":
            case "catch":
            case "nonoptional":
                return walk(d.innerType, prefix, depth)
            case "pipe":
                return walk(d.in, prefix, depth)
            case "lazy":
                return walk(d.getter(), prefix, depth + 1)
            case "array": {
                const p = `${prefix}[]`
                out.add(p)
                return walk(d.element, p, depth + 1)
            }
            case "object": {
                const shape = typeof d.shape === "function" ? d.shape() : d.shape
                for (const key of Object.keys(shape)) {
                    const p = prefix ? `${prefix}.${key}` : key
                    out.add(p)
                    walk(shape[key], p, depth + 1)
                }
                return
            }
            case "union":
                for (const o of d.options) walk(o, prefix, depth + 1)
                return
            case "record": {
                const p = `${prefix}.*`
                out.add(p)
                return walk(d.valueType, p, depth + 1)
            }
            default:
                return
        }
    }
    walk(schema, "", 0)
    return out
}

const UNIVERSE = schemaPaths(StoredAcordDataSchema)

/**
 * Reads the guard cannot classify, each with a reason. A row here is a debt,
 * not a pass: it says "we read this and the schema does not declare it".
 */
export const EXEMPT: Array<{ file: string; chain: string; reason: string }> = []

// ── The scan ──────────────────────────────────────────────────────────────────

export interface ReadSite {
    file: string
    line: number
    /** Normalised chain, e.g. `vehicle.insuredValue` or `coverages[].limit`. */
    chain: string
}
export interface Violation extends ReadSite {
    reason: string
}

const IDENT = /[A-Za-z_$][\w$]*/y

/** Consume a `Type` after `as` up to the paren that closes the cast; returns the index after `)`. */
function skipCast(src: string, i: number): number {
    let depth = 0
    while (i < src.length) {
        const c = src[i]
        if (c === "(" || c === "{" || c === "[" || c === "<") depth++
        else if (c === "}" || c === "]" || c === ">") depth--
        else if (c === ")") {
            if (depth === 0) return i + 1
            depth--
        } else if (depth === 0 && (c === ";" || c === "\n" || c === ",")) return i
        i++
    }
    return i
}

/** Parse the access chain that follows position `i` (just after an identifier). */
function parseChain(src: string, i: number): { segments: string[]; end: number } {
    const segments: string[] = []
    for (;;) {
        while (i < src.length && (src[i] === " " || src[i] === "\t")) i++
        // A chain may continue on the next line — `(x as T)\n    ?.extraction` —
        // so newlines are crossed only when a `.` or `?.` follows them.
        let j = i
        while (j < src.length && /\s/.test(src[j])) j++
        if (j > i && (src[j] === "." || (src[j] === "?" && src[j + 1] === "."))) i = j
        if (src.startsWith("as ", i) || src.startsWith("as\n", i)) {
            i = skipCast(src, i + 3)
            continue
        }
        if (src[i] === "!") {
            i++
            continue
        }
        if (src[i] === "?" && src[i + 1] === ".") i += 2
        else if (src[i] === ".") i += 1
        else if (src[i] === "[") {
            let depth = 1
            let j = i + 1
            while (j < src.length && depth > 0) {
                if (src[j] === "[") depth++
                else if (src[j] === "]") depth--
                j++
            }
            const inner = src.slice(i + 1, j - 1).trim()
            i = j
            if (!/^\d+$/.test(inner)) return { segments: [...segments, "[?]"], end: i } // a computed key: unknown, stop
            segments.push("[]")
            continue
        } else return { segments, end: i }
        IDENT.lastIndex = i
        const m = IDENT.exec(src)
        if (!m) return { segments, end: i }
        i = IDENT.lastIndex
        let k = i
        while (k < src.length && (src[k] === " " || src[k] === "?")) k++
        const isCall = src[k] === "(" && !src.startsWith("?.", k - 1)
        segments.push(isCall ? `${m[0]}(` : m[0])
        if (isCall) return { segments, end: i }
    }
}

const isLeaf = (p: string) => ![...UNIVERSE].some((u) => u.startsWith(`${p}.`) || u.startsWith(`${p}[]`))

/** Validate a chain against the universe; returns the reason it fails, or null. */
export function validateChain(base: string, segments: string[]): string | null {
    let cur = base
    for (const seg of segments) {
        if (seg.endsWith("(") || seg === "length") return null // a method or length: the chain leaves the data
        if (seg === "[?]") return null // a computed key — a documented hole, not a pass
        if (seg === "[]") {
            if (cur === "" || UNIVERSE.has(`${cur}[]`)) {
                cur = `${cur}[]`
                continue
            }
            return `\`${cur}\` is not an array in AcordDataSchema`
        }
        const next = cur ? `${cur}.${seg}` : seg
        if (UNIVERSE.has(next)) {
            cur = next
            continue
        }
        if (UNIVERSE.has(`${cur}.*`)) {
            cur = `${cur}.*`
            continue
        }
        if (cur === "") return `\`${seg}\` is not a key of the stored acordData schema`
        if (isLeaf(cur)) return `\`${cur}\` is a leaf; \`.${seg}\` reads into a primitive`
        return `\`${next}\` is not in AcordDataSchema`
    }
    return null
}

const lineOf = (src: string, i: number) => src.slice(0, i).split("\n").length

type SiteWithSegments = ReadSite & { segments: string[] }

function chainsOn(src: string, name: string, base: string, file: string, isAlias = false): SiteWithSegments[] {
    // `policy.acordData` is the normal read; for an alias a preceding `.` means
    // a property that merely shares the alias's name, so it is skipped.
    const re = new RegExp(`(?<![\\w$${isAlias ? "." : ""}])${name.replace(/\$/g, "\\$")}(?![\\w$])`, "g")
    const sites: SiteWithSegments[] = []
    for (const m of src.matchAll(re)) {
        // `acordData:` (an object key or a type member) and `acordData =` (a write) are not reads.
        const after = src.slice(m.index! + name.length).match(/^\s*([:=])(?!=)/)
        if (after) continue
        const { segments } = parseChain(src, m.index! + name.length)
        const chain = [base, ...segments.filter((s) => s !== "length" && !s.endsWith("("))].filter(Boolean).join(".").replace(/\.\[\]/g, "[]")
        sites.push({ file, line: lineOf(src, m.index!), chain: chain || "(root)", segments })
    }
    return sites
}

export function scanSource(source: string, file: string): { sites: ReadSite[]; violations: Violation[] } {
    const src = blankCommentsAndStrings(source)
    const sites: SiteWithSegments[] = []
    const violations: Violation[] = []

    const check = (site: SiteWithSegments, base: string) => {
        sites.push(site)
        const reason = validateChain(base, site.segments)
        if (reason) violations.push({ file: site.file, line: site.line, chain: site.chain, reason })
    }

    for (const s of chainsOn(src, "acordData", "", file)) check(s, "")

    // One-hop aliases: `const d = policy.acordData as AcordData` / `= (x.acordData as any)?.vehicle`
    // Only a declaration whose VALUE is the data itself (optionally cast, optionally
    // a sub-path, optionally `?? {}`): `const d = (policy.acordData as any)?.vehicle`.
    // `const home = homeSection(acordData)` is a helper's return — typed, and
    // tsc's business — so the prefix before `acordData` may hold no call.
    const alias = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;\n]+)?=\s*(\(?\s*[\w$?!.]*?)(?<![\w$])acordData(?![\w$])/g
    for (const m of src.matchAll(alias)) {
        const name = m[1]
        if (m[2].includes("(") && !/^\(\s*[\w$?!.]*$/.test(m[2])) continue
        // A name declared more than once in the file (another method's
        // `const clarity = await …`) is ambiguous: following it would bind
        // reads of an unrelated value to the data. Not followed, stated.
        const declarations = src.match(new RegExp(`\\b(?:const|let|var)\\s+${name.replace(/\$/g, "\\$")}\\b`, "g")) ?? []
        if (declarations.length > 1) continue
        const { segments, end } = parseChain(src, m.index! + m[0].length)
        if (segments.some((s) => s.endsWith("(") || s === "[?]")) continue // a call result or a computed key
        const rest = src.slice(end).match(/^[^\n;]*/)?.[0] ?? ""
        if (!/^\s*(\)|as\b[^;\n]*|\?\?[^;\n]*|\|\|[^;\n]*)*\s*$/.test(rest)) continue // the value is a larger expression
        const base = validateChain("", segments) === null ? segments.join(".").replace(/\.\[\]/g, "[]") : ""
        if (segments.length > 0 && base === "") continue // the declaration itself is already a violation above
        for (const s of chainsOn(src, name, base, file, true)) check(s, base)
    }

    // Destructuring: `const { vehicle, health: h } = policy.acordData as AcordData`
    const destructure = /\b(?:const|let|var)\s*\{([^}]*)\}\s*=\s*(\(?\s*[\w$?!.]*?)(?<![\w$])acordData(?![\w$])/g
    for (const m of src.matchAll(destructure)) {
        if (m[2].includes("(") && !/^\(\s*[\w$?!.]*$/.test(m[2])) continue // `= helper(acordData)` — typed, not the data
        const { segments } = parseChain(src, m.index! + m[0].length)
        if (segments.some((s) => s.endsWith("(") || s === "[?]")) continue
        const base = segments.join(".").replace(/\.\[\]/g, "[]")
        for (const raw of m[1].split(",")) {
            const key = raw.trim().replace(/^\.\.\..*/, "").split(/[:=]/)[0].trim()
            if (!key) continue
            check({ file, line: lineOf(src, m.index!), chain: base ? `${base}.${key}` : key, segments: [...segments, key] }, "")
        }
    }

    // Two aliases in one file can scan the same line twice; a site is one place.
    const uniq = <T extends ReadSite>(xs: T[]) => {
        const seen = new Set<string>()
        return xs.filter((x) => {
            const k = `${x.file}:${x.line}:${x.chain}`
            if (seen.has(k)) return false
            seen.add(k)
            return true
        })
    }
    return { sites: uniq(sites), violations: uniq(violations) }
}

const FILES = globSync("{app,lib,components}/**/*.{ts,tsx}").filter(
    (f) => !/\.test\.|__tests__|\.d\.ts$|\.stories\./.test(f)
)

export function scanRepo(): { files: number; sites: ReadSite[]; violations: Violation[] } {
    const sites: ReadSite[] = []
    const violations: Violation[] = []
    for (const file of FILES) {
        const r = scanSource(readFileSync(file, "utf-8"), file)
        sites.push(...r.sites)
        violations.push(...r.violations)
    }
    return { files: FILES.length, sites, violations }
}

// ── The guard ─────────────────────────────────────────────────────────────────

describe("every acordData read reaches a path the schema declares", () => {
    const repo = scanRepo()

    it("derives a real universe from the stored schema — extraction fields and the envelope", () => {
        expect(UNIVERSE.size).toBeGreaterThan(200)
        expect(UNIVERSE.has("vehicle.insuredValue")).toBe(true)
        expect(UNIVERSE.has("coverages[].limit")).toBe(true)
        expect(UNIVERSE.has("health.annualLimit")).toBe(true)
        expect(UNIVERSE.has("extraction.sources.*.page")).toBe(true)
        expect(UNIVERSE.has("analysis.pipeline.status")).toBe(true)
        expect(UNIVERSE.has("renewalHistory[].documents[].id")).toBe(true)
        expect(UNIVERSE.has("policyholder.taxId")).toBe(true)
    })

    it("finds a meaningful number of read sites", () => {
        expect(repo.files).toBeGreaterThan(500)
        expect(repo.sites.length).toBeGreaterThan(300)
    })

    it("no read reaches a path outside the schema, the envelope or a written exemption", () => {
        const open = repo.violations.filter(
            (v) => !EXEMPT.some((e) => e.file === v.file && e.chain === v.chain)
        )
        expect(
            open,
            open.map((v) => `${v.file}:${v.line} ${v.chain} — ${v.reason}`).join("\n")
        ).toEqual([])
    })

    it("every exemption still matches a real read — a stale row is deleted, not kept", () => {
        for (const e of EXEMPT) {
            expect(
                repo.violations.some((v) => v.file === e.file && v.chain === e.chain),
                `EXEMPT row ${e.file} ${e.chain} matches nothing`
            ).toBe(true)
        }
    })
})

describe("probe — the guard turns red on the shapes it exists to catch", () => {
    it("a read beneath an envelope root that the stored schema does not declare", () => {
        const r = scanSource(`const x = (policy.acordData as any)?.extraction?.confidence?.overal`, "probe.ts")
        expect(r.violations.map((v) => v.chain)).toEqual(["extraction.confidence.overal"])
    })

    it("a direct read of a key the schema does not declare", () => {
        const r = scanSource(`const v = policy.acordData.vehicle.nope`, "probe.ts")
        expect(r.violations.map((v) => v.chain)).toEqual(["vehicle.nope"])
    })

    it("a read through an `as any` cast and optional chaining", () => {
        const r = scanSource(`const l = (policy.acordData as any)?.helth?.annualLimit`, "probe.ts")
        expect(r.violations.map((v) => v.chain)).toEqual(["helth.annualLimit"])
    })

    it("a read through an alias declared from acordData", () => {
        const r = scanSource(`const d = policy.acordData as AcordData\nconst x = d.vehicle.plateNumbr`, "probe.ts")
        expect(r.violations.map((v) => v.chain)).toEqual(["vehicle.plateNumbr"])
    })

    it("a read through an alias declared from a sub-path", () => {
        const r = scanSource(`const veh = (p.acordData as any)?.vehicle\nreturn veh?.insuredValu`, "probe.ts")
        expect(r.violations.map((v) => v.chain)).toEqual(["vehicle.insuredValu"])
    })

    it("a destructuring from a helper's return is not followed", () => {
        const r = scanSource(`const { renewalDate } = derivePolicyMeta(policy?.acordData)`, "probe.ts")
        expect(r.violations).toEqual([])
    })

    it("a destructured key the schema does not declare", () => {
        const r = scanSource(`const { coverages, nope } = policy.acordData as AcordData`, "probe.ts")
        expect(r.violations.map((v) => v.chain)).toEqual(["nope"])
    })

    it("reading into a primitive as if it were an object", () => {
        const r = scanSource(`const a = acordData.vehicle.insuredValue.amount`, "probe.ts")
        expect(r.violations).toHaveLength(1)
        expect(r.violations[0].reason).toMatch(/leaf/)
    })

    it("legitimate shapes pass: array methods, envelope paths, optional chains, casts with braces", () => {
        const r = scanSource(
            [
                `acordData?.coverages?.map((c) => c.limit)`,
                `const n = (policy.acordData as any)?.extraction?.reviewState`,
                `const pg = (policy.acordData as any)?.extraction?.sources?.renewalDate?.page`,
                `const st = acordData.analysis?.pipeline?.status`,
                `(policy.acordData as { processingError?: unknown } | null)?.processingError`,
                `const h = acordData.health?.annualLimit`,
                `const first = acordData.coverages[0].limit`,
                `acordData.beneficiaries.length`,
                `const t = acordData.policy.currency.toUpperCase()`,
                `const s = acordData[sectionKey]?.anything`,
            ].join("\n"),
            "probe.ts"
        )
        expect(r.violations).toEqual([])
        expect(r.sites.length).toBe(10)
    })

    it("an alias name declared twice in a file is not followed — the second may be another value", () => {
        const r = scanSource(
            `const clarity = (policy.acordData as any)?.analysis?.clarity\nfunction other() { const clarity = await runClarity(); return clarity.coverageGaps.length }`,
            "probe.ts"
        )
        expect(r.violations).toEqual([])
    })

    it("an alias assigned from a helper's return is not followed — that value is typed", () => {
        const r = scanSource(`const home = homeSection(acordData)\nreturn home.notAField`, "probe.ts")
        expect(r.violations).toEqual([])
    })

    it("a chain that continues on the next line after a cast is followed", () => {
        const r = scanSource(`const tag = (acordData as { extraction?: { x?: unknown } } | null)\n    ?.extraction?.nope`, "probe.ts")
        expect(r.violations.map((v) => v.chain)).toEqual(["extraction.nope"])
    })

    it("a block comment does not shift the reported line", () => {
        const r = scanSource(`/* two\nlines */\nconst v = policy.acordData.vehicle.nope`, "probe.ts")
        expect(r.violations.map((v) => v.line)).toEqual([3])
    })

    it("a template literal nested inside an interpolation is not a read", () => {
        const r = scanSource("const keys = `fields: ${paths.map((p) => `acordData.${p}`).join(', ')}`", "probe.ts")
        expect(r.sites).toEqual([])
    })

    it("a string literal mentioning a path is not a read", () => {
        const r = scanSource(`const label = "Latest analysis failed (acordData.nonsense)."`, "probe.ts")
        expect(r.sites).toEqual([])
    })
})
