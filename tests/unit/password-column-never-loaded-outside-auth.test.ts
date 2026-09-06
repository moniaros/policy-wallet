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
