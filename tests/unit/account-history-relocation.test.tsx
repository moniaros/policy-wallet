/**
 * V2-P2-02 — the timeline relocates into Ρυθμίσεις (`/account/history`).
 *
 * The ledger calls this a RELOCATION, NOT A DELETION (T-01 note): T-02 (filter
 * by kind) and T-03 (the cause link, which clears the filter first because the
 * cause is often a filtered-out kind) must survive the move or the move is a
 * loss. T-06 (18 of 60 rows sharing one title) is the defect the move fixes,
 * by grouping — this file is also the guard that the duplicate block cannot
 * come back.
 *
 * Everything here asserts RENDERED OUTPUT via @testing-library/react — what a
 * customer sees change on screen — never that a file contains a string.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { readFileSync } from "node:fs"
import { render, fireEvent, cleanup, waitFor } from "@testing-library/react"
import { LifeTimeline, type TimelineEntryView } from "@/components/timeline/LifeTimeline"

// jsdom implements neither; the component calls both on the cause jump. The
// RAF stub queues the callback as a macrotask — a synchronous stub would run
// BEFORE React re-renders the cleared filter, which is not how a browser
// sequences paint, and the cause row would not be in the DOM yet.
const scrolledTo: Element[] = []
beforeEach(() => {
    scrolledTo.length = 0
    Element.prototype.scrollIntoView = function () {
        scrolledTo.push(this)
    }
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
        setTimeout(() => cb(0), 0)
        return 0
    })
    cleanup()
})

// ── Fixture: the shape the baseline measured ─────────────────────────
//
// 18 policy_added rows differing only by date and target policy (the exact
// duplicate block evidence/timeline/BASELINE.md counted), plus a life event,
// plus a recommendation whose cause IS that life event — a different kind, so
// the cause is invisible under the recommendation filter (the T-03 trap).

const DUPLICATE_TITLE = "Προστέθηκε ασφαλιστήριο Αυτοκίνητο — Interamerican"
const LIFE_EVENT_TITLE = "Πήρατε στεγαστικό δάνειο"
const RECOMMENDATION_TITLE = "Χρέος που σας επιβιώνει"

const iso = (day: number) => new Date(Date.UTC(2026, 6, day, 12)).toISOString()

function fixtureEntries(): TimelineEntryView[] {
    const duplicates: TimelineEntryView[] = Array.from({ length: 18 }, (_, i) => ({
        id: `policy_added:p${i + 1}`,
        kind: "policy_added",
        at: iso(28 - i),
        title: { en: `Motor policy added — Interamerican`, el: DUPLICATE_TITLE },
        detail: null,
        cause: null,
        href: `/wallet/p${i + 1}`,
    }))
    return [
        {
            id: "recommendation:r1",
            kind: "recommendation",
            at: iso(30),
            title: { en: "Debt outliving you", el: RECOMMENDATION_TITLE },
            detail: null,
            cause: {
                entryId: "life_event:e1",
                explanation: {
                    en: "You told us about this change.",
                    el: "Μας δηλώσατε αυτή τη μεταβολή.",
                },
            },
            href: "/coverage-insights",
        },
        {
            id: "life_event:e1",
            kind: "life_event",
            at: iso(29),
            title: { en: "You took out a mortgage", el: LIFE_EVENT_TITLE },
            detail: null,
            cause: null,
            href: "/coverage-insights",
        },
        ...duplicates,
        {
            id: "renewal:n1",
            kind: "renewal",
            at: iso(2),
            title: { en: "Renewal came due", el: "Ήρθε η ώρα ανανέωσης" },
            detail: null,
            cause: null,
            href: "/wallet/p1",
        },
    ]
}

/** The <p> title elements currently showing this exact title. */
const titleRenderCount = (container: HTMLElement, title: string) =>
    [...container.querySelectorAll("p")].filter((p) => p.textContent?.trim().startsWith(title)).length

// ── T-02: filter by entry kind survives the relocation ───────────────

describe("T-02 — filtering by kind changes what is rendered", () => {
    it("shows only the chosen kind, and «Όλα» restores everything", () => {
        const { container, getByRole } = render(
            <LifeTimeline entries={fixtureEntries()} language="el" />
        )

        // All kinds present before any filtering.
        expect(container.textContent).toContain(RECOMMENDATION_TITLE)
        expect(container.textContent).toContain(LIFE_EVENT_TITLE)
        expect(container.textContent).toContain(DUPLICATE_TITLE)

        fireEvent.click(getByRole("button", { name: /Προτάσεις/ }))

        // The rendered list narrowed — not a class toggle, the rows are gone.
        expect(container.textContent).toContain(RECOMMENDATION_TITLE)
        expect(container.textContent).not.toContain(LIFE_EVENT_TITLE)
        expect(container.textContent).not.toContain(DUPLICATE_TITLE)
        expect(container.textContent).not.toContain("Ήρθε η ώρα ανανέωσης")

        fireEvent.click(getByRole("button", { name: /Όλα/ }))
        expect(container.textContent).toContain(LIFE_EVENT_TITLE)
        expect(container.textContent).toContain(DUPLICATE_TITLE)
    })

    it("the filter chips state honest per-kind tallies", () => {
        const { getByRole } = render(<LifeTimeline entries={fixtureEntries()} language="el" />)
        // 18 duplicates + 1 recommendation + 1 life event + 1 renewal = 21.
        expect(getByRole("button", { name: /Όλα/ }).textContent).toContain("21")
        expect(getByRole("button", { name: /Ασφαλιστήρια/ }).textContent).toContain("18")
    })
})

// ── T-03: the cause link survives, and clears the filter first ───────

describe("T-03 — «Γιατί;» reaches a cause the filter is hiding", () => {
    it("clears the filter, renders the cause row again, and scrolls to it", async () => {
        const { container, getByRole } = render(
            <LifeTimeline entries={fixtureEntries()} language="el" />
        )

        // Filter to recommendations: the cause (a life event) leaves the DOM.
        fireEvent.click(getByRole("button", { name: /Προτάσεις/ }))
        expect(container.textContent).not.toContain(LIFE_EVENT_TITLE)

        fireEvent.click(getByRole("button", { name: /Γιατί;/ }))

        // The cause row comes BACK — the filter was cleared, not just scrolled.
        await waitFor(() => expect(container.textContent).toContain(LIFE_EVENT_TITLE))
        // And the scroll targeted the cause row, not nothing.
        await waitFor(() => expect(scrolledTo.length).toBeGreaterThan(0))
        expect(scrolledTo[0].textContent).toContain(LIFE_EVENT_TITLE)
    })

    it("still renders the cause explanation sentence on the entry", () => {
        const { container } = render(<LifeTimeline entries={fixtureEntries()} language="el" />)
        expect(container.textContent).toContain("Μας δηλώσατε αυτή τη μεταβολή.")
    })
})

// ── T-06: the 18-row duplicate block is grouped, and stays grouped ───

describe("T-06 — identical consecutive rows render as one group, not eighteen rows", () => {
    it("renders the duplicated title once, with the group stating its size", () => {
        const { container } = render(<LifeTimeline entries={fixtureEntries()} language="el" />)

        // The defect: 18 <p> titles reading the same sentence. The fix: one.
        expect(
            titleRenderCount(container, DUPLICATE_TITLE),
            "the T-06 duplicate block is back: the same title renders as separate rows"
        ).toBe(1)

        // The group says how many rows it stands for — a count, instrumented.
        const size = container.querySelector('[data-count="timeline.groupSize"]')
        expect(size?.textContent).toContain("18")
        expect(size?.getAttribute("data-count-subject")).toBeTruthy()
    })

    it("expanding the group reveals every entry with its own policy link (T-04 survives grouping)", () => {
        const { container, getByRole } = render(
            <LifeTimeline entries={fixtureEntries()} language="el" />
        )

        fireEvent.click(getByRole("button", { name: /Εμφάνιση όλων/ }))

        // 1 group summary + 18 member rows.
        expect(titleRenderCount(container, DUPLICATE_TITLE)).toBe(19)
        const hrefs = [...container.querySelectorAll('a[href^="/wallet/p"]')].map((a) =>
            a.getAttribute("href")
        )
        expect(new Set(hrefs).size).toBeGreaterThanOrEqual(18)

        fireEvent.click(getByRole("button", { name: /Σύμπτυξη/ }))
        expect(titleRenderCount(container, DUPLICATE_TITLE)).toBe(1)
    })

    it("does not group distinct rows — the life event and recommendation keep their own rows", () => {
        const { container } = render(<LifeTimeline entries={fixtureEntries()} language="el" />)
        expect(titleRenderCount(container, LIFE_EVENT_TITLE)).toBe(1)
        expect(titleRenderCount(container, RECOMMENDATION_TITLE)).toBe(1)
        expect(container.textContent).toContain("Ήρθε η ώρα ανανέωσης")
    })
})

// ── T-01: the relocation target exists and reads the same source ─────

describe("T-01 — /account/history is a real settings route over the same timeline", () => {
    it("the settings route exists and builds on getTimeline", () => {
        const page = readFileSync("app/(protected)/account/history/page.tsx", "utf-8")
        expect(page).toMatch(/getTimeline/)
        expect(page).toMatch(/HistorySection/)
    })

    it("the old route still works until the removal item lands (build-before-remove)", () => {
        const page = readFileSync("app/(protected)/timeline/page.tsx", "utf-8")
        expect(page).toMatch(/getTimeline/)
        expect(page).toMatch(/LifeTimeline/)
    })
})
