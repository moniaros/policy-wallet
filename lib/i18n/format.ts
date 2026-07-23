/**
 * Locale-aware formatting helpers — the single place that decides how numbers,
 * money and dates are rendered.
 *
 * Two problems this exists to end:
 *
 * 1. **Locale drift.** ~23 files each built their own `Intl.NumberFormat`, and
 *    they disagreed: 41 sites said `en-US` while 25 said `en-GB`, so a Greek
 *    user reading English saw US date order (MM/DD) on one screen and UK
 *    (DD/MM) on the next. `en-GB` wins — it is what `t.common.locale` in
 *    `translations/en.ts` actually declares, and this is a euro-denominated,
 *    day-month-year market. All 41 `en-US` sites were normalized.
 *
 * 2. **Hydration mismatches.** A bare `toLocaleDateString()` / `toLocaleString()`
 *    resolves against the *runtime's* locale and timezone, which differ between
 *    the server (UTC) and the user's browser (Europe/Athens). That produced
 *    Sentry POLICYWALLET-8. Every helper here pins both, so server and client
 *    always render the same string.
 */

export type FormatLanguage = 'el' | 'en'

/** The product operates in Greece; dates are meaningful in Athens time. */
export const APP_TIME_ZONE = 'Europe/Athens'

const LOCALES: Record<FormatLanguage, string> = {
    el: 'el-GR',
    en: 'en-GB',
}

/**
 * `en-GB` — not `en-US` — is deliberate for the English locale: this is a
 * euro-denominated, day-month-year, metric market. English here means "English
 * for a Greek product", not "American".
 */
export function resolveLocale(language: FormatLanguage | string | null | undefined): string {
    return LOCALES[(language as FormatLanguage)] ?? LOCALES.el
}

function toDate(value: Date | string | number | null | undefined): Date | null {
    if (value === null || value === undefined || value === '') return null
    const date = value instanceof Date ? value : new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
}

/** Money. Defaults to whole euros — pass `decimals` for cent-accurate display. */
export function formatCurrency(
    amount: number | null | undefined,
    language: FormatLanguage,
    options: { currency?: string; decimals?: number } = {}
): string {
    if (amount === null || amount === undefined || !Number.isFinite(amount)) return '—'
    const { currency = 'EUR', decimals = 0 } = options
    return new Intl.NumberFormat(resolveLocale(language), {
        style: 'currency',
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(amount)
}

/** Plain number (counts, percentages-as-numbers, scores). */
export function formatNumber(
    value: number | null | undefined,
    language: FormatLanguage,
    options: Intl.NumberFormatOptions = {}
): string {
    if (value === null || value === undefined || !Number.isFinite(value)) return '—'
    return new Intl.NumberFormat(resolveLocale(language), options).format(value)
}

/** Date only. Timezone-pinned, so SSR and the browser agree. */
export function formatDate(
    value: Date | string | number | null | undefined,
    language: FormatLanguage,
    options: Intl.DateTimeFormatOptions = {}
): string {
    const date = toDate(value)
    if (!date) return '—'
    return new Intl.DateTimeFormat(resolveLocale(language), {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: APP_TIME_ZONE,
        ...options,
    }).format(date)
}

/** Date + time. Same pinning as formatDate. */
export function formatDateTime(
    value: Date | string | number | null | undefined,
    language: FormatLanguage,
    options: Intl.DateTimeFormatOptions = {}
): string {
    const date = toDate(value)
    if (!date) return '—'
    return new Intl.DateTimeFormat(resolveLocale(language), {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: APP_TIME_ZONE,
        ...options,
    }).format(date)
}

/** Time only (e.g. chat message stamps). Same pinning as formatDate. */
export function formatTime(
    value: Date | string | number | null | undefined,
    language: FormatLanguage,
    options: Intl.DateTimeFormatOptions = {}
): string {
    const date = toDate(value)
    if (!date) return '—'
    return new Intl.DateTimeFormat(resolveLocale(language), {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: APP_TIME_ZONE,
        ...options,
    }).format(date)
}
