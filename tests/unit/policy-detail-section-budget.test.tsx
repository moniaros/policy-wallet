/**
 * /policies/[id] — the ≤ 8 section budget and the ≤ 2 AI-entry-point ceiling
 * hold on CI (D-035 measured the old detail view at exactly 8; Grafí G8
 * re-points the guard at the new screen — it must never measure a view that
 * no route renders).
 *
 * The screen's static import graph reaches two "use server" modules through
 * PolicyQA and DeletePolicyDialog; their real bodies pull auth/db at import
 * time, so they are mocked here.
 */
import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render } from "@testing-library/react"

vi.mock("@/app/(protected)/wallet/actions", () => ({ askPolicyQuestion: vi.fn(), deletePolicy: vi.fn() }))
vi.mock("@/lib/journey/funnel", () => ({ trackJourneyEvent: vi.fn() }))

import { LanguageProvider } from "@/contexts/LanguageContext"
import { TranslationsProvider } from "@/contexts/TranslationsProvider"
import { PolicyDetailScreen } from "@/app/(protected)/policies/[id]/PolicyDetailScreen"
import { toRenderableFinding, findingHash } from "@/lib/app/finding"
import type { PolicyDetailModel } from "@/lib/app/policy-detail-model"
import { collectSections } from "../measure/section-collector"

const BUDGET = 8
const AI_ENTRY_POINTS = 2
const JSDOM_OPTS = { assumeVisible: true, boundedFallback: true } as const

const gap = toRenderableFinding({
    id: "gap:1", hash: findingHash("p1", "no_glass_cover", "no_glass_cover"), kind: "gap", tier: "month",
    object: { policyId: "p1", assetLabel: "Αυτοκίνητο · ΙΚΖ-4821" },
    sentence: { key: "gap:no_glass_cover", params: { asset: "Αυτοκίνητο · ΙΚΖ-4821" } },
    source: { documentId: "d1", documentLabel: "Ασφαλιστήριο αυτοκινήτου · 64504715", locator: { kind: "section", section: "coverages", found: false } },
    ruleId: "no_glass_cover",
})!

function model(over: Partial<PolicyDetailModel> = {}): PolicyDetailModel {
    return {
        lang: "el", id: "p1", isOwner: true, canWrite: true, label: "Interamerican (64504715)", insurer: "Interamerican", number: "64504715",
        asset: "ΙΚΖ-4821", lineLabel: "Αυτοκίνητο", lineId: "motor", lineOfBusiness: "motor", state: "gap", lifecycle: "active", daysUntilExpiry: 165, endDate: "12/02/2027",
        premium: { amount: 412, currency: "EUR" }, insured: "Γ. Παπαδόπουλος",
        summary: { text: "Καλύπτει σωματικές βλάβες τρίτων έως 1.300.000 €.", state: "ok" },
        checklist: [
            { id: "cov-0", label: "Σωματικές βλάβες τρίτων", state: "ok", citation: { document: "Ασφαλιστήριο αυτοκινήτου · 64504715", page: 2, snippet: null } },
            { id: "cov-1", label: "Θραύση κρυστάλλων", state: "not", citation: { document: "Ασφαλιστήριο αυτοκινήτου · 64504715", page: null, snippet: null } },
            { id: "cov-2", label: "Οδική βοήθεια", state: "review", citation: { document: null, page: null, snippet: null } },
        ],
        findings: [gap],
        questions: [{ id: "q1", kind: "cover", params: { cover: "θραύση κρυστάλλων" } }, { id: "q2", kind: "deductible", params: { cover: "ίδιες ζημιές" } }],
        documents: [{ id: "d1", fileName: "Ασφαλιστήριο Αυτοκίνητο · 64504715", mimeType: "application/pdf", uploadedAt: new Date("2026-02-12").toISOString(), documentKind: "policy_schedule" }],
        currentDocumentLabel: "Ασφαλιστήριο αυτοκινήτου · 64504715",
        tier: "free", freeQuestionsRemaining: 0,
        absence: "empty", latestRunStatus: "completed", blockedReason: null, reviewState: "confirmed", canReviewExtraction: false,
        exclusionHint: { heading: "Εξαίρεση", definition: "Περίπτωση που το ασφαλιστήριο ρητά δεν καλύπτει, όσο σοβαρή κι αν είναι η ζημιά.", href: "/lexiko/exairesi", moreLabel: "Περισσότερα" },
        ...over,
    }
}

function renderScreen(m: PolicyDetailModel) {
    return render(
        <LanguageProvider>
            <TranslationsProvider>
                <PolicyDetailScreen model={m} />
            </TranslationsProvider>
        </LanguageProvider>
    )
}

const STATES: Array<{ key: string; m: PolicyDetailModel }> = [
    { key: "active with a gap", m: model() },
    { key: "expiring", m: model({ lifecycle: "expiring_soon", daysUntilExpiry: 15 }) },
    { key: "expired", m: model({ lifecycle: "expired", state: null, daysUntilExpiry: -110, findings: [] }) },
    { key: "never read", m: model({ summary: { text: null, state: "absent" }, checklist: [], findings: [], questions: [], state: "review", absence: "never", latestRunStatus: null }) },
    { key: "blocked on consent", m: model({ summary: { text: null, state: "absent" }, checklist: [], findings: [], questions: [], state: "review", absence: "blocked", latestRunStatus: "blocked", blockedReason: "ai_consent_missing" }) },
    { key: "unconfirmed extraction, owner", m: model({ reviewState: "unconfirmed" }) },
    { key: "unconfirmed extraction, adviser", m: model({ reviewState: "flagged", canReviewExtraction: true, isOwner: false }) },
    { key: "shared, read-only", m: model({ isOwner: false, canWrite: false }) },
]

describe("/policies/[id] — the ≤ 8 section budget and ≤ 2 AI entry points hold on CI", () => {
    for (const s of STATES) {
        it(`stays within budget — ${s.key}`, () => {
            const { container, unmount } = renderScreen(s.m)
            const result = collectSections(JSDOM_OPTS)
            for (const id of ["#hero", "#checklist", "#findings", "#qa", "#documents", "#note"]) {
                expect(result.ids, `${s.key}: ${id} missing — the count measured a broken render`).toContain(id)
            }
            expect(result.count, `${s.key}: ${result.ids.join(", ")}`).toBeLessThanOrEqual(BUDGET)
            // AI entry points: the plain-language lede and the question box — never a third.
            const ai = container.querySelectorAll('[data-fact="policy.summary"], #qa')
            expect(ai.length).toBeLessThanOrEqual(AI_ENTRY_POINTS)
            expect(container.textContent).not.toMatch(/\d\s?%/)
            unmount()
        })
    }
    it("every checklist line cites a document, a page, or says it was not found", () => {
        const { container } = renderScreen(model())
        const text = container.textContent ?? ""
        expect(text).toContain("Από το έγγραφο «Ασφαλιστήριο αυτοκινήτου · 64504715», σελίδα 2")
        expect(text).toContain("Από το έγγραφο «Ασφαλιστήριο αυτοκινήτου · 64504715»")
        expect(text).toContain("δεν εντοπίστηκε")
    })
    it("a summary written in another language is not rendered; the screen says so instead", () => {
        const { container } = renderScreen(model({ summary: { text: "Covers third-party injury.", state: "language_mismatch" } }))
        expect(container.textContent).not.toContain("Covers third-party injury.")
        expect(container.textContent).toContain("Το διάβασα σε άλλη γλώσσα")
    })
    it("an expiring policy leads with «Το πλήρωσα»; an active one with the question", () => {
        expect(renderScreen(model({ lifecycle: "expiring_soon", daysUntilExpiry: 15 })).container.textContent).toContain("Το πλήρωσα")
        expect(renderScreen(model()).container.textContent).toContain("Ρωτάτε με απλά λόγια")
    })
})
