/**
 * The life-event chips (§8.10), in the brief's order, mapped onto the engine's
 * registry ids. Ten events (user decision 2026-08-30, A-15); the brief's
 * eleventh is unknown and recorded as [verify]. `health_change` exists in the
 * registry and stays OFF the chips (H-007, special-category data).
 *
 * The chip → registry mapping is what makes a life event the future bridge to
 * prevention: what changed → what risk may deserve attention → (later) what
 * preventive action may be available → whether the user wants to act.
 */
export const LIFE_EVENT_CHIPS = [
    { id: "marriage", key: "app.life.marriage" },
    { id: "birth", key: "app.life.child" },
    { id: "property_purchase", key: "app.life.newHome" },
    { id: "vehicle_purchase", key: "app.life.newCar" },
    { id: "job_change", key: "app.life.newJob" },
    { id: "mortgage", key: "app.life.loan" },
    { id: "divorce", key: "app.life.divorce" },
    { id: "relocation", key: "app.life.move" },
    { id: "retirement", key: "app.life.retirement" },
    { id: "other", key: "app.life.other" },
] as const

export type LifeEventChipId = (typeof LIFE_EVENT_CHIPS)[number]["id"]

/** Registry events that must never appear as a chip. */
export const LIFE_EVENTS_OFF_CHIPS: readonly string[] = ["health_change"]

export function isLifeEventChipId(id: string): id is LifeEventChipId {
    return LIFE_EVENT_CHIPS.some((c) => c.id === id)
}
