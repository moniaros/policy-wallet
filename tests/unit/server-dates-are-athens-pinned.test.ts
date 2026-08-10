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

describe("no server-rendered date resolves against the runtime zone", () => {
    it("scans a realistic number of server files", () => {
        expect(SERVER_FILES.length).toBeGreaterThan(200)
    })

    it("every toLocaleDateString/toLocaleString on the server pins a timezone", () => {
        const offenders: string[] = []

        for (const file of SERVER_FILES) {
            const src = readFileSync(file, "utf-8")
            // Strip comments: `portfolio-rules.ts` documents the old bug in prose.
            const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

            // `.toLocaleString()` on a NUMBER is the thousands separator and has
            // nothing to do with timezones — flagging it would bury the real
            // finding in noise, which is how a guard stops being read.
            const DATE_CALL =
                /(\w*(?:[Dd]ate|At|[Ee]xpires|[Ss]tart|[Ee]nd|[Cc]reated|[Uu]pdated|[Oo]ccurred)\w*|new Date\([^)]*\))\s*\.toLocale(?:Date|Time)?String\(([\s\S]{0,240}?)\)|\.toLocaleDateString\(([\s\S]{0,240}?)\)/g

            for (const match of code.matchAll(DATE_CALL)) {
                const args = match[2] ?? match[3] ?? ""
                if (/timeZone/.test(args)) continue
                const line = code.slice(0, match.index).split("\n").length
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
