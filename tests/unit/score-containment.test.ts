import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync, statSync } from "fs"
import path from "path"

/**
 * THE PROTECTION SCORE VALUE RENDERS NOWHERE. Not "in one kind of place" —
 * nowhere.
 *
 * The score was a weighted average of coverage BREADTH presented as a
 * protection verdict, its severities unvalidated pending underwriter review,
 * and its provisional fallback returned 100 for a portfolio nothing had ever
 * analysed — which was then EMAILED as a perfect score to people whose
 * documents nobody had read. It was removed from the product in Aug 2026
 * (run PW-MOBILE-TRANSFORM-01, halt H-001, owner decision).
 *
 * History of this guard, kept because it explains its shape:
 *
 *  1. It began as a containment list — two sanctioned surfaces, everything
 *     else refused. The list is now EMPTY, and re-adding an entry means
 *     reversing an owner decision, not fixing a test.
 *  2. Its universe was components/ + app/, which is exactly how the weekly
 *     digest's `${data.healthScore}%` tile survived a guard named "score
 *     containment": email templates live in lib/. The universe is now
 *     enumerated from disk across components/, app/ AND lib/.
 *  3. It matched only JSX interpolation; the email leak was a template
 *     literal. Both shapes are matched now, and committed probe fixtures
 *     (tests/fixtures/guard-probes/score-*) prove each matcher red and the
 *     internal-use shape green.
 *
 * What stays legal: computing, storing, hashing and comparing the figure
 * (the engine and the version history are producers, and agent-side surfaces
 * are out of this guard's jurisdiction — they enumerate under /agent/ and
 * /admin/ paths, which B2C policy explicitly does not cover).
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

/**
 * Every customer-facing source file — components, pages, AND lib (services,
 * email templates, notification emitters). The universe, from disk.
 */
const FILES = [path.join(ROOT, "components"), path.join(ROOT, "app"), path.join(ROOT, "lib")]
    .filter((d) => { try { return statSync(d).isDirectory() } catch { return false } })
    .flatMap((d) => walk(d))
    // B1.7 (PW-TRANSPARENCY-02) widened the universe to agent paths: the score is
    // not a B2C-only invariant. Admin stays out (operators, not customers).
    .filter((f) => !/\/admin\//.test(f))

/**
 * EMPTY, deliberately, and asserted empty below. Two surfaces used to be
 * sanctioned (ProtectionStatusHero's disclosure and the ProtectionScoreCard);
 * both renders were removed with the score itself. Adding a file here is not
 * a test fix — it is reversing halt H-001, which is the owner's call.
 */
const SANCTIONED = new Set<string>([])

/**
 * Agent-side files that render the RELATIONSHIP health score — an engagement
 * metric (contact recency, activation, opportunities), not a protection
 * verdict — under the `healthScore` identifier this guard also matches. Named
 * with the reason, and asserted below to still carry that identifier so the
 * exemption cannot outlive its cause. Nothing here renders the protection score.
 */
// PW-CONTENT-01 Goal 3 (D-C3): the relationship index renders nowhere any more.
// The set stays EMPTY; the test below fails if it regrows.
const RELATIONSHIP_HEALTH_RENDERS = new Set<string>([])

/** The identifiers that carry the portfolio score value through the code. */
const IDS = "(?:overallScore|healthScore|protectionScore|previousScore|currentScore)"

/**
 * JSX interpolation of the score value. The negative lookahead `(?!\s*[.:])`
 * keeps property paths out: `t.wallet.healthScore.title` is a translation KEY
 * (the per-policy indicator's copy, a different metric), not the value.
 */
const JSX_RENDER = new RegExp(
    `\\{[^}\\n]*\\b${IDS}\\b(?!\\s*[.:])[^}\\n]*\\}\\s*<|>\\s*\\{[^}\\n]*\\b${IDS}\\b(?!\\s*[.:])`
)

/**
 * Template-literal interpolation of the score value into rendered text — the
 * email shape. Two nets:
 *   - the value immediately dressed as a percentage: `${…healthScore…}%`
 *   - the value interpolated within sight of a score label in either language
 * Internal uses (hash inputs, comparisons) match neither.
 */
const TPL_PERCENT = new RegExp(`\\$\\{[^}\\n]*\\b${IDS}\\b(?!\\s*[.:])[^}\\n]*\\}\\s*%`)
const TPL_ANY = new RegExp(`\\$\\{[^}\\n]*\\b${IDS}\\b(?!\\s*[.:])[^}\\n]*\\}`, "g")
const SCORE_LABEL = /Βαθμολογία προστασίας|σκορ προστασίας|[Pp]rotection [Ss]core/

function rendersScoreValue(src: string): boolean {
    if (JSX_RENDER.test(src)) return true
    if (TPL_PERCENT.test(src)) return true
    for (const m of src.matchAll(TPL_ANY)) {
        const at = m.index ?? 0
        const window = src.slice(Math.max(0, at - 120), at + m[0].length + 120)
        if (SCORE_LABEL.test(window)) return true
    }
    return false
}

describe("the protection score value renders nowhere", () => {
    it("enumerates a real universe (a moved directory must not empty this guard)", () => {
        expect(FILES.length).toBeGreaterThan(400)
        // lib/ must genuinely be inside the universe — its absence is the
        // exact hole the email leak lived in.
        expect(FILES.some((f) => f.includes(`${path.sep}lib${path.sep}`))).toBe(true)
    })

    it("walks the marketing and guides surfaces too (GROWTH-HOOKS-01 extension)", () => {
        // The B2C policy this guard enforces does not stop at the app shell:
        // the growth hooks put customer-facing renders under components/growth,
        // lib/growth and the public guides tree, and a universe that silently
        // lost any of them would pass while the score leaked from a marketing
        // page. Each path is asserted PRESENT, the same way lib/ was pinned
        // after the weekly-digest leak.
        for (const mustCover of [
            `app${path.sep}(public)${path.sep}guides`,
            `components${path.sep}landing${path.sep}`,
            `components${path.sep}growth${path.sep}HookTicker.tsx`,
            `lib${path.sep}growth${path.sep}hooks.ts`,
        ]) {
            expect(
                FILES.some((f) => f.includes(mustCover)),
                `universe lost the marketing/guides path: ${mustCover}`
            ).toBe(true)
        }
    })

    it("has no sanctioned surfaces left, and never regrows them silently", () => {
        expect(SANCTIONED.size).toBe(0)
    })

    it("the relationship index has no sanctioned render site left (Goal 3, D-C3)", () => {
        expect(RELATIONSHIP_HEALTH_RENDERS.size).toBe(0)
        for (const rel of RELATIONSHIP_HEALTH_RENDERS) {
            const src = readFileSync(path.join(ROOT, rel), "utf8")
            expect(src, `${rel} no longer renders healthScore — drop the exemption`).toMatch(/healthScore/)
            expect(src, `${rel} renders the protection score`).not.toMatch(/\{[^}\n]*\b(protectionScore|overallScore)\b[^}\n]*\}\s*</)
        }
    })

    it("no customer-facing file renders the score value — JSX or template literal", () => {
        const offenders = FILES.filter((f) => {
            const rel = path.relative(ROOT, f)
            if (SANCTIONED.has(rel)) return false
            if (RELATIONSHIP_HEALTH_RENDERS.has(rel)) return false
            return rendersScoreValue(readFileSync(f, "utf8"))
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

/**
 * The guard's own eyes, proven against committed probes. A guard whose matcher
 * was never shown red is not a guard (repo rule: "Guards must enumerate, not
 * assume" — and ship with a probe proven to turn them red).
 */
describe("the matcher itself is proven against committed probes", () => {
    const probe = (name: string) =>
        readFileSync(path.join(ROOT, "tests/fixtures/guard-probes", name), "utf8")

    it("flags the JSX render probe (the deleted ProtectionScoreCard's shape)", () => {
        expect(rendersScoreValue(probe("score-render-jsx.tsx.txt"))).toBe(true)
    })

    it("flags the email template probe (the weekly-digest leak's shape)", () => {
        expect(rendersScoreValue(probe("score-render-email.ts.txt"))).toBe(true)
    })

    it("flags the marketing-surface probe — a hook card quoting the score (GROWTH-HOOKS-01)", () => {
        expect(rendersScoreValue(probe("score-render-marketing.tsx.txt"))).toBe(true)
    })

    it("passes the internal-use probe — hashing and key paths are not renders", () => {
        expect(rendersScoreValue(probe("score-internal-use.ts.txt"))).toBe(false)
    })
})
