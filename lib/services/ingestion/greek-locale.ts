/**
 * Phase 4 — Greek locale parsing
 *
 * Pure parsers for the Greek market: amounts use '.' as the thousands separator and
 * ',' as the decimal (€50.000 = 50000; 1.234,56 = 1234.56), and dates are dd/mm/yyyy.
 * No existing reverse-parser in the codebase (only formatters), so these are new.
 */

/**
 * Parse a Greek-formatted monetary amount to a number, or null if unparseable.
 * Handles €50.000 (thousands dot), 1.234,56 (decimal comma), bare 50000, and a
 * leading currency symbol / trailing 'ευρώ'/'EUR'. Optimized for Greek input.
 */
export function parseGreekAmount(input: string | null | undefined): number | null {
  if (input == null) return null
  // Keep only digits and separators (drops €, spaces, 'ευρώ', etc.). Domain amounts
  // (premiums, limits) are non-negative, so a minus sign is not preserved.
  const cleaned = input.replace(/[^\d.,]/g, "").trim()
  if (!cleaned || !/\d/.test(cleaned)) return null

  const hasDot = cleaned.includes(".")
  const hasComma = cleaned.includes(",")

  let normalized: string
  if (hasDot && hasComma) {
    // Greek: dot = thousands, comma = decimal.
    normalized = cleaned.replace(/\./g, "").replace(",", ".")
  } else if (hasComma) {
    // Lone comma = decimal separator.
    normalized = cleaned.replace(",", ".")
  } else if (hasDot) {
    // Lone dot(s): thousands grouping when every trailing group is exactly 3 digits
    // (50.000 -> 50000, 1.234.567 -> 1234567); otherwise a decimal point (50.5).
    const parts = cleaned.split(".")
    const allTrailingAreTriples = parts.slice(1).every((p) => p.length === 3)
    normalized = allTrailingAreTriples ? parts.join("") : cleaned
  } else {
    normalized = cleaned
  }

  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

/**
 * Parse a Greek-format date (dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy; 2- or 4-digit year)
 * to an ISO yyyy-mm-dd string, or null if invalid. Passes through ISO input. Rejects
 * impossible dates (e.g. 31/02). NB: dd/mm — never mm/dd (US) for the Greek market.
 */
export function parseGreekDate(input: string | null | undefined): string | null {
  if (input == null) return null
  const s = input.trim()
  if (!s) return null

  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    return validateYmd(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]))
  }

  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/)
  if (!m) return null

  const day = Number(m[1])
  const month = Number(m[2])
  let year = Number(m[3])
  if (m[3].length === 2) year = year >= 70 ? 1900 + year : 2000 + year

  return validateYmd(year, month, day)
}

function validateYmd(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const date = new Date(Date.UTC(year, month - 1, day))
  // Round-trip guard: rejects overflow dates like 31/02 (which JS would roll over).
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }
  return `${year.toString().padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}
