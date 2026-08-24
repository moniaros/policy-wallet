/**
 * The monthly-ceiling choices the settings screen offers — shared between the
 * client control and the server action that validates the write, so the two
 * cannot drift. Client-safe on purpose: no imports, so the settings screen
 * does not pull the delivery pipeline (lib/notifications/cadence.ts reads the
 * database) into the bundle.
 *
 * §9.5 asks for "a small monthly ceiling, user-configurable". Small is the
 * point: these are choices about non-deadline outbound — digests, perk
 * reminders, product tips — and a ceiling of 100 would be a no-op wearing a
 * control's clothes. Absent/null = no ceiling, today's behaviour.
 */
export const MONTHLY_CEILING_CHOICES = [1, 2, 5, 10] as const

export function isMonthlyCeilingChoice(value: number): boolean {
    return (MONTHLY_CEILING_CHOICES as readonly number[]).includes(value)
}
