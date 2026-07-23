/**
 * Display formatting for AI-extracted amount strings (coverage limits,
 * deductibles, perk usage limits). Extraction preserves the document's raw
 * text, so values arrive as "1500000", "10%", "Varies", "2 επισκέψεις", …
 * Pure numbers format as el-GR currency ("1.500.000 €"); known English
 * placeholders localize; anything else passes through untouched.
 */
export function formatExtractedAmount(
    raw: string | number | null | undefined,
    lang: 'el' | 'en'
): string {
    const text = String(raw ?? '').trim()
    if (!text) return ''

    if (/^(varies|variable)$/i.test(text)) {
        return lang === 'el' ? 'Μεταβλητό' : 'Varies'
    }
    if (/^(unlimited|no limit)$/i.test(text)) {
        return lang === 'el' ? 'Απεριόριστο' : 'Unlimited'
    }

    // Pure numeric (optionally with a currency symbol / thousands separators
    // already attached) → locale-formatted euro amount.
    const numericText = text.replace(/[€\s]/g, '').replace(/,(?=\d{3}\b)/g, '')
    if (/^\d+(\.\d{1,2})?$/.test(numericText)) {
        const value = Number(numericText)
        if (Number.isFinite(value)) {
            const formatted = value.toLocaleString(lang === 'el' ? 'el-GR' : 'en-GB', {
                maximumFractionDigits: 2,
            })
            return `${formatted} €`
        }
    }

    return text
}
