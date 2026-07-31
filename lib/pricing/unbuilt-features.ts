/**
 * Agent plan flags whose value changes nothing at runtime.
 *
 * The agent plans advertise 17 boolean capabilities. Some of them are read by
 * nothing outside the schema and the plan defaults. That is worth declaring —
 * but it covers TWO different problems, and an earlier version of this file
 * conflated them, which produced a registry that was itself inaccurate:
 *
 *  1. **Absent capability.** Nothing implements it at all. Selling it takes
 *     money for nothing, so the only honest setting is `false` on every tier
 *     until it ships. `tests/unit/sold-feature-honesty.test.ts` asserts exactly
 *     that — this is the list with teeth.
 *  2. **Unenforced flag.** The capability EXISTS and works; the flag simply
 *     gates nothing, so every tier gets it regardless of what the plan row
 *     says. Nobody is denied what they paid for, so this is not a lie to a
 *     buyer — it is tier differentiation that is fictional. Fixing it means
 *     either gating the feature or dropping the flag.
 *
 * The distinction matters because the remedies are opposite: (1) must be
 * switched off, (2) must NOT be — switching it off would withdraw a working
 * feature from people who have it today.
 *
 * How the earlier list went wrong, recorded so it is not repeated: it inferred
 * "unbuilt" from "no file mentions this identifier". That measures whether the
 * FLAG is consulted, not whether the CAPABILITY exists. Three of its five
 * entries were fully built — collaboration threads have a model, a service, a
 * page and a timeline UI; private notes are `CollaborationMessage.isPrivate`
 * and are rendered — and were wrongly described here as having "no surface".
 */

/**
 * Sold flags with no implementation behind them. MUST be false on every tier.
 *
 * - `apiAccess` — no API surface, no key issuance, nothing.
 * - `sharedPolicyRoom` — `components/collaboration/types.ts` declares a
 *   `SharedPolicyRoomData` interface and nothing anywhere consumes it. It was
 *   sold as `true` on all three paid tiers, up to €99.99/mo.
 */
export const ABSENT_AGENT_CAPABILITIES = ["apiAccess", "sharedPolicyRoom"] as const

/**
 * Flags that gate nothing, over capabilities that do exist and ship to everyone.
 *
 * Left ON deliberately: the feature works and people use it. Where each one
 * actually lives, so the next reader does not repeat the mistake above:
 *
 * - `collaborationThreads` — `CollaborationThread` model,
 *   `lib/services/collaboration.service.ts`, `/collaboration/threads/[id]`.
 * - `asyncMessaging` — `CollaborationMessage` model,
 *   `components/collaboration/InlineMessagesTab.tsx`.
 * - `privateNotes` — `CollaborationMessage.isPrivate`, rendered by
 *   `components/collaboration/CollaborationTimeline.tsx`.
 */
export const UNENFORCED_AGENT_PLAN_FLAGS = [
    "collaborationThreads",
    "asyncMessaging",
    "privateNotes",
] as const

export type AbsentAgentCapability = (typeof ABSENT_AGENT_CAPABILITIES)[number]
export type UnenforcedAgentPlanFlag = (typeof UNENFORCED_AGENT_PLAN_FLAGS)[number]

/** True when a plan flag is advertised but backed by no implementation. */
export function isAbsentAgentCapability(feature: string): boolean {
    return (ABSENT_AGENT_CAPABILITIES as readonly string[]).includes(feature)
}

/** True when the capability exists but the plan flag gates nothing. */
export function isUnenforcedPlanFlag(feature: string): boolean {
    return (UNENFORCED_AGENT_PLAN_FLAGS as readonly string[]).includes(feature)
}

/** Every flag known to have no runtime effect, of either kind. */
export const PLAN_FLAGS_WITHOUT_EFFECT = [
    ...ABSENT_AGENT_CAPABILITIES,
    ...UNENFORCED_AGENT_PLAN_FLAGS,
] as const
