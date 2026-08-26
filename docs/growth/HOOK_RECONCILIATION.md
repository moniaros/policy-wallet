# HOOK_RECONCILIATION — GROWTH-HOOKS-01 · G-02

Ten hooks against twelve published `/guides` articles. **Every row was filled by opening the
existing article** — titles, section headings and FAQ questions read from `lib/guides/content.ts`,
not inferred from slugs.

**Gate: ten decisions, no two rows claiming the same canonical URL.** Both hold.

| hook | existing guide(s) examined | overlap | decision | canonical URL | redirect | rationale |
|---|---|---|---|---|---|---|
| **H1** underinsurance / αναλογικός κανόνας | `checklist-ananeosis-asfalistiriou`, `poso-kostizei-i-asfalisi-seismou`, `ekptosi-enfia-asfalisi-katoikias` | **partial** — the checklist raises "αν τα κεφάλαια αντιστοιχούν στις σημερινές αξίες" as one bullet; the other two are about cost and tax, not valuation | **CREATE** | `/guides/analogikos-kanonas-ypasfalisi-katoikias` | none | The average clause is a mechanism, not a checklist line. No existing article explains why a correctly-priced policy still pays proportionally less. The checklist gains a cross-link, not the content. |
| **H2** bank-mandated fire policy insures the lender | none | **none** | **CREATE** | `/guides/asfaleia-pyros-stegastiko-daneio` | none | No article covers mortgage-linked cover or the borrower's right to substitute. Clean gap. |
| **H3** short-term letting as undeclared change of risk | none | **none** | **CREATE** | `/guides/vraxychronia-misthosi-asfalisi-katoikias` | none | Guide is editorial and ships independently of the engine. The `coverage_voiding_condition` gap category stays a Track D proposal — the guide must not imply the app detects it. |
| **H4** ΑΑΔΕ uninsured-vehicle flag | **`prostimo-anasfalistou-oximatos`** | **ALREADY PUBLISHED** — §«Πώς εντοπίζονται τα ανασφάλιστα οχήματα» is the ΑΑΔΕ cross-check; FAQ «Το όχημα είναι στην αυλή μου…» covers δήλωση ακινησίας; FAQ «Πώς ελέγχω αν το όχημά μου εμφανίζεται ασφαλισμένο;» is H4's own question | **EXTEND** | `/guides/prostimo-anasfalistou-oximatos` *(unchanged)* | none | A second article here would put two URLs on the same statutory claim — **a §10 halt, not a judgement call.** The extension is narrow: proving cover was in force **on the check date**, which is what the H4 journey outputs. Absorbed by §«Πώς τακτοποιείτε άμεσα την εκκρεμότητα» and the existing FAQ. |
| **H5** mandatory dog-owner liability | `asfaleia-katoikidiou-ti-exaireitai` | **adjacent, different product** — the existing article is pet *health* cover and its exclusions; H5 is third-party αστική ευθύνη for damage the animal causes | **CREATE** | `/guides/astiki-efthyni-idioktiti-skylou` | none | Two different products with one shared noun. Cross-link both ways and keep the boundary explicit in each, or they will drift into each other. |
| **H6** ΕΛΓΑ vs actual replacement cost | `poso-kostizei-i-asfalisi-seismou` | **none in substance** — earthquake pricing for dwellings; ΕΛΓΑ is the agricultural scheme, different peril set and audience | **CREATE** | `/guides/elga-apozimiosi-kai-pragmatiko-kostos` | none | §2.5 governs the register: factual and calm, no fear copy. See the audience caveat below. |
| **H7** group vs individual health | **`omadiko-symvolaio-ergasias`** | **ALREADY PUBLISHED** — §«Πού σταματά η προστασία του ομαδικού;» *is* the leaving-employment cliff; §«Ποιες καλύψεις αξίζει να συμπληρώσετε ατομικά» is the top-up | **EXTEND** | `/guides/omadiko-symvolaio-ergasias` *(unchanged)* | none | Same halt logic as H4. The one angle genuinely absent: **ανανεωσιμότητα** — that leaving the group means individual underwriting at your age and health *then*, not now. Narrow addition to the existing §. |
| **H8** PI limits vs licensing-body minima | none | **none** | **CREATE** | `/guides/epaggelmatiki-astiki-efthyni-oria` | none | Clean gap. Statutory minima are per-profession and **must** come from Track B per body; a single "the minimum is X" sentence across professions would be false. |
| **H9** consumer-initiated second-opinion share | `diaxeirisi-asfalistirion-se-ena-simeio`, `efarmoges-asfalistirion-apozimioseis` | product-comparison content, not statutory | **CUT** | — | — | **Not a checkable statutory fact about the reader's own policy**, which is what §3.1 requires a hook to be. It is a service offer. Retained as a B2B/product surface item, removed from the guide corpus and the B2C ticker. Cut recorded, not dropped. |
| **H10** intermediary compliance → bulk analysis | none | none | **CUT** | — | — | Same reason, B2B audience. Per §3.1 the B2B set renders only on `/solutions/agents` and `/pricing?audience=agent`; it earns a ticker slot there, **not** a `/guides` article. Cut recorded, not dropped. |

**Canonical-URL uniqueness:** eight distinct URLs across eight proceeding hooks — six new, two unchanged. No collisions. No MERGE arose: no two *existing* articles duplicate each other on any hook, so no 301 is owed by this register.

---

## Two findings outside the register, both about the existing corpus

### 1. The existing citations would fail this goal's own §4 standard

`GuideSource` (`lib/guides/content.ts:48`) is `{ label, url }` — **no excerpt, no `verified_at`, no
`reverify_after`** — and the authored URLs are bare homepages (`https://www.aade.gr`,
`https://www.eaee.gr`) cited as the source for specific statutory claims. A homepage cannot be
checked and cannot go stale detectably.

This matters beyond tidiness: the guides render a «Πηγές» block and emit `Article`/`FAQPage`
JSON-LD, so unverifiable citations are **published and indexed under a heading that asserts they are
sources**. That is the same class of defect as the trust metrics already removed from this site —
presenting unverifiable material as verified.

Consequence for Track B, already raised with that agent: `sources-resolve` / `sources-freshness`
must enumerate **the whole guide corpus**, not only the ten hooks. A guard scoped to new content
guards new content, not the invariant — six instances of exactly that in this run. Rewriting the
twelve is **not** in this goal's scope; sizing it and queueing it is.

### 2. Existing headings may already fail `no-advice`

`omadiko-symvolaio-ergasias` §«Ποιες καλύψεις **αξίζει να συμπληρώσετε** ατομικά» reads as a
recommendation, and §2.2 forbids "you should" constructions. H7 is an EXTEND, so this heading is
inside the article this goal touches. Flagged rather than silently rewritten: it predates the goal,
and the `no-advice` guard's universe question is the same one as above.

---

## Audience caveat on H6, raised not resolved

ΕΛΓΑ is the agricultural insurance scheme; its audience is farmers, and the goal classes H6 as B2C
alongside nine consumer-policy hooks. Whether this product's readership includes agricultural
holdings is a positioning question, not a factual one, so it is not mine to decide. **The hook
proceeds** — its statutory basis is verifiable and Track B will confirm it — but if Track B finds
the ΕΛΓΑ scheme's scope does not map to the wallet's actual holdings, H6 becomes a CUT candidate on
relevance rather than on truth.
