import { describe, it, expect } from "vitest"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { createHash } from "node:crypto"

import {
    describeSeverity,
    severityRank,
    toGapSeverity,
    SEVERITY_CAVEAT_KEY,
    SEVERITY_UNDERWRITER_VALIDATED,
    isSeverityValidated,
    describeSeverityForDefinition,
} from "@/lib/gaps/severity-display"
import { getTranslations } from "@/lib/i18n"
import { generateSavingsReportHtml } from "@/lib/services/reports/savings-report"
import { getWeeklyDigestEmail } from "@/lib/email/templates/weekly-digest"

/**
 * Gate 3b: severity is not a verdict, and no screen may imply it is.
 *
 * Severity became rule-derived in Phase 3a. The thresholds and labels are still
 * unvalidated by an underwriter, and the launch checklist has always said they
 * must never surface as authoritative. Before `lib/gaps/severity-display.ts`
 * there were ~10 independent severity→label/colour maps, so the caveat appeared
 * on three surfaces and was missing from the loudest ones.
 *
 * This file does two jobs: it pins the primitive's behaviour, and it stops the
 * bypass list growing.
 */

describe("the primitive", () => {
    it("pairs every severity with the caveat while Gate 3b is open", () => {
        expect(SEVERITY_UNDERWRITER_VALIDATED).toBe(false)
        for (const value of ["critical", "high", "medium", "low"]) {
            expect(describeSeverity(value).caveatKey, value).toBe(SEVERITY_CAVEAT_KEY)
        }
    })

    it("orders by seriousness", () => {
        expect(severityRank("critical")).toBeGreaterThan(severityRank("high"))
        expect(severityRank("high")).toBeGreaterThan(severityRank("medium"))
        expect(severityRank("medium")).toBeGreaterThan(severityRank("low"))
    })

    it("degrades unknown values to medium rather than throwing at render time", () => {
        // The column is a free String and has held AI-invented values.
        expect(toGapSeverity(null)).toBe("medium")
        expect(toGapSeverity("CRITICAL")).toBe("critical")
        expect(toGapSeverity("catastrophic")).toBe("medium")
    })

    it("exposes a tone, not a colour", () => {
        // A raw colour in the model layer is how ten copies of this map started.
        const description = describeSeverity("critical")
        expect(description.tone).toBe("urgent")
        expect(JSON.stringify(description)).not.toMatch(/#|bg-|text-red|rose-/)
    })
})

/**
 * Surfaces that still hand-roll severity presentation.
 *
 * This list is DEBT, not permission. Every entry is a place a person can see a
 * severity without the sentence that says what it is worth. It may shrink; a
 * new entry means a new screen implied a risk verdict the product cannot back.
 */
const KNOWN_BYPASSES = new Set([
    // Already shows the caveat (`recPriorityNote`) and still keeps its own colour
    // map, so migrating it is tidying, not a truth fix.
    "components/coverage/RecommendationCards.tsx",
    // MIGRATED 2026-08-23 (dashboard Goal 3): CoverageGapsWidget and
    // AttentionList now take order and tone from describeSeverity() and turn the
    // neutral tone into a class in ONE place (components/gaps/severity-tone.ts),
    // keyed by tone rather than by the severity words. Both dropped off this list.

    // These keep their own colour map AND print a severity WORD to a person, so
    // each now renders <SeverityCaveat /> — pinned by CAVEAT_REQUIRED below.
    // Migrating their colour maps to describeSeverity() is still outstanding, but
    // that is tidying; the truth fix is done.
    "components/agent/ActionQueueCard.tsx",
    "components/tasks/TasksClient.tsx",
    "components/coverage/InsightCard.tsx",
    // MIGRATED 2026-09-04 (B2B batch C): InsightsClient now takes tone and
    // label from describeSeverity() and keys its pill classes by TONE; it
    // stays in CAVEAT_REQUIRED because the pill still prints the word.

    // Already carried a caveat before this pass — the list used to claim otherwise.
    // CoverageInsightsClient renders `recPriorityNote`; ClientOverviewTab carries a
    // stronger, surface-specific one ("not an assessment of insurance adequacy").
    "components/coverage/CoverageInsightsClient.tsx",

    // Colour ONLY — no severity word reaches the reader. PolicyBriefCard's dot is
    // even aria-hidden. A disclaimer bolted to a coloured dot is noise, not honesty.
    "components/wallet/policy-detail/PolicyBriefCard.tsx",
    "components/wallet/PolicyReviewScreen.tsx",
])

/**
 * Surfaces that print a severity WORD ("Critical", «Κρίσιμο», a priority pill) and
 * must therefore say what that word is worth.
 *
 * Gate 3b — underwriter validation of the thresholds and labels — is NOT closable
 * by code, and is still open. Until it closes, a screen that names a severity
 * without this line is asserting a risk verdict the product cannot back.
 */
const CAVEAT_REQUIRED = [
    "components/agent/ActionQueueCard.tsx",
    "components/tasks/TasksClient.tsx",
    "components/coverage/InsightCard.tsx",
]

function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
        const full = join(dir, entry)
        if (entry === "node_modules" || entry === ".next") return []
        if (statSync(full).isDirectory()) return sourceFiles(full)
        return /\.tsx?$/.test(entry) ? [full] : []
    })
}

/**
 * The universe (D-005: the DIRECTORY a guard walks is part of the guard).
 *
 * Every root that ships runtime code — the same set the sentinel guard
 * enumerates (`app components lib scripts hooks contexts`). `lib/` was the
 * hole: this guard walked only components/ + app/, exactly how
 * `score-containment` once passed while the score went out by email, and it
 * hid four severity maps — a frozen engine file, an outbound email template,
 * a customer-downloadable report, and the i18n store.
 *
 * Deliberately excluded, with reasons:
 *   - tests/    — probe fixtures legitimately hand-roll the forbidden shapes;
 *   - prisma/, docs/, design-system/, evals/, public/ — not runtime .ts code
 *     (the encoding/i18n guards own those roots' concerns);
 *   - `/admin/` paths — the owner's own console, filtered below as before.
 */
const WALK_ROOTS = ["app", "components", "lib", "hooks", "contexts", "scripts"] as const

/** A map from severity words to presentation — the shape that multiplied. */
function handRollsSeverityPresentation(source: string): boolean {
    const hasAllFour = /\bcritical\b/.test(source) && /\bhigh\b/.test(source) && /\bmedium\b/.test(source) && /\blow\b/.test(source)
    if (!hasAllFour) return false
    // Presentation, not logic: a colour class or a label lookup keyed by them.
    return /(bg-|text-|border-)(red|rose|amber|orange|yellow|sky|blue|slate|gray)-\d{3}/.test(source)
}

/**
 * The second shape, which the Tailwind matcher above cannot see: an object
 * KEYED by the four severity words whose values are quoted strings or
 * localized-pair objects — a Greek label map (`critical: 'Κρίσιμο'`), an
 * {el,en} pair map, or a raw-hex dot map for an email (`critical: '#DC2626'`).
 * Emails and printable reports carry inline CSS, not utility classes, so every
 * severity map in `lib/` was invisible to the colour matcher.
 *
 * Values that are references (`critical: home.recPriorityCritical`) or numbers
 * (`critical: 0` — rank logic) deliberately do not fire: routing a key or
 * ordering a list presents nothing.
 */
function handRollsSeverityMap(source: string): boolean {
    const keyed = (word: string) => new RegExp(`\\b${word}\\s*:\\s*['"\`{]`).test(source)
    return keyed("critical") && keyed("high") && keyed("medium") && keyed("low")
}

/**
 * The i18n dictionaries are the STORE the primitive's labelKeys resolve into —
 * the words have to live somewhere, and a dictionary presents nothing by
 * itself. Exempt from the MAP matcher only; nothing excuses a colour class in
 * a translations file.
 *
 * D-022: an exemption must assert the property that makes it safe. "It is the
 * store" is asserted below — every labelKey and the caveat key must actually
 * resolve there, in both languages. The day the labels move out, the
 * exemption's test fails with them.
 */
const I18N_STORE = "lib/i18n/translations/"

// `lib/gap-detection.ts` used to be exempt BY IDENTITY while it was frozen for
// PW-MOBILE-TRANSFORM-02 and still carried two dead hand-rolled maps
// (getSeverityColor / getSeverityLabel). PW-TRANSPARENCY-02 B0.1 (Sept 2026)
// deleted them together with the legacy gap writer, so the freeze, its hash
// pin and its D-022 test are gone: no file is exempt by identity any more.

/**
 * The per-file decision, extracted so it can be probed with synthetic sources.
 *
 * It lived inline in the filter chain, and that is precisely why the hole in it
 * survived review: the walk had probes, both matchers had probes, and the
 * WIRING BETWEEN THEM had none. The old line was
 * `if (source.includes("severity-display")) return false` — a file left the
 * guard's universe by MENTIONING the primitive, in an import or even a comment.
 * Eight files were exempt that way, including the two most recently migrated,
 * so the guard was structurally unable to catch a regression in exactly the
 * files it had just fixed. Proven before the change: injecting a hand-rolled
 * {el,en} severity map into savings-report.ts, beside its live import, left the
 * guard green.
 */
export function isSeverityOffender(path: string, source: string, sha256: string): boolean {
    if (path.includes("/admin/")) return false
    // Only files that actually deal in gap/recommendation severity.
    if (!/gap|severity|urgency/i.test(source)) return false

    // Two files ARE the single source, and are exempt by PATH, not by content.
    if (path === "lib/gaps/severity-display.ts") return false
    // Its view-layer sibling: the one place a tone becomes a colour, keyed by
    // TONE and never by the severity words — the property that makes it safe,
    // asserted by its own test.
    if (path === "components/gaps/severity-tone.ts") return false

    // The COLOUR matcher cannot tell a severity colour from any other amber
    // pill in a file that happens to say "gap": AttentionList renders an
    // unconditional amber timingLabel chip two lines below a dot that correctly
    // goes through describeSeverity() + toneDotClass(). Flagging that would
    // teach people to add allowlist entries, which is how a debt list grows. So
    // a file is excused from the colour matcher only by PROOF that it routes
    // severity through the primitive — an actual call. A comment cannot satisfy
    // it, and it buys no exemption from the map matcher, which always applies:
    // nothing excuses hand-rolling critical/high/medium/low.
    const routesThroughPrimitive = /\bdescribeSeverity\s*\(/.test(source)

    const fires =
        (!routesThroughPrimitive && handRollsSeverityPresentation(source)) ||
        (!path.startsWith(I18N_STORE) && handRollsSeverityMap(source))
    if (!fires) return false

    return true
}

describe("no new hand-rolled severity presentation", () => {
    const walkedByRoot = new Map<string, string[]>(
        WALK_ROOTS.map((root) => [root, sourceFiles(root).map((p) => p.replace(/\\/g, "/"))])
    )
    const walked = [...walkedByRoot.values()].flat()

    const offenders = walked
        .filter((path) => {
            const buf = readFileSync(path)
            return isSeverityOffender(path, buf.toString("utf-8"), createHash("sha256").update(buf).digest("hex"))
        })
        .filter((path) => !KNOWN_BYPASSES.has(path))
        .sort()

    // The walk and the matchers are the whole guard. If either silently returned
    // nothing — a moved directory, a renamed class convention — `offenders`
    // would be empty and this file would report success while checking nothing.
    // That is the failure mode a guard cannot self-report, so it is asserted.
    const severityRelated = walked.filter((p) => /gap|severity|urgency/i.test(readFileSync(p, "utf-8")))

    it("the walk and the pre-filter both find files (the scan is not vacuous)", () => {
        expect(walked.length, "sourceFiles() found nothing — did a directory move?").toBeGreaterThan(200)
        expect(
            severityRelated.length,
            "no file mentions gap/severity/urgency — the pre-filter is now excluding everything"
        ).toBeGreaterThan(10)
    })

    it("every root yields files, and lib/ — the D-005 hole — is walked in force", () => {
        for (const [root, files] of walkedByRoot) {
            expect(files.length, `sourceFiles("${root}") found nothing — did the directory move?`).toBeGreaterThan(0)
        }
        expect(
            walkedByRoot.get("lib")!.length,
            "lib/ was THE universe hole this guard was extended to close — it cannot shrink to a stub"
        ).toBeGreaterThan(100)
        // The walk must reach the two files this guard is ABOUT. If either is
        // absent, the walk is not looking where it claims to.
        expect(walked).toContain("lib/gaps/severity-display.ts")
        expect(walked).toContain("lib/gap-detection.ts")
        expect(walked).toContain("lib/services/reports/savings-report.ts")
        // GROWTH-HOOKS-01: the marketing/guides surfaces are inside this
        // universe and must stay there — a hook card that colour-codes a
        // severity is exactly the hand-rolled verdict this guard exists to
        // stop, and marketing is where it would read most like authority.
        expect(walked).toContain("app/(public)/guides/GuidesIndexClient.tsx")
        expect(walked).toContain("components/growth/HookTicker.tsx")
        expect(walked).toContain("components/landing/HeroSlides.tsx")
        expect(walked).toContain("lib/growth/hooks.ts")
    })

    it("fires on a marketing-surface offender — a growth hook card with its own severity map (GROWTH-HOOKS-01)", () => {
        // The wiring probe for the marketing paths just pinned above: a
        // components/growth file that colour-codes gap severity must be an
        // offender under the SAME decision function the walk uses — no
        // marketing exemption exists or may ever be added.
        const probeSource = `
            const SEVERITY_STYLE = {
                critical: "bg-red-100 text-red-800",
                high: "bg-orange-100 text-orange-800",
                medium: "bg-amber-100 text-amber-800",
                low: "bg-slate-100 text-slate-800",
            }
            export function HookGapBadge({ gap }: { gap: { severity: string } }) {
                return <span className={SEVERITY_STYLE[gap.severity]}>{gap.severity}</span>
            }
        `
        expect(isSeverityOffender("components/growth/HookGapBadge.tsx", probeSource, "0".repeat(64))).toBe(true)
        // …and the compliant shape stays clean: routing through the primitive.
        const compliant = `
            import { describeSeverity } from "@/lib/gaps/severity-display"
            export function HookGapBadge({ gap }: { gap: { severity: string } }) {
                const d = describeSeverity(gap.severity)
                return <span data-tone={d.tone}>{d.labelKey}</span>
            }
        `
        expect(isSeverityOffender("components/growth/HookGapBadge.tsx", compliant, "0".repeat(64))).toBe(false)
    })

    it("the colour matcher fires on a hand-rolled map, and not on a compliant surface", () => {
        // A guard never shown to fail is not a guard. This is the shape that
        // multiplied: all four severity words plus a colour class keyed by them.
        const handRolled = `
            const TONE = {
                critical: "bg-red-100 text-red-800",
                high: "bg-orange-100 text-orange-800",
                medium: "bg-amber-100 text-amber-800",
                low: "bg-slate-100 text-slate-800",
            }
        `
        expect(handRollsSeverityPresentation(handRolled)).toBe(true)

        // Names the words but presents nothing — logic, not a colour map.
        const logicOnly = `
            const ORDER = ["critical", "high", "medium", "low"] as const
            export const worst = (a: string, b: string) => (ORDER.indexOf(a as any) < ORDER.indexOf(b as any) ? a : b)
        `
        expect(handRollsSeverityPresentation(logicOnly)).toBe(false)

        // Presents colour but is not about severity at all.
        const unrelated = `const BADGE = "bg-blue-100 text-blue-800"`
        expect(handRollsSeverityPresentation(unrelated)).toBe(false)
    })

    it("the map matcher fires on label, pair and hex maps — not on rank logic or key routing", () => {
        // The three shapes found in lib/ the day the walk was extended:
        // a Greek label map (gap-detection.ts:570)…
        const labelMap = `const LABELS = { critical: 'Κρίσιμο', high: 'Υψηλό', medium: 'Μέτριο', low: 'Χαμηλό' }`
        expect(handRollsSeverityMap(labelMap)).toBe(true)
        // …a localized-pair map (savings-report.ts)…
        const pairMap = `const L = { critical: { el: "Κρίσιμο", en: "Critical" }, high: { el: "Υψηλό", en: "High" }, medium: { el: "Μεσαίο", en: "Medium" }, low: { el: "Χαμηλό", en: "Low" } }`
        expect(handRollsSeverityMap(pairMap)).toBe(true)
        // …and a raw-hex dot map for an email (weekly-digest.ts).
        const hexMap = `const DOT = { critical: '#DC2626', high: '#EA580C', medium: '#D97706', low: '#6B7280' }`
        expect(handRollsSeverityMap(hexMap)).toBe(true)

        // Rank/order logic presents nothing.
        const rank = `const RANK = { critical: 0, high: 1, medium: 2, low: 3 }`
        expect(handRollsSeverityMap(rank)).toBe(false)
        // Values that are references are routing — the words come from elsewhere.
        const routed = `const L = { critical: home.recPriorityCritical, high: home.recPriorityHigh, medium: home.recPriorityMedium, low: home.recPriorityLow }`
        expect(handRollsSeverityMap(routed)).toBe(false)
    })

    it("every severity surface goes through the primitive, or is listed as debt", () => {
        expect(
            offenders,
            "These render a gap severity with their own label/colour/hex map. Use " +
                "describeSeverity() from lib/gaps/severity-display.ts and render its " +
                "caveatKey, or add the file to KNOWN_BYPASSES with a reason:\n  " +
                `${offenders.join("\n  ")}`
        ).toEqual([])
    })

    it("the debt list does not silently grow", () => {
        // A ceiling, so the list can only shrink without someone noticing. Drop
        // it as surfaces migrate; never raise it to make a new screen pass.
        expect(KNOWN_BYPASSES.size).toBeLessThanOrEqual(8)
    })

    it("the i18n-store exemption asserts its own precondition: the labels really live there", () => {
        // lib/i18n/translations/ is exempt from the map matcher because it is
        // the store describeSeverity()'s labelKeys resolve into. Assert that:
        // if the labels or the caveat stop resolving, the exemption is a hole
        // and this fails with it. (Also the only place a labelKey typo would
        // surface before a customer saw the raw key rendered as text.)
        for (const lang of ["el", "en"] as const) {
            const t = getTranslations(lang)
            const resolve = (key: string) => key.split(".").reduce((node: any, part) => node?.[part], t)
            for (const severity of ["critical", "high", "medium", "low"]) {
                const { labelKey } = describeSeverity(severity)
                expect(typeof resolve(labelKey), `${lang}: ${labelKey} must resolve in the store`).toBe("string")
                expect((resolve(labelKey) as string).length).toBeGreaterThan(0)
            }
            expect(
                typeof resolve(SEVERITY_CAVEAT_KEY),
                `${lang}: the caveat key must resolve in the store`
            ).toBe("string")
            // Non-empty, not merely a string. `toContain("")` is true of every
            // document, so an empty caveat would make the report and digest
            // assertions above pass while rendering no caveat at all — the
            // labelKey loop guards this one line up, and the caveat needs it
            // more, because it is the sentence Gate 3b actually requires.
            expect(
                (resolve(SEVERITY_CAVEAT_KEY) as string).length,
                `${lang}: an empty caveat renders nothing and passes toContain()`
            ).toBeGreaterThan(0)
        }
    })

    it("lib/gap-detection.ts carries no hand-rolled severity presentation (the two dead maps are gone)", () => {
        const source = readFileSync("lib/gap-detection.ts", "utf-8")
        expect(source).not.toMatch(/export function getSeverityColor/)
        expect(source).not.toMatch(/export function getSeverityLabel/)
        expect(handRollsSeverityPresentation(source)).toBe(false)
    })

    it("every surface that names a severity says what the word is worth", () => {
        const silent = CAVEAT_REQUIRED.filter((path) => {
            const source = readFileSync(join(process.cwd(), path), "utf-8")
            return !/<SeverityCaveat\b/.test(source)
        }).sort()

        expect(
            silent,
            "These print a severity word to a person while Gate 3b (underwriter " +
                "validation of the thresholds and labels) is still open. Render " +
                "<SeverityCaveat /> from components/gaps/SeverityCaveat.tsx:\n  " +
                `${silent.join("\n  ")}`
        ).toEqual([])
    })

    it("per-definition validation drops the caveat for that rule only", () => {
        // Gate 3b arrives a branch at a time. A global boolean could only say
        // "none of it" or "all of it", so the honest setting was "none" forever —
        // and every screen kept apologising for rules that may have been fine.
        const unvalidated = describeSeverityForDefinition("high", { severityValidatedAt: null })
        expect(unvalidated.caveatKey).toBe(SEVERITY_CAVEAT_KEY)

        const validated = describeSeverityForDefinition("high", {
            severityValidatedAt: new Date("2026-09-01"),
        })
        expect(validated.caveatKey).toBeNull()
        // Everything else about the presentation is unchanged — validation is a
        // statement about the THRESHOLD, not a licence to restyle the label.
        expect(validated.severity).toBe(unvalidated.severity)
        expect(validated.labelKey).toBe(unvalidated.labelKey)
        expect(validated.rank).toBe(unvalidated.rank)
    })

    it("fails safe: no definition, or a definition it cannot read, still gets the caveat", () => {
        expect(isSeverityValidated(null)).toBe(false)
        expect(isSeverityValidated(undefined)).toBe(false)
        expect(isSeverityValidated({})).toBe(false)
        expect(describeSeverityForDefinition("critical", null).caveatKey).toBe(SEVERITY_CAVEAT_KEY)
    })

    it("the caveat disappears the day an underwriter signs off, everywhere at once", () => {
        // The reason this is one component and not four pasted <p> tags: sign-off
        // must be a one-line change, or it will be done unevenly and some screen
        // will keep apologising for a scale that no longer needs it.
        const caveat = readFileSync(
            join(process.cwd(), "components/gaps/SeverityCaveat.tsx"),
            "utf-8"
        )
        expect(caveat).toMatch(/if \(SEVERITY_UNDERWRITER_VALIDATED\) return null/)
        expect(
            SEVERITY_UNDERWRITER_VALIDATED,
            "Gate 3b is a HUMAN gate. If this is now true, an underwriter must have " +
                "signed off on the thresholds AND the labels — not a developer."
        ).toBe(false)
    })
})

/**
 * The two customer-facing severity surfaces the extended walk found in `lib/`.
 * Neither can render <SeverityCaveat /> (one is print-ready HTML, one is an
 * email), so the truth fix is asserted on their RENDERED OUTPUT, not on their
 * source text — an assertion on the source could pass while the output lied.
 */
describe("lib severity surfaces carry the truth fix in their rendered output", () => {
    it("the savings/branded report prints no severity word and omits findings still under provenance review (B1/B3)", () => {
        // A Pro customer downloads this; an agent hands the branded variant to a
        // client. It is exactly the "printable report with a red CRITICAL badge"
        // the primitive's own doc comment names as a loudest-surface miss.
        for (const lang of ["el", "en"] as const) {
            const t = getTranslations(lang)
            const resolve = (key: string) =>
                key.split(".").reduce((node: any, part) => node?.[part], t) as string
            const html = generateSavingsReportHtml({}, "2026-08-25T00:00:00.000Z", lang, undefined, [
                { slug: "earthquake_cover", severity: "critical" },
            ])
            // The badge says what the primitive says («Κρίσιμη προτεραιότητα» /
            // "Critical priority"), not a local map's word…
            // B1: no severity word reaches the report. B3: a finding whose
            // provenance is still under review is omitted, and the report says so.
            expect(html, `${lang}: no severity word may reach the report`).not.toContain(
                resolve(describeSeverity("critical").labelKey)
            )
            expect(html).not.toContain("earthquake cover")
            expect(html).toContain(lang === "el" ? "υπό αξιολόγηση δεν περιλαμβάνονται" : "under review are not included")
        }
    })

    it("the weekly digest carries neither a severity word nor a severity colour (B1)", () => {
        const { html } = getWeeklyDigestEmail("el", "Owner", {
            renewingSoon: [],
            newGaps: 0,
            unreadMessages: 0,
            topRecommendations: [
                { title: "Recommendation A", urgency: "critical", estimatedCostEur: null },
                // The urgency column is a free string; junk must normalise
                // through the primitive (→ medium/moderate), never fall to a
                // fifth colour invented at the call site.
                { title: "Recommendation B", urgency: "totally-invented", estimatedCostEur: null },
            ],
        })
        // Colour-only surface: no severity word may appear. A disclaimer bolted
        // to a coloured dot is noise, so the honest form is no word at all —
        // same policy as PolicyBriefCard's aria-hidden dot.
        expect(html).not.toMatch(/Κρίσιμ|Critical/i)
        // The dot's colour is keyed by describeSeverity().tone: urgent renders
        // the red dot, junk normalises to moderate amber — and the old
        // hand-rolled grey fallback is gone from the dot markup.
        // The renewal countdown keeps its day-based colours; the URGENCY dot is gone.
        expect(html).not.toMatch(/border-radius: 50%/)
        expect(html).toContain("Recommendation A")
        expect(html).toContain("Recommendation B")
    })
})

/**
 * PROBES FOR THE WIRING — the half that had none.
 *
 * `isSeverityOffender` is the seam between the walk and the matchers. Both
 * sides were probed; the join was not, and the join is where the hole was. Each
 * case below is a synthetic source, so these stay red-able forever rather than
 * depending on a real file keeping its current shape.
 */
describe("probe: the escape hatch excuses only what it should", () => {
    const NOT_FROZEN = "0".repeat(64)
    const MAP = `
        const LABELS = {
            critical: { el: 'Κρίσιμο', en: 'Critical' },
            high: { el: 'Υψηλό', en: 'High' },
            medium: { el: 'Μεσαίο', en: 'Medium' },
            low: { el: 'Χαμηλό', en: 'Low' },
        }
    `

    it("catches a hand-rolled map beside a live import of the primitive", () => {
        // THE REGRESSION. The old filter returned false for any source
        // containing "severity-display", so this exact shape was invisible.
        const src = `import { describeSeverity } from "@/lib/gaps/severity-display"\n${MAP}\n// gap`
        expect(isSeverityOffender("lib/services/reports/savings-report.ts", src, NOT_FROZEN)).toBe(true)
    })

    it("a comment naming the primitive buys no exemption", () => {
        const src = `// severity-display — see the primitive\n${MAP}\n// gap severity`
        expect(isSeverityOffender("components/coverage/Whatever.tsx", src, NOT_FROZEN)).toBe(true)
    })

    it("the primitive and its tone sibling are exempt by path, not by content", () => {
        expect(isSeverityOffender("lib/gaps/severity-display.ts", MAP + "// gap", NOT_FROZEN)).toBe(false)
        expect(isSeverityOffender("components/gaps/severity-tone.ts", MAP + "// gap", NOT_FROZEN)).toBe(false)
        // ...and the exemption is by that exact path. A neighbour gets nothing.
        expect(isSeverityOffender("components/gaps/severity-tone-2.ts", MAP + "// gap", NOT_FROZEN)).toBe(true)
    })

    it("does not flag AttentionList's shape: primitive-routed severity, unrelated amber", () => {
        // The false positive that would otherwise teach people to grow the
        // debt list — an unconditional amber chip for a TIMING label, two lines
        // below a dot that goes through the primitive.
        const src = `
            import { describeSeverity } from "@/lib/gaps/severity-display"
            import { toneDotClass } from "@/components/gaps/severity-tone"
            // urgency
            <span className={toneDotClass(describeSeverity(item.urgency).tone)} />
            <span className="bg-amber-50 text-amber-800">{item.timingLabel}</span>
        `
        expect(isSeverityOffender("components/dashboard/home/AttentionList.tsx", src, NOT_FROZEN)).toBe(false)
    })

    it("routing through the primitive still does not excuse a map", () => {
        // The colour matcher is excused by proof; the map matcher never is.
        const src = `describeSeverity(x)\n${MAP}\n// gap`
        expect(isSeverityOffender("components/anything/Card.tsx", src, NOT_FROZEN)).toBe(true)
    })

    it("the i18n store is excused from the map matcher and only that", () => {
        expect(isSeverityOffender("lib/i18n/translations/el.ts", MAP + "// gap", NOT_FROZEN)).toBe(false)
        const withColour = `${MAP}\n// gap\nconst c = "bg-rose-500 text-rose-700"`
        expect(isSeverityOffender("lib/i18n/translations/el.ts", withColour, NOT_FROZEN)).toBe(true)
    })
})
