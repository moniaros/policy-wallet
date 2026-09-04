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

    it("skip moves on without calling the action; nothing written means no refresh — and the done line says nothing was answered", async () => {
        const onAnswer = vi.fn(async () => ok(null))
        const { container } = renderFlow([q("maritalStatus"), q("income")], onAnswer)
        fireEvent.click(screen.getByText(COPY.skip))
        expect(container.querySelector("[data-factor]")!.getAttribute("data-factor")).toBe("income")
        fireEvent.click(screen.getByText(COPY.skip))
        await waitFor(() => expect(container.textContent).toContain(COPY.doneUnanswered))
        expect(container.textContent).not.toContain(COPY.done)
        expect(onAnswer).not.toHaveBeenCalled()
        expect(refresh).not.toHaveBeenCalled()
        expect(track).toHaveBeenCalledWith("risk_area_completed", { area: "household", remaining_unknown: 2 })
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

// ── A draft is bound to the FACTOR it was typed for, never to a position ──
//
// The list is the server's, and it recomposes under the flow after every
// write (the action revalidates the page). The definitive browser walk typed
// `1985` for «Ποια χρονιά γεννηθήκατε;», the list recomposed without `age`,
// the screen swapped to «Περίπου πόσες αποταμιεύσεις έχετε διαθέσιμες;» with
// 1985 still in the box, and «Συνέχεια» wrote `savingsAmount = 1985`
// {assessment, exact}. The flow kept an INDEX and a DRAFT across the
// recomposition; it now keeps a factor id and a draft bound to a factor.

describe("a draft is bound to the factor it was typed for — never to a position", () => {
    const year = () => screen.getByLabelText(COPY.yearLabel) as HTMLInputElement
    const euros = () => screen.getByLabelText(COPY.currencyLabel) as HTMLInputElement
    const inView = (c: HTMLElement) => c.querySelector("[data-factor]")!.getAttribute("data-factor")
    const flow = (questions: AreaQuestionView[], onAnswer: (i: AnswerInput) => Promise<AnswerResult>) => (
        <AreaQuestionFlow area="retirement" questions={questions} unknownFactorCount={questions.length} copy={COPY} onAnswer={onAnswer} />
    )

    it("the walk's defect: a year typed for «age» is never written to savingsAmount when the list recomposes under it", async () => {
        const onAnswer = vi.fn(async (_i: AnswerInput) => ok(null))
        const { container, rerender } = render(flow([q("age"), q("savings"), q("income")], onAnswer))
        fireEvent.change(year(), { target: { value: "1985" } })
        expect(year().value).toBe("1985")
        expect(container.querySelector('[role="status"]')).toBeNull()

        // The server's recomposition lands without `age` (settled by another surface meanwhile).
        rerender(flow([q("savings"), q("income")], onAnswer))
        expect(inView(container)).toBe("savings")
        expect(screen.queryByLabelText(COPY.yearLabel)).toBeNull()
        // The draft was DISCARDED, not re-homed: the amount box is empty, the primary is disabled, the person is told.
        expect(euros().value).toBe("")
        expect((primaryButtons(container)[0] as HTMLButtonElement).disabled).toBe(true)
        expect(container.querySelector('[role="status"]')!.textContent).toBe(COPY.resynced)
        expect(container.textContent).toContain(COPY.progress.replace("{n}", "1").replace("{m}", "2"))
        fireEvent.click(primaryButtons(container)[0])
        expect(onAnswer).not.toHaveBeenCalled()

        // A value typed for the question now in view goes to ITS column, and the notice clears.
        fireEvent.change(euros(), { target: { value: "20000" } })
        expect(container.querySelector('[role="status"]')).toBeNull()
        fireEvent.click(screen.getByText(COPY.continue))
        await waitFor(() => expect(onAnswer).toHaveBeenCalledTimes(1))
        expect(onAnswer.mock.calls[0]![0]).toEqual({ area: "retirement", factor: "savings", value: 20000 })
        for (const call of onAnswer.mock.calls) expect(call[0]).not.toMatchObject({ factor: "savings", value: 1985 })
    })

    it("a reorder keeps the draft on its factor: the question in view is found by id, the counter follows the live list", async () => {
        const onAnswer = vi.fn(async (_i: AnswerInput) => ok(null))
        const { container, rerender } = render(flow([q("age"), q("savings")], onAnswer))
        fireEvent.change(year(), { target: { value: "1985" } })
        expect(container.textContent).toContain(COPY.progress.replace("{n}", "1").replace("{m}", "2"))

        rerender(flow([q("income"), q("savings"), q("age")], onAnswer))
        expect(inView(container)).toBe("age")
        expect(year().value).toBe("1985")
        expect(container.querySelector('[role="status"]')).toBeNull()
        expect(container.textContent).toContain(COPY.progress.replace("{n}", "3").replace("{m}", "3"))
        fireEvent.click(screen.getByText(COPY.continue))
        await waitFor(() => expect(onAnswer).toHaveBeenCalledWith({ area: "retirement", factor: "age", value: 1985 }))
    })

    it("after an answer the flow shows the factor the server names — even one the list it rendered from did not carry yet", async () => {
        const onAnswer = vi.fn(async (_i: AnswerInput) => ok("mortgage", 1))
        const { container, rerender } = render(flow([q("age"), q("savings")], onAnswer))
        fireEvent.change(year(), { target: { value: "1985" } })
        fireEvent.click(screen.getByText(COPY.continue))
        await waitFor(() => expect(onAnswer).toHaveBeenCalledTimes(1))
        // Until the recomposed list lands, the first open question is in view — silently, no notice.
        await waitFor(() => expect(inView(container)).toBe("savings"))
        expect(container.querySelector('[role="status"]')).toBeNull()
        expect(euros().value).toBe("")
        rerender(flow([q("mortgage"), q("savings")], onAnswer))
        expect(inView(container)).toBe("mortgage")
        expect(container.textContent).toContain(COPY.progress.replace("{n}", "1").replace("{m}", "2"))
    })

    it("a factor the server names that the person skipped is not re-asked; the next open one is", async () => {
        const onAnswer = vi.fn(async (_i: AnswerInput) => ok("savings", 1))
        const { container } = render(flow([q("age"), q("savings"), q("income")], onAnswer))
        fireEvent.click(screen.getByText(COPY.skip))
        expect(inView(container)).toBe("savings")
        fireEvent.click(screen.getByText(COPY.skip))
        expect(inView(container)).toBe("income")
        fireEvent.change(euros(), { target: { value: "30000" } })
        fireEvent.click(screen.getByText(COPY.continue))
        await waitFor(() => expect(onAnswer).toHaveBeenCalledWith({ area: "retirement", factor: "income", value: 30000 }))
        // The server said `savings` is next; the person skipped it, and nothing else is open.
        await waitFor(() => expect(container.textContent).toContain(COPY.done))
    })

    it("inputs and both buttons are disabled while an answer is saving", async () => {
        let resolve!: (r: AnswerResult) => void
        const onAnswer = vi.fn(() => new Promise<AnswerResult>((r) => { resolve = r }))
        const { container } = render(flow([q("age"), q("savings")], onAnswer))
        fireEvent.change(year(), { target: { value: "1985" } })
        fireEvent.click(screen.getByText(COPY.continue))
        await waitFor(() => expect(year().disabled).toBe(true))
        expect((primaryButtons(container)[0] as HTMLButtonElement).disabled).toBe(true)
        expect((screen.getByText(COPY.skip) as HTMLButtonElement).disabled).toBe(true)
        expect(container.textContent).toContain(COPY.saving)
        resolve(ok("savings", 1))
        await waitFor(() => expect(inView(container)).toBe("savings"))
        expect(euros().disabled).toBe(false)
    })

    it("the flow never reads a question by position: no index state, the factor is the identity", () => {
        const src = readFileSync("components/protection/AreaQuestionFlow.tsx", "utf-8")
        expect(src).not.toMatch(/useState<number>|setIndex|questions\[index\]|index \+ 1/)
        expect(src).toMatch(/factor: question\.factor/)
    })
})

describe("the done line tells the truth about what was said", () => {
    it("after declining the health notice and skipping the rest, nothing was answered — «Εντάξει — το αφήνουμε για όταν θελήσετε.»", async () => {
        const onAnswer = vi.fn(async () => ok(null))
        const { container } = renderFlow([q("health"), q("age")], onAnswer, "health")
        fireEvent.click(screen.getByText(COPY.healthGate.decline))
        fireEvent.click(screen.getByText(COPY.skip))
        await waitFor(() => expect(container.textContent).toContain(COPY.doneUnanswered))
        expect(COPY.doneUnanswered).toBe("Εντάξει — το αφήνουμε για όταν θελήσετε.")
        expect(container.textContent).not.toContain(COPY.done)
        expect(onAnswer).not.toHaveBeenCalled()
        expect(refresh).not.toHaveBeenCalled()
    })

    it("after one answer and a skip, something was said — the «picture updated» line stays", async () => {
        const onAnswer = vi.fn(async () => ok("age", 1))
        const { container } = renderFlow([q("health"), q("age")], onAnswer, "health")
        fireEvent.click(screen.getByText(COPY.healthGate.accept))
        fireEvent.click(screen.getByLabelText("Διαβήτης"))
        fireEvent.click(screen.getByText(COPY.continue))
        await waitFor(() => expect(container.querySelector("[data-factor]")!.getAttribute("data-factor")).toBe("age"))
        fireEvent.click(screen.getByText(COPY.skip))
        await waitFor(() => expect(container.textContent).toContain(COPY.done))
        expect(container.textContent).not.toContain(COPY.doneUnanswered)
        expect(refresh).toHaveBeenCalled()
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

// ── The question rule (I6 / B6 / B7), the policies section (I2 / I3), the limits fact (B3 / P2) ──

import { readFileSync } from "node:fs"
import { AttentionAreasCard } from "@/components/protection/AttentionAreasCard"
import { areaListItems } from "@/components/protection/area-detail-model"
import { attentionSummary } from "@/lib/protection/attention-areas"

const stamp = (source: "onboarding" | "assessment" | "questionnaire", precision: "coarse" | "exact") => ({ source, precision, at: AT })

describe("areaQuestions — a question is open while one of its OWN columns is blank or written only coarsely", () => {
    it("asks the mortgage and loan AMOUNTS when the engine knows the factors only through proxy columns", () => {
        // residenceType «owned» makes `mortgage` known to the engine; hasLoans makes `loans` known. Neither amount was ever written.
        const { ctx, areas, provenance } = areasFor(
            { residenceType: "owned", hasLoans: true, dependentsCount: 1, answeredFields: ["residenceType", "hasLoans", "dependentsCount"] },
            { residenceType: stamp("onboarding", "exact"), hasLoans: stamp("onboarding", "exact"), dependentsCount: stamp("onboarding", "exact") }
        )
        expect(ctx.known.mortgage).toBe(true)
        expect(ctx.known.loans).toBe(true)
        const debt = areas.find((a) => a.area === "debt")!
        expect(debt.unknownFactors).not.toContain("mortgage")
        const asked = areaQuestions(debt, ctx, provenance, "el", NOW)
        const mortgage = asked.find((q) => q.factor === "mortgage")
        const loans = asked.find((q) => q.factor === "loans")
        expect(mortgage, "mortgageAmount is blank — the amount must be asked").toBeTruthy()
        expect(mortgage!.prefill).toBeNull()
        expect(loans, "loanAmount is blank — the amount must be asked").toBeTruthy()
        expect(loans!.prefill).toBeNull()
    })

    it("re-asks a coarsely known fact, pre-filled, so the person can confirm or correct the floor", () => {
        const { ctx, areas, provenance } = areasFor(
            { dependentsCount: 1, childrenCount: 0, employmentStatus: "employed", answeredFields: ["dependentsCount", "childrenCount", "employmentStatus"] },
            { dependentsCount: stamp("onboarding", "coarse"), childrenCount: stamp("onboarding", "exact"), employmentStatus: stamp("onboarding", "exact") }
        )
        const household = areas.find((a) => a.area === "household")!
        expect(household.refinableFactors).toContain("dependents")
        const asked = areaQuestions(household, ctx, provenance, "el", NOW)
        const dependents = asked.find((q) => q.factor === "dependents")
        expect(dependents).toBeTruthy()
        expect(dependents!.prefill).toBe(1)
        expect(asked.map((q) => q.factor)).not.toContain("children")
        // The flow labels it as pre-filled, to confirm or correct.
        renderFlow([q("dependents", { prefill: 1 })], async () => ok(null))
        expect(screen.getByText(COPY.prefilled)).toBeTruthy()
        expect(COPY.prefilled).toBe("Προσυμπληρωμένο — επιβεβαιώστε ή διορθώστε.")
    })

    it("never re-asks the year of birth the assessment itself wrote — a year is as exact as that question gets", () => {
        // No private pension: the retirement risk applies, and it requires the age.
        const profile = { dateOfBirth: new Date("1985-07-01T00:00:00Z"), retirementPlanning: false, annualIncome: 30000, answeredFields: ["dateOfBirth", "retirementPlanning", "annualIncome"] }
        const { ctx, areas, provenance } = areasFor(profile, {
            dateOfBirth: stamp("assessment", "coarse"),
            retirementPlanning: stamp("assessment", "exact"),
            annualIncome: stamp("assessment", "exact"),
        })
        const retirement = areas.find((a) => a.area === "retirement")!
        expect(retirement.exposure.risks.some((r) => r.id === "retirement_shortfall" && r.status !== "not_applicable")).toBe(true)
        expect(areaQuestions(retirement, ctx, provenance, "el", NOW).map((q) => q.factor)).not.toContain("age")
        // But an onboarding bucket IS refined.
        const coarse = areasFor(profile, {
            dateOfBirth: stamp("onboarding", "coarse"),
            retirementPlanning: stamp("assessment", "exact"),
            annualIncome: stamp("assessment", "exact"),
        })
        const again = coarse.areas.find((a) => a.area === "retirement")!
        expect(areaQuestions(again, coarse.ctx, coarse.provenance, "el", NOW).map((q) => q.factor)).toContain("age")
    })

    it("B7: a salaried person is never asked «Έχετε δική σας επιχείρηση;» — a refining factor is asked only for an established exposure", () => {
        const { ctx, areas, provenance } = areasFor(
            { employmentStatus: "employed", ownsBusiness: false, answeredFields: ["employmentStatus", "ownsBusiness"] },
            { employmentStatus: stamp("onboarding", "exact"), ownsBusiness: stamp("onboarding", "coarse") }
        )
        for (const view of areas) {
            const factors = areaQuestions(view, ctx, provenance, "el", NOW).map((q) => q.factor)
            expect(factors, view.area).not.toContain("businessOwnership")
        }
        // The same factor IS asked once the exposure is established — a self-employed person refining professional liability.
        const self = areasFor(
            { employmentStatus: "self_employed", ownsBusiness: false, answeredFields: ["employmentStatus", "ownsBusiness"] },
            { employmentStatus: stamp("onboarding", "exact"), ownsBusiness: stamp("onboarding", "coarse") }
        )
        const work = self.areas.find((a) => a.area === "work")!
        expect(areaQuestions(work, self.ctx, self.provenance, "el", NOW).map((q) => q.factor)).toContain("businessOwnership")
    })
})

describe("the policies section — what answered the area, from wherever it is listed (I2)", () => {
    const LIFE_ROW: AreaPolicyRow = {
        id: "life-1",
        insurerName: "Interamerican",
        policyNumber: "L-1",
        lineOfBusiness: "life",
        status: "active",
        endDate: new Date("2027-09-04T00:00:00Z"),
        acordData: { policy: { expirationDate: "2027-09-04" } },
    }
    const LIFE: PolicyEvidenceInput = { id: "life-1", lineOfBusiness: "life", lifecycle: "active", detail: "summary_only", gaps: [] }
    /** A person with a mortgage: the debt area's risk is answered by the LIFE policy, which is listed under the household. */
    function debtDetail(policies: PolicyEvidenceInput[], deepAnalysisLocked = false) {
        const { ctx, assessments, areas, provenance } = areasFor(
            { mortgageAmount: 120000, hasLoans: false, dependentsCount: 2, answeredFields: ["mortgageAmount", "hasLoans", "dependentsCount"] },
            { mortgageAmount: stamp("onboarding", "exact"), hasLoans: stamp("onboarding", "exact"), dependentsCount: stamp("onboarding", "exact") },
            policies
        )
        const view = areas.find((a) => a.area === "debt")!
        const model = buildAreaDetail({
            view,
            assessments,
            ctx,
            provenance,
            policyRows: new Map(policies.map((p) => [p.id, LIFE_ROW])),
            uncertaintyReasons: [],
            deepAnalysisLocked,
            t,
            language: "el",
            now: NOW,
        })
        return { view, model, ...render(<AreaDetail model={model} copy={t.protection.attention} flowCopy={COPY} onAnswer={async () => ok(null)} />) }
    }

    it("lists the line from the other area, labelled, and never says «Δεν έχουμε δει ασφαλιστήριο» under «Φαίνεται να καλύπτεται»", () => {
        const { view, model, container } = debtDetail([LIFE])
        expect(view.alignment).toBe("appears_covered")
        expect(view.protection.lines).toEqual([])
        expect(model.answeredBy.length).toBe(1)
        const header = container.querySelector("header")!
        expect(header.querySelector("[data-alignment-line]")!.textContent).toContain(t.protection.attention.alignment.appears_covered)
        const policies = container.querySelector("section[aria-labelledby='area-policies-heading']")!
        const line = policies.querySelector('[data-policy="life-1"][data-answered-by="true"]')!
        expect(line, "the answering line renders").toBeTruthy()
        expect(line.textContent).toContain("Interamerican (L-1)")
        expect(line.textContent).toContain(
            t.protection.attention.detail.fromOtherArea.replace("{area}", t.onboarding.protectionProfile.summary.domainLabel.household)
        )
        expect(policies.textContent).not.toContain(t.protection.attention.detail.noPolicies)
        expect(policies.querySelector('a[href="/wallet/add"]')).toBeNull()
    })

    it("I3: the header carries the limits caveat inline with the word, never behind a disclosure", () => {
        const { view, container } = debtDetail([LIFE])
        expect(view.limitsUnread).toBe(true)
        const line = container.querySelector("header [data-alignment-line]")!
        expect(line.textContent).toBe(`${t.protection.attention.alignment.appears_covered} — ${t.protection.attention.caveats.limits_unread}`)
        expect(line.closest("details")).toBeNull()
    })

    it("with nothing seen anywhere, the «not seen» sentence and the first-policy ask render", () => {
        const { model, container } = debtDetail([])
        expect(model.answeredBy).toEqual([])
        const policies = container.querySelector("section[aria-labelledby='area-policies-heading']")!
        expect(policies.textContent).toContain(t.protection.attention.detail.noPolicies)
        expect(policies.querySelector('a[href="/wallet/add"]')).toBeTruthy()
    })

    it("B3: unread limits on a locked tier are stated as a fact with a text link — no card, no button; and the locked view is emitted once", () => {
        track.mockClear()
        const { model, container } = debtDetail([LIFE], true)
        expect(model.limitsUnread && model.deepAnalysisLocked).toBe(true)
        const locked = container.querySelector("[data-limits-locked]")!
        expect(locked, "the fact renders").toBeTruthy()
        expect(locked.textContent).toContain(t.protection.attention.detail.upgradeHint)
        expect(locked.querySelector(".pw-subcard")).toBeNull()
        const link = locked.querySelector('a[href="/upgrade?reason=feature_locked"]')!
        expect(link.className).not.toContain("pw-soft-button")
        expect(link.className).not.toContain("pw-primary-button")
        expect(track).toHaveBeenCalledWith("feature_locked_viewed", { feature_requested: "limits", screen: "protection_area", area: "debt" })
        expect(track.mock.calls.filter((c) => c[0] === "feature_locked_viewed").length).toBe(1)
        // Still exactly one primary button on the page (the question's continue).
        expect(container.querySelectorAll(".pw-primary-button").length).toBeLessThanOrEqual(1)
    })

    it("B3: on a tier that can run the analysis, no lock renders and nothing is emitted", () => {
        track.mockClear()
        const { container } = debtDetail([LIFE], false)
        expect(container.querySelector("[data-limits-locked]")).toBeNull()
        expect(track.mock.calls.some((c) => c[0] === "feature_locked_viewed")).toBe(false)
    })

    it("P2: both /protection surfaces read the ONE deep-analysis predicate, never a tier literal", () => {
        for (const file of ["app/(protected)/protection/areas/[area]/page.tsx", "app/(protected)/protection/page.tsx"]) {
            const src = readFileSync(file, "utf-8")
            const gates = [...src.matchAll(/(?:isDeepAnalysisLocked|deepAnalysisLocked):\s*([^,\n]+)/g)].map((m) => m[1].trim())
            expect(gates.length, `${file} passes the deep-analysis gate`).toBeGreaterThan(0)
            for (const gate of gates) expect(gate, file).toBe("!canRunDeepAnalysis(entitlements.tier)")
        }
    })
})

describe("the lapsed-only area on the detail (I9)", () => {
    it("the header speaks the lapsed caveat instead of «δεν έχουμε δει», and the policies section lists the expired line without the «not seen» sentence", () => {
        const EXPIRED: PolicyEvidenceInput = { id: "life-1", lineOfBusiness: "life", lifecycle: "expired", detail: "summary_only", gaps: [] }
        const ROW: AreaPolicyRow = {
            id: "life-1",
            insurerName: "Interamerican",
            policyNumber: "L-1",
            lineOfBusiness: "life",
            status: "expired",
            endDate: new Date("2026-01-01T00:00:00Z"),
            acordData: { policy: { expirationDate: "2026-01-01" } },
        }
        const ctx = toLifeContext({ childrenCount: 1, dependentsCount: 2, employmentStatus: "employed", answeredFields: ["childrenCount", "dependentsCount", "employmentStatus"] } as any, NOW)
        const assessments = assessRisks(ctx, [])
        const areas = buildAttentionAreas({
            priorities: deriveProtectionPriorities(ctx, null),
            assessments,
            coverage: buildCoverageModel([EXPIRED]),
            provenance: {},
            ctx,
            needs: {},
            language: "el",
        })
        const view = areas.find((a) => a.area === "household")!
        expect(view.lapsedOnly).toBe(true)
        const model = buildAreaDetail({
            view,
            assessments,
            ctx,
            provenance: {},
            policyRows: new Map([[ROW.id, ROW]]),
            uncertaintyReasons: [],
            deepAnalysisLocked: false,
            t,
            language: "el",
            now: NOW,
        })
        const { container } = render(<AreaDetail model={model} copy={t.protection.attention} flowCopy={COPY} onAnswer={async () => ok(null)} />)
        const line = container.querySelector("header [data-alignment-line]")!
        expect(line.textContent).toBe(t.protection.attention.caveats.lapsed_only)
        expect(container.querySelector("header")!.textContent).not.toContain(t.protection.attention.alignment.not_yet_checked)
        const policies = container.querySelector("section[aria-labelledby='area-policies-heading']")!
        expect(policies.querySelector('[data-policy="life-1"]')).toBeTruthy()
        expect(policies.textContent).not.toContain(t.protection.attention.detail.noPolicies)
        // The first-policy ask stays: nothing of this area's own is in force.
        expect(policies.querySelector('a[href="/wallet/add"]')).toBeTruthy()
        expect(container.textContent).not.toMatch(/δεν έχετε/i)
        // The list row agrees with the header.
        const list = render(<AttentionAreasCard items={areaListItems(areas, "el", t.protection.attention)} summary={attentionSummary(areas)} copy={t.protection.attention} />)
        expect(list.container.querySelector('a[data-area="household"] [data-alignment-line]')!.textContent).toBe(t.protection.attention.caveats.lapsed_only)
    })
})
