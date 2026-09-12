# PW-VOICE-01 — CORPUS

The machine-readable inventory is **`corpus.json`** (generated 2026-09-12 from
`tests/fixtures/greek-string-inventory.txt`, the frozen Greek-string inventory that the copy-freeze guard keeps
complete). This file is its index: the schema, the metric definitions that every round
reuses verbatim, and the totals.

## Schema (`corpus.json` → `strings[]`)

| field | meaning |
|---|---|
| `id` | `arm:key_or_file#n` — stable across rounds while the source string exists |
| `arm` | `bundle` (leaf of `el` in `lib/i18n/translations/el.ts`) · `inline` (`el` side of an `{el,en}` literal) · `call` (first arg of `t("el","en")`) · `ternary` (Greek branch of a `?:`) |
| `surface` | `public` · `in-product` · `auth-onboarding` · `outbound` · `legal` (excluded, §8) — derived from the key prefix or file path |
| `slot` | for bundle keys, from the key's last segment (`title`→H1/H2, `button`, `toast`, `subject`…); otherwise a **length proxy**: ≤24 chars → `chip/button`, ≤80 → `heading/subhead`, else `body`. The proxy is honest about what it is: slot type for non-bundle strings needs the render, and gets it in the Round-1 fixture matrix |
| `text` / `chars` | the Greek as shipped, and its length — the **baseline** for the 15 % growth budget (§4.1) |
| `composed` | contains `${…}` or is a template literal — assembled at runtime |
| `sites` | render sites: the file for inline/call/ternary; for bundle keys, files whose source contains the key's last segment (≤12) |

## Totals

**9924 strings** in scope (2 legal, excluded). Composed: **297**.
Bundle keys with **no render site resolved: 378** — listed in `corpus.json` with `sites: []`; each is either reached dynamically or dead, and Round 1 settles which before any of them is rewritten.

| surface | slot | strings |
|---|---|---|
| auth-onboarding | H1/H2 | 9 |
| auth-onboarding | body | 50 |
| auth-onboarding | button | 18 |
| auth-onboarding | chip | 14 |
| auth-onboarding | chip/button | 270 |
| auth-onboarding | heading/subhead | 191 |
| auth-onboarding | subhead | 2 |
| in-product | H1/H2 | 270 |
| in-product | body | 1582 |
| in-product | button | 137 |
| in-product | chip | 125 |
| in-product | chip/button | 2625 |
| in-product | heading/subhead | 1951 |
| in-product | subhead | 37 |
| in-product | toast | 32 |
| outbound | H1/H2 | 4 |
| outbound | body | 62 |
| outbound | button | 1 |
| outbound | chip/button | 65 |
| outbound | email subject | 20 |
| outbound | heading/subhead | 177 |
| public | body | 688 |
| public | chip/button | 752 |
| public | heading/subhead | 842 |

## Composed strings — the highest-risk category

The rule of §1.1: a composed string is audited as its **assembled output**, not its fragments. These families carry the most:

| source | composed strings |
|---|---|
| `lib/services/gap-engine/risk-catalog.ts` | 28 |
| `app/(protected)/wallet/actions.ts` | 21 |
| `lib/services/reports/savings-report.ts` | 17 |
| `lib/services/gap-engine/portfolio-rules.ts` | 16 |
| `lib/services/risk-dna/monitoring.ts` | 12 |
| `lib/services/timeline/diff.ts` | 11 |
| `lib/services/policy.service.ts` | 10 |
| `lib/services/risk-dna/advisory-impact.ts` | 10 |
| `app/(protected)/activity/actions.ts` | 8 |
| `lib/services/gap-engine/profile-gap-rules.ts` | 8 |
| `lib/services/renewal.service.ts` | 7 |
| `lib/services/risk-dna/compute.ts` | 7 |
| `lib/services/risk-graph/protection.ts` | 7 |
| `lib/services/team.service.ts` | 7 |

By surface: auth-onboarding 4, in-product 254, outbound 33, public 6. Every one is rendered in the Round-1 fixture matrix (320/390/430 · longest insurer name · longest asset name · empty portfolio · all-expired portfolio · failed run) before it may change.

## Metric definitions — fixed here, reused verbatim every round

1. **corpus size** — strings in `corpus.json` with `surface ≠ legal`.
2. **findings by class/severity** — per `voice-01-findings.json`; a finding is a rubric-test hit **after human verification** (the regex screen over-matches by design; the screen's own hit counts are reported separately as *candidates*).
3. **strings changed** — `id`s whose `text` differs from the previous round's `corpus.json`.
4. **character delta** — `chars_after − chars_before` per changed string; mean and max per surface. Budget: ≤ +15 % (§4.1).
5. **truncation failures** — per width (320/390/430), a rendered string whose box overflows or clips; **not measurable statically** — baseline records "not yet measured"; rounds record the fixture count.
6. **English-in-el** — Latin runs of ≥3 letters outside the LEXICON allowlist, measured on **plain string literals only** (bundle, call, ternary, and inline strings that are not object/HTML initializers), with `${…}` stripped first. The naïve count over all inline initializers (668) is code, not copy.
7. **claims without a `CLAIMS.md` row** — numeric/factual statements (regex in the findings file) not matched by a row.
8. **advice-verb occurrences in platform voice** — V9 regex hits whose sentence does not name «ασφαλιστ-/σύμβουλ-/διαμεσολαβητ-».
9. **register-drift** — V4 regex hits (unambiguous singular forms only: «σου/εσύ» + singular imperatives), **excluding `onboarding.*` while H-V01 is open**.

Numbers 6–9 are computed by `docs/content/voice-01-findings.json`'s definitions; the patterns live there so a change to a pattern is a diff, not a drift.
