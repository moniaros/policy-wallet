/**
 * Every Supabase server client uses the getAll/setAll cookie adapter.
 *
 * `proxy.ts` used the legacy per-name `get`/`set`/`remove` trio while
 * `lib/supabase/server.ts` used `getAll`/`setAll`. Two shapes against one
 * cookie jar, and the legacy one cannot do the job: Supabase CHUNKS an auth
 * cookie past ~3.2KB into `…auth-token.0`, `.1`, …, and a reader that fetches
 * one cookie by name can never reassemble them. Production symptom was
 * `TypeError: Cannot create property 'user' on string '{"access_token":…'`
 * thrown out of `_recoverAndRefresh` in middleware — and because the thrown
 * message embeds the whole session, every occurrence wrote a live access token
 * and refresh token into the runtime logs.
 *
 * Only sessions large enough to be chunked trip it, so it presented as one
 * account's problem rather than as a middleware defect.
 *
 * The universe is derived from the filesystem, not listed here: a second
 * middleware or a new server client added tomorrow is in scope automatically.
 */
import { describe, expect, it } from "vitest"
import { execFileSync } from "child_process"
import { readFileSync } from "fs"

/** Comments are stripped BEFORE scanning. This file's own explanation names
 *  `get(name)`, and so does the tombstone comment left in proxy.ts — an
 *  absence check that reads comments finds the words describing the defect and
 *  reports the defect. That has now happened three times in this run. */
function stripComments(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")
}

const LEGACY_ADAPTER = [
    /\bget\s*\(\s*name\s*:\s*string\s*\)/,
    /\bremove\s*\(\s*name\s*:\s*string/,
    /\bset\s*\(\s*name\s*:\s*string\s*,\s*value\s*:\s*string/,
]

export function usesLegacyCookieAdapter(source: string): boolean {
    const code = stripComments(source)
    if (!/createServerClient\s*\(|createBrowserClient\s*\(/.test(code)) return false
    return LEGACY_ADAPTER.some((re) => re.test(code))
}

function supabaseClientFiles(): string[] {
    const out = execFileSync(
        "git",
        ["grep", "-l", "-E", "createServerClient|createBrowserClient", "--", "*.ts", "*.tsx"],
        { encoding: "utf8" }
    )
    return out.split("\n").filter(Boolean).filter((f) => !f.startsWith("tests/"))
}

describe("Supabase cookie adapter", () => {
    it("finds the client files from the filesystem, and finds more than zero", () => {
        const files = supabaseClientFiles()
        // A guard whose universe silently empties passes forever.
        expect(files.length).toBeGreaterThanOrEqual(2)
        expect(files).toContain("proxy.ts")
    })

    it("has no file left on the legacy per-name adapter", () => {
        const offenders = supabaseClientFiles().filter((f) =>
            usesLegacyCookieAdapter(readFileSync(f, "utf8"))
        )
        expect(offenders).toEqual([])
    })

    it("PROBE: the detector fires on the adapter exactly as proxy.ts had it", () => {
        const legacy = `
            const supabase = createServerClient(url, key, {
                cookies: {
                    get(name: string) { return request.cookies.get(name)?.value },
                    set(name: string, value: string, options: any) { /* … */ },
                    remove(name: string, options: any) { /* … */ },
                },
            })
        `
        expect(usesLegacyCookieAdapter(legacy)).toBe(true)
    })

    it("PROBE: prose describing the defect is not the defect", () => {
        // proxy.ts now carries a tombstone comment naming get(name) and set.
        const commentOnly = `
            /* This replaced the legacy get(name: string) / set(name: string, value: string)
               / remove(name: string) trio, which could not reassemble chunks. */
            const supabase = createServerClient(url, key, {
                cookies: {
                    getAll() { return request.cookies.getAll() },
                    setAll(all) { /* … */ },
                },
            })
        `
        expect(usesLegacyCookieAdapter(commentOnly)).toBe(false)
    })

    it("PROBE: reddens on the REAL pre-fix proxy.ts, read from history", () => {
        // Not a synthetic sample — the actual file as it shipped to production,
        // at the last commit before the adapter was replaced. Read out of git so
        // nothing on disk is touched: restoring a working file to prove a point
        // is how an agent's uncommitted work was destroyed earlier in this run.
        const before = execFileSync("git", ["show", "12deab09:proxy.ts"], { encoding: "utf8" })
        expect(usesLegacyCookieAdapter(before)).toBe(true)
    })

    it("does not fire on a file that never builds a Supabase client", () => {
        expect(usesLegacyCookieAdapter(`function get(name: string) { return 1 }`)).toBe(false)
    })
})
