/**
 * The ONE sentence that discloses a plan's free trial, wherever that plan is sold.
 *
 * Owner decision 2026-10-22 (PW-C02-D10): Family keeps its 14-day trial, and every surface
 * that sells it says so — length and price are read from the plan row, never typed:
 *   «Δωρεάν δοκιμή {days} ημερών. Μετά χρεώνεται {price} τον μήνα, εκτός αν ακυρώσετε πριν λήξει.»
 * The annual variant states the annual price («τον χρόνο»). No «νέοι συνδρομητές» qualifier: the
 * live checkout grants the trial to every checkout (H-028 / PW-ENTITLE-01 item 1), and the copy
 * says what the code does.
 *
 * Guard: tests/unit/trial-disclosure-everywhere.test.ts — a surface that sells Family without
 * importing this module fails.
 */
import { formatPlanPrice } from "@/lib/pricing/format-plan-price"

type Bilingual = { el: string; en: string }
export type TrialPeriod = "monthly" | "annual"

/** null when the plan has no trial: nothing is disclosed that does not exist. */
export function trialDisclosure(trialDays: number, price: number, period: TrialPeriod): Bilingual | null {
    if (!(trialDays > 0)) return null
    const el = formatPlanPrice(price, "el")
    const en = formatPlanPrice(price, "en")
    return period === "annual"
        ? {
              el: `Δωρεάν δοκιμή ${trialDays} ημερών. Μετά χρεώνεται ${el} τον χρόνο, εκτός αν ακυρώσετε πριν λήξει.`,
              en: `Free ${trialDays}-day trial. Then ${en} a year is charged, unless you cancel before it ends.`,
          }
        : {
              el: `Δωρεάν δοκιμή ${trialDays} ημερών. Μετά χρεώνεται ${el} τον μήνα, εκτός αν ακυρώσετε πριν λήξει.`,
              en: `Free ${trialDays}-day trial. Then ${en} a month is charged, unless you cancel before it ends.`,
          }
}
