# PolicyWallet Marketing Website — Executive Audit
**August 2026 · CMO / Brand / Technical SEO / AEO / GEO / UX review · audit only, nothing implemented under this brief**

> Evidence base: every public route rendered and read in **both languages** (~70 URLs: home, 15 product pages, pricing, compare, company, contact, solutions/agents, guides + articles, glossary + terms, 4 legal pages, both locale trees); a mechanical browser sweep of all of them at 320 px and 1280 px (overflow, heading order, `<html lang>`, console, link integrity); six independent editorial passes (3 × truthfulness, 3 × EL/EN parity); and source inspection of the SEO/content layer. Earlier the same day, a remediation session fixed 36 truthfulness/positioning defects (ledger in `marketing-launch-report-2026-08.md`); this audit reports the state **after** those fixes and lists everything still open.

---

## 1. Executive summary

**Positioning verdict: the site now genuinely sells risk intelligence, not document storage.** The category is stated in the first pixel of the hero («Δεν πουλάμε ασφάλειες. Σας λέμε αν είστε καλυμμένοι.»), the story spine (life changes → risks change → insurance doesn't keep up → we tell you if you're still protected) runs through every section, and the machine-facing definition ("the independent personal risk intelligence platform for the Greek market") is single-sourced and emitted to answer engines. The last document-manager remnants (meta titles selling a "digital wallet", "upload your PDFs" framing, an "organization" pricing pitch) were removed this session.

**Five-second test (homepage, measured against the rendered hero, both languages): PASS on all five.**

| Question | Answered above the fold by | Verdict |
|---|---|---|
| What is it? | Badge: «Δεν πουλάμε ασφάλειες. Σας λέμε αν είστε καλυμμένοι.» + H1 «Η ζωή σας άλλαξε. Η ασφάλειά σας το ξέρει;» | ✅ |
| Who is it for? | Sub-head speaks to life events («Παιδί, νέο σπίτι, νέα δουλειά…»); audience split (individuals/agents) one scroll down | ✅ |
| Why different? | The badge itself is the differentiator (no sales, no commission); `#difference` section + `/compare` page expand it | ✅ |
| Why trust it? | TrustRow under the CTAs: AES-256, EU servers, data ownership, privacy default — visible without scrolling | ✅ |
| What action? | One primary CTA («Δείτε αν είστε καλυμμένοι») + risk-reversal line («Δωρεάν για 1 συμβόλαιο. Χωρίς κάρτα.») | ✅ |

**Top strengths:** honesty as a brand system (single source of truth for claims, tests that pin them, no invented users/testimonials/statistics); mechanical quality floor proven by measurement (zero horizontal overflow at 320 px on ~70 routes, exactly one `h1` everywhere, zero heading-level skips, zero broken links); an unusually strong AEO/GEO posture (definitional sentence, FAQPage/HowTo JSON-LD that mirrors visible text verbatim, AI crawlers explicitly allowed).

**Top gaps (none gates launch):** ~30 small EL/EN polish items found in the final parity pass and **left open under this audit-only brief** (§8); the legal-entity vacuum (no ΓΕΜΗ/ΑΦΜ/company name on /company or /privacy — honest "coming soon", but the single biggest trust and GEO authority gap); Core Web Vitals never measured on a production build; marketing palette hardcoded as hex literals rather than design tokens.

---

## 2. Positioning, storytelling, brand

- **One story, one source.** `lib/marketing/positioning.ts` holds every claim (category, promise, differentiators, trust facts, comparison table) as pure bilingual data with written rules: Greek authoritative, identical EN meaning, no jargon, only defensible claims. The homepage H1 renders the `PROMISE` constant — it can no longer drift from the file.
- **The category label is handled correctly for two audiences.** Humans get the plain sentence; machines get "personal risk intelligence platform" / «πλατφόρμα προσωπικής ανάλυσης ρίσκου» in the AEO definition (`lib/seo/site.ts`), which also seeds the homepage's first FAQ answer. This is deliberate: the goal's own language rules (5-year-old-parsable, no jargon) forbid the literal label in visitor copy.
- **The neutrality story is the brand.** "We don't sell insurance / take no commission / don't sell your data" runs hero-badge → differentiators → compare page → company page, consistently in both languages. `/compare`'s last row even concedes the paper folder beats us on one job — that concession is the most credible thing on the page.
- **Storytelling arc** (home): promise → life-changes recognition → difference → five outcomes → why now → how it works → who it's for → price → coverage reassurance → FAQ → final CTA. Each section answers the next objection in order. No section is orphaned from the spine.
- **Residual watch-item:** the FAQ definition uses "risk **intelligence**" (EN) against «**ανάλυσης** ρίσκου» (EL). Kept deliberately as the category-name equivalence (documented at the source), but it is the one place a parity purist can object.

## 3. Information architecture & navigation

- Header: 5 items (Product, Solutions ▾, Guides, Company, Pricing) + one primary CTA («Δείτε πού είστε») — pinned exactly by `tests/unit/public-nav.test.ts`. Skip-link → `main-content` present on every page.
- `/compare` is reachable from the homepage difference section and the footer, **not** the header — a judgment call to keep the header at 5 items; revisit if `/compare` earns organic traffic.
- Footer is a full sitemap (all 15 branches, content, legal), bilingual, with the newsletter block and factual GDPR & AES-256 badge.
- Locale architecture: Greek default at `/`, full mirror under `/en/*`, `localizeHref` keeps visitors inside their tree; the agents-page signup CTAs were the last leak (fixed).
- Redirect hygiene: `/for-agents` → `/solutions/agents`, `/landing` → `/` (measured; land < 400).

## 4. UX / UI / visual & CTA hierarchy / readability

- **CTA hierarchy is disciplined:** one green primary (`pw-primary-button`) per viewport-section, secondary as outline, inverse pair on dark panels; 49 × `pw-btn-lg` and zero ad-hoc buttons in the marketing tree (one undefined `pw-btn-md` was found and corrected to `-lg`).
- **Type system:** tokenized scale (`text-kicker` → `text-display`) used consistently; no arbitrary pixel sizes in the new components; `text-balance` on headlines; deliberate no-break spaces keep «ασφάλειά σας» from orphaning in the hero.
- **Readability:** short sentences, concrete nouns, question-form headings («Τι δεν καλύπτεστε;», «Πόσο κοστίζει;»). The pricing cards were the last jargon holdout ("Renewal pipeline", "25M tokens") — now plain Greek.
- **Mobile:** measured, not asserted — zero horizontal overflow at 320 px on every route; the five-column compare table scrolls inside a labelled, keyboard-focusable region; TrustRow collapses to chips below `sm` so trust stays above the fold on phones.
- **Weak spots (open):** marketing colors are hex literals (`#29685B`, `#E2E8F0`…) instead of the existing `--pw-*` tokens — output is consistent because the same hexes repeat, but it's copy-paste consistency, not system consistency; the group-health mock styles good news («Καλύπτεται και η κόρη σας») in an alert-red box; card shells are hand-rolled `rounded-2xl border …` in ≥5 files instead of `.pw-card`.

## 5. Accessibility (measured)

- Exactly one `h1` per page and **zero heading-level skips** across ~70 routes (browser-measured, both locales, in the permanent `public-anon` Playwright sweep added this session).
- `<html lang>` correct per tree — `/en/*` is stamped before first paint, so screen readers never read Greek phonemes over English text.
- Landmarks: `main` + skip-link target everywhere; compare-table region is labelled and focusable; mock widgets carry «Παράδειγμα/Example» screen-reader descriptions so illustrative numbers can't be mistaken for data.
- Verdict icons on `/compare` are paired with words (yes/partial/no) — never color- or icon-only.
- Open: no automated axe pass in the sweep yet (contrast, name/role/value beyond what's above); recommended as the next harness increment.

## 6. Trust

- **No fabrications anywhere** — re-verified on rendered pages: no user counts, no testimonials, no invented statistics, no insurer-partnership claims; every remaining number traces to the catalog, the plan defaults, or a cited external source (AADE, HAIC, ν. 4916/2022, Schengen €30,000).
- Self-graded compliance verdicts ("fully GDPR compliant") were replaced by auditable behaviours ("ask for a copy or full deletion whenever you want") in all four locations.
- Tier honesty: reminders and advisor-sharing name the plan that carries them; the guide/glossary CTAs no longer promise free AI gap detection the Free tier doesn't ship.
- **The gap: the site has no legal identity.** /company and /privacy honestly say ΓΕΜΗ/ΑΦΜ "coming soon", but a privacy policy without a named controller is a GDPR Art. 13 completeness hole, and for GEO the missing `Organization` facts (legalName, VAT, address, non-empty `sameAs`) are the difference between "a website" and "an entity" in a knowledge graph. **Highest-priority open item.**

## 7. Performance

- **Architecture is CWV-favorable by construction:** everything above the fold is server-rendered (RSC); client JS is limited to genuinely interactive islands (header, tabs, footer form, animated mock); **zero raster images in the marketing tree** (all visuals are CSS/SVG mockups → no LCP image, no CLS from media); fonts via `next/font` (self-hosted, subset `latin+greek`); no third-party scripts beyond Sentry + Vercel Analytics (CSP-pinned); homepage data reads are cached (`revalidate = 300`) and fail soft.
- **Honest caveat:** Core Web Vitals have **not** been measured on a production build in this audit (dev-server numbers are meaningless). Recommended: one Lighthouse/CrUX pass against policywallet.gr for `/`, `/product`, `/pricing`, one LoB page, `/compare` at mobile throttling; the architecture predicts green, but predicts ≠ measured.

## 8. SEO — technical review

| Area | State | Evidence |
|---|---|---|
| Titles / metas | Every page has unique Greek-first title ≤ 60 chars (incl. template) and 140–160-char description, both locales — **enforced by `tests/unit/seo-metadata.test.ts`** | registry `lib/seo/marketing-pages.ts` |
| Heading hierarchy | One `h1`, no skips, sitewide | measured (sweep) |
| Semantic HTML | Landmarks, lists, `<details>` FAQ, labelled scroll regions | source + sweep |
| Canonicals / hreflang | Per-page canonical; `el` + `en` alternates only where a real mirror exists; `x-default` → Greek (primary market) | `buildMarketingMetadata` |
| Crawlability | Public allowlist in `proxy.ts` mirrored by a test that walks the filesystem — a public page can't silently 307 to signin | `public-route-allowlist.test.ts` |
| Indexability | Previews/branch deploys emit blanket `noindex` (`isIndexableDeployment`); only production indexes | `app/robots.ts` |
| Sitemap | Derived from the page registry (can't drift), bilingual alternates, tuned priorities (product/pricing 0.9, compare 0.8) | `app/sitemap.ts` |
| Structured data | SoftwareApplication + Organization + WebSite + FAQPage + HowTo (home), BreadcrumbList sitewide, priced offers on /pricing — **verified to mirror visible text verbatim** on rendered pages | `lib/seo/jsonld.tsx`, `lib/landing/seo.ts` |
| Internal linking | Footer product hub, guides ↔ lexiko ↔ product cross-links; **every same-origin link on every public page resolves** (measured); two unit tests pin link integrity at source | sweep + `route-link-integrity`, `content-link-integrity` |
| Images | None to optimize; OG/Twitter cards via generated `/opengraph-image` (1200×630), referenced explicitly on every page | `lib/seo/site.ts` |
| Keyword intent | Commercial: 15 LoB pages target the Greek head terms (ασφάλεια αυτοκινήτου/κατοικίας/υγείας…); informational: guides target ENFIA-discount, uninsured-vehicle-fine, coverage-gap queries; definitional: 30+ glossary terms | registry + content |
| Topical authority | Hub-and-spoke: product hub → 15 branches; guides cite laws and authorities; glossary interlinks terms to products | content layer |

**Open SEO items:** `lint:encoding`'s mojibake scan targets only app paths (marketing tree relies on `lint:utf8` alone); JSON-LD `url` fields correctly derive from `NEXT_PUBLIC_SITE_URL` (verify prod env on deploy).

## 9. AEO — answer-engine readiness

The five canonical questions, mapped to extractable answers (all present in both languages, all mirrored in FAQPage JSON-LD where marked ✦):

| Question | Where the extractable answer lives |
|---|---|
| What is PolicyWallet? | Definitional sentence — first homepage FAQ ✦, /company opening, SoftwareApplication description. "X is a…" form, single-sourced |
| Who is it for? | Audience tabs (individuals/agents); pricing page split; agents landing page |
| How does it work? | 3-step HowTo ✦ (rendered + JSON-LD, counts always matching) |
| Why is it different? | «Μου πουλάτε ασφάλεια;» FAQ ✦; differentiators section; /compare table (jobs × options) |
| Why should I use it? | WHY_NOW (3 concrete reasons) ✦-adjacent; cost FAQ ✦ with exact prices in the answer text |

- Answer-oriented sections exist on home (8-item FAQ), product hub (FAQ), pricing (audience FAQs with prices inside the answer sentence — lifted verbatim by engines), every guide (Q&A blocks), every glossary term (definition-first).
- **Structured-data honesty rule is enforced:** FAQ/HowTo markup can only be emitted from content that renders — invisible-markup penalties are structurally impossible.
- **Open AEO items:** the 15 LoB pages use question-form headings but have no per-page FAQ block (adding 2–3 branch-specific Q&As each — «Είναι υποχρεωτική η ασφάλεια σκάφους;» — is the highest-leverage AEO increment); glossary transliteration glosses ("apallagi") are inconsistently applied.

## 10. GEO — LLM citation readiness

- **Crawl access:** `robots.ts` explicitly allows 12 named AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, …) on public content — a deliberate, unusual strength.
- **Entity consistency:** one name everywhere; one definition everywhere (single-sourced, now aligned EL/EN); consistent contact identity (`info@policywallet.gr`, `.gr` origin — pinned by a test that bans the `.com` origin).
- **Clarity & structure:** short declarative sentences, question headings, tables with real comparisons, cited external facts — the exact shape LLMs quote.
- **Authority signals:** guides cite AADE/HAIC/laws by number; glossary disclaims scope honestly («όχι ασφαλιστική συμβουλή»); IDD / ν. 4583/2018 framing separates analysis from regulated advice.
- **Open GEO items (priority order):** (1) the legal-entity vacuum (§6) — an `Organization` without legalName/address/registry ids is weakly groundable; (2) `sameAs` is env-dependent and may render empty in prod — verify at deploy; (3) consider an `/about`-level "facts box" (founded, entity, model: subscriptions-only, no commissions) as a citation anchor.

## 11. Findings register

### 11a. Fixed this session, before this audit brief (36 items — gate-level)
False branch count in FAQPage JSON-LD (20→derived 15) · contradicting dead hero content (~70 % of `lib/landing/content.ts` deleted, type model trimmed) · document-manager SEO metas rewritten · stale OG alt · four contradictory speed claims unified to «σε λίγα λεπτά» (codified as `SPEED_CLAIM`) · invented EN features ("Breed Condition Radar Charts", "Rebuild Cost Guard", "Real-time market value tracking", fabricated tax-export capability, "continuous fund monitoring") removed · EL/EN meaning-parity sweep of all 15 LoB pages · "fully GDPR compliant" self-verdicts demoted to auditable behaviours (×4) · tier overpromises fixed (advisor sharing, reminders, free "AI gap detection" in guide/glossary CTAs, unqualified compare row) · "28s" mock stopwatch · price-change-warning claims (no feed exists) · market-value-tracking cluster on motor · "+12.4 % return" mock · unsourced "lowest in Europe" statistic · agent page closing on B2C prices (audience-aware price band) · currency canon (€2.99) applied · hardcoded prices in the LoB shell now derive from plan-defaults · undefined `pw-btn-md` · footer "Newsletter" translated · localizeHref leaks · compare row-count derived · full ledger + drift-prevention inventory in `marketing-launch-report-2026-08.md`.

### 11b. OPEN — found in the final parity pass, not implemented (this brief is audit-only)

**P1 — meaning/claim parity (EN must match EL):**
1. `positioning.ts` differentiators: EN drops «μόνο» ("You pay us" → should be "We are paid **only** by you"); "product to **push on you**" adds aggression absent from «να σας προτείνουμε».
2. `WhyNow.tsx`: EN "…when you are not" adds a clause the Greek leaves implicit.
3. Company/pricing: «Πρώτα η **ασφάλεια** των δεδομένων» → EN drops "security"; pricing subtitle «λήξεις» rendered "renewals" (= expiries); EN adds "in the fine print".

**P1 — grammar (both languages):**
4. «Κανείς δεν μας πληρώνει για να σας **πει**» → «πούμε» (subject inversion; homepage difference section + /company).
5. Homepage agent widget renders «7d»/«62d» on the Greek page (`AudienceTabs.tsx:336` hardcodes `{c.renewal}d`).

**P2 — terminology consistency:**
6. EN renders «Ευκαιρίες» three ways ("Chances" / "opening" / aria "opportunities") — standardize on "Opportunities"; «Αυτοκίνητο» as both "Car" and "Motor" across widgets; «απαλλαγή» as both "deductible" (motor) and "the excess" (travel); «σοβαρές ασθένειες» as both "critical illness" and "serious illness" on /product/life; cyber EL «Απώλεια κερδών» vs EN "Business interruption" (distinct terms — mirror one).
7. Pricing FAQ «πακέτο» → «πλάνο»; "Individual FAQs" → "FAQs for individuals"; compare/notes: "paid **on** commission", drop 2 × "actually".

**P2 — locale number formats inside Greek mock widgets** (content amounts follow locale; plan prices stay €2.99 canon):
8. `motor/PageClient.tsx:70` "€35,000", `group-health:70` "€40,000", `group-pension:70` "€64,210" → Greek format on the EL side (neighbors already use «1.500 €»).

**P3 — polish:** Greek guillemets inside EN guide/glossary copy (4 spots); "ministerial" added in an EN guide; "confiscation of plates" missing "and registration"; deductible-guide EL states as certainty what EN hedges; footer EN "VAT" → "VAT number", "registered seat" → "registered office"; business card EN header "General Liability" narrower than its body; liability EN "shop window" adds "shop"; pension EN kicker capitalization; ProductSections mock "Ατομική Υγεία"/"Health Plan" mismatch; agent widget EN "Check running" → "Scan in progress"; life mock EL «ανικανότητα» vs body «αναπηρία»; «Την άδεια την δίνετε» → «τη δίνετε».

### 11c. Deliberate keeps (audited, judged correct — do not "fix")
- Plan prices in `€2.99` format in **both** languages: they are product identifiers matching the pricing cards, checkout, JSON-LD offers, and two pinning tests; content amounts (mock widgets, guides) follow locale typography instead.
- "risk intelligence" (EN) ↔ «ανάλυση ρίσκου» (EL) as the category-name equivalence — documented at the source.
- Footer badge "GDPR & AES-256": factual naming, not a self-graded verdict.
- Educational guides explaining the «ψηφιακό πορτοφόλι» market category — answer-engine content about the category, not self-positioning.
- "from whichever company you bought it" — correct fronted pied-piping, not a missing preposition.
- Agents-page SEO title «ασφαλιστικούς πράκτορες» while the site says «ασφαλιστές» — the regulated term is the search term.

## 12. Scorecard

| Dimension | Score | One-line basis |
|---|---|---|
| Brand positioning & storytelling | **A** | Single-sourced category + story spine on every page; honesty as the differentiator |
| 5-second clarity | **A** | All five answers above the fold, both languages, measured on the rendered hero |
| IA & navigation | **A−** | Tight 5-item nav + full footer; /compare not in header (deliberate) |
| UX / visual & CTA hierarchy | **A−** | Token type scale, disciplined CTAs; hex-literal palette is copy-paste consistency |
| Readability & language | **B+** | Plain-language rules enforced; ~30 open parity/terminology polish items (§11b) |
| Accessibility | **A−** | Measured heading/lang/overflow discipline; axe pass not yet automated |
| Trust | **B+** | Zero fabrications, auditable claims; missing legal entity is the ceiling |
| Performance | **B (provisional)** | CWV-favorable architecture; not yet measured on production |
| Technical SEO | **A** | Test-enforced metas, registry-derived sitemap, mirrored structured data, measured link integrity |
| AEO | **A−** | Five questions answerable + honest JSON-LD; LoB pages lack per-page FAQ blocks |
| GEO | **B+** | AI crawlers welcomed, entity consistent; legal-entity + sameAs gaps cap groundability |

**Bottom line:** launch-credible today on truthfulness, clarity, and mechanics — all three now enforced by permanent tests rather than discipline. The open list is polish (§11b, one afternoon of copy edits), one legal/ops dependency (entity details), and one measurement debt (production CWV).

---

## Validation loop — final record (post-audit briefs, same day)

After this audit, two further briefs (full content rewrite; redesign-quality
pass) re-opened implementation. **Every §11b item was applied**, plus each
round's new findings, until the loop closed. One round = full static gate
(3,724 unit tests, tsc, ESLint, i18n incl. untracked paths, UTF-8) + the
`public-anon` browser sweep (59 checks: overflow at 320/1280, one-`h1`,
heading order, `<html lang>`, console, global link integrity) + two
independent full-rubric editorial auditors reading **every** public page pair
in both languages (truth · story · parity · terminology), with a
documented-keeps register so decisions were never re-litigated.

| Round | Findings | Notable |
|---|---|---|
| 1 (story lens) | 9 | last buzz-phrase, jargon counts, agent-page price gap, plan-tagline outcomes |
| 2 (parity lens) | 17 | grammar «για να σας πούμε», "7d" leak, mixed widget locales, guides/legal quote + EEA/euro fixes — **plus the `<html lang>` hydration race on /en/* caught by the sweep and fixed with an ownership guard** |
| 3 (design lens, screenshots 390/1280) | 1 | cookie-banner Greek title-case restored to the dictionary's sentence-case |
| 4 | 5 | group-pension meta promised "projections" the product doesn't have; HAIC/EAEE citation mismatch; 3 micro |
| 5 | 2 | one-word terminology (meta "critical illness"→"serious illness"; "passerby") |
| 6 | 1 + spelling class | «Λύσεις για ασφαλιστές»; 13 British→US spellings swept in guides/glossary |
| **7** | **0** | clean — gate ✓, sweep 59/59 ✓, both auditors zero |
| **8** | **0** | clean — gate ✓, sweep 59/59 ✓, both auditors zero |
| **9** | **0** | clean — gate ✓, sweep 59/59 ✓, both auditors zero — **loop complete** |

Six independent auditors across Rounds 7–9 (fresh instances each round)
returned zero findings on ~60 rendered pages in both languages. The §12
scorecard's "Readability & language" line is now **A** (the §11b list is
empty); everything else stands as graded.

## Launch-readiness loop — final record (production-launch brief, 2026-08-05/06)

A final brief re-opened the loop for launch preparation: review every public
page as CEO, Chief Strategy Officer, Chief Digital Officer, insurance agent,
policyholder, investor, and first-time visitor; fix everything found; stop
only after **three consecutive complete assessment rounds with zero issues**.
One round = the full mechanical gate (**3,764** unit tests — the suite grew by
40 new glossary-title pins — tsc, ESLint, i18n incl. untracked paths, UTF-8,
and the 59-check `public-anon` sweep) **plus four independent lens auditors**
on rendered pages in both locales: SEO+AEO (34-page battery), GEO (114-page
battery), consumer-surface personas (22 renders), product-tree personas
(32 renders) — with the documented-keeps register and canon rulings carried
across rounds so nothing was re-litigated.

### Findings waves (each reset the counter; every fix render-verified in both locales)

| Wave | Found by | Fixed |
|---|---|---|
| A | SEO+AEO, consumer, product lenses | `symmetochi` EL title over budget → 50 chars **and the 60-char title budget is now test-enforced for all glossary terms**; legal "Back to home" made locale-aware; legal `?lang=`/Accept-Language pages now serve language-matched metadata (`buildLegalPageMetadata`; canonicals stay on the clean Greek routes); group-life's 4 links localized; group-health mock "covered" row red→green + property ENFIA block purple→amber (severity semantics); liability + group-health body copy attribute the double-pay check to Plus; 2 copy nits |
| B | mechanical, GEO | 2 latent test failures (committed test pinned pre-gloss EN term names) aligned; **Plus-attribution convention**: /compare gained a `plus` verdict («Ναι, με το Plus» cells for the two gap/duplicate rows), /product lead + bullet, motor ×2 and the group-health teaser attributed |
| C | consumer, product, GEO | Home AudienceTabs gaps bullet + ServicesGrid cards attributed (Plus/Starter); /product hero trimmed to baseline; HowTo step 02→Plus, step 03→Starter (visible **and** JSON-LD); motor + liability teasers attributed; /product and home metas de-fused to «Δωρεάν βασική σύνοψη για 1 συμβόλαιο»; checklist-guide HowTo steps rewritten as verbatim substrings of the visible bullets (28 strings) |
| D | GEO, product | "τι να διορθώσετε πρώτα" (a Plus output) removed from the home hero + home HowTo step 3 free-CTA spans; /product HowTo JSON-LD description neutralized; `siteConfig` fallback aligned. **Owner rulings:** the entity definition and the home og social-card lines KEEP their fix-first phrasing (definitional / purpose-written, no free-fusion) |
| E | product (cross-page seams) | Motor hero trimmed to baseline (document facts only); /product features bullet 3 Starter-attributed — same-page contradiction with step 03 resolved |
| F | consumer, GEO | /solutions/agents "Reminders in one click" attributed to **Agent Starter**; six glossary `howToCheck` hooks attributed (ekpnoi, ananeosi, prasini-karta, dikaiouchos → Starter; asfalismeno-kefalaio, ypasfalisi → Plus, EL/EN register aligned) — **the reminder and detection claim classes are closed sitewide** |

**Canon ruling (governs all of the above):** copy that promises *finding*
gaps, duplicates, or fix-first priorities as a delivered analysis output
carries plan attribution; copy describing the *organized view* — which
branches you hold, what a policy's own text includes/excludes, expiry dates —
is baseline and unattributed. Business/boat/property "mapping" surfaces are
keeps under this ruling.

### The three clean rounds

| Round | Mechanical | SEO+AEO | GEO | Consumer personas | Product-tree personas |
|---|---|---|---|---|---|
| **1/3** | 3,764 ✓ · sweep 59/59, 0 flaky | R11 clean (scope proof: 34 pages byte-stable; no tier string leaked into JSON-LD) | R7 clean (drift = exactly the 14 fixed files; Q-simulation grounds the reminder question correctly) | clean (exact-delta stability; reminder class closed across the set) | clean (fresh-eyes: travel, pension, boat, legal-expenses, group-pension) |
| **2/3** | 3,764 ✓ · sweep 59/59, 0 flaky | R12 clean (34/34 byte-stable both layers) | R8 clean (114/114 byte-identical; both claim classes closed) | clean (least-litigated pairs re-read: contact, company, guides, lexiko) | clean (fresh-eyes: health, life, cyber, pet, property) |
| **3/3** | 3,764 ✓ · sweep 59/59, 0 flaky | **R13 clean — signed off** | **R9 clean — signed off** (one entity, one fact set, verbatim structured data on 114 pages) | **clean — approved** (143 link targets fetched: zero broken; funnel attribution intact; zero metadata duplicates) | **clean — launch-ready** (97 destinations HTTP-checked: zero dead ends; business page fresh-read clean) |

Deep-dive angles exercised inside the clean rounds (beyond the standing
batteries): a 320px structural/tap-target pass over the six distinct
templates, a cross-page coherence read of the 15 LoB pages as one set, a
BFS link-graph crawl of all 120 sitemap URLs (click depth ≤3, zero orphans,
zero generic anchors), robots-directive hygiene, and a **10-question
answer-engine simulation** — every grounded answer correct, including the
adversarial "does the free plan find coverage gaps?" (No — Plus, consistently,
from any grounding combination).
