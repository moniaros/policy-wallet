import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { globSync } from "glob"
import { calendarDaysUntil } from "@/lib/policy-status"
import { formatDate } from "@/lib/i18n/format"

/**
 * Dates rendered on the server must be pinned to Athens.
 *
 * `toLocaleDateString()` with no `timeZone` resolves against the RUNTIME zone.
 * In the browser that is the reader's own zone, which is fine. On Vercel it is
 * UTC — and policy end dates are stored at midnight UTC, which is 03:00 Athens.
 * So anything ending near the Athens day boundary rendered as the previous day.
 *
 * The codebase already fixed this once (Sentry POLICYWALLET-8) and built
 * `lib/i18n/format.ts` as the single formatter; `portfolio-rules.ts` still
 * carries the comment describing the fix. The policyholder dashboard had since
 * reintroduced it — and alongside it a hand-rolled `daysUntil` doing millisecond
 * division, which is a duration in 24-hour units rather than a count of calendar
 * days, and which picks the urgency colour shown beside that very date.
 *
 * Being a day out on a compulsory motor policy is not a cosmetic bug in Greece.
 */

const SERVER_FILES = globSync("{app,lib}/**/*.{ts,tsx}", {
    ignore: ["**/node_modules/**", "**/*.test.*"],
}).filter((file) => {
    const src = readFileSync(file, "utf-8")
    // Client components render in the reader's own zone, which is correct.
    return !/^\s*["']use client["']/m.test(src)
})

const stripComments = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

// `.toLocaleString()` on a NUMBER is the thousands separator and has
// nothing to do with timezones — flagging it would bury the real
// finding in noise, which is how a guard stops being read.
const DATE_CALL =
    /(\w*(?:[Dd]ate|At|[Ee]xpires|[Ss]tart|[Ee]nd|[Cc]reated|[Uu]pdated|[Oo]ccurred)\w*|new Date\([^)]*\))\s*\.toLocale(?:Date|Time)?String\(([\s\S]{0,240}?)\)|\.toLocaleDateString\(([\s\S]{0,240}?)\)/g

/** Line numbers of every toLocale*String call that does not pin a timeZone. */
function unpinnedLocaleCalls(code: string): number[] {
    const lines: number[] = []
    for (const match of code.matchAll(DATE_CALL)) {
        const args = match[2] ?? match[3] ?? ""
        if (/timeZone/.test(args)) continue
        lines.push(code.slice(0, match.index).split("\n").length)
    }
    return lines
}

/**
 * `new Intl.DateTimeFormat(...)` is the OTHER way to render a date, and the
 * original matcher did not know it — which is how a server page shipped
 * `dateStyle`+`timeStyle` with no timeZone (three hours off for every Athens
 * reader on Vercel) while this guard stayed green. The constructor's argument
 * list is taken to its BALANCED closing paren, not a fixed window, so a
 * `timeZone:` in unrelated code after the call cannot vouch for it.
 */
function unpinnedIntlCalls(code: string): number[] {
    const lines: number[] = []
    for (const match of code.matchAll(/new\s+Intl\.DateTimeFormat\s*\(/g)) {
        let depth = 1
        let i = match.index! + match[0].length
        const start = i
        while (i < code.length && depth > 0) {
            if (code[i] === "(") depth += 1
            else if (code[i] === ")") depth -= 1
            i += 1
        }
        const args = code.slice(start, i - 1)
        if (/timeZone\s*:/.test(args)) continue
        lines.push(code.slice(0, match.index).split("\n").length)
    }
    return lines
}

/**
 * SHRINK-ONLY, and now EMPTY. Fixing a file must delete its row; a stale row
 * fails below. Do not add rows — new code pins its timezone.
 *
 * Cleared 2026-08-28. Both offenders are fixed: admin/submissions delegates to
 * the shared `formatDateTime` (which pins APP_TIME_ZONE) instead of building
 * its own formatter, and `action-resolvers.isoDate()` pins the zone directly.
 * Both were invisible to the original matcher, which knew `toLocale*` and not
 * `Intl.DateTimeFormat` — a guard over the codebase's most-stated invariant
 * that could not see the other way of writing the same bug.
 */
const KNOWN_UNPINNED_INTL_DEBT: string[] = []

describe("no server-rendered date resolves against the runtime zone", () => {
    it("scans a realistic number of server files", () => {
        expect(SERVER_FILES.length).toBeGreaterThan(200)
    })

    it("every toLocaleDateString/toLocaleString on the server pins a timezone", () => {
        const offenders: string[] = []

        for (const file of SERVER_FILES) {
            // Strip comments: `portfolio-rules.ts` documents the old bug in prose.
            const code = stripComments(readFileSync(file, "utf-8"))
            for (const line of unpinnedLocaleCalls(code)) {
                offenders.push(`${file}:${line}`)
            }
        }

        expect(
            offenders,
            "These render a date on the server without pinning a timezone, so they\n" +
                "resolve against UTC on Vercel. Use formatDate/formatDateTime from\n" +
                `lib/i18n/format.ts:\n  ${offenders.join("\n  ")}`
        ).toEqual([])
    })

    it("every new Intl.DateTimeFormat(...) on the server pins a timezone", () => {
        const offenders: string[] = []
        for (const file of SERVER_FILES) {
            if (KNOWN_UNPINNED_INTL_DEBT.includes(file)) continue
            const code = stripComments(readFileSync(file, "utf-8"))
            for (const line of unpinnedIntlCalls(code)) {
                offenders.push(`${file}:${line}`)
            }
        }
        expect(
            offenders,
            "These construct an Intl.DateTimeFormat on the server without a\n" +
                "timeZone, so they resolve against UTC on Vercel. Use\n" +
                `formatDate/formatDateTime from lib/i18n/format.ts:\n  ${offenders.join("\n  ")}`
        ).toEqual([])
    })

    it("the known unpinned-Intl debt is still red — fixing a file must delete its row", () => {
        for (const file of KNOWN_UNPINNED_INTL_DEBT) {
            const code = stripComments(readFileSync(file, "utf-8"))
            expect(
                unpinnedIntlCalls(code).length,
                `${file} no longer has an unpinned Intl.DateTimeFormat — delete its debt row`
            ).toBeGreaterThan(0)
        }
    })

    it("nobody counts days by dividing milliseconds", () => {
        const offenders: string[] = []
        for (const file of SERVER_FILES) {
            const code = readFileSync(file, "utf-8")
                .replace(/\/\*[\s\S]*?\*\//g, "")
                .replace(/^\s*\/\/.*$/gm, "")
            // `(a - b) / 86400000` and its spelled-out forms.
            if (/\/\s*\(?\s*(?:1000\s*\*\s*60\s*\*\s*60\s*\*\s*24|86_?400_?000|24\s*\*\s*3600_?000)\s*\)?/.test(code)) {
                // Only a finding when the result is presented as a DAY COUNT.
                if (/\b(?:days?Until|daysLeft|daysRemaining|calendarDays)\b/.test(code)) {
                    offenders.push(file)
                }
            }
        }
        expect(
            offenders,
            "A 24-hour unit is not a calendar day: it is off by one across the\n" +
                "Athens/UTC boundary and drifts a full day across DST. Use\n" +
                `calendarDaysUntil from lib/policy-status.ts:\n  ${offenders.join("\n  ")}`
        ).toEqual([])
    })
})

describe("the dashboard uses the shared helpers", () => {
    const HOME = readFileSync("app/(protected)/dashboard/PolicyholderHome.tsx", "utf-8")

    it("counts calendar days rather than 24-hour blocks", () => {
        expect(HOME).toContain("calendarDaysUntil")
        expect(HOME).not.toMatch(/Date\.now\(\)\s*\)\s*\/\s*\(1000 \* 60 \* 60 \* 24\)/)
    })

    it("formats the end date through the pinned formatter", () => {
        expect(HOME).toContain("formatDate(endDate, lang)")
    })
})

describe("the helpers actually behave differently — this is not a style rule", () => {
    it("a policy ending at Athens midnight is not dated to the previous day", () => {
        // 2026-09-01T00:00+03:00 === 2026-08-31T21:00Z. Rendered in UTC that is
        // 31 August; the customer's policy ends on 1 September.
        const endsAtAthensMidnight = new Date("2026-08-31T21:00:00.000Z")

        const pinned = formatDate(endsAtAthensMidnight, "en")
        expect(pinned, "the pinned formatter should say 1 September").toContain("01")
        expect(pinned).toContain("09")

        const naive = endsAtAthensMidnight.toLocaleDateString("en-GB", { timeZone: "UTC" })
        expect(naive, "and the naive render is the day before — the bug").toContain("31")
    })

    it("counts the calendar day even when less than 24 hours remain", () => {
        // 22:00 Athens today → 01:00 Athens tomorrow is 3 hours, but it is one
        // calendar day away, and the customer's cover ends TOMORROW.
        const now = new Date("2026-08-31T19:00:00.000Z") // 22:00 Athens
        const ends = new Date("2026-08-31T22:00:00.000Z") // 01:00 Athens, 1 Sep

        expect(calendarDaysUntil(ends, now)).toBe(1)
        // The old arithmetic called this zero days — "expires today".
        expect(Math.ceil((ends.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))).toBe(1 - 0)
    })
})

/**
 * RED-PROOF (Phase 6 guard audit). The scan arms above are regexes over the
 * tree; each is proven here against the AUTHENTIC offending source — the two
 * live Intl offenders verbatim as they stand in the tree today, and the
 * toLocale* shape the original fix removed — plus the pinned shapes that must
 * stay silent. Gut a matcher and these fail first, naming the shape.
 */
describe("the matchers are proven on authentic sources", () => {
    it("flags the authentic unpinned Intl shapes (both live offenders)", () => {
        // Verbatim: app/(protected)/admin/submissions/page.tsx — dateStyle +
        // timeStyle, no timeZone, in a server component.
        const adminSubmissions = `function formatDate(value: Date) {
    return new Intl.DateTimeFormat("el-GR", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(value)
}`
        expect(unpinnedIntlCalls(adminSubmissions)).toEqual([2])

        // Verbatim: lib/insurance/content/action-resolvers.ts isoDate().
        const actionResolvers =
            "        new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)"
        expect(unpinnedIntlCalls(actionResolvers)).toEqual([1])
    })

    it("stays silent on pinned calls, parameterised timeZones, and the type name", () => {
        // Verbatim: lib/pricing/promotions.ts — pinned.
        expect(
            unpinnedIntlCalls(`new Intl.DateTimeFormat(locale === "el" ? "el-GR" : "en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Europe/Athens",
    }).format(promotion.endsAt)`)
        ).toEqual([])
        // Verbatim shape: lib/notifications/orchestrator.ts localHour() — the
        // zone is the READER's, passed in, which is the point of that function.
        expect(
            unpinnedIntlCalls(
                `const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "numeric", hour12: false }).formatToParts(at)`
            )
        ).toEqual([])
        // A type annotation is not a call.
        expect(unpinnedIntlCalls(`options: Intl.DateTimeFormatOptions = {}`)).toEqual([])
    })

    it("a timeZone AFTER the call cannot vouch for it — the args window is balanced, not fixed", () => {
        const code = `const label = new Intl.DateTimeFormat("el-GR", { dateStyle: "medium" }).format(d)
const other = { timeZone: "Europe/Athens" }`
        expect(unpinnedIntlCalls(code)).toEqual([1])
    })

    it("flags the naive toLocale* shape and ignores number formatting", () => {
        // The POLICYWALLET-8 shape: an end date rendered with no pin.
        expect(unpinnedLocaleCalls(`const label = endDate.toLocaleDateString("el-GR")`)).toEqual([1])
        // Pinned is fine.
        expect(
            unpinnedLocaleCalls(
                `const label = endDate.toLocaleDateString("el-GR", { timeZone: "Europe/Athens" })`
            )
        ).toEqual([])
        // A thousands separator on a number is not a date render.
        expect(unpinnedLocaleCalls(`const label = total.toLocaleString("el-GR")`)).toEqual([])
    })
})
