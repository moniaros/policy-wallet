/**
 * /see and /policies — section budgets on the CI path (≤ 5 and ≤ 4), the
 * gate's guarantee that nothing generic renders, and the honest empty states.
 */
import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render } from "@testing-library/react"

vi.mock("@/app/(protected)/see/actions", () => ({ dismissFinding: vi.fn(async () => ({ ok: true })) }))
vi.mock("@/app/(protected)/protection/quick-start-actions", () => ({ submitQuickStart: vi.fn() }))
vi.mock("@/app/(protected)/updates/actions", () => ({ markUpdateRead: vi.fn(async () => ({ ok: true })), markStreamRead: vi.fn(async () => ({ ok: true })) }))
vi.mock("@/app/(protected)/adviser/actions", () => ({ setPolicyShared: vi.fn(async () => ({ ok: true })), disconnectAdviser: vi.fn(async () => ({ ok: true })), inviteAdviser: vi.fn(async () => ({ ok: true })), sendHelpRequest: vi.fn(async () => ({ ok: true })) }))
vi.mock("@/lib/journey/funnel", () => ({ trackJourneyEvent: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }), usePathname: () => "/see" }))

import { LanguageProvider } from "@/contexts/LanguageContext"
import { TranslationsProvider } from "@/contexts/TranslationsProvider"
import { SeeScreen } from "@/app/(protected)/see/SeeScreen"
import { PoliciesScreen } from "@/app/(protected)/policies/PoliciesScreen"
import { MoneyScreen } from "@/app/(protected)/money/MoneyScreen"
import { UpdatesScreen } from "@/app/(protected)/updates/UpdatesScreen"
import { AdviserScreen } from "@/app/(protected)/adviser/AdviserScreen"
import { HelpScreen } from "@/app/(protected)/adviser/help/[hash]/HelpScreen"
import { MeScreen } from "@/app/(protected)/me/MeScreen"
import { toRenderableFinding, findingHash } from "@/lib/app/finding"
import type { SeeModel } from "@/lib/app/see-model"
import type { PoliciesModel, PolicyRow } from "@/lib/app/policies-model"
import type { MoneyModel } from "@/lib/app/money-model"
import type { UpdatesModel } from "@/lib/app/updates-model"
import type { AdviserModel } from "@/lib/app/adviser-model"
import { collectSections } from "../measure/section-collector"

const JSDOM_OPTS = { assumeVisible: true, boundedFallback: true } as const
const wrap = (node: React.ReactNode) => render(<LanguageProvider><TranslationsProvider>{node}</TranslationsProvider></LanguageProvider>)

const finding = (id: string, kind: "gap" | "review" | "expiry", tier: "now" | "month" | "later") =>
    toRenderableFinding({
        id, hash: findingHash("p1", id, "no_flood_cover"), kind, tier,
        object: { policyId: "p1", assetLabel: "Κατοικία · Κηφισιάς 12" },
        sentence: kind === "expiry" ? { key: "app.finding.sentence.expiry", params: { asset: "Κατοικία · Κηφισιάς 12", days: 8 } } : { key: "gap:no_flood_cover", params: { asset: "Κατοικία · Κηφισιάς 12" } },
        source: { documentId: "d1", documentLabel: "Ασφαλιστήριο κατοικίας · P-1", locator: { kind: "section", section: "coverages", found: false } },
        ruleId: "no_flood_cover", daysUntilExpiry: kind === "expiry" ? 8 : undefined,
    })!

function seeModel(over: Partial<SeeModel> = {}): SeeModel {
    return {
        lang: "el",
        tiers: { now: [finding("f1", "expiry", "now")], month: [finding("f2", "gap", "month")], later: [finding("f3", "review", "later")] },
        dismissedCount: 1, dismissalsOn: true, expiredLabels: ["Interamerican (P-9)"], nextExpiryDays: 8, gapsNotChecked: false, gapDetectionTier: "pro", policyCount: 3, quickStart: null,
        ...over,
    }
}

const row = (id: string, over: Partial<PolicyRow> = {}): PolicyRow => ({
    id, href: `/policies/${id}`, label: "Interamerican (P-1)", asset: "ΙΚΖ-4821", insurer: "Interamerican", number: "P-1", line: "motor", lineLabel: "Αυτοκίνητο",
    covers: ["Αστική ευθύνη", "Θραύση κρυστάλλων"], premium: { amount: 412, currency: "EUR" }, person: "Γ. Παπαδόπουλος", state: "covered", lifecycle: "active",
    daysUntilExpiry: 165, endDate: "12/02/2027", documentCount: 1, mergedFrom: [], ...over,
})

function policiesModel(over: Partial<PoliciesModel> = {}): PoliciesModel {
    return { lang: "el", rows: [row("a"), row("b", { line: "property", lineLabel: "Κατοικία", asset: "Κηφισιάς 12", state: "gap", documentCount: 2 })], expired: [row("x", { lifecycle: "expired", state: null, daysUntilExpiry: -30 })], lineLabels: { motor: "Αυτοκίνητο", property: "Κατοικία" }, ...over }
}

describe("/see — «Να δείτε»", () => {
    it("renders ≤ 5 sections: the three tiers, the memory line and the note", () => {
        const { container } = wrap(<SeeScreen model={seeModel()} />)
        const r = collectSections(JSDOM_OPTS)
        expect(r.count, r.ids.join(", ")).toBeLessThanOrEqual(5)
        expect([...container.querySelectorAll("section[id]")].map((s) => s.id)).toEqual(["now", "month", "later", "memory", "note"])
        expect(container.textContent).toContain("Στο Κατοικία · Κηφισιάς 12 δεν βρήκα κάλυψη πλημμύρας.")
        expect(container.textContent).toContain("Ό,τι επιλέξατε να μη βλέπετε το θυμάμαι.")
        expect(container.textContent).toContain("Δεν τα ελέγχω πια: Interamerican (P-9).")
        expect(container.textContent).not.toMatch(/\d\s?%/)
    })
    it("filters to one kind and states the empty tiers honestly", () => {
        const { container } = wrap(<SeeScreen model={seeModel()} filter="gap" />)
        expect([...container.querySelectorAll("section[id]")].map((s) => s.id)).toEqual(["month", "memory", "note"])
    })
    it("with nothing to see: the §6 sentence and the next expiry, never an all-clear", () => {
        const { container } = wrap(<SeeScreen model={seeModel({ tiers: { now: [], month: [], later: [] }, nextExpiryDays: 37, gapsNotChecked: true })} />)
        expect(container.textContent).toContain("Δεν βρήκα κάτι που να αξίζει να δείτε αυτή τη στιγμή.")
        expect(container.textContent).toContain("Η επόμενη λήξη είναι σε 37 ημέρες.")
        expect(container.textContent).toContain("Κενά κάλυψης δεν τα έλεγξα")
    })
})

describe("/policies — «Ο φάκελός σας»", () => {
    it("renders ≤ 4 sections, one title, the asset on the row, «2 έγγραφα», expired collapsed", () => {
        const { container } = wrap(<PoliciesScreen model={policiesModel()} />)
        const r = collectSections(JSDOM_OPTS)
        expect(r.count, r.ids.join(", ")).toBeLessThanOrEqual(4)
        expect(container.querySelectorAll("h1").length).toBe(1)
        expect(container.textContent).toContain("Interamerican (P-1) · ΙΚΖ-4821")
        expect(container.textContent).toContain("2 έγγραφα")
        expect(container.textContent).toContain("Έληξαν · 1")
        expect(container.querySelector("details")?.hasAttribute("open")).toBe(false)
    })
    it("empty folder: one sentence and one action", () => {
        const { container } = wrap(<PoliciesScreen model={policiesModel({ rows: [], expired: [] })} />)
        expect(container.textContent).toContain("Δεν έχετε ανεβάσει ακόμη κανένα ασφαλιστήριο.")
        expect(container.querySelectorAll("a").length).toBeGreaterThanOrEqual(1)
    })
})

describe("/money — «Τα χρήματά σας»", () => {
    const moneyModel: MoneyModel = {
        lang: "el",
        money: { paidPerYear: 8224, protectsUpTo: { amount: 1_300_000, currency: "EUR", policyId: "p1", coverName: "Αστική ευθύνη" }, paidTwice: [{ policyId: "a", partnerPolicyId: "b" }] },
        footprint: { total: 8224, countedPolicies: 20, otherCurrencyCount: 0, unknownPremiumCount: 2, unknownDurationCount: 1 },
        byLine: [{ id: "motor", label: "Αυτοκίνητο", amount: 5000 }, { id: "health", label: "Υγεία", amount: 3224 }],
        paidTwice: [{ label: "Interamerican (P-1)", partnerLabel: "ΕΘΝΙΚΗ (P-2)", asset: "Αυτοκίνητο · ΙΚΖ-4821", amountPerYear: null }],
        benefits: [{ id: "b1", name: "Δωρεάν τεχνικός έλεγχος", policyLabel: "Interamerican (P-1)", contact: "210 000 0000" }],
        offers: [], enfiaGuideHref: "/guides/ekptosi-enfia-asfalisi-katoikias", policyCount: 20,
    }
    it("renders ≤ 5 sections; the «έως» sentence; the pair without an invented amount; the not-counted line", () => {
        const { container } = wrap(<MoneyScreen model={moneyModel} />)
        const r = collectSections(JSDOM_OPTS)
        expect(r.count, r.ids.join(", ")).toBeLessThanOrEqual(5)
        expect(container.textContent).toContain("το μεγαλύτερο μεμονωμένο όριο")
        expect(container.textContent).toContain("Interamerican (P-1) · ΕΘΝΙΚΗ (P-2)")
        expect(container.textContent).not.toMatch(/≈/)
        expect(container.textContent).toContain("3 ασφαλιστήρια δεν μετράνε εδώ")
        expect(container.textContent).toContain("έκπτωση ΕΝΦΙΑ")
        expect(container.textContent).not.toMatch(/κόψτε|αλλάξτε|αγοράστε|εξοικονομ/i)
    })
})

describe("/updates — «Ενημερώσεις»", () => {
    const item = (id: string, over: Partial<UpdatesModel["protection"][number]> = {}) => ({
        id, eventType: "policy_expiring", stream: "protection" as const, title: "Λήγει σε 14 ημέρες", message: "Το ασφαλιστήριο λήγει.",
        objectLabel: "Interamerican (P-1)", href: "/policies/p1", unread: true, at: new Date().toISOString(), failedReading: false, ...over,
    })
    const updatesModel: UpdatesModel = {
        lang: "el",
        protection: [item("e1"), item("e2", { eventType: "policy_analysis_failed", failedReading: true, title: "Η ανάλυση δεν ολοκληρώθηκε" })],
        meanwhile: [item("e3", { stream: "meanwhile", eventType: "document_stored", unread: false, title: "Αποθηκεύτηκε" })],
        badge: 2,
    }
    it("renders the two stream groups, every row naming its object, the failure worded as the analyst's limitation", () => {
        const { container } = wrap(<UpdatesScreen model={updatesModel} />)
        const r = collectSections(JSDOM_OPTS)
        expect(r.count, r.ids.join(", ")).toBeLessThanOrEqual(2)
        expect([...container.querySelectorAll("section[id]")].map((s) => s.id)).toEqual(["protection", "meanwhile"])
        expect(container.textContent).toContain("Interamerican (P-1)")
        expect(container.textContent).toContain("Δεν μπόρεσα να διαβάσω το έγγραφο.")
        expect(container.textContent).toContain("Τα είδα όλα")
    })
    it("empty streams say so honestly", () => {
        const { container } = wrap(<UpdatesScreen model={{ lang: "el", protection: [], meanwhile: [], badge: 0 }} />)
        expect(container.textContent).toContain("Δεν έχω κάτι νέο για την προστασία σας.")
        expect(container.textContent).toContain("Δεν έχω κάνει κάτι που να αξίζει να σας πω.")
    })
})

describe("/adviser — «Ο σύμβουλός σας»", () => {
    const adviserModel: AdviserModel = {
        lang: "el",
        adviser: { id: "ag1", name: "Νίκος Οικονόμου", company: "Οικονόμου Ασφάλειες", phone: "2100000000", email: "nikos@example.com", photoUrl: null, relationshipId: "rel1", since: "12/03/2025" },
        policies: [
            { id: "p1", label: "Interamerican (P-1)", asset: "ΙΚΖ-4821", grantId: "g1", sharedSince: "12/03/2025", addedByAdviser: false },
            { id: "p2", label: "ΕΘΝΙΚΗ (P-2)", asset: null, grantId: null, sharedSince: null, addedByAdviser: true },
        ],
        threads: [{ id: "th1", subject: "Στο Κατοικία δεν βρήκα κάλυψη πλημμύρας.", status: "open", at: new Date().toISOString(), policyId: "p1" }],
    }
    it("renders ≤ 4 sections; one switch per policy; the note names the adviser as the customer's own", () => {
        const { container } = wrap(<AdviserScreen model={adviserModel} />)
        const r = collectSections(JSDOM_OPTS)
        expect(r.count, r.ids.join(", ")).toBeLessThanOrEqual(4)
        expect(container.querySelectorAll('[role="switch"]').length).toBe(2)
        expect(container.textContent).toContain("το βλέπει από 12/03/2025")
        expect(container.textContent).toContain("δεν το βλέπει")
        expect(container.textContent).toContain("Ο Νίκος Οικονόμου είναι ο δικός σας σύμβουλος, όχι δικός μας.")
    })
    it("no adviser: the invite flow, never a directory", () => {
        const { container } = wrap(<AdviserScreen model={{ ...adviserModel, adviser: null, threads: [] }} />)
        expect(container.textContent).toContain("Δεν έχετε συνδέσει σύμβουλο.")
        expect(container.textContent).toContain("Δεν προτείνουμε εμείς συμβούλους.")
        expect(container.querySelector('input[type="email"]')).toBeTruthy()
    })
})

describe("/adviser/help/[hash] — the consent is one switch", () => {
    const helpFinding = toRenderableFinding({
        id: "gap:g9", hash: findingHash("p1", "no_flood_cover", "no_flood_cover"), kind: "gap", tier: "now",
        object: { policyId: "p1", assetLabel: "Κατοικία · Κηφισιάς 12" },
        sentence: { key: "gap:no_flood_cover", params: { asset: "Κατοικία · Κηφισιάς 12" } },
        source: { documentId: "d1", documentLabel: "Ασφαλιστήριο κατοικίας · P-1", locator: { kind: "section", section: "coverages", found: false } },
        whyYou: { profileField: "ownsHome", key: "app.finding.why.ownsHome", params: {} },
        ruleId: "no_flood_cover",
    })!
    it("chips say exactly what is sent; «τα άλλα N» is off by default; the send is disabled until the one switch consents", () => {
        const { container } = wrap(<HelpScreen finding={helpFinding} adviserName="Νίκος Οικονόμου" otherPolicies={17} />)
        expect(container.textContent).toContain("Το εύρημα")
        expect(container.textContent).toContain("Η πηγή: Ασφαλιστήριο κατοικίας · P-1")
        expect(container.textContent).toContain("Το στοιχείο προφίλ: ownsHome")
        const othersChip = [...container.querySelectorAll("button")].find((b) => b.textContent?.includes("τα άλλα 17"))
        expect(othersChip?.getAttribute("aria-pressed")).toBe("false")
        expect(container.querySelectorAll('[role="switch"]').length).toBe(1)
        const send = [...container.querySelectorAll("button")].find((b) => b.textContent === "Στείλτε το")
        expect(send?.hasAttribute("disabled")).toBe(true)
        expect(container.textContent).not.toMatch(/\d\s?%/)
    })
})

describe("/me — «Εσείς»", () => {
    const ledger = { policiesRead: 21, renewalsCaught: 3, findingsShown: 29, benefitsSurfaced: 0, questionsAnswered: 0, helpRequests: 1, year: 2026 }
    const household = { lang: "el" as const, enabled: true, people: [{ id: "hp1", name: "Άννα", relation: "partner", isDependant: false, state: "covered" as const, policyCount: 2 }] }
    const sections = [{ id: "profile", href: "/me/profile", label: "Προφίλ", description: "Όνομα, email" }, { id: "privacy", href: "/me/privacy", label: "Απόρρητο", description: "Δεδομένα" }]
    it("renders the ledger lines only for what happened, the plan beside it without commentary, ≤ 4 sections", () => {
        const { container } = wrap(<MeScreen ledger={ledger} household={household} sections={sections} planLine="Πρόγραμμα: Family" />)
        const r = collectSections(JSDOM_OPTS)
        expect(r.count, r.ids.join(", ")).toBeLessThanOrEqual(4)
        expect(container.textContent).toContain("21 ασφαλιστήρια διάβασα")
        expect(container.textContent).toContain("1 αίτημα στείλατε στον σύμβουλό σας")
        expect(container.textContent).not.toContain("παροχ")
        expect(container.textContent).toContain("Πρόγραμμα: Family")
        expect(container.textContent).toContain("Άννα")
    })
    it("an empty year renders the honest empty sentence, never an invented achievement", () => {
        const empty = { policiesRead: 0, renewalsCaught: 0, findingsShown: 0, benefitsSurfaced: 0, questionsAnswered: 0, helpRequests: 0, year: 2026 }
        const { container } = wrap(<MeScreen ledger={empty} household={{ lang: "el", enabled: false, people: [] }} sections={sections} planLine="Πρόγραμμα: Free" />)
        expect(container.textContent).toContain("Δεν έχω κάνει ακόμη κάτι που να αξίζει να μετρήσω.")
    })
})
