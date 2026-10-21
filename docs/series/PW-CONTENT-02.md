# PW-CONTENT-02 — Public site: say only what's true, say it once

| | |
|---|---|
| **Wave** | 0 — start now |
| **Step 0** | Opus 5.5 · high · `step0-investigator` (launch with `--model claude-opus-5-5 --effort high`) |
| **Build** | Sonnet 5.5 · high (main session). Copy drafts: `greek-copy-reviewer`. Format sweep: `sweeper` |
| **Review** | `adversarial-reviewer` · Security review: no |
| **Waits on** | H3 for item 1 only. Everything else proceeds. |
| **Session start** | STATUS.md + this file. Invariants in CLAUDE.md. |

## Customer outcome
A prospect reading the public site finds no contradictions between pages, no promise the plan they'd buy doesn't keep, and Greek that reads as written for them.

## Step 0 — investigate, no code
Write `docs/series/PW-CONTENT-02/STEP0.md` covering:

1. **Plan entitlements, as the code enforces them.** Locate the source of truth for plan limits and features (billing config, Stripe products, feature flags). List what Free / Plus / Family *actually* get, including the monthly processing limit if one exists and its number. Then list every public string that claims an entitlement and mark each one true, false, or ambiguous against the code.
2. **Positioning variants.** Find every tagline, meta description, OG/Twitter title and footer descriptor. There are at least three today: «Πλατφόρμα οργάνωσης και κατανόησης ασφαλιστηρίων», «Πλατφόρμα προσωπικής ανάλυσης ρίσκου», «Ανεξάρτητος έλεγχος ρίσκου». Also «Αξιολογούμε την προστασία σας» and «σας λέμε αν είστε καλυμμένοι». List each with file and route.
3. **Verdict-style claims on public pages.** Including the `/product` demo card «Τι βρήκαμε: Το σπίτι σας είναι ασφαλισμένο για λιγότερα από όσα κοστίζει να ξαναχτιστεί» and any comparison-table cell that asserts a capability gated behind a plan.
4. **Comparison table, agent row.** The «Δεν κερδίζει τίποτα από την απάντηση» row marks «Ο ασφαλιστής σας» as «Όχι» while the same site sells to agents.
5. **Number/currency formatting.** Every price, count and date rendered on public routes in `el` and `en`, and whether each goes through a shared formatter.
6. **Category block duplication.** Count of full-description category cards rendered per `/product/*` page. There are 16 categories, each re-listing all 16 with descriptions.
7. **Footer and nav drift** between routes (different footer lists on `/pricing` vs `/`).

## Build (after approval)
1. **Entitlement truth.** Every public claim matches what the code enforces. Wording waits on H3; until then, remove claims that are false today rather than rewrite them.
2. **One limit statement.** «Απεριόριστες αναλύσεις» vs «μηνιαίο όριο επεξεργασίας»: state the real rule, with the number, in one shared string used on every route.
3. **One positioning line.** Default to «οργάνωση και κατανόηση ασφαλιστηρίων» unless Eli picks otherwise in STEP0 approval. Remove "assess your protection" phrasing from public copy.
4. **Demo cards** show document-reading outputs only (κάλυψη / εξαίρεση / για έλεγχο), never a verdict about the user's protection.
5. **Agent row.** Reword the row so it describes PolicyWallet's model ("δεν πληρωνόμαστε από ασφαλιστικές") without characterising agents. Wording via `greek-copy-reviewer`, signed off by Eli.
6. **Formatting.** All public prices, counts and dates go through the shared `el-GR` / `en` formatter. `€4.99` → `4,99 €` in Greek; `10.000+` → `10,000+` in English.
7. **Category cross-links.** On `/product/{category}` pages, the "other categories" block shows titles only. Full descriptions live only on `/product`.
8. **One footer component** for all public routes.

## Acceptance criteria
- Entitlement table in RESULT.md: every public claim → code reference → true. Zero false.
- `grep` for each positioning variant except the chosen one returns 0 hits in public routes and metadata.
- Duplicate-block count (≥80-char text blocks) across `/product/*` drops from baseline to ≤1 occurrence per block.
- Zero hand-formatted prices or numbers in public routes (sweeper report).
- Lighthouse SEO and accessibility scores on `/`, `/pricing` and `/product` no lower than baseline.
- COPY.md: every changed `el` string `ok` or signed off by Eli.

## Guards (fail first)
- **Entitlement claim guard.** Public copy keys tagged `claims-entitlement` are checked against plan config in CI.
- **Locale number-format guard.** No currency or thousands literal in public route sources.
- **Positioning lint.** A banned-phrase list for public routes: protection-verdict vocabulary.

## Out of scope
Pricing changes. Authenticated app surfaces. Legal pages (Terms, Privacy). Any new marketing claims.

## Halt
- H3 needed for item 1 wording.
- The code's entitlements contradict Stripe product config. Report it; don't pick one.

## /goal (paste after approval)
```
/goal Every acceptance criterion in docs/series/PW-CONTENT-02.md is shown met in docs/series/PW-CONTENT-02/RESULT.md with before/after numbers, each guard's failing-first output is printed in this session, and adversarial-reviewer prints CRITICAL: 0 — or stop after 40 turns and print what remains.
```
