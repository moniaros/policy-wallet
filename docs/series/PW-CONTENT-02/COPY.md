# PW-CONTENT-02 — COPY.md

Reviewer: `greek-copy-reviewer`, 2026-10-21, working tree on `pw-customer` (uncommitted).
Inputs: `evidence/copy-diff-el.txt`, `evidence/copy-diff-other.txt`, plus the EN twins and a few changed
Greek strings the two diffs miss (`app/layout.tsx`, `public/manifest.json`, `marketing-pages.ts` keyword), read from `git diff`.
Rules applied: CLAUDE.md PW-VOICE-01, `docs/content/LEXICON.md`, `docs/content/CLAIMS.md`, `docs/content/HALTS.md`
(no open voice halt covers any string below), STEP0 A1–A5 and H-019..H-024.

Status: `ok` (ship as written) · `eli` (needs Eli's sign-off; the cell gives the reason and the proposed text) · `approved` (signed off by Eli, 2026-10-22). No row needs DPO sign-off: the owner decided on 2026-10-22 that DPO review is not required for any item in this series.
Only `+` strings are reviewed. `-` lines are removals and get no row (A1 `freeTrialAvailable`, A5 comparison row, the boat FAQ, `πληρωνόμαστε μόνο από συνδρομές`, the old verdict demo).
Where one string occurs more than once in a file, it gets one row with the count (×N).

**Length method.** I didn't render anything. Widths are estimated from the container classes at 320px. Example: a pricing card is `px-4` section → 288px card → `p-6` → 240px → minus a 20px icon and 12px gap → about 208px of `text-sm` text, at roughly 7–7.5px per Greek glyph. No changed string sits in a container that clips (`truncate`, `line-clamp`, fixed height). The only `truncate` near this copy is the /product demo policy name, and those names didn't change. No changed string holds an identity field (insurer name, policy number), because public pages render no user data. **Truncation findings: 0.** The wrap notes below are about height, not clipping. The 320/390/430 render pass in `dashboard-voice-matrix` / the series measure spec is still the proof.

---

## lib/marketing/limit-statement.ts (new file)

| Id | Surface (file) | Old | New | Status |
|---|---|---|---|---|
| C-01 | `DELETION_ON_REQUEST`, rendered in the /product final CTA (C-A2) and the signup under-CTA (C-55) | «Διαγράφετε τα πάντα όποτε θέλετε» / "Delete everything whenever you want" | «Μπορείτε να ζητήσετε διαγραφή των στοιχείων σας. Όσα πρέπει να κρατήσουμε, όπως τα φορολογικά παραστατικά, δεν διαγράφονται πριν λήξει η σχετική υποχρέωση.» / "You can ask us to delete your data. Records we must keep, such as tax documents, are not erased before that obligation ends." | **approved** by Eli 2026-10-22: the reviewer's draft that mirrors /trust word for word (TrustSections.tsx deletion paragraph). |
| C-02 | `FREE_PLAN_LIMIT` (composes into C-04, C-37, C-38, C-53, C-55, C-56, C-A2) | «Δωρεάν για 3 ασφαλιστήρια» (typed in four places) | «Δωρεάν για ${FREE_POLICIES} ασφαλιστήρια» / "Free for ${FREE_POLICIES} policies" | ok. CLAIMS C1, read from `DEFAULT_ENTITLEMENT_LIMITS.free.policies`. |

## lib/marketing/positioning.ts

| Id | Surface (file) | Old | New | Status |
|---|---|---|---|---|
| C-03 | `CATEGORY_NAME_INLINE` (footer, /compare, `site.ts` definition) | — (only the capitalised label existed) | «πλατφόρμα οργάνωσης και κατανόησης ασφαλιστηρίων» / "platform for organising and understanding insurance policies" | ok. H-022 line, lower-case form. 49 characters, no single long token, so it wraps cleanly. |
| C-04 | `CTA_REASSURANCE` | «Δωρεάν για 3 ασφαλιστήρια. Χωρίς κάρτα. Αναβάθμιση όποτε τη χρειαστείτε.» | «${FREE_PLAN_LIMIT.el}. Χωρίς κάρτα. Αναβάθμιση όποτε τη χρειαστείτε.» (renders the same) | ok |
| C-05 | `COMPARISON_ROWS[4].job` (/compare, homepage excerpt) | «Ξέρετε πάντα πότε λήγει το καθένα» / "You always know when each one runs out" | «Βλέπετε πότε λήγει το καθένα» / "You see when each one runs out" | ok. Drops the «πάντα» promise; the pair matches. |
| C-05a | `COMPARISON_ROWS[2].job` (EN only; EL unchanged «Βοηθά να βρείτε τι εξαιρείται»), cell `family` → `yes` | "Shows you what is NOT covered" | "Helps you find what is excluded" | ok. M7 pair resolved (H-023). |
| C-05b | `COMPARISON_ROWS[3].job` (EN only; EL unchanged «Εντοπίζει πιθανές κοινές καλύψεις») | "Finds if you are paying twice" | "Finds possible shared cover" | ok. M7 pair resolved. |

## lib/seo/site.ts · lib/seo/og-card.tsx · app/layout.tsx · public/manifest.json · lib/seo/marketing-pages.ts

| Id | Surface (file) | Old | New | Status |
|---|---|---|---|---|
| C-06 | `siteConfig.definition` (JSON-LD, home FAQ #1, /company, `/llms.txt`) | «Το PolicyWallet είναι η ανεξάρτητη πλατφόρμα προσωπικής ανάλυσης ρίσκου… δείχνει πού είστε καλυμμένοι και πού όχι…» | «Το PolicyWallet είναι πλατφόρμα οργάνωσης και κατανόησης ασφαλιστηρίων για την ελληνική αγορά. Διαβάζει τα ασφαλιστήριά σας και εξηγεί τι αναφέρουν — και, με το Family, ποια κενά βρέθηκαν και τι να ρωτήσετε τον ασφαλιστή σας. Δεν πουλάμε ασφάλειες και δεν παίρνουμε προμήθεια.» / EN equivalent | ok. The verdict is gone. Gaps are attributed to Family. The question goes to the ασφαλιστής, which is within the advice boundary. EN = EL. |
| C-07 | `siteConfig.description` (root fallback meta, `/llms.txt`) | «Ανεξάρτητος έλεγχος ρίσκου με AI: δείτε πού είστε καλυμμένοι…» | «Πλατφόρμα οργάνωσης και κατανόησης ασφαλιστηρίων: διαβάζουμε τα ασφαλιστήριά σας και εξηγούμε τι γράφουν. Δεν πουλάμε ασφάλειες. Στα ελληνικά και στα αγγλικά.» / EN equivalent | ok. EN = EL. Note: 158 characters, so the search snippet may cut «…στα αγγλικά.». That's an SEO note, not a 320px finding. |
| C-08 | OG/Twitter image, every page (`og-card.tsx` `COPY.el`) | headline «Σας λέμε αν είστε καλυμμένοι.» · sub «Η ${CATEGORY_NAME.el}. …» | headline «Τα ασφαλιστήριά σας, με απλά λόγια.» · sub «${CATEGORY_NAME.el}. Διαβάζουμε τα ασφαλιστήρια που ήδη έχετε — δεν πουλάμε ασφάλειες.» | ok. The verdict headline is gone and the «η Πλατφόρμα» grammar is fixed. EN = EL. The 1200×630 image itself wasn't rendered. |
| C-12 | root default `<title>` (`app/layout.tsx`) | «PolicyWallet — Δείτε αν είστε καλυμμένοι» | «PolicyWallet — Τα ασφαλιστήριά σας, με απλά λόγια» | ok. Not in either evidence diff, so it was found by reading `git diff`. |
| C-13 | PWA manifest `description` (`public/manifest.json`) | «Ανεξάρτητος έλεγχος ρίσκου: δείτε πού είστε καλυμμένοι…» | «Πλατφόρμα οργάνωσης και κατανόησης ασφαλιστηρίων: διαβάζουμε τα ασφαλιστήριά σας και εξηγούμε τι γράφουν. Δεν πουλάμε ασφάλειες.» | ok. Not in either evidence diff. |
| C-14 | /compare `keywords` · /en/product `<title>` (`marketing-pages.ts`) | «ανεξάρτητος έλεγχος ασφάλισης» · EN "AI insurance check: coverages and gaps" | «οργάνωση ασφαλιστηρίων» · EN "Your policies, in plain language" | ok. The EN title now matches the EL title (M7 pair resolved). |

## lib/landing/content.ts (homepage)

| Id | Surface (file) | Old | New | Status |
|---|---|---|---|---|
| C-09 | Home FAQ «Πόσο κοστίζει;» (+ FAQPage JSON-LD) | «…έως 3 ασφαλιστήρια, με μηνιαίο όριο επεξεργασίας. Οι λειτουργίες και τα όρια διαφέρουν…» | «Το δωρεάν πλάνο περιλαμβάνει έως 3 ασφαλιστήρια. Οι λειτουργίες διαφέρουν ανά πλάνο. Δείτε τις τρέχουσες τιμές και τι περιλαμβάνει κάθε επιλογή στη σελίδα τιμών.» | ok. H-020; EN = EL. |
| C-10 | How-it-works step 4 `description` (+ HowTo JSON-LD) | «Δείτε πότε λήγουν τα ασφαλιστήριά σας. Με το Plus λαμβάνετε υπενθυμίσεις και βλέπετε τι άλλαξε όταν ανεβάζετε την ανανέωση.» | «Δείτε πότε λήγουν τα ασφαλιστήριά σας και πάρτε υπενθύμιση πριν λήξουν· με το Plus, από 90 ημέρες πριν. Βλέπετε τι άλλαξε όταν ανεβάζετε την ανανέωση.» / "…; with Plus, from 90 days ahead. See what changed when you upload a renewal." | **eli**. (1) **Silent render regression.** The step's `emphasis` is still lowercase «βλέπετε τι άλλαξε» / "see what changed". The new sentence starts with a capital, and `renderEmphasis` (`components/landing/grafi/HowItWorks.tsx:85`) matches with a case-sensitive `indexOf`, so the bold phrase now drops out in **both** locales without any error. (2) The «90» is a public number. CLAIMS C3 says 90/60/30/15/7, but code is `[90,60,30,15,7,3]` (`lib/renewals/milestones.ts`), so C3 needs amending (see C-20). **Proposed** (copy-only fix that keeps the emphasis matching): «Δείτε πότε λήγουν τα ασφαλιστήριά σας και πάρτε υπενθύμιση πριν λήξουν· με το Plus, από 90 ημέρες πριν. Όταν ανεβάζετε την ανανέωση, βλέπετε τι άλλαξε.» / "See when your policies expire and get a reminder before they do; with Plus, from 90 days ahead. When you upload a renewal, you see what changed." |
| C-11 | Home SEO (el): keyword, `twitterTitle` | «ανεξάρτητος έλεγχος ρίσκου» · «PolicyWallet \| Ανεξάρτητος έλεγχος ρίσκου» | «οργάνωση ασφαλιστηρίων» · «PolicyWallet \| Τα ασφαλιστήριά σας, με απλά λόγια» | ok. EN `twitterTitle` / `twitterDescription` now match the EL (two M7 pairs resolved). |
| C-11b | Home SEO **EN** `ogDescription` (EL unchanged: «Δείτε τι γράφει κάθε ασφαλιστήριο.») | "We read your insurance and tell you where you are covered and where you are not — and, with Family, …" | "We read your policies and show what they say — and, with Family, which gaps were found and what to ask your insurance agent." | **eli**. **M7 drift pair.** The verdict is gone, but the EN still promises Family gap-finding and "what to ask your agent", which the EL share text doesn't say. **Proposed** EN: "See what each policy says." (or extend the EL to say the same thing; EL is authoritative). |

## lib/pricing/public-pricing-content.ts (/pricing)

| Id | Surface (file) | Old | New | Status |
|---|---|---|---|---|
| C-15 | Free + Plus cards (×2) | «Ανάλυση εγγράφων, εντός του ορίου του πλάνου» | «Βασική σύνοψη ασφαλιστηρίου» / "Basic policy summary" | ok. E3/E4; LEXICON #18 «σύνοψη». |
| C-16 | Family card | «Πλήρης ανάλυση AI & απεριόριστες ερωτήσεις» | «Πλήρης ανάλυση AI» / "Full AI analysis" | ok. E6 «απεριόριστες» removed. |
| C-17 | Family card | — | «Ερωτήσεις στην τεχνητή νοημοσύνη» / "Interactive AI Q&A" | ok. E13. 32 characters, wraps to 2 lines at most. |
| C-18 | Family card (split row) | «Εντοπισμός κενών & διπλών καλύψεων» | «Εντοπισμός κενών κάλυψης» / "Coverage-gap detection" | ok. LEXICON #7 «κενό κάλυψης». |
| C-19 | Family card (split row) | (same) | «Εντοπισμός διπλών καλύψεων» / "Duplicate-cover detection" | ok. D1 amendment (ungated). |
| C-20 | Plus + Family cards, comparison table (×3) | «Υπενθυμίσεις ανανέωσης (email)» · «Υπενθυμίσεις & εξαγωγή αναφοράς» · «Υπενθυμίσεις, οδηγός ζημιάς & εξαγωγή αναφοράς» | «Υπενθυμίσεις ανανέωσης από 90 έως 3 ημέρες πριν (email)» / "Renewal reminders from 90 to 3 days ahead (email)" | **eli**. The wording is true (`RENEWAL_MILESTONES = [90,60,30,15,7,3]`), but **the number has no matching CLAIMS row**: C3 still reads «90 / 60 / 30 / 15 / 7» and predates the 3-day rung. Amend C3 before shipping (PW-VOICE-01: a public number needs a row). **Length:** 55 characters. In a card at 320 (about 208px of `text-sm`) it wraps to 2–3 lines. That makes the Plus/Family cards taller, but nothing clips. In the table it sits in a scrolled `min-w-[640px]` row header and wraps. **Proposed** (optional, a shorter alternative with the same truth): «Υπενθυμίσεις ανανέωσης από 90 ημέρες πριν (email)» (50) / "Renewal reminders from 90 days ahead (email)". Otherwise ship as written once C3 is amended. |
| C-21 | Free card, comparison table (×2) | «Υπενθυμίσεις ανανέωσης» ✗ (Free) | «Υπενθύμιση ανανέωσης 30 ημέρες πριν (email)» / "Renewal reminder 30 days ahead (email)" | **eli**. True (`BASIC_MILESTONES = [30]`, fixes E10), but **no CLAIMS row** covers the free 30-day rung. Add one that cites `BASIC_MILESTONES` before shipping. Wording ok, 43 characters. |
| C-22 | Family card, comparison table (×2) | (part of combined rows) | «Εξαγωγή αναφοράς» / "Report export" | ok. Fixes E11/E12; the EN drops "Smart" (LEXICON #20). |
| C-23 | Agent Free card | «Προσθήκη πολλών πελατών μαζί» ✗ | «Προσθήκη έως 10 πελατών μαζί» ✓ / "Bulk import up to 10 clients" | ok. E31; the number is from `bulkImportLimit`. |
| C-24 | Agent comparison table, Agent Free cell of «Προσθήκη πολλών πελατών μαζί» | ✗ | «10 γραμμές» / "10 rows" | ok. Consistent with the sibling cells «100/500 γραμμές». Non-blocking [UX] note: «γραμμές» is file vocabulary while the cards say «πελάτες». A later pass could make the whole row «10 / 100 / 500 πελάτες». |
| C-25 | Agent tab subtitle | «…— με την ίδια ανεξάρτητη ανάλυση ρίσκου ανά πελάτη. Ο πελάτης ελέγχει τι μοιράζεται.» | «Σχεδιασμένα για χαρτοφυλάκιο πολλών πελατών, ανανεώσεις και συνεργασία ομάδας. Ο πελάτης ελέγχει τι μοιράζεται.» | ok. H-022; EN = EL. |
| C-26 | Policyholder FAQ (pricing) | «…Οι τιμές, οι λειτουργίες και τα όρια επεξεργασίας…» | «Το δωρεάν πλάνο περιλαμβάνει έως 3 ασφαλιστήρια και δεν ζητά κάρτα. Οι τιμές και οι λειτουργίες των πληρωμένων πλάνων εμφανίζονται στους πίνακες αυτής της σελίδας. Η τελική χρέωση επιβεβαιώνεται πριν από την αγορά.» | ok. H-020; EN = EL. |
| C-27 | Policyholder subtitle (EN only; EL unchanged «Διαλέξτε τις λειτουργίες που χρειάζεστε: οργάνωση, ανάλυση εγγράφων και υπενθυμίσεις.») | "From simple policy organization to full coverage analysis: gaps, expiry dates, answers." | "Choose the features you need: organisation, document analysis and reminders." | ok. M7 pair resolved (E17). |

## lib/pricing/pricing-view-model.ts

| Id | Surface (file) | Old | New | Status |
|---|---|---|---|---|
| C-28 | Computed annual-savings badge (only when the catalogue differs from the template) | «Εξοικονομείτε ~€${saved}» | «Εξοικονομείτε ~${formatPlanPrice(saved, "el")}» → «Εξοικονομείτε ~21 €» | ok. Goes through the shared formatter (`formatCurrency`); EN = EL. |

## lib/product/catalog.tsx (category cards; descriptions now render on /product only)

| Id | Surface (file) | Old | New | Status |
|---|---|---|---|---|
| C-29 | motor `headlineEl` | «Τι θα πλήρωνε το ασφαλιστήριο — και κενά οδικής βοήθειας.» | «Τι θα πλήρωνε το ασφαλιστήριο — και πού ισχύει η οδική βοήθεια.» / "…and where roadside assistance applies." | ok. E29: the unattributed gap claim is gone, and this describes what the document states. EN = EL. |
| C-30 | home `descEl` | «Με το Family, δείτε αν το σπίτι σας είναι ασφαλισμένο για λιγότερα…» | «Με το Family, συγκρίνουμε το ασφαλισμένο κεφάλαιο με το κόστος ανακατασκευής που αναφέρει το ίδιο το ασφαλιστήριο.» / EN equivalent | ok. States exactly what `insured_value_below_rebuild_cost` compares and makes no claim about the house. EN = EL. |
| C-31 | life `descEl` | «Δείτε αν το κεφάλαιο… φτάνει πραγματικά για την οικογένεια…» | «Δείτε τι αναφέρει το ασφαλιστήριο ζωής: κεφάλαιο, καλύψεις και εξαιρέσεις. Αν επαρκούν για την οικογένεια και το στεγαστικό σας, το συζητάτε με τον ασφαλιστή σας.» / EN equivalent | ok. The adequacy question is handed to the ασφαλιστής, so it's within the advice boundary. EN = EL. |
| C-32 | travel `descEl` | «…και αν τα όρια αρκούν για βίζα…» | «Δείτε τι καλύπτει το ταξιδιωτικό σας ασφαλιστήριο και ποια όρια αναφέρει, πριν φύγετε και όχι στο ταμείο του νοσοκομείου.» / EN equivalent | ok. The unsourced visa claim is gone. EN adds "foreign" (hospital), which isn't a capability. |
| C-33 | boat `headlineEl` | «Υποχρεωτική αστική ευθύνη και κάλυψη σκάφους & μηχανής.» | «Αστική ευθύνη και κάλυψη σκάφους & μηχανής.» / "Liability plus hull & machinery coverage." | ok. H-024. |
| C-34 | boat `descEl` | «Η αστική ευθύνη είναι υποχρεωτική στα ελληνικά ύδατα. Δείτε τι άλλο…» | «Δείτε τι καλύπτει το ασφαλιστήριο του σκάφους σας πριν λύσετε κάβους.» / EN equivalent | ok. H-024. |
| C-35 | business `descEl` | «…Δείτε ποια έχετε και ποια λείπουν, σε μία εικόνα.» | «Το πολυασφαλιστήριο της επιχείρησής σας έχει πολλά σκέλη. Δείτε ποια αναφέρει το ασφαλιστήριο και ποια όχι, σε μία εικόνα.» / "…See which ones the policy lists and which it does not, at a glance." | **ok** (2026-10-22): the «και ποια όχι» clause was removed per the adversarial review — now «Δείτε ποια σκέλη αναφέρει το ασφαλιστήριο, σε μία εικόνα.» |
| C-36 | pet `descEl` | «Ξέρετε ακριβώς τι καλύπτεται και τι δεν καλύπτεται…» | «Δείτε τι αναφέρει το ασφαλιστήριο ότι καλύπτεται και τι εξαιρείται, πριν ο κτηνίατρος σας δώσει τον λογαριασμό.» / EN equivalent | **eli**. Register and grammar. «τι αναφέρει… ότι καλύπτεται» is clumsy. «ο κτηνίατρος σας δώσει» puts the clitic where it reads as «ο κτηνίατρός σας» ("your vet") on first pass (this was already in the old copy). Meaning is fine and EN = EL. **Proposed:** «Δείτε τι γράφει το ασφαλιστήριο για καλύψεις και εξαιρέσεις, πριν σας δώσει ο κτηνίατρος τον λογαριασμό.» / "See what the policy says about cover and exclusions, before the vet hands you the bill." |

## lib/product/lob-faqs.ts

| Id | Surface (file) | Old | New | Status |
|---|---|---|---|---|
| C-37 | /product/motor FAQ «Πώς με βοηθά το PolicyWallet με την ασφάλεια αυτοκινήτου;» | «…Δωρεάν για 3 ασφαλιστήρια, χωρίς κάρτα…» (typed) | «Στέλνετε το ασφαλιστήριο και το διαβάζουμε για εσάς: τι καλύπτει, τι όχι, πότε λήγει. ${FREE_PLAN_LIMIT.el}, χωρίς κάρτα. Δεν πουλάμε ασφάλειες και δεν παίρνουμε προμήθεια.» | **eli** (minor, lexicon). Only the limit is newly composed, but the whole string is in the freeze diff. «Στέλνετε» is a second verb for uploading. LEXICON #21: one noun, one verb, «ανεβάζετε». The meaning is fine: «τι όχι» = exclusions, which every plan shows (H-023). EN = EL. **Proposed:** «Ανεβάζετε το ασφαλιστήριο και το διαβάζουμε για εσάς: …» / "You upload the policy and we read it for you: …" |
| C-38 | /product/fine-art FAQ answer | (same, typed limit) | «Στέλνετε το ασφαλιστήριο και διαβάζουμε την κατάσταση αντικειμένων, … ${FREE_PLAN_LIMIT.el}, χωρίς κάρτα.» | **eli** (minor, lexicon). Same as C-37. **Proposed:** «Ανεβάζετε το ασφαλιστήριο και διαβάζουμε …» / "You upload the policy and we read …" |

## lib/marketing/reading-demo.ts (homepage reading demo; format only, A4)

| Id | Surface (file) | Old | New | Status |
|---|---|---|---|---|
| C-39 | health excerpt | «…έως €500.000 ανά έτος…» | «Άρθρο 4 — Νοσοκομειακή περίθαλψη: έως 500.000 € ανά έτος…» | ok |
| C-40 | health result (covered) | «…έως €500.000 τον χρόνο.» | «Νοσοκομειακή περίθαλψη: έως 500.000 € τον χρόνο.» | ok |
| C-41 | home excerpt | «Ασφαλιζόμενο κεφάλαιο: €180.000…» | «Ασφαλιζόμενο κεφάλαιο: 180.000 €…» | ok |
| C-42 | home excerpt | «Αστική ευθύνη προς τρίτους: €100.000…» | «Αστική ευθύνη προς τρίτους: 100.000 €…» | ok |
| C-43 | home result (review), also `HOME_REVIEW_LINE` on /product | «Αν τα €180.000 φτάνουν…» | «Αν τα 180.000 € φτάνουν για ανακατασκευή εξαρτάται από το ακίνητό σας. Χρειάζεται έλεγχο.» | ok on the homepage, where the excerpt above it gives «180.000 €» an antecedent. On /product, see C-50. |
| C-44 | home result (covered) | «Αστική ευθύνη: έως €100.000.» | «Αστική ευθύνη: έως 100.000 €.» | ok |
| C-45 | motor excerpt | «Ίδιες ζημιές: με απαλλαγή €500…» | «Ίδιες ζημιές: με απαλλαγή 500 €…» | ok |
| C-46 | motor result (covered) | «…με απαλλαγή €500.» | «Ίδιες ζημιές: καλύπτονται, με απαλλαγή 500 €.» | ok |

## lib/guides/content.ts (editorial prose, exempt from the number guard per STEP0 §3.6)

| Id | Surface (file) | Old | New | Status |
|---|---|---|---|---|
| C-47 | underinsurance guide, example paragraph | «…€200.000 … €100.000 … €20.000 … €10.000…» | «Παράδειγμα: ένα σπίτι κοστίζει 200.000 € να ξαναχτιστεί, … συζητήστε το ποσό με τον ασφαλιστή σας.» | ok. Format only, and it ends on the ασφαλιστής, so it's within the advice boundary. |
| C-48 | claims guide, «Στο PolicyWallet αυτό εμφανίζεται…» | «…μιας πλατφόρμας προσωπικής ανάλυσης ρίσκου…» | «…Αυτή είναι η διαφορά μιας πλατφόρμας οργάνωσης και κατανόησης ασφαλιστηρίων από μια απλή αποθήκη εγγράφων…» | ok. H-022; the EN was changed to match. |

## app/(public)/solutions/agents/faqs.ts

| Id | Surface (file) | Old | New | Status |
|---|---|---|---|---|
| C-49 | agent FAQ answer (+ FAQPage JSON-LD) | «…— πληρωνόμαστε μόνο από συνδρομές. Η ίδια ανεξάρτητη ανάλυση που εμπιστεύεται ο ασφαλισμένος…» | «Όχι. Δεν πουλάμε ασφάλειες και δεν παίρνουμε προμήθεια. Η ίδια ανάλυση που βλέπει ο ασφαλισμένος γίνεται το κοινό έδαφος της κουβέντας σας μαζί του.» | ok. H-022: the funding claim and "trusts" are gone. EN = EL. |

## app/(public)/product/ProductSections.tsx · fine-art · compare · footer · LoB band · signup · agents page

| Id | Surface (file) | Old | New | Status |
|---|---|---|---|---|
| C-50 | /product demo card, highlight block (`ProductSections.tsx:257-266`) | «Τι βρήκαμε» + «Το σπίτι σας είναι ασφαλισμένο για λιγότερα από όσα κοστίζει να ξαναχτιστεί.» | «Για έλεγχο» + `HOME_REVIEW_LINE` = «Αν τα 180.000 € φτάνουν για ανακατασκευή εξαρτάται από το ακίνητό σας. Χρειάζεται έλεγχο.» / "To check" + "Whether €180,000 rebuilds your home depends on your property. Needs review." | **eli**. The verdict is correctly gone. Two copy problems remain on this surface: (1) «τα 180.000 €» has **no antecedent** on /product, because the card shows only «Ασφάλεια Κατοικίας · Λήγει 3 Μαρ» and no sum insured. (2) The heading «Για έλεγχο» and the closing «Χρειάζεται έλεγχο.» say the same thing two lines apart. **Proposed:** heading «Κατοικία» / "Home". Change the shared `HOME_REVIEW_LINE` source (homepage too) to «Αν το ασφαλισμένο κεφάλαιο των 180.000 € φτάνει για ανακατασκευή εξαρτάται από το ακίνητό σας. Χρειάζεται έλεγχο.» / "Whether the €180,000 sum insured rebuilds your home depends on your property. Needs review." |
| C-51 | demo card `aria-label` | «…και μια επισήμανση ότι το σπίτι είναι ασφαλισμένο για λιγότερα…» | «Παράδειγμα: τρία ασφαλιστήρια με τις ημερομηνίες λήξης τους, και ένα σημείο που χρειάζεται έλεγχο στο ασφαλιστήριο κατοικίας.» | ok. EN = EL. |
| C-52 | /product feature bullet | «Σας ειδοποιούμε πριν λήξει κάτι — από το πλάνο Plus» | «Υπενθύμιση πριν λήξει κάτι· πιο νωρίς με το Plus» / "A reminder before something runs out; earlier with Plus" | ok. Fixes E21 (Free gets the 30-day email) and follows the pattern of the sibling bullet. 48 characters in a `text-body-lg` list item; wraps, no clip. |
| C-53 | /product hero reassurance | «Δωρεάν για 3 ασφαλιστήρια. Χωρίς κάρτα.» (typed) | «${FREE_PLAN_LIMIT.el}. Χωρίς κάρτα.» (renders the same) | ok |
| C-A2 | /product final CTA (`ProductSections.tsx:384-387`) | EL `CTA_REASSURANCE` / EN "Free for 3 policies. No card. Delete everything whenever you want." | «${FREE_PLAN_LIMIT.el}. Χωρίς κάρτα. ${DELETION_ON_REQUEST.el}» → «Δωρεάν για 3 ασφαλιστήρια. Χωρίς κάρτα. Μπορείτε να ζητήσετε διαγραφή των στοιχείων σας. Όσα πρέπει να κρατήσουμε, όπως τα φορολογικά παραστατικά, δεν διαγράφονται πριν λήξει η σχετική υποχρέωση.» / EN twin | **approved** by Eli 2026-10-22 (deletion sentence = C-01). |
| C-54 | /product/fine-art demo meta | «Συνολική αξία €28.000 · Σε ισχύ» | «Συνολική αξία 28.000 € · Σε ισχύ» | ok. Format only. |
| C-55 | signup under-CTA (`SignupForm.tsx`) | «Δωρεάν για 3 ασφαλιστήρια. Χωρίς κάρτα. Διαγράφετε τα πάντα όποτε θέλετε.» | «${FREE_PLAN_LIMIT.el}. Χωρίς κάρτα. ${DELETION_ON_REQUEST.el}» | **approved** by Eli 2026-10-22 (deletion sentence = C-01). |
| C-56 | LoB pre-footer band, 16 product pages and others (`LoBPageShell.tsx`) | «Δωρεάν για 3 ασφαλιστήρια. Αναβάθμιση όποτε τη χρειαστείτε.» (typed) · prices via `formatEur` («€29») | «${FREE_PLAN_LIMIT.el}. Αναβάθμιση όποτε τη χρειαστείτε.» · prices via `formatPlanPrice` («29 €/μήνα») | ok |
| C-57 | Footer identity line, every public page (`PublicMegaFooter.tsx:292`) | «PolicyWallet — η Πλατφόρμα…» / "PolicyWallet — the A platform…" | «PolicyWallet — πλατφόρμα οργάνωσης και κατανόησης ασφαλιστηρίων.» / "PolicyWallet — platform for organising and understanding insurance policies." | **eli** (EN only, minor). The Greek is a correct article-free apposition. The English drops the article and reads like a typo. **Proposed** EN composition: `PolicyWallet — a ${CATEGORY_NAME_INLINE.en}.` The constant itself must stay article-free for /compare's "is a …". EL ok. |
| C-58 | /compare «Τι είναι τότε το PolicyWallet;» | «Το PolicyWallet είναι μια Πλατφόρμα…» / "…is an A platform…" | «Το PolicyWallet είναι μια πλατφόρμα οργάνωσης και κατανόησης ασφαλιστηρίων. Συγκεντρώνετε τα έγγραφά σας…» / "PolicyWallet is a platform for …" | ok. A4 grammar fix. |
| C-59 | /solutions/agents price line (`AgentsSolutionPageClient.tsx`) | «…κοστίζει €29/μήνα.» | «…κοστίζει ${formatPlanPrice(…,"el")}/μήνα.» → «29 €/μήνα» | ok |

---

## M7 — en/el drift pairs

Definition (STEP0 §5): pairs on live public routes whose `en` asserts a capability, verdict or promise that the `el` doesn't carry.

**M7 in the changed set: 1.**

1. **C-11b**: `lib/landing/content.ts` home `ogDescription`. EN: "…and, with Family, which gaps were found and what to ask your insurance agent." EL: «Δείτε τι γράφει κάθε ασφαλιστήριο.». The EN asserts the Family gap capability and an agent-question promise; the EL asserts neither.

**Against the STEP0 F6 baseline list (7 live pairs → 2 remain):**
- Resolved (5): `COMPARISON_ROWS[2].job.en` (C-05a); `COMPARISON_ROWS[3].job.en` (C-05b); `public-pricing-content.ts` policyholder subtitle EN (C-27); `ProductSections.tsx:386` "Delete everything…" (C-A2); `marketing-pages.ts:87` EN /product title (C-14). Also resolved in `content.ts:224-225`: twitterTitle and twitterDescription (C-11).
- Remaining (2): `content.ts:223` `ogDescription` (above, reworded but still drifting), and **`app/(public)/product/motor/PageClient.tsx:113`**, which this series didn't touch. EN: "…with all renewal dates in one calendar." EL: «…τι δεν καλύπτεται και πότε λήγει το ασφαλιστήριο.» The EN promises a calendar the EL doesn't mention. Out of this diff; listed so the metric isn't reported as 1 when the live count is 2.

The rest of the untouched public EN wasn't swept, so 2 is a floor, not a full census.

---

## Approvals recorded 2026-10-22 (Eli)

- **Deletion line** (C-01, C-A2, C-55): the draft that mirrors /trust word for word. The reviewer's three DPO points (temporal vs permanent exception, "by law" vs the actual retained set, placement) are closed by that choice: the sentence no longer names a legal basis and keeps /trust's «δεν διαγράφονται πριν λήξει η σχετική υποχρέωση».
- **Tagline** «Τα ασφαλιστήριά σας, με απλά λόγια» as the root `<title>`, OG headline and home Twitter title (C-08, C-11, C-12) is approved; the EN /product title (C-14) follows it.
- **DPO sign-off is not required for any item in this series** (owner decision, DECISIONS.md PW-C02-D3).

---

## Notes for Eli (no status change)

- **Tagline vs H-022.** «Τα ασφαλιστήριά σας, με απλά λόγια» now carries the root `<title>` (C-12), the OG headline (C-08), the home `twitterTitle` (C-11) and the EN /product title (C-14). It's a descriptive tagline rather than a category name, and it was already the EL /product title before this series. I read H-022 ("one positioning line") as governing the category label, so I marked these `ok`. If you meant H-022 to cover taglines too, these four become `eli`, and the replacement is «PolicyWallet — Πλατφόρμα οργάνωσης και κατανόησης ασφαλιστηρίων».
- **Formatting.** Demo amounts (C-39..C-46, C-54) and guide prose (C-47) are hand-typed in the correct el-GR form («500.000 €»), not passed through `formatCurrency`. The new number guard accepts correct literals, so this meets A4 but not STEP0 §3.3's "sample values as numbers". Plan prices (C-28, C-56, C-59) do go through the shared formatter.
- **Out of scope, seen in passing (unchanged strings, not rows):** the /product demo card header «Οι ασφάλειές σας» (LEXICON #1 wants «ασφαλιστήρια»); its green/amber status dots beside «Ασφάλεια Αυτοκινήτου» / «Ατομική Υγεία» are colour-coded states with no words. The agent table's «—» for Agent Free analyses/month doesn't say whether the plan runs any analysis.

---

## Round 2 — strings changed 2026-10-22 (owner instruction round)

Wording the owner dictated is `approved`; wording I drafted is `eli` (not reviewed by `greek-copy-reviewer`).

| Id | Surface | Old | New | Status |
|---|---|---|---|---|
| R2-1 | Agency feature line (`public-pricing-content.ts`; `/agent/pricing`) | «Αποκλειστική υποστήριξη» / "Dedicated support" | «Υποστήριξη μέσω email» / "Support by email" | **approved** (dictated) |
| R2-2 | /contact aside | «Ώρες που απαντάμε» + «Δευτέρα – Παρασκευή, 09:00 – 18:00»; phone row | label «Υποστήριξη», value «Υποστήριξη μέσω email»; phone row and the optional phone field in the form removed | **eli** (label «Υποστήριξη» is mine; the value is dictated) |
| R2-3 | /contact meta description (`marketing-pages.ts`) | «Απαντάμε Δευτέρα–Παρασκευή 09:00–18:00 στο …» | «Η υποστήριξη γίνεται μέσω email, στο info@policywallet.gr. Θα χαρούμε να βοηθήσουμε.» (147–144 chars, inside the 140–160 budget) | **eli** |
| R2-4 | /pricing FAQ + in-app FAQ (`subscription-copy.ts`) | «Μπορώ να αλλάξω πλάνο ανά πάσα στιγμή; … αναβαθμίσετε ή να υποβαθμίσετε» | «Μπορώ να αναβαθμίσω το πλάνο μου; Ναι, μπορείτε να αναβαθμίσετε το πλάνο σας οποτεδήποτε από τις ρυθμίσεις λογαριασμού.» (Stripe portal has no configuration in test mode; no in-app downgrade) | **eli** |
| R2-5 | /product/travel FAQ (`lob-faqs.ts`) | «Τουλάχιστον 30.000 € … Είναι απαίτηση της αίτησης για τη βίζα.» | «Για την αίτηση βίζας Σένγκεν, η ελάχιστη ταξιδιωτική ιατρική κάλυψη είναι 30.000 € (κανονισμός ΕΚ 810/2009, άρθρο 15).» Source: Regulation (EC) 810/2009, Art. 15(3), CLAIMS C18 | **eli** (scope kept to the visa application, per the instruction) |
| R2-6 | /account usage row | «Αναλύσεις ασφαλιστηρίων: Απεριόριστες» / «Το δωρεάν πρόγραμμα δεν περιλαμβάνει αναλύσεις AI.» | the count used this month (never «unlimited»); the budget card and its «εξαντληθεί … μέχρι τον επόμενο μήνα» line only where the processing budget binds (Family) | **eli** |
| R2-7 | /agent/pricing lists | «5 AI αναλύσεις/μήνα» (Free), «200» (Pro), «25M tokens/μήνα» (Agency) | Free line removed; Pro «150 AI αναλύσεις/μήνα»; token line removed; fallback prices 29 / 79 / 199 | **ok** (numbers from `planClaim`) |

---

## Round 3 — strings changed by the fresh-review loop (passes 1–6, 2026-10-22)

Not reviewed by `greek-copy-reviewer`; all are drafted by me and wait for Eli (`eli`) unless noted. They only REMOVE a false claim or replace it with what the code does. Grouped by surface.

| Id | Surface | Change | Status |
|---|---|---|---|
| R3-1 | /product steps, guides, glossary, home diagram, AudienceCards, ServicesGrid | «από το πλάνο Plus» / «Υπενθυμίσεις με Plus» removed from reminder lines; /product step now «30 ημέρες πριν σε όλα τα πλάνα, νωρίτερα με το Plus» | **eli** |
| R3-2 | /upgrade comparison (`subscription-copy.ts`, `PricingComparison.tsx`) | «Απεριόριστα ασφαλιστήρια», «Ψηφιακό πορτοφόλι», «Ειδοποιήσεις email ✗» replaced by the real caps (3/10/25) and the two reminder rows; FAQ «δεδομένα … 30 ημέρες» removed | **eli** |
| R3-3 | upgrade copy (`upgrade-copy.*`) | Q&A «στο πλάνο Family»; reminders upsell now states one reminder on every plan, the ladder with Plus; the non-existent «Λίστα ελέγχου πριν την ανανέωση», «Απόφυγε διπλές καλύψεις», priority-queue bullets removed | **eli** |
| R3-4 | help centre (`help-content.ts`) | premium-features article: full analysis = Family; «Υποστήριξη» = email on every plan; ladder includes 3 days; caps read from the entitlement source | **eli** |
| R3-5 | /account, /agent/pricing | monthly-cap sentence and «Απεριόριστες» removed; Pro «150», no token line, no «Branded emails»/«Portfolio gap view»/«Basic CRM»/priority queue | **eli** |
| R3-6 | boat copy (`boat.ts`, risk catalogue, life events, /product/boat heading) | «υποχρεωτική» legal claim replaced by «καλύπτει ζημιές σε τρίτους» | **eli** |
| R3-7 | engagement + churn emails | gap/savings promises replaced by «τι αναφέρει το ασφαλιστήριο: καλύψεις, ποσά, ημερομηνίες» | **eli** |
| R3-8 | /solutions/agents | branded reports named «από το Agent Pro» | **eli** |
| R3-9 | demo cards (/product/life, /product/property, PolicyWalletWidget) | «Λείπει κάλυψη…» / «Βρήκαμε ένα κενό» → «Δεν αναφέρεται στο δείγμα» / «Για έλεγχο» | **eli** |
| R3-10 | API/limit messages, bundles | «Plus and Pro» / «paid plans» for Family capabilities → «πλάνο Family»; «Essential or Professional» (plans that do not exist) removed | **eli** |


## Round 4 — 2026-10-22 (H-021 production rows, trial disclosure, tokens)

| Id | Surface (file) | Old | New | Status |
|---|---|---|---|---|
| R4-1 | Family trial sentence — /pricing card, home pricing preview, UpgradeModal, /upgrade, carried-plan card, sign-up confirmation page, Stripe hosted checkout (`lib/pricing/trial-disclosure.ts`) | «{days} ημέρες δωρεάν δοκιμή» (modal and /upgrade only; nothing on /pricing, nothing on checkout) | «Δωρεάν δοκιμή {days} ημερών. Μετά χρεώνεται {price} τον μήνα, εκτός αν ακυρώσετε πριν λήξει.» (annual: «τον χρόνο») / "Free {days}-day trial. Then {price} a month is charged, unless you cancel before it ends." | approved (owner-dictated 2026-10-22) |
| R4-2 | Annual saving label — /pricing, home preview, /upgrade (`lib/pricing/annual-savings.ts`) and the UpgradeModal CTA lines | «Εξοικονομείτε 4 μήνες» / «Εξοικονομείτε 3 μήνες» / «2 μήνες δωρεάν» (typed) | «Εξοικονομείτε ~21 € τον χρόνο» (Plus) / «~29 €» (Family), computed from the two prices / "Save ~€21 a year" | **eli** (wording is mine; the amount is computed) |
| R4-3 | Monthly-limit messages: `token_topup` upgrade copy, `tokenLimit` ×2, `blockedTokenLimitHint` (el/en) | «Εξαντλήθηκαν τα AI tokens του μήνα … αγοράστε credits», «Συνέχεια με περισσότερα tokens» | «Έχετε φτάσει το μηνιαίο όριο ανάλυσης του πλάνου σας. Το όριο ανανεώνεται κάθε μήνα.»; CTA «Δείτε τα πλάνα» | **eli** (states that the limit renews monthly: true of `billingMonth()` usage rows; confirm) |
| R4-4 | Agent Free «5 αναλύσεις τον μήνα» — /pricing card, comparison table cell «5», /agent/pricing | «—» / absent | «5 αναλύσεις τον μήνα» | approved (owner: published caps 5/50/150/400) |
| R4-5 | /upgrade/success purchase line (`tokensBody`) | «Τα επιπλέον tokens προστέθηκαν στον λογαριασμό σας …» | «Η αγορά καταχωρήθηκε στον λογαριασμό σας και είναι άμεσα διαθέσιμη.» | **eli** (wording only) |
| R4-6 | /upgrade FAQ «Πόσο κοστίζει η ετήσια συνδρομή;» and the settings annual-switch hint (`settings.plan.switchToAnnualDesc`); the «-20%» and «Έκπτωση» chips removed | «Υπάρχει έκπτωση για ετήσια συνδρομή; Ναι — …», «Η ετήσια χρέωση κοστίζει λιγότερο από δώδεκα μηνιαίες.», chips «-20%» / «Έκπτωση» | «Το Plus κοστίζει {…}/έτος και το Family {…}/έτος. Πληρώνετε μία φορά τον χρόνο αντί για κάθε μήνα.»; «Πληρώνετε μία φορά τον χρόνο αντί για κάθε μήνα.» (true whatever the prices; the saving, when there is one, is the computed line on each card) | **eli** (wording only) |
