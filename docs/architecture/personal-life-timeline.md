# The Personal Life Timeline

**Status:** specification · **Date:** 2026-08-04
**Audience:** product, design, engineering
**Companion documents:**
[life-event-model.md](life-event-model.md) ·
[personal-risk-graph.md](personal-risk-graph.md) ·
[risk-engine-validation-2026-08-04.md](../audits/risk-engine-validation-2026-08-04.md)

---

## 1. The claim

The brief's example is not a list. It is a chain of *because*:

```
Bought first home
  └─ because that happened →  Property risk increased
       └─ because of that   →  Home insurance added
            └─ which left    →  Flood coverage missing
                 └─ so       →  Recommendation created
                      └─ and →  Flood coverage purchased
                           └─ therefore → Protection Score improved
```

Sort those seven items by date and you get the same seven items with the arrows
removed. That is a log. Nobody reads their own log.

> **The timeline is a causal graph rendered as a line. The arrow is the product.**

Everything below follows from that. The hard part is not rendering a vertical
rail — it is that **the engine currently throws the causality away**, and no
amount of UI can recover a link that was never recorded.

### 1.1 Why it is worth building

Three reasons, in descending order of how much they justify the work.

**It is the only honest answer to "why am I seeing this?"** The engine already
computes `whyItApplies` for every recommendation, and it is good. But it answers
*why this applies to you now* — not *what changed*. "Because you bought a house
in March" is a different and better sentence, and it is the one that makes
advice feel earned rather than generated.

**It is a compliance asset, not just UX.** Under IDD the advisor must document
demands and needs. A causal chain showing the customer's own declared event, the
risk it created, and the recommendation that followed *is* that documentation,
produced as a side effect of the product working properly.

**It is the product's memory.** A system that remembers you bought a house, and
can say so eighteen months later, is categorically different from one that
recomputes a score every night and presents it as news.

### 1.2 The risk that comes with it

A timeline is also a permanent record of everything the customer did **not** do.
Dismissed recommendations, lapsed policies, ignored renewals.

There is a version of this feature that is a nagging device, and it is the
default version — it takes deliberate effort to avoid. §10.3 is the constraint
set that keeps it out. Stated once here so it is not read as decoration:
**the timeline may never be used to make someone feel behind.**

---

## 2. What exists, and what does not

Honest inventory, because four of the seven inputs the brief names have no home
today, and a spec that glosses over that produces a plan nobody can schedule.

| Input | Status | Source |
|---|---|---|
| **Insurance purchases** | ✅ available | `Policy.createdAt` / `startDate` |
| **Policy renewals** | ✅ available | `PolicyRenewal` |
| **AI recommendations** | ✅ available | `RecommendationInstance` — `createdAt`, `status`, `dismissReason` (`auto:gap_resolved` already records automatic retirement) |
| **Risk changes** | ⚠️ partial | `GapInstance.detectedAt` / `resolvedAt` exist. Catalog risk assessments are computed **live and never stored**, so a risk becoming applicable leaves no trace |
| **Life events** | ❌ specified, not built | `PolicyholderProfile.lifeEvents` is a `Json?` column with six declared types that nothing reads — the audit's orphaned field |
| **Coverage changes** | ❌ absent | Policies are updated in place. No version history, so "flood cover was added" is unrecoverable |
| **Claims** | ❌ absent | No model of any kind |
| **Protection score movement** | ❌ absent | `ProtectionScore` is a single upserted row. **The last step of the brief's own example — "Protection Score improved" — cannot be shown today.** `ProtectionScoreHistory` is audit finding F-08, still blocked on a migration |
| **Causality** | ❌ absent everywhere | No entity records that one thing caused another |

**`ActivityLog` is not a candidate.** It is an admin audit log — `adminUserId`,
`adminEmail`, `isBreakGlass`, `targetUserId`. It records what staff did *to* an
account, not what happened *in* a life. Reusing it would conflate two audiences
with opposite privacy properties.

So the timeline is roughly **one third harvesting and two thirds new
instrumentation.** §12 sequences that so something ships before everything does.

---

## 3. The causal model

### 3.1 `TimelineEntry`

One immutable, append-only fact.

| Field | Notes |
|---|---|
| `id`, `userId` | |
| `kind` | §4 |
| `occurredAt` | when it happened in the world |
| `recordedAt` | when we learned it — they differ, and the difference is sometimes the story |
| `subjectRef` | what it is about: policy, risk, recommendation, node |
| `payload` | kind-specific, minimal |
| `causedBy` | `TimelineEntry.id[]` — **the field the whole design exists for** |
| `confidence` | `stated \| derived \| inferred` |
| `visibility` | `customer \| advisor \| both` |
| `sensitivity` | `standard \| sensitive \| special_category` |

Entries are **never updated**. A correction is a new entry that `supersedes` the
old one, because a timeline that rewrites itself is not a record.

### 3.2 `causedBy` is many-to-many, and that matters

A flood-cover recommendation can be caused by *both* the home purchase *and* the
policy analysis that found the peril missing. Forcing a single parent would make
us pick one and lie about the other.

Three rules keep it honest:

1. **Causality is asserted by the producer, not inferred by the reader.** When
   `syncRecommendations` creates a row, it knows why. That knowledge is free at
   the moment of creation and unrecoverable afterwards. This is the single
   highest-value instrumentation change in the document.
2. **A missing `causedBy` is rendered as an orphan, never guessed at.** "We
   noticed this" is honest; a fabricated cause is not.
3. **Causal edges never cross users.** A household member's event may not appear
   as the cause of another person's recommendation without their consent.

### 3.3 Chains

A **chain** is a weakly-connected component of the causal graph, rendered as one
story. The brief's example is one chain of seven entries — not seven timeline
items.

This is the central UX decision. Seven separate cards is exactly the log nobody
reads; one card with seven steps is a story with a beginning and an outcome.

| Chain state | Definition | Visual weight | Purpose |
|---|---|---|---|
| **Open** | ends in a live recommendation | highest — the only chain with a call to action | the actionable one |
| **Closed** | ends in a resolved risk or a score improvement | medium, positive | the reassuring one; proof the product worked |
| **Abandoned** | ends in a dismissal or a lapse | **lowest** — muted, collapsed, no CTA | present for completeness, never for pressure |
| **Orphan** | single entry, no causal links | low | renewals, purchases we did not prompt |

**Abandoned chains are deliberately the quietest thing on the screen.** They are
the ones a nagging product would shout about.

---

## 4. Entry taxonomy

Seven kinds from the brief, plus the two the example implies.

| Kind | Sub-kinds | Anchor? | Typical cause | Typical effect |
|---|---|---|---|---|
| `life_event` | the 42 in the event model | ✅ usually starts a chain | — | risk change |
| `risk_change` | `became_applicable`, `no_longer_applies`, `priority_changed`, `coverage_state_changed` | rarely | life event, policy change | recommendation |
| `recommendation` | `created`, `actioned`, `dismissed`, `auto_retired` | no | risk change | policy purchase |
| `policy_purchase` | `added`, `imported` | sometimes | recommendation | risk covered |
| `policy_renewal` | `renewed`, `lapsed`, `cancelled` | sometimes | — | risk change |
| `coverage_change` | `peril_added`, `limit_changed`, `endorsement` | no | recommendation | risk covered |
| `claim` | `opened`, `settled`, `declined` | ✅ often starts a chain | — | risk change, coverage change |
| `score_change` | `improved`, `declined`, `became_determinate` | no | any of the above | — the outcome |
| `enquiry` | `question_asked`, `question_answered` | no | — | risk change (needs_review → decided) |

`enquiry` earns its place: the engine's `needs_review` state means *we have not
asked*. When a customer answers, a risk moves out of limbo — and "you told us you
rent, so we stopped guessing about your building" is a genuinely useful entry.

---

## 5. The "why" mechanic

The requirement is that the timeline explains **why recommendations appeared**.
Three levels of answer, progressively disclosed.

**Level 1 — the one-liner, always visible on the recommendation entry.**

> «Επειδή αγοράσατε κατοικία τον Μάρτιο»
> *Because you bought a home in March*

Generated from the nearest **anchor** ancestor — the life event or claim that
started the chain. Not the immediate parent, which is usually a risk change and
reads as circular ("because your property risk increased").

**Level 2 — the chain, on expand.** The full path from anchor to here, one line
per step, in the customer's own dates and numbers.

**Level 3 — the evidence, per step.** What the engine actually knew: the facts
that satisfied the risk's `requires`, the policy scope compared against the
risk's dimensions, the confidence at that moment.

Level 3 is where the compliance value sits, and where an advisor answering a
challenge needs to land.

### 5.1 Two rules that keep it truthful

**A recommendation with no cause says so.** *"We found this when we analysed your
policy"* is a real and acceptable answer. Inventing a life event to explain it
would be a fabrication, and the causal model exists precisely so we never need to.

**The chain shows what we believed at the time, not what we believe now.**
Entries are immutable. If a risk later turned out not to apply, that is a **new
entry** (`no_longer_applies`) appended to the chain — not a silent edit of the
old one. A timeline that retro-fits its own reasoning is worse than no timeline,
because it cannot be trusted for the one job it has.

---

## 6. UX — mobile first, at 320px

Designed at 320px and allowed to relax outward. Not a desktop timeline made to
fit.

### 6.1 The spine

A single vertical rail, **one column at every width**. The alternating
left/right timeline is a desktop idiom that degrades badly and is routinely
ported down; it is rejected here.

```
320px

┌──────────────────────────────┐
│  Η ιστορία σας        [φίλτρο]│   sticky header, min-h-11
├──────────────────────────────┤
│  ── ΜΑΡΤΙΟΣ 2026 ──          │   sticky month divider
│                              │
│  ●  Αγοράσατε κατοικία       │   ← anchor, filled node
│  │  15 Μαρτίου                │
│  │                            │
│  │  ┌────────────────────────┐│
│  │  │ 5 βήματα ακολούθησαν  ▾││   collapsed chain
│  │  └────────────────────────┘│
│  │                            │
│  ◉  Η βαθμολογία σας ανέβηκε  │   ← outcome, ring node
│  │  62 → 74                    │
│  ╵                            │
└──────────────────────────────┘
```

Measurements, chosen against the design system already in the codebase:

| Element | 320px |
|---|---|
| Rail | 2px, 20px from the left edge |
| Node | 12px; anchors filled, outcomes ringed, intermediate steps hollow |
| Card | `pw-card`, 12px inset from the rail |
| Tap targets | `min-h-11` (44px) — the WCAG 2.5.8 floor already enforced in `globals.css` |
| Text | `text-caption` body, `text-kicker` labels — the same steps the risk panel uses |
| Gutters | 16px, matching `px-4` |

### 6.2 A chain card, collapsed — the default

Collapsed is the default because the middle of a chain is *mechanism*, and the
reader wants **what happened** and **what came of it**.

```
●  Αγοράσατε κατοικία                    15 Μαρ
│  Ιδιόκτητη κατοικία, Αθήνα
│
│  ╭──────────────────────────────────╮
│  │ ▾  5 βήματα ακολούθησαν          │   ← min-h-11, aria-expanded
│  ╰──────────────────────────────────╯
│
◉  Η προστασία σας βελτιώθηκε            2 Ιουν
   62 → 74   ▲12
```

Anchor and outcome only. One tap opens the middle.

### 6.3 Expanded

```
●  Αγοράσατε κατοικία                    15 Μαρ
│
├─ ○  Νέος κίνδυνος: ζημιά σε ακίνητο    15 Μαρ
│     Προτεραιότητα: Υψηλή
│
├─ ○  Προσθέσατε ασφάλιση κατοικίας      22 Μαρ
│     Interamerican · Πυρκαγιά, κλοπή
│
├─ ○  Εντοπίστηκε: λείπει κάλυψη         23 Μαρ
│     πλημμύρας
│     ⓘ Γιατί;                            ← level 3
│
├─ ○  Δημιουργήθηκε πρόταση              23 Μαρ
│     «Επειδή αγοράσατε κατοικία»         ← level 1, always visible
│
├─ ○  Προσθέσατε κάλυψη πλημμύρας        1 Ιουν
│
◉  Η προστασία σας βελτιώθηκε            2 Ιουν
   62 → 74   ▲12
```

Every intermediate step is one line plus at most one detail line. **No step is a
paragraph.** Density is the whole point of a timeline; a chain that takes three
screens to read is a document.

### 6.4 An open chain — the only one with a call to action

```
●  Γεννήθηκε το πρώτο σας παιδί           3 Ιουλ
│
├─ ○  Νέος κίνδυνος: απώλεια εισοδήματος
│
◍  Εκκρεμεί: 1 πρόταση                    ← pulsing ring
   Ασφάλιση ζωής · Κρίσιμη
   ╭────────────────────────────────╮
   │  Δείτε την πρόταση             │     ← the single CTA
   ╰────────────────────────────────╯
```

**At most one CTA per chain, and only on open chains.** A timeline where every
card has a button is a catalogue.

### 6.5 States

| State | Treatment |
|---|---|
| **Empty** | Not a blank rail. One entry — "Ξεκινήσατε εδώ" with the join date — plus the single most useful next action. A timeline of one is still a timeline. |
| **Sparse** (< 5 entries) | No filters, no month dividers. Chrome for a list this short is noise. |
| **Dense** (> 50) | Month dividers become sticky; filter chips appear; virtualised list. |
| **Abandoned chain** | Muted, always collapsed, no CTA, no colour. Present, never pressing. |
| **Sensitive entry** | §10.3 — bereavement and diagnosis render as a plain dated line with no card, no chain, no recommendation attached. |
| **Loading** | Skeleton rail with three node placeholders — never a spinner; the rail's shape is recognisable and reduces perceived wait. |

### 6.6 Filters

A horizontally scrollable chip strip — the same pattern already validated in the
risk assessment panel, where six chips wrap to four lines at 320px and push the
content below the fold.

`Όλα · Γεγονότα ζωής · Ασφαλιστήρια · Προτάσεις · Βαθμολογία`

Five chips maximum. Filtering hides **entries**, never breaks **chains** — a
filtered-out middle step collapses to "2 steps hidden" rather than silently
severing the causality, which would make the timeline lie by omission.

---

## 7. Responsive behaviour

| Width | Layout |
|---|---|
| **320–399** | Single column. Rail at 20px. Chains collapsed. No filters below 5 entries. |
| **400–639** (`min-[400px]`) | Same structure, larger type step. Filters appear. |
| **640–1023** (`sm:`–`md:`) | Rail moves to 32px; dates move from under the title to a right-aligned column — the first width where they fit without wrapping. |
| **1024–1279** (`lg:`) | Two-column: timeline left (max 640px), sticky detail panel right. Selecting an entry fills the panel rather than expanding inline. |
| **1280+** (`xl:`) | As above plus a year scrubber in the left gutter. |

**Structure changes at 1024, not before.** Below that it is the same single
column at different scales — which is what makes it genuinely mobile-first rather
than mobile-tolerated.

Non-negotiable at every width: no horizontal page scroll; the chip strip is the
only horizontally scrollable region; Greek compounds get
`overflow-wrap: anywhere` (already in `globals.css` under
`@media (max-width: 430px)`); flex and grid children get `min-width: 0`.

---

## 8. Accessibility

- The rail is an **ordered list** (`<ol>`), because it is one. Decorative nodes
  and connectors are `aria-hidden`.
- Dates in `<time datetime="...">` with a machine-readable value, so "15 Μαρ" is
  announced in full.
- Chain expansion is a `<button aria-expanded>` controlling a region by id — not
  a click handler on a div.
- **Do not use `<details>` here.** It is right for the risk panel's independent
  cards; a chain needs its expanded state coordinated with a right-hand detail
  panel at `lg:`, which `<details>` cannot express.
- Score movement never relies on colour alone: "62 → 74" plus an arrow glyph plus
  an accessible label.
- Focus order follows visual order; expanding moves focus to the first revealed
  step.
- Respect `prefers-reduced-motion` — the open-chain pulse is decorative and must
  stop.

---

## 9. Performance

- Server-paginate by **month**, newest first; 3 months initially.
- Chains are assembled **server-side**. Walking a causal graph in the client
  means shipping the graph.
- Virtualise beyond ~50 entries.
- The chain assembly query must be bounded: cap causal-walk depth (8 is beyond
  any realistic chain) so a pathological cycle cannot hang a page render.
- Cache per user, invalidated on any new entry — entries are immutable, so the
  cache is safe by construction.

---

## 10. Copy and conduct

### 10.1 Voice

Past tense, second person, factual. **"You added home insurance"**, not "Home
insurance was added" and not "We recommended". The customer is the subject of
their own timeline; the product is not the hero of it.

### 10.2 The advice line

Recommendation entries carry the same framing the rest of the product uses —
informational, never "you should have". A timeline is unusually tempting to write
as hindsight, and hindsight framed as advice is exactly what IDD constrains.

### 10.3 Sensitive entries — a hard constraint

The event model classifies bereavement, diagnosis, divorce and job loss as
`sensitive` or `special_category`. On the timeline:

- **Never an anchor for a commercial chain.** A bereavement must not render as
  the cause of a recommendation, however true that causal link may be.
- **Rendered as a plain dated line** — no card, no colour, no chain, no CTA.
- **`special_category` entries are excluded from advisor visibility by default**
  and from every export that is not an explicit Art. 15 subject-access request.
- A customer can hide any entry from their own timeline without deleting it.

### 10.4 Abandoned chains

Never counted, never summarised ("you dismissed 4 recommendations"), never
resurfaced as a nudge. They exist so the record is complete, which is a different
purpose from being seen.

---

## 11. Data model sketch

Shape only.

```
timeline_entries
  id, user_id, kind, sub_kind,
  occurred_at, recorded_at,
  subject_type, subject_id,          -- polymorphic ref
  payload_json,                      -- minimal, kind-specific
  confidence, visibility, sensitivity,
  supersedes_id,
  created_at
  INDEX (user_id, occurred_at DESC), (user_id, kind), (subject_type, subject_id)

timeline_causal_edges
  from_entry_id, to_entry_id,        -- "from CAUSED to"
  relation,                          -- caused | contributed_to | resolved
  asserted_by                        -- which producer claimed it
  INDEX (to_entry_id), (from_entry_id)
```

Two notes:

- **Separate edge table, not a `causedBy` array.** Chains are walked in both
  directions — forward to render, backward to answer "why". An array is only
  indexable one way.
- **Entries are personal data.** Art. 15 export and erasure from day one. The
  audit found two consecutive personal-data stores added without DSR wiring, and
  this one carries `special_category` entries.

---

## 12. Delivery order

Sequenced so something ships before everything does, and so each phase is useful
alone.

| Phase | Scope | Unblocks |
|---|---|---|
| **1** | `timeline_entries` + edges. Backfill from what exists: policy purchases, renewals, recommendation created/dismissed/auto-retired, gap detected/resolved. **No causality yet** — a plain reverse-chronological list. | Ships a real feature; proves the read path and pagination |
| **2** | **Producers assert causality.** `syncRecommendations` writes the edge it already knows about. This is the highest-value change in the document and touches one function. | Chains; the "why" line; levels 1 and 2 |
| **3** | `ProtectionScoreHistory` (audit F-08, already specified and blocked on a migration). | `score_change` entries — **the brief's own final step** |
| **4** | Life events (per the event model) become anchors. | Real anchors; level-1 copy stops being "we found this" |
| **5** | Policy version history → `coverage_change`. | "Flood cover added" — currently unrecoverable |
| **6** | Claims. | Claim-anchored chains |

**Phase 2 is the one that matters.** Phases 1 and 3–6 add material; phase 2 adds
the arrows, and without arrows this is a log.

---

## 13. Non-goals and open questions

**Non-goals.** A social feed. Predicting future events. A gamified streak.
Advisor-authored narrative (the timeline records what happened, not what someone
says about it). Replacing the recommendation surface — the timeline explains
recommendations, it does not host them.

**Open, and genuinely undecided:**

1. **How far back does level 1 walk?** "Because you bought a home in March" is
   right at three steps. At nine steps and two years, the nearest anchor may be
   less relevant than the immediate cause, and I do not know where the crossover
   sits.
2. **Do advisors get a different timeline or a filtered one?** A filtered view is
   simpler and risks leaking the *shape* of hidden entries through gaps in the
   sequence.
3. **Should `risk_change` entries be visible at all by default?** They are the
   mechanism, and mechanism is what makes the chain legible — but they are also
   the least interesting rows, and they outnumber everything else.
4. **What happens to a chain when the customer retracts the anchor?** Correcting
   "I bought a home" to "I did not" should not silently delete the five entries
   that followed, but leaving them orphaned is also wrong.
5. **Is a score change ever an entry in its own right,** or only ever the outcome
   of a chain? A nightly recomputation that moves the score by one point is noise;
   the boundary between that and a real movement is unset.
6. **Does the timeline make dismissal harder?** Knowing an action is recorded
   permanently may suppress honest dismissals — the opposite of what the
   recommendation lifecycle needs to stay accurate.
