import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync, statSync } from "fs"
import path from "path"

/**
 * THE PROTECTION SCORE RENDERS IN ONE KIND OF PLACE, AND NEVER IN A FEED.
 *
 * The score is a weighted average over risk CATEGORIES — it measures the breadth
 * of someone's cover, not how protected they are. Rendered without that
 * qualifier it is read as a grade, and rendered in a list of things that
 * happened it is read as an event: «Το σκορ προστασίας έπεσε στο 74» in the
 * dashboard's changes feed claims something befell the customer, which is a
 * stronger claim than the donut it replaced ever made.
 *
 * Two rules, both enumerated from the filesystem so a new component is covered
 * the day it is written:
 *
 *  1. A file that renders the score VALUE must be on the sanctioned list.
 *  2. No timeline/feed title may interpolate the score value at all.
 *
 * Sanctioned means the surface carries the qualifier and does not present the
 * number as a verdict — see ProtectionStatusHero's disclosure and
 * ScoreMethodology. Adding a file here is a deliberate act with a reason.
 */
const ROOT = process.cwd()

function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue
        const full = path.join(dir, entry)
        if (statSync(full).isDirectory()) walk(full, out)
        else if (/\.tsx?$/.test(entry)) out.push(full)
    }
    return out
}

/** Every customer-facing source file. The universe, from disk. */
const FILES = [path.join(ROOT, "components"), path.join(ROOT, "app")]
    .filter((d) => { try { return statSync(d).isDirectory() } catch { return false } })
    .flatMap((d) => walk(d))
    .filter((f) => !/\/(admin|agent)\//.test(f))

/**
 * Files allowed to render the portfolio score value to a policyholder.
 * Each carries the qualifier at the point of use.
 */
const SANCTIONED = new Set([
    "components/dashboard/home/ProtectionStatusHero.tsx", // behind a disclosure, no verdict
    "components/coverage/ProtectionScoreCard.tsx",        // the dedicated score surface
])

describe("the protection score value is contained", () => {
    it("enumerates a real universe (a moved directory must not empty this guard)", () => {
        expect(FILES.length).toBeGreaterThan(200)
    })

    it("renders the score value only where it is sanctioned", () => {
        // `overallScore` is the portfolio figure. A file that interpolates it
        // into JSX is rendering it; a file that merely passes it through props
        // or types is not, so we look for it inside braces next to markup.
        const offenders = FILES.filter((f) => {
            const rel = path.relative(ROOT, f)
            if (SANCTIONED.has(rel)) return false
            const src = readFileSync(f, "utf8")
            return /\{[^}\n]*\boverallScore\b[^}\n]*\}\s*</.test(src) || />\s*\{[^}\n]*\boverallScore\b/.test(src)
        }).map((f) => path.relative(ROOT, f))
        expect(offenders).toEqual([])
    })

    it("never states the score value in a timeline or changes title", () => {
        // The exact regression: build.ts composed «Το σκορ προστασίας έπεσε στο
        // ${current.overallScore}» and the dashboard rendered it as a bullet.
        const src = readFileSync(path.join(ROOT, "lib/services/timeline/build.ts"), "utf8")
        const titles = src.match(/el:\s*`[^`]*`/g) ?? []
        for (const t of titles) {
            expect(t, "a timeline title interpolates the score value").not.toMatch(/overallScore/)
        }
    })

    it("the changes widget renders no bare delta", () => {
        // A delta is a derivative; without its base in the same container it is
        // a number the reader cannot check, and it disagreed with the hero's.
        const src = readFileSync(path.join(ROOT, "components/dashboard/home/RecentChangesWidget.tsx"), "utf8")
        expect(src).not.toMatch(/\{change\.delta\}/)
    })
})
