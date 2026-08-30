import { describe, it, expect, vi } from "vitest"
import { render } from "@testing-library/react"
import { collectSections } from "../measure/section-collector"
import { HomeScreen } from "@/app/(protected)/home/HomeScreen"
import { toRenderableFinding, findingHash } from "@/lib/app/finding"
import type { HomeModel } from "@/lib/app/home-model"

vi.mock("@/lib/journey/funnel", () => ({ trackJourneyEvent: vi.fn() }))

/**
 * The home screen's landmark ceiling (D-036: dashboard ≤7, achieved 6) —
 * enforced on the CI path for the FIRST time here: no unit test guarded the
 * dashboard's count, only the Playwright baseline recorded it.
 */
const JSDOM_OPTS = { assumeVisible: true, boundedFallback: true }

const finding = toRenderableFinding({
    id: "gap:1", hash: findingHash("p1", "no_flood_cover", "no_flood_cover"), kind: "gap", tier: "now",
    object: { policyId: "p1", assetLabel: "Κατοικία · Κηφισιάς 12" },
    sentence: { key: "gap:no_flood_cover", params: { asset: "Κατοικία · Κηφισιάς 12" } },
    source: { documentId: "d1", documentLabel: "Ασφαλιστήριο κατοικίας · P-1", locator: { kind: "section", section: "coverages", found: false }, othersSearched: 2 },
    ruleId: "no_flood_cover",
})!

function model(over: Partial<HomeModel> = {}): HomeModel {
    return {
        lang: "el", tier: "pro", policyCount: 3,
        verdict: { counts: { covered: 2, gap: 1, review: 0 }, active: 3, expired: 0, quiet: false, nextExpiryDays: 40, nextExpiryPolicyId: "p2", nowCount: 1, notChecked: [], perPolicy: { p1: "gap", p2: "covered", p3: "covered" } },
        findings: [finding], now: { shown: [finding], overflow: 0 },
        money: { paidPerYear: 1234, protectsUpTo: { amount: 1_300_000, currency: "EUR", policyId: "p2", coverName: "Αστική ευθύνη" }, paidTwice: [] },
        map: [{ id: "home", label: "Κατοικία", state: "gap", count: 1 }, { id: "motor", label: "Αυτοκίνητο", state: "covered", count: 2 }, { id: "pet", label: "Κατοικίδιο", state: null, count: 0 }],
        household: [], lifeChips: [{ id: "marriage", href: "/life-event/marriage" }],
        nextExpiry: { policyId: "p2", assetLabel: "Αυτοκίνητο · ΙΚΖ-4821", days: 40 }, lastDid: null,
        notChecked: { gapDetection: false, notAnalysed: 0, failed: 0 },
        policies: [],
        lastCheckedAt: new Date(Date.now() - 2 * 3_600_000).toISOString(), watchedCount: 24, paidTwiceFirstAsset: null,
        ...over,
    }
}

describe("/ — the home screen", () => {
    it("renders at most 7 section landmarks, in the §8.1 order", () => {
        const { container } = render(<HomeScreen model={model()} />)
        const result = collectSections(JSDOM_OPTS)
        expect(result.count, result.ids.join(", ")).toBeLessThanOrEqual(7)
        const ids = [...container.querySelectorAll("section[id]")].map((s) => s.id)
        expect(ids).toEqual(["verdict", "now", "money", "life", "map", "household", "note"])
    })
    it("shows the finding sentence from the authored copy, its source line with the others searched, and never a percentage", () => {
        const { container } = render(<HomeScreen model={model()} />)
        expect(container.textContent).toContain("Στο Κατοικία · Κηφισιάς 12 δεν βρήκα κάλυψη πλημμύρας.")
        expect(container.textContent).toContain("Ασφαλιστήριο κατοικίας · P-1 · ενότητα καλύψεων — δεν αναφέρεται Έψαξα και στα άλλα 2 — πουθενά.")
        expect(container.textContent).not.toMatch(/%/)
        expect(container.textContent).toContain("2/3")
        // The map's covered cells carry counts (prototype texture, P1)
        expect(container.textContent).toContain("2 ενεργά")
        expect(container.textContent).toContain("έλεγξα ξανά")
    })
    it("the quiet variant says the §6 sentence and replaces the actions with the next expiry", () => {
        const { container } = render(<HomeScreen model={model({ findings: [], now: { shown: [], overflow: 0 }, verdict: { counts: { covered: 3, gap: 0, review: 0 }, active: 3, expired: 0, quiet: true, nextExpiryDays: 37, nextExpiryPolicyId: "p2", nowCount: 0, notChecked: [], perPolicy: { p1: "covered", p2: "covered", p3: "covered" } }, nextExpiry: { policyId: "p2", assetLabel: "Αυτοκίνητο · ΙΚΖ-4821", days: 37 } })} />)
        expect(container.textContent).toContain("Δεν χρειάζεται να κάνετε τίποτα σήμερα.")
        expect(container.textContent).toContain("Η επόμενη λήξη είναι σε 37 ημέρες.")
        expect(container.textContent).not.toContain("Να το δείτε τώρα")
    })
    it("states what was not checked instead of a silent all-clear, and shows the checklist only under three policies", () => {
        const { container } = render(<HomeScreen model={model({ tier: "free", notChecked: { gapDetection: true, notAnalysed: 1, failed: 0 }, policyCount: 2 })} />)
        expect(container.textContent).toContain("Κενά κάλυψης δεν τα έλεγξα — περιλαμβάνεται στο Family.")
        expect(container.textContent).toContain("1 ασφαλιστήριο δεν το έχω διαβάσει ακόμη.")
        expect(container.textContent).toContain("Έχετε 2 ασφαλιστήρια.")
        const three = render(<HomeScreen model={model({ policyCount: 30 })} />)
        expect(three.container.textContent).not.toContain("Ανεβάστε ένα ακόμη")
    })
    it("with no policies: the empty verdict sentence, one action, and still the note", () => {
        const { container } = render(<HomeScreen model={model({ policyCount: 0, findings: [], now: { shown: [], overflow: 0 } })} />)
        expect(container.textContent).toContain("Ανεβάστε το πρώτο και σας λέω τι είδα.")
        expect(container.querySelector('aside[role="note"]')).toBeTruthy()
    })
})
