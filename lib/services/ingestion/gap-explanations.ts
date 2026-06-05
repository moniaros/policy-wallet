/**
 * Phase 7 — Gap explanations
 *
 * Turns a deterministic Gap into a bilingual (el/en) explanation. There is ONE
 * template per gap-type, generated once and cached by gap-type (Gap.reason). The
 * gap-type-stable text (title/body/suggestion with the coverage name baked in) is
 * memoized; only the instance-specific amounts are filled per call. No LLM — these
 * are deterministic templates ($0), satisfying "never regenerate a gap explanation
 * already cached by gap-type".
 *
 * Maps onto GapInstance at integration: en -> aiExplanation/aiSuggestion,
 * el -> aiExplanationEl/aiSuggestionEl.
 */

import type { LocalizedText } from "@/lib/services/ai/ai-service.interface"
import type { Gap, GapKind } from "./contracts"

export interface GapExplanation {
  /** The gap-type key (Gap.reason), e.g. "missing:motor.fire". */
  gapType: string
  title: LocalizedText
  body: LocalizedText
  suggestion: LocalizedText
}

export interface TaxonomyName {
  el: string
  en: string
}

/** Resolve a taxonomy key to its display name, or null when unknown. */
export type TaxonomyNameLookup = (taxonomyKey: string) => TaxonomyName | null

// Safe placeholder so an unseeded taxonomy key never surfaces a machine key / null.
const FALLBACK_NAME: TaxonomyName = { el: "η συγκεκριμένη κάλυψη", en: "the specified coverage" }

/** Format an amount with Greek thousands separators (dot), deterministically. */
export function formatEur(n: number): string {
  const rounded = Math.round(n)
  const digits = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return `€${rounded < 0 ? "-" : ""}${digits}`
}

// ── Templates (one per gap-kind; amounts left as {actual}/{expected} placeholders) ──

function template(kind: GapKind, name: TaxonomyName): Omit<GapExplanation, "gapType"> {
  switch (kind) {
    case "missing":
      return {
        title: { el: `Λείπει κάλυψη: ${name.el}`, en: `Missing coverage: ${name.en}` },
        body: {
          el: `Το συμβόλαιό σας δεν περιλαμβάνει κάλυψη «${name.el}».`,
          en: `Your policy does not include "${name.en}" coverage.`,
        },
        suggestion: {
          el: `Εξετάστε την προσθήκη της κάλυψης «${name.el}».`,
          en: `Consider adding "${name.en}" coverage.`,
        },
      }
    case "under_limit":
      return {
        title: { el: `Χαμηλό όριο: ${name.el}`, en: `Low limit: ${name.en}` },
        body: {
          el: `Το όριο της κάλυψης «${name.el}» είναι {actual}, κάτω από το συνιστώμενο {expected}.`,
          en: `The "${name.en}" limit is {actual}, below the recommended {expected}.`,
        },
        suggestion: {
          el: `Εξετάστε αύξηση του ορίου στα {expected}.`,
          en: `Consider raising the limit to {expected}.`,
        },
      }
    case "high_deductible":
      return {
        title: { el: `Υψηλή απαλλαγή: ${name.el}`, en: `High deductible: ${name.en}` },
        body: {
          el: `Η απαλλαγή της κάλυψης «${name.el}» είναι {actual}, πάνω από το συνιστώμενο {expected}.`,
          en: `The "${name.en}" deductible is {actual}, above the recommended {expected}.`,
        },
        suggestion: {
          el: `Εξετάστε μείωση της απαλλαγής στα {expected}.`,
          en: `Consider lowering the deductible to {expected}.`,
        },
      }
    case "excluded":
      return {
        title: { el: `Εξαίρεση σε κάλυψη: ${name.el}`, en: `Exclusion in coverage: ${name.en}` },
        body: {
          el: `Η κάλυψη «${name.el}» εξαιρεί έναν σημαντικό κίνδυνο.`,
          en: `The "${name.en}" coverage excludes an important risk.`,
        },
        suggestion: {
          el: `Ελέγξτε τους όρους και εξετάστε εναλλακτική κάλυψη.`,
          en: `Review the terms and consider alternative coverage.`,
        },
      }
  }
}

// ── Cache by gap-type ─────────────────────────────────────────────────────────

const templateCache = new Map<string, Omit<GapExplanation, "gapType">>()

/** Test-only: reset the gap-type template cache. */
export function clearExplanationCache(): void {
  templateCache.clear()
}

function fill(text: LocalizedText, gap: Gap): LocalizedText {
  const actual = gap.actual != null ? formatEur(gap.actual) : "—"
  const expected = gap.expected != null ? formatEur(gap.expected) : "—"
  const apply = (s: string) => s.replace(/\{actual\}/g, actual).replace(/\{expected\}/g, expected)
  return { el: apply(text.el), en: apply(text.en) }
}

/**
 * Build the bilingual explanation for a gap. The gap-type template (name baked in) is
 * generated once and cached by Gap.reason; only the amounts are filled per instance.
 */
export function explainGap(gap: Gap, lookup: TaxonomyNameLookup): GapExplanation {
  let tmpl = templateCache.get(gap.reason)
  if (!tmpl) {
    const name = lookup(gap.taxonomyKey) ?? FALLBACK_NAME
    tmpl = template(gap.kind, name)
    templateCache.set(gap.reason, tmpl)
  }
  return {
    gapType: gap.reason,
    title: fill(tmpl.title, gap),
    body: fill(tmpl.body, gap),
    suggestion: fill(tmpl.suggestion, gap),
  }
}

/** Build a TaxonomyNameLookup from CoverageTaxonomy rows (key -> el/en name). */
export function makeTaxonomyNameLookup(
  rows: Array<{ key: string; nameEl: string; nameEn: string }>,
): TaxonomyNameLookup {
  const byKey = new Map(rows.map((r) => [r.key, { el: r.nameEl, en: r.nameEn }]))
  return (taxonomyKey) => byKey.get(taxonomyKey) ?? null
}
