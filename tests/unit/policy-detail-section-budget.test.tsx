/**
 * POLICY DETAIL SECTION BUDGET — ≤ 8 top-level groupings, enforced on CI.
 *
 * The Playwright measure suite (tests/measure/policy-detail-goal2.spec.ts)
 * asserts the same ceiling against the live page, but it is NOT in CI — and an
 * unenforced budget is how another surface reached 20 sections. This guard
 * renders the REAL PolicyDetailsClient in jsdom and counts groupings with the
 * SAME collector the measure suite serialises into the browser
 * (tests/measure/section-collector.ts) — one definition, two runtimes.
 *
 * jsdom differences, declared rather than hidden: no layout and no project
 * stylesheet, so the collector runs with `assumeVisible` (a 0×0 rect is not
 * evidence of invisibility here) and `boundedFallback` (`.pw-card` / bare
 * interactive controls stand in for boundaries a class would paint).
 * Cross-checked against the Playwright run of 2026-08-26: the browser
 * asserted ≤ 8 on all six fixtures × three widths, and before the dock merge
 * both runtimes reported the same over-budget count (9) on the live states.
 *
 * WHY 8 — recorded in docs/transformation/DECISIONS.md (2026-08-26): the page
 * carries the head, the plain-language summary and six disclosure sections.
 * The measured "10" that opened this item was one detector artefact (the
 * summary card counted twice — proven single-render below) and one real
 * overage (the standalone ask-AI dock button, since merged into the head card,
 * with its LEDGER row).
 *
 * The probe test at the bottom is the committed proof this guard can turn red
 * (repo rule: a guard without a probe in the repo is not a guard).
 */
import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render } from "@testing-library/react"

// The view's static import graph reaches two "use server" action modules
// (via AnalysisCard). Their real bodies pull auth/db at import time, which a
// jsdom test must never do — and none of their behavior is under test here.
vi.mock("@/app/(protected)/wallet/actions", () => ({
    runPolicyAnalysis: vi.fn(),
    ignoreGap: vi.fn(),
    notifyAgentAboutGap: vi.fn(),
    confirmGap: vi.fn(),
    requestRenewalQuote: vi.fn(),
}))
vi.mock("@/app/(protected)/agent/actions", () => ({
    requestAiConsent: vi.fn(),
}))

import { LanguageProvider } from "@/contexts/LanguageContext"
import { TranslationsProvider } from "@/contexts/TranslationsProvider"
import { getTranslations } from "@/lib/i18n"
import { PolicyDetailsClient } from "@/components/wallet/PolicyDetailsClientView"
import { collectSections } from "../measure/section-collector"

const BUDGET = 8
const JSDOM_OPTS = { assumeVisible: true, boundedFallback: true } as const

const t = getTranslations("el")
const SUMMARY_TITLE = t.wallet.policyDetailsPage.summaryTitle // «Το ασφαλιστήριό σας σε απλά ελληνικά»

const DAY = 86_400_000
const iso = (daysFromNow: number) => new Date(Date.now() + daysFromNow * DAY).toISOString()

/**
 * A realistic analysed motor policy, modelled on tests/measure/fixtures.ts
 * (the same shapes real extractions produce). `daysLeft` and `status` are the
 * knobs the states below turn.
 */
function motorPolicy(overrides: Record<string, unknown> = {}) {
    return {
        id: "pol-budget-guard",
        status: "active",
        insurerName: "Interamerican",
        policyNumber: "ΣΥΜΒ-2025-MOT-ACT",
        lineOfBusiness: "motor",
        startDate: iso(-200),
        endDate: iso(165),
        premiumAmount: 312.4,
        premiumCurrency: "EUR",
        lastAnalyzedAt: iso(-3),
        verified: false,
        reviewState: "confirmed",
        coverageSummary:
            "Το ασφαλιστήριο αυτοκινήτου σας καλύπτει αστική ευθύνη έναντι τρίτων, πυρκαγιά και φυσικά φαινόμενα.",
        documents: [{ id: "doc-1", fileName: "policy.pdf", fileType: "application/pdf" }],
        analysisRuns: [{ status: "completed" }],
        acordData: {
            _version: 3,
            policy: {
                insurerName: "Interamerican",
                policyNumber: "ΣΥΜΒ-2025-MOT-ACT",
                lineOfBusiness: "motor",
                effectiveDate: iso(-200).slice(0, 10),
                expirationDate: iso(165).slice(0, 10),
                premium: { amount: 312.4, currency: "EUR" },
                premiumFrequency: "annual",
            },
            vehicle: { make: "Toyota", model: "Yaris", plateNumber: "ΙΚΖ-4821" },
            insureds: [{ name: "E2E Policyholder" }],
            coverages: [
                {
                    name: "Σωματικές Βλάβες τρίτων",
                    status: "included",
                    limits: [{ basis: "per_person", amount: 1_300_000, currency: "EUR" }],
                    explanation: { el: "Καλύπτει σωματικές βλάβες τρίτων.", en: "Third-party bodily injury." },
                },
                {
                    name: "Θραύση κρυστάλλων",
                    status: "excluded",
                    explanation: { el: "Δεν περιλαμβάνεται.", en: "Not included." },
                },
            ],
            exclusions: ["Οδήγηση υπό την επήρεια αλκοόλ"],
            extraction: { summaryLanguage: "el" },
        },
        ...overrides,
    }
}

/** The states the measure matrix covers: active, expiring, expired, analyzing. */
const STATES: Array<{ key: string; policy: Record<string, unknown>; daysLeft: number | null; statusLabel: string }> = [
    { key: "active", policy: motorPolicy(), daysLeft: 165, statusLabel: "Ενεργό" },
    { key: "expiring", policy: motorPolicy({ endDate: iso(15) }), daysLeft: 15, statusLabel: "Λήγει σύντομα" },
    { key: "expired", policy: motorPolicy({ endDate: iso(-110) }), daysLeft: -110, statusLabel: "Ληγμένο" },
    { key: "analyzing", policy: motorPolicy({ status: "analyzing", lastAnalyzedAt: null }), daysLeft: 165, statusLabel: "Σε ανάλυση" },
]

const STATUS_COLOR = { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20" }

function renderPolicyDetail(state: (typeof STATES)[number]) {
    return render(
        <LanguageProvider>
            <TranslationsProvider>
            <PolicyDetailsClient
                policy={state.policy}
                serializedShares={[]}
                aiUsageStats={{ count: 0, limit: 10 }}
                statusLabel={state.statusLabel}
                statusColor={STATUS_COLOR}
                statusColorOnDark={STATUS_COLOR}
                daysLeft={state.daysLeft}
                resolvedEndDate={(state.policy as { endDate: string }).endDate}
                isOwner={true}
                relationshipId={null}
                t={t}
                tier="free"
                gapReportItems={[]}
                reportUnlocked={false}
            />
            </TranslationsProvider>
        </LanguageProvider>
    )
}

/** The assertion both the guard and its probe share. */
function expectWithinBudget(result: { count: number; ids: string[] }, label: string) {
    expect(
        result.count,
        `${label}: ${result.count} top-level groupings against the ≤ ${BUDGET} budget:\n${result.ids.join("\n")}`
    ).toBeLessThanOrEqual(BUDGET)
}

describe("policy detail — the ≤ 8 section budget holds on CI", () => {
    for (const state of STATES) {
        it(`stays within budget — ${state.key}`, () => {
            const { unmount } = renderPolicyDetail(state)
            const result = collectSections(JSDOM_OPTS)

            // An all-clear that measured nothing is not an all-clear: a broken
            // render (empty shell, missing wrapper) would count 0 and "pass".
            // The six disclosure sections are the page's one navigation system;
            // at least the four state-independent ones must be present before
            // the budget assertion means anything.
            for (const id of ["#coverage", "#review", "#claims", "#documents"]) {
                expect(result.ids, `${state.key}: ${id} missing — the count measured a broken render`).toContain(id)
            }
            expect(result.count, `${state.key}: implausibly few groupings — broken render`).toBeGreaterThanOrEqual(6)

            expectWithinBudget(result, state.key)
            unmount()
        })
    }

    it("the head's FIRST button stays the primary action — the ask-AI dock renders behind it", () => {
        // The dock moved INSIDE header.pw-card to meet the budget (D-035).
        // The measure suite's ten-second test reads the header's first
        // <button> as Q4's answer, so the order is load-bearing: if the dock
        // ever renders above the primary action, that test starts grading the
        // wrong control. The pool blocked the browser re-run of the ten-second
        // test on 2026-08-26, so this is also the standing structural proof.
        const { unmount } = renderPolicyDetail(STATES[0])
        const header = document.querySelector(".pw-page-shell header.pw-card")
        expect(header, "the head card is gone").not.toBeNull()
        const buttons = Array.from(header!.querySelectorAll("button"))
        const askAiLabel = t.wallet.policyDetailsPage.headAskAi
        expect(buttons.length, "the head must carry the DO action and the ASK affordance").toBe(2)
        expect(buttons[0]!.textContent || "").not.toContain(askAiLabel)
        expect(buttons[1]!.textContent || "").toContain(askAiLabel)
        unmount()
    })

    it("the canonical active page sits exactly AT budget — a new group has nowhere to hide", () => {
        // ≤ 8 alone lets two new groups in silently if the page ever drops to 6.
        // The composition is deliberate: head + summary + six sections = 8.
        const { unmount } = renderPolicyDetail(STATES[0])
        const result = collectSections(JSDOM_OPTS)
        expect(result.count, `expected the deliberate 8-group composition, got:\n${result.ids.join("\n")}`).toBe(8)
        unmount()
    })
})

describe("the goal2 duplicate was the detector, not the page (evidence, from a render)", () => {
    /**
     * The 2026-08-25 measure run reported «Το ασφαλιστήριό σας σε απλά
     * ελληνικά» as TWO sections. SummaryCard is rendered once; the old
     * collector counted the card's spacing wrapper AND the card's internal
     * header row — the nested-match artefact section-collector.ts documents.
     * This test pins all three facts from a real render.
     */

    /** The traversal as it stood before the nested-match fix — headings only,
     *  which is the arm that produced the duplicate (both entries carried the
     *  summary <h2>; boundedness played no part). */
    function legacyCollect(): string[] {
        const out = new Set<Element>()
        document.querySelectorAll("section[id]").forEach((s) => out.add(s))
        const shell = document.querySelector(".pw-page-shell > div")
        const columns: Element[] = []
        if (shell) {
            columns.push(shell)
            shell.querySelectorAll(":scope > div").forEach((d) => {
                d.querySelectorAll(":scope > div, :scope > aside").forEach((c) => columns.push(c))
            })
        }
        for (const col of columns) {
            for (const child of Array.from(col.children)) {
                if (child.matches("section[id]") || child.querySelector("section[id]")) continue
                if (child.closest("section[id]")) continue
                if (child.querySelector("h1,h2,h3") || /^H[1-3]$/.test(child.tagName)) out.add(child)
            }
        }
        return Array.from(out).map((el) => (el.querySelector("h1,h2,h3")?.textContent || "").trim())
    }

    it("the page renders the summary card ONCE, the old detector counted it TWICE, the fixed one counts it once", () => {
        const { unmount } = renderPolicyDetail(STATES[0])

        // 1 — the DOM: exactly one summary heading. Not a double render.
        const summaryHeadings = Array.from(document.querySelectorAll("h1,h2,h3")).filter((h) =>
            (h.textContent || "").includes(SUMMARY_TITLE)
        )
        expect(summaryHeadings, "the page must render the summary card exactly once").toHaveLength(1)

        // 2 — the artefact, reproduced: the pre-fix traversal yields two
        // entries for that one card (the wrapper and the card's header row).
        const legacy = legacyCollect().filter((title) => title.includes(SUMMARY_TITLE))
        expect(legacy, "the legacy traversal no longer reproduces the double-count — update the evidence note").toHaveLength(2)

        // 3 — the fix: the shared collector reports it once.
        const fixed = collectSections(JSDOM_OPTS).ids.filter((id) => id.includes(SUMMARY_TITLE))
        expect(fixed).toHaveLength(1)

        unmount()
    })
})

describe("probe — proof this guard can turn red", () => {
    it("a 9-group page fails the budget assertion", () => {
        // Synthetic shell with nine headed groups — the shape the guard exists
        // to catch. If the collector or the assertion ever goes blind, this
        // probe is the committed fixture that says so.
        document.body.innerHTML =
            `<div class="pw-page-shell"><div>` +
            Array.from({ length: 3 }, (_, i) => `<div><h2>Ομάδα ${i + 1}</h2></div>`).join("") +
            Array.from({ length: 6 }, (_, i) => `<section id="probe-${i + 1}"><h2>Ενότητα ${i + 1}</h2></section>`).join("") +
            `</div></div>`

        const result = collectSections(JSDOM_OPTS)
        expect(result.count).toBe(9)
        expect(() => expectWithinBudget(result, "probe")).toThrow()

        document.body.innerHTML = ""
    })

    it("the dedupe does not collapse nested section[id] — they count individually by definition", () => {
        document.body.innerHTML =
            `<div class="pw-page-shell"><div>` +
            `<section id="outer"><h2>Έξω</h2><section id="inner"><h2>Μέσα</h2></section></section>` +
            `</div></div>`
        const result = collectSections(JSDOM_OPTS)
        expect(result.ids.sort()).toEqual(["#inner", "#outer"])
        document.body.innerHTML = ""
    })
})
