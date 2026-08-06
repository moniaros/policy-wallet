# Executive Launch Report — Public Marketing Website (August 2026)

> Status: SUPERSEDED MID-LOOP. Round 1 (Lens A) completed — 14 findings, all
> fixed and re-verified green. Round 2's mechanical layer completed fully
> green (59/59 anonymous sweep, 3,724 unit tests, tsc/lint/i18n/utf8); its
> editorial layer (Lens B, EL/EN parity) completed and reported ~30 polish
> findings — at which point the session brief changed to **audit-only**, so
> those findings were RECORDED, not fixed. The successor document — and the
> place to look first — is `marketing-website-audit-2026-08.md`, which carries
> the full audit, the open-findings register (§11b), and the scorecard.

## 1. Executive summary

The implementation phase closed with every truthfulness, positioning and
mechanical defect fixed and pinned by tests; the remaining open items are
copy-polish level (see the successor audit §11b) and none gates launch.

## 2. Scope & method

**Scope.** Every public marketing surface, both locale trees (Greek default,
English mirror): the homepage, `/product` + 15 line-of-business pages,
`/pricing`, `/compare` (new), `/company`, `/contact`, `/solutions/agents`,
`/guides` + articles, `/lexiko` + terms, four legal pages, navigation, footer,
SEO/AEO metadata and structured data. Application surfaces, APIs, business
logic, subscriptions and schemas were **not touched** (hard constraint of the
brief; plan keys and checkout ids frozen).

**Positioning.** PolicyWallet is positioned as a personal risk intelligence
platform — rendered for humans as the plain sentence in
`lib/marketing/positioning.ts` («Δεν πουλάμε ασφάλειες. Σας λέμε αν είστε
καλυμμένοι.»), and as the category label only in the definitional AEO sentence
(`lib/seo/site.ts` — «πλατφόρμα προσωπικής ανάλυσης ρίσκου» / "personal risk
intelligence platform"), because the goal's own language rules (5-second
clarity, no jargon, 5-year-old-parsable sentences) forbid the literal label in
visitor copy.

**Method.** Three layers per assessment round:
1. **Mechanical** — full unit suite, `tsc`, ESLint, i18n/UTF-8 lints, and a
   new permanent anonymous Playwright sweep (`tests/e2e/public-marketing.spec.ts`,
   project `public-anon`) covering every route in both trees: horizontal
   overflow at 320/1280 px, exactly one `h1`, no heading-level skips,
   `<html lang>` per tree, console/page errors, and a global link-integrity
   pass.
2. **Editorial** — every rendered page read in both languages under a rotating
   lens: A truthfulness & numbers, B EL/EN meaning parity & language quality,
   C coherence & presentation.
3. Any finding → fixed → **clean-round counter reset to zero**. Exit at three
   consecutive clean rounds.

## 3. Findings ledger — the 22 pre-implementation audit findings

All resolved this session unless marked otherwise.

| # | Finding | Resolution |
|---|---------|-----------|
| 1 | "20 ασφαλιστικοί κλάδοι / 20 insurance branches" was FALSE (catalog has 15); shipped in homepage copy, agents page, and FAQPage JSON-LD | All three sites now derive the count from `productCategories.length` — the claim can no longer drift from the catalog |
| 2 | `lib/landing/content.ts` was ~70 % dead code carrying a CONTRADICTING second hero | Dead blocks deleted (`hero`, `sections`, `personaTracks`, `aiExtraction`, `collaboration`, `qaUpgrade`, `trust`, `security`, `finalCta`, `footer`); type model (`types/landing-content.ts`) trimmed to what renders |
| 3 | Pet page EN invented "Breed Condition Radar Charts" (+ Greek claimed «σε ένα δευτερόλεπτο») | EN aligned to EL meaning; speed claim removed |
| 4 | `/product` SEO meta sold document storage ("Upload your policies as PDFs", "Ψηφιακό πορτοφόλι") | Rewritten to risk-check positioning in both languages, within the 60/140–160-char budgets |
| 5 | OG image alt was the retired English-only tagline | Now "PolicyWallet — We tell you if you are covered." (mirrors CATEGORY) |
| 6 | Four contradictory speed claims ("Under 30s", "Δέκα λεπτά", «δευτερόλεπτα», "in minutes") | One canon: «σε λίγα λεπτά / in minutes», codified as `SPEED_CLAIM` in positioning.ts |
| 7 | `lib/product/catalog.tsx` EN carried claims EL didn't ("Real-time…", "Rebuild Cost Guard", "direct-billing hospital linkups", "verified/tracked", "fund performance projections"); Greek used English "tap" | All EN headlines aligned to EL meaning; «σε δευτερόλεπτα» removed from the property headline (both languages); cyber copy no longer implies WE provide the insurer's incident-response team |
| 8 | `/solutions/agents` EL and EN meta were different pitches | EN now mirrors the EL pitch |
| 9 | AEO definitional sentence drifted between EL and EN | Aligned; the category label lives here and only here |
| 10 | "Fully GDPR compliant" self-graded verdict in four places | Demoted to the auditable behaviour ("export or delete whenever you want") in positioning.ts, /company, privacy meta. The footer's factual "GDPR & AES-256" naming was kept — naming a framework is not a verdict |
| 11 | Greek pricing cards full of untranslated English ("Bulk import", "Renewal pipeline", "Cross-sell intelligence", "Priority queue", "25M tokens") | Translated into the plain-Greek register the comparison rows already used; "25M tokens" (a billing internal) replaced by "the largest AI allowance". Also fixed broken English "For personal getting started" |
| 12 | Three currency formats for the same price | Canon `€2.99` (what `formatEur` produces and tests pin) applied to the pricing FAQ, homepage FAQ, and a guide article |
| 13 | Advisor sharing promised universally in the hero trust row / ServicesGrid; renewal reminders promised to Free users in AudienceTabs | Trust fact reframed to the universally-true privacy default («Μόνο εσείς τα βλέπετε»); ServicesGrid card and AudienceTabs benefit now name the plan that carries the feature |
| 14 | Hero H1 hand-retyped the PROMISE constant (drift vector) | H1 renders `PROMISE.lead`/`PROMISE.accent` from positioning.ts (with the deliberate no-break spaces moved into the constant); STORY doc-comment corrected to how beats actually render |
| 15 | /company stated an unsourced comparative statistic ("lowest private-insurance rates in Europe") | Replaced by the defensible framing (people with insurance rarely know what it covers) |
| 16 | /compare hardcoded "Έξι πράγματα/Six things" against a 6-row array | Count derived from `COMPARISON_ROWS.length` |
| 17 | Footer "Newsletter" untranslated in Greek | «Ενημερώσεις» |
| 18 | Agents page bypassed `localizeHref` on two signup CTAs | Routed through `localizeHref` |
| 19 | `LoBPageShell` said the retired word «Τιμολόγηση» and hardcoded price strings | Kicker/CTA say «Τιμές»; names + prices derived from `DEFAULT_PLAN_FACTS` + `formatEur` (drift risk documented in a comment); breadcrumb fixed in marketing-pages.ts |
| 20 | Glossary CTA used undefined class `pw-btn-md` | `pw-btn-lg` |
| 21 | EN copy on the 15 product pages was a looser paraphrase of the Greek | Full parity sweep: EL authoritative, EN aligned; unverifiable claims («ζωντανά»/"live tracking", "instantly", invented "Rebuild cost lock", fabricated tax-export capability, "continuous fund monitoring") removed from BOTH languages |
| 22 | `/compare` sat at default sitemap priority 0.6 despite homepage+footer links | Priority 0.8 |

## 4. New findings from validation rounds

_Split per CLAUDE.md: **Broken** (gates launch) vs **UI/UX dislike** (does not)._

### Broken — found and fixed during rounds

Round 1 (Lens A — truthfulness & numbers; three parallel auditors over every
rendered page, both locales, plus the mechanical sweep):
- Guide article used the old currency format «2,99 €» — canon `€2.99`.
- Hero product mock claimed **"Έτοιμο σε 28 δευτ. / Ready in 28s"** — even in
  a mock, a stopwatch reads as a speed claim; now states completion.
- `/compare` reminders row said "Yes" unqualified while Free has no reminders —
  row reworded onto what every plan delivers (the renewal date).
- Homepage + `/product` promised warnings **"before a price changes / before
  you lose a benefit"** — no price feed exists; now "before something runs out,
  and when we find something new in your documents".
- Motor market-value cluster (catalog card, hero, feature card, mock widget
  "98% match") implied external market-price data — reworded to the honest
  capability (we show the payout; the reader compares), mock row now shows a
  document fact (deductible).
- Group-pension mock showed **"+12.4% return this year"** (implies live fund
  tracking) — now a contractual fact (guaranteed rate).
- Cyber page "Παρακολουθήστε τα χρονικά όρια" → «Δείτε» (monitoring flavor).
- **Guide-article CTA promised free AI gap detection** the Free tier does not
  include ("η AI εντοπίζει κενά… δωρεάν") and a numeric "2 minutes" claim —
  now: free = we read one policy and show what it covers; gaps/overlaps named
  as paid-plan features; "in minutes".
- Glossary CTA "δωρεάν ανάλυση / free analysis" → "δωρεάν σύνοψη / free
  summary" (what Free actually ships).
- EN guide translation dropped the Greek caveat «εφόσον το έγγραφο αναφέρει
  και τα δύο ποσά» — caveat restored in English.
- Agents page closed on the **B2C price band** (€2.99/€7.99) — `LoBPageShell`
  gained an `audience` prop; the agents page now quotes Agent Starter/Agent
  Pro and links `/pricing?audience=agent`.
- EN agents mock used Greek thousands format "€1.200/yr" → "€1,200/yr".
- Harness finding: the only console errors on all ~70 routes were two
  dev-environment artifacts (placeholder Sentry DSN, Vercel Analytics
  dev-only debug script vs CSP) — allowlisted with documentation; absent in
  production builds.

### UI/UX dislike — recorded, not gating
- Marketing components hardcode the palette as hex literals instead of the
  `--pw-*` tokens; rendered output is consistent because the same hexes are
  used everywhere, but a token pass would harden it. (Pre-existing convention.)
- `/compare` is reachable from the footer and the homepage "difference"
  section but not the header nav (nav keys are pinned by
  `tests/unit/public-nav.test.ts`; a 6th header item was judged not worth the
  crowding).
- Group-health mock UI styles good news («Καλύπτεται και η κόρη σας») in an
  alert-red box — design choice worth revisiting.
- Educational guide articles legitimately use «ψηφιακό πορτοφόλι» when
  explaining the market category (answer-engine content); this is not
  self-positioning and was left.

## 5. Round log

_Filled as rounds complete. Counter resets to zero on any finding._

| Round | Lens | Mechanical | Editorial | Verdict |
|-------|------|-----------|-----------|---------|
| 1 | A — truthfulness & numbers | 3,724 unit ✓ · tsc ✓ · lint ✓ · i18n/utf8 ✓ · sweep: overflow/headings/lang/links clean on ~70 routes, console noise = 2 dev artifacts | 14 findings (see §4) | **FINDINGS → fixed, counter reset** |
| 2 | B — EL/EN parity & language | 59/59 anonymous sweep ✓ · 3,724 unit ✓ · tsc/lint/i18n/utf8 ✓ | ~30 polish findings reported (5 shared-card items fixed before the brief changed; the rest recorded in the successor audit §11b) | **INTERRUPTED — brief changed to audit-only** |

> The loop later resumed under the content-rewrite and redesign briefs and ran
> to completion. Full final round log (Rounds 1–9, ending in **three
> consecutive zero-finding rounds** with six independent auditors) lives in
> `marketing-website-audit-2026-08.md` §"Validation loop — final record".

## 6. Drift-prevention inventory

| Claim | Single source | Pinned by |
|-------|---------------|-----------|
| Category / hero promise / trust facts / CTA reassurance | `lib/marketing/positioning.ts` | `monetization-config.test.ts` (free-tier promise), `no-overpromise-copy.test.ts` |
| Branch count | `productCategories.length` (`lib/product/catalog.tsx`) | consumers derive; product hub renders the same expression |
| Prices & plan display names | `lib/pricing/plan-defaults.ts` → live catalog | `monetization-config.test.ts`, `pricing-view-model.test.ts` |
| Speed claim | `SPEED_CLAIM` (positioning.ts) | `no-overpromise-copy.test.ts` bans "in seconds" |
| Meta title/description budgets | `lib/seo/marketing-pages.ts` | `seo-metadata.test.ts` (≤60 / 140–160, both locales) |
| Public-route allowlist | `proxy.ts` | `public-route-allowlist.test.ts` |
| Rendered mechanics (overflow, headings, lang, links, console) | — | `tests/e2e/public-marketing.spec.ts` (`public-anon` project, permanent) |

## 7. Residual risks

- **LoBPageShell price band** reads `DEFAULT_PLAN_FACTS` (the catalog seed),
  not the live admin catalog — an /admin/plans price edit updates /pricing but
  not this band. Documented at the source.
- **Untracked-file lint blindness**: `check-i18n-hardcoded`/`check-utf8` scan
  tracked files; the 9 new untracked files are covered only when passed
  explicitly (done in the rounds) until first `git add`.
- **`lint:encoding` (mojibake) targets a hardcoded list of app paths** and sees
  no marketing files; UTF-8 validity is still enforced tree-wide by
  `lint:utf8`.
- The Playwright `public-anon` sweep runs locally (E2E is not in CI by repo
  policy).

## 8. Launch-readiness verification (2026-08-05/06) — final loop and go/no-go

The production-launch brief ran the loop one final time under seven personas
(CEO, CSO, CDO, agent, policyholder, investor, first-time visitor) with four
independent lens auditors per round. Six findings waves (record in
`marketing-website-audit-2026-08.md` §"Launch-readiness loop") ended in
**three consecutive zero-issue rounds** on byte-stable content, with explicit
launch signoffs from the SEO+AEO, GEO, consumer-persona and product-tree
lenses.

### Implemented improvements (this brief)

1. **Tier-honesty convention, completed sitewide.** Canon ruling: *finding*
   outputs (gaps, duplicates, fix-first priorities, reminders) name their plan
   wherever promised; *organized-view* copy (what your documents say, expiry
   dates) stays baseline. Applied across /compare (new «Ναι, με το Plus»
   verdict cells), home (hero, HowTo, AudienceTabs, ServicesGrid), /product
   (hero, steps, bullets, meta), motor/liability/group-health (bodies +
   teasers), /solutions/agents (Agent Starter), and six glossary hooks. The
   gap/duplicate and reminder claim classes are enumerated **closed**: no page
   pair exists from which a reader or AI extracts contradictory plan facts.
2. **Metadata truthfulness.** Home + /product metas de-fused («Δωρεάν βασική
   σύνοψη για 1 συμβόλαιο» — free scoped to what free delivers); legal pages
   serve language-matched titles for `?lang=`/Accept-Language variants while
   keeping clean-route canonicals; glossary title over budget fixed **and the
   budget is now test-enforced for every glossary term** (suite: 3,724 → 3,764).
3. **Structured-data verbatim discipline, completed.** Checklist-guide HowTo
   steps rewritten as verbatim substrings of visible bullets; /product HowTo
   description neutralized; verified sitewide: **zero** structured-vs-visible
   mismatches across 114 pages.
4. **Navigation & semantics.** Legal "Back to home" locale-aware; group-life's
   four unlocalized links fixed; mock color semantics corrected (green =
   covered, amber = warning); latent test/gloss mismatch aligned.

### Remaining risks (unchanged classification: broken/insecure vs dislike)

**Owner-blocked (content, launch decision):** legal-entity details (ΓΕΜΗ/ΑΦΜ,
registered office) still render as "coming soon" placeholders on /company and
/privacy — the one honesty gap a diligent reader will notice.

**Deploy-time verifications (not testable on the dev server):** production
origin derivation (`NEXT_PUBLIC_SITE_URL`) for canonicals/JSON-LD/sitemap;
Core Web Vitals on a production build; preview-deployment noindex gating;
Organization `sameAs`/contact env vars.

**Known accepted tradeoffs:** `<html lang>` on /en/* is corrected pre-paint by
an inline script (JS-less crawlers still see `el`; per-locale root layouts
deferred by design); LoBPageShell price band reads plan defaults, not the live
admin catalog; E2E sweep runs locally (not in CI, by repo policy).

**Dislike ledger (not gating):** attribution-clause density on home judged at
the Stripe bar as "information, not clutter" by the persona lens; marketing
hex literals not tokenized; /compare reachable from footer + content but not
header nav (nav keys are test-pinned).

### SEO / AEO / GEO readiness

- **SEO — ready.** Ten full-battery rounds: unique in-budget titles and
  descriptions (registry-pinned 140–160), reciprocal el/en/x-default hreflang
  and self-canonicals on all 34 battery pages, valid self-contained JSON-LD,
  clean heading hierarchy, sitemap (120 URLs, honest lastmod) + robots, full
  link graph crawled — depth ≤3, zero orphans, zero generic anchors, zero
  broken links (240 distinct destinations fetched across two lenses).
- **AEO — ready.** Definition-first glossary, direct-answer guides, 78
  question-form FAQ pairs with ≤50-word lead answers matching JSON-LD
  verbatim, the five canonical questions answered on home, both pricing
  audiences SSR'd with sr-only exclusion labels.
- **GEO — ready.** One entity definition everywhere; one consistent fact set
  (prices ×230+ occurrences with zero deviation, free tier, plan gating,
  "minutes" speed canon, 15 categories, no-commission stance) across 114
  pages; 12 named AI crawlers deliberately allowed; 10-question grounded
  answer simulation fully correct — including "does the free plan find
  coverage gaps?" → correctly "No, that is PolicyWallet Plus" from any
  grounding combination.

### Production readiness — verdict

**GO for the marketing surfaces.** Three consecutive clean rounds across five
independent verification components; every invariant test-pinned or
sweep-enforced for regression protection. Before shipping: stage the
marketing files selectively (a parallel session shares the tree), run the CI
guardrails (`audit:api-auth`, `lint`, `type-check`, `verify:migrations`,
i18n/UTF-8 checks), and complete the deploy-time verifications above on the
production deployment. The legal-entity placeholders remain the owner's
launch call.
