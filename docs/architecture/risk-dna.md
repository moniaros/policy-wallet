# Risk DNA

**Status:** specification · **Date:** 2026-08-04
**Audience:** product, design, actuarial, engineering
**Companion documents:**
[personal-risk-graph.md](personal-risk-graph.md) ·
[life-event-model.md](life-event-model.md) ·
[personal-life-timeline.md](personal-life-timeline.md) ·
[risk-engine-validation-2026-08-04.md](../audits/risk-engine-validation-2026-08-04.md)

---

## 1. The founding constraint

There is already a Protection Score: one number, six weighted categories,
computed from 21 assessed risks, validated across 24 scenarios and 355
assertions.

The obvious way to build Risk DNA is to write a second scoring system with nine
dimensions. **That would be the worst possible outcome**, and this codebase has
already demonstrated why three times: two disagreeing definitions of
`getExpectedLines`, three independent definitions of "profile completeness", and
a portfolio rule set that scored in parallel with the risk catalog. Every one of
those shipped, and every one produced two surfaces describing the same person
differently.

> **Risk DNA is a re-projection of the existing assessment, not a second
> measurement. One arithmetic, two views.**
>
> The Protection Score is the composite. The DNA is that same computation
> decomposed into nine readable dimensions. **If they can disagree, one of them
> is wrong** — and it is a CI failure, not a rounding difference.

Concretely: no dimension may read a fact the Protection Score cannot see, and
recomposing the nine dimensions under the existing category weights must
reproduce the headline number exactly.

### 1.1 And there is no second composite

The temptation is a letter grade — "your Risk DNA: B−". Rejected.

The validation work found the protection score compressing every uncovered
profile into 19–46, hiding the difference between a single renter with one modest
gap and a landlord with two uninsured properties. Collapsing nine dimensions into
one letter reintroduces exactly that, one layer up, and discards the information
the DNA exists to expose.

The Protection Score is the composite. The DNA never produces another one.

---

## 2. The nine dimensions

### 2.1 Eight are exposure; one is not

Eight dimensions answer *how much of this exposure is answered*. **Financial
Resilience answers something else entirely: how much you could absorb without any
cover at all.**

It is the denominator, not another numerator — and it is the only dimension where
a high score means you need **less** of what we sell. That is precisely why it
belongs, and precisely why it is the one a commercially-minded revision would
quietly drop. Its presence is the clearest signal the product is measuring
protection rather than opportunity.

Resilience is also **cross-cutting**: it modulates the urgency of every other
dimension. The engine already has the hook — `savingsRunwayMonths` scales the
income-protection need, and the `retain` mitigation exists because a household
with real savings genuinely should carry some risks itself.

### 2.2 Mapping — 21 risks onto 9 dimensions

Risks may belong to more than one dimension. This is safe **only because there is
no second composite**: membership can be generous for reading without
double-counting into a total. Each risk has one `primary` dimension for counting;
`secondary` membership adds context.

| Dimension | Primary risks | Secondary |
|---|---|---|
| **Property** | `home_building_damage`, `home_contents_tenant`, `landlord_letting`, `valuables_loss`, `boat_liability`, `motor_liability` | — |
| **Income** | `income_interruption`, `retirement_shortfall` | `life_dependents` |
| **Family** | `life_dependents`, `life_debt` | `income_interruption`, `health_access_delay` |
| **Health** | `health_access_delay`, `chronic_condition_costs`, `activity_injury` | `income_interruption` |
| **Liability** | `professional_liability`, `employer_liability`, `motor_legal_disputes`, `home_legal_disputes`, `pet_costs` | `motor_liability`, `landlord_letting` |
| **Cyber** | `cyber_fraud` | — |
| **Travel** | `travel_abroad` | `health_access_delay` |
| **Business** | `business_assets_interruption` | `professional_liability`, `employer_liability` |
| **Financial Resilience** | *none — derived, see 2.4* | — |

Two mappings worth defending:

- **`motor_liability` is primary to Property, secondary to Liability.** The
  customer thinks of the car as a thing they own; the actual exposure is
  third-party injury. Both readings are true, and the dimension a customer
  navigates by is the asset.
- **`life_debt` is Family, not Property.** The loss is that the household has to
  sell the home, not that the building is damaged. The dimension should follow who
  suffers.

### 2.3 Thin dimensions are a finding, not a flaw

Cyber and Travel each carry exactly one risk; Business carries one primary. A
dimension backed by one risk cannot produce a meaningful gradient — it is
effectively binary.

Two options, and the honest one is the second:

- Merge them into "Lifestyle" — which is what the current score category does, and
  which hides them.
- **Render them, and say the scale is coarse.** A single-risk dimension shows two
  or three states, not a percentage, and its confidence is labelled accordingly.

The thinness is real information: it says the catalog has one lens on cyber risk,
which is true and worth an author noticing.

### 2.4 Financial Resilience — how it is computed

Not from risks. From four inputs the graph already holds:

| Input | Contribution | Rationale |
|---|---|---|
| Savings runway (months of income held) | 40% | The single best predictor of whether a shock becomes a crisis |
| Debt-to-income | 25% | Obligations that survive an income interruption |
| Dependants per earner | 20% | How many people one interruption reaches |
| Cover breadth already held | 15% | Cover is itself resilience |

Scored on an absolute scale, not against peers: 12+ months' runway is strong for
anyone. It is **the one dimension with no "gap"** — there is nothing to buy, and
its suggested actions are all `retain` and `reduce`.

---

## 3. The six attributes

For each dimension.

### 3.1 Score — 0-100

Same arithmetic as the category score, over that dimension's primary risks:
absolute severity ceiling, `KIND_PENALTY` discounting discretionary risks,
`PRIORITY_WEIGHT` by assessed priority. Not a new formula — the existing one,
partitioned differently.

**Excluded from the denominator, as in the engine:** `not_applicable` (not this
customer's risk) and `needs_review` (a question we have not asked). Scoring either
would mean scoring our own ignorance.

### 3.2 Confidence — and it must be *visible*, not merely labelled

Composed by the engine's existing rule: **the minimum along the derivation path**.
A dimension is as confident as its least-known input.

| Level | Meaning |
|---|---|
| `high` | every deciding factor answered |
| `medium` | decided on answered facts, something material still unknown |
| `low` | applicability itself undetermined for most risks in the dimension |
| `indeterminate` | fewer than half the dimension's risks decided — **no score is shown at all** |

The failure mode this guards is specific and already observed: during validation,
a profile nobody had ever asked scored **90 "Excellent"** — computed from the two
or three risks that apply to everybody. A low score and an unknown one must never
render alike.

**So confidence is encoded in the mark itself, not in a caption beside it.**
An `indeterminate` dimension shows a hatched, unfilled bar and the words "not
enough information" where a number would be. A reader skimming nine bars must be
able to tell "you are exposed here" from "we have not asked" without reading a
single label.

### 3.3 Trend — which does not exist yet, and must not be faked

Trend requires history. `ProtectionScore` is a **single upserted row**;
`ProtectionScoreHistory` is audit finding **F-08**, specified and still blocked
on a migration.

**Until it lands, Trend renders as "no history yet — we started measuring on
{date}", never as a flat line.** A flat sparkline is a claim of stability, and
claiming stability we cannot observe is the same class of error as scoring a
stranger.

When history exists:

| Value | Meaning |
|---|---|
| `improving` / `declining` | ≥5 points over 90 days |
| `stable` | within ±5 over 90 days, **with at least two observations** |
| `new` | fewer than two observations |
| `volatile` | direction changed twice or more — usually means intake is churning, not that the life is |

Trend must be **attributable**. A movement with no cause in the timeline is a
recomputation artefact, and should be suppressed rather than shown. This is the
direct dependency on the timeline's causal edges.

### 3.4 Urgency

The maximum assessed priority among that dimension's open findings —
`critical | high | medium | low | none`. Not recomputed; read from the
assessment, where the discretionary cap already prevents a convenience product
outranking a compulsory one.

Urgency and score are **independent**, and the pairing is the useful signal:

| | High urgency | Low urgency |
|---|---|---|
| **Low score** | act now | broad but survivable |
| **High score** | one sharp gap in an otherwise sound area — *the most commonly missed case* | fine |

### 3.5 Explanation — deterministic first, AI optional

**The explanation is generated from the assessment, not by a model.**

The engine already holds, per risk: what can go wrong, why it applies in the
customer's own facts and figures, what it would cost, and a mitigation ladder.
A dimension summary is a composition of those — deterministic, reviewable,
reproducible, and safe under IDD, where a licensed activity's output must be
defensible.

An LLM may add a *narrative* layer on top — one paragraph tying the nine
dimensions into a story. It sits **outside the critical path**: if it fails, the
DNA renders unchanged.

Two reasons for that boundary. First, the audit found the AI risk-profile
analysis has **zero callers** and cannot see the new context factors — putting it
in the critical path would ship a half-blind dependency. Second, and more
durable: a compliance-sensitive summary whose wording changes between renders
cannot be reviewed, and unreviewable advice is the thing IDD exists to prevent.

### 3.6 Suggested actions — from the mitigation ladder

Drawn from the risk catalog's `Mitigation[]` — `avoid | reduce | retain |
transfer` — with insurance appearing as one labelled option, never as the frame.

Per dimension: **at most three**, ordered by the ladder rather than by
commercial value, and de-duplicated across risks (three risks all answered by
"build a savings buffer" is one action).

Financial Resilience is the proof this is real: its actions are entirely `retain`
and `reduce`, and it can end with *"you are well placed here — consider carrying
more risk yourself and spending less on cover."*

---

## 4. UX

### 4.1 The signature — and why it is not a radar chart

The instinct for "DNA" is a nine-axis radar. Rejected on four grounds:

1. **Unreadable at 320px.** Nine axes and their labels in ~288px of usable width
   is not a legibility problem to solve; it is a wrong choice.
2. **Area misleads.** Radar encodes value as radius while the eye reads area, so
   doubling one dimension roughly quadruples its apparent weight. On a chart whose
   purpose is honest proportion, that is disqualifying.
3. **Axis order carries meaning it does not have.** Adjacency implies relatedness;
   ours is arbitrary, and rotating the chart changes the shape.
4. **Confidence cannot be encoded.** The one thing this design must show — the
   difference between exposed and unknown — has nowhere to live on a radar.

**The strand** is proposed instead: nine stacked horizontal bars, read like a
barcode. It is a genuine visual signature — two people's strands are
distinguishable at a glance, and one person's changes visibly after a life event
— while being mobile-native, accessible and confidence-aware.

```
320px

┌────────────────────────────────┐
│  Το προφίλ κινδύνου σας        │
│  Ενημερώθηκε 2 Ιουν            │
├────────────────────────────────┤
│  Ακίνητα      ███████░░░  72 ▲ │
│  Εισόδημα     ███░░░░░░░  31 ! │   ! = urgency marker
│  Οικογένεια   █████████░  88 ▲ │
│  Υγεία        ██████░░░░  60 – │
│  Ευθύνη       ░░░░░░░░░░  —    │   hatched = not asked
│  Κυβερνο.     ████░░░░░░  ~    │   ~ = coarse scale
│  Ταξίδια      ⌀ δεν σας αφορά  │   not applicable
│  Επιχείρηση   ⌀ δεν σας αφορά  │
│  ─────────────────────────────  │
│  Αντοχή       ████████░░  79 ▲ │   resilience, set apart
└────────────────────────────────┘
```

Four things the strand does that a radar cannot:

- **Not-applicable dimensions are shown as such** rather than as zero. "Travel is
  not your risk" is a finding, and it is the finding this whole engine was rebuilt
  to be able to state.
- **Unknown is hatched, not empty.** Visibly different from exposed.
- **Resilience sits below a rule**, because it reads in the opposite direction and
  should not be scanned as "another low bar is bad".
- **Coarse dimensions are marked `~`.** A single-risk dimension does not pretend
  to a percentage.

### 4.2 Interaction

Tapping a row expands it in place (accordion, one open at a time on mobile):

```
│  Εισόδημα     ███░░░░░░░  31 ! │
│  ╭────────────────────────────╮ │
│  │ Βεβαιότητα: Υψηλή          │ │
│  │ Τάση: δεν υπάρχει ιστορικό │ │   ← honest, not a flat line
│  │ Επείγον: Υψηλό             │ │
│  │                            │ │
│  │ Οι αποταμιεύσεις σας       │ │   ← deterministic explanation
│  │ καλύπτουν ~2 μήνες...      │ │
│  │                            │ │
│  │ Τι μπορείτε να κάνετε      │ │
│  │  • Χτίστε απόθεμα          │ │   ← retain, first
│  │  • Δείτε τι δικαιούστε     │ │   ← reduce
│  │  • Προστασία εισοδήματος   │ │   ← transfer, last
│  ╰────────────────────────────╯ │
```

The ordering is load-bearing: the same ladder as the recommendation cards, so
the two surfaces cannot tell different stories about the same risk.

### 4.3 Responsive

| Width | Layout |
|---|---|
| **320–399** | Strand full-width; labels above bars if a Greek label would truncate. Accordion, one open. |
| **400–639** | Label and bar on one row; numeric score right-aligned. |
| **640–1023** | Two-column bars; still accordion. |
| **1024+** | Strand left (max 480px), sticky detail panel right; selection fills the panel instead of expanding inline. |

Structure changes only at 1024. Below that it is one column at different scales.
Greek labels get `overflow-wrap: anywhere` and never `truncate` — a clipped
category name is not a shorter label, it is a different one, which the validation
round found and fixed on the score card.

### 4.4 Accessibility

- A `<table>` with real headers, visually restyled. It is tabular data, and a
  screen-reader user should get "Income, 31 out of 100, high confidence, urgency
  high" from the semantics rather than from `aria-label` patches.
- Score never by colour alone — number, bar length and label always present.
- Confidence encoded by **pattern** (hatching), not only by opacity, so it
  survives high-contrast modes and colour-blind vision.
- `prefers-reduced-motion` disables the after-event transition (§5.2).
- Urgency markers carry text alternatives, never a bare `!` glyph.

---

## 5. How Risk DNA changes after a life event

This is where the metaphor earns itself: a life event visibly changes the shape
of the strand, and the change is explicable.

### 5.1 The chain

```
Life event ──▶ ContextDelta ──▶ re-assessment ──▶ dimension deltas ──▶ new strand
   (spec 2)      (spec 2)        (engine)          (this doc)          (UX)
                                     │
                                     └──▶ timeline entries (spec 4) — the WHY
```

Note the direction. **The event never writes to the DNA.** It changes what we
know; the engine re-derives; the DNA re-projects. Anything else would let an
event author set a score directly, which is the product-trigger pattern in a new
costume.

### 5.2 Showing the delta, not just the new state

After an event the strand renders in **delta mode** for the length of the event's
window (spec 2, §8): previous value as a ghost bar, current as solid, movement
labelled.

```
│  Οικογένεια   ░░░▓█████░  45 → 88  ▲43 │
│               ↑ Γεννήθηκε το παιδί σας │
```

The label is the *cause*, not the movement. "Your Family score rose 43 points" is
a fact about our arithmetic; "because your first child was born" is a fact about
their life, and only the second is worth reading.

### 5.3 Multi-dimension movement is the interesting signal

Real events move several dimensions at once, and the **shape** of the movement is
more informative than any single number:

| Event | Moves | Why the shape matters |
|---|---|---|
| First child | Family ▲▲, Income ▲, Resilience ▼ | Protection need rises *and* absorptive capacity falls — the two move against each other, which is what makes this the highest-urgency event in the model |
| Buying a home | Property ▲▲, Family ▲ (debt), Resilience ▼▼ | The deposit consumes the buffer at the moment the exposure appears |
| Mortgage cleared | Family ▼, Resilience ▲▲ | A **reduction** — the product should be able to celebrate spending less |
| Retirement | Income ▼ (no income to interrupt), Health ▲, Resilience varies | Two dimensions move in opposite directions; a single composite would show almost nothing |
| Starting a business | Business ▲▲, Liability ▲▲, Resilience ▼ | Three at once — the clearest case for a decomposed view |

That last column is the argument for the whole feature: **the Protection Score
would move a few points for every one of these, and the strand shows what
actually happened.**

### 5.4 Events that move nothing

Some events change no dimension — `licence_gained`, `home_renovation`. They affect
a policy's *validity* or *price*, not the exposure model.

The DNA must be able to say **"this changed nothing here"** and point at the
timeline instead. A summary that invents movement to justify a notification is
the same defect as a recommendation that invents a risk to justify a product.

---

## 6. The model

```
RiskDnaSnapshot
  userId, computedAt
  overallScore            -- the SAME Protection Score, carried for reconciliation
  assessmentCoverage      -- share of the catalog decided
  dimensions: RiskDimension[9]

RiskDimension
  key                     property | income | family | health | liability
                          | cyber | travel | business | resilience
  score        number | null      -- null when indeterminate; never 0-as-unknown
  confidence   high | medium | low | indeterminate
  scale        fine | coarse      -- coarse where one risk backs the dimension
  applicability applicable | not_applicable | needs_review
  urgency      critical | high | medium | low | none
  trend        improving | declining | stable | new | volatile | unavailable
  trendCause   timelineEntryId | null    -- unattributable movement is suppressed
  explanation  Bilingual                 -- deterministic
  narrative    Bilingual | null          -- optional AI layer, outside the critical path
  actions      Mitigation[]              -- ≤3, ladder order
  riskIds      string[]                  -- provenance: which risks produced this
```

`riskIds` is not decoration. It is what lets a CI check prove the DNA and the
Protection Score are reading the same assessment, and what lets an advisor answer
"where did this number come from" in one hop.

### 6.1 Storage

Derived, and **not persisted as a fresh source of truth**. Snapshots are written
only to serve trend — and when `ProtectionScoreHistory` lands (F-08), the DNA
snapshot should extend that table rather than open a parallel history. Two
histories of the same computation is the same defect this document opened with.

### 6.2 Invariants a CI check should enforce

1. Recomposing the nine dimensions under the existing category weights reproduces
   `overallScore` exactly.
2. Every one of the 21 catalog risks has exactly one `primary` dimension.
3. No dimension reads a fact outside the assessment.
4. `not_applicable` and `needs_review` risks are excluded from every denominator.
5. A dimension with `confidence: indeterminate` renders **no score**.
6. Every dimension offers ≥1 non-`transfer` action.
7. Resilience offers **no** `transfer` action at all.
8. `trend` is `unavailable` while no history table exists — never `stable`.
9. A `trend` with no `trendCause` is suppressed.
10. Nine dimensions, always. A dimension that does not apply is *shown as not
    applying*, never omitted — omission is indistinguishable from an oversight.

---

## 7. A naming concern, flagged rather than decided

"Risk DNA" is a good internal name and a questionable customer-facing one, for
two reasons worth a deliberate decision rather than a default:

**It claims the opposite of what the model does.** DNA connotes fixed, inherited,
deterministic. This profile is the opposite — it is designed to change with every
life event, and §5 is the best part of the feature. A name that says "immutable"
undercuts the thing that makes it useful.

**It sits close to actual genetic data.** The product collects chronic conditions
and family medical history — GDPR Art. 9 special-category data — and feeds them
into the Health dimension. Labelling that output "DNA", in a health-adjacent
product, invites a reasonable person to think we are inferring something genetic.
In Greek, «DNA Κινδύνου» reads more clinically still.

Alternatives worth testing: «Το προφίλ κινδύνου σας» *(your risk profile)*, «Η
αποτύπωσή σας» *(your imprint)*, or simply "Protection Profile". This is a
product call, not an architectural one — but it should be made on purpose.

---

## 8. Non-goals and open questions

**Non-goals.** A second composite score. A peer comparison ("you score below
average for your age") — normative pressure, and we have no defensible peer set.
A predictive score. Gamification. Replacing the Protection Score.

**Open, and genuinely undecided:**

1. **Are nine dimensions too many for 320px?** Nine bars is already a screenful.
   Three or four might communicate more. The brief specifies nine; whether a
   customer can hold nine is a research question, not a design one.
2. **Should Resilience have its own scale?** It reads in the opposite direction,
   and rendering it as another 0-100 bar invites "why is my Resilience lower than
   my Property score" — a question with no meaning.
3. **What is the minimum `assessmentCoverage` to show a strand at all?** The
   Protection Score withholds below 50%. A strand of nine hatched bars may be
   worse than an honest "we need to ask you a few things first".
4. **Does the AI narrative earn its risk?** It is the only unreviewable text in a
   compliance-sensitive summary. The deterministic explanation may simply be
   enough.
5. **How long does delta mode persist?** Tied to the event window, but a customer
   who does not open the app for a month misses the movement entirely.
6. **Does a dimension backed by one risk deserve to be a dimension?** Cyber,
   Travel and Business are each near-binary today. The alternative — merging them
   — hides them, which is how they got hidden in the first place.
