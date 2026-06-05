/**
 * Phase 4 — Deterministic field extractors ($0)
 *
 * Pure regex/alias extraction over the raw text from Phase 2/3. The cheapest, first
 * pass; only the ambiguous remainder ever reaches the model fallback. Reference data
 * (insurer aliases, coverage taxonomy) is passed in so every function stays pure and
 * unit-testable. Amounts/dates go through the Greek-locale parsers.
 */

import type { FieldValue, NormalizedCoverage } from "./contracts"
import { parseGreekAmount, parseGreekDate } from "./greek-locale"
import { normalizeGreekForMatch } from "./text-extraction"

/** Labelled placeholder shown when no insurer is recognized — never null/"Unknown". */
export const UNKNOWN_INSURER_PLACEHOLDER = "Άγνωστος ασφαλιστής"

export interface InsurerAlias {
  canonicalName: string
  aliases: string[]
}

export interface TaxonomyEntry {
  key: string
  lineOfBusiness: string
  aliases: string[]
}

// ── Policy number ─────────────────────────────────────────────────────────────

const POLICY_NUMBER_RE =
  /(?:Αριθμός\s+Συμβολαίου|Αρ\.?\s*Συμβολαίου|Αριθμός\s+Ασφαλιστηρίου|Policy\s*(?:No\.?|Number)|Συμβόλαιο\s*Ν[οο]\.?)\s*[:.#-]?\s*([A-Za-z0-9][A-Za-z0-9/-]{4,})/

export function extractPolicyNumber(text: string): FieldValue<string> | null {
  const m = text.match(POLICY_NUMBER_RE)
  if (!m?.[1]) return null
  return { value: m[1].trim(), confidence: 0.9, source: "regex", evidence: m[0].slice(0, 80) }
}

// ── Premium ───────────────────────────────────────────────────────────────────

const PREMIUM_STRONG_RE =
  /(?:Συνολικ[όο]\s+Ασφάλιστρο|Συνολικ[άα]\s+Ασφάλιστρα|Μικτ[όο]\s+Ασφάλιστρο|Πληρωτέο\s+Ποσό|Total\s+Premium)\s*[:.-]?\s*€?\s*([\d.,]+)/i
const PREMIUM_WEAK_RE = /Ασφάλιστρ[αο]\s*[:.-]?\s*€?\s*([\d.,]+)/i

export function extractPremium(text: string): FieldValue<number> | null {
  const strong = text.match(PREMIUM_STRONG_RE)
  if (strong?.[1]) {
    const amt = parseGreekAmount(strong[1])
    if (amt != null) {
      return { value: amt, confidence: 0.85, source: "regex", evidence: strong[0].slice(0, 80) }
    }
  }
  const weak = text.match(PREMIUM_WEAK_RE)
  if (weak?.[1]) {
    const amt = parseGreekAmount(weak[1])
    if (amt != null) {
      return { value: amt, confidence: 0.6, source: "regex", evidence: weak[0].slice(0, 80) }
    }
  }
  return null
}

// ── Dates (start / end) ─────────────────────────────────────────────────────────

const DATE_TOKEN = String.raw`[0-3]?\d[/.\-][01]?\d[/.\-]\d{2,4}`

const DATE_RANGE_RE = new RegExp(
  String.raw`(?:Διάρκεια[^0-9]{0,30}|Από)\s*(` +
    DATE_TOKEN +
    String.raw`)\s*(?:έως|μέχρι|Έως|Μέχρι|–|-)\s*(` +
    DATE_TOKEN +
    String.raw`)`,
  "i",
)

function labelledDate(text: string, label: string, confidence: number): FieldValue<string> | null {
  const re = new RegExp(label + String.raw`[^0-9]{0,40}?(` + DATE_TOKEN + ")", "i")
  const m = text.match(re)
  if (!m?.[1]) return null
  const iso = parseGreekDate(m[1])
  if (!iso) return null
  return { value: iso, confidence, source: "regex", evidence: m[0].slice(0, 80) }
}

export function extractDates(text: string): {
  startDate: FieldValue<string> | null
  endDate: FieldValue<string> | null
} {
  const range = text.match(DATE_RANGE_RE)
  if (range?.[1] && range?.[2]) {
    const start = parseGreekDate(range[1])
    const end = parseGreekDate(range[2])
    if (start && end) {
      const evidence = range[0].slice(0, 80)
      return {
        startDate: { value: start, confidence: 0.85, source: "regex", evidence },
        endDate: { value: end, confidence: 0.85, source: "regex", evidence },
      }
    }
  }
  return {
    startDate: labelledDate(text, "(?:Έναρξη|Ημερομηνία\\s+Έναρξης|Από)", 0.75),
    endDate: labelledDate(text, "(?:Λήξη|Ημερομηνία\\s+Λήξης|Έως|Μέχρι)", 0.75),
  }
}

// ── Insurer normalization ───────────────────────────────────────────────────────

/**
 * Resolve the insurer from raw text via per-insurer aliases (InsurerTemplate). Returns
 * a safe labelled placeholder (never null / "Unknown Insurer") when unrecognized.
 */
export function normalizeInsurer(text: string, insurers: InsurerAlias[]): FieldValue<string> {
  const hay = normalizeGreekForMatch(text)
  for (const insurer of insurers) {
    for (const alias of insurer.aliases) {
      const needle = normalizeGreekForMatch(alias)
      if (needle.length > 0 && hay.includes(needle)) {
        return { value: insurer.canonicalName, confidence: 0.95, source: "template", evidence: alias }
      }
    }
  }
  return { value: UNKNOWN_INSURER_PLACEHOLDER, confidence: 0, source: "regex" }
}

// ── Coverage parsing ─────────────────────────────────────────────────────────────

/**
 * Parse coverage rows from the coverage text: match each line against taxonomy
 * aliases and read the line's amount as the limit. Deterministic; highest-info row
 * per taxonomy key wins (a row with a parsed limit beats a bare mention).
 */
export function parseCoverages(
  coverageText: string,
  taxonomy: TaxonomyEntry[],
): NormalizedCoverage[] {
  const lines = coverageText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const byKey = new Map<string, NormalizedCoverage>()
  for (const line of lines) {
    const normLine = normalizeGreekForMatch(line)
    for (const entry of taxonomy) {
      const matched = entry.aliases.some((a) => {
        const needle = normalizeGreekForMatch(a)
        return needle.length > 0 && normLine.includes(needle)
      })
      if (!matched) continue

      const limit = parseGreekAmount(line) ?? undefined
      const candidate: NormalizedCoverage = {
        taxonomyKey: entry.key,
        limit,
        exclusions: [],
        confidence: limit != null ? 0.8 : 0.5,
        source: "regex",
      }
      const existing = byKey.get(entry.key)
      if (!existing || (existing.limit == null && candidate.limit != null)) {
        byKey.set(entry.key, candidate)
      }
    }
  }
  return [...byKey.values()]
}
