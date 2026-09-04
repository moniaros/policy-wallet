import { describe, expect, it } from "vitest"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

/**
 * One write path for profile FACTS, enforced.
 *
 * `applyFactWrites` (lib/services/protection-profile/fact-writes.ts) is the
 * authority on what a write to a `PolicyholderProfile` fact column may do: an
 * exact answer replaces a coarse one, a coarse one never replaces an exact one,
 * an absent field is untouched, `policy` never overwrites a declared value.
 * Five writers carried five hand-rolled versions of that rule until Sept 2026,
 * and two of them were wrong in opposite directions — the onboarding could
 * never refine its own floor, and the wizard erased stored Art. 9 answers on
 * every save.
 *
 * Nothing stops a sixth writer from hand-rolling a seventh rule except this
 * file. It derives the writer list from the FILESYSTEM and the fact columns
 * from the SCHEMA, so a route added tomorrow is covered by a test written
 * today: it is either on the single path, provably touches no fact column, or
 * is named below with a reason a human wrote down.
 */

const ROOTS = ["app", "lib"]
const SCHEMA = readFileSync("prisma/schema.prisma", "utf-8")

/** Columns that are not facts about the person's life: identity, the JSON blobs, the two ledgers. */
const NOT_A_FACT = new Set([
    "id", "userId", "user", "preferences", "createdAt", "updatedAt",
    "answeredFields", "factProvenance",
])

/** Every fact column, from the schema — never a list kept by hand. */
export function factColumns(schema: string = SCHEMA): string[] {
    const block = schema.slice(schema.indexOf("model PolicyholderProfile"))
    const body = block.slice(0, block.indexOf("\n}"))
    return [...body.matchAll(/^\s{2}([a-zA-Z][a-zA-Z0-9]*)\s+\S/gm)]
        .map((m) => m[1])
        .filter((name) => !NOT_A_FACT.has(name))
}

function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
        const full = join(dir, entry)
        if (entry === "node_modules" || entry.startsWith(".")) return []
        if (statSync(full).isDirectory()) return sourceFiles(full)
        if (!/\.tsx?$/.test(entry) || /\.(test|spec|d)\.tsx?$/.test(entry)) return []
        return [full]
    })
}

/**
 * Comments and string literals are prose, not code. A comment saying «goes
 * through applyFactWrites» must not count as going through it, and a column
 * name inside a toast string must not count as writing the column.
 */
export function stripCommentsAndStrings(source: string): string {
    let out = ""
    let i = 0
    const n = source.length
    while (i < n) {
        const c = source[i]
        const d = source[i + 1]
        if (c === "/" && d === "/") {
            while (i < n && source[i] !== "\n") i++
            continue
        }
        if (c === "/" && d === "*") {
            i += 2
            while (i < n && !(source[i] === "*" && source[i + 1] === "/")) i++
            i += 2
            continue
        }
        if (c === '"' || c === "'") {
            i++
            while (i < n && source[i] !== c && source[i] !== "\n") {
                if (source[i] === "\\") i++
                i++
            }
            i++
            out += c + c
            continue
        }
        if (c === "`") {
            i++
            while (i < n && source[i] !== "`") {
                if (source[i] === "\\") i++
                i++
            }
            i++
            out += "``"
            continue
        }
        out += c
        i++
    }
    return out
}

const WRITE = /\.policyholderProfile\.(create|createMany|update|updateMany|upsert)\s*\(/g

/** The text between the call's parentheses, by bracket matching. */
function argumentAt(code: string, openParen: number): string {
    let depth = 0
    for (let i = openParen; i < code.length; i++) {
        const ch = code[i]
        if (ch === "(" || ch === "{" || ch === "[") depth++
        else if (ch === ")" || ch === "}" || ch === "]") {
            depth--
            if (depth === 0) return code.slice(openParen + 1, i)
        }
    }
    return code.slice(openParen + 1)
}

/**
 * Blank the VALUE of every `preferences:` key so a spread inside the blob is
 * not a fact spread. The replacement carries no brace, so the loop cannot
 * re-match what it just wrote (it did, once — and hung the whole suite).
 */
function withoutPreferences(arg: string): string {
    let out = arg
    for (let guard = 0; guard < 100; guard++) {
        const m = /\bpreferences\s*:\s*\{/.exec(out)
        if (!m) return out
        const open = m.index + m[0].length - 1
        let depth = 0
        let close = out.length - 1
        for (let i = open; i < out.length; i++) {
            if (out[i] === "{") depth++
            else if (out[i] === "}") {
                depth--
                if (depth === 0) {
                    close = i
                    break
                }
            }
        }
        out = out.slice(0, open) + "__blob__" + out.slice(close + 1)
    }
    return out
}

export interface ProfileWrite {
    file: string
    method: string
    argument: string
}

export function profileWrites(file: string, source: string): ProfileWrite[] {
    const code = stripCommentsAndStrings(source)
    return [...code.matchAll(WRITE)].map((m) => ({
        file,
        method: m[1],
        argument: argumentAt(code, m.index! + m[0].length - 1),
    }))
}

/**
 * Could this write reach a fact column? True when it names one (as a key or an
 * ES6 shorthand), spreads anything outside `preferences`, or hands Prisma an
 * opaque object it built elsewhere. Only a write that can be READ as touching
 * nothing but identity and preferences is fact-free.
 */
export function isFactCapable(write: ProfileWrite, columns: string[] = factColumns()): boolean {
    const arg = withoutPreferences(write.argument)
    if (/\.\.\./.test(arg)) return true
    if (columns.some((c) => new RegExp(`(^|[{,\\s(])${c}\\s*[:,}]`).test(arg))) return true
    if (/\b(data|create|update)\s*:\s*[A-Za-z_$][\w$]*\s*[,}]/.test(arg)) return true
    return false
}

/** Names bound to `profileFactData(...)` — what a compliant write must spread. */
function factDataBindings(code: string): string[] {
    return [...code.matchAll(/\b(?:const|let)\s+(\w+)\s*=\s*profileFactData\s*\(/g)].map((m) => m[1])
}

export type Verdict = "fact_free" | "single_path" | "bypass" | "result_discarded"

export function verdict(file: string, source: string): Array<{ write: ProfileWrite; verdict: Verdict }> {
    const code = stripCommentsAndStrings(source)
    const callsSinglePath = /\bapplyFactWrites\s*\(/.test(code)
    const bindings = factDataBindings(code)
    return profileWrites(file, source).map((write) => {
        if (!isFactCapable(write)) return { write, verdict: "fact_free" as const }
        if (!callsSinglePath) return { write, verdict: "bypass" as const }
        const spreadsResult = bindings.some((b) => new RegExp(`\\.\\.\\.${b}\\b`).test(write.argument))
        return { write, verdict: spreadsResult ? ("single_path" as const) : ("result_discarded" as const) }
    })
}

/**
 * Writers that legitimately bypass the single path, each with the reason.
 * A name here is a decision on the record. Silence is what this file refuses.
 */
const ALLOW: Record<string, string> = {
    "lib/services/gdpr-erasure.service.ts":
        "the Art. 17 eraser: nulling every fact column is the point, and the precedence rule " +
        "(which refuses to erase) is exactly what it must not obey",
}

describe("every profile FACT write goes through applyFactWrites", () => {
    const files = ROOTS.flatMap(sourceFiles)
    const all = files.flatMap((file) => verdict(file, readFileSync(file, "utf-8")))
    const factWrites = all.filter((v) => v.verdict !== "fact_free")

    it("sees the writers it exists for (the enumeration is not empty or narrow)", () => {
        const seen = new Set(factWrites.map((v) => v.write.file))
        for (const known of [
            "app/api/v1/risk-profile/route.ts",
            "app/(protected)/protection/quick-start-actions.ts",
            "app/onboarding/protection-profile-actions.ts",
            "lib/services/life-events/service.ts",
            "app/(protected)/tasks/actions.ts",
            "app/api/v1/questionnaires/[id]/route.ts",
            "lib/services/gdpr-erasure.service.ts",
        ]) {
            expect([...seen], known).toContain(known)
        }
    })

    it("the fact-free writes are the preferences and empty-row writers, read as such", () => {
        const factFree = all.filter((v) => v.verdict === "fact_free").map((v) => v.write.file)
        // The onboarding flags, the notification ceiling, the bulk import's
        // empty rows, the legacy completion flags: none may name a fact column.
        for (const file of factFree) {
            const src = stripCommentsAndStrings(readFileSync(file, "utf-8"))
            expect(/\bapplyFactWrites\b/.test(src) || !/\.\.\.(?!preferences)/.test(
                withoutPreferences(profileWrites(file, readFileSync(file, "utf-8")).map((w) => w.argument).join("\n"))
            ), `${file} was read as fact-free but spreads something`).toBe(true)
        }
        expect(factFree.length).toBeGreaterThan(0)
    })

    it("no writer hand-rolls its own rule", () => {
        const offenders = factWrites
            .filter((v) => v.verdict !== "single_path" && !ALLOW[v.write.file])
            .map((v) => `${v.write.file} — policyholderProfile.${v.write.method}: ${v.verdict}`)
        expect(offenders, `fact writes off the single path:\n${offenders.join("\n")}`).toEqual([])
    })

    it("every exemption still names a real bypass (no stale entries)", () => {
        for (const file of Object.keys(ALLOW)) {
            const hits = factWrites.filter((v) => v.write.file === file && v.verdict !== "single_path")
            expect(hits.length, `${file} is exempted but no longer bypasses — delete the entry`).toBeGreaterThan(0)
        }
    })

    it("the fact columns come from the schema and include the ones this rule was written for", () => {
        const columns = factColumns()
        for (const c of ["chronicConditions", "familyMedicalHistory", "childrenCount", "dependentsCount", "incomeDependency"]) {
            expect(columns).toContain(c)
        }
        expect(columns).not.toContain("preferences")
        expect(columns).not.toContain("factProvenance")
    })
})

/**
 * The probes: committed files proven to turn this guard red (and green), so
 * the red-green is re-runnable by anyone rather than a claim in a commit
 * message. A guard without a probe in the repo is not a guard.
 */
describe("probes", () => {
    const probe = (name: string) => readFileSync(join("tests/fixtures/guard-probes", name), "utf8")
    const verdictsOf = (name: string) => verdict(name, probe(name)).map((v) => v.verdict)

    it("flags a literal fact column written with no single path", () => {
        expect(verdictsOf("profile-write-bypass-literal.ts.txt")).toEqual(["bypass"])
    })

    it("flags a spread patch even when a comment claims it goes through applyFactWrites", () => {
        expect(verdictsOf("profile-write-bypass-spread.ts.txt")).toEqual(["bypass"])
    })

    it("flags a writer that calls applyFactWrites and then writes the raw patch anyway", () => {
        expect(verdictsOf("profile-write-discarded-result.ts.txt")).toEqual(["result_discarded"])
    })

    it("reads a preferences-only writer as fact-free, spread inside the blob included", () => {
        expect(verdictsOf("profile-write-preferences-only.ts.txt")).toEqual(["fact_free", "fact_free"])
    })

    it("passes the compliant shape", () => {
        expect(verdictsOf("profile-write-single-path.ts.txt")).toEqual(["single_path"])
    })

    it("does not read a column name inside a string as a write", () => {
        const w = profileWrites("x.ts", `db.policyholderProfile.update({ where: { userId }, data: { preferences: { note: "childrenCount" } } })`)
        expect(isFactCapable(w[0])).toBe(false)
    })
})
