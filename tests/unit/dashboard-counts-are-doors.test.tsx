import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { render } from "@testing-library/react"
import { CoverageGapsWidget } from "@/components/dashboard/home/CoverageGapsWidget"
import { StatTile } from "@/components/ui/StatTile"

/**
 * B4 — dashboards become routers (PW-TRANSPARENCY-02).
 *
 * "Every rendered count navigates to the set it counts." Source-level over the
 * dashboard home cards and the agent KPI strip: the element that carries
 * `data-count` is itself a link (`<Link … data-count>`), or its key is on the
 * allow-list of counts nested inside a row link that the row itself carries.
 * Render-level for the two widgets whose props are simple. The browser metric
 * `countsWithoutNavigation` (tests/measure/metrics.ts) is the acceptance
 * measurement; this guard keeps a regression from reaching it.
 */
const FILES = [
    "components/dashboard/home/CoverageGapsWidget.tsx",
    "components/dashboard/home/ProtectionPrioritiesCard.tsx",
    "components/dashboard/home/ProtectionPlanCard.tsx",
    "components/dashboard/home/ProtectionStatusHero.tsx",
    "components/dashboard/home/RenewalsTimelineCard.tsx",
    "components/ui/StatTile.tsx",
]
/** Counts rendered INSIDE a link that wraps their whole row or header. */
const NESTED_IN_LINK: Record<string, string> = {
    "policy.renewalCheckpointCount": "the chip sits inside the row's <Link href=/wallet/{id}#dates>",
    "plan.stepsDone": "inside the plan header's <Link href=#protection-plan>",
    "plan.stepsTotal": "inside the same link",
}

function countAttributes(src: string): Array<{ key: string; onLink: boolean }> {
    const out: Array<{ key: string; onLink: boolean }> = []
    // Every JSX opening tag that carries data-count (single or multi-line).
    for (const m of src.matchAll(/<([A-Za-z][\w.]*)\b([^>]*?)data-count=(?:"([^"]+)"|\{([^}]+)\})/g)) {
        const tag = m[1]
        out.push({ key: m[3] ?? `{${m[4]}}`, onLink: tag === "Link" || tag === "a" || tag === "ActionLink" })
    }
    return out
}

describe("every rendered count is a door", () => {
    it("in source: the element carrying data-count is a link, or nests inside one for a stated reason", () => {
        const offenders: string[] = []
        for (const f of FILES) {
            for (const { key, onLink } of countAttributes(readFileSync(f, "utf8"))) {
                if (onLink) continue
                if (key.startsWith("{")) continue // a prop-driven key (StatTile) — checked by render below
                if (key in NESTED_IN_LINK) continue
                offenders.push(`${f}: ${key}`)
            }
        }
        expect(offenders).toEqual([])
    })

    it("CoverageGapsWidget: classified counts and the assessment denominators all sit inside a[href]", () => {
        const labels = {
            kicker: "k", noGaps: "none", noGapsAmongAssessedOne: "one", noGapsAmongAssessedMany: "{assessed} assessed",
            assessmentExcludedOne: "1 excluded", assessmentExcludedMany: "{excluded} excluded", noGapsNothingAssessed: "nothing",
            provenance: { legislative: "legal", contractual: "contractual", market: "market" },
            underReviewOmitted: "omitted", underReviewLink: "see", note: null, groupLabel: "g",
        }
        for (const counts of [
            { legislative: 1, contractual: 2, market: 0, underReview: 3 },
            { legislative: 0, contractual: 0, market: 0, underReview: 0 },
        ]) {
            const { container, unmount } = render(<CoverageGapsWidget counts={counts} assessment={{ assessedPolicies: 2, excludedPolicies: 3 }} labels={labels} />)
            const counted = Array.from(container.querySelectorAll("[data-count]"))
            expect(counted.length).toBeGreaterThan(0)
            for (const el of counted) expect(el.closest("a[href]"), `${el.getAttribute("data-count")} has no door`).not.toBeNull()
            unmount()
        }
    })

    it("StatTile: with href the whole tile is the door and the value carries the key; without href it renders no count key", () => {
        const withDoor = render(<StatTile label="Clients" value="12" href="/customers" countKey="agent.totalClients" />)
        const value = withDoor.container.querySelector('[data-count="agent.totalClients"]')
        expect(value).not.toBeNull()
        expect(value!.closest("a[href]")?.getAttribute("href")).toBe("/customers")
        withDoor.unmount()
        const plain = render(<StatTile label="Clients" value="12" />)
        expect(plain.container.querySelector("[data-count]")).toBeNull()
        expect(plain.container.querySelector("a")).toBeNull()
    })

    it("the agent KPI strip gives every tile a door and a registered key", () => {
        const src = readFileSync("components/agent/AgentKpiStrip.tsx", "utf8")
        const tiles = src.match(/<StatTile\b/g) ?? []
        const doors = src.match(/href="\//g) ?? []
        const keys = [...src.matchAll(/countKey="([^"]+)"/g)].map((m) => m[1])
        expect(tiles.length).toBeGreaterThanOrEqual(8)
        expect(doors.length).toBe(tiles.length)
        expect(keys.length).toBe(tiles.length)
        const registry = readFileSync("lib/instrumentation/count-keys.ts", "utf8")
        for (const key of keys) expect(registry, key).toContain(`"${key}"`)
    })

    it("the home orders renewals and the life-event prompt above the generated findings", () => {
        const home = readFileSync("app/(protected)/dashboard/PolicyholderHome.tsx", "utf8")
        const renewals = home.indexOf("<RenewalsTimelineCard")
        const life = home.indexOf("<LifeEventPromptCard")
        const attention = home.indexOf('id="attention"')
        expect(renewals).toBeGreaterThan(0)
        expect(renewals).toBeLessThan(attention)
        expect(life).toBeLessThan(attention)
        expect(renewals).toBeLessThan(life)
    })
})
