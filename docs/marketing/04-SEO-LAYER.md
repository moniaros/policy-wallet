# Deliverable 4 — SEO layer

**Per changed page: title, meta description, target and secondary queries, both languages, plus the
JSON-LD outline.** Written against the site's real mechanism, not free-form: every entry below is a
diff or addition to `lib/seo/marketing-pages.ts`, whose registry enforces the budgets this document
respects — bare title landing 50–64 chars with the `%s | PolicyWallet` template, description
140–160 chars, Greek-first with an `en` variant only where an `/en` route exists.

**Every string below has been length-checked against those budgets before inclusion.** Do not
rewrite them casually; a rewrite re-enters the budget check.

---

## 1. Homepage `/`

The homepage's metadata comes from `lib/seo/site.ts`, not the registry. Aligned to the new H1:

| | |
|---|---|
| title (el) | `Μάθετε τι πραγματικά καλύπτουν τα συμβόλαιά σας` *(47 + template = 62)* |
| description (el) | `Ανεβάστε κάθε ασφαλιστήριο, από κάθε εταιρεία. Η ανάλυση εξηγεί καλύψεις, εξαιρέσεις και κενά σε απλά ελληνικά — χωρίς πώληση, χωρίς προμήθεια.` *(143)* |
| title (en) | `Know what your policies actually cover` *(38 + template = 53)* |
| description (en) | `Upload every policy, from every insurer. The analysis explains cover, exclusions and gaps in plain language — nothing sold, no commission taken.` *(144)* |

**Target queries (el):** «τι καλύπτει το συμβόλαιό μου» · «ασφαλιστήρια σε ένα μέρος»
**Secondary:** «κενά ασφαλιστικής κάλυψης» · «διπλές καλύψεις» *(a Free feature under amended D1 —
the homepage may now claim it unconditionally, which strengthens this query's landing)* ·
«ανάλυση ασφαλιστηρίου»
**Target (en):** "what does my insurance policy cover" · "insurance policy analyser Greece"

**JSON-LD:** `Organization`, `WebSite` and `SoftwareApplication` already emit from
`lib/seo/jsonld.tsx` — no new types. **One required fix:** the `slogan` field inherits `CATEGORY`,
which is the EL/EN-mismatched eyebrow (Open Question 5). Whatever answer 5 gets, the structured
data follows it automatically because it reads the same constant — that is the argument for fixing
the constant rather than any one surface.

---

## 2. `/product/health` — the wedge page

Registry diff, `marketing-pages.ts` key `product-health`:

```diff
- title: "Ασφάλεια υγείας: καλύψεις, απαλλαγές και όρια"
+ title: "Ασφάλεια υγείας: τι καλύπτει το συμβόλαιό σας"        (45 → 60 with template)
- description: "Κατανοήστε απαλλαγές, ανώτατα όρια και απευθείας κάλυψη νοσηλείας. Η AI
-   εξηγεί το συμβόλαιο υγείας σας σε απλά ελληνικά και εντοπίζει τι σας λείπει."
+ description: "Όρια, εξαιρέσεις, περίοδοι αναμονής και η επιστολή αύξησης, εξηγημένα από
+   το δικό σας συμβόλαιο. Οι ερωτήσεις που αξίζει να κάνετε πριν ανανεώσετε."   (147)
- keywords: ["ασφάλεια υγείας", "απαλλαγή ασφάλειας υγείας"]
+ keywords: ["ασφάλεια υγείας", "αύξηση ασφαλίστρων υγείας", "δείκτης αναπροσαρμογής",
+   "περίοδος αναμονής ασφάλεια υγείας"]
  en:
-   title: "Health insurance: deductibles and limits"
+   title: "Health insurance: what your policy covers"           (41 → 56)
+   description: "Limits, exclusions, waiting periods and the increase letter, all explained
+     from your own policy. The questions worth asking before you renew."        (141)
```

**Target queries (el):** «αύξηση ασφαλίστρων υγείας» · «τι καλύπτει η ασφάλεια υγείας»
**Secondary:** «δείκτης αναπροσαρμογής ασφαλίστρων» · «ΕΔΑ ΕΛΣΤΑΤ» *(only once §2's sources land)* ·
«περίοδος αναμονής» · «εξαιρέσεις ασφάλειας υγείας» · «προϋπάρχουσες παθήσεις ασφάλιση»
**Note:** the old description's «εντοπίζει τι σας λείπει» quietly implied gap detection, which is
Family-gated (D1 as amended 2026-08-30 — gap detection stays Family; duplicate detection is Free,
limited by the plan's policy ceiling) — the new one promises only reading and questions. SEO copy is bound by the
plan-gating truth like every other surface.

**JSON-LD:** page keeps `BreadcrumbList`. **Do not add `FAQPage` here** — the renewal-questions
section is a checklist, not Q&A pairs, and a forced FAQPage over it would mark up questions the page
deliberately does not answer (it routes them to the reader's own policy).

---

## 3. ENFIA — guide `ekptosi-enfia-asfalisi-katoikias` (EXTEND) + `/product/property`

**The guide keeps its existing slug, title and Article/FAQPage JSON-LD** — that machinery already
emits from `lib/guides/content.ts` via `articleJsonLd`/`faqPageJsonLd`, and `dateModified` updates
when the two new sections land, which is the freshness signal. Add one FAQ pair to the guide's
`faq` array so the new peril-scope section is represented:
«Ποιες καταστροφές πρέπει να καλύπτει το συμβόλαιο;» — answered per pass 2 §2.1, with its `[verify]`
resolved first.

Registry diff for `product-property`:

```diff
- title: (current)
+ title: "Ασφάλεια κατοικίας: καλύψεις και έκπτωση ΕΝΦΙΑ"        (46 → 61)
+ description: "Σεισμός, πυρκαγιά, πλημμύρα: τι γράφει ο πίνακας καλύψεων και αν το
+   συμβόλαιό σας πληροί τα κριτήρια της έκπτωσης ΕΝΦΙΑ. Με τον πλήρη οδηγό."    (140)
```

**Target queries (el):** «έκπτωση ΕΝΦΙΑ ασφάλιση κατοικίας» *(guide, already ranks it)* ·
«ασφάλεια κατοικίας σεισμός» **Secondary:** «ανασφάλιστο σπίτι» · «φυσικές καταστροφές ασφάλιση» ·
«ασφάλεια σπιτιού τι καλύπτει»
**Canonical discipline:** the guide is canonical for the statutory claim; `/product/property` links
and never restates the rule with its own authority. Two URLs, one claim, one owner.

---

## 4. `/solutions/partners` + `/solutions/synergates` — new registry entries

New `MarketingPageKey`: `solutions-partners`. **This is the one page whose source language inverts
the site default** — the registry's `en` field is the *variant* slot, so note in the entry that EN
is authoritative and EL is the mirror.

| | |
|---|---|
| title (en, source) | `Protection intelligence for institutions` *(40 → 55)* |
| description (en) | `Consented policy ingestion, coverage understanding and gap detection, embedded in your app or adviser tools. Explainable AI, GDPR Article 9 handling.` *(149)* |
| title (el) | `Ανάλυση προστασίας για τράπεζες και ασφαλιστικές` *(48 → 63)* |
| description (el) | `Συναινετική ανάγνωση συμβολαίων, κατανόηση καλύψεων και εντοπισμός κενών, μέσα στα δικά σας κανάλια. Εξηγήσιμη AI, χειρισμός δεδομένων άρθρου 9.` *(144)* |

**Target queries (en):** "embedded insurance analytics" · "IDD demands and needs software"
**Secondary:** "insurance policy data extraction API" · "consent architecture insurance" ·
"protection gap analysis platform"
**JSON-LD:** `BreadcrumbList` + the existing `Organization` reference. **No `Service` or `Product`
markup** until an offering is public enough to describe truthfully — markup is a claim.
**hreflang:** EN canonical at `/solutions/partners`(?) vs EL at `/solutions/synergates` — the pair
must be declared explicitly in the entry; the site's default EL→`/en/*` mirroring assumption does
not hold here. **Build-time check required** (pass 2 flagged this).

**Ships only when the page ships** — blocked on D2 + Open Question 2 like the page itself.

---

## 5. Pages whose metadata is already right — verified, not assumed

- **`/needs`** — existing entry targets «έλεγχος αναγκών ασφάλισης»; the household/health/ENFIA
  branches change the flow, not the page's subject. No metadata change.
- **`/pricing`, `/compare`** — metadata carries no plan-gating claims; the gating fixes are body
  copy. No change.
- **`/trust`, `/platform`** — additions are body copy (transfer disclosure, fallibility). No change.
- **`/company`** — register shifts to early-access (D3) in body copy; title/description carry no
  maturity claim today. No change.

---

## 6. JSON-LD outline — the complete picture

| Type | Where | State |
|---|---|---|
| `Organization` | sitewide | exists; **`slogan` inherits the OQ5 answer via `CATEGORY`** |
| `WebSite` | homepage | exists, unchanged |
| `SoftwareApplication` | homepage | exists; description aligns with new H1 wording |
| `FAQPage` | guides + LOB pages | exists; ENFIA guide gains one pair |
| `Article` | every guide | exists; `dateModified` moves on the ENFIA extension |
| `HowTo` | `/product` steps | exists — **carries the wrong plan attribution today** (deliverable 2 Part A); fixed by the same `marketing-content.ts` edit as the visible copy, since the JSON-LD is generated from it |
| `BreadcrumbList` | all pages | exists; new partner page enrols via its registry entry |

The `HowTo` row is the one to not miss: the plan-gating contradiction is currently **being served
to search engines as structured data**, and it fixes itself only because the markup is generated
from the same string as the visible copy.
