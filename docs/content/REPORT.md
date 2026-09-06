# PW-CONTENT-01 — Goal 9 report (2026-09-06)

In the order the specification asked for. Ledgers: `PROGRESS.md` (per-goal before/after), `DECISIONS.md` (D-C1…D-C8), `BLOCKED.md` (BL-C1, BL-C2), `HANDOFF.md` (C-H1…C-H7), `DEFERRED-RULES.md`, `PROD-ALIGNMENT.md`; evidence under `docs/evidence/content-g1/`, `content-g2/`, `content-g8/`.

## 1. What shipped

- **PR #308 → NEW-UI `3c287313` = production** (deploy run 34038640338, 2026-09-06 14:20Z): Goals 1, 2, 3, 4 and 7. CI green (lint, i18n, tsc, 608 unit files / 7006 tests, build, journey); production smoke in `docs/evidence/content-g8/RESULT.md`.
- **PR #309 (draft, `feat/content-01-rules`, rebased on `3c287313`)**: Goals 5 and 6 — `renters` as a write branch and 21 authored rules (29 → 50). Gate green on that head (611 files / 7122 tests). **Not merged**: it needs the production `gap_definitions` alignment first (BL-C1).
- `lib/gap-detection.ts` is byte-identical throughout; the freeze pin was green at every goal boundary. No email or push was dispatched. No production write was made.

## 2. Locale seam surfaces found and fixed (Goal 1)

- 61 hand-rolled normalisations of the stored preference → 0, through `resolveUserLanguage` (Greek is the only fallback, D-C1). Two client components with an English fallback → 0. ~40 inline `el-GR/en-GB` ternaries → `resolveLocale`, the one tag table; English now formats as `en-GB` everywhere, matching the copy.
- The protected and onboarding layouts seed the client `LanguageProvider` from the server (0 → 2), so the eleven server+client meeting surfaces from Step 0 resolve once.
- **Found by the English sweep, not by the unit guards:** the root layout's unseeded provider and the protected layout's seeded provider both stamped `<html lang>`, and the parent's effect runs last, so an English account rendered under `lang="el"`. A seeded provider now owns the stamp; the guard renders the nested pair.
- Found by the agent sweep: the agent `/insights` page overflowed 201px at 320px (a nowrap citation pill) and `/tasks` 63px (two segmented controls) — pill split into label + citation line, segments made scroll strips. Final sweeps: 0 overflow at 320/390/430, both audiences, both locales.
- Still open by design: the server HTML of `/en/*` public pages says `lang="el"` until the root layout's inline script runs (documented limitation; Lighthouse reads the hydrated DOM).

## 3. Classification count, with before/after rendered numbers (Goal 2)

- Classified 3 → 8 of 29 (6 legislative, 2 market); 42 of 50 under review once the rules PR lands. New citations: `missing_enfia_components` (Ν. 4223/2013 άρθρο 3 παρ. 7Ζ), `missing_accident_declaration_phone` and the motorbike twin (Π.Δ. 237/1986 άρθρο 9), `missing_hospital_class` and `no_direct_billing` (named public market sources — `market` is permitted only on a named source, D-C2). Group-health siblings stay under review (no group-scheme source).
- Rendered numbers on the seeded B2C account: home legislative tile 1 → 2; hero 4 → 5; `/protection` headline «1 σημείο … και 3 υπό αξιολόγηση» → «2 σημεία … και 2 υπό αξιολόγηση»; own-policy group `under_review` → `legislative`. Agent book unchanged (its findings are unaffected — correct). Agent `/insights` now renders the citation line (`data-fact="gap.citation"`); the rows never selected `definition.slug` before.
- `docs/transparency/PROVENANCE-REVIEW.md` (50 rows) is a proposal; legal sign-off blocks GA (C-H2).

## 4. Relationship index — decision and evidence (Goal 3)

- **Removed**, not reframed (D-C3). Step 0 showed the 0–100 index was a weighted band over four proxies, none of which the customer could see or dispute. `lib/agent/health-score.ts` deleted; nine render sites cleaned (client overview, detail view, profile, customer list column + pill, agent dashboard, mock screens, portal service); the copy keys are gone in both languages. Guard `relationship-index-removed` with a probe; `score-containment`'s render set for it is empty.
- Production check after deploy: `/customers` has no health column; `/dashboard/agent` and `/insights` carry no score, index or «/100» vocabulary.

## 5. Rules authored per branch; branches still rendering the unauthored state (Goals 5–6)

- Goal 5 (reframed, D-C5 — `contents` is not a branch and `renters` was not writable): renters 8, home 3. Goal 6: personal accident 2, roadside 2, pension 3, income protection 1, group life 2. Total 21; catalogue 29 → 50, branches with checks 8 → 14. All in the existing predicate vocabulary; every rule declares its inputs, reads only fields the extractor writes for its branch (schema-derived inventory), and carries a firing and a quiet fixture (three guards).
- Branches whose fixtures rendered the unauthored state and no longer do: renters, personal accident, roadside, pension, income protection, group life. Still rendering it, with the reason recorded in `PROGRESS.md` row 6: cyber, liability, legal expenses, business, professional/employer liability, money, fidelity, other (no branch section in the extraction schema); the boat/marine/transport family (a section exists, not prevalent Greek personal lines); fine art, group pension (niche or B2B).

## 6. Which of Goal 6's two stopping conditions ended it

- **The prevalence condition** (D-C6): the prevalent Greek personal lines with an extractable branch section are covered. The budget condition was not reached.

## 7. Deferred rules and extraction requests

- `docs/content/DEFERRED-RULES.md`: conditional variants that need a primitive the engine lacks (tenant-liability comparator, benefit-period check, age-band test) and five extraction requests E1–E5 (declared inventory value, tenant liability limit, waiting/benefit periods, beneficiary shares, assistance provider). Each names the rule it would unlock. Owner question C-H4.

## 8. Production hygiene status (Goal 8)

- 8.1: nothing to remove — the three `example.com` seed accounts do not exist in production (Step 0 H16). No production write.
- 8.2: anonymous smoke — the six trust routes and both Terms pages 200, self-canonical, in the sitemap; score vocabulary appears only in negations; Lighthouse SEO 100 / accessibility 100 on all three pages. Agent-side smoke clean (above). Sentry: no group first seen after the deploy in a 25-minute window (10 % sampled — weak evidence). **Policyholder smoke not run** (BL-C2: no policyholder session in the browser; the agent does not sign in).
- Facts for the owner: `policywallet.gr` publishes **no MX record** — dpo@/info@/careers@ cannot receive mail (C-H6, GA blocker). Dev's catalogue was moved back to the 29-row set so #308's CI could pass (D-C8) and must be re-aligned as step one of BL-C1.

## 9. What remains before C1

- **BL-C1** (owner's go): align dev → archive-export and align production → verify `d6f515a1d400f9d5` → merge #309 → deploy, one window.
- **Legal sign-off** of PROVENANCE-REVIEW.md (C-H2); the **MX record** (C-H6); the extraction requests (C-H4); the «not applicable» composition outcome for conditional rules (C-H5); the H9 drawer-footer capture (C-H7); a production account for the policyholder smoke (C-H3 / BL-C2).
- C1–C7 are not started. The next series is PW-BRIDGE-01, whose L0 inventory halts for approval.
