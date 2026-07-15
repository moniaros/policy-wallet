/**
 * The statuses that count as an OPEN (still-relevant) gap.
 *
 * Gap instances are written as `open` (AI clarity pipeline) or `detected`
 * (rule-based detection), and move to `acknowledged` when the user has seen but
 * not resolved them — all three still represent live coverage gaps. `resolved`
 * and `dismissed` are closed.
 *
 * This set was silently divergent across surfaces (the policy detail page used
 * `'open'` only and under-counted; a wallet _count used `'active'`, which gaps
 * are never written with, and counted nothing). Import this everywhere so the
 * home tile, the coverage-insights list and the detail-page report can never
 * disagree again.
 */
export const OPEN_GAP_STATUSES = ["open", "detected", "acknowledged"] as const
