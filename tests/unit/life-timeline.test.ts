import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import {
    diffVersions,
    explainScoreChange,
    parseRisks,
    triggerLabel,
    type VersionRow,
} from "@/lib/services/timeline/diff"
import {
    attributeRecommendationCause,
    buildTimeline,
    type TimelineSources,
} from "@/lib/services/timeline/build"
import { TIMELINE_KINDS } from "@/lib/services/timeline/types"

/**
 * Guards for the Personal Life Timeline.
 *
 * The timeline exists to answer two questions the product could previously only
 * answer with "the engine decided": **why is this recommendation on my screen**
 * and **why did my score move**. Both are claims about the customer's life, so
 * the tests concentrate on the claims rather than on the rendering — a timeline
 * that lists correctly and explains wrongly is worse than no timeline.
 */

const risk = (riskId: string, status: string, over: Record<string, unknown> = {}) => ({
    riskId,
    lineOfBusiness: "home",
    status,
    priority: "high",
    confidence: "high",
    coveredBy: [] as string[],
    ...over,
})

const version = (over: Partial<VersionRow> = {}): VersionRow => ({
    version: 1,
    computedAt: new Date("2026-06-01"),
    trigger: "cron",
    lifeEventId: null,
    overallScore: 50,
    indeterminate: false,
    openFindingCount: 0,
    risks: [],
    ...over,
})

describe("what the timeline can and cannot show", () => {
    it("has no entry kind without a source behind it", () => {
        // Claims are listed by the mission that specified this timeline and are
        // not modelled anywhere in this product — no table, no thread category.
        // An entry kind nothing can produce is an unreachable state, not a
        // placeholder, so it is deliberately absent.
        expect(TIMELINE_KINDS as readonly string[]).not.toContain("claim")

        const service = readFileSync("lib/services/timeline/service.ts", "utf-8")
        for (const kind of TIMELINE_KINDS) {
            // Each kind must be produced by the builder from a real query.
            const build = readFileSync("lib/services/timeline/build.ts", "utf-8")
            expect(build, `${kind} is never produced`).toContain(`kind: "${kind}"`)
        }
        expect(service).toMatch(/lifeEventInstance|policy\.findMany/)
    })
})

describe("the causal chain reaches every surface that shows a recommendation", () => {
    it("is attached by the engine, not only by the timeline", () => {
        // "Every recommendation must reference the event that caused it" is not
        // satisfied by a separate page that happens to know: the card itself
        // has to carry it, on every surface that renders one.
        const engine = readFileSync("lib/services/gap-engine/index.ts", "utf-8")
        expect(engine).toMatch(/attributeRecommendationCause\(/)
        expect(engine).toMatch(/cause: cause \?/)

        const card = readFileSync("components/coverage/RecommendationCards.tsx", "utf-8")
        expect(card).toMatch(/rec\.cause &&/)
        expect(card).toMatch(/Why you are seeing this/)
        // And it links back to where the cause sits in context — the activity
        // history inside Ρυθμίσεις since V2-P2-02/03 relocated and removed
        // /timeline.
        expect(card).toMatch(/href="\/account\/history"/)
    })

    it("reaches the wallet and branch pages too", () => {
        // Both read through the enriched entry point, which is what attaches
        // the cause — a card that silently lost it on two of three surfaces is
        // the drift this guard exists to stop.
        for (const page of [
            "app/(protected)/wallet/[id]/page.tsx",
            // The branch detail was extracted from app/(protected)/branches/[branch]/
            // page.tsx in V2-P2-01; BOTH mounts (/branches/[branch] and
            // /protection/[branch]) render through this component.
            "components/branches/BranchDetail.tsx",
        ]) {
            expect(readFileSync(page, "utf-8")).toMatch(/getEnrichedRecommendations/)
        }
    })

    it("is reachable from the settings map", () => {
        // §4.2 deliberately removed the menu slot (T-01: activity history is a
        // thing you consult about your account, not a destination). Reachability
        // now flows through the settings registry, which the rail, the mobile
        // index and settings-ia.test.ts all render from — so this is the single
        // source that keeps the surface findable.
        const sections = readFileSync("lib/settings/sections.ts", "utf-8")
        expect(sections).toMatch(/href: "\/account\/history"/)
    })
})

describe("the timeline is mobile-first and accessible", () => {
    const UI = readFileSync("components/timeline/LifeTimeline.tsx", "utf-8")

    it("never lays out two columns", () => {
        // The conventional desktop timeline alternates left and right, halving
        // the usable width — for Greek text already ~30% longer than English.
        const gridCols = [...UI.matchAll(/\bgrid-cols-(\d+)\b/g)].map((m) => Number(m[1]))
        expect(gridCols.filter((n) => n > 1)).toEqual([])
    })

    it("keeps the kind filter in a scrollable strip", () => {
        // Eight kind chips wrap to four lines at 320px.
        expect(UI).toMatch(/overflow-x-auto/)
        expect(UI).toMatch(/whitespace-nowrap/)
    })

    it("holds the WCAG 2.5.8 touch floor on every control", () => {
        // Scanned by chunk rather than by matching the opening tag: a lazy
        // `<button…>` match stops at the first `>`, which in JSX is usually the
        // one inside `onClick={() => …}`, long before the className.
        const chunks = UI.split(/<button\b/).slice(1)
        expect(chunks.length).toBeGreaterThan(0)
        for (const chunk of chunks) {
            const openingTag = chunk.slice(0, chunk.indexOf(">\n") + 1 || 600)
            expect(openingTag, `control without a tap floor:\n${openingTag.slice(0, 160)}`).toMatch(
                /min-h-11/
            )
        }
    })

    it("uses a real time element rather than a formatted string alone", () => {
        expect(UI).toMatch(/<time dateTime=/)
    })

    it("marks the decorative rail and icons hidden from assistive tech", () => {
        // The <ol> already conveys sequence; a described rail is pure noise.
        const rail = UI.slice(UI.indexOf("The rail."), UI.indexOf("The rail.") + 400)
        expect(rail).toMatch(/aria-hidden="true"/)
    })

    it("lets long Greek titles wrap rather than widening the page", () => {
        expect(UI).toMatch(/overflow-wrap:anywhere/)
    })

    it("clears the filter before scrolling to a cause", () => {
        // The cause is very often a kind the reader filtered out — that is
        // exactly why they could not see the connection — and scrolling to an
        // element that is not in the DOM does nothing, which reads as broken.
        const showCause = UI.slice(UI.indexOf("const showCause"), UI.indexOf("const showCause") + 500)
        expect(showCause).toMatch(/setFilter\("all"\)/)
        expect(showCause).toMatch(/scrollIntoView/)
    })

    it("adds no fixed width that could overflow a 320px viewport", () => {
        const widths = [...UI.matchAll(/\bw-\[(\d+)px\]/g)].map((m) => Number(m[1]))
        expect(widths.filter((w) => w > 280)).toEqual([])
    })
})

/** Minimal sources, for tests outside the assembled-timeline block. */
const sourcesFor = (over: Partial<TimelineSources> = {}): TimelineSources => ({
    lifeEvents: [],
    policies: [],
    renewals: [],
    recommendations: [],
    advisorActions: [],
    versions: [],
    ...over,
})

describe("diffing two versions says what actually moved", () => {
    it("says nothing about the first assessment", () => {
        // A new customer's first assessment is not a list of things that just
        // happened to them; reporting it that way makes their timeline read
        // like a catastrophe on day one.
        const first = version({ risks: [risk("a", "protection_gap"), risk("b", "protection_gap")] })
        expect(diffVersions(null, first)).toEqual([])
    })

    it("reports a risk opening and closing", () => {
        const before = version({ version: 1, risks: [risk("a", "already_covered")] })
        const after = version({ version: 2, risks: [risk("a", "protection_gap")] })
        expect(diffVersions(before, after)).toEqual([
            { riskId: "a", lineOfBusiness: "home", kind: "opened" },
        ])
        expect(diffVersions(after, before)).toEqual([
            { riskId: "a", lineOfBusiness: "home", kind: "closed" },
        ])
    })

    it("reports cover starting and stopping", () => {
        const uncovered = version({ version: 1, risks: [risk("a", "protection_gap", { coveredBy: [] })] })
        const covered = version({ version: 2, risks: [risk("a", "already_covered", { coveredBy: ["home"] })] })
        const kinds = diffVersions(uncovered, covered).map((t) => t.kind)
        expect(kinds).toContain("cover_gained")
        expect(diffVersions(covered, uncovered).map((t) => t.kind)).toContain("cover_lost")
    })

    it("reports priority movement in the right direction", () => {
        const low = version({ version: 1, risks: [risk("a", "protection_gap", { priority: "low" })] })
        const critical = version({ version: 2, risks: [risk("a", "protection_gap", { priority: "critical" })] })
        expect(diffVersions(low, critical).map((t) => t.kind)).toContain("priority_up")
        expect(diffVersions(critical, low).map((t) => t.kind)).toContain("priority_down")
    })

    it("stays silent when a risk leaves the catalog", () => {
        // A risk disappearing from the snapshot is a catalog change on our side,
        // not something that happened to the customer.
        const before = version({ version: 1, risks: [risk("a", "protection_gap"), risk("gone", "protection_gap")] })
        const after = version({ version: 2, risks: [risk("a", "protection_gap")] })
        expect(diffVersions(before, after)).toEqual([])
    })

    it("reads a malformed snapshot without throwing", () => {
        // `risks` is a Json column, so it is whatever was written to it.
        expect(parseRisks(null)).toEqual([])
        expect(parseRisks("nonsense")).toEqual([])
        expect(parseRisks([{ nope: 1 }, null, 42])).toEqual([])
        expect(parseRisks([{ riskId: "a" }])).toHaveLength(1)
    })
})

describe("every score change explains itself", () => {
    it("names the movement, the trigger and what moved", () => {
        const before = version({ version: 1, overallScore: 70, risks: [risk("a", "already_covered")] })
        const after = version({
            version: 2,
            overallScore: 55,
            trigger: "life_event",
            risks: [risk("a", "protection_gap")],
        })
        const explanation = explainScoreChange(before, after, diffVersions(before, after))
        expect(explanation.en).toContain("fell 15 points")
        expect(explanation.en).toContain("told us about")
        expect(explanation.en).toContain("1 risk opened")
        expect(explanation.el).toContain("15")
        expect(explanation.el.length).toBeGreaterThan(20)
    })

    it("does not invent a movement against a score nobody saw", () => {
        // An indeterminate score was never shown as a number, so a delta
        // against it is a change that never happened.
        const before = version({ version: 1, overallScore: 0, indeterminate: true })
        const after = version({ version: 2, overallScore: 60 })
        const explanation = explainScoreChange(before, after, [])
        expect(explanation.en).not.toMatch(/rose|fell|\d+ points/)
        expect(explanation.en).toContain("too little")
    })

    it("explains the first assessment as a first assessment", () => {
        const explanation = explainScoreChange(null, version({ trigger: "policy_change" }), [])
        expect(explanation.en).toContain("first assessment")
        expect(explanation.el).toContain("πρώτη")
    })

    it("says what changed when the score held still", () => {
        // The fingerprint only writes a version on a material change, so a
        // zero delta means something moved that was not a status.
        const before = version({ version: 1, overallScore: 60, risks: [risk("a", "protection_gap")] })
        const after = version({ version: 2, overallScore: 60, risks: [risk("a", "protection_gap")] })
        const explanation = explainScoreChange(before, after, diffVersions(before, after))
        expect(explanation.en).toContain("did not move")
        expect(explanation.en).toMatch(/how much of your position/)
    })

    it("never prints a number that is not a score", () => {
        // `overallScore` is an Int column, but a non-finite value reaching the
        // page rendered "Protection score: NaN" against a real claim about the
        // customer's cover. Treated exactly like an indeterminate score.
        const broken = version({ version: 2, overallScore: Number.NaN })
        const explanation = explainScoreChange(version({ version: 1, overallScore: 50 }), broken, [])
        expect(explanation.en).not.toMatch(/NaN/)
        expect(explanation.el).not.toMatch(/NaN/)

        const entries = buildTimeline(
            sourcesFor({ versions: [version({ version: 1, overallScore: Number.NaN })] })
        )
        for (const entry of entries) {
            expect(entry.title.en).not.toMatch(/NaN/)
            expect(entry.title.el).not.toMatch(/NaN/)
        }
    })

    it("suppresses the delta badge whenever it suppresses the sentence", () => {
        // The badge renders the number directly, so a delta that survives while
        // the sentence beside it is suppressed prints "+NaN" next to "we know
        // too little to say". One predicate, three renderings.
        for (const broken of [{ overallScore: Number.NaN }, { indeterminate: true }]) {
            const entries = buildTimeline(
                sourcesFor({
                    versions: [
                        version({ version: 1, overallScore: 50 }),
                        version({ version: 2, computedAt: new Date("2026-06-02"), ...broken }),
                    ],
                })
            )
            for (const entry of entries) {
                if (typeof entry.delta === "number") expect(Number.isFinite(entry.delta)).toBe(true)
                expect(entry.title.en).not.toMatch(/NaN|Infinity/)
            }
        }
    })

    it("is bilingual for every trigger", () => {
        for (const trigger of ["life_event", "policy_change", "profile_update", "cron", "manual", "??"]) {
            const label = triggerLabel(trigger)
            expect(label.en.length).toBeGreaterThan(0)
            expect(label.el.length).toBeGreaterThan(0)
            const explanation = explainScoreChange(
                version({ version: 1, overallScore: 40 }),
                version({ version: 2, overallScore: 45, trigger }),
                []
            )
            expect(explanation.en).not.toMatch(/undefined|NaN/)
            expect(explanation.el).not.toMatch(/undefined|NaN/)
        }
    })
})

describe("every recommendation references what caused it", () => {
    const events = [
        { id: "e1", definitionId: "mortgage", occurredAt: new Date("2026-05-01") },
        { id: "e2", definitionId: "pet_adoption", occurredAt: new Date("2026-06-15") },
    ]

    it("points at the declared change that opened the risk", () => {
        const versions = [
            version({ version: 1, risks: [risk("life_debt", "not_applicable")] }),
            version({
                version: 2,
                computedAt: new Date("2026-05-01"),
                trigger: "life_event",
                lifeEventId: "e1",
                risks: [risk("life_debt", "protection_gap")],
            }),
        ]
        const cause = attributeRecommendationCause("life_debt", new Date("2026-05-02"), versions, events)
        expect(cause?.source).toBe("version_event")
        expect(cause?.lifeEventId).toBe("e1")
        expect(cause?.explanation.el).toContain("δηλώσατε")
    })

    it("names the trigger when nothing the customer declared caused it", () => {
        const versions = [
            version({ version: 1, risks: [risk("pet_costs", "not_applicable")] }),
            version({ version: 2, trigger: "policy_change", risks: [risk("pet_costs", "protection_gap")] }),
        ]
        const cause = attributeRecommendationCause("pet_costs", new Date("2026-07-01"), versions, events)
        expect(cause?.source).toBe("version_trigger")
        expect(cause?.lifeEventId).toBeNull()
        expect(cause?.explanation.en).toContain("wallet")
    })

    it("falls back to an exposing event when there is no version history", () => {
        // Every customer whose recommendations predate versioning. Weaker — we
        // did not watch it happen — and the wording does not claim we did.
        const cause = attributeRecommendationCause("pet_costs", new Date("2026-07-01"), [], events)
        expect(cause?.source).toBe("exposing_event")
        expect(cause?.lifeEventId).toBe("e2")
        expect(cause?.explanation.en).toMatch(/depends on a change you recorded/)
    })

    it("prefers the most recent opening when a risk opened twice", () => {
        // A lapsed policy closes a risk and reopens it. The LAST opening is the
        // one that explains today's recommendation.
        const versions = [
            version({ version: 1, risks: [risk("a", "protection_gap")] }),
            version({ version: 2, trigger: "policy_change", risks: [risk("a", "already_covered")] }),
            version({ version: 3, trigger: "life_event", lifeEventId: "e2", risks: [risk("a", "protection_gap")] }),
        ]
        const cause = attributeRecommendationCause("a", new Date("2026-08-01"), versions, events)
        expect(cause?.version).toBe(3)
        expect(cause?.lifeEventId).toBe("e2")
    })

    it("says nothing rather than guessing", () => {
        // A finding read out of a policy document was not caused by anything in
        // the customer's life, and an unrelated risk has no exposing event.
        expect(attributeRecommendationCause(null, new Date(), [], events)).toBeNull()
        expect(attributeRecommendationCause("unrelated_risk", new Date(), [], events)).toBeNull()
    })

    it("does not throw on a date it cannot read", () => {
        // This runs inside the page render; one unreadable timestamp must not
        // take the whole timeline.
        expect(
            attributeRecommendationCause("pet_costs", new Date("bad"), [], events)
        ).toBeNull()
        expect(
            attributeRecommendationCause(
                "pet_costs",
                new Date("2026-07-01"),
                [],
                [{ id: "x", definitionId: "pet_adoption", occurredAt: new Date("bad") }]
            )
        ).toBeNull()
    })

    it("never attributes to an event that happened after the finding", () => {
        const future = [{ id: "e3", definitionId: "pet_adoption", occurredAt: new Date("2027-01-01") }]
        expect(attributeRecommendationCause("pet_costs", new Date("2026-01-01"), [], future)).toBeNull()
    })
})

describe("the assembled timeline", () => {
    const sources = (over: Partial<TimelineSources> = {}): TimelineSources => ({
        lifeEvents: [{ id: "e1", definitionId: "mortgage", occurredAt: new Date("2026-05-01") }],
        policies: [
            {
                id: "p1",
                lineOfBusiness: "home",
                insurerName: "ΕΘΝΙΚΗ",
                createdAt: new Date("2026-04-01"),
                startDate: new Date("2026-04-01"),
                endDate: new Date("2027-04-01"),
                status: "active",
            },
        ],
        renewals: [],
        recommendations: [
            {
                id: "r1",
                riskId: "life_debt",
                lineOfBusiness: "life",
                title: { en: "Debt outliving you", el: "Χρέος που σας επιβιώνει" },
                createdAt: new Date("2026-05-02"),
                status: "active",
            },
        ],
        advisorActions: [],
        versions: [
            version({ version: 1, computedAt: new Date("2026-04-01"), risks: [risk("life_debt", "not_applicable")] }),
            version({
                version: 2,
                computedAt: new Date("2026-05-01"),
                trigger: "life_event",
                lifeEventId: "e1",
                overallScore: 40,
                risks: [risk("life_debt", "protection_gap")],
            }),
        ],
        ...over,
    })

    it("is ordered newest first, deterministically", () => {
        const entries = buildTimeline(sources())
        for (let i = 1; i < entries.length; i++) {
            expect(entries[i - 1].at.getTime()).toBeGreaterThanOrEqual(entries[i].at.getTime())
        }
        // Same input, same order — entries constantly share a timestamp (an
        // upload and the score change it caused), so the tiebreak has to be stable.
        expect(buildTimeline(sources()).map((e) => e.id)).toEqual(entries.map((e) => e.id))
    })

    it("gives every entry a stable, unique id", () => {
        const entries = buildTimeline(sources())
        const ids = entries.map((e) => e.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it("points a recommendation at an entry that is actually on the timeline", () => {
        // A cause the reader cannot scroll to is a broken button.
        const entries = buildTimeline(sources())
        const ids = new Set(entries.map((e) => e.id))
        for (const entry of entries) {
            if (entry.cause) {
                expect(ids.has(entry.cause.entryId), `${entry.id} points at a missing entry`).toBe(true)
            }
        }
        const rec = entries.find((e) => e.kind === "recommendation")!
        expect(rec.cause?.entryId).toBe("life_event:e1")
    })

    it("never points an entry at itself", () => {
        for (const entry of buildTimeline(sources())) {
            expect(entry.cause?.entryId).not.toBe(entry.id)
        }
    })

    it("carries both languages on every entry", () => {
        for (const entry of buildTimeline(sources())) {
            expect(entry.title.en.length, entry.id).toBeGreaterThan(0)
            expect(entry.title.el.length, entry.id).toBeGreaterThan(0)
            if (entry.detail) {
                expect(entry.detail.el.length).toBeGreaterThan(0)
                expect(entry.detail.en.length).toBeGreaterThan(0)
            }
            for (const text of [entry.title.en, entry.title.el, entry.detail?.en, entry.detail?.el]) {
                if (text) expect(text).not.toMatch(/undefined|NaN|\[object/)
            }
        }
    })

    it("survives every source being empty", () => {
        const empty = buildTimeline({
            lifeEvents: [],
            policies: [],
            renewals: [],
            recommendations: [],
            advisorActions: [],
            versions: [],
        })
        expect(empty).toEqual([])
    })

    it("does not let risk rows crowd out everything else", () => {
        // Twelve recalculations flipping eight risks each filled the entire
        // window with risk rows: the timeline built to explain recommendations
        // showed zero recommendations, zero life events and zero policies.
        const many = Array.from({ length: 12 }, (_, i) =>
            version({
                version: i + 1,
                computedAt: new Date(2026, 5, i + 1),
                trigger: "policy_change",
                risks: Array.from({ length: 8 }, (_, j) =>
                    risk(`risk${j}`, i % 2 === 0 ? "protection_gap" : "already_covered")
                ),
            })
        )
        const entries = buildTimeline(sources({ versions: many }), new Date("2026-08-05"))
        const window = entries.slice(0, 60)
        expect(window.some((e) => e.kind === "recommendation")).toBe(true)
        expect(window.some((e) => e.kind === "life_event")).toBe(true)
        expect(window.some((e) => e.kind === "policy_added")).toBe(true)

        // Capped per version, and nothing is lost: the score entry above each
        // group states the full counts.
        for (const v of many) {
            const rows = entries.filter((e) => e.id.startsWith(`risk_change:${v.version}:`))
            expect(rows.length).toBeLessThanOrEqual(3)
        }
        const score = entries.find((e) => e.kind === "score_change" && e.detail)!
        expect(score.detail!.en).toMatch(/\d+ risks? (opened|closed)/)
    })

    it("drops a cause whose entry is not on the page", () => {
        // The version says a life event triggered it, but that event is not in
        // the sources — so the link would scroll nowhere, which reads as a
        // broken control. A cause we cannot show is not a cause we can claim.
        const entries = buildTimeline(
            sources({
                lifeEvents: [],
                versions: [
                    version({ version: 1, computedAt: new Date("2026-04-01"), risks: [risk("life_debt", "not_applicable")] }),
                    version({
                        version: 2,
                        computedAt: new Date("2026-05-01"),
                        trigger: "life_event",
                        lifeEventId: "vanished",
                        risks: [risk("life_debt", "protection_gap")],
                    }),
                ],
            })
        )
        const ids = new Set(entries.map((e) => e.id))
        for (const entry of entries) {
            if (entry.cause) expect(ids.has(entry.cause.entryId)).toBe(true)
        }
    })

    it("does not place an entry it cannot date", () => {
        const entries = buildTimeline(
            sources({
                lifeEvents: [{ id: "bad", definitionId: "mortgage", occurredAt: new Date("nonsense") }],
            })
        )
        expect(entries.some((e) => e.id === "life_event:bad")).toBe(false)
        for (const entry of entries) expect(Number.isNaN(entry.at.getTime())).toBe(false)
    })

    it("emits one entry per risk transition even if a snapshot repeats a risk", () => {
        // `risks` is a Json column. A repeated risk produced two entries with
        // the same id — duplicate React keys — and made the score explanation
        // count one risk twice.
        const before = version({ version: 1, risks: [risk("a", "already_covered")] })
        const after = version({
            version: 2,
            risks: [risk("a", "protection_gap"), risk("a", "protection_gap")],
        })
        const transitions = diffVersions(before, after)
        expect(transitions.filter((t) => t.kind === "opened")).toHaveLength(1)
        expect(explainScoreChange(before, after, transitions).en).toContain("1 risk opened")
    })

    it("takes its clock from the caller", () => {
        // A hidden `Date.now()` makes "has this cover ended" untestable and
        // makes two renders a second apart able to disagree. Same rule the risk
        // graph follows.
        const src = readFileSync("lib/services/timeline/build.ts", "utf-8")
        expect(src).not.toMatch(/Date\.now\(\)/)

        const policy = {
            id: "p3",
            lineOfBusiness: "home",
            insurerName: null,
            createdAt: new Date("2026-01-01"),
            startDate: new Date("2026-01-01"),
            endDate: new Date("2026-06-01"),
            status: "active",
        }
        const before = buildTimeline(sources({ policies: [policy] }), new Date("2026-05-01"))
        const after = buildTimeline(sources({ policies: [policy] }), new Date("2026-07-01"))
        expect(before.some((e) => e.id === "coverage_change:p3:ended")).toBe(false)
        expect(after.some((e) => e.id === "coverage_change:p3:ended")).toBe(true)
    })

    it("walks the version history once, not once per recommendation", () => {
        const src = readFileSync("lib/services/timeline/build.ts", "utf-8")
        const build = src.slice(src.indexOf("export function buildTimeline"))
        expect(build).toMatch(/const openedAt = openingVersions\(versions\)/)
        expect(build).toMatch(/openedAt\)/)
    })

    it("does not report cover ending before it has ended", () => {
        const future = buildTimeline(
            sources({
                policies: [
                    {
                        id: "p2",
                        lineOfBusiness: "motor",
                        insurerName: null,
                        createdAt: new Date("2026-01-01"),
                        startDate: new Date("2026-01-01"),
                        endDate: new Date("2099-01-01"),
                        status: "active",
                    },
                ],
            })
        )
        expect(future.some((e) => e.id.startsWith("coverage_change:p2"))).toBe(false)
    })
})

describe("a policy's identity reaches the timeline only through the primitive", () => {
    // V2-P1-06: `insurerName` can hold an extraction sentinel on a healthy
    // active policy, and buildTimeline used to interpolate the raw column into
    // the policy_added title — /timeline rendered «Προστέθηκε ασφαλιστήριο
    // Αυτοκίνητο — __PENDING_EXTRACTION__» to a customer (evidence:
    // docs/transformation/evidence/timeline/BASELINE.md §2.6).
    const sourcesWith = (insurerName: string | null): TimelineSources => ({
        lifeEvents: [],
        renewals: [],
        recommendations: [],
        advisorActions: [],
        versions: [],
        policies: [
            {
                id: "p1",
                lineOfBusiness: "motor",
                insurerName,
                createdAt: new Date("2026-08-01"),
                startDate: new Date("2026-08-01"),
                endDate: new Date("2027-08-01"),
                status: "active",
            },
        ],
    })

    it.each(["__PENDING_EXTRACTION__", "Unknown Insurer", "AI Analyzing...", "Άγνωστος ασφαλιστής"])(
        "degrades %s to the branch label alone — no suffix, no sentinel",
        (sentinel) => {
            const entries = buildTimeline(sourcesWith(sentinel), new Date("2026-08-20"))
            const added = entries.find((e) => e.kind === "policy_added")
            expect(added).toBeDefined()
            // The title survives without the em-dash suffix…
            expect(added!.title.el).not.toContain("—")
            expect(added!.title.en).not.toContain("—")
            // …and the sentinel appears nowhere in any entry, either language.
            expect(JSON.stringify(entries)).not.toContain(sentinel)
        }
    )

    it("still names a real insurer, so the scrub is not a blanket delete", () => {
        const entries = buildTimeline(sourcesWith("Interamerican"), new Date("2026-08-20"))
        const added = entries.find((e) => e.kind === "policy_added")!
        expect(added.title.el).toContain("— Interamerican")
        expect(added.title.en).toContain("— Interamerican")
    })

    it("treats an empty insurer the way it always did — branch label alone", () => {
        const entries = buildTimeline(sourcesWith(null), new Date("2026-08-20"))
        const added = entries.find((e) => e.kind === "policy_added")!
        expect(added.title.el).not.toContain("—")
    })
})
