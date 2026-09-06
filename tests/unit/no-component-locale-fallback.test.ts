/**
 * PW-CONTENT-01 Goal 1 — no component holds its own fallback locale.
 *
 * Sixty-one sites normalised the stored preference by hand and disagreed on
 * the default (`|| 'el'` here, `|| 'en'` there, an `as 'en' | 'el'` cast that
 * let any string through). Now `resolveUserLanguage` is the only place that
 * decides, and a component with no language available renders through the
 * provider or not at all. Enumerated from disk; reasoned exemptions only for
 * anonymous contexts where there is no user to resolve.
 */
import { describe, expect, it } from "vitest"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

function walk(dir: string): string[] {
    if (!existsSync(dir)) return []
    return readdirSync(dir).flatMap((name) => {
        const p = join(dir, name)
        if (statSync(p).isDirectory()) return name === "node_modules" ? [] : walk(p)
        return /\.(tsx?)$/.test(p) ? [p] : []
    })
}

const RESOLVER = "lib/i18n/resolve-language.ts"
/** Anonymous contexts: there is no user whose preference could be resolved. */
const ANONYMOUS_EXEMPT: Record<string, string> = {
    "app/api/v1/consents/current/route.ts": "cookie-consent locale for an anonymous visitor; an authenticated user's stored preference is resolved above it",
    "lib/email/form-emails.ts": "public contact/newsletter forms carry the visitor's chosen language, no user exists",
}

const FALLBACK = /(?:\b(?:language|lang|locale|preferredLanguage|preferred_language)\s*(?:\|\||\?\?)\s*['"](?:el|en)['"])|preferredLanguage as ['"]e[ln]['"]|preferredLanguage === ['"]en['"] \? ['"]en['"] : ['"]el['"]/

export function carriesOwnFallback(src: string): boolean {
    return FALLBACK.test(src)
}

describe("Goal 1 — no component-owned locale fallback (enumerated from disk)", () => {
    const files = [...walk("app"), ...walk("components"), ...walk("lib")].filter((f) => f !== RESOLVER && !(f in ANONYMOUS_EXEMPT))

    it("scans a meaningful universe", () => { expect(files.length).toBeGreaterThan(300) })

    it("no file normalises the stored preference or falls back to a literal locale by itself", () => {
        const offenders = files.filter((f) => carriesOwnFallback(readFileSync(f, "utf8")))
        expect(offenders).toEqual([])
    })

    it("every exemption still exists and is still anonymous-only", () => {
        for (const [f, why] of Object.entries(ANONYMOUS_EXEMPT)) {
            expect(existsSync(f), f).toBe(true)
            expect(why.length).toBeGreaterThan(20)
            expect(readFileSync(f, "utf8")).not.toMatch(/preferredLanguage (\|\||\?\?) ['"]e[ln]/)
        }
    })

    it("the probe turns the scan red", () => {
        expect(carriesOwnFallback(readFileSync("tests/fixtures/guard-probes/component-locale-fallback.tsx.txt", "utf8"))).toBe(true)
    })

    it("the resolver is Greek-canonical: anything but exactly 'en' is 'el'", async () => {
        const { resolveUserLanguage } = await import("@/lib/i18n/resolve-language")
        expect(resolveUserLanguage("en")).toBe("en")
        for (const v of ["el", "EN", "gr", "", null, undefined, "de"]) expect(resolveUserLanguage(v as any)).toBe("el")
    })
})
