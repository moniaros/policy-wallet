import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"

/**
 * A coloured panel that declares its own text colour must be readable.
 *
 * Found by arithmetic, after the browser found one instance: the delete-policy
 * dialog rendered «Η ενέργεια είναι οριστική» — the sentence saying the
 * deletion cannot be undone — at **3.12:1** in `text-red-100` on `bg-red-500`.
 * The interesting part was that no foreground fixed it: on `bg-red-500` even
 * PURE WHITE is 3.81:1. The background was the defect, and the heading above it
 * passed only because bold 20px counts as large text.
 *
 * The harness measures rendered contrast and did catch that one, but nothing
 * GATES on its output — six failures sat in the evidence files. This guard is
 * the cheap arithmetic half: any element that names a background AND a
 * foreground in the same class list can be checked without a browser, and it
 * found four more pairs the browser had never navigated to, two of which fail
 * even the lenient 3:1 large-text floor (`bg-amber-500` + `text-white` at
 * 2.14:1, `bg-green-500` at 2.22:1).
 *
 * What it CANNOT see: an inherited background, which is how the delete dialog's
 * paragraph looked in source (`text-red-100` with no `bg-*` of its own). That
 * case belongs to the harness's `contrastFailures`, which resolves computed
 * style. Two halves, neither sufficient alone.
 */

/** WCAG relative luminance / contrast ratio. */
const lum = (hex: string) => {
    const c = [1, 3, 5]
        .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const ratio = (a: string, b: string) => {
    const [l1, l2] = [lum(a), lum(b)]
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

/**
 * Tailwind 4 palette, only the entries actually used by a matched pair.
 *
 * Two of these are confirmed against the browser rather than copied from docs:
 * the harness measured `bg-red-500` as `#fb2c36` and `text-amber-600` as
 * `#e17100`, and both match. An unknown hue/shade THROWS — a palette that
 * silently returns undefined would turn every new colour into a vacuous pass,
 * which is the failure mode this repo keeps rediscovering.
 */
const PALETTE: Record<string, string> = {
    white: "#ffffff",
    black: "#000000",
    "red-500": "#fb2c36",
    "red-600": "#e7000b",
    "red-100": "#ffe2e2",
    "amber-500": "#fd9a00",
    "amber-600": "#e17100",
    "amber-700": "#bb4d00",
    "amber-400": "#ffb900",
    "green-500": "#00c951",
    "neutral-900": "#171717",
    "slate-900": "#0f172b",
}

const BG = /\bbg-(red|rose|amber|orange|emerald|green|sky|blue|indigo|violet|slate|zinc|neutral|stone|gray)-(400|500|600|700|800|900)\b/
const FG = /\btext-(white|black)\b|\btext-(red|rose|amber|orange|emerald|green|sky|blue|indigo|violet|slate|zinc|neutral|stone|gray)-(50|100|200|300)\b/
const CLASSNAME = /className=(?:"([^"]*)"|\{`([^`]*)`\})/g

type Pair = { file: string; line: number; bg: string; fg: string; ratio: number }

function scan(): { pairs: Pair[]; files: string[]; unknown: string[] } {
    const files = [...globSync("app/**/*.tsx"), ...globSync("components/**/*.tsx")].sort()
    const pairs: Pair[] = []
    // Collected, not thrown. A module-scope throw makes vitest report "no
    // tests" — which reads like a pass at a glance — instead of a red test.
    const unknown: string[] = []
    for (const file of files) {
        const src = readFileSync(file, "utf-8")
        for (const m of src.matchAll(CLASSNAME)) {
            // Dark-mode variants pair against a different surface; out of scope here.
            const cn = (m[1] ?? m[2] ?? "").replace(/dark:\S+/g, "")
            const bg = cn.match(BG)?.[0]
            const fg = cn.match(FG)?.[0]
            if (!bg || !fg) continue
            const bgKey = bg.replace("bg-", "")
            const fgKey = fg.replace("text-", "")
            let missing = false
            for (const [k, label] of [[bgKey, bg], [fgKey, fg]] as const) {
                if (!PALETTE[k]) {
                    unknown.push(`${file}: "${label}"`)
                    missing = true
                }
            }
            if (missing) continue
            pairs.push({
                file,
                line: src.slice(0, m.index).split("\n").length,
                bg,
                fg,
                ratio: ratio(PALETTE[fgKey], PALETTE[bgKey]),
            })
        }
    }
    return { pairs, files, unknown }
}

/**
 * §12.4 puts the agent dashboard and admin outside this run. These are real
 * failures and are recorded as such; they are not fixed here because touching
 * B2B surfaces is out of scope, not because they are acceptable.
 */
const OUT_OF_SCOPE_B2B = new Set([
    "app/(protected)/admin/dsr/DsrQueueClient.tsx",
    "components/agent/InviteModal.tsx",
    "components/agent/QuestionnaireSender.tsx",
    "components/agent/UploadPolicyModal.tsx",
    "components/collaboration/AgentInbox.tsx",
])

describe("a panel that names its own foreground and background is readable", () => {
    const { pairs, files, unknown } = scan()

    it("every colour it met is in the palette — an unknown one is a vacuous pass", () => {
        expect(
            unknown,
            "add each colour's Tailwind 4 hex to PALETTE; skipping it silently excuses the element"
        ).toEqual([])
    })

    it("the scan is not vacuous", () => {
        expect(files.length).toBeGreaterThan(200)
        expect(pairs.length).toBeGreaterThan(20)
        // A known-good pair must be present, or the matcher has stopped matching.
        expect(pairs.some((p) => p.bg === "bg-neutral-900" && p.fg === "text-white")).toBe(true)
    })

    it("every in-scope pair clears 4.5:1", () => {
        const bad = pairs
            .filter((p) => !OUT_OF_SCOPE_B2B.has(p.file))
            .filter((p) => p.ratio < 4.5)
            .map((p) => `${p.file}:${p.line} ${p.bg} + ${p.fg} = ${p.ratio.toFixed(2)}:1`)
        expect(bad).toEqual([])
    })

    it("the delete dialog's permanence warning is legible", () => {
        const src = readFileSync("components/wallet/DeletePolicy.tsx", "utf-8")
        expect(src, "bg-red-500 cannot carry normal text — even white is 3.81:1").not.toMatch(/bg-red-500/)
        expect(src).toMatch(/bg-red-600/)
        expect(ratio(PALETTE.white, PALETTE["red-600"])).toBeGreaterThanOrEqual(4.5)
    })

    it("NotificationBell stays deleted — nothing imports it", () => {
        // D-022 epilogue: the component (dead since the shell dropped its
        // `compact` UserMenu branch, carrying a bg-red-500 badge that would
        // fail the 4.5:1 scan if it ever mounted) was DELETED in the Phase 5
        // notifications rebuild, and its exemption above left with it. This
        // asserts the deletion holds: no file may import it, and a restored
        // copy would re-enter the main scan with no exemption to hide behind.
        const importers = [...globSync("app/**/*.tsx"), ...globSync("components/**/*.tsx")]
            .filter((f) => !f.endsWith("NotificationBell.tsx"))
            .filter((f) => /from\s+["'][^"']*NotificationBell["']/.test(readFileSync(f, "utf-8")))
        expect(importers, "NotificationBell is back — it died unmounted; do not remount it").toEqual([])
    })

    it("records the out-of-scope B2B failures rather than forgetting them", () => {
        const b2bBad = pairs.filter((p) => OUT_OF_SCOPE_B2B.has(p.file) && p.ratio < 4.5)
        // They exist. If someone fixes one, drop its entry — the set must not
        // outlive the defects and quietly excuse a NEW one on the same file.
        expect(b2bBad.length).toBeGreaterThan(0)
        for (const f of OUT_OF_SCOPE_B2B) {
            expect(
                pairs.some((p) => p.file === f && p.ratio < 4.5),
                `${f} no longer has a failing pair — delete its OUT_OF_SCOPE_B2B entry`
            ).toBe(true)
        }
    })
})

/**
 * The risk-profile band tones are GONE, and this holds them gone.
 *
 * `BAND_TONE` coloured a completeness index and its verdict label («Καλή
 * εικόνα»). Its `fair` entry was `text-amber-600` — 3.20:1 on white, measured
 * on the live page — which passed for the 3xl number and failed for the
 * `text-sm` label beside it, and the guard that used to live here caught that.
 *
 * H-005 was answered 2026-08-25: the second score should not exist. The metric,
 * its band label and this tone map were deleted, so guarding their contrast
 * guards nothing. Rewritten to enforce the DECISION instead — a check that the
 * tones are absent cannot pass vacuously, where "if BAND_TONE exists it must
 * clear 4.5:1" would pass loudest exactly when the file is empty.
 *
 * If a coloured band ever returns, this fails and points at H-005. Whoever
 * revives it owes a fresh contrast check, because the last one was wrong.
 */
describe("the risk-profile band tones stay deleted (H-005)", () => {
    const raw = readFileSync("components/risk-dna/RiskIntelligenceView.tsx", "utf-8")
    // Comments stripped first. The file carries a tombstone explaining what was
    // removed and naming BAND_TONE — and this test failed on its own tombstone
    // before the strip. An absence check that reads prose is measuring the wrong
    // thing; that is the third time this has bitten in this codebase.
    const src = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

    it("no BAND_TONE map, and no band verdict label", () => {
        expect(src, "BAND_TONE is back — H-005 says the second score should not exist").not.toMatch(
            /\bBAND_TONE\b/
        )
        for (const label of ["Καλή εικόνα", "Μερική εικόνα", "Περιορισμένη εικόνα"]) {
            expect(src, `the band verdict «${label}» is back`).not.toContain(label)
        }
    })

    it("no completeness index renders under its fact key", () => {
        expect(src, "profile.healthIndex is back on this surface").not.toContain("profile.healthIndex")
        expect(src, "the component percentages are the index distributed").not.toContain(
            "profile.healthComponent"
        )
    })

    it("the file is still the one being checked — not renamed out from under this test", () => {
        // Non-vacuity: absence assertions on a missing file all pass.
        expect(raw.length).toBeGreaterThan(2000)
        expect(raw).toContain("RiskIntelligenceView")
        // and the strip did not eat the whole file
        expect(src.length).toBeGreaterThan(1000)
    })
})
