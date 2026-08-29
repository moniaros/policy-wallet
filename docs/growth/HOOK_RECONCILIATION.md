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

---
---

# PW-GROWTH-02 · extension to seventeen hooks

**Run:** `PW-GROWTH-02`, Phase A, 2026-08-29. The register above stands as written for
GROWTH-HOOKS-01's ten hooks; this section supersedes it **only where a row's decision changed**,
and adds the seven hooks that brief did not carry.

**H13 (hospital direct billing) is struck by the brief and has no row.** Reason recorded in the
brief: it needs a provider-network dataset that cannot be derived from a policy PDF, and «δείτε τα
ακριβή έξοδα» is a payout prediction made to someone about to go to hospital.

**Gate: seventeen rows, no two claiming the same canonical URL.** Verified below.

## The decisive change since G-02

Four hooks the brief lists as CREATE **already have published articles** — three of them shipped by
GROWTH-HOOKS-01 itself, under this very register. Creating them again would put two live URLs on one
statutory claim, which §8 of the brief names as a halt condition, not a judgement call. All four are
corrected to EXTEND-or-leave.

| hook | brief says | corrected | canonical URL | why |
|---|---|---|---|---|
| **H1** αναλογικός κανόνας | CREATE, needs C2 | **EXISTS — leave** | `/guides/analogikos-kanonas-ypasfalisi-katoikias` | Shipped by GA-05 on SRC-001…004. Work moves in-app: C2a clause statement on the property policy view. C2b (shortfall estimate) gated on a €/τ.μ. source. |
| **H2** πυρός δανείου | CREATE | **CUT, pending S-04** | — | HALT-G01: ν.2496/1997 + ν.4438/2016 unverifiable; et.gr serves no document to a fetcher. One bounded retry (S-04) before the cut is final. |
| **H3** βραχυχρόνια μίσθωση *(absorbs H14)* | CREATE, needs C3 | **EXISTS — leave** | `/guides/vraxychronia-misthosi-asfalisi-katoikias` | Shipped by GA-05 on SRC-005…008. Its §5 states outright that the product does not detect the letting — C3 must not contradict that. Work moves in-app. |
| **H4** ΑΑΔΕ ανασφάλιστο | EXTEND | **EXTEND — after Z-01** | `/guides/prostimo-anasfalistou-oximatos` | Unchanged decision, new precondition: HALT-G04's wrong fine amounts are corrected first. Extending an article whose money figures understate by €350 would publish the error further. |
| **H5** αστική ευθύνη σκύλου | CREATE | **CREATE — rewritten form only** | `/guides/astiki-efthyni-idioktiti-skylou` | HALT-G03 killed the briefed premise: **no mandatory dog-owner liability insurance exists.** The surviving verified fact — ΑΚ 924 liability, and a home policy's αστική ευθύνη section may already respond — is a legitimate hook and is what the brief's own §2.4 describes. The mandatory-insurance framing must never return. |
| **H6** ΕΛΓΑ | CREATE, §4.5 test | **EXISTS — guide only** | `/guides/elga-apozimiosi-kai-pragmatiko-kostos` | See the §4.5 result below. |
| **H7** ομαδικό *(absorbs H15)* | EXTEND, needs C1 | **Guide stays CUT; C1 in-app only** | `/guides/omadiko-symvolaio-ergasias` *(untouched)* | HALT-G01 cut the guide extension for want of a source. C1 needs no statutory source — only the user's own two documents — so the capability ships to the comparison surface while the article is left alone. X-12 still applies to its «αξίζει να συμπληρώσετε» heading. |
| **H8** επαγγελματική ευθύνη | CREATE, needs C5 | **CUT; C5 halted** | — | HALT-G01, plus per-profession minima needing one source per body. C5's registry is nothing but statute, so it halts with the hook. |
| **H9** δωρεάν έλεγχος | CUT as guide | **Confirmed CUT.** Landing section only | — | Unchanged. Not a checkable statutory fact. |
| **H10** agent compliance | CUT as guide | **Confirmed CUT.** Ticker slot on `/solutions/agents` | — | Unchanged. B2B audience; earns a slot, not an article. |
| **H11** ΕΝΦΙΑ | CREATE, needs C5 | **EXISTS — extend when C5 is live** | `/guides/ekptosi-enfia-asfalisi-katoikias` | Pre-existing article, not from GA-05. Same two-URL halt applies. |
| **H12** ολική καταστροφή | CREATE, needs C4 | **CREATE** | `/guides/oliki-katastrofi-vasi-apotimisis` | The only clean new guide with a live capability behind it. No model-specific content anywhere (brief, struck list). |
| **H14** *(absorbed)* | — | **No row of its own** | → H3 | Absorbed by H3 per the brief. Recorded so the count reconciles. |
| **H15** *(absorbed)* | — | **No row of its own** | → H7 | Absorbed by H7 per the brief. |
| **H16** policy in English | CREATE, `en` primary | **CREATE** | `/en/guides/greek-policy-explained-in-english` | No capability needed. `en` primary with the `el` pair, inverting the corpus default. |
| **H17** SME cyber | CREATE, blocked | **BLOCKED** — X-01 **and** C5 | — | Two independent blocks. `AcordData` has no cyber object (H-010), so there is nothing to check against, and C5 is halted anyway. |
| **H18** οδική βοήθεια | CREATE | **CREATE** | `/guides/odiki-voitheia-echete-idi` | No capability needed. `roadside` is a real branch in the taxonomy, so an in-app surface exists. |

### Canonical-URL uniqueness — the gate

Seventeen rows. Nine name a URL: five already exist (H1, H3, H4, H6, H7, H11 — six, of which H7's is
left untouched), four are new (H5, H12, H16, H18). Eight name none (H2, H8, H9, H10, H17, and the two
absorbed rows). **No URL appears twice.** Gate holds.

## §4.5 — the H6 relevance test, run and recorded

The G-02 register left this open: *"if Track B finds the ΕΛΓΑ scheme's scope does not map to the
wallet's actual holdings, H6 becomes a CUT candidate on relevance rather than on truth."*

**Run 2026-08-29 against `lib/insurance/taxonomy.ts`.** 43 branches; 31 write-enabled
(`WRITE_BRANCH_IDS`, `lib/insurance/taxonomy.ts:381-413`). The only agricultural match is `truck`
— «Φορτηγό / Αγροτικό», `aliases: ['agricultural','van','lorry']`, `parentId: 'motor'` — which is a
**farm vehicle**, not crop or livestock. ΕΛΓΑ covers agricultural *produce and capital*. No fixture
holds one.

**Result: the guide stays, the in-app surface cannot exist.** The article is verified, calm and
well-sourced; there is no reason to withdraw it. But §4.3's mandatory third deliverable — "one
in-app entry point where the hook's answer actually lives" — has no surface to land on, because the
wallet cannot hold the kind of policy the hook is about. H6 is recorded as a **deliberate,
evidenced exception to §4.3**, not an incomplete item.

This is the honest form of the caveat G-02 raised: not a CUT on truth, not a CUT on relevance to
readers, but an admission that the product has no place to answer the question it raises.
