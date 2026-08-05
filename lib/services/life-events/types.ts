/**
 * Life Event Engine — domain model.
 *
 * Specification: docs/architecture/life-event-model.md
 *
 * The engine's founding rule, carried from the risk work and enforced here by
 * the shape of the types rather than by discipline:
 *
 *   **Life events write to CONTEXT. They never write recommendations.**
 *
 * An event's only channel to the rest of the product is a `ContextDelta` — an
 * assertion about the world. The risk catalog then decides, unchanged, what that
 * assertion means. There is deliberately no field on a definition in which a
 * product, a severity or a recommendation could be written, so the
 * product-trigger pattern ("you got married → buy life insurance") is not
 * something an author has to remember to avoid; it is unrepresentable.
 *
 * The practical test: deleting this module must leave the risk engine producing
 * correct — merely staler — answers.
 */

import type { ContextFactorKey } from "@/lib/services/gap-engine/life-context"

/** Bilingual copy. Greek is the product default; both are always populated. */
export interface Bilingual {
    en: string
    el: string
}

/** Spheres of life. Deliberately not insurance lines — that is the whole point. */
export const EVENT_DOMAINS = [
    "household",
    "residence",
    "property",
    "mobility",
    "work",
    "money",
    "health",
    "lifestyle",
] as const
export type EventDomain = (typeof EVENT_DOMAINS)[number]

/**
 * What kind of change this is. Kind determines an event's default shape before
 * any of its content is authored, which is what makes the taxonomy normalized
 * rather than a list.
 *
 * `disposal` and `status_change` are load-bearing: without events that REMOVE
 * exposure, a life-event model can only ever add risk, which is a ratchet rather
 * than a model of a life.
 */
export const EVENT_KINDS = [
    "acquisition",
    "disposal",
    "status_change",
    "threshold_crossing",
    "shock",
    "horizon",
] as const
export type EventKind = (typeof EVENT_KINDS)[number]

/**
 * Sensitivity governs whether an event may be spoken about at all.
 *
 * `sensitive` suppresses upselling in-window; `special_category` suppresses all
 * commercial messaging and may never be inferred, only declared. Peak
 * receptivity and peak vulnerability often coincide, and this is the field that
 * stops the product exploiting that.
 */
export const EVENT_SENSITIVITIES = ["standard", "sensitive", "special_category"] as const
export type EventSensitivity = (typeof EVENT_SENSITIVITIES)[number]

export const EVENT_URGENCIES = [
    "immediate",
    "high",
    "medium",
    "low",
    "informational",
] as const
export type EventUrgency = (typeof EVENT_URGENCIES)[number]

/** How we came to believe the event happened. Gates what the event may do. */
export const EVENT_SOURCES = [
    "customer_declared",
    "advisor_recorded",
    "profile_delta",
    "policy_derived",
    "document_inferred",
] as const
export type EventSource = (typeof EVENT_SOURCES)[number]

export type EventConfidence = "high" | "medium" | "low"

// ── Context delta — the only channel to the engine ───────────────────

export const DELTA_OPERATIONS = ["set", "increment", "clear", "mark_known"] as const
export type DeltaOperation = (typeof DELTA_OPERATIONS)[number]

/**
 * One assertion about the world.
 *
 * `column` is a `PolicyholderProfile` column; `factor` is the context factor it
 * settles. Both are required because they answer different questions: the column
 * says what to write, the factor says what the engine now knows — and it is the
 * factor that moves a risk out of `needs_review`, the state the engine uses for
 * "we have not asked".
 *
 * `mark_known` writes nothing and settles the factor anyway. Learning that
 * someone HAS children settles the `children` factor before we know how many.
 */
export interface ContextDelta {
    column: string
    factor: ContextFactorKey
    operation: DeltaOperation
    /** Required for `set` and `increment`; ignored otherwise. */
    value?: string | number | boolean | string[] | null
    /**
     * When true this delta may be applied even by a `derived` event. Defaults to
     * false, so inference can mark a factor known but cannot assert its value —
     * inference earns the right to ask, never the right to conclude.
     */
    inferable?: boolean
}

/** How long an event stays actionable, and how its urgency fades. */
export interface EventWindow {
    /** Days from DISCOVERY, not from occurrence — attention is on it now. */
    days: number
    decay: "linear" | "cliff" | "none"
}

export type DependencyKind =
    | "requires_event"
    | "requires_factor"
    | "conflicts_with"
    | "reverses"

export interface EventDependency {
    kind: DependencyKind
    /** Event id for event-kinds; factor key for `requires_factor`. */
    target: string
    /** Human-readable condition for `requires_factor`, e.g. "age >= 57". */
    note?: string
}

export interface DetectionSpec {
    source: EventSource
    confidence: EventConfidence
    /** Human-readable rule, for the audit trail. Not executed. */
    expression?: string
}

/**
 * One kind of thing that can happen to a person.
 *
 * Everything here is DATA. There is no behaviour hook, no callback and no
 * per-event branch anywhere in the engine — `applyLifeEvent` is generic over
 * `ContextDelta[]`, so adding an event is a registry row and never a code
 * change. That is the "avoid hardcoded logic" requirement made structural.
 */
export interface LifeEventDefinition {
    id: string
    domain: EventDomain
    kind: EventKind
    label: Bilingual
    /** What the customer is told this event means. Never a product. */
    description: Bilingual

    /** The ONLY channel to the risk engine. */
    contextDelta: ContextDelta[]

    /** Catalog risk ids that MAY become applicable. Never a promise. */
    introduces: string[]
    /** Catalog risk ids that stop applying. */
    retires: string[]

    urgency: EventUrgency
    window: EventWindow
    sensitivity: EventSensitivity
    dependsOn: EventDependency[]
    detection: DetectionSpec[]

    /** Events that undo this one. */
    reversedBy: string[]

    /**
     * True when the event may be declared more than once (another child, another
     * vehicle). False for one-time transitions like retirement.
     */
    repeatable: boolean
}

/** An event that happened, to a person, on a date. */
export interface LifeEventOccurrence {
    definitionId: string
    occurredAt: Date
    source: EventSource
    confidence: EventConfidence
    /** Free-form magnitude for events that carry one (loan amount, headcount). */
    magnitude?: number | null
}

/** The result of applying an event to a profile — pure, no persistence. */
export interface AppliedEvent {
    definitionId: string
    /** Column patch, safe to hand to Prisma. */
    patch: Record<string, unknown>
    /** Columns whose factor is now settled — unions into `answeredFields`. */
    answeredColumns: string[]
    /** Deltas skipped, with the reason. Never silently dropped. */
    skipped: Array<{ column: string; reason: string }>
}
