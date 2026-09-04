/**
 * `needs.priorityCount` — ONE definition, every surface.
 *
 * The map's head said «5 σημεία», its lead «3 πράγματα», and the home's card
 * «6», all for what a reader takes to be the same number: how many things the
 * person's answers put on the list. Three derivations, one key. This is the
 * only one: the derived priorities (deriveProtectionPriorities) whose
 * importance is not `watch`, over the WHOLE set — high, medium and the areas
 * a fact could not settle (`needs_review`), because each of those is a row
 * the person is asked to look at. `watch` rows are context, not priorities.
 *
 * It is a count over the derived set, never over what a surface happens to
 * render: the home shows three rows and still reports the whole number, and
 * the map's lead sentence carries no number at all (lib/instrumentation/
 * count-keys.ts). The rendered-row counts live under `attention.*`.
 */

import type { ProtectionPriority } from "@/lib/services/protection-profile/derive-priorities"

export function isCountedPriority(priority: Pick<ProtectionPriority, "importance">): boolean {
    return priority.importance !== "watch"
}

export function priorityCount(priorities: readonly Pick<ProtectionPriority, "importance">[]): number {
    return priorities.filter(isCountedPriority).length
}
