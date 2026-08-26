import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"

import {
    GROWTH_HOOKS,
    GROWTH_HOOKS_B2B,
    HOOK_LINE_MAX_CODEPOINTS,
    hookLineLength,
} from "@/lib/growth/hooks"

/**
 * hook-length — every hook line fits the 72-Greek-character budget, and the
 * machine-readable register (lib/growth/hooks.ts) is a faithful mirror of the
 * canonical one (docs/growth/HOOKS.md), not a fork of it.
 *
 * Two rules this file enforces, and why:
 *
 *  1. ≤72 CODE POINTS, never bytes. Greek is two UTF-8 bytes a letter, so a
 *     byte count would flag a 40-letter line the viewport renders comfortably.
 *     The budget bit before this guard existed: H4's natural phrasing measured
 *     75 and was rewritten rather than allowed to clip at 320px.
 *  2. THE UNIVERSE IS THE REGISTER DOCUMENT, parsed from disk — never a
 *     hand-written list in this file. A guard whose universe is a list guards
 *     the list (that failure has occurred seven times in this programme). The
 *     live-hooks table in HOOKS.md is parsed here, and the module must match
 *     it row for row, field for field.
 *
 * Committed probes (tests/fixtures/guard-probes/hook-line-*) prove the
 * measurer red on the overlong line and prove the code-point/byte distinction
 * on a 72-code-point Greek line that a byte counter would wrongly reject.
 */

const ROOT = process.cwd()
const REGISTER = path.join(ROOT, "docs/growth/HOOKS.md")

interface RegisterRow {
    id: string
    audience: string
    el: string
    charsEl: number
    en: string
    charsEn: number
    guideHref: string
    sourceIds: string[]
}

/** Parse the "## Live hooks" table out of the canonical register. */
function parseLiveHooks(): RegisterRow[] {
    const doc = readFileSync(REGISTER, "utf8")
    const section = doc.split(/^## Live hooks$/m)[1]?.split(/^## /m)[0]
    expect(section, "HOOKS.md must carry a '## Live hooks' section").toBeTruthy()

    const rows: RegisterRow[] = []
    for (const line of section!.split("\n")) {
        const match = /^\|\s*\*\*(H\d+)\*\*\s*\|/.exec(line)
        if (!match) continue
        const cells = line.split("|").map((c) => c.trim())
        // | id | audience | EL | chars | EN | chars | guide | sources | decision |
        rows.push({
            id: match[1],
            audience: cells[2],
            el: cells[3],
            charsEl: Number(cells[4]),
            en: cells[5],
            charsEn: Number(cells[6]),
            guideHref: cells[7].replace(/^`|`$/g, ""),
            sourceIds: cells[8].split(",").map((s) => s.trim()).filter(Boolean),
        })
    }
    return rows
}

describe("hook-length: the register document is the universe", () => {
    const documented = parseLiveHooks()

    it("parses a real, non-empty live-hooks table (an emptied parse must not pass the guard)", () => {
        expect(documented.length).toBeGreaterThanOrEqual(1)
        for (const row of documented) {
            expect(row.el, `${row.id} EL line parsed empty`).not.toBe("")
            expect(row.en, `${row.id} EN line parsed empty`).not.toBe("")
            expect(row.guideHref, `${row.id} guide href`).toMatch(/^\/guides\//)
            expect(Number.isFinite(row.charsEl), `${row.id} EL char count`).toBe(true)
        }
    })

    it("lib/growth/hooks.ts mirrors the register exactly — ids, lines, counts, hrefs, sources", () => {
        expect(GROWTH_HOOKS.map((h) => h.id)).toEqual(documented.map((r) => r.id))
        for (const row of documented) {
            const hook = GROWTH_HOOKS.find((h) => h.id === row.id)!
            expect(hook.line.el, `${row.id} EL line diverged from HOOKS.md`).toBe(row.el)
            expect(hook.line.en, `${row.id} EN line diverged from HOOKS.md`).toBe(row.en)
            expect(hook.chars.el, `${row.id} EL char count diverged from HOOKS.md`).toBe(row.charsEl)
            expect(hook.chars.en, `${row.id} EN char count diverged from HOOKS.md`).toBe(row.charsEn)
            expect(hook.guideHref, `${row.id} guide href diverged from HOOKS.md`).toBe(row.guideHref)
            expect([...hook.sourceIds], `${row.id} sources diverged from HOOKS.md`).toEqual(row.sourceIds)
            expect(hook.audience, `${row.id} audience diverged from HOOKS.md`).toBe(row.audience)
        }
    })

    it("every hook line fits the budget, measured in code points, in BOTH languages", () => {
        for (const hook of GROWTH_HOOKS) {
            for (const lang of ["el", "en"] as const) {
                const measured = hookLineLength(hook.line[lang])
                expect(
                    measured,
                    `${hook.id} ${lang} line measures ${measured} > ${HOOK_LINE_MAX_CODEPOINTS}: ` +
                        `it will clip at 320px — rewrite it (the register did exactly that to H4)`
                ).toBeLessThanOrEqual(HOOK_LINE_MAX_CODEPOINTS)
            }
        }
    })

    it("stored char counts are MEASUREMENTS, not estimates — they equal the code-point count", () => {
        for (const hook of GROWTH_HOOKS) {
            expect(hook.chars.el, `${hook.id} chars.el is stale`).toBe(hookLineLength(hook.line.el))
            expect(hook.chars.en, `${hook.id} chars.en is stale`).toBe(hookLineLength(hook.line.en))
        }
    })

    it("the B2B set stays empty until the register carries a live b2b row", () => {
        const documentedB2b = documented.filter((r) => r.audience === "b2b")
        expect(GROWTH_HOOKS_B2B.map((h) => h.id)).toEqual(documentedB2b.map((r) => r.id))
    })
})

describe("hook-length: copy is never retyped at a render site", () => {
    // The universe, from disk: every runtime source root. Only the carrier
    // module itself may contain a hook line.
    function walk(dir: string, out: string[] = []): string[] {
        for (const entry of readdirSync(dir)) {
            if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue
            const full = path.join(dir, entry)
            if (statSync(full).isDirectory()) walk(full, out)
            else if (/\.tsx?$/.test(entry)) out.push(full)
        }
        return out
    }

    const FILES = ["app", "components", "lib", "hooks", "contexts"]
        .map((d) => path.join(ROOT, d))
        .filter((d) => {
            try {
                return statSync(d).isDirectory()
            } catch {
                return false
            }
        })
        .flatMap((d) => walk(d))

    const CARRIER = path.join(ROOT, "lib/growth/hooks.ts")

    it("enumerates a real universe", () => {
        expect(FILES.length).toBeGreaterThan(400)
        expect(FILES).toContain(CARRIER)
    })

    it("no file outside the carrier contains a hook line verbatim", () => {
        const lines = GROWTH_HOOKS.flatMap((h) => [h.line.el, h.line.en])
        const offenders = FILES.filter((f) => f !== CARRIER).filter((f) => {
            const src = readFileSync(f, "utf8")
            return lines.some((line) => src.includes(line))
        })
        expect(offenders.map((f) => path.relative(ROOT, f))).toEqual([])
    })
})

describe("the measurer itself is proven against committed probes", () => {
    const probe = (name: string) =>
        readFileSync(path.join(ROOT, "tests/fixtures/guard-probes", name), "utf8").trim()

    it("flags the overlong probe — H4's original 75-code-point phrasing", () => {
        const line = probe("hook-line-overlong-el.txt")
        expect(hookLineLength(line)).toBe(75)
        expect(hookLineLength(line)).toBeGreaterThan(HOOK_LINE_MAX_CODEPOINTS)
    })

    it("passes the 72-code-point Greek boundary probe a BYTE counter would wrongly reject", () => {
        const line = probe("hook-line-multibyte-boundary.txt")
        expect(hookLineLength(line)).toBe(HOOK_LINE_MAX_CODEPOINTS) // in budget
        expect(Buffer.byteLength(line, "utf8")).toBeGreaterThan(HOOK_LINE_MAX_CODEPOINTS) // 134 bytes
    })

    it("flags the inline-copy probe — a render site retyping a hook line", () => {
        const src = probe("hook-copy-inline.tsx.txt")
        expect(GROWTH_HOOKS.some((h) => src.includes(h.line.el) || src.includes(h.line.en))).toBe(true)
    })
})
