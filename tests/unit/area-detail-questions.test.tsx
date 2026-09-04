import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import React from "react"

const refresh = vi.hoisted(() => vi.fn())
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn() }) }))
const track = vi.hoisted(() => vi.fn())
vi.mock("@/lib/journey/funnel", () => ({ trackJourneyEvent: track }))

import { AreaQuestionFlow, type AnswerInput, type AnswerResult } from "@/components/protection/AreaQuestionFlow"
import {
    areaQuestions,
    buildAreaDetail,
    prefillFor,
    questionFlowCopy,
    type AreaPolicyRow,
    type AreaQuestionView,
} from "@/components/protection/area-detail-model"
import { getTranslations } from "@/lib/i18n"
import { buildAttentionAreas } from "@/lib/protection/attention-areas"
import { buildCoverageModel, type PolicyEvidenceInput } from "@/lib/protection/coverage-model"
import type { FactProvenanceMap } from "@/lib/protection/evidence"
import { questionForFactor } from "@/lib/protection/factor-questions"
import { toLifeContext } from "@/lib/services/gap-engine/life-context"
import { assessRisks } from "@/lib/services/gap-engine/risk-assessment"
import { deriveProtectionPriorities } from "@/lib/services/protection-profile/derive-priorities"

/**
 * The area detail — one question at a time, never a known factor, health
 * behind the Art. 9 opt-in (docs/planning/PERSONAL_RISK_PROFILE.md §C Layer
 * 3, §F). The flow is rendered with a stubbed action; the model is built
 * through the real composition.
 */

const t = getTranslations("el")
const COPY = questionFlowCopy(t)
const AT = "2026-09-04T10:00:00.000Z"
const NOW = new Date(AT)

const q = (factor: string, overrides: Partial<AreaQuestionView> = {}): AreaQuestionView => {
    const def = questionForFactor(factor as any)!
    return {
        factor: def.factor,
        input: def.input,
        ...(def.options ? { options: def.options.map((o) => ({ value: o.value, label: o.label.el })) } : {}),
        prompt: def.prompt.el,
        why: def.why.el,
        shortNoun: def.shortNoun.el,
        specialCategory: def.specialCategory,
        prefill: null,
        ...overrides,
    }
}

function ok(next: string | null, remainingUnknown = 0): AnswerResult {
    return { ok: true, next: next as any, remainingUnknown, skipped: [] }
}

function renderFlow(questions: AreaQuestionView[], onAnswer: (i: AnswerInput) => Promise<AnswerResult>, area: any = "household") {
    return render(<AreaQuestionFlow area={area} questions={questions} unknownFactorCount={questions.length} copy={COPY} onAnswer={onAnswer} />)
}

const primaryButtons = (c: HTMLElement) => Array.from(c.querySelectorAll(".pw-primary-button"))

beforeEach(() => {
    refresh.mockClear()
    track.mockClear()
})

describe("one question at a time", () => {
    it("renders exactly the first question, its options as aria-pressed rows, and ONE primary button", () => {
        const { container } = renderFlow([q("maritalStatus"), q("income")], async () => ok(null))
        expect(container.querySelectorAll("[data-factor]").length).toBe(1)
        expect(container.querySelector("[data-factor]")!.getAttribute("data-factor")).toBe("maritalStatus")
        expect(screen.getByText(questionForFactor("maritalStatus")!.prompt.el)).toBeTruthy()
        expect(screen.queryByText(questionForFactor("income")!.prompt.el)).toBeNull()
        const options = Array.from(container.querySelectorAll("button[aria-pressed]"))
        expect(options.length).toBe(6)
        for (const o of options) expect(o.className).toContain("min-h-11")
        expect(primaryButtons(container).length).toBe(1)
        expect(container.textContent).toContain(COPY.progress.replace("{n}", "1").replace("{m}", "2"))
    })

    it("sends the chosen option through the action and moves to the question the server names", async () => {
        const onAnswer = vi.fn(async (_input: AnswerInput) => ok("income", 3))
        const { container } = renderFlow([q("maritalStatus"), q("dependents"), q("income")], onAnswer)
        fireEvent.click(screen.getByText("Παντρεμένος/η"))
        expect(container.querySelector('button[aria-pressed="true"]')!.textContent).toContain("Παντρεμένος/η")
        fireEvent.click(screen.getByText(COPY.continue))
        await waitFor(() => expect(onAnswer).toHaveBeenCalledTimes(1))
        expect(onAnswer.mock.calls[0]![0]).toEqual({ area: "household", factor: "maritalStatus", value: "married" })
        // The server said `income` is next: `dependents` — settled meanwhile — is skipped.
        await waitFor(() => expect(container.querySelector("[data-factor]")!.getAttribute("data-factor")).toBe("income"))
        expect(track).toHaveBeenCalledWith("risk_factor_answered", { area: "household", factor: "maritalStatus", special_category: false })
        expect(track).toHaveBeenCalledWith("action_started", { kind: "answer_questions", area: "household" })
    })

    it("a currency question is a labelled input, sent as a number, and completion emits the remaining count and refreshes", async () => {
        const onAnswer = vi.fn(async () => ok(null, 2))
        const { container } = renderFlow([q("income")], onAnswer)
        const input = screen.getByLabelText(COPY.currencyLabel) as HTMLInputElement
        expect(input.getAttribute("inputmode")).toBe("decimal")
        fireEvent.change(input, { target: { value: "30000" } })
        fireEvent.click(screen.getByText(COPY.continue))
        await waitFor(() => expect(onAnswer).toHaveBeenCalledWith({ area: "household", factor: "income", value: 30000 }))
        await waitFor(() => expect(container.textContent).toContain(COPY.done))
        expect(container.textContent).toContain(COPY.remaining.replace("{n}", "2"))
        expect(track).toHaveBeenCalledWith("risk_area_completed", { area: "household", remaining_unknown: 2 })
        expect(refresh).toHaveBeenCalled()
        expect(primaryButtons(container).length).toBe(0)
    })

    it("a multi question is real checkboxes; «none» is exclusive and is sent as the none marker", async () => {
        const onAnswer = vi.fn(async () => ok(null))
        const { container } = renderFlow([q("hobbies")], onAnswer, "lifestyle")
        const boxes = Array.from(container.querySelectorAll('input[type="checkbox"]'))
        expect(boxes.length).toBeGreaterThan(2)
        fireEvent.click(screen.getByLabelText("Σκι"))
        fireEvent.click(screen.getByLabelText("Κανένα από αυτά"))
        expect((screen.getByLabelText("Σκι") as HTMLInputElement).checked).toBe(false)
        fireEvent.click(screen.getByText(COPY.continue))
        await waitFor(() => expect(onAnswer).toHaveBeenCalledWith({ area: "lifestyle", factor: "hobbies", value: ["none"] }))
    })

    it("a pre-filled value is shown and said to be pre-filled; the primary is disabled until an answer exists", () => {
        const { container } = renderFlow([q("vehicles", { prefill: 2 })], async () => ok(null))
        expect((screen.getByLabelText(COPY.numberLabel) as HTMLInputElement).value).toBe("2")
        expect(container.textContent).toContain(COPY.prefilled)
        const empty = renderFlow([q("vehicles")], async () => ok(null))
        expect((primaryButtons(empty.container)[0] as HTMLButtonElement).disabled).toBe(true)
    })

    it("skip moves on without calling the action; nothing written means no refresh", async () => {
        const onAnswer = vi.fn(async () => ok(null))
        const { container } = renderFlow([q("maritalStatus"), q("income")], onAnswer)
        fireEvent.click(screen.getByText(COPY.skip))
        expect(container.querySelector("[data-factor]")!.getAttribute("data-factor")).toBe("income")
        fireEvent.click(screen.getByText(COPY.skip))
        await waitFor(() => expect(container.textContent).toContain(COPY.done))
        expect(onAnswer).not.toHaveBeenCalled()
        expect(refresh).not.toHaveBeenCalled()
    })

    it("an action failure keeps the question on screen with the failure line", async () => {
        const onAnswer = vi.fn(async (): Promise<AnswerResult> => ({ ok: false, error: "SAVE_FAILED" }))
        const { container } = renderFlow([q("pets")], onAnswer, "lifestyle")
        fireEvent.click(screen.getByText(COPY.yes))
        fireEvent.click(screen.getByText(COPY.continue))
        await waitFor(() => expect(container.querySelector('[role="alert"]')!.textContent).toContain(COPY.failed))
        expect(container.querySelector("[data-factor]")!.getAttribute("data-factor")).toBe("pets")
    })
})

describe("the health factor is gated on the Art. 9 opt-in", () => {
    it("renders the notice with the optional line — no checkbox, no primary button, nothing sent — until the person opts in", async () => {
        const onAnswer = vi.fn(async (_input: AnswerInput) => ok(null))
        const { container } = renderFlow([q("health")], onAnswer, "health")
        expect(container.textContent).toContain(COPY.healthGate.title)
        expect(container.textContent).toContain(COPY.healthGate.optional)
        expect(container.querySelectorAll('input[type="checkbox"]').length).toBe(0)
        expect(primaryButtons(container).length).toBe(0)
        expect(screen.queryByText(questionForFactor("health")!.prompt.el)).toBeNull()

        fireEvent.click(screen.getByText(COPY.healthGate.accept))
        expect(container.querySelectorAll('input[type="checkbox"]').length).toBeGreaterThan(1)
        expect(primaryButtons(container).length).toBe(1)
        fireEvent.click(screen.getByLabelText("Διαβήτης"))
        fireEvent.click(screen.getByText(COPY.continue))
        await waitFor(() => expect(onAnswer).toHaveBeenCalledTimes(1))
        expect(onAnswer.mock.calls[0]![0]).toEqual({ area: "health", factor: "health", value: ["diabetes"], healthConsent: true })
        expect(track).toHaveBeenCalledWith("risk_factor_answered", { area: "health", factor: "health", special_category: true })
    })

    it("declining is a skip: nothing is sent and the flow moves on", async () => {
        const onAnswer = vi.fn(async () => ok(null))
        const { container } = renderFlow([q("health"), q("age")], onAnswer, "health")
        fireEvent.click(screen.getByText(COPY.healthGate.decline))
        expect(container.querySelector("[data-factor]")!.getAttribute("data-factor")).toBe("age")
        expect(onAnswer).not.toHaveBeenCalled()
        expect(screen.getByLabelText(COPY.yearLabel)).toBeTruthy()
    })
})

// ── The model: which questions an area asks ───────────────────────────

const exact = { source: "onboarding" as const, precision: "exact" as const, at: AT }

function areasFor(profile: Record<string, unknown>, provenance: FactProvenanceMap = {}, policies: PolicyEvidenceInput[] = []) {
    const ctx = toLifeContext(profile as any, NOW)
    const assessments = assessRisks(ctx, policies.map((p) => ({ lineOfBusiness: p.lineOfBusiness, status: "active" })))
    const areas = buildAttentionAreas({
        priorities: deriveProtectionPriorities(ctx, null),
        assessments,
        coverage: buildCoverageModel(policies),
        provenance,
        ctx,
        needs: {},
        language: "el",
    })
    return { ctx, assessments, areas, provenance }
}

describe("areaQuestions — never a known factor, one question per column, requires first", () => {
    it("asks only the area's unknown factors, and never one whose column is known", () => {
        const { ctx, areas, provenance } = areasFor(
            { childrenCount: 1, dependentsCount: 2, employmentStatus: "employed", answeredFields: ["childrenCount", "dependentsCount", "employmentStatus"] },
            { childrenCount: exact, dependentsCount: exact, employmentStatus: exact }
        )
        const household = areas.find((a) => a.area === "household")!
        const asked = areaQuestions(household, ctx, provenance, "el", NOW).map((q) => q.factor)
        expect(asked).not.toContain("children")
        expect(asked).not.toContain("dependents")
        for (const factor of asked) {
            if (factor === "incomeDependency") continue
            expect(household.unknownFactors, factor).toContain(factor)
            expect((ctx.known as Record<string, boolean>)[factor]).toBe(false)
        }
        // §E: income dependency is re-asked by the household area while null.
        expect(asked).toContain("incomeDependency")
    })

    it("asks the deciding facts before the refining ones", () => {
        const { ctx, areas, provenance } = areasFor({})
        const household = areas.find((a) => a.area === "household")!
        const asked = areaQuestions(household, ctx, provenance, "el", NOW).map((q) => q.factor)
        const requires: Array<(typeof asked)[number]> = ["dependents", "children"]
        const firstSupport = asked.findIndex((f) => !requires.includes(f))
        for (const r of requires) expect(asked.indexOf(r)).toBeLessThan(firstSupport)
    })

    it("asks the residence question once even though two factors write the same column", () => {
        const { ctx, areas, provenance } = areasFor({})
        const residence = areas.find((a) => a.area === "residence")!
        const asked = areaQuestions(residence, ctx, provenance, "el", NOW)
        expect(asked.filter((q) => q.factor === "residence" || q.factor === "tenancy").length).toBe(1)
    })

    it("asks the Art. 9 factor only inside the health area, flagged", () => {
        const { ctx, areas, provenance } = areasFor({})
        for (const view of areas) {
            const health = areaQuestions(view, ctx, provenance, "el", NOW).filter((q) => q.factor === "health")
            if (view.area === "health") {
                expect(health.length).toBe(1)
                expect(health[0].specialCategory).toBe(true)
            } else expect(health.length).toBe(0)
        }
    })

    it("pre-fills from what the person said, never from a stored default", () => {
        const { ctx } = areasFor({ vehiclesCount: 2, hasPets: false, maritalStatus: "single", dateOfBirth: new Date("1990-03-01T00:00:00Z") })
        expect(prefillFor("vehicles", ctx, NOW)).toBe(2)
        expect(prefillFor("pets", ctx, NOW)).toBeNull()
        expect(prefillFor("children", ctx, NOW)).toBeNull()
        expect(prefillFor("maritalStatus", ctx, NOW)).toBe("single")
        expect(prefillFor("age", ctx, NOW)).toBe(1990)
    })
})

describe("buildAreaDetail — words from the single sources, no score", () => {
    const ROW: AreaPolicyRow = {
        id: "life-1",
        insurerName: "Interamerican",
        policyNumber: "L-1",
        lineOfBusiness: "life",
        status: "active",
        endDate: new Date("2027-09-04T00:00:00Z"),
        acordData: { policy: { expirationDate: "2027-09-04" }, conditions: [{ kind: "maintenance", text: "Ετήσιος έλεγχος", breachEffect: "reduces_claim", verifiable: true }] },
    }
    const GAP = { id: "g1", ruleId: "r1", slug: "no-life-cover", severity: "high", title: { el: "Εύρημα Χ", en: "Finding X" } }
    const LIFE: PolicyEvidenceInput = { id: "life-1", lineOfBusiness: "life", lifecycle: "active", detail: "analysed", coverages: [{ name: "Θάνατος" }], gaps: [GAP] }

    function model(policies: PolicyEvidenceInput[], deepAnalysisLocked = false, uncertaintyReasons: string[] = []) {
        const { ctx, assessments, areas, provenance } = areasFor(
            { childrenCount: 1, dependentsCount: 2, employmentStatus: "employed", answeredFields: ["childrenCount", "dependentsCount", "employmentStatus"] },
            {},
            policies
        )
        return buildAreaDetail({
            view: areas.find((a) => a.area === "household")!,
            assessments,
            ctx,
            provenance,
            policyRows: new Map(policies.map(() => [ROW.id, ROW])),
            uncertaintyReasons,
            deepAnalysisLocked,
            t,
            language: "el",
            now: NOW,
        })
    }

    it("names the policy through policy-identity, its status through getPolicyStatusView, and the limits word", () => {
        const m = model([LIFE])
        expect(m.lines.length).toBe(1)
        expect(m.lines[0].label).toBe("Interamerican (L-1)")
        expect(m.lines[0].statusWord).toBe(t.policyStatus.active)
        expect(m.lines[0].limitsWord).toBe(t.protection.attention.detail.limitsRead)
        expect(m.limitsUnread).toBe(false)
        expect(m.alignment).toBe("gap")
    })

    it("a summary-only line says the limits were not read; the upgrade path opens only on the free tier", () => {
        const summary = { ...LIFE, detail: "summary_only" as const, coverages: undefined, gaps: [] }
        expect(model([summary]).lines[0].limitsWord).toBe(t.protection.attention.detail.limitsUnread)
        expect(model([summary]).limitsUnread).toBe(true)
        expect(model([summary], true).deepAnalysisLocked).toBe(true)
    })

    it("a finding carries describeSeverity's label and its caveat", () => {
        const m = model([LIFE])
        expect(m.findings.length).toBe(1)
        expect(m.findings[0].severityLabel).toBe(t.dashboard.home.recPriorityHigh)
        expect(m.findings[0].caveat).toBe(t.dashboard.home.recPriorityNote)
        expect(m.findings[0].title).toBe("Εύρημα Χ")
    })

    it("groups the applicable risks' mitigations by kind, reduce/avoid as prevention, and reads the analysed policy's own conditions back", () => {
        const m = model([LIFE])
        expect(m.mitigations.transfer.length).toBeGreaterThan(0)
        expect(m.mitigations.retain.length + m.mitigations.prevention.length).toBeGreaterThan(0)
        for (const p of m.mitigations.prevention) expect(["reduce", "avoid"]).toContain(p.kind)
        expect(m.preventionFromPolicies.length).toBe(1)
        expect(m.preventionFromPolicies[0].text).toBe("Ετήσιος έλεγχος")
    })

    it("with nothing held, no policy line and no prevention from policies — the caveat is the surface's", () => {
        const m = model([])
        expect(m.anyHeld).toBe(false)
        expect(m.lines).toEqual([])
        expect(m.preventionFromPolicies).toEqual([])
    })

    it("opens the explanation before the first question when the person said they do not know what their policies cover", () => {
        expect(model([], false, ["dont_know_coverage"]).explainFirst).toBe(true)
        expect(model([]).explainFirst).toBe(false)
    })

    it("carries no score at any depth", () => {
        const seen: string[] = []
        const visit = (node: unknown): void => {
            if (!node || typeof node !== "object") return
            for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
                if (/score|percent|pct/i.test(k)) seen.push(k)
                visit(v)
            }
        }
        visit(model([LIFE]))
        expect(seen).toEqual([])
    })
})

// ── The detail surface, rendered ──────────────────────────────────────

import { AreaDetail } from "@/components/protection/AreaDetail"

describe("AreaDetail — the sections, the register, one primary button", () => {
    const COPY_ATT = t.protection.attention
    const LIFE_ROW: AreaPolicyRow = {
        id: "life-1",
        insurerName: "Interamerican",
        policyNumber: "L-1",
        lineOfBusiness: "life",
        status: "active",
        endDate: new Date("2027-09-04T00:00:00Z"),
        acordData: { policy: { expirationDate: "2027-09-04" }, conditions: [{ kind: "maintenance", text: "Ετήσιος έλεγχος", breachEffect: "reduces_claim", verifiable: true }] },
    }

    function detailFor(policies: PolicyEvidenceInput[], density: "explain_everything" | "show_what_matters" | "on_my_own" = "show_what_matters") {
        const ctx = toLifeContext({ childrenCount: 1, dependentsCount: 2, employmentStatus: "employed", answeredFields: ["childrenCount", "dependentsCount", "employmentStatus"] } as any, NOW)
        const assessments = assessRisks(ctx, policies.map((p) => ({ lineOfBusiness: p.lineOfBusiness, status: "active" })))
        const areas = buildAttentionAreas({
            priorities: deriveProtectionPriorities(ctx, null),
            assessments,
            coverage: buildCoverageModel(policies),
            provenance: {},
            ctx,
            needs: { guidancePreference: density },
            language: "el",
        })
        const model = buildAreaDetail({
            view: areas.find((a) => a.area === "household")!,
            assessments,
            ctx,
            provenance: {},
            policyRows: new Map(policies.map(() => [LIFE_ROW.id, LIFE_ROW])),
            uncertaintyReasons: [],
            deepAnalysisLocked: false,
            t,
            language: "el",
            now: NOW,
        })
        return render(<AreaDetail model={model} copy={COPY_ATT} flowCopy={COPY} onAnswer={async () => ok(null)} />)
    }

    it("renders the heading, the three triplet headings, the four sections, and exactly one primary button", () => {
        const { container } = detailFor([])
        expect(container.querySelector("h1")!.textContent).toBe(t.onboarding.protectionProfile.summary.domainLabel.household)
        for (const heading of [COPY_ATT.headings.why, COPY_ATT.headings.unknown, COPY_ATT.headings.next]) expect(container.textContent).toContain(heading)
        for (const title of [COPY_ATT.detail.risksTitle, COPY_ATT.detail.questionsTitle, COPY_ATT.detail.policiesTitle, COPY_ATT.detail.actionsTitle]) {
            expect(container.textContent).toContain(title)
        }
        expect(container.querySelectorAll(".pw-primary-button").length).toBe(1)
        expect(container.querySelector('a[href="/protection?lens=risk"]')).toBeTruthy()
    })

    it("with nothing held it says we have not SEEN a policy — never «δεν έχετε» — and offers the first policy", () => {
        const { container } = detailFor([])
        const policies = container.querySelector("section[aria-labelledby='area-policies-heading']")!
        expect(policies.textContent).toContain(COPY_ATT.detail.noPolicies)
        expect(policies.textContent).toContain(COPY_ATT.caveats.absence_not_evidence)
        expect(container.textContent).not.toMatch(/δεν έχετε/i)
        const add = policies.querySelector('a[href="/wallet/add"]')!
        expect(add.getAttribute("data-action")).toBe("check_first_policy")
    })

    it("with a held analysed policy it names it through policy-identity with its status word and the limits word, and reads its conditions back under «Πρόληψη»", () => {
        const LIFE: PolicyEvidenceInput = { id: "life-1", lineOfBusiness: "life", lifecycle: "active", detail: "analysed", coverages: [{ name: "Θάνατος" }], gaps: [] }
        const { container } = detailFor([LIFE])
        const line = container.querySelector('[data-policy="life-1"]')!
        expect(line.textContent).toContain("Interamerican (L-1)")
        expect(line.textContent).toContain(t.policyStatus.active)
        expect(line.textContent).toContain(COPY_ATT.detail.limitsRead)
        const prevention = container.querySelector('[data-mitigation-group="prevention"]')!
        expect(prevention.textContent).toContain(COPY_ATT.detail.prevention)
        expect(prevention.textContent).toContain("Ετήσιος έλεγχος")
        expect(prevention.querySelector('[data-prevention-source="policy"] a[data-action="prevention"]')!.getAttribute("href")).toBe("/wallet/life-1")
        expect(container.textContent).not.toContain(COPY_ATT.detail.noPolicies)
    })

    it("transfer items sit under «Για συζήτηση ή έλεγχο» with the adviser link — never a buy button", () => {
        const { container } = detailFor([])
        const transfer = container.querySelector('[data-mitigation-group="transfer"]')!
        expect(transfer.textContent).toContain(COPY_ATT.detail.transferLead)
        const discuss = transfer.querySelector('a[href="/agent"]')!
        expect(discuss.getAttribute("data-action")).toBe("contact_advisor")
        // No imperative purchase anywhere on the surface — the only CTAs are soft links.
        expect(container.textContent).not.toMatch(/Αγοράστε|Αγορά τώρα|Buy now/i)
        for (const a of Array.from(container.querySelectorAll("a[data-action]"))) expect(["check_first_policy", "review_finding", "prevention", "contact_advisor"]).toContain(a.getAttribute("data-action"))
    })

    it("honours the explanation density: expanded opens the triplet, collapsed folds why/next behind disclosures", () => {
        const expanded = detailFor([], "explain_everything")
        expect(expanded.container.querySelectorAll("header details").length).toBe(0)
        expanded.unmount()
        const collapsed = detailFor([], "show_what_matters")
        expect(collapsed.container.querySelectorAll("header details").length).toBe(2)
        expect(collapsed.container.querySelector("header")!.textContent).toContain(COPY_ATT.headings.unknown)
    })

    it("speaks the formal plural, «ασφαλιστήριο», no fear wording, no score", () => {
        const { container } = detailFor([])
        const text = container.textContent ?? ""
        expect(text).not.toMatch(/συμβόλαι|συμβολαί/i)
        expect(text).not.toMatch(/εκτεθειμ/i)
        expect(text).not.toMatch(/\bσου\b/)
        expect(text).not.toMatch(/\d+\s*%/)
    })
})
