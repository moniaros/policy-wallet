/**
 * The flow's client state — a pure reducer so back, restore and failure are
 * testable without React. The server is the source of truth for answers; this
 * holds the in-memory draft and the navigation stack.
 */

import { computePath, nextStep, previousStep } from "./steps"
import type { ProtectionStepId } from "@/lib/services/protection-profile/vocabulary"
import type { ProtectionAnswers } from "@/lib/validations/protection-profile"

export type FlowStatus = "idle" | "saving" | "error"

export interface FlowState {
    current: ProtectionStepId
    answers: ProtectionAnswers
    /** Steps visited on the way here, for back. */
    visited: ProtectionStepId[]
    /** Explicit «Δεν είμαι σίγουρος/η» answers, by step. */
    unsureSteps: string[]
    /** Steps the server confirmed (drives resume and the ledger). */
    answeredSteps: string[]
    direction: 1 | -1
    status: FlowStatus
    errorCode: string | null
    /** When the current screen was entered — for elapsed_ms. */
    enteredAt: number
    /**
     * «Κρατήσαμε τις απαντήσεις σου.» — true only right after a `restore`
     * that brought answers back from the server (a page load onto a flow in
     * progress), and false again on the first navigation. It appeared after
     * an in-flow «Πίσω» when the screen read it off a render-time flag; the
     * reducer owns it now, so it cannot outlive the screen it was said on.
     */
    resumed: boolean
}

export type FlowAction =
    | { type: "answer"; step: ProtectionStepId; value: Record<string, unknown>; unsure?: boolean }
    | { type: "saving" }
    | { type: "saved"; step: ProtectionStepId; answeredSteps: string[]; next: ProtectionStepId | null; now?: number }
    | { type: "failed"; errorCode: string }
    | { type: "back"; now?: number }
    | { type: "goto"; step: ProtectionStepId; now?: number }
    | { type: "restore"; current: ProtectionStepId; answers: ProtectionAnswers; answeredSteps: string[]; unsureSteps: string[]; now?: number }

export function initialFlowState(current: ProtectionStepId, now = Date.now()): FlowState {
    return {
        current,
        answers: {},
        visited: [current],
        unsureSteps: [],
        answeredSteps: [],
        direction: 1,
        status: "idle",
        errorCode: null,
        enteredAt: now,
        resumed: false,
    }
}

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
    switch (action.type) {
        case "answer": {
            const answers = { ...state.answers, [action.step]: action.value } as ProtectionAnswers
            const unsureSteps = action.unsure
                ? [...new Set([...state.unsureSteps, action.step])]
                : state.unsureSteps.filter((s) => s !== action.step)
            return { ...state, answers, unsureSteps, status: "idle", errorCode: null }
        }
        case "saving":
            return { ...state, status: "saving", errorCode: null }
        case "saved": {
            const next = action.next ?? nextStep(action.step, state.answers)
            if (!next) return { ...state, status: "idle", answeredSteps: action.answeredSteps }
            return {
                ...state,
                current: next,
                visited: [...state.visited, next],
                answeredSteps: action.answeredSteps,
                direction: 1,
                status: "idle",
                errorCode: null,
                enteredAt: action.now ?? Date.now(),
                resumed: false,
            }
        }
        case "failed":
            // The answer stays selected; only the status changes, so «Δοκίμασε
            // ξανά» resends what the person already chose.
            return { ...state, status: "error", errorCode: action.errorCode }
        case "back": {
            const target = state.visited.length > 1 ? state.visited[state.visited.length - 2] : previousStep(state.current, state.answers)
            if (!target) return state
            return {
                ...state,
                current: target,
                visited: state.visited.length > 1 ? state.visited.slice(0, -1) : [target],
                direction: -1,
                status: "idle",
                errorCode: null,
                enteredAt: action.now ?? Date.now(),
                resumed: false,
            }
        }
        case "goto":
            return {
                ...state,
                current: action.step,
                visited: [...state.visited, action.step],
                direction: 1,
                status: "idle",
                errorCode: null,
                enteredAt: action.now ?? Date.now(),
                resumed: false,
            }
        case "restore": {
            const path = computePath(action.answers)
            const at = path.indexOf(action.current)
            return {
                ...state,
                current: action.current,
                answers: action.answers,
                answeredSteps: action.answeredSteps,
                unsureSteps: action.unsureSteps,
                visited: at >= 0 ? path.slice(0, at + 1) : [action.current],
                direction: 1,
                status: "idle",
                errorCode: null,
                enteredAt: action.now ?? Date.now(),
                // Resumed = there were answers to keep. A fresh start restores
                // an empty map and says nothing.
                resumed: Object.keys(action.answers).length > 0,
            }
        }
    }
}
