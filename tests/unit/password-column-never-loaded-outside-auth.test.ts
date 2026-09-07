/**
 * GUARD: the `users.password` column is never loaded outside authentication code
 * (PW-BRIDGE-01 A-01, class Leak / minimisation).
 *
 * Eleven agent-facing paths used to `select: { password: true }` to test the
 * hash for null. The rule now takes `hasPassword: boolean` from
 * `lib/services/credential-signals.ts`, the ONE module allowed to read the
 * column — and only as `IS NOT NULL`.
 *
 * Enumerates, never assumes: the universe is every `.ts`/`.tsx` under app/,
 * lib/ and components/, read from the filesystem, minus an allowlist that names
 * each exemption with its reason. Fails on (a) a Prisma select/include of the
 * column, (b) a raw SQL read of it. Ships with a probe fixture proven red.
 *
 * A-01b (2026-09-07) added the loads that carried the column WITHOUT naming it:
 *  (c) a full-row `db.user.find*` — no top-level `select` — outside the
 *      credential's own lifecycle and the session resolver;
 *  (d) a bare include of a relation to User (`customer: true`, or
 *      `agent: { include: … }` with no `select`), the relation names enumerated
 *      from prisma/schema.prisma;
 *  (e) the backstop: lib/db.ts omits `User.password` at the client (Prisma
 *      `omit`, generator preview `omitApi`), so even an allowlisted full-row
 *      load cannot carry the hash. Probe: user-full-row.probe.ts.txt.
 */

import { describe, expect, it } from "vitest"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"

const ROOT = process.cwd()

/** Exemptions, each with the reason it may touch the column. */
const ALLOWLIST: { prefix: string; reason: string }[] = [
    { prefix: "app/auth/", reason: "sign-up, sign-in, reset — the credential's own lifecycle" },
    { prefix: "app/api/auth/", reason: "auth API routes (reset-password) — the credential's own lifecycle" },
    { prefix: "lib/auth/", reason: "auth helpers" },
    { prefix: "lib/services/credential-signals.ts", reason: "the ONE presence read — `password IS NOT NULL`, never the value" },
    { prefix: "lib/db.ts", reason: "names the column once, to OMIT it from every read (rule e)" },
]

const SELECT_READ = /\bpassword\s*:\s*true\b/
const RAW_READ = /\$queryRaw[^`]*`[^`]*\bpassword\b[^`]*`/

function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        if (entry === "node_modules" || entry.startsWith(".")) continue
        const full = join(dir, entry)
        const st = statSync(full)
        if (st.isDirectory()) walk(full, out)
        // Probes are committed as `.ts.txt` so the app's compiler and linter never see them.
        else if (/\.(ts|tsx)(\.txt)?$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) out.push(full)
    }
    return out
}

export function passwordColumnOffenders(roots: string[], allowlist = ALLOWLIST): { file: string; kind: "select" | "raw" }[] {
    const offenders: { file: string; kind: "select" | "raw" }[] = []
    for (const root of roots) {
        for (const file of walk(root)) {
            const rel = relative(ROOT, file).split("\\").join("/")
            if (allowlist.some((a) => rel.startsWith(a.prefix))) continue
            const src = readFileSync(file, "utf8")
            if (SELECT_READ.test(src)) offenders.push({ file: rel, kind: "select" })
            if (RAW_READ.test(src)) offenders.push({ file: rel, kind: "raw" })
        }
    }
    return offenders
}

describe("GUARD — users.password is never loaded outside auth (A-01)", () => {
    it("no select or raw read of the column in app/, lib/, components/", () => {
        const offenders = passwordColumnOffenders([join(ROOT, "app"), join(ROOT, "lib"), join(ROOT, "components")])
        expect(offenders, `load credential PRESENCE through lib/services/credential-signals.ts instead:\n${offenders.map((o) => `  ${o.kind}: ${o.file}`).join("\n")}`).toEqual([])
    })

    it("the probe fixture turns the guard red (proof the scan bites)", () => {
        const offenders = passwordColumnOffenders([join(ROOT, "tests", "fixtures", "guard-probes")], [])
        expect(offenders.map((o) => o.kind).sort()).toEqual(["raw", "select"])
        expect(offenders.every((o) => o.file.includes("password-select.probe"))).toBe(true)
    })

    it("the presence query names the MAPPED columns of the User model (a rename fails here, not on the dashboard)", () => {
        // The first live run of A-01 rendered the agent dashboard's error boundary: the helper selected
        // `id` while User.id is @map("user_id"). The schema is the source; the SQL must follow it.
        const schema = readFileSync(join(ROOT, "prisma", "schema.prisma"), "utf8")
        const model = schema.slice(schema.indexOf("model User "), schema.indexOf("\n}", schema.indexOf("model User ")))
        const col = (field: string) => {
            const line = model.split("\n").find((l) => new RegExp(`^\\s+${field}\\s`).test(l)) || ""
            const m = line.match(/@map\("([^"]+)"\)/)
            return m ? m[1] : field
        }
        const sql = readFileSync(join(ROOT, "lib", "services", "credential-signals.ts"), "utf8")
        expect(sql).toContain(`SELECT "${col("id")}" AS id FROM users WHERE "${col("id")}" IN`)
        expect(sql).toContain(`AND "${col("password")}" IS NOT NULL`)
    })

    it("the allowlist names a reason for every exemption and only for paths that exist", () => {
        for (const a of ALLOWLIST) {
            expect(a.reason.length).toBeGreaterThan(10)
            expect(() => statSync(join(ROOT, a.prefix))).not.toThrow()
        }
    })
})


// ---------------------------------------------------------------------------
// A-01b — the loads that carried the column without naming it.
// ---------------------------------------------------------------------------

/** Full-row user loads that may stay, each with its reason. */
const FULL_ROW_ALLOWLIST: { prefix: string; reason: string }[] = [
    { prefix: "app/auth/", reason: "sign-up, callback, verify — the account's own lifecycle" },
    { prefix: "app/api/auth/", reason: "auth API routes — the account's own lifecycle" },
    { prefix: "lib/auth-helpers.ts", reason: "the session resolver returns the account row every server page reads; the hash is omitted at the client (rule e)" },
    { prefix: "app/(protected)/admin/actions.ts", reason: "getUserDetails — the admin's audited account record (logAdminRead with a field scope)" },
]

function stripComments(src: string): string {
    return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/(^|[^:\\])\/\/[^\n]*/g, (m, p) => p + " ".repeat(m.length - p.length))
}

/** The balanced `{ … }` starting at `i` (src[i] === "{"), or null. */
function braceBlock(src: string, i: number): string | null {
    let depth = 0
    for (let j = i; j < src.length; j++) {
        const c = src[j]
        if (c === '"' || c === "'" || c === "`") {
            const q = c
            j++
            while (j < src.length && src[j] !== q) { if (src[j] === "\\") j++; j++ }
            continue
        }
        if (c === "{") depth++
        else if (c === "}") { depth--; if (depth === 0) return src.slice(i, j + 1) }
    }
    return null
}

/** Top-level keys of an object-literal source. */
function topLevelKeys(obj: string): string[] {
    const keys: string[] = []
    const inner = obj.slice(1, -1)
    let depth = 0
    for (let j = 0; j < inner.length; j++) {
        const c = inner[j]
        if (c === '"' || c === "'" || c === "`") {
            const q = c
            j++
            while (j < inner.length && inner[j] !== q) { if (inner[j] === "\\") j++; j++ }
            continue
        }
        if (c === "{" || c === "[" || c === "(") depth++
        else if (c === "}" || c === "]" || c === ")") depth--
        else if (depth === 0) {
            const m = inner.slice(j).match(/^\s*([A-Za-z_$][\w$]*)\s*:/)
            if (m) { keys.push(m[1]); j += m[0].length - 1 }
        }
    }
    return keys
}

const lineAt = (src: string, i: number) => src.slice(0, i).split("\n").length

/** Every relation FIELD NAME whose type is User, read from the schema. */
export function userRelationNames(): string[] {
    const schema = readFileSync(join(ROOT, "prisma", "schema.prisma"), "utf8")
    const names = new Set<string>()
    for (const line of schema.split("\n")) {
        const m = line.match(/^\s+(\w+)\s+User\??(\[\])?\s+@relation/)
        if (m) names.add(m[1])
    }
    return [...names].sort()
}

/** (c) `db.user.find*({ … })` with no top-level `select`. */
export function fullRowUserLoads(roots: string[], allowlist = FULL_ROW_ALLOWLIST): string[] {
    const out: string[] = []
    const re = /\bdb\.user\.(findUnique|findFirst|findMany|findUniqueOrThrow|findFirstOrThrow)\s*\(\s*\{/g
    for (const root of roots) {
        for (const file of walk(root)) {
            const rel = relative(ROOT, file).split("\\").join("/")
            if (allowlist.some((a) => rel.startsWith(a.prefix))) continue
            const src = stripComments(readFileSync(file, "utf8"))
            let m: RegExpExecArray | null
            re.lastIndex = 0
            while ((m = re.exec(src))) {
                const block = braceBlock(src, m.index + m[0].length - 1)
                if (!block) continue
                if (!topLevelKeys(block).includes("select")) out.push(`${rel}:${lineAt(src, m.index)} ${m[1]}`)
            }
        }
    }
    return out
}

/** (d) a User relation included whole (`name: true`, or `name: { … }` without `select`). */
export function bareUserRelationIncludes(roots: string[], names = userRelationNames()): string[] {
    const out: string[] = []
    const inc = /\binclude\s*:\s*\{/g
    for (const root of roots) {
        for (const file of walk(root)) {
            const rel = relative(ROOT, file).split("\\").join("/")
            const src = stripComments(readFileSync(file, "utf8"))
            let m: RegExpExecArray | null
            inc.lastIndex = 0
            while ((m = inc.exec(src))) {
                const block = braceBlock(src, m.index + m[0].length - 1)
                if (!block) continue
                for (const name of names) {
                    const whole = new RegExp(`(^|[\\s{,])${name}\\s*:\\s*true\\b`, "g")
                    let k: RegExpExecArray | null
                    while ((k = whole.exec(block))) out.push(`${rel}:${lineAt(src, m.index + k.index)} include ${name}: true`)
                    const nested = new RegExp(`(^|[\\s{,])${name}\\s*:\\s*\\{`, "g")
                    while ((k = nested.exec(block))) {
                        const sub = braceBlock(block, k.index + k[0].length - 1)
                        if (sub && !topLevelKeys(sub).includes("select")) out.push(`${rel}:${lineAt(src, m.index + k.index)} include ${name}: { … } without select`)
                    }
                }
            }
        }
    }
    return out
}

describe("GUARD — the column is not carried by loads that never name it (A-01b)", () => {
    const APP = [join(ROOT, "app"), join(ROOT, "lib"), join(ROOT, "components")]

    it("enumerates the User relations from the schema", () => {
        const names = userRelationNames()
        expect(names.length).toBeGreaterThan(10)
        expect(names).toEqual(expect.arrayContaining(["customer", "agent", "owner", "grantee", "user"]))
    })

    it("(c) no full-row db.user.find* outside the allowlist", () => {
        const offenders = fullRowUserLoads(APP)
        expect(offenders, `add a select naming the fields this caller reads:\n${offenders.join("\n")}`).toEqual([])
    })

    it("(d) no bare include of a relation to User", () => {
        const offenders = bareUserRelationIncludes(APP)
        expect(offenders, `include the relation with a select of the fields read:\n${offenders.join("\n")}`).toEqual([])
    })

    it("(e) the client omits the column and the generator enables omit", () => {
        expect(readFileSync(join(ROOT, "lib", "db.ts"), "utf8")).toMatch(/omit:\s*\{\s*user:\s*\{\s*password:\s*true\s*\}\s*\}/)
        const schema = readFileSync(join(ROOT, "prisma", "schema.prisma"), "utf8")
        const generator = schema.slice(schema.indexOf("generator client"), schema.indexOf("}", schema.indexOf("generator client")))
        expect(generator).toMatch(/previewFeatures\s*=\s*\[[^\]]*"omitApi"/)
    })

    it("the probe turns (c) and (d) red, and a commented load does not count", () => {
        const probes = [join(ROOT, "tests", "fixtures", "guard-probes")]
        const full = fullRowUserLoads(probes, []).filter((o) => o.includes("user-full-row.probe"))
        const bare = bareUserRelationIncludes(probes).filter((o) => o.includes("user-full-row.probe"))
        expect(full.map((o) => o.split(" ")[1])).toEqual(["findUnique", "findMany"])
        expect(bare.map((o) => o.split(" include ")[1])).toEqual(["customer: true", "agent: { … } without select"])
    })
})
