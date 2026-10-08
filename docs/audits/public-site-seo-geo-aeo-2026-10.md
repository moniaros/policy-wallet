# Public website — SEO / GEO / AEO review (2026-10-08)

Lens: senior search analyst — classic search (SEO), generative-engine visibility
(GEO: ChatGPT, Claude, Perplexity, Gemini, AI Overviews citing the site) and answer
engines (AEO: featured snippets, PAA, voice). Evidence: production HTML fetched
2026-10-08 (robots.txt, sitemap.xml, 19 pages parsed for title/description/canonical/
H1/H2/JSON-LD), plus source. **Not available:** keyword volumes and rankings — the
Ahrefs connector refused keyword/organic queries ("Insufficient plan"); Search Console
was not consulted. Keyword remarks below are therefore hypotheses to validate, not data.

Companions: [code review](public-site-and-design-system-2026-10.md),
[product-design review](public-site-design-review-2026-10.md).

---

## Baseline — what is already strong

- **Crawl access:** robots.txt allows all public paths and names 13 AI crawlers
  explicitly (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-User,
  PerplexityBot, Google-Extended, Applebot-Extended, …) with the same private-path
  disallows. Sitemap: 144 URLs, all 200, el/en/x-default hreflang on each.
- **Metadata hygiene:** every sampled page has a unique title of 37–60 characters with
  the head term up front and the brand last, a 142–161-character description, and a
  self-referencing canonical. Greek slugs are transliterated and readable.
- **Structured data is broad and valid JSON:** Organization + WebSite +
  SoftwareApplication (home), BreadcrumbList everywhere, FAQPage on product/compare/
  trust/platform/guides, Article on guides (published + modified dates), DefinedTermSet /
  DefinedTerm on the glossary, Blog on the guides index.
- **Answer-first content where it matters:** guides use question H2s («Ποιες είναι οι
  προϋποθέσεις για την έκπτωση ΕΝΦΙΑ;», «Πόση είναι η έκπτωση σήμερα;») with direct
  answers and a «Πηγές» section; product FAQs open with the answer («Ναι. Κάθε όχημα με
  άδεια κυκλοφορίας…»). This is exactly the shape answer engines lift.
- **A defensible topical niche:** 16 branch pages + 15 guides + 23 glossary terms,
  bilingual, on "what does my policy actually say" — informational intent the insurer
  and comparison sites under-serve.
- **Honest retired-concept page:** `/lexiko/skor-prostasias` defines the score and says
  the product no longer computes one — the right way to keep a term indexable.

---

## A. Broken / risky (fix before investing in content)

**Status 2026-10-08:** S1–S4 fixed on branch `fix/seo-s1-s4` (S5 awaits the owner's root-layout decision). Guards: advice-verb pattern + probe (`voice-guards`), `proxy-app-segments`, `llms-txt`, `marketing-samples-no-headings`.

| # | Finding | Evidence | Fix |
|---|---|---|---|
| S1 | **Advisory wording in the entity description every AI engine reads.** Organization + SoftwareApplication JSON-LD (and `/company`, home) say the product shows «με το Family, τι να διορθώσετε πρώτα». That is advice in platform voice — the IDD line CLAUDE.md draws (PW-VOICE-01: the product reads and explains; the partner advises). Structured data is quoted verbatim by LLMs, so this is the most-replicated sentence on the site. | `lib/seo/site.ts:69`, `lib/landing/content.ts:204` | Reword to a reading/explaining claim; extend the voice advice-verb guard to `lib/seo/**` (it evidently does not scan it). |
| S2 | **Unknown URLs 307 to the login wall.** `/random-page` → `/auth/signin?callbackUrl=…` (a robots-disallowed path); known sections 404 correctly. Crawlers record redirects-to-blocked instead of 404s, and every speculative GEO fetch (`/llms.txt`, `/llms-full.txt`, `/.well-known/*`) lands on login. | `proxy.ts` deny-by-default | Let unmatched non-app paths fall through to the Next 404 (keep the redirect for app prefixes only), or at minimum allowlist the GEO files. |
| S3 | **No `llms.txt`.** The site curates content for AI crawlers in robots.txt but gives them no map. | 307 above | Add `/llms.txt` (entity definition, the 16 branches, guides, glossary, methodology, pricing, contact) generated from the same registry as the sitemap. |
| S4 | **Homepage outline polluted by product-mock headings.** 5 of 14 homepage H2s are app-screen text: «3 ασφαλιστήρια1 λήγει μέσα σε 30 ημέρες», «Χρειάζεται την προσοχή σας», «Επισκόπηση», «Χάρτης κάλυψης» ×2. Same on `/en`. Chunkers and answer engines segment by heading; a sample screen's "needs your attention" reads as page content. | home H2 extraction | Render the RealScreens samples with non-heading elements (or `aria-hidden` subtree inside the existing `role="img"` wrapper). |
| S5 | **`/en/*` HTML still says `lang="el"`** until a script runs (A1, partial — `Content-Language: en` now sent). Bing and non-JS GEO fetchers read the attribute. | code review A1 | Per-locale root layouts (owner decision pending). |

---

## B. SEO structure (improvements)

1. **H1s drop the head term the title carries.** Title «Ασφάλεια κατοικίας: κάλυψη και
   έκπτωση ΕΝΦΙΑ», H1 «Το σπίτι σας, ασφαλισμένο στη σωστή αξία.»; title «Ασφάλεια
   αυτοκινήτου…», H1 «Αυτοκίνητο, μηχανή, οδική βοήθεια: μία καθαρή εικόνα.». Keep the
   voice line as the subhead; make the H1 carry the term («Ασφάλεια κατοικίας: είναι το
   σπίτι σας ασφαλισμένο στη σωστή αξία;»). Applies to all 16 branch pages.
2. **Sitewide boilerplate H2s.** «Δωρεάν για 3 ασφαλιστήρια. Αναβάθμιση όποτε τη
   χρειαστείτε.» is an H2 on nearly every page; «Αυτά που ρωτούν οι περισσότεροι.» and
   «Δείτε και τις υπόλοιπες ασφαλιστικές κατηγορίες.» repeat across all 16 branch pages.
   Demote CTA bands to non-heading text; make FAQ headings specific («Συχνές ερωτήσεις
   για την ασφάλεια αυτοκινήτου»). This also removes near-duplicate outlines.
3. **Three pages compete for "how does the analysis work".** `/platform`
   («Πώς δουλεύει η ανάλυση»), `/methodology` («Πώς αποφασίζεται ένα εύρημα») and
   `/trust` overlap; `/methodology` is linked from nowhere but the sitemap. Pick one
   primary (methodology is the most citable), merge or differentiate the others, link it
   from the footer and every product page.
4. **`lastmod` on 74/144 sitemap URLs — correct as it is.** `app/sitemap.ts` omits it on
   static pages on purpose: a request-time stamp claims every page changed at crawl time
   and teaches crawlers to ignore the field. Add it only where a real modified date
   exists (e.g. if branch pages gain a content `updatedAt`).
5. **One OG image for every Greek page.** Guides and branch pages share
   `/opengraph-image`. Per-page OG (title + branch icon) lifts share CTR and gives
   multimodal engines a distinct asset per topic.
6. **HowTo schema on home/product** no longer earns rich results in Google (retired
   2023); harmless, but don't spend effort maintaining it. FAQPage keeps value for AI
   engines even where Google limits the rich result — keep it in sync with visible text.

---

## C. GEO — being cited by AI answers

1. **One canonical entity sentence.** Today there are two: «Το PolicyWallet είναι η
   ανεξάρτητη πλατφόρμα προσωπικής ανάλυσης ρίσκου για την ελληνική αγορά» (abstract,
   used in JSON-LD and `/company`) and «Το PolicyWallet διαβάζει τα ασφαλιστήριά σας…
   και σας δείχνει σε απλά ελληνικά τι καλύπτει…» (concrete, home). LLMs answer "what is
   PolicyWallet" from the most repeated definitional sentence. Make the concrete one
   canonical everywhere (JSON-LD, home, company, llms.txt, EN mirrors), lead with the
   category noun people search for, and keep "δεν πουλάμε ασφάλειες" in the same sentence.
2. **Entity facts are thin.** Organization has name, logo, email, description — no
   `legalName`, no ΓΕΜΗ `identifier` (the footer already displays it), no `address`,
   `foundingDate`, `sameAs` (no real social profiles yet). Add what exists; add `sameAs`
   only for real profiles.
3. **YMYL trust signals.** Insurance is "your money". Guides are authored by the
   Organization with no named person, reviewer or credential. Add an `author` /
   `reviewedBy` Person (or the licensed partner, attributed per the voice rules) with a
   visible «Ελέγχθηκε από … · Τελευταία ενημέρωση …» line. The «Πηγές» sections are the
   right instinct — make every number in a guide carry a dated source inline.
4. **Brand string splits in extracted text.** The logo renders as two spans and extracts
   as «Policy Wallet». Give the logo link `aria-label="PolicyWallet"` so text extraction
   and screen readers get one token.
5. **Quotable facts.** AI answers cite pages with crisp, self-contained, numbered claims.
   The ΕΝΦΙΑ guide does this; branch pages mostly don't. One fact box per branch page
   (legal minimum, typical deductibles, what the law requires) with a source — no
   PolicyWallet-specific numbers unless they have a row in `docs/content/CLAIMS.md`.

---

## D. AEO — snippets, PAA, voice

1. Product-page FAQs already answer first — extend to 5–6 questions per branch, phrased
   as people ask them («Καλύπτει η μικτή ασφάλεια το παρκάρισμα;»), 40–60-word answers.
2. Glossary is the best AEO asset: every term page should open with a one-sentence
   definition in the H1's first paragraph (it does) and add 2–3 PAA-style questions.
3. **Content gaps to test** (hypotheses — validate with Search Console / a keyword tool):
   claims («δήλωση ζημιάς», «φιλικός διακανονισμός»), «τι καλύπτει η μικτή ασφάλεια»,
   ιδιωτική ασφάλεια υγείας vs ΕΟΠΥΥ, ομαδικό vs ατομικό συμβόλαιο, ασφάλεια ζωής για
   στεγαστικό, «αύξηση ασφαλίστρου υγείας» (already a section on `/product/health` —
   worth its own guide).
4. **B2B is one page.** Policyholders get 16 branch pages + 15 guides; agents get
   `/solutions/agents` (894 words) and a pricing tab. Owner's equal-education goal
   (2026-10-08) applies to search too: add agent use-case pages (renewal pipeline,
   client reports, bulk intake, GDPR/consent for intermediaries) with their own FAQs.

---

## Recommended order

1. **S1** reword + extend the advice-verb guard to `lib/seo/**` (small, regulatory).
2. **S2 + S3**: unknown paths 404; ship `llms.txt` from the sitemap registry.
3. **S4 + B2**: heading hygiene (mock screens and CTA bands out of the outline).
4. **C1–C3**: one entity sentence, Organization facts, author/reviewer on guides.
5. **B1** keyword-bearing H1s on the 16 branch pages; **B3** consolidate the "how it
   works" trio.
6. Content: AEO FAQ expansion, B2B use-case pages, gap guides — after getting real
   query data (Search Console export or a keyword plan that allows it).

## How to re-check

`python3` over production HTML: title/description/canonical/H1/H2/JSON-LD per URL
(the script used is reproducible from this doc's evidence list); `curl -sI` on
`/llms.txt` and an unknown path for S2/S3; `curl -s /sitemap.xml | grep -c '<lastmod>'`.
