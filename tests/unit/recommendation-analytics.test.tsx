/**
 * Recommendation analytics on the dashboard (docs/planning/PERSONAL_RISK_PROFILE.md §J):
 * `recommendation_viewed {rule_id, area}` once per rule id per mount, and
 * `action_started {kind, area}` on the CTAs, with `kind` naming the CTA's
 * purpose. `trackJourneyEvent` is mocked; nothing here reaches an analytics
 * provider.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render } from "@testing-library/react"

const track = vi.hoisted(() => vi.fn())
vi.mock("@/lib/journey/funnel", () => ({ trackJourneyEvent: track }))

import { AttentionList, type AttentionItem } from "@/components/dashboard/home/AttentionList"
import { AdvisorSupportRow } from "@/components/dashboard/home/AdvisorSupportRow"
import { ActionLink, RecommendationSurface } from "@/components/dashboard/home/RecommendationAnalytics"

const labels = {
    kicker: "Χρειάζεται την προσοχή σας",
    viewAll: "Όλες",
    emptyTitle: "Τίποτα ανοιχτό",
    emptyBody: "Με βάση όσα έχουμε.",
    priorityNote: "Η προτεραιότητα δεν είναι κρίση.",
}

function item(over: Partial<AttentionItem> & { id: string; ruleId: string }): AttentionItem {
    return {
        title: `Εύρημα ${over.id}`,
        reason: null,
        urgency: "medium",
        urgencyLabel: "Μέτρια",
        timingLabel: null,
        ...over,
    }
}

const calls = (name: string) => track.mock.calls.filter((c) => c[0] === name).map((c) => c[1])

beforeEach(() => track.mockReset())

describe("recommendation_viewed", () => {
    it("emits once per rule id per mount — two findings from one rule are one view, a re-render adds nothing", () => {
        const items = [
            item({ id: "a", ruleId: "no-earthquake-cover", area: "residence" }),
            item({ id: "b", ruleId: "no-earthquake-cover", area: "residence" }),
            item({ id: "c", ruleId: "life_dependents", area: "household" }),
        ]
        const view = render(<AttentionList items={items} totalCount={3} language="el" labels={labels} />)
        expect(calls("recommendation_viewed")).toEqual([
            { rule_id: "no-earthquake-cover", area: "residence" },
            { rule_id: "life_dependents", area: "household" },
        ])

        view.rerender(<AttentionList items={[...items]} totalCount={3} language="el" labels={labels} />)
        expect(calls("recommendation_viewed")).toHaveLength(2)
    })

    it("emits nothing for the empty state", () => {
        render(<AttentionList items={[]} totalCount={0} language="el" labels={labels} />)
        expect(calls("recommendation_viewed")).toEqual([])
    })

    it("waits for the surface to be seen where IntersectionObserver exists, and then fires once", () => {
        let callback: ((entries: Array<{ isIntersecting: boolean }>) => void) | null = null
        const observe = vi.fn()
        const disconnect = vi.fn()
        class FakeObserver {
            constructor(cb: (entries: Array<{ isIntersecting: boolean }>) => void) {
                callback = cb
            }
            observe = observe
            disconnect = disconnect
            unobserve = vi.fn()
        }
        ;(globalThis as any).IntersectionObserver = FakeObserver
        try {
            render(
                <RecommendationSurface items={[{ ruleId: "r1", area: "mobility" }]}>
                    <p>row</p>
                </RecommendationSurface>
            )
            expect(observe).toHaveBeenCalledTimes(1)
            expect(calls("recommendation_viewed")).toEqual([])
            callback!([{ isIntersecting: false }])
            expect(calls("recommendation_viewed")).toEqual([])
            callback!([{ isIntersecting: true }])
            callback!([{ isIntersecting: true }])
            expect(calls("recommendation_viewed")).toEqual([{ rule_id: "r1", area: "mobility" }])
            expect(disconnect).toHaveBeenCalled()
        } finally {
            delete (globalThis as any).IntersectionObserver
        }
    })
})

describe("action_started", () => {
    afterEach(() => track.mockReset())

    it("a finding's row is review_finding, carrying the finding's area", () => {
        const { getAllByRole } = render(
            <AttentionList
                items={[item({ id: "a", ruleId: "no-earthquake-cover", area: "residence" })]}
                totalCount={1}
                language="el"
                labels={labels}
            />
        )
        const row = getAllByRole("link").find((a) => a.getAttribute("data-action-kind") === "review_finding")!
        expect(row.getAttribute("href")).toBe("/protection")
        fireEvent.click(row)
        expect(calls("action_started")).toEqual([{ kind: "review_finding", area: "residence" }])
    })

    it("the advisor card's one action is contact_advisor", () => {
        const { getAllByRole } = render(
            <AdvisorSupportRow
                agentConnected={false}
                labels={{ agentStatus: "Σύμβουλος", agentLine: "Χωρίς σύμβουλο", helpTitle: "Βοήθεια", helpOpen: "Άνοιγμα", cta: "Σύνδεση με σύμβουλο" }}
            />
        )
        const cta = getAllByRole("link").find((a) => a.getAttribute("href") === "/agent")!
        expect(cta.getAttribute("data-action-kind")).toBe("contact_advisor")
        fireEvent.click(cta)
        expect(calls("action_started")).toEqual([{ kind: "contact_advisor", area: undefined }])
        // The help row is not a recommendation action.
        expect(track).toHaveBeenCalledTimes(1)
    })

    it("still runs the caller's own onClick and stays a plain link", () => {
        const onClick = vi.fn()
        const { getByRole } = render(
            <ActionLink kind="check_first_policy" area="income" href="/wallet/add" onClick={onClick}>
                Προσθέστε
            </ActionLink>
        )
        const link = getByRole("link")
        expect(link.getAttribute("href")).toBe("/wallet/add")
        fireEvent.click(link)
        expect(onClick).toHaveBeenCalledTimes(1)
        expect(calls("action_started")).toEqual([{ kind: "check_first_policy", area: "income" }])
    })
})
