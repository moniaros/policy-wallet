/**
 * The ONE statement of what paying annually saves, derived from the two prices.
 *
 * H-021 (PW-CONTENT-02, 2026-10-22): «περίπου 10 μήνες αντί για 12» / «2 μήνες δωρεάν»
 * is true for the agent plans (annual = 10× monthly) and false for the policyholder
 * plans, whose production rows are Plus €4.99 / €39 (≈ 7.8 months of the monthly price)
 * and Family €8.99 / €79 (≈ 8.8). A saving is therefore never typed: it is the
 * difference between twelve monthly payments and the annual price, formatted from
 * the numbers, so an admin price change cannot leave a stale promise behind.
 *
 * Guard: tests/unit/plan-gating-parity.test.ts (annual-savings arm).
 */
import { formatPlanPrice } from "@/lib/pricing/format-plan-price"

type Bilingual = { el: string; en: string }

/** Whole euros saved per year, or 0 when annual is not cheaper. */
export function annualSavingEur(monthlyEur: number, annualEur: number): number {
    return Math.max(0, Math.round(monthlyEur * 12 - annualEur))
}

/** «Εξοικονομείτε ~21 € τον χρόνο» — null when annual saves nothing. */
export function annualSavingsLabel(monthlyEur: number, annualEur: number): Bilingual | null {
    const saved = annualSavingEur(monthlyEur, annualEur)
    if (saved <= 0) return null
    return {
        el: `Εξοικονομείτε ~${formatPlanPrice(saved, "el")} τον χρόνο`,
        en: `Save ~${formatPlanPrice(saved, "en")} a year`,
    }
}
