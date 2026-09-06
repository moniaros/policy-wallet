# PW-CONTENT-01 — progress ledger

One row per goal, with the before/after metrics the goal's acceptance names. Step 0: `STEP0-FINDINGS.md` (approved 2026-09-06). Decisions of record: `DECISIONS.md`. Deferred rules and extraction requests: `DEFERRED-RULES.md`.

| Goal | Status | Date | Metrics (before → after) | Notes |
|---|---|---|---|---|
| 0 — Investigation | done, approved | 2026-09-06 | none by design | `STEP0-FINDINGS.md` at NEW-UI `caaf4f3f` |
| 1 — One locale source | done | 2026-09-06 | hand-rolled normalisations of the stored preference: **61 → 0** (one resolver, `lib/i18n/resolve-language.ts`); client components carrying an English fallback: **2 → 0**; inline `el-GR/en-GB` ternaries outside the tag table: **~40 → 0**; authenticated layouts seeding the client provider from the server: **0 → 2** (protected, onboarding); html `data-locale` for English: **en-US → en-GB** (matches every formatter); Step 0's 11 server+client surfaces: all under a seeded layout, asserted | Guards: one-locale-per-request, no-component-locale-fallback, formatted-value-locale-matches-copy — each with a committed probe. The seeded provider never reads localStorage over the server value, follows the server after a toggle, and mirrors the value for the public tree. |

## Decisions taken under standing authority

| Date | Decision | Why | Reversal |
|---|---|---|---|
| 2026-09-06 | **Greek is the resolver's only fallback.** Any stored value that is not exactly `en` resolves to `el`. | 22 sites fell back to English, 39 to Greek; the product is Greek-canonical and the column's default is `el`. | Change one line in `resolveUserLanguage`. |
| 2026-09-06 | **Anonymous contexts keep a literal default** (cookie-consent locale, public form emails). | There is no user whose preference could be resolved; the guard exempts them by name with the reason. | Route them through a visitor-locale helper later. |
