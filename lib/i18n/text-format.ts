export function isGreekLocale(locale?: string): boolean {
    return (locale || "").toLowerCase().startsWith("el")
}

export function toGreekUppercaseNoAccents(text: string, locale?: string): string {
    if (!text) return text
    if (!isGreekLocale(locale)) return text

    // Remove combining accent marks first, then uppercase with Greek locale rules.
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleUpperCase("el-GR")
}

export function normalizeCoverageKey(value: string): string {
    return (value || "")
        .trim()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .toUpperCase()
}

export function localizeCoverageName(
    rawName: string,
    coverageNames: Record<string, string> | undefined
): string {
    const fallback = String(rawName || "")
    if (!coverageNames) return fallback

    if (coverageNames[fallback]) return coverageNames[fallback]

    const normalized = normalizeCoverageKey(fallback)
    if (coverageNames[normalized]) return coverageNames[normalized]

    for (const [key, value] of Object.entries(coverageNames)) {
        if (normalizeCoverageKey(key) === normalized) {
            return value
        }
    }

    return fallback
}

