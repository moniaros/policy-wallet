/**
 * Prevention brief — the Daily Health Nudge. Small, general habits, the SAME
 * for everyone: nothing here reads age, sex, answers or any policy, so no
 * nudge can be read as an individual medical instruction. The text lives in
 * the translations bundle (`wellness.nudges.<id>`); this module only decides
 * which one belongs to a day.
 */
export const NUDGE_IDS = [
    "move_walk15", "move_stairs", "move_stretch", "move_afterMeal", "move_stopEarly", "move_shoulders",
    "water_glassNow", "water_bottle", "water_morning", "water_swapSoda", "water_withMeals", "water_beforeTask",
    "sleep_screenOff", "sleep_sameTime", "sleep_airRoom", "sleep_phoneOut", "sleep_dimLights", "sleep_noLateCoffee",
    "rest_breaths", "rest_screenBreak", "rest_daylight", "rest_callSomeone", "rest_farLook", "rest_oneGoodThing",
    "food_fruit", "food_halfVeg", "food_noScreen", "food_nuts", "food_slowly", "food_prepSnack",
] as const
export type NudgeId = (typeof NUDGE_IDS)[number]

/** The Athens calendar date, YYYY-MM-DD — one nudge per Athens day. */
export function athensDate(now: Date = new Date()): string {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Athens", year: "numeric", month: "2-digit", day: "2-digit" }).format(now)
}

/** Deterministic: the same day gives every viewer, and the push, the same nudge. */
export function nudgeForDate(now: Date = new Date()): NudgeId {
    const day = Math.floor(Date.parse(`${athensDate(now)}T00:00:00Z`) / 86_400_000)
    return NUDGE_IDS[((day % NUDGE_IDS.length) + NUDGE_IDS.length) % NUDGE_IDS.length]
}

/** The dates a person may pick for «later»: tomorrow … one year ahead (Athens). */
export function reminderWindow(now: Date = new Date()): { min: string; max: string } {
    const today = new Date(`${athensDate(now)}T00:00:00Z`)
    const min = new Date(today.getTime() + 86_400_000).toISOString().slice(0, 10)
    const max = new Date(Date.UTC(today.getUTCFullYear() + 1, today.getUTCMonth(), today.getUTCDate())).toISOString().slice(0, 10)
    return { min, max }
}
