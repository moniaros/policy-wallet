/**
 * Feature-flag console logic, kept out of the server actions so it is testable
 * without a request — the same split lib/admin/notification-admin.ts uses.
 *
 * These rules decide whether an operator can turn off the email-verification
 * gate or send a percentage of live analyses to a different AI provider, so
 * they are worth being able to test directly.
 */

import { flagDefinition, isRolloutMode, type FlagDefinition } from "@/lib/flags/registry"

export interface FlagInput {
    key: string
    /** null means "clear the override and fall back to the environment". */
    enabled: boolean | null
    /** null means the same, for a canary flag's audience. */
    rollout: string | null
    notes: string | null
}

export interface FlagValidationError {
    field: string
    message: string
}

/**
 * Read the console form.
 *
 * The tri-state matters: the form distinguishes "on", "off" and "inherit", and
 * inherit has to arrive as null rather than false — otherwise clearing an
 * override would silently disable the feature.
 */
export function parseFlagForm(formData: FormData): FlagInput {
    const raw = (name: string): string | null => {
        const value = formData.get(name)
        if (value === null) return null
        const text = String(value).trim()
        return text === "" ? null : text
    }

    const enabledRaw = raw("enabled")
    const notes = raw("notes")

    return {
        key: String(formData.get("key") ?? "").trim(),
        enabled:
            enabledRaw === null || enabledRaw === "inherit" ? null : enabledRaw === "true",
        rollout: raw("rollout") === "inherit" ? null : raw("rollout"),
        notes: notes ? notes.slice(0, 2000) : null,
    }
}

export function validateFlagInput(
    input: FlagInput,
    definition: FlagDefinition | undefined
): FlagValidationError[] {
    const errors: FlagValidationError[] = []

    if (!definition) {
        errors.push({
            field: "key",
            message: `"${input.key}" is not a declared flag. Flags are declared in lib/flags/registry.ts next to the code that reads them; the console tunes them, it cannot invent them.`,
        })
        // Everything below is about a definition we do not have.
        return errors
    }

    if (definition.envOnly) {
        errors.push({
            field: "key",
            message: `"${input.key}" is environment-only and cannot be changed here. ${definition.envOnlyReason ?? ""}`.trim(),
        })
    }

    if (definition.kind === "canary") {
        if (input.rollout !== null && !isRolloutMode(input.rollout)) {
            errors.push({
                field: "rollout",
                message: `"${input.rollout}" is not a rollout mode. Use off, internal, 10, 50 or 100.`,
            })
        }
    } else if (input.rollout !== null) {
        errors.push({
            field: "rollout",
            message: `${input.key} is a boolean flag and has no audience of its own.`,
        })
    }

    // A safety-critical flag being switched ON is fine; switching it OFF is the
    // direction that removes a protection, so it has to be deliberate.
    if (definition.safetyCritical && input.enabled === false && !input.notes) {
        errors.push({
            field: "notes",
            message: `Turning off ${definition.label} removes a protection. Say why — the reason is kept in the version history.`,
        })
    }

    return errors
}

export interface FlagRowLike {
    enabled: boolean | null
    rollout: string | null
    notes: string | null
}

/** Field-level diff for the revision record. Same shape as the rule diff. */
export function computeFlagDiff(
    existing: FlagRowLike | null,
    input: FlagInput
): Record<string, { from: unknown; to: unknown }> {
    const changes: Record<string, { from: unknown; to: unknown }> = {}
    const before: FlagRowLike = existing ?? { enabled: null, rollout: null, notes: null }

    if (before.enabled !== input.enabled) {
        changes.enabled = { from: before.enabled, to: input.enabled }
    }
    if ((before.rollout ?? null) !== (input.rollout ?? null)) {
        changes.rollout = { from: before.rollout ?? null, to: input.rollout ?? null }
    }
    if ((before.notes ?? null) !== (input.notes ?? null)) {
        changes.notes = { from: before.notes ?? null, to: input.notes ?? null }
    }
    return changes
}

/**
 * A one-line description of what an operator is about to do, for the audit log.
 *
 * "Set ai.failover_openai to on" reads better in an incident review than a JSON
 * blob, and the blob is kept alongside it anyway.
 */
export function describeFlagChange(input: FlagInput): string {
    const definition = flagDefinition(input.key)
    const label = definition?.label ?? input.key
    if (definition?.kind === "canary") {
        return input.rollout === null
            ? `Cleared the audience override on ${label}`
            : `Set ${label} to ${input.rollout}`
    }
    if (input.enabled === null) return `Cleared the override on ${label}`
    return `Turned ${label} ${input.enabled ? "on" : "off"}`
}
