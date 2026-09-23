import { calendarDaysUntil } from "@/lib/policy-status"
import { parsePolicyDate } from "@/lib/wallet/policy-detail"
import { INSURANCE_BRANCHES, branchFamilyId } from "@/lib/insurance/taxonomy"

/** How many days before the green card lapses the reminder goes out (spec v2 §14). */
export const GREEN_CARD_WINDOW_DAYS = 30

/** Every branch id whose family is motor — the lines that carry a green card. */
export const MOTOR_FAMILY_IDS: readonly string[] = INSURANCE_BRANCHES
    .map((b) => b.id)
    .filter((id) => branchFamilyId(id) === "motor")

/**
 * The green-card expiry read off the extraction, as Athens calendar days from
 * `now` — or null when the schedule states no date, the date is unparseable,
 * or it is outside [0, window]. A date already past is not "expiring": the
 * gap rule of the same name has its own window, and a lapsed card is a
 * different sentence.
 */
export function greenCardDaysLeft(
    acordData: unknown,
    now: Date,
    windowDays: number = GREEN_CARD_WINDOW_DAYS
): { days: number; expiresOn: Date } | null {
    const raw = (acordData as { vehicle?: { greenCardExpiryDate?: unknown } } | null)?.vehicle?.greenCardExpiryDate
    const expiresOn = parsePolicyDate(raw)
    if (!expiresOn) return null
    const days = calendarDaysUntil(expiresOn, now)
    if (days < 0 || days > windowDays) return null
    return { days, expiresOn }
}
